import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  Text,
  Button,
  Badge,
  makeStyles,
  tokens,
  Spinner,
  Card
} from '@fluentui/react-components';
import { eventsApi } from '../../services/api';
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
  const { data: events, isLoading, error } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAll().then(res => res.data),
  });


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

      {events && events.length > 0 ? (
        <div className={styles.eventsList}>
          {events.map((event: Event) => (
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
                      Animal #{event.animal_id}
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
            No events found
          </Text>
          <RouterLink to="/events/new" style={{ textDecoration: 'none' }}>
            <Button appearance="primary">
              Add Your First Event
            </Button>
          </RouterLink>
        </div>
      )}
    </div>
  );
};

export default EventList;