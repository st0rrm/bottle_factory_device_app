-- Add score column to transactions table
-- This allows storing actual score values for all transaction types

-- Add score column (default 0)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

-- Update existing borrow transactions with calculated score (quantity * 30)
UPDATE transactions
SET score = quantity * 30
WHERE transaction_type = 'borrow' AND score = 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_score ON transactions(score);
