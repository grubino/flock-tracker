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
  Textarea,
  Checkbox,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import { careSchedulesApi, animalsApi, locationsApi } from '../../services/api';
import { CareType, RecurrenceType, ScheduleStatus } from '../../types';
import type { CareScheduleCreateRequest } from '../../types';

interface CareScheduleFormProps {
  isEdit?: boolean;
}

const useStyles = makeStyles({
  container: {
    maxWidth: '900px',
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
  fieldRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacingHorizontalM,
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
  section: {
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
});

const CareScheduleForm: React.FC<CareScheduleFormProps> = ({ isEdit = false }) => {
  const styles = useStyles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [careType, setCareType] = useState<string>(CareType.HEALTH_CHECK);
  const [recurrenceType, setRecurrenceType] = useState<string>(RecurrenceType.ONCE);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [recurrenceInterval, setRecurrenceInterval] = useState('1');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDaysBefore, setReminderDaysBefore] = useState('1');
  const [reminderHoursBefore, setReminderHoursBefore] = useState('0');
  const [status, setStatus] = useState<string>(ScheduleStatus.ACTIVE);
  const [priority, setPriority] = useState('MEDIUM');
  const [animalIds, setAnimalIds] = useState<string[]>([]);
  const [locationId, setLocationId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');

  // Load existing schedule if editing
  const { data: existingSchedule } = useQuery({
    queryKey: ['care-schedule', id],
    queryFn: () => careSchedulesApi.getById(parseInt(id!)).then(res => res.data),
    enabled: isEdit && !!id,
  });

  // Effect to populate form when data is loaded
  useEffect(() => {
    if (existingSchedule) {
      setTitle(existingSchedule.title);
      setDescription(existingSchedule.description || '');
      setCareType(existingSchedule.care_type);
      setRecurrenceType(existingSchedule.recurrence_type);
      setStartDate(existingSchedule.start_date.split('T')[0]);
      const time = new Date(existingSchedule.start_date).toTimeString().slice(0, 5);
      setStartTime(time);
      setEndDate(existingSchedule.end_date ? existingSchedule.end_date.split('T')[0] : '');
      setRecurrenceInterval(existingSchedule.recurrence_interval.toString());
      setReminderEnabled(existingSchedule.reminder_enabled);
      setReminderDaysBefore(existingSchedule.reminder_days_before.toString());
      setReminderHoursBefore(existingSchedule.reminder_hours_before.toString());
      setStatus(existingSchedule.status);
      setPriority(existingSchedule.priority);
      setAnimalIds(existingSchedule.animal_ids?.map((id: number) => id.toString()) || []);
      setLocationId(existingSchedule.location_id?.toString() || '');
      setNotes(existingSchedule.notes || '');
      setEstimatedDuration(existingSchedule.estimated_duration_minutes?.toString() || '');
    }
  }, [existingSchedule]);

  const { data: animals } = useQuery({
    queryKey: ['animals'],
    queryFn: () => animalsApi.getAll().then(res => res.data),
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.getAll().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: CareScheduleCreateRequest) => careSchedulesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['care-schedules-summary'] });
      navigate('/care-schedules');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CareScheduleCreateRequest>) =>
      careSchedulesApi.update(parseInt(id!), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['care-schedules-summary'] });
      navigate('/care-schedules');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Combine date and time
    const startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
    const endDateTime = endDate ? new Date(`${endDate}T${startTime}`).toISOString() : undefined;

    const submitData: CareScheduleCreateRequest = {
      title,
      description: description || undefined,
      care_type: careType as CareType,
      recurrence_type: recurrenceType as RecurrenceType,
      start_date: startDateTime,
      end_date: endDateTime,
      recurrence_interval: parseInt(recurrenceInterval),
      reminder_enabled: reminderEnabled,
      reminder_days_before: parseInt(reminderDaysBefore),
      reminder_hours_before: parseInt(reminderHoursBefore),
      status: status as ScheduleStatus,
      priority,
      animal_ids: animalIds.map(id => parseInt(id)),
      location_id: locationId ? parseInt(locationId) : undefined,
      notes: notes || undefined,
      estimated_duration_minutes: estimatedDuration ? parseInt(estimatedDuration) : undefined,
    };

    if (isEdit) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const formatCareType = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <div className={styles.container}>
      <Text as="h1" size={800} weight="bold" style={{ marginBottom: tokens.spacingVerticalL }}>
        {isEdit ? 'Edit Care Schedule' : 'Create Care Schedule'}
      </Text>

      <Card>
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Basic Information */}
          <div className={styles.field}>
            <Label htmlFor="title" required>Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(_, data) => setTitle(data.value)}
              placeholder="e.g., Weekly Health Check"
              required
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(_, data) => setDescription(data.value)}
              rows={2}
              placeholder="Brief description of the care task..."
            />
          </div>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <Label htmlFor="care_type" required>Care Type</Label>
              <Dropdown
                value={careType}
                selectedOptions={[careType]}
                onOptionSelect={(_, data) => setCareType(data.optionValue || CareType.HEALTH_CHECK)}
              >
                {Object.values(CareType).map(type => (
                  <Option key={type} value={type}>{formatCareType(type)}</Option>
                ))}
              </Dropdown>
            </div>

            <div className={styles.field}>
              <Label htmlFor="priority">Priority</Label>
              <Dropdown
                value={priority}
                selectedOptions={[priority]}
                onOptionSelect={(_, data) => setPriority(data.optionValue || 'MEDIUM')}
              >
                <Option value="LOW">Low</Option>
                <Option value="MEDIUM">Medium</Option>
                <Option value="HIGH">High</Option>
                <Option value="URGENT">Urgent</Option>
              </Dropdown>
            </div>
          </div>

          {/* Schedule Settings */}
          <div className={styles.section}>
            <Text weight="semibold" size={400} style={{ marginBottom: tokens.spacingVerticalM }}>
              Schedule Settings
            </Text>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <Label htmlFor="recurrence_type" required>Recurrence</Label>
                <Dropdown
                  value={recurrenceType}
                  selectedOptions={[recurrenceType]}
                  onOptionSelect={(_, data) => setRecurrenceType(data.optionValue || RecurrenceType.ONCE)}
                >
                  <Option value={RecurrenceType.ONCE}>Once</Option>
                  <Option value={RecurrenceType.DAILY}>Daily</Option>
                  <Option value={RecurrenceType.WEEKLY}>Weekly</Option>
                  <Option value={RecurrenceType.BIWEEKLY}>Bi-weekly</Option>
                  <Option value={RecurrenceType.MONTHLY}>Monthly</Option>
                  <Option value={RecurrenceType.QUARTERLY}>Quarterly</Option>
                  <Option value={RecurrenceType.YEARLY}>Yearly</Option>
                </Dropdown>
              </div>

              {recurrenceType !== RecurrenceType.ONCE && (
                <div className={styles.field}>
                  <Label htmlFor="recurrence_interval">Interval</Label>
                  <Input
                    id="recurrence_interval"
                    type="number"
                    value={recurrenceInterval}
                    onChange={(_, data) => setRecurrenceInterval(data.value)}
                    min="1"
                    placeholder="1"
                  />
                  <Text className={styles.infoText}>
                    Repeat every {recurrenceInterval} {recurrenceType.toLowerCase()}(s)
                  </Text>
                </div>
              )}
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <Label htmlFor="start_date" required>Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(_, data) => setStartDate(data.value)}
                  required
                />
              </div>

              <div className={styles.field}>
                <Label htmlFor="start_time" required>Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={startTime}
                  onChange={(_, data) => setStartTime(data.value)}
                  required
                />
              </div>
            </div>

            {recurrenceType !== RecurrenceType.ONCE && (
              <div className={styles.field}>
                <Label htmlFor="end_date">End Date (Optional)</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={endDate}
                  onChange={(_, data) => setEndDate(data.value)}
                />
                <Text className={styles.infoText}>
                  Leave empty for indefinite recurrence
                </Text>
              </div>
            )}

            <div className={styles.field}>
              <Label htmlFor="estimated_duration">Estimated Duration (minutes)</Label>
              <Input
                id="estimated_duration"
                type="number"
                value={estimatedDuration}
                onChange={(_, data) => setEstimatedDuration(data.value)}
                min="0"
                placeholder="30"
              />
            </div>
          </div>

          {/* Assignment */}
          <div className={styles.section}>
            <Text weight="semibold" size={400} style={{ marginBottom: tokens.spacingVerticalM }}>
              Assignment
            </Text>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <Label htmlFor="animal_ids">Animals (Optional)</Label>
                <Dropdown
                  placeholder="Select animals..."
                  multiselect
                  selectedOptions={animalIds}
                  onOptionSelect={(_, data) => {
                    setAnimalIds(data.selectedOptions as string[]);
                  }}
                >
                  {animals?.map(animal => (
                    <Option
                      key={animal.id}
                      value={animal.id.toString()}
                      text={`${animal.name || animal.tag_number}`}
                    >
                      {animal.name || animal.tag_number}
                    </Option>
                  ))}
                </Dropdown>
                <Text className={styles.infoText}>
                  {animalIds.length > 0 ? `${animalIds.length} animal(s) selected` : 'No animals selected'}
                </Text>
              </div>

              <div className={styles.field}>
                <Label htmlFor="location_id">Location (Optional)</Label>
                <Dropdown
                  placeholder="Select location..."
                  value={locationId}
                  selectedOptions={locationId ? [locationId] : []}
                  onOptionSelect={(_, data) => setLocationId(data.optionValue || '')}
                >
                  <Option value="">None</Option>
                  {locations?.map(location => (
                    <Option
                      key={location.id}
                      value={location.id.toString()}
                      text={location.name}
                    >
                      {location.name}
                    </Option>
                  ))}
                </Dropdown>
                {locationId && (
                  <Button
                    appearance="subtle"
                    size="small"
                    onClick={() => {
                      const locationAnimals = animals?.filter(a => a.current_location_id === parseInt(locationId)) || [];
                      setAnimalIds(locationAnimals.map(a => a.id.toString()));
                    }}
                    style={{ marginTop: tokens.spacingVerticalXS }}
                  >
                    Select all animals at this location
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Reminders */}
          <div className={styles.section}>
            <Text weight="semibold" size={400} style={{ marginBottom: tokens.spacingVerticalM }}>
              Reminders
            </Text>

            <div className={styles.field}>
              <Checkbox
                checked={reminderEnabled}
                onChange={(_, data) => setReminderEnabled(data.checked === true)}
                label="Enable reminders"
              />
            </div>

            {reminderEnabled && (
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <Label htmlFor="reminder_days">Days Before</Label>
                  <Input
                    id="reminder_days"
                    type="number"
                    value={reminderDaysBefore}
                    onChange={(_, data) => setReminderDaysBefore(data.value)}
                    min="0"
                  />
                </div>

                <div className={styles.field}>
                  <Label htmlFor="reminder_hours">Hours Before</Label>
                  <Input
                    id="reminder_hours"
                    type="number"
                    value={reminderHoursBefore}
                    onChange={(_, data) => setReminderHoursBefore(data.value)}
                    min="0"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Additional Details */}
          <div className={styles.field}>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(_, data) => setNotes(data.value)}
              rows={4}
              placeholder="Additional notes or instructions..."
            />
          </div>

          {isEdit && (
            <div className={styles.field}>
              <Label htmlFor="status">Status</Label>
              <Dropdown
                value={status}
                selectedOptions={[status]}
                onOptionSelect={(_, data) => setStatus(data.optionValue || ScheduleStatus.ACTIVE)}
              >
                <Option value={ScheduleStatus.ACTIVE}>Active</Option>
                <Option value={ScheduleStatus.PAUSED}>Paused</Option>
                <Option value={ScheduleStatus.COMPLETED}>Completed</Option>
                <Option value={ScheduleStatus.CANCELLED}>Cancelled</Option>
              </Dropdown>
            </div>
          )}

          <div className={styles.actions}>
            <Button
              type="submit"
              appearance="primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending)
                ? 'Saving...'
                : (isEdit ? 'Update Schedule' : 'Create Schedule')}
            </Button>
            <Button
              type="button"
              appearance="secondary"
              onClick={() => navigate('/care-schedules')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CareScheduleForm;
