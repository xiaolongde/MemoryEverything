// services/category.js
// 分类相关服务

const { get } = require('../utils/request');

/**
 * 获取分类列表（带统计）
 */
async function getCategories() {
  const res = await get('/categories');
  return res;
}

/**
 * 获取标签列表（带统计）
 */
async function getTags() {
  const res = await get('/tags');
  return res;
}

module.exports = {
  getCategories,
  getTags
};
