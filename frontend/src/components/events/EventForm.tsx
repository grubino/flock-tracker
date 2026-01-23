import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import {
  Card,
  Text,
  Button,
  Input,
  Label,
  Dropdown,
  Option,
  Textarea,
  Spinner,
  makeStyles,
  tokens,
  Checkbox
} from '@fluentui/react-components';
import { Add20Regular, Dismiss20Regular } from '@fluentui/react-icons';
import { eventsApi, animalsApi } from '../../services/api';
import { EventType, AnimalType, SheepGender } from '../../types';
import type { EventCreateRequest, Event, AnimalCreateRequest } from '../../types';

interface EventFormProps {
  event?: Event;
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
  infoText: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    marginTop: tokens.spacingVerticalXS,
  },
  bulkInfo: {
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    marginBottom: tokens.spacingVerticalM,
  },
  lambSection: {
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorNeutralBackground1Hover,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  lambCard: {
    padding: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  lambHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalM,
  },
  lambFields: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: tokens.spacingVerticalM,
  },
});

const EventForm: React.FC<EventFormProps> = ({ event: propEvent, isEdit = false }) => {
  const styles = useStyles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const eventId = isEdit && id ? parseInt(id) : undefined;
  const preselectedAnimalId = searchParams.get('animal_id');

  // Fetch event data if in edit mode
  const { data: fetchedEvent, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.getById(eventId!).then(res => res.data),
    enabled: isEdit && !!eventId,
  });

  const event = propEvent || fetchedEvent;

  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([EventType.HEALTH_CHECK]);
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Lamb creation state
  const [createLambs, setCreateLambs] = useState(false);
  const [lambs, setLambs] = useState<Array<{
    tag_number: string;
    name: string;
    sheep_gender: SheepGender;
  }>>([]);

  // Update form state when event data is loaded
  useEffect(() => {
    if (event) {
      setSelectedAnimalIds(event.animal_id ? [event.animal_id.toString()] : []);
      setSelectedEventTypes(event.event_type ? [event.event_type] : [EventType.HEALTH_CHECK]);
      // Extract date part (YYYY-MM-DD) from ISO datetime string
      // Backend returns ISO 8601 format: "2024-01-22T14:30:00.000Z"
      // Date input needs: "2024-01-22"
      if (event.event_date) {
        const dateOnly = event.event_date.split('T')[0];
        setEventDate(dateOnly);
      } else {
        setEventDate(new Date().toISOString().split('T')[0]);
      }
      setDescription(event.description || '');
      setNotes(event.notes || '');
    } else if (preselectedAnimalId && !isEdit) {
      setSelectedAnimalIds([preselectedAnimalId]);
    }
  }, [event, preselectedAnimalId, isEdit]);

  const { data: allAnimals } = useQuery({
    queryKey: ['animals'],
    queryFn: () => animalsApi.getAll().then(res => res.data),
  });

  // Filter animals to only show those on the farm
  const animals = useMemo(() => {
    if (!allAnimals) return [];
    return allAnimals.filter(animal => animal.on_farm);
  }, [allAnimals]);

  const createMutation = useMutation({
    mutationFn: (data: EventCreateRequest) => eventsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      // Navigate back to previous page if coming from animal detail
      if (preselectedAnimalId) {
        navigate(-1);
      } else {
        navigate('/events');
      }
    },
  });

  const createBulkMutation = useMutation({
    mutationFn: (data: EventCreateRequest[]) => eventsApi.createBulk(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      // Navigate back to previous page if coming from animal detail
      if (preselectedAnimalId) {
        navigate(-1);
      } else {
        navigate('/events');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<EventCreateRequest>) =>
      eventsApi.update(event!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      navigate('/events');
    },
  });

  // Calculate how many events will be created
  const eventCount = useMemo(() => {
    return selectedAnimalIds.length * selectedEventTypes.length;
  }, [selectedAnimalIds, selectedEventTypes]);

  const isBulkMode = eventCount > 1;

  // Check if lambing event type is selected
  const isLambingEvent = useMemo(() => {
    return selectedEventTypes.includes(EventType.LAMBING);
  }, [selectedEventTypes]);

  // Helper functions for lamb management
  const addLamb = () => {
    setLambs([...lambs, { tag_number: '', name: '', sheep_gender: SheepGender.EWE }]);
  };

  const removeLamb = (index: number) => {
    setLambs(lambs.filter((_, i) => i !== index));
  };

  const updateLamb = (index: number, field: string, value: string) => {
    const updatedLambs = [...lambs];
    updatedLambs[index] = { ...updatedLambs[index], [field]: value };
    setLambs(updatedLambs);
  };

  // Get display value for animal dropdown
  const animalDropdownValue = useMemo(() => {
    if (!animals || selectedAnimalIds.length === 0) return '';

    if (isEdit && selectedAnimalIds.length === 1) {
      // In edit mode, show the selected animal's name
      const selectedAnimal = animals.find(a => a.id.toString() === selectedAnimalIds[0]);
      if (selectedAnimal) {
        return `${selectedAnimal.name || selectedAnimal.tag_number} (${selectedAnimal.animal_type === 'sheep' && selectedAnimal.sheep_gender ? selectedAnimal.sheep_gender : selectedAnimal.animal_type})`;
      }
    }

    // In create mode with multiple selections, show count
    return selectedAnimalIds.length > 0
      ? `${selectedAnimalIds.length} animal${selectedAnimalIds.length !== 1 ? 's' : ''} selected`
      : '';
  }, [animals, selectedAnimalIds, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedAnimalIds.length === 0) {
      alert('Please select at least one animal');
      return;
    }

    if (selectedEventTypes.length === 0) {
      alert('Please select at least one event type');
      return;
    }

    // Validate lamb data if creating lambs
    if (createLambs && lambs.length > 0) {
      const invalidLambs = lambs.filter(lamb => !lamb.tag_number.trim());
      if (invalidLambs.length > 0) {
        alert('Please provide a tag number for all lambs');
        return;
      }
    }

    const baseEventData = {
      event_date: new Date(eventDate).toISOString(),
      description,
      notes,
    };

    // If creating lambs, first create the lamb animals
    if (createLambs && lambs.length > 0 && !isEdit) {
      try {
        // Get the dam (mother) from selected animal
        const damId = selectedAnimalIds.length === 1 ? parseInt(selectedAnimalIds[0]) : undefined;
        const dam = animals?.find(a => a.id === damId);

        // Create each lamb
        const lambPromises = lambs.map(lamb => {
          const lambData: AnimalCreateRequest = {
            tag_number: lamb.tag_number,
            name: lamb.name || undefined,
            animal_type: AnimalType.SHEEP,
            sheep_gender: lamb.sheep_gender,
            birth_date: eventDate, // Use event date as birth date
            dam_id: damId,
            current_location_id: dam?.current_location_id,
          };
          return animalsApi.create(lambData);
        });

        await Promise.all(lambPromises);

        // Invalidate animals query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['animals'] });
      } catch (error) {
        alert('Failed to create lamb animals. Please try again.');
        console.error('Error creating lambs:', error);
        return;
      }
    }

    if (isBulkMode && !isEdit) {
      // Create an event for each combination of animal and event type
      const events: EventCreateRequest[] = [];

      for (const animalId of selectedAnimalIds) {
        for (const eventType of selectedEventTypes) {
          events.push({
            ...baseEventData,
            animal_id: parseInt(animalId),
            event_type: eventType as EventType,
          });
        }
      }

      createBulkMutation.mutate(events);
    } else {
      // Single event creation or edit
      const submitData: EventCreateRequest = {
        ...baseEventData,
        animal_id: parseInt(selectedAnimalIds[0]),
        event_type: selectedEventTypes[0] as EventType,
      };

      if (isEdit) {
        updateMutation.mutate(submitData);
      } else {
        createMutation.mutate(submitData);
      }
    }
  };

  if (isEdit && eventLoading) {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <Spinner size="large" label="Loading event..." />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Text as="h1" size={800} weight="bold" style={{ marginBottom: tokens.spacingVerticalL }}>
        {isEdit ? 'Edit Event' : 'Add New Event'}
      </Text>

      <Card>
        <form onSubmit={handleSubmit} className={styles.form}>
          {isBulkMode && !isEdit && (
            <div className={styles.bulkInfo}>
              <Text weight="semibold" style={{ display: 'block', marginBottom: tokens.spacingVerticalXS }}>
                Bulk Event Creation
              </Text>
              <Text className={styles.infoText}>
                {eventCount} event{eventCount !== 1 ? 's' : ''} will be created
                ({selectedAnimalIds.length} animal{selectedAnimalIds.length !== 1 ? 's' : ''} × {selectedEventTypes.length} event type{selectedEventTypes.length !== 1 ? 's' : ''})
              </Text>
            </div>
          )}

          <div className={styles.field}>
            <Label htmlFor="animal_id" required>
              Animal{!isEdit && 's'}
            </Label>
            <Dropdown
              multiselect={!isEdit}
              value={animalDropdownValue}
              selectedOptions={selectedAnimalIds}
              onOptionSelect={(_, data) => {
                setSelectedAnimalIds(data.selectedOptions);
              }}
              placeholder="Select animal(s)"
            >
              {animals?.map(animal => (
                <Option
                  key={animal.id}
                  value={animal.id.toString()}
                  text={`${animal.name || animal.tag_number} (${animal.animal_type === 'sheep' && animal.sheep_gender ? `${animal.sheep_gender}` : animal.animal_type})`}
                >
                  {animal.name || animal.tag_number} ({animal.animal_type === 'sheep' && animal.sheep_gender ? `${animal.sheep_gender}` : animal.animal_type})
                </Option>
              ))}
            </Dropdown>
            {!isEdit && (
              <Text className={styles.infoText}>
                Select multiple animals to create events for all of them
              </Text>
            )}
          </div>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <Label htmlFor="event_type" required>
                Event Type{!isEdit && 's'}
              </Label>
              <Dropdown
                multiselect={!isEdit}
                value={selectedEventTypes.join(', ')}
                selectedOptions={selectedEventTypes}
                onOptionSelect={(_, data) => {
                  setSelectedEventTypes(data.selectedOptions);
                }}
              >
                <Option value={EventType.BIRTH}>Birth</Option>
                <Option value={EventType.BREEDING}>Breeding</Option>
                <Option value={EventType.BRED}>Bred</Option>
                <Option value={EventType.DEATH}>Death</Option>
                <Option value={EventType.DELICING}>Delicing</Option>
                <Option value={EventType.DEWORMING}>Deworming</Option>
                <Option value={EventType.HEALTH_CHECK}>Health Check</Option>
                <Option value={EventType.INJURY}>Injury</Option>
                <Option value={EventType.LAMBING}>Lambing</Option>
                <Option value={EventType.MEDICATION}>Medication</Option>
                <Option value={EventType.MITE_TREATMENT}>Mite Treatment</Option>
                <Option value={EventType.SLAUGHTER}>Slaughter</Option>
                <Option value={EventType.SOLD}>Sold</Option>
                <Option value={EventType.TREATMENT}>Treatment</Option>
                <Option value={EventType.OTHER}>Other</Option>
              </Dropdown>
              {!isEdit && (
                <Text className={styles.infoText}>
                  Select multiple event types to create all of them
                </Text>
              )}
            </div>

            <div className={styles.field}>
              <Label htmlFor="event_date" required>Event Date</Label>
              <Input
                type="date"
                id="event_date"
                name="event_date"
                value={eventDate}
                onChange={(_, data) => setEventDate(data.value)}
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={description}
              onChange={(_, data) => setDescription(data.value)}
              rows={3}
              placeholder="Brief description of the event..."
            />
            {isBulkMode && !isEdit && (
              <Text className={styles.infoText}>
                This description will be applied to all {eventCount} events
              </Text>
            )}
          </div>

          <div className={styles.field}>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={notes}
              onChange={(_, data) => setNotes(data.value)}
              rows={4}
              placeholder="Additional notes, observations, or details..."
            />
            {isBulkMode && !isEdit && (
              <Text className={styles.infoText}>
                These notes will be applied to all {eventCount} events
              </Text>
            )}
          </div>

          {/* Lamb Creation Section - Only show for lambing events in create mode with single ewe */}
          {isLambingEvent && !isEdit && selectedAnimalIds.length === 1 && (
            <div className={styles.lambSection}>
              <div style={{ marginBottom: tokens.spacingVerticalM }}>
                <Checkbox
                  checked={createLambs}
                  onChange={(_, data) => {
                    setCreateLambs(data.checked as boolean);
                    if (!data.checked) {
                      setLambs([]);
                    }
                  }}
                  label="Create lamb animals"
                />
                <Text className={styles.infoText}>
                  Optionally create lamb animal records as part of this lambing event
                </Text>
              </div>

              {createLambs && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacingVerticalM }}>
                    <Text weight="semibold" size={400}>
                      Lambs ({lambs.length})
                    </Text>
                    <Button
                      appearance="subtle"
                      icon={<Add20Regular />}
                      onClick={addLamb}
                    >
                      Add Lamb
                    </Button>
                  </div>

                  {lambs.length === 0 && (
                    <Text className={styles.infoText} style={{ textAlign: 'center', display: 'block' }}>
                      Click "Add Lamb" to create lamb records
                    </Text>
                  )}

                  {lambs.map((lamb, index) => (
                    <div key={index} className={styles.lambCard}>
                      <div className={styles.lambHeader}>
                        <Text weight="semibold" size={300}>
                          Lamb {index + 1}
                        </Text>
                        <Button
                          appearance="subtle"
                          icon={<Dismiss20Regular />}
                          onClick={() => removeLamb(index)}
                          size="small"
                        />
                      </div>

                      <div className={styles.lambFields}>
                        <div className={styles.field}>
                          <Label required>Tag Number</Label>
                          <Input
                            value={lamb.tag_number}
                            onChange={(_, data) => updateLamb(index, 'tag_number', data.value)}
                            placeholder="e.g., L001"
                            required
                          />
                        </div>

                        <div className={styles.field}>
                          <Label>Name</Label>
                          <Input
                            value={lamb.name}
                            onChange={(_, data) => updateLamb(index, 'name', data.value)}
                            placeholder="Optional"
                          />
                        </div>

                        <div className={styles.field}>
                          <Label required>Gender</Label>
                          <Dropdown
                            value={lamb.sheep_gender}
                            selectedOptions={[lamb.sheep_gender]}
                            onOptionSelect={(_, data) =>
                              updateLamb(index, 'sheep_gender', data.optionValue as string)
                            }
                          >
                            <Option value={SheepGender.EWE}>Ewe</Option>
                            <Option value={SheepGender.RAM}>Ram</Option>
                          </Dropdown>
                        </div>
                      </div>
                    </div>
                  ))}

                  {lambs.length > 0 && (
                    <Text className={styles.infoText} style={{ marginTop: tokens.spacingVerticalM }}>
                      Lambs will be created with birth date {eventDate} and dam set to the selected ewe
                    </Text>
                  )}
                </>
              )}
            </div>
          )}

          <div className={styles.actions}>
            <Button
              type="submit"
              appearance="primary"
              disabled={createMutation.isPending || updateMutation.isPending || createBulkMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending || createBulkMutation.isPending)
                ? 'Saving...'
                : (isEdit ? 'Update' : (isBulkMode ? `Create ${eventCount} Events` : 'Create'))}
            </Button>
            <Button
              type="button"
              appearance="secondary"
              onClick={() => navigate('/events')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EventForm;
