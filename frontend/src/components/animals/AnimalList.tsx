import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  Card,
  Text,
  Button,
  Badge,
  makeStyles,
  tokens,
  Spinner,
  TabList,
  Tab,
  Input,
  Label,
  Dropdown,
  Option,
  Checkbox,
  type SelectTabData,
  type SelectTabEvent
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { animalsApi, locationsApi, eventsApi } from '../../services/api';
import { AnimalType, SheepGender, ChickenGender, EventType } from '../../types';
import type { Animal } from '../../types';

// Get server URL from localStorage or fall back to environment variable
const getServerUrl = (): string => {
  const storedUrl = localStorage.getItem('server_url');
  return storedUrl || import.meta.env.VITE_API_URL || '';
};

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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: tokens.spacingVerticalL,
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: tokens.spacingVerticalM,
    },
  },
  card: {
    padding: tokens.spacingVerticalL,
    '@media (max-width: 768px)': {
      padding: tokens.spacingVerticalM,
    },
  },
  cardImage: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    borderRadius: tokens.borderRadiusMedium,
    marginBottom: tokens.spacingVerticalM,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacingVerticalM,
    gap: tokens.spacingHorizontalS,
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: tokens.spacingVerticalS,
    },
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
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      gap: tokens.spacingVerticalS,
    },
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
});

