-- Create active_rentals table for tracking currently rented cups
CREATE TABLE IF NOT EXISTS active_rentals (
  id SERIAL PRIMARY KEY,
  cafe_id INTEGER NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  rental_date TIMESTAMP NOT NULL,
  expected_return_date TIMESTAMP NOT NULL,
  borrow_transaction_id INTEGER REFERENCES transactions(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_active_rentals_cafe ON active_rentals(cafe_id);
CREATE INDEX idx_active_rentals_phone ON active_rentals(phone_number);
CREATE INDEX idx_active_rentals_expected_date ON active_rentals(expected_return_date);

-- Add total_cups column to cafes table
ALTER TABLE cafes
ADD COLUMN IF NOT EXISTS total_cups INTEGER DEFAULT 0 CHECK (total_cups >= 0);

-- Create unique constraint to prevent duplicate active rentals for same phone number at same cafe
CREATE UNIQUE INDEX idx_active_rentals_unique ON active_rentals(cafe_id, phone_number);

COMMENT ON TABLE active_rentals IS 'Tracks currently rented cups with status updates';
COMMENT ON COLUMN active_rentals.status IS 'active: normal, overdue: past due date, expired: 7+ days overdue (considered lost)';
COMMENT ON COLUMN cafes.total_cups IS 'Total number of cups owned by the cafe';
