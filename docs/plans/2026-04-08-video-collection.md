# 短视频收藏 + AI 分类 + 要点提取 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 MemoryEverything 小程序中支持微信视频号短视频的收藏、自动分类和 AI 要点提取。

**Architecture:** 复用现有 links 数据表，扩展 3 个视频专属字段（video_author, video_duration, key_points）。后端扩展 parseLink 解析逻辑和新增 extract-points AI 路由。前端新增视频列表页和视频详情页，采用深色 Material Dark 风格（背景 #121212，强调色 #BB86FC）。

**Tech Stack:** 微信小程序原生、Express + better-sqlite3、通义千问 AI API（gpt-3.5-turbo 兼容格式）

---

## File Map

### 后端（修改）
- `server/db.js` — 扩展 links 表，新增 video_author, video_duration, key_points 列
- `server/routes/links.js` — parseLink 增强视频号解析，formatLink 增加新字段，POST /links 支持新字段
- `server/routes/ai.js` — 新增 POST /ai/extract-points 路由

### 小程序（修改）
- `miniprogram/app.js` — 剪贴板检测增加视频号域名识别
- `miniprogram/app.json` — 注册新页面
- `miniprogram/app.wxss` — 新增深色主题 CSS 变量
- `miniprogram/utils/localDb.js` — addLink/formatLink 支持新字段，新增 getVideoLinks 方法
- `miniprogram/services/link.js` — 新增 getVideoLinks、extractKeyPoints 方法
- `miniprogram/pages/add-link/add-link.js` — 视频号链接保存时 source 设为 wechat_video

### 小程序（新建）
- `miniprogram/pages/video-list/video-list.js` — 视频列表页逻辑
- `miniprogram/pages/video-list/video-list.json` — 页面配置
- `miniprogram/pages/video-list/video-list.wxml` — 视频列表页模板
- `miniprogram/pages/video-list/video-list.wxss` — 视频列表页深色样式
- `miniprogram/pages/video-detail/video-detail.js` — 视频详情页逻辑
- `miniprogram/pages/video-detail/video-detail.json` — 页面配置
- `miniprogram/pages/video-detail/video-detail.wxml` — 视频详情页模板
- `miniprogram/pages/video-detail/video-detail.wxss` — 视频详情页深色样式

---

### Task 1: 数据层扩展 — 后端 DB + links 路由

**Files:**
- Modify: `server/db.js`
- Modify: `server/routes/links.js`

- [ ] **Step 1: 在 db.js 的 links 建表语句中添加 3 个新字段**

在 `server/db.js` 的 `initDB()` 函数中，在 `CREATE TABLE IF NOT EXISTS links` 之后添加 ALTER TABLE 来兼容已有数据库：

```javascript
// 在 initDB() 函数的 db.exec(`...`) 之后、console.log 之前添加：

  // 兼容旧数据库：添加视频相关字段
  const columns = db.prepare("PRAGMA table_info(links)").all().map(c => c.name);
  if (!columns.includes('video_author')) {
    db.exec("ALTER TABLE links ADD COLUMN video_author TEXT DEFAULT ''");
  }
  if (!columns.includes('video_duration')) {
    db.exec("ALTER TABLE links ADD COLUMN video_duration INTEGER DEFAULT 0");
  }
  if (!columns.includes('key_points')) {
    db.exec("ALTER TABLE links ADD COLUMN key_points TEXT DEFAULT ''");
  }
```

- [ ] **Step 2: 在 links.js 的 formatLink 函数中添加新字段**

在 `server/routes/links.js` 的 `formatLink` 函数中，在 `aiInsight` 行之后添加：

```javascript
    videoAuthor: row.video_author || '',
    videoDuration: row.video_duration || 0,
    keyPoints: safeParseJSON(row.key_points, null),
```

- [ ] **Step 3: 在 POST /links 路由中支持新字段**

修改 `server/routes/links.js` 中 `router.post('/')` 路由，在解构 req.body 时添加新字段：

```javascript
    const { url, title, description, thumbnail, source, category, tags, summary, useAI, videoAuthor, videoDuration } = req.body;
```

修改 INSERT 语句：

```javascript
    const result = db.prepare(`
      INSERT INTO links (user_id, url, title, description, thumbnail, source, category, tags, summary, video_author, video_duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      url,
      title || '',
      description || '',
      thumbnail || '',
      source || 'external',
      category || '',
      JSON.stringify(tags || []),
      summary || '',
      videoAuthor || '',
      videoDuration || 0
    );
```

- [ ] **Step 4: 在 PUT /links/:id 路由的 allowedFields 中添加新字段**

在 `server/routes/links.js` 的 PUT 路由中，修改 allowedFields 数组：

```javascript
    const allowedFields = ['title', 'description', 'category', 'summary', 'is_read', 'is_favorite', 'thumbnail', 'source', 'video_author', 'video_duration'];
```

在 comment 特殊处理之后，添加 key_points 处理：

```javascript
    // key_points 特殊处理（对象 → JSON 字符串）
    if (data.keyPoints !== undefined) {
      updates.push('key_points = ?');
      params.push(JSON.stringify(data.keyPoints));
    }
