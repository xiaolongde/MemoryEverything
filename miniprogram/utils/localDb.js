// utils/localDb.js
// 本地数据库 —— 使用 wx.storage 模拟数据库操作
// 数据结构: { links: [...], notes: [...], _meta: { nextLinkId, nextNoteId } }

const STORAGE_KEY = 'me_local_db';

/**
 * 获取整个本地数据库
 */
function _getAll() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || { links: [], notes: [], _meta: { nextLinkId: 1, nextNoteId: 1 } };
  } catch {
    return { links: [], notes: [], _meta: { nextLinkId: 1, nextNoteId: 1 } };
  }
}

/**
 * 保存整个本地数据库
 */
function _saveAll(db) {
  try {
    wx.setStorageSync(STORAGE_KEY, db);
  } catch (err) {
    console.error('保存本地数据库失败：', err);
  }
}

// ==================== 链接操作 ====================

/**
 * 获取链接列表
 */
function getLinks({ category = '', tag = '', page = 1, pageSize = 20 } = {}) {
  const db = _getAll();
  let list = db.links.slice().sort((a, b) => new Date(b.createTime) - new Date(a.createTime));

  if (category) {
    list = list.filter(item => item.category === category);
  }
  if (tag) {
    list = list.filter(item => (item.tags || []).includes(tag));
  }

  const start = (page - 1) * pageSize;
  return { data: list.slice(start, start + pageSize) };
}

/**
 * 获取链接详情
 */
function getLinkById(id) {
  const db = _getAll();
  const link = db.links.find(item => item._id === id);
  return { data: link || null };
}

/**
 * 添加链接
 */
function addLink(linkData) {
  const db = _getAll();
  const id = db._meta.nextLinkId++;
  const now = new Date().toISOString();

  const newLink = {
    _id: id,
    url: linkData.url || '',
    title: linkData.title || '',
    description: linkData.description || '',
    thumbnail: linkData.thumbnail || '',
    source: linkData.source || 'external',
    category: linkData.category || '',
    tags: linkData.tags || [],
    summary: linkData.summary || '',
    isRead: false,
    isFavorite: false,
    comment: null,
    aiInsight: null,
    videoAuthor: linkData.videoAuthor || '',
    videoDuration: linkData.videoDuration || 0,
    keyPoints: linkData.keyPoints || null,
    createTime: now,
    updateTime: now
  };

  db.links.push(newLink);
  _saveAll(db);
  return { _id: id };
}

/**
 * 更新链接
 */
function updateLink(id, data) {
  const db = _getAll();
  const index = db.links.findIndex(item => item._id === id);
  if (index === -1) return { updated: 0 };

  // 合并更新
  Object.keys(data).forEach(key => {
    db.links[index][key] = data[key];
  });
  db.links[index].updateTime = new Date().toISOString();

  _saveAll(db);
  return { updated: 1 };
}

/**
 * 删除链接
 */
function deleteLink(id) {
  const db = _getAll();
  db.links = db.links.filter(item => item._id !== id);
  _saveAll(db);
  return { deleted: 1 };
}

/**
 * 搜索链接
 */
function searchLinks(keyword) {
  if (!keyword) return { data: [] };
  const db = _getAll();
  const kw = keyword.toLowerCase();
  const list = db.links.filter(item =>
    (item.title || '').toLowerCase().includes(kw) ||
    (item.description || '').toLowerCase().includes(kw) ||
    (item.tags || []).some(t => t.toLowerCase().includes(kw))
  ).sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
    .slice(0, 50);

  return { data: list };
}

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

// ==================== 感悟操作 ====================

/**
 * 获取感悟列表
 */
function getNotes({ page = 1, pageSize = 20 } = {}) {
  const db = _getAll();
  const list = db.notes.slice().sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
  const start = (page - 1) * pageSize;
  return { data: list.slice(start, start + pageSize) };
}

/**
 * 获取感悟详情
 */
function getNoteById(id) {
  const db = _getAll();
  const note = db.notes.find(item => item._id === id);
  return { data: note || null };
}

/**
 * 添加感悟
 */
function addNote(noteData) {
  const db = _getAll();
  const id = db._meta.nextNoteId++;
  const now = new Date().toISOString();

  const newNote = {
    _id: id,
    content: noteData.content || '',
    images: noteData.images || [],
    tags: noteData.tags || [],
    mood: noteData.mood || '',
    createTime: now,
    updateTime: now
  };

  db.notes.push(newNote);
  _saveAll(db);
  return { _id: id };
}

/**
 * 更新感悟
 */
