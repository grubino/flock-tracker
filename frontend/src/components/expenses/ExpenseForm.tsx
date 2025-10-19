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
  Combobox,
  Divider,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell
} from '@fluentui/react-components';
import { Delete24Regular, Add24Regular } from '@fluentui/react-icons';
import { expensesApi, vendorsApi } from '../../services/api';
import { ExpenseCategory } from '../../types';
import type { ExpenseCreateRequest, Expense, VendorCreateRequest, Receipt, OCRResult, ExpenseLineItemCreate } from '../../types';
import ReceiptUpload from '../receipts/ReceiptUpload';

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
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: tokens.spacingVerticalL,
    '& > *': {
      minWidth: 0, // Allow grid items to shrink
    },
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    minWidth: 0, // Allow flex items to shrink below content size
  },
  dropdown: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    '& button': {
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    '& button span': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
  },
  lineItemsTable: {
    tableLayout: 'fixed',
    width: '100%',
    '& th:nth-of-type(1)': { width: '40%' }, // Description - larger
    '& th:nth-of-type(2)': { width: '25%' }, // Category
    '& th:nth-of-type(3)': { width: '12%' }, // Quantity
    '& th:nth-of-type(4)': { width: '13%' }, // Amount
    '& th:nth-of-type(5)': { width: '10%' }, // Actions
    '& input': {
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
    },
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalL,
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      gap: tokens.spacingVerticalS,
    },
  },
  lineItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalS,
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: tokens.spacingVerticalS,
    },
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
  const [showReceiptUpload, setShowReceiptUpload] = useState(!isEdit);
  const [lineItems, setLineItems] = useState<ExpenseLineItemCreate[]>(
    expense?.line_items || []
  );
  const [receiptId, setReceiptId] = useState<number | null>(expense?.receipt_id || null);

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

  const handleReceiptComplete = (receipt: Receipt, ocrResult: OCRResult) => {
    // Save receipt ID
    setReceiptId(receipt.id);

    // Populate form with OCR data
    if (ocrResult.vendor) {
      setVendorSearchQuery(ocrResult.vendor);
      // Try to find matching vendor
      const matchingVendor = vendors?.find(v =>
        v.name.toLowerCase() === ocrResult.vendor?.toLowerCase()
      );
      if (matchingVendor) {
        setSelectedVendorId(matchingVendor.id);
      }
    }

    if (ocrResult.total) {
      setAmount(ocrResult.total);
    }

    if (ocrResult.date) {
      setExpenseDate(ocrResult.date);
    }

    if (ocrResult.items.length > 0) {
      // Set line items from OCR
      const ocrLineItems = ocrResult.items.map(item => ({
        description: item.description,
        amount: item.amount,
      }));
      setLineItems(ocrLineItems);

      // Use first item description or "Multiple items" for main description
      setDescription(ocrResult.items.length === 1 ? ocrResult.items[0].description : 'Multiple items');
    }

    // Hide upload and show form
    setShowReceiptUpload(false);
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, {
      description: '',
      amount: '0',
      category: selectedCategory[0] as typeof ExpenseCategory[keyof typeof ExpenseCategory]
    }]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: keyof ExpenseLineItemCreate, value: string) => {
    const newLineItems = [...lineItems];
    newLineItems[index] = { ...newLineItems[index], [field]: value };

    // Auto-calculate unit_price when amount or quantity changes
    const item = newLineItems[index];
    if (field === 'amount' || field === 'quantity') {
      const amount = parseFloat(item.amount || '0');
      const quantity = parseFloat(item.quantity || '0');
      if (quantity > 0) {
        item.unit_price = (amount / quantity).toFixed(2);
      } else {
        item.unit_price = '0';
      }
    }

    setLineItems(newLineItems);

    // Recalculate total amount
    const total = newLineItems.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0);
    setAmount(total.toFixed(2));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const expenseData: ExpenseCreateRequest = {
      category: selectedCategory[0] as typeof ExpenseCategory[keyof typeof ExpenseCategory],
      amount: amount,
      description,
      notes: notes || undefined,
      vendor_id: selectedVendorId || undefined,
      receipt_id: receiptId || undefined,
      expense_date: new Date(expenseDate).toISOString(),
      line_items: lineItems.length > 0 ? lineItems : undefined,
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
      {!isEdit && showReceiptUpload && (
        <>
          <ReceiptUpload onComplete={handleReceiptComplete} />
          <Divider style={{ margin: `${tokens.spacingVerticalXL} 0` }}>
            OR
          </Divider>
          <Button onClick={() => setShowReceiptUpload(false)}>
            Enter Expense Manually
          </Button>
        </>
      )}

      {(!showReceiptUpload || isEdit) && (
        <Card>
          <Text size={600} weight="semibold">
            {isEdit ? 'Edit Expense' : 'Add New Expense'}
          </Text>
          {!isEdit && (
            <Button
              onClick={() => setShowReceiptUpload(true)}
              style={{ marginTop: tokens.spacingVerticalS }}
            >
              Upload Receipt Instead
            </Button>
          )}
          <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <Label htmlFor="category" required>Category</Label>
              <Dropdown
                id="category"
                className={styles.dropdown}
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

          {/* Line Items Section */}
          <div className={styles.field}>
            <div className={styles.lineItemHeader}>
              <Label>Line Items</Label>
              <Button
                size="small"
                icon={<Add24Regular />}
                onClick={handleAddLineItem}
                type="button"
                style={{ width: '100%' }}
              >
                Add Line Item
              </Button>
            </div>

            {lineItems.length > 0 && (
              <Table className={styles.lineItemsTable}>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Description</TableHeaderCell>
                    <TableHeaderCell>Category</TableHeaderCell>
                    <TableHeaderCell>Quantity</TableHeaderCell>
                    <TableHeaderCell>Amount ($)</TableHeaderCell>
                    <TableHeaderCell></TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, index) => {
                    // Unit price is calculated automatically in handleLineItemChange
                    // when quantity or amount changes

                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                            placeholder="Item description"
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Dropdown
                            className={styles.dropdown}
                            value={categoryOptions.find(opt => opt.key === item.category)?.text || ''}
                            selectedOptions={item.category ? [item.category] : []}
                            onOptionSelect={(_, data) => handleLineItemChange(index, 'category', data.selectedOptions[0])}
                          >
                            {categoryOptions.map(option => (
                              <Option key={option.key} value={option.key}>
                                {option.text}
                              </Option>
                            ))}
                          </Dropdown>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.quantity || ''}
                            onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                            placeholder="Qty"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.amount}
                            onChange={(e) => handleLineItemChange(index, 'amount', e.target.value)}
                            placeholder="Total"
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            icon={<Delete24Regular />}
                            appearance="subtle"
                            onClick={() => handleRemoveLineItem(index)}
                            type="button"
                            aria-label="Delete line item"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          <div className={styles.actions}>
            <Button type="submit" appearance="primary" style={{ flex: 1, width: '100%' }}>
              {isEdit ? 'Update Expense' : 'Create Expense'}
            </Button>
            <Button type="button" onClick={() => navigate('/expenses')} style={{ flex: 1, width: '100%' }}>
              Cancel
            </Button>
          </div>
        </form>
        </Card>
      )}
    </div>
  );
};

export default ExpenseForm;
