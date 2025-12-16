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
  Button,
  type SelectTabData,
  type SelectTabEvent
} from '@fluentui/react-components';
import { Search20Regular, Dismiss20Regular } from '@fluentui/react-icons';
import { animalsApi, productsApi } from '../../services/api';
import { AnimalType, ProductCategory } from '../../types';
import { formatDateWithoutTimezone } from '../../utils/dateUtils';
import type { Animal, Product } from '../../types';

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingVerticalXL,
    '@media (max-width: 768px)': {
      padding: tokens.spacingVerticalM,
    },
  },
  header: {
    marginBottom: tokens.spacingVerticalL,
  },
  searchContainer: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalL,
    maxWidth: '600px',
    '@media (max-width: 768px)': {
      maxWidth: '100%',
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
  const [mainTab, setMainTab] = useState<string>('products');
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: animals, isLoading: animalsLoading, error: animalsError } = useQuery({
    queryKey: ['animals'],
    queryFn: () => animalsApi.getAll().then(res => res.data),
    enabled: mainTab === 'animals',
  });

  const { data: products, isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll().then(res => res.data),
    enabled: mainTab === 'products',
  });

  const handleTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setSelectedTab(data.value as string);
  };

  const handleMainTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setMainTab(data.value as string);
    setSelectedTab('all');
    setSearchQuery('');
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

  const filteredProducts = products?.filter((product: Product) => {
    // Filter by category
    if (selectedTab !== 'all' && product.category !== selectedTab) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        product.name?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const isLoading = mainTab === 'products' ? productsLoading : animalsLoading;
  const error = mainTab === 'products' ? productsError : animalsError;

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label={`Loading ${mainTab}...`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.loadingContainer}>
        <Text style={{ color: tokens.colorPaletteRedForeground1 }}>Error loading {mainTab}</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Text as="h1" size={800} weight="bold" style={{ marginBottom: tokens.spacingVerticalM }}>
            Farm Store
          </Text>
        </div>
        <div>
          <Text size={400} style={{ color: tokens.colorNeutralForeground2 }}>
            Browse and shop our farm products and animals
          </Text>
        </div>
      </div>

      <TabList selectedValue={mainTab} onTabSelect={handleMainTabSelect} style={{ marginBottom: tokens.spacingVerticalL }}>
        <Tab value="products">Products</Tab>
        <Tab value="animals">Animals</Tab>
      </TabList>

      <div className={styles.searchContainer}>
        <Input
          placeholder={mainTab === 'products' ? 'Search products...' : 'Search by name, tag, or location...'}
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

      {mainTab === 'products' ? (
        <TabList selectedValue={selectedTab} onTabSelect={handleTabSelect} style={{ marginBottom: tokens.spacingVerticalL }}>
          <Tab value="all">All Products ({products?.length || 0})</Tab>
          <Tab value={ProductCategory.PET_FOOD}>Pet Food ({products?.filter(p => p.category === ProductCategory.PET_FOOD).length || 0})</Tab>
          <Tab value={ProductCategory.EGGS}>Eggs ({products?.filter(p => p.category === ProductCategory.EGGS).length || 0})</Tab>
          <Tab value={ProductCategory.WOOL}>Wool ({products?.filter(p => p.category === ProductCategory.WOOL).length || 0})</Tab>
          <Tab value={ProductCategory.HONEY}>Honey ({products?.filter(p => p.category === ProductCategory.HONEY).length || 0})</Tab>
          <Tab value={ProductCategory.OTHER}>Other ({products?.filter(p => p.category === ProductCategory.OTHER).length || 0})</Tab>
        </TabList>
      ) : (
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
      )}

      {mainTab === 'products' ? (
        filteredProducts && filteredProducts.length > 0 ? (
          <div className={styles.grid}>
            {filteredProducts.map((product: Product) => (
              <Card key={product.id} className={styles.card}>
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                      borderRadius: tokens.borderRadiusMedium,
                      marginBottom: tokens.spacingVerticalM,
                    }}
                  />
                )}

                <div className={styles.cardHeader}>
                  <div>
                    <Text size={500} weight="semibold" style={{ display: 'block' }}>
                      {product.name}
                    </Text>
                    {product.sku && (
                      <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>
                        SKU: {product.sku}
                      </Text>
                    )}
                  </div>
                  <Badge appearance="filled" color="brand">
                    {product.category}
                  </Badge>
                </div>

                <div className={styles.cardDetails}>
                  {product.description && (
                    <Text size={300} style={{ marginBottom: tokens.spacingVerticalS }}>
                      {product.description}
                    </Text>
                  )}
                  <Text size={400} weight="semibold">
                    ${product.price.toFixed(2)} / {product.unit}
                  </Text>
                  <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>
                    In Stock: {product.inventory_quantity} {product.unit}
                  </Text>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Text size={400}>
              {searchQuery
                ? `No products found matching "${searchQuery}"`
                : selectedTab === 'all'
                ? 'No products available'
                : `No ${selectedTab} found`}
            </Text>
          </div>
        )
      ) : (
        filteredAnimals && filteredAnimals.length > 0 ? (
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
                          <strong>Birth Date:</strong> {formatDateWithoutTimezone(animal.birth_date)}
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
        )
      )}
    </div>
  );
};

export default CustomerDashboard;
