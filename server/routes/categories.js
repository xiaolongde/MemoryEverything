// server/routes/categories.js
// 分类和标签路由

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

// 预设分类
const PRESET_CATEGORIES = [
  { name: '技术', icon: '💻', color: '#1890ff' },
  { name: '生活', icon: '🏠', color: '#52c41a' },
  { name: '娱乐', icon: '🎮', color: '#eb2f96' },
  { name: '工作', icon: '💼', color: '#722ed1' },
  { name: '学习', icon: '📚', color: '#fa8c16' },
  { name: '阅读', icon: '📖', color: '#13c2c2' },
  { name: '视频', icon: '🎬', color: '#f5222d' },
  { name: '其他', icon: '📁', color: '#8c8c8c' }
];

/**
 * GET /categories
 * 获取分类列表（带统计）
 */
router.get('/', (req, res) => {
  try {
    // 根据请求路径判断是 categories 还是 tags
    if (req.baseUrl === '/tags') {
      return getTags(req, res);
    }

    const db = getDB();
    const userId = req.userId;

    // 统计每个分类的链接数
    const rows = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM links WHERE user_id = ? AND category != ''
      GROUP BY category ORDER BY count DESC
    `).all(userId);

    const categoryCount = {};
    rows.forEach(r => { categoryCount[r.category] = r.count; });

    // 合并预设分类
    const categories = PRESET_CATEGORIES
      .map(cat => ({
        ...cat,
        count: categoryCount[cat.name] || 0
      }))
      .filter(cat => cat.count > 0);

    // 添加用户自定义分类
    rows.forEach(r => {
      if (!PRESET_CATEGORIES.find(p => p.name === r.category)) {
        categories.push({
          name: r.category,
          icon: '📁',
          color: '#8c8c8c',
          count: r.count
        });
      }
    });

    categories.sort((a, b) => b.count - a.count);

    res.json({ data: categories });
  } catch (err) {
    console.error('获取分类失败：', err);
    res.status(500).json({ message: '获取失败' });
  }
});

/**
 * 获取标签列表
 */
function getTags(req, res) {
  try {
    const db = getDB();
    const userId = req.userId;

    const rows = db.prepare('SELECT tags FROM links WHERE user_id = ?').all(userId);

    const tagCount = {};
    rows.forEach(r => {
      try {
        const tags = JSON.parse(r.tags || '[]');
        tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
      } catch {}
    });

    const tags = Object.keys(tagCount)
      .map(name => ({ name, count: tagCount[name] }))
      .sort((a, b) => b.count - a.count);

    res.json({ data: tags });
  } catch (err) {
    console.error('获取标签失败：', err);
    res.status(500).json({ message: '获取失败' });
  }
}

module.exports = router;
