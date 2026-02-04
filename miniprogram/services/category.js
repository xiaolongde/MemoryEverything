// services/category.js
// 分类相关服务

const db = wx.cloud.database();
const _ = db.command;

/**
 * 获取分类列表（带统计）
 */
async function getCategories() {
  // 先获取所有链接的分类
  const linksRes = await db.collection('links')
    .field({ category: true })
    .limit(1000)
    .get();
  
  // 统计每个分类的数量
  const categoryCount = {};
  linksRes.data.forEach(link => {
    if (link.category) {
      categoryCount[link.category] = (categoryCount[link.category] || 0) + 1;
    }
  });

  // 预设分类及颜色
  const presetCategories = [
    { name: '技术', icon: '💻', color: '#1890ff' },
    { name: '生活', icon: '🏠', color: '#52c41a' },
    { name: '娱乐', icon: '🎮', color: '#eb2f96' },
    { name: '工作', icon: '💼', color: '#722ed1' },
    { name: '学习', icon: '📚', color: '#fa8c16' },
    { name: '阅读', icon: '📖', color: '#13c2c2' },
    { name: '视频', icon: '🎬', color: '#f5222d' },
    { name: '其他', icon: '📁', color: '#8c8c8c' }
  ];

  // 合并统计数据
  const categories = presetCategories.map(cat => ({
    ...cat,
    count: categoryCount[cat.name] || 0
  })).filter(cat => cat.count > 0);

  // 添加其他分类（用户自定义的）
  Object.keys(categoryCount).forEach(name => {
    if (!presetCategories.find(p => p.name === name)) {
      categories.push({
        name,
        icon: '📁',
        color: '#8c8c8c',
        count: categoryCount[name]
      });
    }
  });

  // 按数量排序
  categories.sort((a, b) => b.count - a.count);

  return { data: categories };
}

/**
 * 获取标签列表（带统计）
 */
async function getTags() {
  // 获取所有链接的标签
  const linksRes = await db.collection('links')
    .field({ tags: true })
    .limit(1000)
    .get();
  
  // 统计每个标签的数量
  const tagCount = {};
  linksRes.data.forEach(link => {
    if (link.tags && Array.isArray(link.tags)) {
      link.tags.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    }
  });

  // 转换为数组并排序
  const tags = Object.keys(tagCount).map(name => ({
    name,
    count: tagCount[name]
  })).sort((a, b) => b.count - a.count);

  return { data: tags };
}

module.exports = {
  getCategories,
  getTags
};
