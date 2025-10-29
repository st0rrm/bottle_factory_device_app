const db = require('../config/database');
const bcrypt = require('bcryptjs');

class Cafe {
  static findByCafeId(cafeId, callback) {
    db.get('SELECT * FROM cafes WHERE cafe_id = ?', [cafeId], callback);
  }

  static findById(id, callback) {
    db.get('SELECT * FROM cafes WHERE id = ?', [id], callback);
  }

  static findAll(callback) {
    db.all('SELECT id, cafe_id, cafe_name, created_at FROM cafes', callback);
  }

  static verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
  }

  static create(cafeId, password, cafeName, createdBy, callback) {
    const passwordHash = bcrypt.hashSync(password, 10);
    db.run(
      'INSERT INTO cafes (cafe_id, password_hash, cafe_name, created_by) VALUES (?, ?, ?, ?)',
      [cafeId, passwordHash, cafeName, createdBy],
      callback
    );
  }

  static update(id, cafeName, callback) {
    db.run(
      'UPDATE cafes SET cafe_name = ? WHERE id = ?',
      [cafeName, id],
      callback
    );
  }

  static updatePassword(id, newPassword, callback) {
    const passwordHash = bcrypt.hashSync(newPassword, 10);
    db.run(
      'UPDATE cafes SET password_hash = ? WHERE id = ?',
      [passwordHash, id],
      callback
    );
  }

  static delete(id, callback) {
    db.run('DELETE FROM cafes WHERE id = ?', [id], callback);
  }
}

module.exports = Cafe;
