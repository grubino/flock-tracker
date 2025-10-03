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
import { vendorsApi } from '../../services/api';
import type { VendorCreateRequest, Vendor } from '../../types';

interface VendorFormProps {
  vendor?: Vendor;
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
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalL,
  },
});

const VendorForm: React.FC<VendorFormProps> = ({ vendor, isEdit = false }) => {
  const styles = useStyles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState(vendor?.name || '');
  const [address, setAddress] = useState(vendor?.address || '');
  const [phone, setPhone] = useState(vendor?.phone || '');
  const [website, setWebsite] = useState(vendor?.website || '');

  const createMutation = useMutation({
    mutationFn: (data: VendorCreateRequest) => vendorsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      navigate('/vendors');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<VendorCreateRequest>) =>
      vendor ? vendorsApi.update(vendor.id, data) : Promise.reject(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      navigate('/vendors');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const vendorData: VendorCreateRequest = {
      name,
      address: address || undefined,
      phone: phone || undefined,
      website: website || undefined,
    };

    if (isEdit) {
      updateMutation.mutate(vendorData);
    } else {
      createMutation.mutate(vendorData);
    }
  };

  return (
    <div className={styles.container}>
      <Card>
        <Text size={600} weight="semibold">
          {isEdit ? 'Edit Vendor' : 'Add New Vendor'}
        </Text>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor="name" required>Vendor Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
            />
          </div>

          <div className={styles.actions}>
            <Button type="submit" appearance="primary">
              {isEdit ? 'Update Vendor' : 'Create Vendor'}
            </Button>
            <Button type="button" onClick={() => navigate('/vendors')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default VendorForm;
