// pages/mine/mine.js
const app = getApp();
const localDb = require('../../utils/localDb');

Page({
  data: {
    userInfo: null,
    stats: {
      linkCount: 0,
      noteCount: 0,
      categoryCount: 0
    },
    isLogin: false,
    syncing: false
  },

  onLoad() {
    this.loadUserInfo();
    this.loadStats();
  },

  onShow() {
    this.loadStats();
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo,
        isLogin: true
      });
    }
  },

  // 加载统计数据
  loadStats() {
    const stats = localDb.getStats();
    this.setData({
      stats: {
        linkCount: stats.linkCount || 0,
        noteCount: stats.noteCount || 0,
        categoryCount: stats.categoryCount || 0
      }
    });
  },

  // 获取用户信息
  async getUserProfile() {
    try {
      const userInfo = await app.getUserInfo();
      if (userInfo) {
        this.setData({
          userInfo,
          isLogin: true
        });
      }
    } catch (err) {
      console.error('获取用户信息失败：', err);
    }
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除本地缓存吗？注意：本地数据将被清除，请先同步到服务器。',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          this.loadStats();
          wx.showToast({ title: '缓存已清除', icon: 'success' });
        }
      }
    });
  },

  // 一键同步到服务器
  async syncToServer() {
    if (this.data.syncing) return;
    this.setData({ syncing: true });
    wx.showLoading({ title: '同步中...' });

    try {
      const { syncToServer } = require('../../services/sync');
      const result = await syncToServer();

      wx.hideLoading();
      wx.showModal({
        title: result.success ? '同步完成' : '同步结果',
        content: result.message,
        showCancel: false
      });
    } catch (err) {
      wx.hideLoading();
      wx.showModal({
        title: '同步失败',
        content: err.message || '请检查服务器地址和网络连接',
        showCancel: false
      });
    } finally {
      this.setData({ syncing: false });
    }
  },

  // 导出数据
  exportData() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 跳转到视频收藏
  goVideoList() {
    wx.navigateTo({
      url: '/pages/video-list/video-list'
    });
  },

  // 关于
  goToAbout() {
    wx.showModal({
      title: '关于记忆万物',
      content: '版本：1.0.0\n\n一个帮助你收藏链接、记录感悟的小程序。\n\nAI 智能分类，让知识管理更轻松。',
      showCancel: false
    });
  },

  // 意见反馈
  feedback() {
    wx.showModal({
      title: '意见反馈',
      content: '如有问题或建议，请通过微信联系开发者。',
      showCancel: false
    });
  }
});
