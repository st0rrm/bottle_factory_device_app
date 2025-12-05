const pool = require('../src/config/database');
const fs = require('fs');
const path = require('path');

/**
 * 서버 시작 시 자동으로 마이그레이션 실행
 */
async function runAutoMigration() {
  try {
    console.log('🔄 [AutoMigrate] 데이터베이스 마이그레이션 확인 중...');

    // active_rentals 테이블 존재 여부 확인
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'active_rentals'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✅ [AutoMigrate] active_rentals 테이블이 이미 존재합니다.');

      // total_cups 컬럼 존재 여부 확인
      const columnCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'cafes'
          AND column_name = 'total_cups'
        );
      `);

      if (columnCheck.rows[0].exists) {
        console.log('✅ [AutoMigrate] total_cups 컬럼이 이미 존재합니다.');
        console.log('✅ [AutoMigrate] 마이그레이션 필요 없음');
        return;
      }
    }

    // 마이그레이션 필요
    console.log('🔧 [AutoMigrate] 마이그레이션 실행 중...');

    const migrationSQL = `
      -- Active rentals 테이블 생성
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

      -- 인덱스 생성
      CREATE INDEX IF NOT EXISTS idx_active_rentals_cafe ON active_rentals(cafe_id);
      CREATE INDEX IF NOT EXISTS idx_active_rentals_phone ON active_rentals(phone_number);
      CREATE INDEX IF NOT EXISTS idx_active_rentals_expected_date ON active_rentals(expected_return_date);

      -- cafes 테이블에 total_cups 컬럼 추가
      ALTER TABLE cafes ADD COLUMN IF NOT EXISTS total_cups INTEGER DEFAULT 0 CHECK (total_cups >= 0);

      -- 유니크 제약조건 생성 (이미 존재하면 무시)
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'idx_active_rentals_unique'
        ) THEN
          CREATE UNIQUE INDEX idx_active_rentals_unique ON active_rentals(cafe_id, phone_number);
        END IF;
      END $$;
    `;

    await pool.query(migrationSQL);

    console.log('✅ [AutoMigrate] 마이그레이션 완료!');
    console.log('  - active_rentals 테이블 생성됨');
    console.log('  - cafes.total_cups 컬럼 추가됨');

  } catch (error) {
    console.error('❌ [AutoMigrate] 마이그레이션 실패:', error);
    // 마이그레이션 실패해도 서버는 계속 실행 (기존 기능 유지)
  }
}

module.exports = { runAutoMigration };
