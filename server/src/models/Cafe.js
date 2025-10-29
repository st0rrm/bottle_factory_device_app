const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class Cafe {
  static async findByCafeId(cafeId) {
    try {
      const result = await pool.query(
        'SELECT * FROM cafes WHERE cafe_id = $1',
        [cafeId]
      );
      return result.rows[0];
    } catch (err) {
      throw err;
    }
  }

  static async findById(id) {
    try {
      const result = await pool.query(
        'SELECT * FROM cafes WHERE id = $1',
        [id]
      );
      return result.rows[0];
    } catch (err) {
      throw err;
    }
  }

  static async findAll() {
    try {
      const result = await pool.query(
        'SELECT id, cafe_id, cafe_name, created_at FROM cafes ORDER BY cafe_name'
      );
      return result.rows;
    } catch (err) {
      throw err;
    }
  }

  static verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
  }

  static async create(cafeId, password, cafeName, createdBy) {
    try {
      const passwordHash = bcrypt.hashSync(password, 10);
      const result = await pool.query(
        'INSERT INTO cafes (cafe_id, password_hash, cafe_name, created_by) VALUES ($1, $2, $3, $4) RETURNING id',
        [cafeId, passwordHash, cafeName, createdBy]
      );
      return result.rows[0];
    } catch (err) {
      throw err;
    }
  }

  static async update(id, cafeName) {
    try {
      await pool.query(
        'UPDATE cafes SET cafe_name = $1 WHERE id = $2',
        [cafeName, id]
      );
    } catch (err) {
      throw err;
    }
  }

  static async updatePassword(id, newPassword) {
    try {
      const passwordHash = bcrypt.hashSync(newPassword, 10);
      await pool.query(
        'UPDATE cafes SET password_hash = $1 WHERE id = $2',
        [passwordHash, id]
      );
    } catch (err) {
      throw err;
    }
  }

  static async delete(id) {
    try {
      await pool.query('DELETE FROM cafes WHERE id = $1', [id]);
    } catch (err) {
      throw err;
    }
  }
}

module.exports = Cafe;
