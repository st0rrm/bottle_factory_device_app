# Database Migrations

This directory contains SQL migration scripts for updating the database schema.

## How to Apply Migrations

### Using Render Dashboard (Production)

1. Go to your Render dashboard
2. Navigate to your PostgreSQL database
3. Click on "Connect" and choose "External Connection"
4. Use the connection string to connect via psql or any PostgreSQL client
5. Run the migration SQL script:
   ```bash
   psql <connection_string> -f add_do_transaction_type.sql
   ```

### Using psql Command Line

```bash
# Connect to your database
psql postgresql://username:password@host:port/database_name

# Run the migration
\i add_do_transaction_type.sql

# Verify the change
\d transactions
```

### Using Node.js Script

```javascript
const pool = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const sql = fs.readFileSync(path.join(__dirname, 'add_do_transaction_type.sql'), 'utf8');
  await pool.query(sql);
  console.log('Migration completed successfully');
}

runMigration().catch(console.error);
```

## Migration History

- **add_do_transaction_type.sql**: Adds 'do' transaction type to support zero-waste action tracking
