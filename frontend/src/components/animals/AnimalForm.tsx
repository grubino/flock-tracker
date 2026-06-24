import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Text,
  Button,
  Input,
  Label,
  Dropdown,
  Option,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import { Add20Regular, Dismiss20Regular } from '@fluentui/react-icons';
import { animalsApi, locationsApi } from '../../services/api';
import { AnimalType, SheepGender, ChickenGender } from '../../types';
import type { AnimalCreateRequest, Animal, BreedComponent, EffectiveBreedComponent } from '../../types';
import { PhotoGallery } from '../PhotoGallery';
import { useRoleAccess } from '../../hooks/useRoleAccess';

interface AnimalFormProps {
  animal?: Animal;
  isEdit?: boolean;
}

interface BreedRow {
  breed_name: string;
  percentage: number | undefined;
  inherited: boolean;   // came from ancestor computation, not DB
  pct_locked: boolean;  // percentage is computed from complete ancestry — fully read-only
}

const useStyles = makeStyles({
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: tokens.spacingVerticalXL,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: tokens.spacingVerticalL,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalL,
  },
  breedSection: {
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorNeutralBackground1Hover,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  breedRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 120px auto',
    gap: tokens.spacingHorizontalS,
    alignItems: 'end',
    marginBottom: tokens.spacingVerticalS,
  },
});