```

- [ ] **Step 5: 增强 parseLink 中的视频号识别**

修改 `server/routes/links.js` 中 `router.post('/parse')` 路由，替换来源判断部分：

```javascript
    // 判断来源
    let source = 'external';
    let videoAuthor = '';
    let videoDuration = 0;

    if (url.includes('mp.weixin.qq.com')) {
      source = 'wechat_article';
    } else if (
      url.includes('channels.weixin.qq.com') ||
      url.includes('finder.video.qq.com') ||
      (url.includes('weixin.qq.com') && url.includes('video'))
    ) {
      source = 'wechat_video';
      // 尝试从页面提取视频号作者
      videoAuthor = $('meta[property="og:article:author"]').attr('content') ||
        $('meta[name="author"]').attr('content') ||
        $('.author-name').text().trim() ||
        $('.nickname').text().trim() || '';
    }

    res.json({
      success: true,
      data: { title, description, thumbnail, source, videoAuthor, videoDuration }
    });
```

- [ ] **Step 6: 验证后端改动**

```bash
cd D:/projects/MemoryEverything/server && node -e "require('./db'); console.log('db.js OK')"
node -e "require('./routes/links'); console.log('links.js OK')"
```

Expected: 两行都打印 OK，无语法错误。

- [ ] **Step 7: Commit**

```bash
git add server/db.js server/routes/links.js
git commit -m "feat: 扩展 links 表支持视频字段（video_author, video_duration, key_points）"
```

---

### Task 2: AI 要点提取路由

**Files:**
- Modify: `server/routes/ai.js`

- [ ] **Step 1: 在 ai.js 中新增 POST /ai/extract-points 路由**

在 `server/routes/ai.js` 中，在 `router.post('/assist-comment', ...)` 路由之后、`module.exports` 之前添加：

```javascript
/**
 * POST /ai/extract-points
 * 提取视频要点（一句话摘要 + 详细要点列表）
 */
