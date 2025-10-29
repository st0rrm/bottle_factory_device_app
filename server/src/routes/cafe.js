const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Cafe = require('../models/Cafe');
const { authenticateAdmin, authenticateToken } = require('../middleware/auth');

// Cafe login
router.post('/login', (req, res) => {
  const { cafeId, password } = req.body;

  if (!cafeId || !password) {
    return res.status(400).json({ error: 'Cafe ID and password required' });
  }

  Cafe.findByCafeId(cafeId, (err, cafe) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!cafe) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!Cafe.verifyPassword(password, cafe.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: cafe.id,
        cafeId: cafe.cafe_id,
        cafeName: cafe.cafe_name,
        role: 'cafe'
      },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      cafe: {
        id: cafe.id,
        cafeId: cafe.cafe_id,
        cafeName: cafe.cafe_name
      }
    });
  });
});

// Get all cafes (admin only)
router.get('/', authenticateAdmin, (req, res) => {
  Cafe.findAll((err, cafes) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(cafes);
  });
});

// Create cafe (admin only)
router.post('/', authenticateAdmin, (req, res) => {
  const { cafeId, password, cafeName } = req.body;

  if (!cafeId || !password || !cafeName) {
    return res.status(400).json({ error: 'Cafe ID, password, and name required' });
  }

  Cafe.create(cafeId, password, cafeName, req.user.id, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Cafe ID already exists' });
      }
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({
      message: 'Cafe created successfully',
      cafeId: this.lastID
    });
  });
});

// Update cafe (admin only)
router.put('/:id', authenticateAdmin, (req, res) => {
  const { cafeName } = req.body;
  const cafeId = req.params.id;

  if (!cafeName) {
    return res.status(400).json({ error: 'Cafe name required' });
  }

  Cafe.update(cafeId, cafeName, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Cafe updated successfully' });
  });
});

// Update cafe password (admin only)
router.put('/:id/password', authenticateAdmin, (req, res) => {
  const { newPassword } = req.body;
  const cafeId = req.params.id;

  if (!newPassword) {
    return res.status(400).json({ error: 'New password required' });
  }

  Cafe.updatePassword(cafeId, newPassword, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Password updated successfully' });
  });
});

// Delete cafe (admin only)
router.delete('/:id', authenticateAdmin, (req, res) => {
  const cafeId = req.params.id;

  Cafe.delete(cafeId, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Cafe deleted successfully' });
  });
});

// Get current cafe info
router.get('/me', authenticateToken, (req, res) => {
  if (req.user.role !== 'cafe') {
    return res.status(403).json({ error: 'Cafe access required' });
  }

  Cafe.findById(req.user.id, (err, cafe) => {
    if (err || !cafe) {
      return res.status(404).json({ error: 'Cafe not found' });
    }

    // Don't send password hash
    delete cafe.password_hash;
    res.json(cafe);
  });
});

module.exports = router;
