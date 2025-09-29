import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  Card,
  Text,
  Button,
  makeStyles,
  tokens,
  Spinner
} from '@fluentui/react-components';
import { locationsApi } from '../../services/api';
import type { Location } from '../../types';

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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: tokens.spacingVerticalL,
  },
  card: {
    padding: tokens.spacingVerticalL,
  },
  cardDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    marginTop: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalM,
  },
  cardActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
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

const LocationList: React.FC = () => {
  const styles = useStyles();
  const { data: locations, isLoading, error } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.getAll().then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label="Loading locations..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.loadingContainer}>
        <Text color="danger">Error loading locations</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text as="h1" size={800} weight="bold">
          Locations
        </Text>
        <RouterLink to="/locations/new" style={{ textDecoration: 'none' }}>
          <Button appearance="primary">
            Add Location
          </Button>
        </RouterLink>
      </div>

      {locations && locations.length > 0 ? (
        <div className={styles.grid}>
          {locations.map((location: Location) => (
            <Card key={location.id} className={styles.card}>
              <div style={{ padding: '16px' }}>
                <Text size={500} weight="semibold" style={{ display: 'block', marginBottom: '12px' }}>
                  {location.name}
                </Text>

                <div className={styles.cardDetails}>
                  {location.paddock_name && (
                    <Text size={300}>
                      <strong>Paddock:</strong> {location.paddock_name}
                    </Text>
                  )}
                  {location.address && (
                    <Text size={300}>
                      <strong>Address:</strong> {location.address}
                    </Text>
                  )}
                  {location.description && (
                    <Text size={300}>
                      {location.description}
                    </Text>
                  )}
                </div>

                <div className={styles.cardActions} style={{ marginTop: '16px' }}>
                  <RouterLink to={`/locations/${location.id}`} style={{ textDecoration: 'none' }}>
                    <Button appearance="primary" size="small">
                      View
                    </Button>
                  </RouterLink>
                  <RouterLink to={`/locations/${location.id}/edit`} style={{ textDecoration: 'none' }}>
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
            No locations found
          </Text>
          <RouterLink to="/locations/new" style={{ textDecoration: 'none' }}>
            <Button appearance="primary">
              Add Your First Location
            </Button>
          </RouterLink>
        </div>
      )}
    </div>
  );
};

export default LocationList;