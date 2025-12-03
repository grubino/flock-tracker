import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  Text,
  Button,
  Badge,
  makeStyles,
  tokens,
  Spinner,
  Card,
  Dropdown,
  Option,
  Label,
  Checkbox,
  Textarea
} from '@fluentui/react-components';
import { Checkmark24Regular, List24Regular } from '@fluentui/react-icons';
import { careSchedulesApi, careCompletionsApi, animalsApi } from '../../services/api';
import { TaskStatus } from '../../types';
import type { UpcomingTask, CareCompletionCreateRequest } from '../../types';

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingVerticalXL,
    '@media (max-width: 768px)': {
      padding: tokens.spacingVerticalM,
    },
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalL,
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: tokens.spacingVerticalM,
    },
  },
  headerActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      gap: tokens.spacingVerticalS,
    },
  },
  filterSection: {
    marginBottom: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  filterField: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    maxWidth: '300px',
  },
  tasksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  dateGroup: {
    marginBottom: tokens.spacingVerticalL,
  },
  dateHeader: {
    marginBottom: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalS,
    borderBottom: `2px solid ${tokens.colorNeutralStroke1}`,
  },
  taskCard: {
    padding: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalS,
  },
  taskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacingVerticalS,
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      gap: tokens.spacingVerticalM,
    },
  },
  taskDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    flex: 1,
  },
  taskActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    '@media (max-width: 768px)': {
      width: '100%',
      flexDirection: 'column',
      gap: tokens.spacingVerticalS,
    },
  },
  badgeGroup: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
    marginBottom: tokens.spacingVerticalXS,
  },
  completionForm: {
    marginTop: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  emptyState: {
    textAlign: 'center',
    padding: tokens.spacingVerticalXXL,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacingVerticalXXL,
  },
});

