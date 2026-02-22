// server/routes/links.js
// 链接 CRUD 路由

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

/**
 * GET /links
 * 获取链接列表，支持 category、tag、page、pageSize 参数
 */
router.get('/', (req, res) => {
  try {
    const db = getDB();
    const userId = req.userId;
    const { category, tag, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    let sql = 'SELECT * FROM links WHERE user_id = ?';
    const params = [userId];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (tag) {
      sql += ' AND tags LIKE ?';
      params.push(`%"${tag}"%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = db.prepare(sql).all(...params);

    // 解析 JSON 字段
    const data = rows.map(formatLink);

    res.json({ data });
  } catch (err) {
    console.error('获取链接列表失败：', err);
    res.status(500).json({ message: '获取失败' });
  }
});

/**
 * GET /links/search
 * 搜索链接
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
    const sql = `SELECT * FROM links WHERE user_id = ? 
      AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)
      ORDER BY created_at DESC LIMIT 50`;

    const rows = db.prepare(sql).all(userId, like, like, like);
    res.json({ data: rows.map(formatLink) });
  } catch (err) {
    console.error('搜索链接失败：', err);
    res.status(500).json({ message: '搜索失败' });
  }
});

/**
 * GET /links/stats
 * 链接统计
 */
router.get('/stats', (req, res) => {
  try {
    const db = getDB();
    const userId = req.userId;

    const total = db.prepare('SELECT COUNT(*) as count FROM links WHERE user_id = ?')
      .get(userId).count;
    const pending = db.prepare("SELECT COUNT(*) as count FROM links WHERE user_id = ? AND (category = '' OR category IS NULL)")
      .get(userId).count;

    res.json({ total, pending });
  } catch (err) {
    console.error('获取统计失败：', err);
    res.status(500).json({ message: '获取失败' });
  }
});

/**
 * POST /links/parse
 * 解析链接（抓取标题和描述）
 */
router.post('/parse', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: '缺少 url' });
    }

    const axios = require('axios');
    const cheerio = require('cheerio');

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      maxRedirects: 5
    });

    const $ = cheerio.load(response.data);
    const title = $('title').text().trim() ||
      $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') || '';
    const thumbnail = $('meta[property="og:image"]').attr('content') || '';

    // 判断来源
    let source = 'external';
    if (url.includes('mp.weixin.qq.com')) {
      source = 'wechat_article';
    } else if (url.includes('weixin.qq.com') && url.includes('video')) {
      source = 'wechat_video';
    }

    res.json({
      success: true,
      data: { title, description, thumbnail, source }
    });
  } catch (err) {
    console.error('解析链接失败：', err.message);
    res.json({ success: false, message: '解析失败' });
  }
});

/**
 * GET /links/:id
 * 获取链接详情
 */
router.get('/:id', (req, res) => {
  try {
    const db = getDB();
    const row = db.prepare('SELECT * FROM links WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId);

    if (!row) {
      return res.status(404).json({ message: '链接不存在' });
    }

    res.json({ data: formatLink(row) });
  } catch (err) {
    console.error('获取链接详情失败：', err);
    res.status(500).json({ message: '获取失败' });
  }
});

/**
 * POST /links
 * 添加链接
 */
router.post('/', (req, res) => {
  try {
    const db = getDB();
    const userId = req.userId;
    const { url, title, description, thumbnail, source, category, tags, summary, useAI } = req.body;

    if (!url) {
      return res.status(400).json({ message: '缺少 url' });
    }

    const result = db.prepare(`
      INSERT INTO links (user_id, url, title, description, thumbnail, source, category, tags, summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      url,
      title || '',
      description || '',
      thumbnail || '',
      source || 'external',
      category || '',
      JSON.stringify(tags || []),
      summary || ''
    );

    res.json({
      _id: result.lastInsertRowid,
      message: '添加成功'
    });
  } catch (err) {
    console.error('添加链接失败：', err);
    res.status(500).json({ message: '添加失败' });
  }
});

/**
 * PUT /links/:id
 * 更新链接
 */
router.put('/:id', (req, res) => {
  try {
    const db = getDB();
    const linkId = req.params.id;
    const userId = req.userId;

    // 验证所有权
    const existing = db.prepare('SELECT id FROM links WHERE id = ? AND user_id = ?')
      .get(linkId, userId);
    if (!existing) {
      return res.status(404).json({ message: '链接不存在' });
    }

    const data = req.body;
    const updates = [];
    const params = [];

    // 动态构建 UPDATE 语句
    const allowedFields = ['title', 'description', 'category', 'summary', 'is_read', 'is_favorite', 'thumbnail', 'source'];
    for (const field of allowedFields) {
      // 前端字段名映射：isRead -> is_read, isFavorite -> is_favorite
      const frontKey = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (data[frontKey] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(field.startsWith('is_') ? (data[frontKey] ? 1 : 0) : data[frontKey]);
      } else if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(field.startsWith('is_') ? (data[field] ? 1 : 0) : data[field]);
      }
    }

    // tags 特殊处理（数组 → JSON 字符串）
    if (data.tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(data.tags));
    }

    // comment 特殊处理（对象 → JSON 字符串）
    if (data.comment !== undefined) {
      updates.push('comment = ?');
      params.push(JSON.stringify(data.comment));
    }

    // ai_insight 特殊处理
    if (data.aiInsight !== undefined) {
      updates.push('ai_insight = ?');
      params.push(JSON.stringify(data.aiInsight));
    }

    if (updates.length === 0) {
      return res.json({ message: '无需更新' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(linkId, userId);

    db.prepare(`UPDATE links SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`)
      .run(...params);

    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('更新链接失败：', err);
    res.status(500).json({ message: '更新失败' });
  }
});

/**
 * DELETE /links/:id
 * 删除链接
 */
router.delete('/:id', (req, res) => {
  try {
    const db = getDB();
    db.prepare('DELETE FROM links WHERE id = ? AND user_id = ?')
      .run(req.params.id, req.userId);

    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('删除链接失败：', err);
    res.status(500).json({ message: '删除失败' });
  }
});

/**
 * 格式化链接数据，解析 JSON 字段，统一 _id 字段名
 */
function formatLink(row) {
  return {
    _id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    thumbnail: row.thumbnail,
    source: row.source,
    category: row.category,
    tags: safeParseJSON(row.tags, []),
    summary: row.summary,
    isRead: !!row.is_read,
    isFavorite: !!row.is_favorite,
    comment: safeParseJSON(row.comment, null),
    aiInsight: safeParseJSON(row.ai_insight, null),
    createTime: row.created_at,
    updateTime: row.updated_at
  };
}

function safeParseJSON(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

module.exports = router;
