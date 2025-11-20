const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateAdmin } = require('../middleware/auth');

/**
 * POST /api/migrate/add-do-transaction-type
 * Add 'do' transaction type to transactions table
 * Admin only - requires authentication
 */
router.post('/add-do-transaction-type', authenticateAdmin, async (req, res) => {
  try {
    // Drop existing constraint
    await pool.query(`
      ALTER TABLE transactions
      DROP CONSTRAINT IF EXISTS transactions_transaction_type_check
    `);

    console.log('✅ Dropped old constraint');

    // Add new constraint with 'do' included
    await pool.query(`
      ALTER TABLE transactions
      ADD CONSTRAINT transactions_transaction_type_check
      CHECK(transaction_type IN ('borrow', 'return', 'do'))
    `);

    console.log('✅ Added new constraint with "do" type');

    res.json({
      success: true,
      message: 'Migration completed successfully',
      details: 'Added "do" transaction type to CHECK constraint'
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error.message
    });
  }
});

/**
 * GET /api/migrate/check-constraint
 * Check current constraint status
 */
router.get('/check-constraint', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name = 'transactions_transaction_type_check'
    `);

    res.json({
      success: true,
      constraint: result.rows[0] || null
    });

  } catch (error) {
    console.error('Check constraint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check constraint',
      details: error.message
    });
  }
});

/**
 * POST /api/migrate/add-score-column
 * Add score column to transactions table
 * Admin only - requires authentication
 */
router.post('/add-score-column', authenticateAdmin, async (req, res) => {
  try {
    // Add score column
    await pool.query(`
      ALTER TABLE transactions
      ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0
    `);

    console.log('✅ Added score column');

    // Update existing borrow transactions
    const updateResult = await pool.query(`
      UPDATE transactions
      SET score = quantity * 30
      WHERE transaction_type = 'borrow' AND score = 0
    `);

    console.log(`✅ Updated ${updateResult.rowCount} existing borrow records`);

    // Create index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_score ON transactions(score)
    `);

    console.log('✅ Created index on score column');

    res.json({
      success: true,
      message: 'Migration completed successfully',
      details: `Added score column and updated ${updateResult.rowCount} existing records`
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error.message
    });
  }
});

module.exports = router;
