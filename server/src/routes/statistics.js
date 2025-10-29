const express = require('express');
const router = express.Router();
const Statistics = require('../models/Statistics');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');

// 거래 기록 추가 (카페 전용)
router.post('/transaction', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'cafe') {
      return res.status(403).json({ error: 'Cafe access required' });
    }

    const { transactionType, phoneNumber, quantity } = req.body;

    if (!transactionType || !['borrow', 'return'].includes(transactionType)) {
      return res.status(400).json({ error: 'Valid transaction type required (borrow or return)' });
    }

    const result = await Statistics.addTransaction(
      req.user.id,
      transactionType,
      phoneNumber || null,
      quantity || 1
    );

    res.status(201).json({
      message: 'Transaction recorded',
      transactionId: result.id
    });
  } catch (err) {
    console.error('Transaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 현재 카페의 통계 조회 (카페 전용)
router.get('/my-stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'cafe') {
      return res.status(403).json({ error: 'Cafe access required' });
    }

    const stats = await Statistics.getCafeStats(req.user.id);
    res.json(stats);
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 현재 카페의 거래 내역 조회 (카페 전용)
router.get('/my-history', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'cafe') {
      return res.status(403).json({ error: 'Cafe access required' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const transactions = await Statistics.getTransactionHistory(req.user.id, limit, offset);
    res.json(transactions);
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 특정 카페의 통계 조회 (관리자 전용)
router.get('/cafe/:cafeId', authenticateAdmin, async (req, res) => {
  try {
    const cafeId = req.params.cafeId;
    const stats = await Statistics.getCafeStats(cafeId);
    res.json(stats);
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 특정 카페의 거래 내역 조회 (관리자 전용)
router.get('/cafe/:cafeId/history', authenticateAdmin, async (req, res) => {
  try {
    const cafeId = req.params.cafeId;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const transactions = await Statistics.getTransactionHistory(cafeId, limit, offset);
    res.json(transactions);
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 모든 카페의 통계 요약 조회 (관리자 전용)
router.get('/all-cafes', authenticateAdmin, async (req, res) => {
  try {
    const stats = await Statistics.getAllCafesStats();
    res.json(stats);
  } catch (err) {
    console.error('All cafes stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
