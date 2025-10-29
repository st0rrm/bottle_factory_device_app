const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { authenticateAdmin } = require('../middleware/auth');

// Admin login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  Admin.findByUsername(username, (err, admin) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!Admin.verifyPassword(password, admin.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    Admin.updateLastLogin(admin.id, () => {});

    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email
      }
    });
  });
});

// Get current admin info
router.get('/me', authenticateAdmin, (req, res) => {
  Admin.findById(req.user.id, (err, admin) => {
    if (err || !admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    res.json(admin);
  });
});

module.exports = router;
