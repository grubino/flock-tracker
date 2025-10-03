import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  Card,
  Text,
  Badge,
  makeStyles,
  tokens,
  Spinner,
  TabList,
  Tab,
  Input,
  Button
} from '@fluentui/react-components';
import { Search20Regular, Dismiss20Regular } from '@fluentui/react-icons';
import { animalsApi } from '../../services/api';
import { AnimalType } from '../../types';
import type { Animal } from '../../types';

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingVerticalXL,
  },
  header: {
    marginBottom: tokens.spacingVerticalL,
  },
  searchContainer: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalL,
    maxWidth: '600px',
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

const CustomerDashboard: React.FC = () => {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: animals, isLoading, error } = useQuery({
    queryKey: ['animals'],
    queryFn: () => animalsApi.getAll().then(res => res.data),
  });

  const handleTabSelect = (_event: any, data: any) => {
    setSelectedTab(data.value as string);
  };

  const filteredAnimals = animals?.filter((animal: Animal) => {
    // Filter by type
    if (selectedTab !== 'all' && animal.animal_type !== selectedTab) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        animal.name?.toLowerCase().includes(query) ||
        animal.tag_number?.toLowerCase().includes(query) ||
        animal.current_location?.name?.toLowerCase().includes(query) ||
        animal.current_location?.paddock_name?.toLowerCase().includes(query)
      );
    }

    return true;
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
        <Text style={{ color: tokens.colorPaletteRedForeground1 }}>Error loading animals</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Text as="h1" size={800} weight="bold" style={{ marginBottom: tokens.spacingVerticalM }}>
            Animal Catalog
          </Text>
        </div>
        <div>
          <Text size={400} style={{ color: tokens.colorNeutralForeground2 }}>
            Browse and search through our collection of farm animals
          </Text>
        </div>
      </div>
      <div className={styles.searchContainer}>
        <Input
          placeholder="Search by name, tag, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          contentBefore={<Search20Regular />}
          contentAfter={
            searchQuery && (
              <Button
                appearance="subtle"
                icon={<Dismiss20Regular />}
                size="small"
                onClick={() => setSearchQuery('')}
              />
            )
          }
          style={{ flex: 1 }}
        />
      </div>

      <TabList selectedValue={selectedTab} onTabSelect={handleTabSelect} style={{ marginBottom: tokens.spacingVerticalL }}>
        <Tab value="all">All Animals ({animals?.length || 0})</Tab>
        <Tab value={AnimalType.SHEEP}>
          Sheep ({animals?.filter(a => a.animal_type === AnimalType.SHEEP).length || 0})
        </Tab>
        <Tab value={AnimalType.CHICKEN}>
          Chickens ({animals?.filter(a => a.animal_type === AnimalType.CHICKEN).length || 0})
        </Tab>
        <Tab value={AnimalType.HIVE}>
          Hives ({animals?.filter(a => a.animal_type === AnimalType.HIVE).length || 0})
        </Tab>
      </TabList>

      {filteredAnimals && filteredAnimals.length > 0 ? (
        <div className={styles.grid}>
          {filteredAnimals.map((animal: Animal) => {
            const photographs = animal.photographs || [];
            const primaryPhoto = photographs.find(p => p.is_primary) || photographs[0];
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

            return (
              <Card key={animal.id} className={styles.card}>
                <RouterLink
                  to={`/animals/${animal.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  {primaryPhoto && (
                    <img
                      src={`${API_BASE_URL}/api/photographs/${primaryPhoto.id}/file`}
                      alt={animal.name || animal.tag_number}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: tokens.borderRadiusMedium,
                        marginBottom: tokens.spacingVerticalM,
                      }}
                    />
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.spacingVerticalM }}>
                    <div>
                      <Text size={500} weight="semibold" style={{ display: 'block' }}>
                        {animal.name || `Tag: ${animal.tag_number}`}
                      </Text>
                      {animal.name && (
                        <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>
                          Tag: {animal.tag_number}
                        </Text>
                      )}
                    </div>
                    <Badge appearance="filled" color="brand">
                      {animal.animal_type === AnimalType.SHEEP && animal.sheep_gender
                        ? `${animal.sheep_gender}`
                        : animal.animal_type === AnimalType.CHICKEN && animal.chicken_gender
                        ? `${animal.chicken_gender}`
                        : animal.animal_type}
                    </Badge>
                  </div>

                  <div className={styles.cardDetails}>
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
                </RouterLink>

                <div style={{ display: 'flex', gap: tokens.spacingHorizontalM, marginTop: tokens.spacingVerticalM }}>
                  <RouterLink to={`/animals/${animal.id}`} style={{ textDecoration: 'none', width: '100%' }}>
                    <Button appearance="secondary" style={{ width: '100%' }}>
                      View Details
                    </Button>
                  </RouterLink>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Text size={400}>
            {searchQuery
              ? `No animals found matching "${searchQuery}"`
              : selectedTab === 'all'
              ? 'No animals available'
              : `No ${selectedTab} found`}
          </Text>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