function updateNote(id, data) {
  const db = _getAll();
  const index = db.notes.findIndex(item => item._id === id);
  if (index === -1) return { updated: 0 };

  Object.keys(data).forEach(key => {
    db.notes[index][key] = data[key];
  });
  db.notes[index].updateTime = new Date().toISOString();

  _saveAll(db);
  return { updated: 1 };
}

/**
 * 删除感悟
 */
function deleteNote(id) {
  const db = _getAll();
  db.notes = db.notes.filter(item => item._id !== id);
  _saveAll(db);
  return { deleted: 1 };
}

/**
 * 搜索感悟
 */
function searchNotes(keyword) {
  if (!keyword) return { data: [] };
  const db = _getAll();
  const kw = keyword.toLowerCase();
  const list = db.notes.filter(item =>
    (item.content || '').toLowerCase().includes(kw) ||
    (item.tags || []).some(t => t.toLowerCase().includes(kw))
  ).sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
    .slice(0, 50);

  return { data: list };
}

// ==================== 统计 ====================

/**
 * 获取分类列表（带统计）
 */
function getCategories() {
  const db = _getAll();
  const presets = [
    { name: '技术', icon: '💻', color: '#1890ff' },
    { name: '生活', icon: '🏠', color: '#52c41a' },
    { name: '娱乐', icon: '🎮', color: '#eb2f96' },
    { name: '工作', icon: '💼', color: '#722ed1' },
    { name: '学习', icon: '📚', color: '#fa8c16' },
    { name: '阅读', icon: '📖', color: '#13c2c2' },
    { name: '视频', icon: '🎬', color: '#f5222d' },
    { name: '其他', icon: '📁', color: '#8c8c8c' }
  ];

  const countMap = {};
  db.links.forEach(link => {
    if (link.category) {
      countMap[link.category] = (countMap[link.category] || 0) + 1;
    }
  });

  const categories = presets
    .map(c => ({ ...c, count: countMap[c.name] || 0 }))
    .filter(c => c.count > 0);

  // 用户自定义分类
  Object.keys(countMap).forEach(name => {
    if (!presets.find(p => p.name === name)) {
      categories.push({ name, icon: '📁', color: '#8c8c8c', count: countMap[name] });
    }
  });

  categories.sort((a, b) => b.count - a.count);
  return { data: categories };
}

/**
 * 获取标签列表（带统计）
 */
function getTags() {
  const db = _getAll();
  const countMap = {};
  db.links.forEach(link => {
    (link.tags || []).forEach(tag => {
      countMap[tag] = (countMap[tag] || 0) + 1;
    });
  });

  const tags = Object.keys(countMap)
    .map(name => ({ name, count: countMap[name] }))
    .sort((a, b) => b.count - a.count);

  return { data: tags };
}

/**
 * 获取全局统计
 */
function getStats() {
  const db = _getAll();
  const catSet = new Set();
  db.links.forEach(l => { if (l.category) catSet.add(l.category); });

  return {
    linkCount: db.links.length,
    noteCount: db.notes.length,
    categoryCount: catSet.size
  };
}

/**
 * 获取链接统计（总数 + 待整理数）
 */
function getLinkStats() {
  const db = _getAll();
  return {
    total: db.links.length,
    pending: db.links.filter(l => !l.category).length
  };
}

/**
 * 获取所有原始数据（用于同步上传）
 */
function getAllData() {
  const db = _getAll();
  return {
    links: db.links,
    notes: db.notes
  };
}

/**
 * 导入服务器数据（同步下载后合并）
 */
function importData({ links = [], notes = [] }) {
  const db = _getAll();

  // 简单策略：按 url 去重合并链接，按 content+createTime 去重合并感悟
  const existingUrls = new Set(db.links.map(l => l.url));
  let addedLinks = 0;
  links.forEach(link => {
    if (!existingUrls.has(link.url)) {
      link._id = db._meta.nextLinkId++;
      db.links.push(link);
      addedLinks++;
    }
  });

  const existingNoteKeys = new Set(db.notes.map(n => `${n.content}_${n.createTime}`));
  let addedNotes = 0;
  notes.forEach(note => {
    const key = `${note.content}_${note.createTime}`;
    if (!existingNoteKeys.has(key)) {
      note._id = db._meta.nextNoteId++;
      db.notes.push(note);
      addedNotes++;
    }
  });

  _saveAll(db);
  return { addedLinks, addedNotes };
}

module.exports = {
  // 链接
  getLinks,
  getLinkById,
  addLink,
  updateLink,
  deleteLink,
  searchLinks,
  getVideoLinks,
  // 感悟
  getNotes,
  getNoteById,
  addNote,
  updateNote,
  deleteNote,
  searchNotes,
  // 统计
  getCategories,
  getTags,
  getStats,
  getLinkStats,
  // 同步
  getAllData,
  importData
};
