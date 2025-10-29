const express = require('express');
const router = express.Router();
const UserBehavior = require('../models/UserBehavior');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');

// 행동 기록 추가 (카페 전용)
router.post('/track', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'cafe') {
      return res.status(403).json({ error: 'Cafe access required' });
    }

    const { actionType, actionDetail } = req.body;

    if (!actionType || !['tab_switch', 'modal_open', 'verification_attempt'].includes(actionType)) {
      return res.status(400).json({ error: 'Valid action type required' });
    }

    const result = await UserBehavior.trackAction(
      req.user.id,
      actionType,
      actionDetail || null
    );

    res.status(201).json({
      message: 'Behavior tracked',
      behaviorId: result.id
    });
  } catch (err) {
    console.error('Behavior tracking error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 현재 카페의 탭 전환 통계 조회 (카페 전용)
router.get('/my-tab-stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'cafe') {
      return res.status(403).json({ error: 'Cafe access required' });
    }

    const stats = await UserBehavior.getTabSwitchStats(req.user.id);
    res.json(stats);
  } catch (err) {
    console.error('Tab stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 모든 카페의 행동 통계 요약 조회 (관리자 전용)
router.get('/all-cafes', authenticateAdmin, async (req, res) => {
  try {
    const stats = await UserBehavior.getAllCafesBehaviorStats();
    res.json(stats);
  } catch (err) {
    console.error('All cafes behavior stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 특정 카페의 행동 통계 조회 (관리자 전용)
router.get('/cafe/:cafeId/tab-stats', authenticateAdmin, async (req, res) => {
  try {
    const cafeId = req.params.cafeId;
    const stats = await UserBehavior.getTabSwitchStats(cafeId);
    res.json(stats);
  } catch (err) {
    console.error('Cafe tab stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 특정 카페의 최근 행동 내역 조회 (관리자 전용)
router.get('/cafe/:cafeId/recent', authenticateAdmin, async (req, res) => {
  try {
    const cafeId = req.params.cafeId;
    const limit = parseInt(req.query.limit) || 100;

    const behaviors = await UserBehavior.getRecentBehaviors(cafeId, limit);
    res.json(behaviors);
  } catch (err) {
    console.error('Recent behaviors error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
