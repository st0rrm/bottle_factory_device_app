const db = require('../config/database');
const bcrypt = require('bcryptjs');

class Admin {
  static findByUsername(username, callback) {
    db.get('SELECT * FROM admins WHERE username = ?', [username], callback);
  }

  static findById(id, callback) {
    db.get('SELECT id, username, email, created_at, last_login FROM admins WHERE id = ?', [id], callback);
  }

  static verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
  }

  static updateLastLogin(id, callback) {
    db.run(
      'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [id],
      callback
    );
  }

  static create(username, password, email, callback) {
    const passwordHash = bcrypt.hashSync(password, 10);
    db.run(
      'INSERT INTO admins (username, password_hash, email) VALUES (?, ?, ?)',
      [username, passwordHash, email],
      callback
    );
  }
}

module.exports = Admin;
