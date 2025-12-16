import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Switch,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  type SelectTabData,
  type SelectTabEvent
} from '@fluentui/react-components';
import { Delete24Regular } from '@fluentui/react-icons';
import { productsApi } from '../../services/api';
import { ProductCategory } from '../../types';
import type { Product } from '../../types';

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
  activeToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalM,
  },
});

const ProductList: React.FC = () => {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll().then(res => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      productsApi.update(id, { is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const handleTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setSelectedTab(data.value as string);
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete.id);
    }
  };

  const handleToggleActive = (product: Product) => {
    toggleActiveMutation.mutate({
      id: product.id,
      isActive: !product.is_active,
    });
  };

  const filteredProducts = products?.filter((product: Product) => {
    if (selectedTab === 'all') return true;
    return product.category === selectedTab;
  });

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label="Loading products..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.loadingContainer}>
        <Text style={{ color: tokens.colorPaletteRedForeground1 }}>Error loading products</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text as="h1" size={800} weight="bold">
          Products
        </Text>
        <RouterLink to="/products/new" style={{ textDecoration: 'none', flex: 1 }}>
          <Button appearance="primary" style={{ width: '100%' }}>
            Add Product
          </Button>
        </RouterLink>
      </div>

      <TabList selectedValue={selectedTab} onTabSelect={handleTabSelect} style={{ marginBottom: tokens.spacingVerticalL }}>
        <Tab value="all">All Products</Tab>
        <Tab value={ProductCategory.PET_FOOD}>Pet Food</Tab>
        <Tab value={ProductCategory.EGGS}>Eggs</Tab>
        <Tab value={ProductCategory.WOOL}>Wool</Tab>
        <Tab value={ProductCategory.HONEY}>Honey</Tab>
        <Tab value={ProductCategory.DAIRY}>Dairy</Tab>
        <Tab value={ProductCategory.OTHER}>Other</Tab>
      </TabList>

      {filteredProducts && filteredProducts.length > 0 ? (
        <div className={styles.grid}>
          {filteredProducts.map((product: Product) => (
            <Card key={product.id} className={styles.card}>
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className={styles.cardImage}
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
                  {product.category.replace('_', ' ')}
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
                  Inventory: {product.inventory_quantity} {product.unit}
                </Text>
              </div>

              <div className={styles.activeToggle}>
                <Switch
                  checked={product.is_active}
                  onChange={() => handleToggleActive(product)}
                  label={product.is_active ? 'Active' : 'Inactive'}
                />
              </div>

              <div className={styles.cardActions} style={{ marginTop: tokens.spacingVerticalM }}>
                <RouterLink to={`/products/${product.id}/edit`} style={{ textDecoration: 'none', flex: 1 }}>
                  <Button appearance="primary" size="small" style={{ width: '100%' }}>
                    Edit
                  </Button>
                </RouterLink>
                <Button
                  appearance="secondary"
                  size="small"
                  icon={<Delete24Regular />}
                  onClick={() => handleDeleteClick(product)}
                />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Text size={400} style={{ marginBottom: tokens.spacingVerticalM, display: 'block' }}>
            {products && products.length > 0
              ? `No ${selectedTab === 'all' ? 'products' : selectedTab} found`
              : 'No products found'
            }
          </Text>
          {(!products || products.length === 0) && (
            <RouterLink to="/products/new" style={{ textDecoration: 'none' }}>
              <Button appearance="primary">
                Add Your First Product
              </Button>
            </RouterLink>
          )}
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={(_, data) => setDeleteDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogContent>
              Are you sure you want to delete "{productToDelete?.name}"? This action cannot be undone.
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleDeleteConfirm}>
                Delete
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default ProductList;
