const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { authenticateAdmin } = require('../middleware/auth');

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const admin = await Admin.findByUsername(username);

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!Admin.verifyPassword(password, admin.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login (fire and forget)
    Admin.updateLastLogin(admin.id).catch(err =>
      console.error('Error updating last login:', err)
    );

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
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current admin info
router.get('/me', authenticateAdmin, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json(admin);
  } catch (err) {
    console.error('Get admin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
