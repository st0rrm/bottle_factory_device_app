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

    const { transactionType, phoneNumber, quantity, score } = req.body;

    if (!transactionType || !['borrow', 'return', 'do'].includes(transactionType)) {
      return res.status(400).json({ error: 'Valid transaction type required (borrow, return, or do)' });
    }

    // Calculate score if not provided
    let calculatedScore = score || 0;
    if (!score && transactionType === 'borrow') {
      calculatedScore = (quantity || 1) * 10;
    }

    const result = await Statistics.addTransaction(
      req.user.id,
      transactionType,
      phoneNumber || null,
      quantity || 1,
      calculatedScore
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

// 모든 통계 초기화 (관리자 전용)
router.delete('/reset', authenticateAdmin, async (req, res) => {
  try {
    const result = await Statistics.resetAllStats();
    res.json({
      message: 'All statistics have been reset',
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('Reset stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 특정 카페의 통계 초기화 (관리자 전용)
router.delete('/cafe/:cafeId/reset', authenticateAdmin, async (req, res) => {
  try {
    const cafeId = req.params.cafeId;
    const result = await Statistics.resetCafeStats(cafeId);
    res.json({
      message: 'Cafe statistics have been reset',
      deletedCount: result.deletedCount,
      deletedBehaviors: result.deletedBehaviors,
      deletedTransactions: result.deletedTransactions,
      deletedVoiceStats: result.deletedVoiceStats
    });
  } catch (err) {
    console.error('Reset cafe stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 특정 카페의 거래 상세 내역 조회 (관리자 전용)
router.get('/cafe/:cafeId/transactions', authenticateAdmin, async (req, res) => {
  try {
    const cafeId = parseInt(req.params.cafeId);
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const transactionType = req.query.type || null;

    if (isNaN(cafeId)) {
      return res.status(400).json({ error: 'Invalid cafe ID' });
    }

    const result = await Statistics.getTransactionDetails(
      cafeId,
      limit,
      offset,
      transactionType
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err) {
    console.error('Get transaction details error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
