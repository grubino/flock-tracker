import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
import {
  Text,
  Button,
  Badge,
  makeStyles,
  tokens,
  Spinner,
  Card,
} from '@fluentui/react-components';
import { Edit24Regular, CalendarAdd24Regular, Delete24Regular } from '@fluentui/react-icons';
import { careSchedulesApi, careCompletionsApi, animalsApi, locationsApi } from '../../services/api';
import { buildGoogleCalendarUrl } from '../../utils/googleCalendar';
import type { UpcomingTask } from '../../types';

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingVerticalXL,
    maxWidth: '800px',
    margin: '0 auto',
    '@media (max-width: 768px)': {
      padding: tokens.spacingVerticalM,
    },
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacingVerticalL,
    gap: tokens.spacingHorizontalM,
    '@media (max-width: 768px)': {
      flexDirection: 'column',
    },
  },
  headerActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexShrink: 0,
  },
  section: {
    marginBottom: tokens.spacingVerticalL,
  },
  sectionTitle: {
    marginBottom: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'block',
  },
  field: {
    display: 'grid',
    gridTemplateColumns: '180px 1fr',
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalS,
    alignItems: 'start',
  },
  badgeGroup: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
    marginBottom: tokens.spacingVerticalM,
  },
  completionItem: {
    padding: tokens.spacingVerticalS,
    marginBottom: tokens.spacingVerticalS,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: tokens.spacingVerticalXXL,
  },
});

const formatCareType = (type: string) =>
  type.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');

const formatRecurrence = (type: string, interval: number) => {
  if (type === 'once') return 'One-time';
  const label = type.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  return interval > 1 ? `Every ${interval} ${label}` : label;
};

const getPriorityColor = (priority: string): 'danger' | 'warning' | 'informative' | 'subtle' => {
  switch (priority?.toUpperCase()) {
    case 'URGENT': return 'danger';
    case 'HIGH': return 'warning';
    case 'MEDIUM': return 'informative';
    default: return 'subtle';
  }
};

const getStatusColor = (status: string): 'success' | 'warning' | 'danger' | 'subtle' => {
  switch (status?.toUpperCase()) {
    case 'ACTIVE': return 'success';
    case 'PAUSED': return 'warning';
    case 'CANCELLED': return 'danger';
    default: return 'subtle';
  }
};

