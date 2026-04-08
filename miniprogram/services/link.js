// services/link.js
// 链接相关服务（本地存储）

const localDb = require('../utils/localDb');

async function getLinks({ category = '', tag = '', page = 1, pageSize = 20 } = {}) {
  return localDb.getLinks({ category, tag, page, pageSize });
}

async function getLinkById(id) {
  return localDb.getLinkById(id);
}

async function addLink(linkData) {
  return localDb.addLink(linkData);
}

async function updateLink(id, data) {
  return localDb.updateLink(id, data);
}

async function deleteLink(id) {
  return localDb.deleteLink(id);
}

async function searchLinks(keyword) {
  return localDb.searchLinks(keyword);
}

async function getLinksByCategory(category) {
  return localDb.getLinks({ category, pageSize: 100 });
}

async function getLinksByTag(tag) {
  return localDb.getLinks({ tag, pageSize: 100 });
}

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

module.exports = {
  getLinks,
  getLinkById,
  addLink,
  updateLink,
  deleteLink,
  searchLinks,
  getLinksByCategory,
  getLinksByTag,
  getVideoLinks,
  extractKeyPoints
};