const CareScheduleCalendar: React.FC = () => {
  const styles = useStyles();
  const queryClient = useQueryClient();

  const [daysAhead, setDaysAhead] = useState('7');
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0]);
  const [completionTime, setCompletionTime] = useState(new Date().toTimeString().slice(0, 5));

  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['upcoming-tasks', daysAhead],
    queryFn: () => careSchedulesApi.getUpcoming({ days: parseInt(daysAhead) }).then(res => res.data),
  });

  const { data: animals } = useQuery({
    queryKey: ['animals'],
    queryFn: () => animalsApi.getAll().then(res => res.data),
  });

  const completeMutation = useMutation({
    mutationFn: (completion: CareCompletionCreateRequest) => careCompletionsApi.create(completion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcoming-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['care-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['care-schedules-summary'] });
      setCompletingTaskId(null);
      setCompletionNotes('');
    },
  });

  const getAnimalName = (animalId: number) => {
    const animal = animals?.find(a => a.id === animalId);
    return animal ? (animal.name || animal.tag_number) : `Animal #${animalId}`;
  };

  const formatCareType = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OVERDUE':
        return 'danger';
      case 'PENDING':
        return 'informative';
      default:
        return 'subtle';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'URGENT':
        return 'danger';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'informative';
      case 'LOW':
        return 'subtle';
      default:
        return 'subtle';
    }
  };

  const groupTasksByDate = (tasks: UpcomingTask[]) => {
    const groups: { [key: string]: UpcomingTask[] } = {};

    tasks.forEach(task => {
      const date = new Date(task.due_date).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(task);
    });

    return Object.entries(groups).sort((a, b) =>
      new Date(a[1][0].due_date).getTime() - new Date(b[1][0].due_date).getTime()
    );
  };

  const handleCompleteTask = (task: UpcomingTask) => {
    setCompletingTaskId(task.schedule_id);
  };

  const handleSubmitCompletion = () => {
    if (completingTaskId === null) return;

    const task = tasks?.find(t => t.schedule_id === completingTaskId);
    if (!task) return;

    const completedDateTime = new Date(`${completionDate}T${completionTime}`).toISOString();

    const completion: CareCompletionCreateRequest = {
      schedule_id: completingTaskId,
      scheduled_date: task.due_date,
      completed_date: completedDateTime,
      status: TaskStatus.COMPLETED,
      notes: completionNotes || undefined,
    };

    completeMutation.mutate(completion);
  };

  const handleCancelCompletion = () => {
    setCompletingTaskId(null);
    setCompletionNotes('');
    setCompletionDate(new Date().toISOString().split('T')[0]);
    setCompletionTime(new Date().toTimeString().slice(0, 5));
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label="Loading upcoming tasks..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.loadingContainer}>
        <Text color="danger">Error loading tasks</Text>
      </div>
    );
  }

  const groupedTasks = tasks ? groupTasksByDate(tasks) : [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text as="h1" size={800} weight="bold">
          Upcoming Care Tasks
        </Text>
        <div className={styles.headerActions}>
          <RouterLink to="/care-schedules" style={{ textDecoration: 'none' }}>
            <Button appearance="secondary" icon={<List24Regular />} style={{ width: '100%' }}>
              List View
            </Button>
          </RouterLink>
          <RouterLink to="/care-schedules/new" style={{ textDecoration: 'none' }}>
            <Button appearance="primary" style={{ width: '100%' }}>
              Add Schedule
            </Button>
          </RouterLink>
        </div>
      </div>

      <Card className={styles.filterSection}>
        <div className={styles.filterField}>
          <Label>Days Ahead</Label>
          <Dropdown
            value={daysAhead}
            selectedOptions={[daysAhead]}
            onOptionSelect={(_, data) => setDaysAhead(data.optionValue || '7')}
          >
            <Option value="1">Today</Option>
            <Option value="3">Next 3 Days</Option>
            <Option value="7">Next 7 Days</Option>
            <Option value="14">Next 2 Weeks</Option>
            <Option value="30">Next 30 Days</Option>
          </Dropdown>
        </div>
      </Card>

      {groupedTasks.length > 0 ? (
        <div className={styles.tasksList}>
          {groupedTasks.map(([dateStr, dateTasks]) => {
            const date = new Date(dateTasks[0].due_date);
            const isToday = date.toDateString() === new Date().toDateString();
            const isTomorrow = date.toDateString() === new Date(Date.now() + 86400000).toDateString();

            let dateLabel = dateStr;
            if (isToday) dateLabel = `Today (${dateStr})`;
            if (isTomorrow) dateLabel = `Tomorrow (${dateStr})`;

            return (
              <div key={dateStr} className={styles.dateGroup}>
                <div className={styles.dateHeader}>
                  <Text size={500} weight="semibold">
                    {dateLabel}
                  </Text>
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                    {dateTasks.length} task{dateTasks.length !== 1 ? 's' : ''}
                  </Text>
                </div>

                {dateTasks.map((task: UpcomingTask) => (
                  <Card key={task.schedule_id} className={styles.taskCard}>
                    <div className={styles.taskHeader}>
                      <div className={styles.taskDetails}>
                        <Text size={500} weight="semibold">
                          {task.title}
                        </Text>
                        <div className={styles.badgeGroup}>
                          <Badge appearance="filled" color={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                          <Badge appearance="outline" color="brand">
                            {formatCareType(task.care_type)}
                          </Badge>
                          {task.priority && (
                            <Badge appearance="filled" color={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          )}
                        </div>
                        <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>
                          Due: {new Date(task.due_date).toLocaleTimeString()}
                        </Text>
                        {task.animal_id && (
                          <Text size={300}>
                            Animal: {getAnimalName(task.animal_id)}
                          </Text>
                        )}
                        {task.days_until_due < 0 && (
                          <Text size={300} style={{ color: tokens.colorPaletteRedForeground1 }}>
                            {Math.abs(task.days_until_due)} day{Math.abs(task.days_until_due) !== 1 ? 's' : ''} overdue
                          </Text>
                        )}
                      </div>
                      <div className={styles.taskActions}>
                        <RouterLink to={`/care-schedules/${task.schedule_id}`} style={{ textDecoration: 'none', flex: 1 }}>
                          <Button appearance="subtle" size="small" style={{ width: '100%' }}>
                            View
                          </Button>
                        </RouterLink>
                        <Button
                          appearance="primary"
                          size="small"
                          icon={<Checkmark24Regular />}
                          onClick={() => handleCompleteTask(task)}
                          disabled={completingTaskId !== null}
                          style={{ flex: 1 }}
                        >
                          Complete
                        </Button>
                      </div>
                    </div>

                    {completingTaskId === task.schedule_id && (
                      <div className={styles.completionForm}>
                        <Text weight="semibold">Mark as Complete</Text>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacingHorizontalM }}>
                          <div className={styles.filterField}>
                            <Label htmlFor="completion_date">Completion Date</Label>
                            <input
                              id="completion_date"
                              type="date"
                              value={completionDate}
                              onChange={(e) => setCompletionDate(e.target.value)}
                              style={{
                                padding: '6px',
                                borderRadius: tokens.borderRadiusMedium,
                                border: `1px solid ${tokens.colorNeutralStroke1}`,
                              }}
                            />
                          </div>
                          <div className={styles.filterField}>
                            <Label htmlFor="completion_time">Time</Label>
                            <input
                              id="completion_time"
                              type="time"
                              value={completionTime}
                              onChange={(e) => setCompletionTime(e.target.value)}
                              style={{
                                padding: '6px',
                                borderRadius: tokens.borderRadiusMedium,
                                border: `1px solid ${tokens.colorNeutralStroke1}`,
                              }}
                            />
                          </div>
                        </div>

                        <div className={styles.filterField}>
                          <Label htmlFor="completion_notes">Notes (Optional)</Label>
                          <Textarea
                            id="completion_notes"
                            value={completionNotes}
                            onChange={(_, data) => setCompletionNotes(data.value)}
                            rows={3}
                            placeholder="Any observations or notes about this task..."
                          />
                        </div>

                        <div style={{ display: 'flex', gap: tokens.spacingHorizontalS }}>
                          <Button
                            appearance="primary"
                            onClick={handleSubmitCompletion}
                            disabled={completeMutation.isPending}
                          >
                            {completeMutation.isPending ? 'Saving...' : 'Save Completion'}
                          </Button>
                          <Button
                            appearance="secondary"
                            onClick={handleCancelCompletion}
                            disabled={completeMutation.isPending}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Text size={400} style={{ marginBottom: tokens.spacingVerticalM, display: 'block' }}>
            No upcoming tasks in the next {daysAhead} day{daysAhead !== '1' ? 's' : ''}
          </Text>
          <RouterLink to="/care-schedules/new" style={{ textDecoration: 'none' }}>
            <Button appearance="primary">
              Create a Schedule
            </Button>
          </RouterLink>
        </div>
      )}
    </div>
  );
};

export default CareScheduleCalendar;
