// services/note.js
// 感悟相关服务

const { get, post, put, del } = require('../utils/request');

/**
 * 获取感悟列表
 */
async function getNotes({ page = 1, pageSize = 20 }) {
  const res = await get('/notes', { page, pageSize });
  return res;
}

/**
 * 根据 ID 获取感悟详情
 */
async function getNoteById(id) {
  const res = await get(`/notes/${id}`);
  return res;
}

/**
 * 添加感悟
 */
async function addNote(noteData) {
  const res = await post('/notes', noteData);
  return res;
}

/**
 * 更新感悟
 */
async function updateNote(id, data) {
  const res = await put(`/notes/${id}`, data);
  return res;
}

/**
 * 删除感悟
 */
async function deleteNote(id) {
  const res = await del(`/notes/${id}`);
  return res;
}

/**
 * 搜索感悟
 */
async function searchNotes(keyword) {
  const res = await get('/notes/search', { keyword });
  return res;
}

module.exports = {
  getNotes,
  getNoteById,
  addNote,
  updateNote,
  deleteNote,
  searchNotes
};