const AnimalForm: React.FC<AnimalFormProps> = ({ animal, isEdit = false }) => {
  const styles = useStyles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const animalId = isEdit && id ? parseInt(id) : undefined;
  const { canWrite } = useRoleAccess();

  const { data: fetchedAnimal } = useQuery({
    queryKey: ['animal', animalId],
    queryFn: () => animalsApi.getById(animalId!).then(res => res.data),
    enabled: isEdit && !!animalId,
  });

  const currentAnimal = animal || fetchedAnimal;

  const [breeds, setBreeds] = useState<BreedRow[]>([]);

  const addBreed = () => setBreeds(prev => [...prev, { breed_name: '', percentage: undefined, inherited: false, pct_locked: false }]);
  const removeBreed = (i: number) => {
    if (breeds[i].inherited) return;
    setBreeds(prev => prev.filter((_, idx) => idx !== i));
  };
  const updateBreedName = (i: number, value: string) => {
    if (breeds[i].inherited) return;
    setBreeds(prev => prev.map((b, idx) => idx === i ? { ...b, breed_name: value } : b));
  };
  const updateBreedPct = (i: number, value: string) => {
    if (breeds[i].pct_locked) return;
    setBreeds(prev => prev.map((b, idx) =>
      idx === i ? { ...b, percentage: value === '' ? undefined : parseFloat(value) } : b
    ));
  };

  const [formData, setFormData] = useState<AnimalCreateRequest>({
    name: '',
    tag_number: '',
    animal_type: AnimalType.SHEEP,
    sheep_gender: undefined,
    chicken_gender: undefined,
    birth_date: '',
    current_location_id: undefined,
    sire_id: undefined,
    dam_id: undefined,
  });

  useEffect(() => {
    if (currentAnimal) {
      setFormData({
        name: currentAnimal.name || '',
        tag_number: currentAnimal.tag_number || '',
        animal_type: currentAnimal.animal_type || AnimalType.SHEEP,
        sheep_gender: currentAnimal.sheep_gender || undefined,
        chicken_gender: currentAnimal.chicken_gender || undefined,
        birth_date: currentAnimal.birth_date || '',
        current_location_id: currentAnimal.current_location_id || undefined,
        sire_id: currentAnimal.sire_id || undefined,
        dam_id: currentAnimal.dam_id || undefined,
      });
      const effective = currentAnimal.effective_breed_components;
      if (effective && effective.length > 0) {
        setBreeds(effective.map((bc: EffectiveBreedComponent) => ({
          breed_name: bc.breed_name,
          percentage: bc.percentage ?? undefined,
          inherited: bc.source === 'inherited',
          pct_locked: bc.source === 'inherited' && bc.percentage != null,
        })));
      } else {
        setBreeds([]);
      }
    }
  }, [currentAnimal]);

  const { data: animals } = useQuery({
    queryKey: ['animals'],
    queryFn: () => animalsApi.getAll().then(res => res.data),
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.getAll().then(res => res.data),
  });

  // Only save non-locked breeds: user-entered + inherited where user explicitly set a percentage
  const breedsToSave: Omit<BreedComponent, 'id'>[] = breeds
    .filter(b => !b.pct_locked && b.breed_name.trim() !== '')
    .filter(b => !b.inherited || b.percentage != null)
    .map(({ breed_name, percentage }) => ({ breed_name, percentage }));

  // Percentage validation: if every named editable breed has a percentage, they must sum to 100
  const editableNamed = breeds.filter(b => !b.pct_locked && b.breed_name.trim() !== '');
  const allHavePct = editableNamed.length > 0 && editableNamed.every(b => b.percentage != null);
  const pctSum = editableNamed.reduce((s, b) => s + (b.percentage ?? 0), 0);
  const pctSumError = allHavePct && Math.abs(pctSum - 100) > 0.5;

  const createMutation = useMutation({
    mutationFn: (data: AnimalCreateRequest) => animalsApi.create(data),
    onSuccess: async (res) => {
      if (breedsToSave.length > 0) {
        await animalsApi.updateBreeds(res.data.id, breedsToSave);
      }
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      navigate('/animals');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<AnimalCreateRequest>) =>
      animalsApi.update(currentAnimal!.id, data),
    onSuccess: async () => {
      await animalsApi.updateBreeds(currentAnimal!.id, breedsToSave);
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      queryClient.invalidateQueries({ queryKey: ['animal', animalId] });
      navigate('/animals');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pctSumError) return;
    const submitData = {
      ...formData,
      birth_date: formData.birth_date || undefined,
      sire_id: formData.sire_id || undefined,
      dam_id: formData.dam_id || undefined,
      sheep_gender: formData.animal_type === AnimalType.SHEEP ? formData.sheep_gender : undefined,
      chicken_gender: formData.animal_type === AnimalType.CHICKEN ? formData.chicken_gender : undefined,
    };

    if (isEdit) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('_id') ? (value ? parseInt(value) : undefined) : value,
    }));
  };

  const availableParents = animals?.filter(a =>
    a.animal_type === formData.animal_type &&
    (!isEdit || a.id !== currentAnimal?.id)
  );

  const availableSires = availableParents?.filter(a => {
    if (formData.animal_type === AnimalType.SHEEP) {
      return a.sheep_gender === SheepGender.RAM;
    } else if (formData.animal_type === AnimalType.CHICKEN) {
      return a.chicken_gender === ChickenGender.ROOSTER;
    }
    return true; // For hives, no gender filtering
  });

  const availableDams = availableParents?.filter(a => {
    if (formData.animal_type === AnimalType.SHEEP) {
      return a.sheep_gender === SheepGender.EWE;
    } else if (formData.animal_type === AnimalType.CHICKEN) {
      return a.chicken_gender === ChickenGender.HEN;
    }
    return true; // For hives, no gender filtering
  });

  const selectedLocationDisplay = formData.current_location_id
    ? locations?.find(l => l.id === formData.current_location_id)
      ? (() => {
          const loc = locations.find(l => l.id === formData.current_location_id)!;
          return `${loc.name}${loc.paddock_name ? ` - ${loc.paddock_name}` : ''}`;
        })()
      : formData.current_location_id.toString()
    : '';

  const selectedSireDisplay = formData.sire_id
    ? availableSires?.find(a => a.id === formData.sire_id)
      ? (availableSires.find(a => a.id === formData.sire_id)!.name || availableSires.find(a => a.id === formData.sire_id)!.tag_number)
      : formData.sire_id.toString()
    : '';

  const selectedDamDisplay = formData.dam_id
    ? availableDams?.find(a => a.id === formData.dam_id)
      ? (availableDams.find(a => a.id === formData.dam_id)!.name || availableDams.find(a => a.id === formData.dam_id)!.tag_number)
      : formData.dam_id.toString()
    : '';

  return (
    <div className={styles.container}>
      <Text as="h1" size={800} weight="bold" style={{ marginBottom: tokens.spacingVerticalL }}>
        {isEdit ? 'Edit Animal' : 'Add New Animal'}
      </Text>

      <Card>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <Label htmlFor="name">Name (Optional)</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={(_, data) => handleChange({ target: { name: 'name', value: data.value } } as React.ChangeEvent<HTMLInputElement>)}
              />
            </div>

            <div className={styles.field}>
              <Label htmlFor="tag_number" required>Tag Number</Label>
              <Input
                id="tag_number"
                name="tag_number"
                value={formData.tag_number}
                onChange={(_, data) => handleChange({ target: { name: 'tag_number', value: data.value } } as React.ChangeEvent<HTMLInputElement>)}
                required
              />
            </div>

            <div className={styles.field}>
              <Label htmlFor="animal_type" required>Animal Type</Label>
              <Dropdown
                value={formData.animal_type}
                selectedOptions={[formData.animal_type]}
                onOptionSelect={(_, data) =>
                  handleChange({ target: { name: 'animal_type', value: data.optionValue } } as React.ChangeEvent<HTMLInputElement>)
                }
              >
                <Option value={AnimalType.SHEEP}>Sheep</Option>
                <Option value={AnimalType.CHICKEN}>Chicken</Option>
                <Option value={AnimalType.HIVE}>Hive</Option>
              </Dropdown>
            </div>

            {formData.animal_type === AnimalType.SHEEP && (
              <div className={styles.field}>
                <Label htmlFor="sheep_gender" required>Gender</Label>
                <Dropdown
                  value={formData.sheep_gender || ''}
                  selectedOptions={formData.sheep_gender ? [formData.sheep_gender] : []}
                  onOptionSelect={(_, data) =>
                    handleChange({ target: { name: 'sheep_gender', value: data.optionValue } } as React.ChangeEvent<HTMLInputElement>)
                  }
                  placeholder="Select gender"
                >
                  <Option value={SheepGender.EWE}>Ewe</Option>
                  <Option value={SheepGender.RAM}>Ram</Option>
                </Dropdown>
              </div>
            )}

            {formData.animal_type === AnimalType.CHICKEN && (
              <div className={styles.field}>
                <Label htmlFor="chicken_gender" required>Gender</Label>
                <Dropdown
                  value={formData.chicken_gender || ''}
                  selectedOptions={formData.chicken_gender ? [formData.chicken_gender] : []}
                  onOptionSelect={(_, data) =>
                    handleChange({ target: { name: 'chicken_gender', value: data.optionValue } } as React.ChangeEvent<HTMLInputElement>)
                  }
                  placeholder="Select gender"
                >
                  <Option value={ChickenGender.HEN}>Hen</Option>
                  <Option value={ChickenGender.ROOSTER}>Rooster</Option>
                </Dropdown>
              </div>
            )}

            <div className={styles.field}>
              <Label htmlFor="birth_date">Birth Date</Label>
              <Input
                type="date"
                id="birth_date"
                name="birth_date"
                value={formData.birth_date}
                onChange={(_, data) => handleChange({ target: { name: 'birth_date', value: data.value } } as React.ChangeEvent<HTMLInputElement>)}
              />
            </div>
          </div>

          <div style={{ marginTop: tokens.spacingVerticalL }}>
            <Text size={500} weight="semibold" style={{ marginBottom: tokens.spacingVerticalM, display: 'block' }}>
              Location and Lineage
            </Text>
            <div className={styles.formGrid}>
            <div className={styles.field}>
              <Label htmlFor="current_location_id">Current Location</Label>
              <Dropdown
                value={selectedLocationDisplay}
                selectedOptions={formData.current_location_id ? [formData.current_location_id.toString()] : []}
                onOptionSelect={(_, data) =>
                  handleChange({ target: { name: 'current_location_id', value: data.optionValue } } as React.ChangeEvent<HTMLInputElement>)
                }
                placeholder="Select Location"
              >
                <Option value="" text="No Location">No Location</Option>
                {locations?.map(location => {
                  const displayName = `${location.name}${location.paddock_name ? ` - ${location.paddock_name}` : ''}`;
                  return (
                    <Option
                      key={location.id}
                      value={location.id.toString()}
                      text={displayName}
                    >
                      {displayName}
                    </Option>
                  );
                })}
              </Dropdown>
            </div>

            <div className={styles.field}>
              <Label htmlFor="sire_id">Sire</Label>
              <Dropdown
                value={selectedSireDisplay}
                selectedOptions={formData.sire_id ? [formData.sire_id.toString()] : []}
                onOptionSelect={(_, data) =>
                  handleChange({ target: { name: 'sire_id', value: data.optionValue } } as React.ChangeEvent<HTMLInputElement>)
                }
                placeholder="Select Sire"
              >
                <Option value="" text="None">None</Option>
                {availableSires?.map(parent => {
                  const displayName = parent.name || parent.tag_number;
                  return (
                    <Option key={parent.id} value={parent.id.toString()} text={displayName}>
                      {displayName}
                    </Option>
                  );
                })}
              </Dropdown>
            </div>

            <div className={styles.field}>
              <Label htmlFor="dam_id">Dam</Label>
              <Dropdown
                value={selectedDamDisplay}
                selectedOptions={formData.dam_id ? [formData.dam_id.toString()] : []}
                onOptionSelect={(_, data) =>
                  handleChange({ target: { name: 'dam_id', value: data.optionValue } } as React.ChangeEvent<HTMLInputElement>)
                }
                placeholder="Select Dam"
              >
                <Option value="" text="None">None</Option>
                {availableDams?.map(parent => {
                  const displayName = parent.name || parent.tag_number;
                  return (
                    <Option key={parent.id} value={parent.id.toString()} text={displayName}>
                      {displayName}
                    </Option>
                  );
                })}
              </Dropdown>
            </div>
            </div>
          </div>

          {/* Breed Section */}
          <div className={styles.breedSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacingVerticalM }}>
              <Text weight="semibold" size={400}>Breed</Text>
              <Button appearance="subtle" icon={<Add20Regular />} size="small" onClick={addBreed}>
                Add Breed
              </Button>
            </div>

            {breeds.length === 0 && (
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                No breeds set — will be inherited from parents if known.
              </Text>
            )}

            {breeds.some(b => b.inherited) && (
              <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block', marginBottom: tokens.spacingVerticalS }}>
                Inherited from parents. Adding a breed below will override the inherited calculation.
              </Text>
            )}

            {breeds.map((breed, i) => (
              <div key={i} className={styles.breedRow}>
                <div className={styles.field}>
                  <Label>Breed Name</Label>
                  {breed.inherited ? (
                    <Text style={{ padding: '6px 0', display: 'block', fontStyle: 'italic' }}>
                      {breed.breed_name}
                    </Text>
                  ) : (
                    <Input
                      value={breed.breed_name}
                      onChange={(_, d) => updateBreedName(i, d.value)}
                      placeholder="e.g. Merino"
                    />
                  )}
                </div>
                <div className={styles.field}>
                  <Label>%{breed.pct_locked ? '' : ' (optional)'}</Label>
                  {breed.pct_locked ? (
                    <Text style={{ padding: '6px 0', display: 'block' }}>
                      {breed.percentage?.toFixed(1)}%
                    </Text>
                  ) : (
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={breed.percentage?.toString() ?? ''}
                      onChange={(_, d) => updateBreedPct(i, d.value)}
                      placeholder={breed.inherited ? 'unknown' : '50'}
                    />
                  )}
                </div>
                {breed.inherited ? (
                  <div style={{ width: '32px' }} />
                ) : (
                  <Button
                    appearance="subtle"
                    icon={<Dismiss20Regular />}
                    onClick={() => removeBreed(i)}
                    style={{ marginBottom: '2px' }}
                  />
                )}
              </div>
            ))}

            {pctSumError && (
              <Text size={200} style={{ color: tokens.colorPaletteRedForeground1, marginTop: tokens.spacingVerticalS, display: 'block' }}>
                Percentages must sum to 100 (currently {pctSum.toFixed(1)}%).
              </Text>
            )}

            {allHavePct && !pctSumError && editableNamed.length > 0 && (
              <Text size={200} style={{ color: tokens.colorPaletteGreenForeground1, marginTop: tokens.spacingVerticalS, display: 'block' }}>
                Percentages sum to 100%.
              </Text>
            )}
          </div>

          <div className={styles.actions}>
            <Button
              type="submit"
              appearance="primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
            </Button>
            <Button
              type="button"
              appearance="secondary"
              onClick={() => navigate('/animals')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      {/* Photo Gallery - only show in edit mode */}
      {isEdit && animalId && (
        <Card style={{ marginTop: tokens.spacingVerticalXL }}>
          <PhotoGallery animalId={animalId} canUpload={canWrite} />
        </Card>
      )}
    </div>
  );
};

export default AnimalForm;