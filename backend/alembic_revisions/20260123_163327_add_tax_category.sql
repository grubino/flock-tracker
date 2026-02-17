-- Migration: Add TAX category to ExpenseCategory enum
-- Date: 2026-01-23

-- Add 'tax' to the expensecategory enum type
ALTER TYPE expensecategory ADD VALUE IF NOT EXISTS 'tax';
