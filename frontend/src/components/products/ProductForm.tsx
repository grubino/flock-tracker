import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Text,
  Button,
  Input,
  Label,
  Dropdown,
  Option,
  Textarea,
  Switch,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import { productsApi } from '../../services/api';
import { ProductCategory } from '../../types';
import type { ProductCreateRequest, Product, ProductCategory as ProductCategoryType } from '../../types';

interface ProductFormProps {
  product?: Product;
  isEdit?: boolean;
}

const useStyles = makeStyles({
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: tokens.spacingVerticalXL,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: tokens.spacingVerticalL,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  fullWidth: {
    gridColumn: '1 / -1',
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalL,
  },
});

const ProductForm: React.FC<ProductFormProps> = ({ product, isEdit = false }) => {
  const styles = useStyles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const productId = isEdit && id ? parseInt(id) : undefined;

  const { data: fetchedProduct } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsApi.getById(productId!).then(res => res.data),
    enabled: isEdit && !!productId,
  });

  const currentProduct = product || fetchedProduct;

  const [formData, setFormData] = useState<ProductCreateRequest>({
    name: '',
    description: '',
    category: ProductCategory.OTHER,
    price: 0,
    inventory_quantity: 0,
    unit: '',
    sku: '',
    image_url: '',
    is_active: true,
  });

  useEffect(() => {
    if (currentProduct) {
      setFormData({
        name: currentProduct.name || '',
        description: currentProduct.description || '',
        category: currentProduct.category || ProductCategory.OTHER,
        price: currentProduct.price || 0,
        inventory_quantity: currentProduct.inventory_quantity || 0,
        unit: currentProduct.unit || '',
        sku: currentProduct.sku || '',
        image_url: currentProduct.image_url || '',
        is_active: currentProduct.is_active ?? true,
      });
    }
  }, [currentProduct]);

  const createMutation = useMutation({
    mutationFn: (data: ProductCreateRequest) => productsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/products');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ProductCreateRequest>) =>
      productsApi.update(currentProduct!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      navigate('/products');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      description: formData.description || undefined,
      sku: formData.sku || undefined,
      image_url: formData.image_url || undefined,
    };

    if (isEdit) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  return (
    <div className={styles.container}>
      <Text as="h1" size={800} weight="bold" style={{ marginBottom: tokens.spacingVerticalL }}>
        {isEdit ? 'Edit Product' : 'Add New Product'}
      </Text>

      <Card>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <Label htmlFor="name" required>Product Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={(_, data) => setFormData(prev => ({ ...prev, name: data.value }))}
                required
              />
            </div>

            <div className={styles.field}>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                name="sku"
                value={formData.sku}
                onChange={(_, data) => setFormData(prev => ({ ...prev, sku: data.value }))}
              />
            </div>

            <div className={styles.field}>
              <Label htmlFor="category" required>Category</Label>
              <Dropdown
                id="category"
                value={formData.category.replace('_', ' ')}
                selectedOptions={[formData.category]}
                onOptionSelect={(_, data) => setFormData(prev => ({ ...prev, category: data.optionValue as ProductCategoryType }))}
              >
                <Option value={ProductCategory.PET_FOOD}>Pet Food</Option>
                <Option value={ProductCategory.EGGS}>Eggs</Option>
                <Option value={ProductCategory.WOOL}>Wool</Option>
                <Option value={ProductCategory.HONEY}>Honey</Option>
                <Option value={ProductCategory.DAIRY}>Dairy</Option>
                <Option value={ProductCategory.VEGETABLES}>Vegetables</Option>
                <Option value={ProductCategory.FRUITS}>Fruits</Option>
                <Option value={ProductCategory.PROCESSED}>Processed</Option>
                <Option value={ProductCategory.OTHER}>Other</Option>
              </Dropdown>
            </div>

            <div className={styles.field}>
              <Label htmlFor="unit" required>Unit</Label>
              <Input
                id="unit"
                name="unit"
                value={formData.unit}
                onChange={(_, data) => setFormData(prev => ({ ...prev, unit: data.value }))}
                placeholder="e.g., lb, dozen, jar, each"
                required
              />
            </div>

            <div className={styles.field}>
              <Label htmlFor="price" required>Price per Unit ($)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price.toString()}
                onChange={(_, data) => setFormData(prev => ({ ...prev, price: parseFloat(data.value) || 0 }))}
                required
              />
            </div>

            <div className={styles.field}>
              <Label htmlFor="inventory_quantity" required>Inventory Quantity</Label>
              <Input
                id="inventory_quantity"
                name="inventory_quantity"
                type="number"
                min="0"
                value={formData.inventory_quantity.toString()}
                onChange={(_, data) => setFormData(prev => ({ ...prev, inventory_quantity: parseInt(data.value) || 0 }))}
                required
              />
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={(_, data) => setFormData(prev => ({ ...prev, description: data.value }))}
                rows={4}
              />
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                name="image_url"
                type="url"
                value={formData.image_url}
                onChange={(_, data) => setFormData(prev => ({ ...prev, image_url: data.value }))}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className={styles.field}>
              <Switch
                checked={formData.is_active}
                onChange={(_, data) => setFormData(prev => ({ ...prev, is_active: data.checked }))}
                label="Active (visible to customers)"
              />
            </div>
          </div>

          <div className={styles.actions}>
            <Button type="submit" appearance="primary">
              {isEdit ? 'Update Product' : 'Create Product'}
            </Button>
            <Button type="button" onClick={() => navigate('/products')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ProductForm;
