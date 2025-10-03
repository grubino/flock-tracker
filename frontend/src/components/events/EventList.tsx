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
  Input,
  Label
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { eventsApi, animalsApi } from '../../services/api';
import { EventType, AnimalType } from '../../types';
import type { Event } from '../../types';

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingVerticalXL,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalL,
  },
  filterSection: {
    marginBottom: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalM,
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
  },
  activeFilters: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
    marginTop: tokens.spacingVerticalS,
  },
  filterChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    backgroundColor: tokens.colorBrandBackground2,
    borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase200,
  },
  eventsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  eventCard: {
    padding: tokens.spacingVerticalM,
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacingVerticalS,
  },
  eventDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  eventActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
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

const EventList: React.FC = () => {
  const styles = useStyles();

  // Filter state
  const [selectedAnimalType, setSelectedAnimalType] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>('');

  // Build filter params
  const filterParams = useMemo(() => {
    const params: any = {};
    if (selectedEventType) params.event_type = selectedEventType;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (selectedAnimalId) params.animal_id = parseInt(selectedAnimalId);
    return params;
  }, [selectedEventType, startDate, endDate, selectedAnimalId]);

  const { data: events, isLoading, error } = useQuery({
    queryKey: ['events', filterParams],
    queryFn: () => eventsApi.getAll(filterParams).then(res => res.data),
  });

  const { data: animals } = useQuery({
    queryKey: ['animals'],
    queryFn: () => animalsApi.getAll().then(res => res.data),
  });

  // Filter events by animal type on the frontend
  const filteredEvents = useMemo(() => {
    if (!events || !animals) return events;
    if (!selectedAnimalType) return events;

    const animalsByType = new Set(
      animals
        .filter(animal => animal.animal_type === selectedAnimalType)
        .map(animal => animal.id)
    );

    return events.filter(event => animalsByType.has(event.animal_id));
  }, [events, animals, selectedAnimalType]);

  const clearFilters = () => {
    setSelectedAnimalType('');
    setSelectedEventType('');
    setStartDate('');
    setEndDate('');
    setSelectedAnimalId('');
  };

  const hasActiveFilters = selectedAnimalType || selectedEventType || startDate || endDate || selectedAnimalId;

  const getAnimalName = (animalId: number) => {
    const animal = animals?.find(a => a.id === animalId);
    return animal ? (animal.name || animal.tag_number) : `Animal #${animalId}`;
  };

  const getAnimalType = (animalId: number) => {
    const animal = animals?.find(a => a.id === animalId);
    return animal?.animal_type || 'unknown';
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label="Loading events..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.loadingContainer}>
        <Text color="danger">Error loading events</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text as="h1" size={800} weight="bold">
          Events
        </Text>
        <RouterLink to="/events/new" style={{ textDecoration: 'none' }}>
          <Button appearance="primary">
            Add Event
          </Button>
        </RouterLink>
      </div>

      <Card className={styles.filterSection}>
        <Text weight="semibold" size={400}>Filters</Text>

        <div className={styles.filterGrid}>
          <div className={styles.filterField}>
            <Label>Animal Type</Label>
            <Dropdown
              placeholder="All types"
              value={selectedAnimalType}
              selectedOptions={selectedAnimalType ? [selectedAnimalType] : []}
              onOptionSelect={(_, data) => setSelectedAnimalType(data.optionValue || '')}
            >
              <Option value="">All types</Option>
              <Option value={AnimalType.SHEEP}>Sheep</Option>
              <Option value={AnimalType.CHICKEN}>Chicken</Option>
              <Option value={AnimalType.HIVE}>Hive</Option>
            </Dropdown>
          </div>

          <div className={styles.filterField}>
            <Label>Specific Animal</Label>
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
                  text={`${animal.name || animal.tag_number} (${animal.animal_type})`}
                >
                  {animal.name || animal.tag_number} ({animal.animal_type})
                </Option>
              ))}
            </Dropdown>
          </div>

          <div className={styles.filterField}>
            <Label>Event Type</Label>
            <Dropdown
              placeholder="All event types"
              value={selectedEventType}
              selectedOptions={selectedEventType ? [selectedEventType] : []}
              onOptionSelect={(_, data) => setSelectedEventType(data.optionValue || '')}
            >
              <Option value="">All event types</Option>
              <Option value={EventType.DEWORMING}>Deworming</Option>
              <Option value={EventType.DELICING}>Delicing</Option>
              <Option value={EventType.MITE_TREATMENT}>Mite Treatment</Option>
              <Option value={EventType.LAMBING}>Lambing</Option>
              <Option value={EventType.HEALTH_CHECK}>Health Check</Option>
              <Option value={EventType.DEATH}>Death</Option>
              <Option value={EventType.OTHER}>Other</Option>
            </Dropdown>
          </div>

          <div className={styles.filterField}>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(_, data) => setStartDate(data.value)}
            />
          </div>

          <div className={styles.filterField}>
            <Label>End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(_, data) => setEndDate(data.value)}
            />
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
              Showing {filteredEvents?.length || 0} of {events?.length || 0} events
            </Text>
          </div>
        )}
      </Card>

      {filteredEvents && filteredEvents.length > 0 ? (
        <div className={styles.eventsList}>
          {filteredEvents.map((event: Event) => (
            <Card key={event.id} className={styles.eventCard}>
              <div className={styles.eventHeader}>
                <div className={styles.eventDetails}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalM }}>
                    <Badge appearance="filled" color="brand">
                      {event.event_type.replace('_', ' ')}
                    </Badge>
                    <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>
                      {new Date(event.event_date).toLocaleDateString()}
                    </Text>
                  </div>
                  <RouterLink to={`/animals/${event.animal_id}`} style={{ textDecoration: 'none', alignSelf: 'flex-start' }}>
                    <Button appearance="subtle" size="small">
                      {getAnimalName(event.animal_id)} ({getAnimalType(event.animal_id)})
                    </Button>
                  </RouterLink>
                  {event.description && (
                    <Text size={300}>
                      {event.description}
                    </Text>
                  )}
                  {event.notes && (
                    <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
                      {event.notes}
                    </Text>
                  )}
                </div>
                <div className={styles.eventActions}>
                  <RouterLink to={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
                    <Button appearance="subtle" size="small">
                      View
                    </Button>
                  </RouterLink>
                  <RouterLink to={`/events/${event.id}/edit`} style={{ textDecoration: 'none' }}>
                    <Button appearance="secondary" size="small">
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
            {hasActiveFilters ? 'No events match your filters' : 'No events found'}
          </Text>
          {hasActiveFilters ? (
            <Button appearance="secondary" onClick={clearFilters}>
              Clear Filters
            </Button>
          ) : (
            <RouterLink to="/events/new" style={{ textDecoration: 'none' }}>
              <Button appearance="primary">
                Add Your First Event
              </Button>
            </RouterLink>
          )}
        </div>
      )}
    </div>
  );
};

export default EventList;
