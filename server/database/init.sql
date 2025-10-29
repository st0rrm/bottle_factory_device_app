-- ReturnMeCup Database Schema for PostgreSQL

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Create cafes table
CREATE TABLE IF NOT EXISTS cafes (
  id SERIAL PRIMARY KEY,
  cafe_id VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  cafe_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES admins(id)
);

-- Create transactions table (대여/반납 거래 기록)
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  cafe_id INTEGER NOT NULL REFERENCES cafes(id),
  transaction_type VARCHAR(50) NOT NULL CHECK(transaction_type IN ('borrow', 'return')),
  phone_number VARCHAR(20),
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_behaviors table (사용자 행동 추적)
CREATE TABLE IF NOT EXISTS user_behaviors (
  id SERIAL PRIMARY KEY,
  cafe_id INTEGER NOT NULL REFERENCES cafes(id),
  action_type VARCHAR(100) NOT NULL CHECK(action_type IN ('tab_switch', 'modal_open', 'verification_attempt')),
  action_detail TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_cafe_id ON transactions(cafe_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_cafe_id ON user_behaviors(cafe_id);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_created_at ON user_behaviors(created_at);

-- Insert default admin account (password: admin1234)
-- Password hash generated with bcryptjs, salt rounds: 10
INSERT INTO admins (username, password_hash, email)
VALUES (
  'admin',
  '$2a$10$YGT4ZN4GmKDouJObSzvEpuScYWJwcftnMilOjvVoSGZ1Ke5N53xqW',
  'admin@returnmecup.com'
) ON CONFLICT (username) DO NOTHING;

-- Note: Demo data will be seeded by the application on first run