const AnimalList: React.FC = () => {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState<string>('all');

  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [birthDateFrom, setBirthDateFrom] = useState<string>('');
  const [birthDateTo, setBirthDateTo] = useState<string>('');
  const [showDeadAnimals, setShowDeadAnimals] = useState<boolean>(false);

  const { data: animals, isLoading, error } = useQuery({
    queryKey: ['animals'],
    queryFn: () => animalsApi.getAll().then(res => res.data),
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.getAll().then(res => res.data),
  });

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAll().then(res => res.data),
  });

  const handleTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setSelectedTab(data.value as string);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGender('');
    setSelectedLocation('');
    setBirthDateFrom('');
    setBirthDateTo('');
    setShowDeadAnimals(false);
  };

  const hasActiveFilters = searchQuery || selectedGender || selectedLocation || birthDateFrom || birthDateTo || showDeadAnimals;

  // Create a set of animal IDs that have death events
  const deadAnimalIds = useMemo(() => {
    if (!events) return new Set<number>();

    const deathEvents = events.filter(event => event.event_type === EventType.DEATH);
    return new Set(deathEvents.map(event => event.animal_id));
  }, [events]);

  const filteredAnimals = useMemo(() => {
    return animals?.filter((animal: Animal) => {
      // Filter by tab (animal type)
      if (selectedTab !== 'all' && animal.animal_type !== selectedTab) {
        return false;
      }

      // Filter dead animals (hide by default unless showDeadAnimals is checked)
      const isDead = deadAnimalIds.has(animal.id);
      if (isDead && !showDeadAnimals) {
        return false;
      }

      // Filter by search query (name or tag number)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = animal.name?.toLowerCase().includes(query);
        const matchesTag = animal.tag_number.toLowerCase().includes(query);
        if (!matchesName && !matchesTag) {
          return false;
        }
      }

      // Filter by gender
      if (selectedGender) {
        if (animal.animal_type === AnimalType.SHEEP && animal.sheep_gender !== selectedGender) {
          return false;
        }
        if (animal.animal_type === AnimalType.CHICKEN && animal.chicken_gender !== selectedGender) {
          return false;
        }
      }

      // Filter by location
      if (selectedLocation && animal.current_location_id?.toString() !== selectedLocation) {
        return false;
      }

      // Filter by birth date range
      if (birthDateFrom && animal.birth_date) {
        if (new Date(animal.birth_date) < new Date(birthDateFrom)) {
          return false;
        }
      }
      if (birthDateTo && animal.birth_date) {
        if (new Date(animal.birth_date) > new Date(birthDateTo)) {
          return false;
        }
      }

      return true;
    });
  }, [animals, selectedTab, searchQuery, selectedGender, selectedLocation, birthDateFrom, birthDateTo, showDeadAnimals, deadAnimalIds]);

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
        <div className={styles.headerActions}>
          <RouterLink to="/animals/import" style={{ textDecoration: 'none' }}>
            <Button appearance="secondary" style={{ width: '100%' }}>
              Import CSV
            </Button>
          </RouterLink>
          <RouterLink to="/animals/new" style={{ textDecoration: 'none' }}>
            <Button appearance="primary" style={{ width: '100%' }}>
              Add Animal
            </Button>
          </RouterLink>
        </div>
      </div>

      <TabList selectedValue={selectedTab} onTabSelect={handleTabSelect} style={{ marginBottom: tokens.spacingVerticalL }}>
        <Tab value="all">All Animals</Tab>
        <Tab value={AnimalType.SHEEP}>Sheep</Tab>
        <Tab value={AnimalType.CHICKEN}>Chickens</Tab>
        <Tab value={AnimalType.HIVE}>Hives</Tab>
      </TabList>

      <Card className={styles.filterSection}>
        <Text weight="semibold" size={400}>Filters</Text>

        <div className={styles.filterGrid}>
          <div className={styles.filterField}>
            <Label>Search</Label>
            <Input
              placeholder="Search by name or tag number..."
              value={searchQuery}
              onChange={(_, data) => setSearchQuery(data.value)}
            />
          </div>

          <div className={styles.filterField}>
            <Label>Gender</Label>
            <Dropdown
              placeholder="All genders"
              value={selectedGender}
              selectedOptions={selectedGender ? [selectedGender] : []}
              onOptionSelect={(_, data) => setSelectedGender(data.optionValue || '')}
            >
              <Option value="">All genders</Option>
              {selectedTab === AnimalType.SHEEP || selectedTab === 'all' ? (
                <>
                  <Option value={SheepGender.EWE}>Ewe</Option>
                  <Option value={SheepGender.RAM}>Ram</Option>
                </>
              ) : null}
              {selectedTab === AnimalType.CHICKEN || selectedTab === 'all' ? (
                <>
                  <Option value={ChickenGender.HEN}>Hen</Option>
                  <Option value={ChickenGender.ROOSTER}>Rooster</Option>
                </>
              ) : null}
            </Dropdown>
          </div>

          <div className={styles.filterField}>
            <Label>Location</Label>
            <Dropdown
              placeholder="All locations"
              value={selectedLocation}
              selectedOptions={selectedLocation ? [selectedLocation] : []}
              onOptionSelect={(_, data) => setSelectedLocation(data.optionValue || '')}
            >
              <Option value="">All locations</Option>
              {locations?.map(location => (
                <Option
                  key={location.id}
                  value={location.id.toString()}
                  text={location.paddock_name ? `${location.name} - ${location.paddock_name}` : location.name}
                >
                  {location.paddock_name ? `${location.name} - ${location.paddock_name}` : location.name}
                </Option>
              ))}
            </Dropdown>
          </div>

          <div className={styles.filterField}>
            <Label>Birth Date From</Label>
            <Input
              type="date"
              value={birthDateFrom}
              onChange={(_, data) => setBirthDateFrom(data.value)}
            />
          </div>

          <div className={styles.filterField}>
            <Label>Birth Date To</Label>
            <Input
              type="date"
              value={birthDateTo}
              onChange={(_, data) => setBirthDateTo(data.value)}
            />
          </div>

          <div className={styles.filterField}>
            <Label>&nbsp;</Label>
            <Checkbox
              checked={showDeadAnimals}
              onChange={(_, data) => setShowDeadAnimals(data.checked as boolean)}
              label="Show deceased animals"
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
              Showing {filteredAnimals?.length || 0} of {animals?.length || 0} animals
            </Text>
          </div>
        )}
      </Card>

      {filteredAnimals && filteredAnimals.length > 0 ? (
        <div className={styles.grid}>
          {filteredAnimals.map((animal: Animal) => {
            const photographs = animal.photographs || [];
            const primaryPhoto = photographs.find(p => p.is_primary) || photographs[0];

            return (
            <Card key={animal.id} className={styles.card}>
              {primaryPhoto && (
                <img
                  src={`${getServerUrl()}/api/photographs/${primaryPhoto.id}/file`}
                  alt={animal.name || animal.tag_number}
                  className={styles.cardImage}
                />
              )}

              <div className={styles.cardHeader}>
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

              <div className={styles.cardActions} style={{ marginTop: tokens.spacingVerticalM }}>
                <RouterLink to={`/animals/${animal.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                  <Button appearance="primary" size="small" style={{ width: '100%' }}>
                    View
                  </Button>
                </RouterLink>
                <RouterLink to={`/animals/${animal.id}/edit`} style={{ textDecoration: 'none', flex: 1 }}>
                  <Button appearance="secondary" size="small" style={{ width: '100%' }}>
                    Edit
                  </Button>
                </RouterLink>
              </div>
            </Card>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Text size={400} style={{ marginBottom: tokens.spacingVerticalM, display: 'block' }}>
            {hasActiveFilters || selectedTab !== 'all'
              ? 'No animals match your filters'
              : 'No animals found'
            }
          </Text>
          {hasActiveFilters || selectedTab !== 'all' ? (
            <Button appearance="secondary" onClick={() => {
              clearFilters();
              setSelectedTab('all');
            }}>
              Clear All Filters
            </Button>
          ) : (
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