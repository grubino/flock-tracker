import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Card,
  Text,
  Button,
  Badge,
  makeStyles,
  tokens,
  Spinner,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
} from '@fluentui/react-components';
import { Delete24Regular } from '@fluentui/react-icons';
import { animalsApi, eventsApi, careSchedulesApi } from '../../services/api';
import { AnimalType, ScheduleStatus } from '../../types';
import { PhotoGallery } from '../PhotoGallery';
import { FamilyTree } from './FamilyTree';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import { formatDateWithoutTimezone } from '../../utils/dateUtils';

const useStyles = makeStyles({
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
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
    gap: tokens.spacingHorizontalM,
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: tokens.spacingVerticalM,
    },
  },
  headerButton: {
    '@media (max-width: 768px)': {
      width: '100%',
    },
  },
  card: {
    padding: tokens.spacingVerticalL,
    '@media (max-width: 768px)': {
      padding: tokens.spacingVerticalM,
    },
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: tokens.spacingVerticalL,
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: tokens.spacingVerticalM,
    },
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
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      width: '100%',
      gap: tokens.spacingVerticalS,
    },
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
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      gap: tokens.spacingVerticalS,
    },
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
  const { canWrite, isCustomer } = useRoleAccess();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<number | null>(null);

  const { data: animal, isLoading: animalLoading, error: animalError } = useQuery({
    queryKey: ['animal', animalId],
    queryFn: () => animalsApi.getById(animalId).then(res => res.data),
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', animalId],
    queryFn: () => eventsApi.getByAnimal(animalId).then(res => res.data),
  });

  const { data: careSchedules, isLoading: careSchedulesLoading } = useQuery({
    queryKey: ['careSchedules', animalId],
    queryFn: () => careSchedulesApi.getAll({ animal_id: animalId }).then(res => res.data),
  });

  const deleteEventMutation = useMutation({
    mutationFn: (eventId: number) => eventsApi.delete(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', animalId] });
      setDeleteDialogOpen(false);
      setEventToDelete(null);
    },
  });

  const handleDeleteClick = (eventId: number) => {
    setEventToDelete(eventId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (eventToDelete) {
      deleteEventMutation.mutate(eventToDelete);
    }
  };

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
          {isCustomer ? (
            <RouterLink to="/" style={{ textDecoration: 'none', flex: 1 }}>
              <Button appearance="secondary" style={{ width: '100%' }}>
                Back to Catalog
              </Button>
            </RouterLink>
          ) : (
            <>
              <RouterLink to={`/animals/${animal.id}/edit`} style={{ textDecoration: 'none', flex: 1 }}>
                <Button appearance="primary" style={{ width: '100%' }}>
                  Edit
                </Button>
              </RouterLink>
              <RouterLink to="/animals" style={{ textDecoration: 'none', flex: 1 }}>
                <Button appearance="secondary" style={{ width: '100%' }}>
                  Back to List
                </Button>
              </RouterLink>
            </>
          )}
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
                    {formatDateWithoutTimezone(animal.birth_date)}
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
      </Card>

      {/* Events Section */}
      <Card className={styles.card} style={{ marginTop: tokens.spacingVerticalXL }}>
        <div className={styles.header}>
          <Text as="h2" size={600} weight="semibold">Events</Text>
          {canWrite && (
            <RouterLink to={`/events/new?animal_id=${animal.id}`} style={{ textDecoration: 'none' }}>
              <Button appearance="primary" className={styles.headerButton}>
                Add Event
              </Button>
            </RouterLink>
          )}
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
                      {formatDateWithoutTimezone(event.event_date)}
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
                  {canWrite && (
                    <div style={{ display: 'flex', gap: tokens.spacingHorizontalS }}>
                      <RouterLink to={`/events/${event.id}/edit`} style={{ textDecoration: 'none', flex: 1 }}>
                        <Button appearance="subtle" size="small" style={{ width: '100%' }}>
                          Edit
                        </Button>
                      </RouterLink>
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<Delete24Regular />}
                        onClick={() => handleDeleteClick(event.id)}
                        style={{ flex: 1 }}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Text style={{ marginBottom: tokens.spacingVerticalM, display: 'block' }}>
              No events recorded for this animal
            </Text>
            {canWrite && (
              <RouterLink to={`/events/new?animal_id=${animal.id}`} style={{ textDecoration: 'none' }}>
                <Button appearance="primary">
                  Add the first event
                </Button>
              </RouterLink>
            )}
          </div>
        )}
      </Card>

      {/* Care Schedules Section */}
      <Card className={styles.card} style={{ marginTop: tokens.spacingVerticalXL }}>
        <div className={styles.header}>
          <Text as="h2" size={600} weight="semibold">Care Schedules</Text>
          {canWrite && (
            <RouterLink to={`/care-schedules/new?animal_id=${animal.id}`} style={{ textDecoration: 'none' }}>
              <Button appearance="primary" className={styles.headerButton}>
                Add Care Schedule
              </Button>
            </RouterLink>
          )}
        </div>

        {careSchedulesLoading ? (
          <div className={styles.loadingContainer}>
            <Spinner label="Loading care schedules..." />
          </div>
        ) : careSchedules && careSchedules.length > 0 ? (
          <div>
            {careSchedules.map(schedule => (
              <Card key={schedule.id} className={styles.eventCard}>
                <div className={styles.eventHeader}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, marginBottom: tokens.spacingVerticalXS }}>
                      <Text size={500} weight="medium">
                        {schedule.title}
                      </Text>
                      <Badge
                        appearance="filled"
                        color={
                          schedule.status === ScheduleStatus.ACTIVE ? 'success' :
                          schedule.status === ScheduleStatus.PAUSED ? 'warning' :
                          schedule.status === ScheduleStatus.COMPLETED ? 'brand' :
                          'subtle'
                        }
                      >
                        {schedule.status}
                      </Badge>
                    </div>
                    <Text size={300} style={{ display: 'block', color: tokens.colorNeutralForeground2 }}>
                      Type: {schedule.care_type.replace(/_/g, ' ')} • {schedule.recurrence_type}
                    </Text>
                    <Text size={300} style={{ display: 'block', color: tokens.colorNeutralForeground2 }}>
                      Next Due: {formatDateWithoutTimezone(schedule.next_due_date)}
                    </Text>
                    {schedule.description && (
                      <Text size={300} style={{ display: 'block', marginTop: tokens.spacingVerticalXS }}>
                        {schedule.description}
                      </Text>
                    )}
                    {schedule.notes && (
                      <Text size={200} style={{
                        display: 'block',
                        marginTop: tokens.spacingVerticalXS,
                        color: tokens.colorNeutralForeground2
                      }}>
                        {schedule.notes}
                      </Text>
                    )}
                  </div>
                  {canWrite && (
                    <RouterLink to={`/care-schedules/${schedule.id}/edit`} style={{ textDecoration: 'none', flex: 1 }}>
                      <Button appearance="subtle" size="small" style={{ width: '100%' }}>
                        Edit
                      </Button>
                    </RouterLink>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Text style={{ marginBottom: tokens.spacingVerticalM, display: 'block' }}>
              No care schedules for this animal
            </Text>
            {canWrite && (
              <RouterLink to={`/care-schedules/new?animal_id=${animal.id}`} style={{ textDecoration: 'none' }}>
                <Button appearance="primary">
                  Add the first care schedule
                </Button>
              </RouterLink>
            )}
          </div>
        )}
      </Card>

      {/* Photo Gallery Section */}
      <Card className={styles.card} style={{ marginTop: tokens.spacingVerticalXL }}>
        <PhotoGallery animalId={animal.id} canUpload={canWrite} />
      </Card>

      {/* Family Tree Section */}
      <Card className={styles.card} style={{ marginTop: tokens.spacingVerticalXL }}>
        <FamilyTree animal={animal} />
      </Card>

      {/* Delete Event Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(_, data) => setDeleteDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogContent>
              Are you sure you want to delete this event? This action cannot be undone.
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button
                appearance="primary"
                onClick={handleConfirmDelete}
                disabled={deleteEventMutation.isPending}
              >
                {deleteEventMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default AnimalDetail;