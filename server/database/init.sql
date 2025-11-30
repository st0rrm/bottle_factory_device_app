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

-- Create transactions table (대여/반납/실천 거래 기록)
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  cafe_id INTEGER NOT NULL REFERENCES cafes(id),
  transaction_type VARCHAR(50) NOT NULL CHECK(transaction_type IN ('borrow', 'return', 'do')),
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

-- Create voice_recognition_stats table (음성인식 통계)
CREATE TABLE IF NOT EXISTS voice_recognition_stats (
  id SERIAL PRIMARY KEY,
  cafe_id INTEGER NOT NULL REFERENCES cafes(id),
  stat_type VARCHAR(50) NOT NULL CHECK(stat_type IN (
    'llm_api_call',
    'takeout_detected',
    'help_modal_opened',
    'returnmecup_menu_entered'
  )),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create voice_rms_logs table (RMS 음량 로그)
CREATE TABLE IF NOT EXISTS voice_rms_logs (
  id SERIAL PRIMARY KEY,
  cafe_id INTEGER NOT NULL REFERENCES cafes(id),
  cafe_name VARCHAR(255),
  rms_values INTEGER[],          -- RMS 값 배열
  segment_count INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create voice_api_calls table (LLM API 호출 기록)
CREATE TABLE IF NOT EXISTS voice_api_calls (
  id SERIAL PRIMARY KEY,
  cafe_id INTEGER NOT NULL REFERENCES cafes(id),
  cafe_name VARCHAR(255),

  -- 요청 정보
  audio_size_kb DECIMAL(10, 2),
  segment_count INTEGER,
  analysis_mode VARCHAR(20),      -- 'cumulative' or 'sliding'

  -- 응답 정보
  transcribed_text TEXT,
  takeout_detected BOOLEAN,
  confidence DECIMAL(3, 2),
  reason TEXT,

  -- 성능 정보
  api_duration_ms INTEGER,

  -- 결과
  action VARCHAR(20),              -- 'confirmed', 'continue', 'restart'

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_cafe_id ON transactions(cafe_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_cafe_id ON user_behaviors(cafe_id);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_created_at ON user_behaviors(created_at);
CREATE INDEX IF NOT EXISTS idx_voice_stats_cafe_id ON voice_recognition_stats(cafe_id);
CREATE INDEX IF NOT EXISTS idx_voice_stats_type ON voice_recognition_stats(stat_type);
CREATE INDEX IF NOT EXISTS idx_voice_stats_created_at ON voice_recognition_stats(created_at);

-- Indexes for voice_rms_logs
CREATE INDEX IF NOT EXISTS idx_voice_rms_cafe_id ON voice_rms_logs(cafe_id);
CREATE INDEX IF NOT EXISTS idx_voice_rms_created_at ON voice_rms_logs(created_at);

-- Indexes for voice_api_calls
CREATE INDEX IF NOT EXISTS idx_voice_api_cafe_id ON voice_api_calls(cafe_id);
CREATE INDEX IF NOT EXISTS idx_voice_api_created_at ON voice_api_calls(created_at);
CREATE INDEX IF NOT EXISTS idx_voice_api_takeout ON voice_api_calls(takeout_detected);

-- Insert default admin account (password: admin1234)
-- Password hash generated with bcryptjs, salt rounds: 10
INSERT INTO admins (username, password_hash, email)
VALUES (
  'admin',
  '$2a$10$YGT4ZN4GmKDouJObSzvEpuScYWJwcftnMilOjvVoSGZ1Ke5N53xqW',
  'admin@returnmecup.com'
) ON CONFLICT (username) DO NOTHING;

-- Note: Demo data will be seeded by the application on first run
