import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Text,
  Button,
  Input,
  Label,
  Textarea,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import { locationsApi } from '../../services/api';
import type { LocationCreateRequest, Location } from '../../types';

interface LocationFormProps {
  location?: Location;
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
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalL,
  },
});

const LocationForm: React.FC<LocationFormProps> = ({ location, isEdit = false }) => {
  const styles = useStyles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<LocationCreateRequest>({
    name: location?.name || '',
    address: location?.address || '',
    paddock_name: location?.paddock_name || '',
    description: location?.description || '',
  });

  const createMutation = useMutation({
    mutationFn: (data: LocationCreateRequest) => locationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      navigate('/locations');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<LocationCreateRequest>) =>
      locationsApi.update(location!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      navigate('/locations');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEdit) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className={styles.container}>
      <Text as="h1" size={800} weight="bold" style={{ marginBottom: tokens.spacingVerticalL }}>
        {isEdit ? 'Edit Location' : 'Add New Location'}
      </Text>

      <Card>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor="name" required>Location Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={(_, data) => handleChange({ target: { name: 'name', value: data.value } } as any)}
              required
              placeholder="e.g., North Pasture, Barn A, etc."
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="paddock_name">Paddock Name</Label>
            <Input
              id="paddock_name"
              name="paddock_name"
              value={formData.paddock_name}
              onChange={(_, data) => handleChange({ target: { name: 'paddock_name', value: data.value } } as any)}
              placeholder="e.g., Paddock 1, West Field, etc."
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={(_, data) => handleChange({ target: { name: 'address', value: data.value } } as any)}
              placeholder="Full address or coordinates"
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={(_, data) => handleChange({ target: { name: 'description', value: data.value } } as any)}
              rows={4}
              placeholder="Additional details about this location..."
            />
          </div>

          <div className={styles.actions}>
            <Button
              type="submit"
              appearance="primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
            </Button>
            <Button
              type="button"
              appearance="secondary"
              onClick={() => navigate('/locations')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default LocationForm;