import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardFooter,
  Text,
  Button,
  Badge,
  makeStyles,
  tokens,
  Spinner,
  TabList,
  Tab
} from '@fluentui/react-components';
import { animalsApi } from '../../services/api';
import { AnimalType } from '../../types';
import type { Animal } from '../../types';

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

const AnimalList: React.FC = () => {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState<string>('all');

  const { data: animals, isLoading, error } = useQuery({
    queryKey: ['animals'],
    queryFn: () => animalsApi.getAll().then(res => res.data),
  });

  const handleTabSelect = (_event: any, data: any) => {
    setSelectedTab(data.value as string);
  };

  const filteredAnimals = animals?.filter((animal: Animal) => {
    if (selectedTab === 'all') return true;
    return animal.animal_type === selectedTab;
  });

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label="Loading animals..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.loadingContainer}>
        <Text color="danger">Error loading animals</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text as="h1" size={800} weight="bold">
          Animals
        </Text>
        <RouterLink to="/animals/new" style={{ textDecoration: 'none' }}>
          <Button appearance="primary">
            Add Animal
          </Button>
        </RouterLink>
      </div>

      <TabList selectedValue={selectedTab} onTabSelect={handleTabSelect} style={{ marginBottom: tokens.spacingVerticalL }}>
        <Tab value="all">All Animals</Tab>
        <Tab value={AnimalType.SHEEP}>Sheep</Tab>
        <Tab value={AnimalType.CHICKEN}>Chickens</Tab>
        <Tab value={AnimalType.HIVE}>Hives</Tab>
      </TabList>

      {filteredAnimals && filteredAnimals.length > 0 ? (
        <div className={styles.grid}>
          {filteredAnimals.map((animal: Animal) => (
            <Card key={animal.id} className={styles.card}>
              <CardHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                  <Text size={500} weight="semibold">
                    {animal.name || `Tag: ${animal.tag_number}`}
                  </Text>
                  <Badge appearance="filled" color="brand">
                    {animal.animal_type === AnimalType.SHEEP && animal.sheep_gender
                      ? `${animal.sheep_gender}`
                      : animal.animal_type === AnimalType.CHICKEN && animal.chicken_gender
                      ? `${animal.chicken_gender}`
                      : animal.animal_type}
                  </Badge>
                </div>
              </CardHeader>

              <div className={styles.cardDetails}>
                <Text size={300}>
                  <strong>Tag:</strong> {animal.tag_number}
                </Text>
                {animal.birth_date && (
                  <Text size={300}>
                    <strong>Birth Date:</strong> {new Date(animal.birth_date).toLocaleDateString()}
                  </Text>
                )}
                {animal.sire && (
                  <Text size={300}>
                    <strong>Sire:</strong> {animal.sire.name || animal.sire.tag_number}
                  </Text>
                )}
                {animal.dam && (
                  <Text size={300}>
                    <strong>Dam:</strong> {animal.dam.name || animal.dam.tag_number}
                  </Text>
                )}
                {animal.current_location && (
                  <Text size={300}>
                    <strong>Location:</strong> {animal.current_location.name}
                    {animal.current_location.paddock_name && ` - ${animal.current_location.paddock_name}`}
                  </Text>
                )}
              </div>

              <CardFooter>
                <div className={styles.cardActions}>
                  <RouterLink to={`/animals/${animal.id}`} style={{ textDecoration: 'none' }}>
                    <Button appearance="primary" size="small">
                      View
                    </Button>
                  </RouterLink>
                  <RouterLink to={`/animals/${animal.id}/edit`} style={{ textDecoration: 'none' }}>
                    <Button appearance="secondary" size="small">
                      Edit
                    </Button>
                  </RouterLink>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Text size={400} style={{ marginBottom: tokens.spacingVerticalM, display: 'block' }}>
            {animals && animals.length > 0
              ? `No ${selectedTab === 'all' ? 'animals' : selectedTab} found`
              : 'No animals found'
            }
          </Text>
          {(!animals || animals.length === 0) && (
            <RouterLink to="/animals/new" style={{ textDecoration: 'none' }}>
              <Button appearance="primary">
                Add Your First Animal
              </Button>
            </RouterLink>
          )}
        </div>
      )}
    </div>
  );
};

export default AnimalList;