router.post('/extract-points', async (req, res) => {
  try {
    const { linkId } = req.body;
    if (!linkId) {
      return res.status(400).json({ success: false, message: '缺少 linkId' });
    }

    const db = getDB();
    const link = db.prepare('SELECT * FROM links WHERE id = ? AND user_id = ?')
      .get(linkId, req.userId);

    if (!link) {
      return res.status(404).json({ success: false, message: '链接不存在' });
    }

    const aiApiUrl = process.env.AI_API_URL;
    const aiApiKey = process.env.AI_API_KEY;

    let keyPointsData;

    if (aiApiUrl && aiApiKey) {
      try {
        const axios = require('axios');
        const isVideo = link.source === 'wechat_video';
        const contentType = isVideo ? '视频号短视频' : '链接内容';

        const aiRes = await axios.post(aiApiUrl, {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `你是一个内容分析助手。请从${contentType}信息中提取要点。返回严格的 JSON 格式，不要包含其他内容。`
            },
            {
              role: 'user',
              content: `请分析以下${contentType}：
标题：${link.title}
描述：${link.description}
分类：${link.category || '未分类'}
${link.video_author ? '作者：' + link.video_author : ''}

请返回以下 JSON 格式：
{
  "summary": "一句话摘要（不超过50字）",
  "points": ["要点1", "要点2", "要点3"]
}

要求：
- summary 是一句话概括核心内容
- points 是 3-5 个具体的知识点或关键步骤
- 如果是教程类内容，提取具体步骤
- 如果是知识类内容，提取核心观点`
            }
          ]
        }, {
          headers: {
            'Authorization': `Bearer ${aiApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });

        const content = aiRes.data.choices?.[0]?.message?.content || '';
        try {
          const match = content.match(/\{[\s\S]*\}/);
          keyPointsData = match ? JSON.parse(match[0]) : generateFallbackKeyPoints(link.title, link.description);
        } catch {
          keyPointsData = generateFallbackKeyPoints(link.title, link.description);
        }
      } catch (aiErr) {
        console.error('AI 要点提取失败，使用降级方案：', aiErr.message);
        keyPointsData = generateFallbackKeyPoints(link.title, link.description);
      }
    } else {
      keyPointsData = generateFallbackKeyPoints(link.title, link.description);
    }

    // 添加提取时间
    keyPointsData.extracted_at = new Date().toISOString();

    // 保存到数据库
    db.prepare('UPDATE links SET key_points = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
      .run(JSON.stringify(keyPointsData), linkId, req.userId);

    res.json({
      success: true,
      data: keyPointsData,
      fallback: !aiApiUrl || !aiApiKey
    });
  } catch (err) {
    console.error('提取要点失败：', err);
    res.status(500).json({ success: false, message: '提取失败' });
  }
});
```

- [ ] **Step 2: 添加降级方案函数**

在 `server/routes/ai.js` 中，在 `generateFallbackSuggestions` 函数之后添加：

```javascript
/**
 * 降级方案：生成简单要点
 */
function generateFallbackKeyPoints(title, description) {
  const desc = description || '';
  return {
    summary: desc ? desc.substring(0, 50) : `关于「${title || '未知内容'}」的短视频`,
    points: desc
      ? desc.split(/[。！？\n]/).filter(s => s.trim().length > 5).slice(0, 3).map(s => s.trim())
      : [`这个视频讨论了「${title || '未知主题'}」相关内容`]
  };
}
```

- [ ] **Step 3: 验证语法**

```bash
cd D:/projects/MemoryEverything/server && node -e "require('./routes/ai'); console.log('ai.js OK')"
```

Expected: 打印 `ai.js OK`

- [ ] **Step 4: Commit**

```bash
git add server/routes/ai.js
git commit -m "feat: 新增 AI 要点提取路由 POST /ai/extract-points"
```

---

### Task 3: 小程序数据层 — localDb + services 扩展

**Files:**
- Modify: `miniprogram/utils/localDb.js`
- Modify: `miniprogram/services/link.js`

- [ ] **Step 1: 扩展 localDb.js 的 addLink 函数，支持视频字段**

在 `miniprogram/utils/localDb.js` 的 `addLink` 函数中，在 `newLink` 对象定义里的 `aiInsight: null,` 行之后添加：

```javascript
    videoAuthor: linkData.videoAuthor || '',
    videoDuration: linkData.videoDuration || 0,
    keyPoints: linkData.keyPoints || null,
```

- [ ] **Step 2: 在 localDb.js 中新增 getVideoLinks 函数**

在 `searchLinks` 函数之后添加：

```javascript
/**
 * 获取视频链接列表
 */
function getVideoLinks({ category = '', page = 1, pageSize = 20 } = {}) {
  const db = _getAll();
  let list = db.links
    .filter(item => item.source === 'wechat_video')
    .sort((a, b) => new Date(b.createTime) - new Date(a.createTime));

  if (category) {
    list = list.filter(item => item.category === category);
  }

  const start = (page - 1) * pageSize;
  return { data: list.slice(start, start + pageSize), total: list.length };
}
```

- [ ] **Step 3: 在 localDb.js 的 module.exports 中导出新函数**

在 `searchLinks,` 行之后添加：

```javascript
  getVideoLinks,
```

- [ ] **Step 4: 扩展 services/link.js，添加 getVideoLinks 和 extractKeyPoints**

在 `miniprogram/services/link.js` 文件末尾的 `module.exports` 中添加新方法。首先在文件中添加函数定义（在现有函数之后、module.exports 之前）：

```javascript
/**
 * 获取视频列表
 */
function getVideoLinks(params = {}) {
  return localDb.getVideoLinks(params);
}

/**
 * 提取视频要点（本地降级方案）
 */
function extractKeyPoints(linkId) {
  const { data: link } = localDb.getLinkById(linkId);
  if (!link) return { success: false };

  const desc = link.description || '';
  const keyPoints = {
    summary: desc ? desc.substring(0, 50) : `关于「${link.title || '未知内容'}」的短视频`,
    points: desc
      ? desc.split(/[。！？\n]/).filter(s => s.trim().length > 5).slice(0, 3).map(s => s.trim())
      : [`这个视频讨论了「${link.title || '未知主题'}」相关内容`],
    extracted_at: new Date().toISOString()
  };

  localDb.updateLink(linkId, { keyPoints });
  return { success: true, data: keyPoints };
}
```

然后在 module.exports 中添加：

```javascript
  getVideoLinks,
  extractKeyPoints,
```

- [ ] **Step 5: 验证语法**

```bash
cd D:/projects/MemoryEverything/miniprogram && node -e "require('./utils/localDb'); console.log('localDb OK')"
node -e "require('./services/link'); console.log('link.js OK')"
```

Expected: 两行打印 OK

- [ ] **Step 6: Commit**

```bash
git add miniprogram/utils/localDb.js miniprogram/services/link.js
git commit -m "feat: 小程序数据层支持视频字段和 getVideoLinks/extractKeyPoints"
```

---

### Task 4: 小程序全局配置 — app.json + app.wxss + app.js

**Files:**
- Modify: `miniprogram/app.json`
- Modify: `miniprogram/app.wxss`
- Modify: `miniprogram/app.js`

- [ ] **Step 1: 在 app.json 注册新页面**

在 `miniprogram/app.json` 的 `pages` 数组中，在 `"pages/add-link/add-link"` 行之后添加：

```json
    "pages/video-list/video-list",
    "pages/video-detail/video-detail",
```

- [ ] **Step 2: 在 app.wxss 中添加深色主题变量**

在 `miniprogram/app.wxss` 的 `page { ... }` 块的最后一个 CSS 变量 `--card-background: #ffffff;` 之后添加：

```css
  /* 深色主题（视频页面使用） */
  --dark-bg: #121212;
  --dark-card: #1E1E1E;
  --dark-text: #E0E0E0;
  --dark-text-secondary: #9E9E9E;
  --dark-accent: #BB86FC;
  --dark-accent-pressed: #9A67EA;
  --dark-divider: #2C2C2C;
  --dark-danger: #CF6679;
```

- [ ] **Step 3: 增强 app.js 剪贴板检测，识别视频号链接**

在 `miniprogram/app.js` 的 `checkClipboard` 方法中，找到 `if (this.isValidUrl(content))` 这个判断，在弹窗的 `content` 字段改为能区分视频链接：

将 `checkClipboard` 方法中的 `wx.showModal` 调用替换为：

```javascript
        // 判断是否是视频号链接
        const isVideo = content.includes('channels.weixin.qq.com') ||
          content.includes('finder.video.qq.com') ||
          (content.includes('weixin.qq.com') && content.includes('video'));

        // 弹窗提示用户
        wx.showModal({
          title: isVideo ? '检测到视频号链接' : '检测到链接',
          content: this.truncateUrl(content),
          confirmText: '立即添加',
          cancelText: '忽略',
          success: (modalRes) => {
            if (modalRes.confirm) {
              wx.navigateTo({
                url: `/pages/add-link/add-link?url=${encodeURIComponent(content)}`
              });
            }
            this.globalData.pendingLink = null;
          }
        });
```

- [ ] **Step 4: Commit**

```bash
git add miniprogram/app.json miniprogram/app.wxss miniprogram/app.js
git commit -m "feat: 注册视频页面、添加深色主题变量、增强剪贴板视频号识别"
```

---

### Task 5: 视频列表页 — video-list

**Files:**
- Create: `miniprogram/pages/video-list/video-list.json`
- Create: `miniprogram/pages/video-list/video-list.js`
- Create: `miniprogram/pages/video-list/video-list.wxml`
- Create: `miniprogram/pages/video-list/video-list.wxss`

- [ ] **Step 1: 创建页面配置 video-list.json**

```json
{
  "navigationBarTitleText": "视频收藏",
  "navigationBarBackgroundColor": "#121212",
  "navigationBarTextStyle": "white",
  "backgroundColor": "#121212"
}
```

- [ ] **Step 2: 创建页面逻辑 video-list.js**

```javascript
// pages/video-list/video-list.js
const linkService = require('../../services/link');

Page({
  data: {
    videos: [],
    loading: true,
    page: 1,
    hasMore: true,
    activeCategory: '',
    categories: ['全部', '教程', '知识科普', '生活记录', '搞笑', '种草', '其他']
  },

  onLoad() {
    this.loadVideos();
  },

  onShow() {
    if (wx.getStorageSync('needRefreshLinks')) {
      wx.removeStorageSync('needRefreshLinks');
      this.setData({ videos: [], page: 1, hasMore: true });
      this.loadVideos();
    }
  },

  loadVideos() {
    this.setData({ loading: true });
    const { page, activeCategory } = this.data;

    try {
      const res = linkService.getVideoLinks({
        category: activeCategory,
        page,
        pageSize: 20
      });

      const newVideos = res.data || [];
      this.setData({
        videos: page === 1 ? newVideos : this.data.videos.concat(newVideos),
        hasMore: newVideos.length >= 20,
        loading: false
      });
    } catch (err) {
      console.error('加载视频列表失败：', err);
      this.setData({ loading: false });
    }
  },

  // 分类筛选
  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category;
    const activeCategory = category === '全部' ? '' : category;
    this.setData({ activeCategory, videos: [], page: 1, hasMore: true });
    this.loadVideos();
  },

  // 点击视频卡片
  onVideoTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/video-detail/video-detail?id=${id}`
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ videos: [], page: 1, hasMore: true });
    this.loadVideos();
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ page: this.data.page + 1 });
    this.loadVideos();
  },

  // 去添加视频
  goAdd() {
    wx.navigateTo({ url: '/pages/add-link/add-link' });
  },

  // 格式化时长
  formatDuration(seconds) {
    if (!seconds) return '';
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }
});
```

- [ ] **Step 3: 创建页面模板 video-list.wxml**

```xml
<!--pages/video-list/video-list.wxml-->
<view class="page-container">
  <!-- 分类筛选 -->
  <scroll-view class="category-bar" scroll-x enable-flex>
    <view
      wx:for="{{categories}}"
      wx:key="*this"
      class="category-pill {{(item === '全部' && !activeCategory) || item === activeCategory ? 'active' : ''}}"
      data-category="{{item}}"
      bindtap="onCategoryTap"
    >{{item}}</view>
  </scroll-view>

  <!-- 视频列表 -->
  <view class="video-list" wx:if="{{videos.length > 0}}">
    <view
      class="video-card"
      wx:for="{{videos}}"
      wx:key="_id"
      data-id="{{item._id}}"
      bindtap="onVideoTap"
    >
      <view class="video-thumb-wrap">
        <image
          class="video-thumb"
          src="{{item.thumbnail || '/images/default-thumbnail.png'}}"
          mode="aspectFill"
        ></image>
        <view class="play-icon">▶</view>
        <text wx:if="{{item.videoDuration}}" class="duration">
          {{item.videoDuration > 0 ? (item.videoDuration / 60 >= 1 ? Math.floor(item.videoDuration / 60) + ':' : '0:') : ''}}{{item.videoDuration > 0 ? (item.videoDuration % 60 < 10 ? '0' + item.videoDuration % 60 : item.videoDuration % 60) : ''}}
        </text>
      </view>
      <view class="video-info">
        <text class="video-title ellipsis-2">{{item.title || '无标题'}}</text>
        <text wx:if="{{item.videoAuthor}}" class="video-author">{{item.videoAuthor}}</text>
        <view class="video-meta">
          <text wx:if="{{item.category}}" class="video-category">{{item.category}}</text>
          <view wx:if="{{item.tags && item.tags.length > 0}}" class="video-tags">
            <text class="video-tag" wx:for="{{item.tags}}" wx:for-item="tag" wx:key="*this">{{tag}}</text>
          </view>
        </view>
        <text wx:if="{{item.keyPoints && item.keyPoints.summary}}" class="video-summary ellipsis">
          {{item.keyPoints.summary}}
        </text>
      </view>
    </view>
  </view>

  <!-- 空状态 -->
  <view class="empty-state" wx:if="{{!loading && videos.length === 0}}">
    <text class="empty-icon">🎬</text>
    <text class="empty-text">还没收藏视频</text>
    <text class="empty-hint">去视频号分享试试</text>
    <view class="empty-btn" bindtap="goAdd">去添加</view>
  </view>

  <!-- 加载状态 -->
  <view class="loading-bar" wx:if="{{loading}}">
    <text>加载中...</text>
  </view>

  <!-- 没有更多 -->
  <view class="no-more" wx:if="{{!hasMore && videos.length > 0 && !loading}}">
    <text>没有更多了</text>
  </view>
