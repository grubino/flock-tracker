import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Text,
  Button,
  Input,
  Label,
  Dropdown,
  Option,
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
import { expensesApi } from '../../services/api';
import { ExpenseCategory } from '../../types';

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
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalL,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  totalCard: {
    marginBottom: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorBrandBackground2,
  },
  totalText: {
    fontSize: tokens.fontSizeHero800,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground1,
  },
  tableContainer: {
    overflowX: 'auto',
  },
});

const ExpenseList: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [vendorFilter, setVendorFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', { category: categoryFilter[0], vendor: vendorFilter, start_date: startDate, end_date: endDate }],
    queryFn: () =>
      expensesApi.getAll({
        category: categoryFilter[0],
        vendor: vendorFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }).then(res => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => expensesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      deleteMutation.mutate(id);
    }
  };

  const categoryOptions = Object.entries(ExpenseCategory).map(([key, value]) => ({
    key: value,
    text: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }));

  const totalExpenses = expenses?.reduce((sum, exp) => sum + parseFloat(exp.amount), 0) || 0;

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text size={800} weight="semibold">Farm Expenses</Text>
        <Button
          appearance="primary"
          icon={<Add24Regular />}
          onClick={() => navigate('/expenses/new')}
        >
          Add Expense
        </Button>
      </div>

      <Card className={styles.totalCard}>
        <Text size={400}>Total Expenses</Text>
        <Text className={styles.totalText}>{formatCurrency(totalExpenses.toString())}</Text>
      </Card>

      <Card>
        <div className={styles.filters}>
          <div className={styles.field}>
            <Label htmlFor="category">Category</Label>
            <Dropdown
              id="category"
              placeholder="All Categories"
              value={categoryOptions.find(opt => opt.key === categoryFilter[0])?.text || ''}
              selectedOptions={categoryFilter}
              onOptionSelect={(_, data) => setCategoryFilter(data.selectedOptions)}
            >
              <Option value="">All Categories</Option>
              {categoryOptions.map(option => (
                <Option key={option.key} value={option.key}>
                  {option.text}
                </Option>
              ))}
            </Dropdown>
          </div>

          <div className={styles.field}>
            <Label htmlFor="vendor">Vendor</Label>
            <Input
              id="vendor"
              placeholder="Filter by vendor"
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={() => {
            setCategoryFilter([]);
            setVendorFilter('');
            setStartDate('');
            setEndDate('');
          }}
        >
          Clear Filters
        </Button>
      </Card>

      <Card>
        <div className={styles.tableContainer}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Category</TableHeaderCell>
                <TableHeaderCell>Description</TableHeaderCell>
                <TableHeaderCell>Vendor</TableHeaderCell>
                <TableHeaderCell>Amount</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6}>Loading...</TableCell>
                </TableRow>
              )}
              {!isLoading && expenses?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>No expenses found</TableCell>
                </TableRow>
              )}
              {expenses?.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{formatDate(expense.expense_date)}</TableCell>
                  <TableCell>
                    {categoryOptions.find(opt => opt.key === expense.category)?.text || expense.category}
                  </TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{expense.vendor?.name || '-'}</TableCell>
                  <TableCell>{formatCurrency(expense.amount)}</TableCell>
                  <TableCell>
                    <Menu>
                      <MenuTrigger disableButtonEnhancement>
                        <Button icon={<MoreHorizontal24Regular />} appearance="subtle" />
                      </MenuTrigger>
                      <MenuPopover>
                        <MenuList>
                          <MenuItem onClick={() => navigate(`/expenses/${expense.id}/edit`)}>
                            Edit
                          </MenuItem>
                          <MenuItem onClick={() => handleDelete(expense.id)}>
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

export default ExpenseList;
