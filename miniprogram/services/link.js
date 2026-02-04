// services/link.js
// 链接相关服务

const db = wx.cloud.database();
const _ = db.command;

/**
 * 获取链接列表
 */
async function getLinks({ category = '', page = 1, pageSize = 20 }) {
  const skip = (page - 1) * pageSize;
  
  let query = db.collection('links').orderBy('createTime', 'desc');
  
  if (category) {
    query = query.where({ category });
  }
  
  const res = await query.skip(skip).limit(pageSize).get();
  return res;
}

/**
 * 根据 ID 获取链接详情
 */
async function getLinkById(id) {
  const res = await db.collection('links').doc(id).get();
  return res;
}

/**
 * 添加链接
 */
async function addLink(linkData) {
  // 如果开启了 AI 分类，调用云函数
  if (linkData.useAI) {
    try {
      const aiRes = await wx.cloud.callFunction({
        name: 'aiClassify',
        data: {
          title: linkData.title,
          description: linkData.description,
          url: linkData.url
        }
      });
      
      if (aiRes.result && aiRes.result.success) {
        const { category, tags, summary } = aiRes.result.data;
        linkData.category = linkData.category || category;
        linkData.tags = tags || [];
        linkData.summary = summary || '';
      }
    } catch (err) {
      console.error('AI 分类失败：', err);
    }
  }

  delete linkData.useAI;
  
  const res = await db.collection('links').add({
    data: {
      ...linkData,
      isRead: false,
      isFavorite: false,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
  });
  
  return res;
}

/**
 * 更新链接
 */
async function updateLink(id, data) {
  const res = await db.collection('links').doc(id).update({
    data: {
      ...data,
      updateTime: db.serverDate()
    }
  });
  return res;
}

/**
 * 删除链接
 */
async function deleteLink(id) {
  const res = await db.collection('links').doc(id).remove();
  return res;
}

/**
 * 搜索链接
 */
async function searchLinks(keyword) {
  const res = await db.collection('links')
    .where(_.or([
      { title: db.RegExp({ regexp: keyword, options: 'i' }) },
      { description: db.RegExp({ regexp: keyword, options: 'i' }) },
      { tags: db.RegExp({ regexp: keyword, options: 'i' }) }
    ]))
    .orderBy('createTime', 'desc')
    .limit(50)
    .get();
  
  return res;
}

/**
 * 按分类获取链接
 */
async function getLinksByCategory(category) {
  const res = await db.collection('links')
    .where({ category })
    .orderBy('createTime', 'desc')
    .limit(100)
    .get();
  
  return res;
}

/**
 * 按标签获取链接
 */
async function getLinksByTag(tag) {
  const res = await db.collection('links')
    .where({ tags: tag })
    .orderBy('createTime', 'desc')
    .limit(100)
    .get();
  
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