const CareScheduleDetail: React.FC = () => {
  const styles = useStyles();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scheduleId = id ? parseInt(id) : undefined;

  const deleteMutation = useMutation({
    mutationFn: () => careSchedulesApi.delete(scheduleId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-schedules'] });
      navigate('/care-schedules');
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Delete "${schedule?.title}"? This cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['care-schedule', scheduleId],
    queryFn: () => careSchedulesApi.getById(scheduleId!).then(res => res.data),
    enabled: !!scheduleId,
  });

  const { data: completions } = useQuery({
    queryKey: ['care-completions', scheduleId],
    queryFn: () => careCompletionsApi.getAll({ schedule_id: scheduleId }).then(res => res.data),
    enabled: !!scheduleId,
  });

  const { data: animals } = useQuery({
    queryKey: ['animals'],
    queryFn: () => animalsApi.getAll().then(res => res.data),
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.getAll().then(res => res.data),
  });

  if (isLoading || !schedule) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label="Loading schedule..." />
      </div>
    );
  }

  const animalNames = schedule.animal_ids?.length
    ? schedule.animal_ids
        .map(aid => {
          const a = animals?.find(x => x.id === aid);
          return a ? (a.name || a.tag_number) : `#${aid}`;
        })
        .join(', ')
    : null;

  const locationName = schedule.location_id
    ? locations?.find(l => l.id === schedule.location_id)?.name
    : null;

  const gcalTask: UpcomingTask = {
    schedule_id: schedule.id,
    title: schedule.title,
    care_type: schedule.care_type,
    due_date: schedule.next_due_date,
    priority: schedule.priority,
    animal_ids: schedule.animal_ids,
    location_id: schedule.location_id,
    status: schedule.status,
    days_until_due: Math.round(
      (new Date(schedule.next_due_date).getTime() - Date.now()) / 86400000
    ),
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Text as="h1" size={800} weight="bold" style={{ display: 'block', marginBottom: tokens.spacingVerticalS }}>
            {schedule.title}
          </Text>
          <div className={styles.badgeGroup}>
            <Badge appearance="filled" color={getStatusColor(schedule.status)}>
              {schedule.status}
            </Badge>
            <Badge appearance="outline" color="brand">
              {formatCareType(schedule.care_type)}
            </Badge>
            {schedule.priority && (
              <Badge appearance="filled" color={getPriorityColor(schedule.priority)}>
                {schedule.priority}
              </Badge>
            )}
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button
            appearance="subtle"
            icon={<CalendarAdd24Regular />}
            as="a"
            href={buildGoogleCalendarUrl(gcalTask, animalNames ?? undefined, schedule.estimated_duration_minutes)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Add to Google Calendar
          </Button>
          <RouterLink to={`/care-schedules/${schedule.id}/edit`} style={{ textDecoration: 'none' }}>
            <Button appearance="primary" icon={<Edit24Regular />}>
              Edit
            </Button>
          </RouterLink>
          <Button
            appearance="subtle"
            icon={<Delete24Regular />}
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            style={{ color: tokens.colorPaletteRedForeground1 }}
          >
            Delete
          </Button>
        </div>
      </div>

      <Card style={{ padding: tokens.spacingVerticalL, marginBottom: tokens.spacingVerticalL }}>
        <div className={styles.section}>
          <Text weight="semibold" size={400} className={styles.sectionTitle}>Schedule Details</Text>

          <div className={styles.field}>
            <Text style={{ color: tokens.colorNeutralForeground3 }}>Next Due</Text>
            <Text weight="semibold">{new Date(schedule.next_due_date).toLocaleString()}</Text>
          </div>
          <div className={styles.field}>
            <Text style={{ color: tokens.colorNeutralForeground3 }}>Recurrence</Text>
            <Text>{formatRecurrence(schedule.recurrence_type, schedule.recurrence_interval)}</Text>
          </div>
          <div className={styles.field}>
            <Text style={{ color: tokens.colorNeutralForeground3 }}>Start Date</Text>
            <Text>{new Date(schedule.start_date).toLocaleDateString()}</Text>
          </div>
          {schedule.end_date && (
            <div className={styles.field}>
              <Text style={{ color: tokens.colorNeutralForeground3 }}>End Date</Text>
              <Text>{new Date(schedule.end_date).toLocaleDateString()}</Text>
            </div>
          )}
          {schedule.estimated_duration_minutes && (
            <div className={styles.field}>
              <Text style={{ color: tokens.colorNeutralForeground3 }}>Est. Duration</Text>
              <Text>{schedule.estimated_duration_minutes} min</Text>
            </div>
          )}
          {animalNames && (
            <div className={styles.field}>
              <Text style={{ color: tokens.colorNeutralForeground3 }}>Animals</Text>
              <Text>{animalNames}</Text>
            </div>
          )}
          {locationName && (
            <div className={styles.field}>
              <Text style={{ color: tokens.colorNeutralForeground3 }}>Location</Text>
              <Text>{locationName}</Text>
            </div>
          )}
          {schedule.description && (
            <div className={styles.field}>
              <Text style={{ color: tokens.colorNeutralForeground3 }}>Description</Text>
              <Text>{schedule.description}</Text>
            </div>
          )}
          {schedule.notes && (
            <div className={styles.field}>
              <Text style={{ color: tokens.colorNeutralForeground3 }}>Notes</Text>
              <Text>{schedule.notes}</Text>
            </div>
          )}
          {schedule.reminder_enabled && (
            <div className={styles.field}>
              <Text style={{ color: tokens.colorNeutralForeground3 }}>Reminder</Text>
              <Text>
                {schedule.reminder_days_before}d {schedule.reminder_hours_before}h before
              </Text>
            </div>
          )}
        </div>
      </Card>

      <Card style={{ padding: tokens.spacingVerticalL }}>
        <Text weight="semibold" size={400} className={styles.sectionTitle}>
          Completion History ({completions?.length ?? 0})
        </Text>
        {completions && completions.length > 0 ? (
          completions.map(c => (
            <div key={c.id} className={styles.completionItem}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text weight="semibold" size={300}>
                  {new Date(c.completed_date).toLocaleString()}
                </Text>
                <Badge appearance="filled" color={c.status === 'COMPLETED' ? 'success' : 'subtle'}>
                  {c.status}
                </Badge>
              </div>
              {c.notes && (
                <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block', marginTop: tokens.spacingVerticalXS }}>
                  {c.notes}
                </Text>
              )}
              {c.duration_minutes && (
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                  Duration: {c.duration_minutes} min
                </Text>
              )}
            </div>
          ))
        ) : (
          <Text style={{ color: tokens.colorNeutralForeground3 }}>No completions recorded yet.</Text>
        )}
      </Card>

      <div style={{ marginTop: tokens.spacingVerticalL }}>
        <Button appearance="subtle" onClick={() => navigate('/care-schedules')}>
          ← Back to Schedules
        </Button>
      </div>
    </div>
  );
};

export default CareScheduleDetail;
