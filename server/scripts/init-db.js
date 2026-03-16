const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database URL from command line argument or environment variable
const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: Database URL not provided');
  console.error('Usage: node init-db.js <DATABASE_URL>');
  console.error('Example: node init-db.js "postgresql://user:pass@host:5432/dbname"');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Render's SSL
  }
});

async function initializeDatabase() {
  try {
    console.log('🔄 Connecting to database...');

    // Read SQL file
    const sqlPath = path.join(__dirname, '../database/init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Executing init.sql...');

    // Execute SQL
    await pool.query(sql);

    console.log('✅ Database initialized successfully!');
    console.log('\n📊 Created tables:');

    // List tables
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    console.log('\n👤 Default admin account created:');
    console.log('   Username: ####');
    console.log('   Password: ####');

  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initializeDatabase();
