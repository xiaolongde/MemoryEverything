# MemoryEverything

> 记忆万物 - 个人知识管理小程序

## 功能特性

- 📥 **链接收藏** - 保存分享的链接，自动抓取标题/描述/缩略图
- 🤖 **AI 智能分类** - 自动分析内容并分类、提取标签
- 💬 **链接点评** - 对收藏的链接添加个人点评和评分
- 💭 **感悟记录** - 记录日常感悟短文，支持图片和心情
- 🔍 **全文搜索** - 搜索链接和感悟内容
- ☁️ **多端同步** - 云端存储，多设备数据同步

## 项目结构

```
MemoryEverything/
├── cloudfunctions/           # 云函数
│   ├── getOpenid/            # 获取用户 openid
│   ├── parseLink/            # 链接解析
│   └── aiClassify/           # AI 智能分类
│
├── miniprogram/              # 小程序主体
│   ├── pages/                # 页面
│   │   ├── index/            # 首页（链接列表）
│   │   ├── notes/            # 感悟页
│   │   ├── category/         # 分类页
│   │   ├── mine/             # 我的页
│   │   ├── link-detail/      # 链接详情
│   │   ├── note-edit/        # 感悟编辑
│   │   ├── search/           # 搜索页
│   │   └── add-link/         # 添加链接
│   │
│   ├── components/           # 组件
│   │   ├── link-card/        # 链接卡片
│   │   ├── note-card/        # 感悟卡片
│   │   └── rating-star/      # 评分星星
│   │
│   ├── services/             # 服务层
│   ├── utils/                # 工具函数
│   └── images/               # 图片资源
│
├── plan.md                   # 开发计划
├── project.config.json       # 项目配置
└── README.md
```

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/xiaolongde/MemoryEverything.git
cd MemoryEverything
```

### 2. 配置小程序

1. 打开微信开发者工具
2. 导入项目，选择 `MemoryEverything` 目录
3. 修改 `project.config.json` 中的 `appid` 为你的小程序 AppID

### 3. 配置云开发

1. 在微信开发者工具中开通云开发
2. 创建云开发环境
3. 修改 `miniprogram/app.js` 中的云开发环境 ID

### 4. 部署云函数

在微信开发者工具中，右键点击 `cloudfunctions` 下的每个云函数目录，选择「上传并部署：云端安装依赖」

### 5. 创建数据库集合

在云开发控制台创建以下集合：
- `links` - 链接数据
- `notes` - 感悟数据
- `categories` - 分类数据（可选）

### 6. 配置 AI 分类（可选）

如需启用 AI 智能分类功能：

1. 申请通义千问 API Key：https://dashscope.aliyuncs.com/
2. 修改 `cloudfunctions/aiClassify/index.js` 中的 `AI_CONFIG.QWEN_API_KEY`
3. 重新部署 aiClassify 云函数

## 图片资源

需要在 `miniprogram/images/` 目录下添加以下图片：

- `tab-home.png` / `tab-home-active.png` - 首页 Tab 图标
- `tab-note.png` / `tab-note-active.png` - 感悟 Tab 图标
- `tab-category.png` / `tab-category-active.png` - 分类 Tab 图标
- `tab-mine.png` / `tab-mine-active.png` - 我的 Tab 图标
- `icon-search.png` - 搜索图标
- `icon-add.png` - 添加图标
- `icon-edit.png` - 编辑图标
- `empty-link.png` - 链接空状态图
- `empty-note.png` - 感悟空状态图
- `default-thumbnail.png` - 默认缩略图

## 技术栈

- 微信小程序原生开发
- 微信云开发（云函数 + 云数据库 + 云存储）
- 通义千问 AI API（可选）

## License

MIT
