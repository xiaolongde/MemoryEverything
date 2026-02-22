// server/routes/notes.js
// 感悟 CRUD 路由

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

/**
 * GET /notes
 * 获取感悟列表
 */
router.get('/', (req, res) => {
  try {
    const db = getDB();
    const userId = req.userId;
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const rows = db.prepare(
      'SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(userId, limit, offset);

    res.json({ data: rows.map(formatNote) });
  } catch (err) {
    console.error('获取感悟列表失败：', err);
    res.status(500).json({ message: '获取失败' });
  }
});

/**
 * GET /notes/search
 * 搜索感悟
 */
router.get('/search', (req, res) => {
  try {
    const db = getDB();
    const userId = req.userId;
    const { keyword } = req.query;

    if (!keyword) {
      return res.json({ data: [] });
    }

    const like = `%${keyword}%`;
    const sql = `SELECT * FROM notes WHERE user_id = ? 
      AND (content LIKE ? OR tags LIKE ?)
      ORDER BY created_at DESC LIMIT 50`;

    const rows = db.prepare(sql).all(userId, like, like);
    res.json({ data: rows.map(formatNote) });
  } catch (err) {
    console.error('搜索感悟失败：', err);
    res.status(500).json({ message: '搜索失败' });
  }
});

/**
 * GET /notes/:id
 * 获取感悟详情
 */
router.get('/:id', (req, res) => {
  try {
    const db = getDB();
    const row = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId);

    if (!row) {
      return res.status(404).json({ message: '感悟不存在' });
    }

    res.json({ data: formatNote(row) });
  } catch (err) {
    console.error('获取感悟详情失败：', err);
    res.status(500).json({ message: '获取失败' });
  }
});

/**
 * POST /notes
 * 添加感悟
 */
router.post('/', (req, res) => {
  try {
    const db = getDB();
    const userId = req.userId;
    const { content, images, tags, mood } = req.body;

    if (!content) {
      return res.status(400).json({ message: '内容不能为空' });
    }

    const result = db.prepare(`
      INSERT INTO notes (user_id, content, images, tags, mood)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      userId,
      content,
      JSON.stringify(images || []),
      JSON.stringify(tags || []),
      mood || ''
    );

    res.json({
      _id: result.lastInsertRowid,
      message: '添加成功'
    });
  } catch (err) {
    console.error('添加感悟失败：', err);
    res.status(500).json({ message: '添加失败' });
  }
});

/**
 * PUT /notes/:id
 * 更新感悟
 */
router.put('/:id', (req, res) => {
  try {
    const db = getDB();
    const noteId = req.params.id;
    const userId = req.userId;
    const { content, images, tags, mood } = req.body;

    const existing = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?')
      .get(noteId, userId);
    if (!existing) {
      return res.status(404).json({ message: '感悟不存在' });
    }

    db.prepare(`
      UPDATE notes SET content = ?, images = ?, tags = ?, mood = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      content || '',
      JSON.stringify(images || []),
      JSON.stringify(tags || []),
      mood || '',
      noteId,
      userId
    );

    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('更新感悟失败：', err);
    res.status(500).json({ message: '更新失败' });
  }
});

/**
 * DELETE /notes/:id
 * 删除感悟
 */
router.delete('/:id', (req, res) => {
  try {
    const db = getDB();
    db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?')
      .run(req.params.id, req.userId);

    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('删除感悟失败：', err);
    res.status(500).json({ message: '删除失败' });
  }
});

/**
 * 格式化感悟数据
 */
function formatNote(row) {
  let images = [];
  let tags = [];
  try { images = JSON.parse(row.images || '[]'); } catch {}
  try { tags = JSON.parse(row.tags || '[]'); } catch {}

  return {
    _id: row.id,
    content: row.content,
    images,
    tags,
    mood: row.mood,
    createTime: row.created_at,
    updateTime: row.updated_at
  };
}

module.exports = router;
