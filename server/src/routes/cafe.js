const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Cafe = require('../models/Cafe');
const { authenticateAdmin, authenticateToken } = require('../middleware/auth');

// Cafe login
router.post('/login', async (req, res) => {
  try {
    const { cafeId, password } = req.body;

    if (!cafeId || !password) {
      return res.status(400).json({ error: 'Cafe ID and password required' });
    }

    const cafe = await Cafe.findByCafeId(cafeId);

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
  } catch (err) {
    console.error('Cafe login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all cafes (admin only)
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const cafes = await Cafe.findAll();
    res.json(cafes);
  } catch (err) {
    console.error('Get all cafes error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create cafe (admin only)
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { cafeId, password, cafeName } = req.body;

    if (!cafeId || !password || !cafeName) {
      return res.status(400).json({ error: 'Cafe ID, password, and name required' });
    }

    const result = await Cafe.create(cafeId, password, cafeName, req.user.id);

    res.status(201).json({
      message: 'Cafe created successfully',
      cafeId: result.id
    });
  } catch (err) {
    console.error('Create cafe error:', err);
    if (err.code === '23505') { // PostgreSQL unique violation
      return res.status(409).json({ error: 'Cafe ID already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update cafe (admin only)
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { cafeName } = req.body;
    const cafeId = req.params.id;

    if (!cafeName) {
      return res.status(400).json({ error: 'Cafe name required' });
    }

    await Cafe.update(cafeId, cafeName);
    res.json({ message: 'Cafe updated successfully' });
  } catch (err) {
    console.error('Update cafe error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update cafe password (admin only)
router.put('/:id/password', authenticateAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const cafeId = req.params.id;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password required' });
    }

    await Cafe.updatePassword(cafeId, newPassword);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete cafe (admin only)
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const cafeId = req.params.id;
    await Cafe.delete(cafeId);
    res.json({ message: 'Cafe deleted successfully' });
  } catch (err) {
    console.error('Delete cafe error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current cafe info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'cafe') {
      return res.status(403).json({ error: 'Cafe access required' });
    }

    const cafe = await Cafe.findById(req.user.id);

    if (!cafe) {
      return res.status(404).json({ error: 'Cafe not found' });
    }

    // Don't send password hash
    delete cafe.password_hash;
    res.json(cafe);
  } catch (err) {
    console.error('Get cafe info error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
