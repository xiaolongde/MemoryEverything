// services/link.js
// 链接相关服务

const { get, post, put, del } = require('../utils/request');

/**
 * 获取链接列表
 */
async function getLinks({ category = '', page = 1, pageSize = 20 }) {
  const res = await get('/links', { category, page, pageSize });
  return res;
}

/**
 * 根据 ID 获取链接详情
 */
async function getLinkById(id) {
  const res = await get(`/links/${id}`);
  return res;
}

/**
 * 添加链接
 */
async function addLink(linkData) {
  const res = await post('/links', linkData);
  return res;
}

/**
 * 更新链接
 */
async function updateLink(id, data) {
  const res = await put(`/links/${id}`, data);
  return res;
}

/**
 * 删除链接
 */
async function deleteLink(id) {
  const res = await del(`/links/${id}`);
  return res;
}

/**
 * 搜索链接
 */
async function searchLinks(keyword) {
  const res = await get('/links/search', { keyword });
  return res;
}

/**
 * 按分类获取链接
 */
async function getLinksByCategory(category) {
  const res = await get('/links', { category, pageSize: 100 });
  return res;
}

/**
 * 按标签获取链接
 */
async function getLinksByTag(tag) {
  const res = await get('/links', { tag, pageSize: 100 });
  return res;
}

module.exports = {
  getLinks,
  getLinkById,
  addLink,
  updateLink,
  deleteLink,
  searchLinks,
  getLinksByCategory,
  getLinksByTag
};
