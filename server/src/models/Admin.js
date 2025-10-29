const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class Admin {
  static async findByUsername(username) {
    try {
      const result = await pool.query(
        'SELECT * FROM admins WHERE username = $1',
        [username]
      );
      return result.rows[0];
    } catch (err) {
      throw err;
    }
  }

  static async findById(id) {
    try {
      const result = await pool.query(
        'SELECT id, username, email, created_at, last_login FROM admins WHERE id = $1',
        [id]
      );
      return result.rows[0];
    } catch (err) {
      throw err;
    }
  }

  static verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
  }

  static async updateLastLogin(id) {
    try {
      await pool.query(
        'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );
    } catch (err) {
      throw err;
    }
  }

  static async create(username, password, email) {
    try {
      const passwordHash = bcrypt.hashSync(password, 10);
      const result = await pool.query(
        'INSERT INTO admins (username, password_hash, email) VALUES ($1, $2, $3) RETURNING id',
        [username, passwordHash, email]
      );
      return result.rows[0];
    } catch (err) {
      throw err;
    }
  }
}

module.exports = Admin;
