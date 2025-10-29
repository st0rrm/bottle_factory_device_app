const { Pool } = require('pg');

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'returnmecup',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'returnmecup_db',
  password: process.env.DB_PASSWORD || 'returnmecup2024',
  port: process.env.DB_PORT || 5432,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// Initialize database tables (if needed)
async function initDatabase() {
  try {
    // Check if tables exist, if not, run initialization
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'admins'
      );
    `);

    if (result.rows[0].exists) {
      console.log('Database tables already initialized');

      // Seed demo data if needed
      const { seedDemoData } = require('./seed');
      await seedDemoData();
    } else {
      console.log('Database tables need to be initialized via init.sql');
    }
  } catch (err) {
    console.error('Error checking database:', err.message);
  }
}

// Run initialization
initDatabase();

// Export pool for use in models
module.exports = pool;
