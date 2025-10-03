import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Text,
  Button,
  Input,
  Label,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  makeStyles,
  tokens,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem
} from '@fluentui/react-components';
import { MoreHorizontal24Regular, Add24Regular } from '@fluentui/react-icons';
import { vendorsApi } from '../../services/api';
import type { Vendor as VendorType } from '../../types';

const useStyles = makeStyles({
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: tokens.spacingVerticalXL,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalL,
  },
  filters: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalL,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    flex: 1,
  },
  tableContainer: {
    overflowX: 'auto',
  },
});

const VendorList: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchFilter, setSearchFilter] = useState('');

  const { data: vendors, isLoading } = useQuery<VendorType[]>({
    queryKey: ['vendors', { search: searchFilter }],
    queryFn: () =>
      vendorsApi.getAll({
        search: searchFilter || undefined,
      }).then(res => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => vendorsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text size={800} weight="semibold">Vendors</Text>
        <Button
          appearance="primary"
          icon={<Add24Regular />}
          onClick={() => navigate('/vendors/new')}
        >
          Add Vendor
        </Button>
      </div>

      <Card>
        <div className={styles.filters}>
          <div className={styles.field}>
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Search by vendor name"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={() => setSearchFilter('')}
        >
          Clear Filters
        </Button>
      </Card>

      <Card>
        <div className={styles.tableContainer}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Phone</TableHeaderCell>
                <TableHeaderCell>Website</TableHeaderCell>
                <TableHeaderCell>Address</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5}>Loading...</TableCell>
                </TableRow>
              )}
              {!isLoading && vendors?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>No vendors found</TableCell>
                </TableRow>
              )}
              {vendors?.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>{vendor.name}</TableCell>
                  <TableCell>{vendor.phone || '-'}</TableCell>
                  <TableCell>
                    {vendor.website ? (
                      <a href={vendor.website} target="_blank" rel="noopener noreferrer">
                        {vendor.website}
                      </a>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{vendor.address || '-'}</TableCell>
                  <TableCell>
                    <Menu>
                      <MenuTrigger disableButtonEnhancement>
                        <Button icon={<MoreHorizontal24Regular />} appearance="subtle" />
                      </MenuTrigger>
                      <MenuPopover>
                        <MenuList>
                          <MenuItem onClick={() => navigate(`/vendors/${vendor.id}/edit`)}>
                            Edit
                          </MenuItem>
                          <MenuItem onClick={() => handleDelete(vendor.id)}>
                            Delete
                          </MenuItem>
                        </MenuList>
                      </MenuPopover>
                    </Menu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default VendorList;
