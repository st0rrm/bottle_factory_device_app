const express = require('express');
const router = express.Router();
const Statistics = require('../models/Statistics');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');

// 거래 기록 추가 (카페 전용)
router.post('/transaction', authenticateToken, (req, res) => {
  if (req.user.role !== 'cafe') {
    return res.status(403).json({ error: 'Cafe access required' });
  }

  const { transactionType, phoneNumber, quantity } = req.body;

  if (!transactionType || !['borrow', 'return'].includes(transactionType)) {
    return res.status(400).json({ error: 'Valid transaction type required (borrow or return)' });
  }

  Statistics.addTransaction(
    req.user.id,
    transactionType,
    phoneNumber || null,
    quantity || 1,
    function(err) {
      if (err) {
        console.error('Transaction error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({
        message: 'Transaction recorded',
        transactionId: this.lastID
      });
    }
  );
});

// 현재 카페의 통계 조회 (카페 전용)
router.get('/my-stats', authenticateToken, (req, res) => {
  if (req.user.role !== 'cafe') {
    return res.status(403).json({ error: 'Cafe access required' });
  }

  Statistics.getCafeStats(req.user.id, (err, stats) => {
    if (err) {
      console.error('Stats error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(stats);
  });
});

// 현재 카페의 거래 내역 조회 (카페 전용)
router.get('/my-history', authenticateToken, (req, res) => {
  if (req.user.role !== 'cafe') {
    return res.status(403).json({ error: 'Cafe access required' });
  }

  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  Statistics.getTransactionHistory(req.user.id, limit, offset, (err, transactions) => {
    if (err) {
      console.error('History error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(transactions);
  });
});

// 특정 카페의 통계 조회 (관리자 전용)
router.get('/cafe/:cafeId', authenticateAdmin, (req, res) => {
  const cafeId = req.params.cafeId;

  Statistics.getCafeStats(cafeId, (err, stats) => {
    if (err) {
      console.error('Stats error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(stats);
  });
});

// 특정 카페의 거래 내역 조회 (관리자 전용)
router.get('/cafe/:cafeId/history', authenticateAdmin, (req, res) => {
  const cafeId = req.params.cafeId;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  Statistics.getTransactionHistory(cafeId, limit, offset, (err, transactions) => {
    if (err) {
      console.error('History error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(transactions);
  });
});

// 모든 카페의 통계 요약 조회 (관리자 전용)
router.get('/all-cafes', authenticateAdmin, (req, res) => {
  Statistics.getAllCafesStats((err, stats) => {
    if (err) {
      console.error('All cafes stats error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(stats);
  });
});

module.exports = router;
