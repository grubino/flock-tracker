import React from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Text,
  Button,
  makeStyles,
  tokens,
  Spinner,
} from '@fluentui/react-components';
import {
  Location24Regular,
  Edit24Regular,
  ArrowLeft24Regular,
} from '@fluentui/react-icons';
import { locationsApi } from '../../services/api';

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingVerticalXL,
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalL,
  },
  backButton: {
    minWidth: '32px',
    height: '32px',
  },
  card: {
    padding: tokens.spacingVerticalXL,
  },
  section: {
    marginBottom: tokens.spacingVerticalL,
  },
  detailItem: {
    display: 'flex',
    marginBottom: tokens.spacingVerticalS,
    gap: tokens.spacingHorizontalS,
  },
  label: {
    fontWeight: tokens.fontWeightMedium,
    minWidth: '120px',
    color: tokens.colorNeutralForeground2,
  },
  value: {
    flex: 1,
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalL,
    paddingTop: tokens.spacingVerticalL,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacingVerticalXXL,
  },
  errorContainer: {
    textAlign: 'center',
    padding: tokens.spacingVerticalXXL,
  },
});

const LocationDetail: React.FC = () => {
  const styles = useStyles();
  const { id } = useParams<{ id: string }>();
  const locationId = parseInt(id || '0', 10);

  const { data: location, isLoading, error } = useQuery({
    queryKey: ['location', locationId],
    queryFn: () => locationsApi.getById(locationId).then(res => res.data),
    enabled: !!locationId,
  });

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label="Loading location..." />
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className={styles.errorContainer}>
        <Text style={{ color: '#c53030', marginBottom: '16px', display: 'block' }}>
          Error loading location details
        </Text>
        <RouterLink to="/locations" style={{ textDecoration: 'none' }}>
          <Button appearance="secondary">
            Back to Locations
          </Button>
        </RouterLink>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <RouterLink to="/locations" style={{ textDecoration: 'none' }}>
          <Button
            appearance="subtle"
            icon={<ArrowLeft24Regular />}
            className={styles.backButton}
            title="Back to locations"
          />
        </RouterLink>
        <Location24Regular style={{ fontSize: '24px' }} />
        <Text as="h1" size={800} weight="bold">
          {location.name}
        </Text>
      </div>

      <Card className={styles.card}>
        <div className={styles.section}>
          <Text as="h2" size={600} weight="semibold" style={{ marginBottom: '16px' }}>
            Location Details
          </Text>

          <div className={styles.detailItem}>
            <Text className={styles.label}>Name:</Text>
            <Text className={styles.value}>{location.name}</Text>
          </div>

          {location.paddock_name && (
            <div className={styles.detailItem}>
              <Text className={styles.label}>Paddock:</Text>
              <Text className={styles.value}>{location.paddock_name}</Text>
            </div>
          )}

          {location.address && (
            <div className={styles.detailItem}>
              <Text className={styles.label}>Address:</Text>
              <Text className={styles.value}>{location.address}</Text>
            </div>
          )}

          {location.description && (
            <div className={styles.detailItem}>
              <Text className={styles.label}>Description:</Text>
              <Text className={styles.value}>{location.description}</Text>
            </div>
          )}

          {location.area_size && (
            <div className={styles.detailItem}>
              <Text className={styles.label}>Area Size:</Text>
              <Text className={styles.value}>
                {location.area_size} {location.area_unit || 'units'}
              </Text>
            </div>
          )}

          {location.capacity && (
            <div className={styles.detailItem}>
              <Text className={styles.label}>Capacity:</Text>
              <Text className={styles.value}>{location.capacity} animals</Text>
            </div>
          )}

          {(location.latitude && location.longitude) && (
            <div className={styles.detailItem}>
              <Text className={styles.label}>Coordinates:</Text>
              <Text className={styles.value}>
                {location.latitude}, {location.longitude}
              </Text>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <RouterLink to={`/locations/${location.id}/edit`} style={{ textDecoration: 'none' }}>
            <Button appearance="primary" icon={<Edit24Regular />}>
              Edit Location
            </Button>
          </RouterLink>
          <RouterLink to="/locations" style={{ textDecoration: 'none' }}>
            <Button appearance="secondary">
              Back to Locations
            </Button>
          </RouterLink>
        </div>
      </Card>
    </div>
  );
};

export default LocationDetail;