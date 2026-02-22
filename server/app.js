// server/app.js
// 记忆万物后端服务入口

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDB } = require('./db');
const authRoutes = require('./routes/auth');
const linkRoutes = require('./routes/links');
const noteRoutes = require('./routes/notes');
const categoryRoutes = require('./routes/categories');
const statsRoutes = require('./routes/stats');
const aiRoutes = require('./routes/ai');
const uploadRoutes = require('./routes/upload');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件（上传的图片）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 路由
app.use('/auth', authRoutes);

// 以下路由需要登录
app.use('/links', authMiddleware, linkRoutes);
app.use('/notes', authMiddleware, noteRoutes);
app.use('/categories', authMiddleware, categoryRoutes);
app.use('/tags', authMiddleware, categoryRoutes);  // 复用 categories 路由
app.use('/stats', authMiddleware, statsRoutes);
app.use('/ai', authMiddleware, aiRoutes);
app.use('/upload', authMiddleware, uploadRoutes);

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误：', err);
  res.status(500).json({ message: '服务器内部错误', error: err.message });
});

// 初始化数据库并启动
initDB();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 记忆万物服务器已启动: http://0.0.0.0:${PORT}`);
});
