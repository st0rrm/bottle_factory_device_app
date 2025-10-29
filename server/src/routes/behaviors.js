const express = require('express');
const router = express.Router();
const UserBehavior = require('../models/UserBehavior');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');

// 행동 기록 추가 (카페 전용)
router.post('/track', authenticateToken, (req, res) => {
  if (req.user.role !== 'cafe') {
    return res.status(403).json({ error: 'Cafe access required' });
  }

  const { actionType, actionDetail } = req.body;

  if (!actionType || !['tab_switch', 'modal_open', 'verification_attempt'].includes(actionType)) {
    return res.status(400).json({ error: 'Valid action type required' });
  }

  UserBehavior.trackAction(
    req.user.id,
    actionType,
    actionDetail || null,
    function(err) {
      if (err) {
        console.error('Behavior tracking error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({
        message: 'Behavior tracked',
        behaviorId: this.lastID
      });
    }
  );
});

// 현재 카페의 탭 전환 통계 조회 (카페 전용)
router.get('/my-tab-stats', authenticateToken, (req, res) => {
  if (req.user.role !== 'cafe') {
    return res.status(403).json({ error: 'Cafe access required' });
  }

  UserBehavior.getTabSwitchStats(req.user.id, (err, stats) => {
    if (err) {
      console.error('Tab stats error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(stats);
  });
});

// 모든 카페의 행동 통계 요약 조회 (관리자 전용)
router.get('/all-cafes', authenticateAdmin, (req, res) => {
  UserBehavior.getAllCafesBehaviorStats((err, stats) => {
    if (err) {
      console.error('All cafes behavior stats error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(stats);
  });
});

// 특정 카페의 행동 통계 조회 (관리자 전용)
router.get('/cafe/:cafeId/tab-stats', authenticateAdmin, (req, res) => {
  const cafeId = req.params.cafeId;

  UserBehavior.getTabSwitchStats(cafeId, (err, stats) => {
    if (err) {
      console.error('Cafe tab stats error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(stats);
  });
});

// 특정 카페의 최근 행동 내역 조회 (관리자 전용)
router.get('/cafe/:cafeId/recent', authenticateAdmin, (req, res) => {
  const cafeId = req.params.cafeId;
  const limit = parseInt(req.query.limit) || 100;

  UserBehavior.getRecentBehaviors(cafeId, limit, (err, behaviors) => {
    if (err) {
      console.error('Recent behaviors error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(behaviors);
  });
});

module.exports = router;