</view>
```

- [ ] **Step 4: 创建页面样式 video-list.wxss**

```css
/* pages/video-list/video-list.wxss */

.page-container {
  min-height: 100vh;
  background-color: var(--dark-bg);
  padding: 20rpx;
  padding-bottom: 40rpx;
}

/* 分类筛选 */
.category-bar {
  white-space: nowrap;
  margin-bottom: 24rpx;
  padding: 8rpx 0;
}

.category-pill {
  display: inline-block;
  padding: 12rpx 28rpx;
  margin-right: 16rpx;
  border-radius: 30rpx;
  font-size: 26rpx;
  color: var(--dark-text-secondary);
  background-color: var(--dark-card);
}

.category-pill.active {
  color: #fff;
  background-color: var(--dark-accent);
}

/* 视频列表 */
.video-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.video-card {
  display: flex;
  background-color: var(--dark-card);
  border-radius: 16rpx;
  overflow: hidden;
}

.video-card:active {
  opacity: 0.85;
}

/* 缩略图 */
.video-thumb-wrap {
  position: relative;
  width: 240rpx;
  height: 180rpx;
  flex-shrink: 0;
}

.video-thumb {
  width: 100%;
  height: 100%;
  border-radius: 12rpx 0 0 12rpx;
}

.play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 56rpx;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  background-color: rgba(0, 0, 0, 0.5);
  color: #fff;
  border-radius: 50%;
  font-size: 24rpx;
}

