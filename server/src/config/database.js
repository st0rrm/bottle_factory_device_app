const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database/accounts.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

function initDatabase() {
  // Create admins table
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `, (err) => {
    if (err) {
      console.error('Error creating admins table:', err.message);
    } else {
      console.log('Admins table ready');
    }
  });

  // Create cafes table
  db.run(`
    CREATE TABLE IF NOT EXISTS cafes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cafe_id TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      cafe_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      FOREIGN KEY (created_by) REFERENCES admins(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating cafes table:', err.message);
    } else {
      console.log('Cafes table ready');
    }
  });

  // Create transactions table (대여/반납 거래 기록)
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cafe_id INTEGER NOT NULL,
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('borrow', 'return')),
      phone_number TEXT,
      quantity INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cafe_id) REFERENCES cafes(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating transactions table:', err.message);
    } else {
      console.log('Transactions table ready');
    }
  });

  // Create user_behaviors table (사용자 행동 추적)
  db.run(`
    CREATE TABLE IF NOT EXISTS user_behaviors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cafe_id INTEGER NOT NULL,
      action_type TEXT NOT NULL CHECK(action_type IN ('tab_switch', 'modal_open', 'verification_attempt')),
      action_detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cafe_id) REFERENCES cafes(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating user_behaviors table:', err.message);
    } else {
      console.log('User behaviors table ready');
    }
  });

  // Create default admin if not exists
  const bcrypt = require('bcryptjs');
  const defaultPassword = 'admin1234';

  db.get('SELECT * FROM admins WHERE username = ?', ['admin'], (err, row) => {
    if (!row) {
      const passwordHash = bcrypt.hashSync(defaultPassword, 10);
      db.run(
        'INSERT INTO admins (username, password_hash, email) VALUES (?, ?, ?)',
        ['admin', passwordHash, 'admin@returnmecup.com'],
        (err) => {
          if (err) {
            console.error('Error creating default admin:', err.message);
          } else {
            console.log('Default admin created (username: admin, password: admin1234)');

            // 프로토타입용 데모 데이터 생성
            const { seedDemoData } = require('./seed');
            setTimeout(() => {
              seedDemoData();
            }, 500); // 약간의 딜레이 후 실행
          }
        }
      );
    }
  });
}

module.exports = db;

