// server/routes/stats.js
// 全局统计路由

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

/**
 * GET /stats
 * 获取用户全局统计
 */
router.get('/', (req, res) => {
  try {
    const db = getDB();
    const userId = req.userId;

    const linkCount = db.prepare('SELECT COUNT(*) as count FROM links WHERE user_id = ?')
      .get(userId).count;

    const noteCount = db.prepare('SELECT COUNT(*) as count FROM notes WHERE user_id = ?')
      .get(userId).count;

    // 统计有多少个不重复分类
    const categoryCount = db.prepare(
      "SELECT COUNT(DISTINCT category) as count FROM links WHERE user_id = ? AND category != ''"
    ).get(userId).count;

    res.json({ linkCount, noteCount, categoryCount });
  } catch (err) {
    console.error('获取统计失败：', err);
    res.status(500).json({ message: '获取失败' });
  }
});

module.exports = router;