.duration {
  position: absolute;
  bottom: 8rpx;
  right: 8rpx;
  background-color: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}

/* 视频信息 */
.video-info {
  flex: 1;
  padding: 16rpx 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.video-title {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--dark-text);
  line-height: 1.4;
  margin-bottom: 8rpx;
}

.video-author {
  font-size: 22rpx;
  color: var(--dark-text-secondary);
  margin-bottom: 8rpx;
}

.video-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.video-category {
  font-size: 20rpx;
  color: var(--dark-accent);
  background-color: rgba(187, 134, 252, 0.15);
  padding: 2rpx 12rpx;
  border-radius: 4rpx;
}

.video-tags {
  display: flex;
  gap: 8rpx;
}

.video-tag {
  font-size: 20rpx;
  color: var(--dark-text-secondary);
  background-color: var(--dark-divider);
  padding: 2rpx 10rpx;
  border-radius: 4rpx;
}

.video-summary {
  font-size: 22rpx;
  color: var(--dark-text-secondary);
  line-height: 1.4;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 40rpx;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 32rpx;
  color: var(--dark-text);
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: var(--dark-text-secondary);
  margin-bottom: 32rpx;
}

.empty-btn {
  padding: 16rpx 48rpx;
  background-color: var(--dark-accent);
  color: #fff;
  border-radius: 30rpx;
  font-size: 28rpx;
}

.empty-btn:active {
  background-color: var(--dark-accent-pressed);
}

/* 加载和底部 */
.loading-bar {
  display: flex;
  justify-content: center;
  padding: 40rpx;
  color: var(--dark-text-secondary);
  font-size: 26rpx;
}

.no-more {
  text-align: center;
  padding: 30rpx;
  color: var(--dark-text-secondary);
  font-size: 24rpx;
}

