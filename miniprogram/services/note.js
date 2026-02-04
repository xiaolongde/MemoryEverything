// services/note.js
// 感悟相关服务

const db = wx.cloud.database();
const _ = db.command;

/**
 * 获取感悟列表
 */
async function getNotes({ page = 1, pageSize = 20 }) {
  const skip = (page - 1) * pageSize;
  
  const res = await db.collection('notes')
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get();
  
  return res;
}

/**
 * 根据 ID 获取感悟详情
 */
async function getNoteById(id) {
  const res = await db.collection('notes').doc(id).get();
  return res;
}

/**
 * 添加感悟
 */
async function addNote(noteData) {
  const res = await db.collection('notes').add({
    data: {
      ...noteData,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
  });
  
  return res;
}

/**
 * 更新感悟
 */
async function updateNote(id, data) {
  const res = await db.collection('notes').doc(id).update({
    data: {
      ...data,
      updateTime: db.serverDate()
    }
  });
  return res;
}

/**
 * 删除感悟
 */
async function deleteNote(id) {
  const res = await db.collection('notes').doc(id).remove();
  return res;
}

/**
 * 搜索感悟
 */
async function searchNotes(keyword) {
  const res = await db.collection('notes')
    .where(_.or([
      { content: db.RegExp({ regexp: keyword, options: 'i' }) },
      { tags: db.RegExp({ regexp: keyword, options: 'i' }) }
    ]))
    .orderBy('createTime', 'desc')
    .limit(50)
    .get();
  
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
