-- Add 'do' transaction type to transactions table
-- This migration adds support for tracking "do" (zero-waste actions) transactions

-- Drop the existing constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

-- Add new constraint that includes 'do'
ALTER TABLE transactions ADD CONSTRAINT transactions_transaction_type_check
  CHECK(transaction_type IN ('borrow', 'return', 'do'));