/* 文本溢出 */
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ellipsis-2 {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
```

- [ ] **Step 5: Commit**

```bash
git add miniprogram/pages/video-list/
git commit -m "feat: 新增视频列表页（深色主题）"
```

---

### Task 6: 视频详情页 — video-detail

**Files:**
- Create: `miniprogram/pages/video-detail/video-detail.json`
- Create: `miniprogram/pages/video-detail/video-detail.js`
- Create: `miniprogram/pages/video-detail/video-detail.wxml`
- Create: `miniprogram/pages/video-detail/video-detail.wxss`

- [ ] **Step 1: 创建页面配置 video-detail.json**

```json
{
  "navigationBarTitleText": "视频详情",
  "navigationBarBackgroundColor": "#121212",
  "navigationBarTextStyle": "white",
  "backgroundColor": "#121212"
}
```

- [ ] **Step 2: 创建页面逻辑 video-detail.js**

```javascript
// pages/video-detail/video-detail.js
const linkService = require('../../services/link');
const { formatTime } = require('../../utils/format');

Page({
  data: {
    video: null,
    loading: true,
    extracting: false,
    commentContent: '',
    rating: 0,
    showCategoryPicker: false,
    categories: ['教程', '知识科普', '生活记录', '搞笑', '种草', '其他']
  },

  onLoad(options) {
    if (options.id) {
      this.loadVideo(options.id);
    }
  },

  async loadVideo(id) {
    this.setData({ loading: true });
    try {
      const res = await linkService.getLinkById(id);
      if (res.data) {
        const video = res.data;
        video.createTimeStr = formatTime(video.createTime);
        this.setData({
          video,
          commentContent: video.comment?.content || '',
          rating: video.comment?.rating || 0
        });
      }
    } catch (err) {
      console.error('加载视频详情失败：', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 提取要点
  async extractKeyPoints() {
    const { video } = this.data;
    if (!video || this.data.extracting) return;

    this.setData({ extracting: true });
    try {
      const res = linkService.extractKeyPoints(video._id);
      if (res.success) {
        this.setData({ 'video.keyPoints': res.data });
        wx.showToast({ title: '提取成功', icon: 'success' });
      } else {
        wx.showToast({ title: '提取失败', icon: 'none' });
      }
    } catch (err) {
      console.error('提取要点失败：', err);
      wx.showToast({ title: '提取失败', icon: 'none' });
    } finally {
      this.setData({ extracting: false });
    }
  },

  // 打开原视频（复制链接）
  openOriginal() {
    const url = this.data.video?.url;
    if (!url) return;
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({ title: '链接已复制，去微信打开', icon: 'none' });
      }
    });
  },

  // 修改分类
  onCategoryChange(e) {
    const index = e.detail.value;
    const category = this.data.categories[index];
    const { video } = this.data;
    if (!video) return;

    linkService.updateLink(video._id, { category });
    this.setData({ 'video.category': category });
    wx.showToast({ title: '分类已更新', icon: 'success' });
    wx.setStorageSync('needRefreshLinks', true);
  },

  // 评分
  onRatingChange(e) {
    this.setData({ rating: e.currentTarget.dataset.rating });
  },

  // 点评输入
  onCommentInput(e) {
    this.setData({ commentContent: e.detail.value });
  },

  // 保存点评
  async saveComment() {
    const { video, commentContent, rating } = this.data;
    if (!video) return;

    wx.showLoading({ title: '保存中...' });
    try {
      await linkService.updateLink(video._id, {
        comment: {
          content: commentContent,
          rating: rating,
          updateTime: new Date().toISOString()
        }
      });
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      wx.setStorageSync('needRefreshLinks', true);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  // 删除视频
  deleteVideo() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个视频收藏吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await linkService.deleteLink(this.data.video._id);
            wx.setStorageSync('needRefreshLinks', true);
            wx.navigateBack();
            wx.showToast({ title: '已删除', icon: 'success' });
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 分享
  onShareAppMessage() {
    const { video } = this.data;
    return {
      title: video?.title || '分享一个视频',
      path: `/pages/video-detail/video-detail?id=${video?._id}`
    };
  }
});
```

- [ ] **Step 3: 创建页面模板 video-detail.wxml**

```xml
<!--pages/video-detail/video-detail.wxml-->
<view class="page-container" wx:if="{{!loading && video}}">
  <!-- 视频卡片 -->
  <view class="video-card">
    <view class="thumb-wrap" bindtap="openOriginal">
      <image
        class="thumb"
        src="{{video.thumbnail || '/images/default-thumbnail.png'}}"
        mode="aspectFill"
      ></image>
      <view class="play-overlay">
        <text class="play-btn">▶</text>
        <text class="play-hint">打开原视频</text>
      </view>
    </view>

    <view class="video-info">
      <text class="video-title">{{video.title || '无标题'}}</text>
      <view class="video-meta-row">
        <text wx:if="{{video.videoAuthor}}" class="author">{{video.videoAuthor}}</text>
        <text class="time">{{video.createTimeStr}}</text>
      </view>
      <text wx:if="{{video.description}}" class="video-desc">{{video.description}}</text>
    </view>

    <!-- 分类 & 标签 -->
    <view class="category-section">
      <picker
        mode="selector"
        range="{{categories}}"
        bindchange="onCategoryChange"
      >
        <view class="category-picker">
          <text class="category-label">分类</text>
          <text class="category-value">{{video.category || '点击选择'}}</text>
          <text class="picker-arrow">›</text>
        </view>
      </picker>
      <view wx:if="{{video.tags && video.tags.length > 0}}" class="tags-row">
        <text class="tag" wx:for="{{video.tags}}" wx:key="*this">{{item}}</text>
      </view>
    </view>
  </view>

  <!-- 要点卡片 -->
  <view class="keypoints-card">
    <view class="section-header">
      <text class="section-title">要点提取</text>
      <view
        class="extract-btn {{extracting ? 'extracting' : ''}}"
        bindtap="extractKeyPoints"
      >
        <text>{{video.keyPoints ? '重新提取' : '提取要点'}}</text>
      </view>
    </view>

    <!-- 提取中 -->
    <view wx:if="{{extracting}}" class="extracting-state">
      <text class="extracting-text">AI 正在分析视频内容...</text>
    </view>

    <!-- 要点内容 -->
    <view wx:if="{{video.keyPoints && !extracting}}" class="keypoints-content">
      <view class="summary-block">
        <text class="summary-text">{{video.keyPoints.summary}}</text>
      </view>
      <view wx:if="{{video.keyPoints.points && video.keyPoints.points.length > 0}}" class="points-list">
        <view
          class="point-item"
          wx:for="{{video.keyPoints.points}}"
          wx:key="index"
        >
          <text class="point-num">{{index + 1}}</text>
          <text class="point-text">{{item}}</text>
        </view>
      </view>
    </view>

    <!-- 未提取 -->
    <view wx:if="{{!video.keyPoints && !extracting}}" class="no-keypoints">
      <text class="no-keypoints-text">点击上方按钮，AI 帮你提取核心要点</text>
    </view>
  </view>

  <!-- 点评区域 -->
  <view class="comment-card">
    <text class="section-title">我的点评</text>

    <view class="rating-row">
      <text class="rating-label">评分</text>
      <view class="rating-stars">
        <view
          wx:for="{{[1,2,3,4,5]}}"
          wx:key="*this"
          class="star {{rating >= item ? 'active' : ''}}"
          data-rating="{{item}}"
          bindtap="onRatingChange"
        >{{rating >= item ? '★' : '☆'}}</view>
      </view>
    </view>

    <view class="comment-input-wrap">
      <textarea
        class="comment-input"
        placeholder="写下你的想法..."
        placeholderClass="comment-placeholder"
        value="{{commentContent}}"
        bindinput="onCommentInput"
        maxlength="500"
      ></textarea>
      <text class="char-count">{{commentContent.length}}/500</text>
    </view>

    <view class="comment-btn" bindtap="saveComment">保存点评</view>
  </view>

  <!-- 底部操作栏 -->
  <view class="bottom-bar">
    <view class="bar-btn primary" bindtap="openOriginal">
      <text>打开原视频</text>
    </view>
    <view class="bar-btn danger" bindtap="deleteVideo">
      <text>删除</text>
    </view>
  </view>
</view>

<!-- 加载状态 -->
<view class="loading-state" wx:if="{{loading}}">
  <text class="loading-text">加载中...</text>
</view>
```

- [ ] **Step 4: 创建页面样式 video-detail.wxss**

```css
/* pages/video-detail/video-detail.wxss */

.page-container {
  min-height: 100vh;
  background-color: var(--dark-bg);
  padding: 20rpx;
  padding-bottom: 140rpx;
}

/* 视频卡片 */
.video-card {
  background-color: var(--dark-card);
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
}

.thumb-wrap {
  position: relative;
  width: 100%;
  height: 400rpx;
}

.thumb {
  width: 100%;
  height: 100%;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.3);
}

.play-btn {
  width: 80rpx;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  background-color: rgba(187, 134, 252, 0.8);
  color: #fff;
  border-radius: 50%;
  font-size: 36rpx;
  margin-bottom: 12rpx;
}

.play-hint {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.video-info {
  padding: 24rpx;
}

.video-title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--dark-text);
  display: block;
  margin-bottom: 12rpx;
  line-height: 1.4;
}

.video-meta-row {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
  gap: 20rpx;
}

.author {
  font-size: 26rpx;
  color: var(--dark-accent);
}

.time {
  font-size: 24rpx;
  color: var(--dark-text-secondary);
}

.video-desc {
  font-size: 26rpx;
  color: var(--dark-text-secondary);
  line-height: 1.6;
  display: block;
}

/* 分类 */
.category-section {
  padding: 0 24rpx 24rpx;
  border-top: 1rpx solid var(--dark-divider);
  padding-top: 20rpx;
}

.category-picker {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
}

.category-label {
  font-size: 26rpx;
  color: var(--dark-text-secondary);
  margin-right: 16rpx;
}

.category-value {
  font-size: 26rpx;
  color: var(--dark-accent);
  flex: 1;
}

.picker-arrow {
  font-size: 32rpx;
  color: var(--dark-text-secondary);
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
}

.tag {
  font-size: 22rpx;
  color: var(--dark-text-secondary);
  background-color: var(--dark-divider);
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
}

/* 要点卡片 */
.keypoints-card {
  background-color: var(--dark-card);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--dark-text);
}

