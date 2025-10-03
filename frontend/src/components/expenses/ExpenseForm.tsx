import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Text,
  Button,
  Input,
  Label,
  Dropdown,
  Option,
  Textarea,
  makeStyles,
  tokens,
  Combobox
} from '@fluentui/react-components';
import { expensesApi, vendorsApi } from '../../services/api';
import { ExpenseCategory } from '../../types';
import type { ExpenseCreateRequest, Expense, VendorCreateRequest } from '../../types';

interface ExpenseFormProps {
  expense?: Expense;
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

const ExpenseForm: React.FC<ExpenseFormProps> = ({ expense, isEdit = false }) => {
  const styles = useStyles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<string[]>(
    expense?.category ? [expense.category] : [ExpenseCategory.FEED]
  );
  const [amount, setAmount] = useState(expense?.amount || '');
  const [description, setDescription] = useState(expense?.description || '');
  const [notes, setNotes] = useState(expense?.notes || '');
  const [vendorSearchQuery, setVendorSearchQuery] = useState(expense?.vendor?.name || '');
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(expense?.vendor_id || null);
  const [expenseDate, setExpenseDate] = useState(
    expense?.expense_date ? expense.expense_date.split('T')[0] : new Date().toISOString().split('T')[0]
  );

  // Debounce vendor search
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(vendorSearchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(vendorSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [vendorSearchQuery]);

  const { data: vendors } = useQuery({
    queryKey: ['vendors', { search: debouncedSearchQuery }],
    queryFn: () => vendorsApi.getAll({
      search: debouncedSearchQuery.length >= 2 ? debouncedSearchQuery : undefined
    }).then(res => res.data),
    enabled: debouncedSearchQuery.length >= 2,
  });

  const createVendorMutation = useMutation({
    mutationFn: (data: VendorCreateRequest) => vendorsApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setSelectedVendorId(response.data.id);
      setVendorSearchQuery(response.data.name);
    },
  });

  const filteredVendors = useMemo(() => {
    if (!debouncedSearchQuery || debouncedSearchQuery.length < 2) return [];
    return vendors || [];
  }, [vendors, debouncedSearchQuery]);

  const createMutation = useMutation({
    mutationFn: (data: ExpenseCreateRequest) => expensesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      navigate('/expenses');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ExpenseCreateRequest>) =>
      expense ? expensesApi.update(expense.id, data) : Promise.reject(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      navigate('/expenses');
    },
  });

  const handleCreateNewVendor = () => {
    if (vendorSearchQuery.trim()) {
      createVendorMutation.mutate({
        name: vendorSearchQuery.trim()
      });
    }
  };

  const handleVendorSelect = (vendorId: number, vendorName: string) => {
    setSelectedVendorId(vendorId);
    setVendorSearchQuery(vendorName);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const expenseData: ExpenseCreateRequest = {
      category: selectedCategory[0] as typeof ExpenseCategory[keyof typeof ExpenseCategory],
      amount: amount,
      description,
      notes: notes || undefined,
      vendor_id: selectedVendorId || undefined,
      expense_date: new Date(expenseDate).toISOString(),
    };

    if (isEdit) {
      updateMutation.mutate(expenseData);
    } else {
      createMutation.mutate(expenseData);
    }
  };

  const categoryOptions = Object.entries(ExpenseCategory).map(([key, value]) => ({
    key: value,
    text: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }));

  return (
    <div className={styles.container}>
      <Card>
        <Text size={600} weight="semibold">
          {isEdit ? 'Edit Expense' : 'Add New Expense'}
        </Text>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <Label htmlFor="category" required>Category</Label>
              <Dropdown
                id="category"
                value={categoryOptions.find(opt => opt.key === selectedCategory[0])?.text || ''}
                selectedOptions={selectedCategory}
                onOptionSelect={(_, data) => setSelectedCategory(data.selectedOptions)}
              >
                {categoryOptions.map(option => (
                  <Option key={option.key} value={option.key}>
                    {option.text}
                  </Option>
                ))}
              </Dropdown>
            </div>

            <div className={styles.field}>
              <Label htmlFor="amount" required>Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className={styles.field}>
              <Label htmlFor="expenseDate" required>Date</Label>
              <Input
                id="expenseDate"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
            </div>

            <div className={styles.field}>
              <Label htmlFor="vendor">Vendor</Label>
              <Combobox
                id="vendor"
                placeholder="Type to search vendors..."
                value={vendorSearchQuery}
                onInput={(e) => {
                  setVendorSearchQuery(e.currentTarget.value);
                  if (!e.currentTarget.value) {
                    setSelectedVendorId(null);
                  }
                }}
                onOptionSelect={(_, data) => {
                  if (data.optionValue?.startsWith('create-new-')) {
                    handleCreateNewVendor();
                  } else if (data.optionValue) {
                    const vendor = filteredVendors.find(v => v.name === data.optionValue);
                    if (vendor) {
                      handleVendorSelect(vendor.id, vendor.name);
                    }
                  }
                }}
                freeform
              >
                {debouncedSearchQuery.length >= 2 && filteredVendors.length === 0 && (
                  <>
                    <Option key="no-results" text="No matching vendors found" disabled>
                      No matching vendors found
                    </Option>
                    <Option
                      key="create-new"
                      text={`Create new vendor named "${vendorSearchQuery}"`}
                      value={`create-new-${vendorSearchQuery}`}
                    >
                      Create new vendor named "{vendorSearchQuery}"
                    </Option>
                  </>
                )}
                {filteredVendors.map(vendor => (
                  <Option
                    key={vendor.id}
                    text={vendor.name}
                    value={vendor.name}
                  >
                    {vendor.name}
                  </Option>
                ))}
              </Combobox>
            </div>
          </div>

          <div className={styles.field}>
            <Label htmlFor="description" required>Description</Label>
            <Input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div className={styles.actions}>
            <Button type="submit" appearance="primary">
              {isEdit ? 'Update Expense' : 'Create Expense'}
            </Button>
            <Button type="button" onClick={() => navigate('/expenses')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ExpenseForm;
