// utils/constants.js
// 常量定义

// 分类列表
const CATEGORIES = [
  { name: '技术', icon: '💻', color: '#1890ff' },
  { name: '生活', icon: '🏠', color: '#52c41a' },
  { name: '娱乐', icon: '🎮', color: '#eb2f96' },
  { name: '工作', icon: '💼', color: '#722ed1' },
  { name: '学习', icon: '📚', color: '#fa8c16' },
  { name: '阅读', icon: '📖', color: '#13c2c2' },
  { name: '视频', icon: '🎬', color: '#f5222d' },
  { name: '音乐', icon: '🎵', color: '#2f54eb' },
  { name: '购物', icon: '🛒', color: '#faad14' },
  { name: '美食', icon: '🍔', color: '#fa541c' },
  { name: '旅行', icon: '✈️', color: '#1890ff' },
  { name: '健康', icon: '💪', color: '#52c41a' },
  { name: '财经', icon: '💰', color: '#faad14' },
  { name: '其他', icon: '📁', color: '#8c8c8c' }
];

// 心情列表
const MOODS = [
  { value: 'happy', emoji: '😊', label: '开心' },
  { value: 'thinking', emoji: '🤔', label: '思考' },
  { value: 'sad', emoji: '😢', label: '难过' },
  { value: 'excited', emoji: '🎉', label: '兴奋' },
  { value: 'calm', emoji: '😌', label: '平静' },
  { value: 'angry', emoji: '😤', label: '生气' },
  { value: 'love', emoji: '🥰', label: '喜欢' },
  { value: 'tired', emoji: '😩', label: '疲惫' }
];

// 链接来源类型
const LINK_SOURCES = {
  WECHAT_ARTICLE: 'wechat_article',
  WECHAT_VIDEO: 'wechat_video',
  EXTERNAL: 'external'
};

// API 配置
const API_CONFIG = {
  AI_CLASSIFY_URL: '', // AI 分类 API 地址
  AI_API_KEY: ''       // AI API Key
};

module.exports = {
  CATEGORIES,
  MOODS,
  LINK_SOURCES,
  API_CONFIG
};