.extract-btn {
  padding: 12rpx 28rpx;
  background-color: var(--dark-accent);
  color: #fff;
  border-radius: 30rpx;
  font-size: 24rpx;
}

.extract-btn:active {
  background-color: var(--dark-accent-pressed);
}

.extract-btn.extracting {
  opacity: 0.6;
}

/* 提取中状态 */
.extracting-state {
  display: flex;
  justify-content: center;
  padding: 60rpx 0;
}

.extracting-text {
  font-size: 26rpx;
  color: var(--dark-text-secondary);
}

/* 要点内容 */
.keypoints-content {
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(16rpx); }
  to { opacity: 1; transform: translateY(0); }
}

.summary-block {
  background-color: rgba(187, 134, 252, 0.1);
  border-left: 4rpx solid var(--dark-accent);
  border-radius: 0 8rpx 8rpx 0;
  padding: 20rpx;
  margin-bottom: 24rpx;
}

.summary-text {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--dark-text);
  line-height: 1.5;
}

.points-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.point-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.point-num {
  width: 40rpx;
  height: 40rpx;
  line-height: 40rpx;
  text-align: center;
  background-color: var(--dark-accent);
  color: #fff;
  border-radius: 50%;
  font-size: 22rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.point-text {
  font-size: 28rpx;
  color: var(--dark-text);
  line-height: 1.6;
  flex: 1;
  padding-top: 4rpx;
}

.no-keypoints {
  display: flex;
  justify-content: center;
  padding: 60rpx 40rpx;
}

.no-keypoints-text {
  font-size: 26rpx;
  color: var(--dark-text-secondary);
  text-align: center;
}

/* 点评区域 */
.comment-card {
  background-color: var(--dark-card);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.rating-row {
  display: flex;
  align-items: center;
  margin: 24rpx 0;
}

.rating-label {
  font-size: 26rpx;
  color: var(--dark-text-secondary);
  margin-right: 16rpx;
}

.rating-stars {
  display: flex;
}

.star {
  font-size: 48rpx;
  color: #555;
  margin-right: 8rpx;
}

.star.active {
  color: #faad14;
}

.comment-input-wrap {
  position: relative;
  margin-bottom: 20rpx;
}

.comment-input {
  width: 100%;
  height: 180rpx;
  background-color: var(--dark-bg);
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: var(--dark-text);
  box-sizing: border-box;
}

.comment-placeholder {
  color: var(--dark-text-secondary);
}

.char-count {
  position: absolute;
  right: 20rpx;
  bottom: 20rpx;
  font-size: 22rpx;
  color: var(--dark-text-secondary);
}

.comment-btn {
  width: 100%;
  text-align: center;
  padding: 20rpx;
  background-color: var(--dark-accent);
  color: #fff;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.comment-btn:active {
  background-color: var(--dark-accent-pressed);
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  padding: 16rpx 20rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background-color: var(--dark-card);
  border-top: 1rpx solid var(--dark-divider);
  gap: 20rpx;
}

.bar-btn {
  flex: 1;
  text-align: center;
  padding: 20rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.bar-btn.primary {
  background-color: var(--dark-accent);
  color: #fff;
}

.bar-btn.primary:active {
  background-color: var(--dark-accent-pressed);
}

.bar-btn.danger {
  background-color: transparent;
  color: var(--dark-danger);
  border: 1rpx solid var(--dark-danger);
}

.bar-btn.danger:active {
  background-color: rgba(207, 102, 121, 0.1);
}

/* 加载状态 */
.loading-state {
  display: flex;
  justify-content: center;
  padding: 200rpx 0;
}

.loading-text {
  color: var(--dark-text-secondary);
  font-size: 28rpx;
}
```

- [ ] **Step 5: Commit**

```bash
git add miniprogram/pages/video-detail/
git commit -m "feat: 新增视频详情页（深色主题 + 要点提取 + 点评）"
```

---

### Task 7: 首页 Tab 切换 + add-link 视频识别

**Files:**
- Modify: `miniprogram/pages/add-link/add-link.js`

- [ ] **Step 1: 增强 add-link.js 的 parseLink，识别视频号来源**

在 `miniprogram/pages/add-link/add-link.js` 的 `parseLink` 方法中，替换来源判断部分（`this.setData({ title: ..., source: ... })` 处）：

```javascript
      // 判断来源
      let source = 'external';
      if (url.includes('mp.weixin.qq.com')) {
        source = 'wechat_article';
      } else if (
        url.includes('channels.weixin.qq.com') ||
        url.includes('finder.video.qq.com') ||
        (url.includes('weixin.qq.com') && url.includes('video'))
      ) {
        source = 'wechat_video';
      }

      this.setData({
        title: domain ? `来自 ${domain} 的${source === 'wechat_video' ? '视频' : '链接'}` : '',
        source
      });

      wx.showToast({
        title: source === 'wechat_video' ? '检测到视频号链接' : '请手动填写标题',
        icon: 'none'
      });
```

- [ ] **Step 2: 在 save 方法中传递 source 信息**

`add-link.js` 的 `save` 方法中 `linkData` 对象已包含 `source`，无需额外修改（已有 `source: source || 'external'`）。

确认 save 方法中解构已包含 source：

```javascript
    const { url, title, description, category, useAI, saving, thumbnail, source } = this.data;
```

这行已存在，无需修改。

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/add-link/add-link.js
git commit -m "feat: add-link 页面增强视频号链接识别"
```

---

### Task 8: 入口串联 — 从首页和我的页面进入视频列表

**Files:**
- Modify: `miniprogram/pages/mine/mine.wxml`
- Modify: `miniprogram/pages/mine/mine.js`

- [ ] **Step 1: 读取 mine 页面当前内容**

先读取 mine.wxml 和 mine.js 的当前内容（实施时需要先 Read），然后在"我的"页面添加一个入口卡片跳转到视频列表。

- [ ] **Step 2: 在 mine.js 中添加跳转方法**

在 mine.js 的 Page 对象中添加：

```javascript
  // 跳转到视频收藏
  goVideoList() {
    wx.navigateTo({
      url: '/pages/video-list/video-list'
    });
  },
```

- [ ] **Step 3: 在 mine.wxml 中添加视频收藏入口**

在"我的"页面合适位置（统计区域之后）添加：

```xml
  <!-- 视频收藏入口 -->
  <view class="menu-item" bindtap="goVideoList">
    <text class="menu-icon">🎬</text>
    <text class="menu-text">视频收藏</text>
    <text class="menu-arrow">›</text>
  </view>
```

- [ ] **Step 4: Commit**

```bash
git add miniprogram/pages/mine/mine.js miniprogram/pages/mine/mine.wxml
git commit -m "feat: 我的页面添加视频收藏入口"
```

---

### Task 9: 更新 BACKLOG + 文档

**Files:**
- Modify: `docs/BACKLOG.md`
- Modify: `docs/README.md`
- Modify: `docs/CHANGELOG.md`

- [ ] **Step 1: 更新 BACKLOG.md**

在"进行中"区域添加短视频收藏需求条目。

- [ ] **Step 2: 更新 README.md 的实现计划表格**

在 docs/README.md 的实现计划表格中添加本计划。

- [ ] **Step 3: Commit**

```bash
git add docs/
git commit -m "docs: 更新 BACKLOG 和 README，添加短视频收藏计划"
```
