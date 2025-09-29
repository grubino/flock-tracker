import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Card,
  CardHeader,
  Text,
  Button,
  Badge,
  makeStyles,
  tokens,
  Spinner
} from '@fluentui/react-components';
import { animalsApi, eventsApi } from '../../services/api';
import { AnimalType } from '../../types';
import { PhotoGallery } from '../PhotoGallery';

const useStyles = makeStyles({
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: tokens.spacingVerticalXL,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalL,
  },
  card: {
    padding: tokens.spacingVerticalL,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: tokens.spacingVerticalL,
  },
  field: {
    marginBottom: tokens.spacingVerticalM,
  },
  label: {
    display: 'block',
    marginBottom: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForeground2,
  },
  value: {
    color: tokens.colorNeutralForeground1,
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
  },
  eventCard: {
    padding: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacingVerticalXXL,
  },
  emptyState: {
    textAlign: 'center',
    padding: tokens.spacingVerticalXXL,
  },
});

const AnimalDetail: React.FC = () => {
  const styles = useStyles();
  const { id } = useParams<{ id: string }>();
  const animalId = parseInt(id!);

  const { data: animal, isLoading: animalLoading, error: animalError } = useQuery({
    queryKey: ['animal', animalId],
    queryFn: () => animalsApi.getById(animalId).then(res => res.data),
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', animalId],
    queryFn: () => eventsApi.getByAnimal(animalId).then(res => res.data),
  });

  if (animalLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label="Loading animal..." />
      </div>
    );
  }

  if (animalError) {
    return (
      <div className={styles.loadingContainer}>
        <Text color="danger">Error loading animal</Text>
      </div>
    );
  }

  if (!animal) {
    return (
      <div className={styles.loadingContainer}>
        <Text>Animal not found</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text as="h1" size={800} weight="bold">
          {animal.name || `Tag: ${animal.tag_number}`}
        </Text>
        <div className={styles.actions}>
          <RouterLink to={`/animals/${animal.id}/edit`} style={{ textDecoration: 'none' }}>
            <Button appearance="primary">
              Edit
            </Button>
          </RouterLink>
          <RouterLink to="/animals" style={{ textDecoration: 'none' }}>
            <Button appearance="secondary">
              Back to List
            </Button>
          </RouterLink>
        </div>
      </div>

      <Card className={styles.card}>
        <div className={styles.grid}>
          <div>
            <Text as="h2" size={600} weight="semibold" style={{ marginBottom: tokens.spacingVerticalM }}>
              Basic Information
            </Text>
            <div>
              <div className={styles.field}>
                <Text size={300} className={styles.label}>Tag Number</Text>
                <Text size={400} className={styles.value}>{animal.tag_number}</Text>
              </div>
              <div className={styles.field}>
                <Text size={300} className={styles.label}>Animal Type</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
                  <Text size={400} className={styles.value} style={{ textTransform: 'capitalize' }}>
                    {animal.animal_type}
                  </Text>
                  {animal.animal_type === AnimalType.SHEEP && animal.sheep_gender && (
                    <Badge appearance="filled" color="brand">
                      {animal.sheep_gender}
                    </Badge>
                  )}
                  {animal.animal_type === AnimalType.CHICKEN && animal.chicken_gender && (
                    <Badge appearance="filled" color="brand">
                      {animal.chicken_gender}
                    </Badge>
                  )}
                </div>
              </div>
              {animal.name && (
                <div className={styles.field}>
                  <Text size={300} className={styles.label}>Name</Text>
                  <Text size={400} className={styles.value}>{animal.name}</Text>
                </div>
              )}
              {animal.birth_date && (
                <div className={styles.field}>
                  <Text size={300} className={styles.label}>Birth Date</Text>
                  <Text size={400} className={styles.value}>
                    {new Date(animal.birth_date).toLocaleDateString()}
                  </Text>
                </div>
              )}
              <div className={styles.field}>
                <Text size={300} className={styles.label}>Current Location</Text>
                <Text size={400} className={styles.value}>
                  {animal.current_location ? (
                    <>
                      {animal.current_location.name}
                      {animal.current_location.paddock_name && ` - ${animal.current_location.paddock_name}`}
                    </>
                  ) : (
                    'No location assigned'
                  )}
                </Text>
              </div>
            </div>
          </div>

          <div>
            <Text as="h2" size={600} weight="semibold" style={{ marginBottom: tokens.spacingVerticalM }}>
              Lineage
            </Text>
            <div>
              <div className={styles.field}>
                <Text size={300} className={styles.label}>Sire</Text>
                <Text size={400} className={styles.value}>
                  {animal.sire ? (
                    <RouterLink to={`/animals/${animal.sire.id}`} style={{ color: tokens.colorBrandForeground2, textDecoration: 'none' }}>
                      {animal.sire.name || animal.sire.tag_number}
                    </RouterLink>
                  ) : (
                    'Not specified'
                  )}
                </Text>
              </div>
              <div className={styles.field}>
                <Text size={300} className={styles.label}>Dam</Text>
                <Text size={400} className={styles.value}>
                  {animal.dam ? (
                    <RouterLink to={`/animals/${animal.dam.id}`} style={{ color: tokens.colorBrandForeground2, textDecoration: 'none' }}>
                      {animal.dam.name || animal.dam.tag_number}
                    </RouterLink>
                  ) : (
                    'Not specified'
                  )}
                </Text>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: tokens.spacingVerticalXL }}>
          <div className={styles.header}>
            <Text as="h2" size={600} weight="semibold">Events</Text>
            <RouterLink to={`/events/new?animal_id=${animal.id}`} style={{ textDecoration: 'none' }}>
              <Button appearance="primary">
                Add Event
              </Button>
            </RouterLink>
          </div>

          {eventsLoading ? (
            <div className={styles.loadingContainer}>
              <Spinner label="Loading events..." />
            </div>
          ) : events && events.length > 0 ? (
            <div>
              {events.map(event => (
                <Card key={event.id} className={styles.eventCard}>
                  <div className={styles.eventHeader}>
                    <div>
                      <Text size={500} weight="medium" style={{ textTransform: 'capitalize' }}>
                        {event.event_type.replace('_', ' ')}
                      </Text>
                      <Text size={300} style={{ display: 'block', color: tokens.colorNeutralForeground2 }}>
                        {new Date(event.event_date).toLocaleDateString()}
                      </Text>
                      {event.description && (
                        <Text size={300} style={{ display: 'block', marginTop: tokens.spacingVerticalXS }}>
                          {event.description}
                        </Text>
                      )}
                      {event.notes && (
                        <Text size={200} style={{
                          display: 'block',
                          marginTop: tokens.spacingVerticalXS,
                          color: tokens.colorNeutralForeground2
                        }}>
                          {event.notes}
                        </Text>
                      )}
                    </div>
                    <RouterLink to={`/events/${event.id}/edit`} style={{ textDecoration: 'none' }}>
                      <Button appearance="subtle" size="small">
                        Edit
                      </Button>
                    </RouterLink>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Text style={{ marginBottom: tokens.spacingVerticalM, display: 'block' }}>
                No events recorded for this animal
              </Text>
              <RouterLink to={`/events/new?animal_id=${animal.id}`} style={{ textDecoration: 'none' }}>
                <Button appearance="primary">
                  Add the first event
                </Button>
              </RouterLink>
            </div>
          )}
        </div>

        {/* Photo Gallery Section */}
        <PhotoGallery animalId={animal.id} />
      </Card>
    </div>
  );
};

export default AnimalDetail;