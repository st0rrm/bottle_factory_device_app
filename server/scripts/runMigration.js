const pool = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration(filename) {
  try {
    const migrationPath = path.join(__dirname, '..', 'migrations', filename);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log(`Running migration: ${filename}`);
    await pool.query(sql);
    console.log(`✅ Migration completed: ${filename}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${filename}`, error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node runMigration.js <migration-file.sql>');
  process.exit(1);
}

runMigration(migrationFile);
