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
import { animalsApi, locationsApi } from '../../services/api';
import { AnimalType, SheepGender, ChickenGender } from '../../types';
import type { AnimalCreateRequest, Animal } from '../../types';

interface AnimalFormProps {
  animal?: Animal;
  isEdit?: boolean;
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
});

const AnimalForm: React.FC<AnimalFormProps> = ({ animal, isEdit = false }) => {
  const styles = useStyles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const animalId = isEdit && id ? parseInt(id) : undefined;

  const { data: fetchedAnimal } = useQuery({
    queryKey: ['animal', animalId],
    queryFn: () => animalsApi.getById(animalId!).then(res => res.data),
    enabled: isEdit && !!animalId,
  });

  const currentAnimal = animal || fetchedAnimal;

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
        birth_date: currentAnimal.birth_date ? currentAnimal.birth_date.split('T')[0] : '',
        current_location_id: currentAnimal.current_location_id || undefined,
        sire_id: currentAnimal.sire_id || undefined,
        dam_id: currentAnimal.dam_id || undefined,
      });
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

  const createMutation = useMutation({
    mutationFn: (data: AnimalCreateRequest) => animalsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      navigate('/animals');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<AnimalCreateRequest>) =>
      animalsApi.update(currentAnimal!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      queryClient.invalidateQueries({ queryKey: ['animal', animalId] });
      navigate('/animals');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
                onChange={(_, data) => handleChange({ target: { name: 'tag_number', value: data.value } } as any)}
                required
              />
            </div>

            <div className={styles.field}>
              <Label htmlFor="animal_type" required>Animal Type</Label>
              <Dropdown
                value={formData.animal_type}
                selectedOptions={[formData.animal_type]}
                onOptionSelect={(_, data) =>
                  handleChange({ target: { name: 'animal_type', value: data.optionValue } } as any)
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
                onChange={(_, data) => handleChange({ target: { name: 'birth_date', value: data.value } } as any)}
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
                value={formData.current_location_id?.toString() || ''}
                selectedOptions={formData.current_location_id ? [formData.current_location_id.toString()] : []}
                onOptionSelect={(_, data) =>
                  handleChange({ target: { name: 'current_location_id', value: data.optionValue } } as any)
                }
                placeholder="Select Location"
              >
                <Option value="" text="No Location">No Location</Option>
                {locations?.map(location => (
                  <Option
                    key={location.id}
                    value={location.id.toString()}
                    text={`${location.name}${location.paddock_name ? ` - ${location.paddock_name}` : ''}`}
                  >
                    {location.name}{location.paddock_name ? ` - ${location.paddock_name}` : ''}
                  </Option>
                ))}
              </Dropdown>
            </div>

            <div className={styles.field}>
              <Label htmlFor="sire_id">Sire</Label>
              <Dropdown
                value={formData.sire_id?.toString() || ''}
                selectedOptions={formData.sire_id ? [formData.sire_id.toString()] : []}
                onOptionSelect={(_, data) =>
                  handleChange({ target: { name: 'sire_id', value: data.optionValue } } as any)
                }
                placeholder="Select Sire"
              >
                <Option value="">None</Option>
                {availableSires?.map(parent => (
                  <Option key={parent.id} value={parent.id.toString()}>
                    {parent.name || parent.tag_number}
                  </Option>
                ))}
              </Dropdown>
            </div>

            <div className={styles.field}>
              <Label htmlFor="dam_id">Dam</Label>
              <Dropdown
                value={formData.dam_id?.toString() || ''}
                selectedOptions={formData.dam_id ? [formData.dam_id.toString()] : []}
                onOptionSelect={(_, data) =>
                  handleChange({ target: { name: 'dam_id', value: data.optionValue } } as any)
                }
                placeholder="Select Dam"
              >
                <Option value="">None</Option>
                {availableDams?.map(parent => (
                  <Option key={parent.id} value={parent.id.toString()}>
                    {parent.name || parent.tag_number}
                  </Option>
                ))}
              </Dropdown>
            </div>
            </div>
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
    </div>
  );
};

export default AnimalForm;