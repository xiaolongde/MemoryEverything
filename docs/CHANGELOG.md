---
tags: [changelog]
---

# Changelog

> 由 AI 在每次 `/ship` 后自动更新。

## 2026-04-08

- **短视频收藏 + AI 分类 + 要点提取** — 视频号短视频收藏功能上线
  - 后端 links 表扩展 video_author、video_duration、key_points 字段
  - 新增 AI 要点提取路由 `POST /ai/extract-points`（含降级方案）
  - parseLink 增强视频号域名识别（channels.weixin.qq.com / finder.video.qq.com）
  - 剪贴板检测支持区分视频号链接
  - 新增视频列表页（深色主题 Material Dark）
  - 新增视频详情页（要点提取 + 点评 + 分类管理）
  - "我的"页面添加视频收藏入口
- **架构迁移：云开发 → HTTP 后端** — 移除云函数依赖，改用 Express + SQLite 后端服务
  - 新增 `server/` 目录：app.js、db.js、routes（auth/links/notes/categories/ai/stats/upload）
  - 小程序 services 层改用 HTTP 接口调用
  - 新增本地数据库（localDb.js）和同步机制（sync.js）
  - 分类/链接/笔记服务层全部重构

## 2026-03-xx

- **Timeline + AI 整理视图** — 重构页面结构，新增时间线展示和 AI 驱动的内容整理视图
- **剪贴板链接检测** — 自动检测剪贴板中的链接，支持快捷添加
- **TabBar 图标** — 添加底部导航栏图标资源
- **搜索图标修复** — 移动搜索图标到正确目录

## 初始版本

- 小程序基础框架搭建
- 链接收藏 + AI 智能分类 + 感悟记录
- AI 深度解读 + AI 辅助点评
- 全文搜索功能
