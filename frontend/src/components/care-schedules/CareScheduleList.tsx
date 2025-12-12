import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Label
} from '@fluentui/react-components';
import { Dismiss24Regular, CalendarLtr24Regular } from '@fluentui/react-icons';
import { careSchedulesApi, animalsApi, locationsApi } from '../../services/api';
import { CareType, ScheduleStatus } from '../../types';
import type { CareSchedule } from '../../types';

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
  summarySection: {
    marginBottom: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalM,
  },
  summaryCard: {
    textAlign: 'center',
    padding: tokens.spacingVerticalM,
  },
  filterSection: {
    marginBottom: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalM,
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: tokens.spacingVerticalM,
    },
  },
  filterField: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  filterActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalM,
    alignItems: 'center',
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: tokens.spacingVerticalS,
    },
  },
  schedulesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  scheduleCard: {
    padding: tokens.spacingVerticalM,
  },
  scheduleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacingVerticalS,
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      gap: tokens.spacingVerticalM,
    },
  },
  scheduleDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    flex: 1,
  },
  scheduleActions: {
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

const CareScheduleList: React.FC = () => {
  const styles = useStyles();

  // Filter state
  const [selectedCareType, setSelectedCareType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

  // Build filter params
  const filterParams = useMemo(() => {
    const params: { care_type?: string; status?: string; animal_id?: number; location_id?: number } = {};
    if (selectedCareType) params.care_type = selectedCareType;
    if (selectedStatus) params.status = selectedStatus;
    if (selectedAnimalId) params.animal_id = parseInt(selectedAnimalId);
    if (selectedLocationId) params.location_id = parseInt(selectedLocationId);
    return params;
  }, [selectedCareType, selectedStatus, selectedAnimalId, selectedLocationId]);

  const { data: schedules, isLoading, error } = useQuery({
    queryKey: ['care-schedules', filterParams],
    queryFn: () => careSchedulesApi.getAll(filterParams).then(res => res.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['care-schedules-summary'],
    queryFn: () => careSchedulesApi.getSummary().then(res => res.data),
  });

  const { data: animals } = useQuery({
    queryKey: ['animals'],
    queryFn: () => animalsApi.getAll().then(res => res.data),
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.getAll().then(res => res.data),
  });

  const clearFilters = () => {
    setSelectedCareType('');
    setSelectedStatus('');
    setSelectedAnimalId('');
    setSelectedLocationId('');
  };

  const hasActiveFilters = selectedCareType || selectedStatus || selectedAnimalId || selectedLocationId;

  const getAnimalNames = (animalIds: number[]) => {
    if (!animalIds || animalIds.length === 0) return null;
    const names = animalIds.map(id => {
      const animal = animals?.find(a => a.id === id);
      return animal ? (animal.name || animal.tag_number) : `Animal #${id}`;
    });
    return names.join(', ');
  };

  const getLocationName = (locationId: number) => {
    const location = locations?.find(l => l.id === locationId);
    return location?.name || `Location #${locationId}`;
  };

  const formatCareType = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case ScheduleStatus.ACTIVE:
        return 'success';
      case ScheduleStatus.PAUSED:
        return 'warning';
      case ScheduleStatus.COMPLETED:
        return 'informative';
      case ScheduleStatus.CANCELLED:
        return 'danger';
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

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label="Loading schedules..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.loadingContainer}>
        <Text color="danger">Error loading schedules</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text as="h1" size={800} weight="bold">
          Care Schedules
        </Text>
        <div className={styles.headerActions}>
          <RouterLink to="/care-schedules/calendar" style={{ textDecoration: 'none' }}>
            <Button appearance="secondary" icon={<CalendarLtr24Regular />} style={{ width: '100%' }}>
              Calendar View
            </Button>
          </RouterLink>
          <RouterLink to="/care-schedules/new" style={{ textDecoration: 'none' }}>
            <Button appearance="primary" style={{ width: '100%' }}>
              Add Schedule
            </Button>
          </RouterLink>
        </div>
      </div>

      {summary && (
        <Card className={styles.summarySection}>
          <Text weight="semibold" size={400}>Summary</Text>
          <div className={styles.summaryGrid}>
            <Card className={styles.summaryCard}>
              <Text size={600} weight="bold" style={{ color: tokens.colorPaletteRedForeground1 }}>
                {summary.overdue_count}
              </Text>
              <Text size={200}>Overdue</Text>
            </Card>
            <Card className={styles.summaryCard}>
              <Text size={600} weight="bold" style={{ color: tokens.colorPaletteYellowForeground1 }}>
                {summary.upcoming_7_days_count}
              </Text>
              <Text size={200}>Due in 7 Days</Text>
            </Card>
            <Card className={styles.summaryCard}>
              <Text size={600} weight="bold" style={{ color: tokens.colorBrandForeground1 }}>
                {summary.pending_count}
              </Text>
              <Text size={200}>Pending</Text>
            </Card>
            <Card className={styles.summaryCard}>
              <Text size={600} weight="bold" style={{ color: tokens.colorPaletteGreenForeground1 }}>
                {summary.completed_today_count}
              </Text>
              <Text size={200}>Completed Today</Text>
            </Card>
          </div>
        </Card>
      )}

      <Card className={styles.filterSection}>
        <Text weight="semibold" size={400}>Filters</Text>

        <div className={styles.filterGrid}>
          <div className={styles.filterField}>
            <Label>Care Type</Label>
            <Dropdown
              placeholder="All types"
              value={selectedCareType}
              selectedOptions={selectedCareType ? [selectedCareType] : []}
              onOptionSelect={(_, data) => setSelectedCareType(data.optionValue || '')}
            >
              <Option value="">All types</Option>
              {Object.values(CareType).map(type => (
                <Option key={type} value={type}>{formatCareType(type)}</Option>
              ))}
            </Dropdown>
          </div>

          <div className={styles.filterField}>
            <Label>Status</Label>
            <Dropdown
              placeholder="All statuses"
              value={selectedStatus}
              selectedOptions={selectedStatus ? [selectedStatus] : []}
              onOptionSelect={(_, data) => setSelectedStatus(data.optionValue || '')}
            >
              <Option value="">All statuses</Option>
              {Object.values(ScheduleStatus).map(status => (
                <Option key={status} value={status}>{status}</Option>
              ))}
            </Dropdown>
          </div>

          <div className={styles.filterField}>
            <Label>Animal</Label>
            <Dropdown
              placeholder="All animals"
              value={selectedAnimalId}
              selectedOptions={selectedAnimalId ? [selectedAnimalId] : []}
              onOptionSelect={(_, data) => setSelectedAnimalId(data.optionValue || '')}
            >
              <Option value="">All animals</Option>
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
          </div>

          <div className={styles.filterField}>
            <Label>Location</Label>
            <Dropdown
              placeholder="All locations"
              value={selectedLocationId}
              selectedOptions={selectedLocationId ? [selectedLocationId] : []}
              onOptionSelect={(_, data) => setSelectedLocationId(data.optionValue || '')}
            >
              <Option value="">All locations</Option>
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
          </div>
        </div>

        {hasActiveFilters && (
          <div className={styles.filterActions}>
            <Button
              appearance="subtle"
              size="small"
              onClick={clearFilters}
              icon={<Dismiss24Regular />}
            >
              Clear Filters
            </Button>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              Showing {schedules?.length || 0} schedules
            </Text>
          </div>
        )}
      </Card>

      {schedules && schedules.length > 0 ? (
        <div className={styles.schedulesList}>
          {schedules.map((schedule: CareSchedule) => (
            <Card key={schedule.id} className={styles.scheduleCard}>
              <div className={styles.scheduleHeader}>
                <div className={styles.scheduleDetails}>
                  <Text size={500} weight="semibold">
                    {schedule.title}
                  </Text>
                  <div className={styles.badgeGroup}>
                    <Badge appearance="filled" color={getStatusColor(schedule.status)}>
                      {schedule.status}
                    </Badge>
                    <Badge appearance="outline" color="brand">
                      {formatCareType(schedule.care_type)}
                    </Badge>
                    <Badge appearance="outline">
                      {schedule.recurrence_type}
                    </Badge>
                    {schedule.priority && (
                      <Badge appearance="filled" color={getPriorityColor(schedule.priority)}>
                        {schedule.priority}
                      </Badge>
                    )}
                  </div>
                  <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>
                    Next due: {new Date(schedule.next_due_date).toLocaleDateString()} at {new Date(schedule.next_due_date).toLocaleTimeString()}
                  </Text>
                  {schedule.animal_ids && schedule.animal_ids.length > 0 && (
                    <Text size={300}>
                      Animals: {getAnimalNames(schedule.animal_ids)}
                    </Text>
                  )}
                  {schedule.location_id && (
                    <Text size={300}>
                      Location: {getLocationName(schedule.location_id)}
                    </Text>
                  )}
                  {schedule.description && (
                    <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>
                      {schedule.description}
                    </Text>
                  )}
                </div>
                <div className={styles.scheduleActions}>
                  <RouterLink to={`/care-schedules/${schedule.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                    <Button appearance="subtle" size="small" style={{ width: '100%' }}>
                      View
                    </Button>
                  </RouterLink>
                  <RouterLink to={`/care-schedules/${schedule.id}/edit`} style={{ textDecoration: 'none', flex: 1 }}>
                    <Button appearance="secondary" size="small" style={{ width: '100%' }}>
                      Edit
                    </Button>
                  </RouterLink>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Text size={400} style={{ marginBottom: tokens.spacingVerticalM, display: 'block' }}>
            {hasActiveFilters ? 'No schedules match your filters' : 'No schedules found'}
          </Text>
          {hasActiveFilters ? (
            <Button appearance="secondary" onClick={clearFilters}>
              Clear Filters
            </Button>
          ) : (
            <RouterLink to="/care-schedules/new" style={{ textDecoration: 'none' }}>
              <Button appearance="primary">
                Create Your First Schedule
              </Button>
            </RouterLink>
          )}
        </div>
      )}
    </div>
  );
};

export default CareScheduleList;
