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
  tokens
} from '@fluentui/react-components';
import { eventsApi, animalsApi } from '../../services/api';
import { EventType } from '../../types';
import type { EventCreateRequest, Event } from '../../types';

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

  // Update form state when event data is loaded
  useEffect(() => {
    if (event) {
      setSelectedAnimalIds(event.animal_id ? [event.animal_id.toString()] : []);
      setSelectedEventTypes(event.event_type ? [event.event_type] : [EventType.HEALTH_CHECK]);
      // Extract just the date part without timezone conversion
      setEventDate(event.event_date ? event.event_date : new Date().toISOString().split('T')[0]);
      setDescription(event.description || '');
      setNotes(event.notes || '');
    } else if (preselectedAnimalId && !isEdit) {
      setSelectedAnimalIds([preselectedAnimalId]);
    }
  }, [event, preselectedAnimalId, isEdit]);

  const { data: animals } = useQuery({
    queryKey: ['animals'],
    queryFn: () => animalsApi.getAll().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: EventCreateRequest) => eventsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
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
      navigate('/events');
    },
  });

  // Calculate how many events will be created
  const eventCount = useMemo(() => {
    return selectedAnimalIds.length * selectedEventTypes.length;
  }, [selectedAnimalIds, selectedEventTypes]);

  const isBulkMode = eventCount > 1;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedAnimalIds.length === 0) {
      alert('Please select at least one animal');
      return;
    }

    if (selectedEventTypes.length === 0) {
      alert('Please select at least one event type');
      return;
    }

    const baseEventData = {
      event_date: new Date(eventDate).toISOString(),
      description,
      notes,
    };

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
