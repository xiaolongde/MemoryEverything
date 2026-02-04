// pages/organize/organize.js
// 整理页 - AI 自动分类视图

const categoryService = require('../../services/category');
const linkService = require('../../services/link');

Page({
  data: {
    categories: [],
    tags: [],
    pendingCount: 0,  // 待处理数量
    totalCount: 0,
    loading: false
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    const needRefresh = wx.getStorageSync('needRefreshCategory') || 
                        wx.getStorageSync('needRefreshTimeline');
    if (needRefresh) {
      wx.removeStorageSync('needRefreshCategory');
      this.loadData();
    }
  },

  // 加载分类和标签数据
  async loadData() {
    this.setData({ loading: true });

    try {
      const [categoriesRes, tagsRes, statsRes] = await Promise.all([
        categoryService.getCategories(),
        categoryService.getTags(),
        this.getStats()
      ]);

      this.setData({
        categories: categoriesRes.data || [],
        tags: tagsRes.data || [],
        totalCount: statsRes.total || 0,
        pendingCount: statsRes.pending || 0
      });
    } catch (err) {
      console.error('加载数据失败：', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 获取统计数据
  async getStats() {
    try {
      const db = wx.cloud.database();
      const totalRes = await db.collection('links').count();
      // 待处理：没有分类的链接
      const pendingRes = await db.collection('links')
        .where({ category: '' })
        .count();
      
      return {
        total: totalRes.total || 0,
        pending: pendingRes.total || 0
      };
    } catch (err) {
      return { total: 0, pending: 0 };
    }
  },

  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  },

  // 点击分类
  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category;
    wx.navigateTo({
      url: `/pages/category-detail/category-detail?category=${encodeURIComponent(category)}`
    });
  },

  // 点击标签
  onTagTap(e) {
    const tag = e.currentTarget.dataset.tag;
    wx.navigateTo({
      url: `/pages/category-detail/category-detail?tag=${encodeURIComponent(tag)}`
    });
  },

  // 处理待整理
  onPendingTap() {
    wx.navigateTo({
      url: '/pages/category-detail/category-detail?pending=1'
    });
  }
});
