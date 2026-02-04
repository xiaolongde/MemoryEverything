// pages/category/category.js
const categoryService = require('../../services/category');

Page({
  data: {
    categories: [],
    tags: [],
    loading: false
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    const needRefresh = wx.getStorageSync('needRefreshCategory');
    if (needRefresh) {
      wx.removeStorageSync('needRefreshCategory');
      this.loadData();
    }
  },

  // 加载分类和标签数据
  async loadData() {
    this.setData({ loading: true });

    try {
      const [categoriesRes, tagsRes] = await Promise.all([
        categoryService.getCategories(),
        categoryService.getTags()
      ]);

      this.setData({
        categories: categoriesRes.data || [],
        tags: tagsRes.data || []
      });
    } catch (err) {
      console.error('加载数据失败：', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  },

  // 点击分类，跳转到分类下的链接列表
  goToCategoryLinks(e) {
    const category = e.currentTarget.dataset.category;
    wx.navigateTo({
      url: `/pages/search/search?category=${encodeURIComponent(category)}`
    });
  },

  // 点击标签，跳转到标签下的链接列表
  goToTagLinks(e) {
    const tag = e.currentTarget.dataset.tag;
    wx.navigateTo({
      url: `/pages/search/search?tag=${encodeURIComponent(tag)}`
    });
  }
});
