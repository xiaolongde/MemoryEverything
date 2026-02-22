// server/routes/auth.js
// 登录认证路由

const express = require('express');
const axios = require('axios');
const { getDB } = require('../db');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /auth/login
 * 小程序登录：用 code 换取 openid，返回 token
 */
router.post('/login', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: '缺少 code 参数' });
    }

    const appid = process.env.WX_APPID;
    const secret = process.env.WX_SECRET;

    if (!appid || !secret || secret === '你的小程序密钥') {
      // 开发模式：不调用微信接口，直接用 code 作为标识
      console.warn('⚠️  未配置 WX_SECRET，使用开发模式登录');
      const devOpenid = `dev_${code}`;
      const db = getDB();

      let user = db.prepare('SELECT * FROM users WHERE openid = ?').get(devOpenid);
      if (!user) {
        const result = db.prepare('INSERT INTO users (openid) VALUES (?)').run(devOpenid);
        user = { id: result.lastInsertRowid, openid: devOpenid };
      }

      const token = generateToken({ userId: user.id, openid: devOpenid });
      return res.json({ openid: devOpenid, token });
    }

    // 正式模式：调用微信接口
    const wxRes = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid,
        secret,
        js_code: code,
        grant_type: 'authorization_code'
      }
    });

    if (wxRes.data.errcode) {
      return res.status(400).json({
        message: `微信登录失败: ${wxRes.data.errmsg}`,
        errcode: wxRes.data.errcode
      });
    }

    const { openid, session_key } = wxRes.data;

    // 创建或获取用户
    const db = getDB();
    let user = db.prepare('SELECT * FROM users WHERE openid = ?').get(openid);

    if (!user) {
      const result = db.prepare('INSERT INTO users (openid) VALUES (?)').run(openid);
      user = { id: result.lastInsertRowid, openid };
    }

    const token = generateToken({ userId: user.id, openid });

    res.json({ openid, token });
  } catch (err) {
    console.error('登录失败：', err);
    res.status(500).json({ message: '登录失败' });
  }
});

module.exports = router;
