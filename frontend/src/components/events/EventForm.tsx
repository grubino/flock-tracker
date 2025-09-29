import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  Text,
  Button,
  Input,
  Label,
  Dropdown,
  Option,
  Textarea,
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
});

const EventForm: React.FC<EventFormProps> = ({ event, isEdit = false }) => {
  const styles = useStyles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedAnimalId = searchParams.get('animal_id');

  const [formData, setFormData] = useState<EventCreateRequest>({
    animal_id: event?.animal_id || (preselectedAnimalId ? parseInt(preselectedAnimalId) : 0),
    event_type: event?.event_type || EventType.HEALTH_CHECK,
    event_date: event?.event_date ? event.event_date.split('T')[0] : new Date().toISOString().split('T')[0],
    description: event?.description || '',
    notes: event?.notes || '',
  });

  const { data: animals } = useQuery({
    queryKey: ['animals'],
    queryFn: () => animalsApi.getAll().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: EventCreateRequest) => eventsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', formData.animal_id] });
      navigate('/events');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<EventCreateRequest>) =>
      eventsApi.update(event!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', formData.animal_id] });
      navigate('/events');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.animal_id === 0) {
      alert('Please select an animal');
      return;
    }

    const submitData = {
      ...formData,
      event_date: new Date(formData.event_date).toISOString(),
    };

    if (isEdit) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'animal_id' ? parseInt(value) : value,
    }));
  };

  return (
    <div className={styles.container}>
      <Text as="h1" size={800} weight="bold" style={{ marginBottom: tokens.spacingVerticalL }}>
        {isEdit ? 'Edit Event' : 'Add New Event'}
      </Text>

      <Card>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor="animal_id" required>Animal</Label>
            <Dropdown
              value={formData.animal_id.toString()}
              selectedOptions={[formData.animal_id.toString()]}
              onOptionSelect={(_, data) =>
                handleChange({ target: { name: 'animal_id', value: data.optionValue } } as any)
              }
              placeholder="Select an animal"
            >
              <Option value="0" text="Select an animal">Select an animal</Option>
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
          </div>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <Label htmlFor="event_type" required>Event Type</Label>
              <Dropdown
                value={formData.event_type}
                selectedOptions={[formData.event_type]}
                onOptionSelect={(_, data) =>
                  handleChange({ target: { name: 'event_type', value: data.optionValue } } as any)
                }
              >
                <Option value={EventType.DEWORMING}>Deworming</Option>
                <Option value={EventType.DELICING}>Delicing</Option>
                <Option value={EventType.LAMBING}>Lambing</Option>
                <Option value={EventType.VACCINATION}>Vaccination</Option>
                <Option value={EventType.HEALTH_CHECK}>Health Check</Option>
                <Option value={EventType.OTHER}>Other</Option>
              </Dropdown>
            </div>

            <div className={styles.field}>
              <Label htmlFor="event_date" required>Event Date</Label>
              <Input
                type="date"
                id="event_date"
                name="event_date"
                value={formData.event_date}
                onChange={(_, data) => handleChange({ target: { name: 'event_date', value: data.value } } as any)}
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={(_, data) => handleChange({ target: { name: 'description', value: data.value } } as any)}
              rows={3}
              placeholder="Brief description of the event..."
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={(_, data) => handleChange({ target: { name: 'notes', value: data.value } } as any)}
              rows={4}
              placeholder="Additional notes, observations, or details..."
            />
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