// pages/mine/mine.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    stats: {
      linkCount: 0,
      noteCount: 0,
      categoryCount: 0
    },
    isLogin: false
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
  async loadStats() {
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      
      const [linkRes, noteRes, categoryRes] = await Promise.all([
        db.collection('links').count(),
        db.collection('notes').count(),
        db.collection('categories').count()
      ]);

      this.setData({
        stats: {
          linkCount: linkRes.total || 0,
          noteCount: noteRes.total || 0,
          categoryCount: categoryRes.total || 0
        }
      });
    } catch (err) {
      console.error('加载统计失败：', err);
    }
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
      content: '确定要清除本地缓存吗？云端数据不会被删除。',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.showToast({ title: '缓存已清除', icon: 'success' });
        }
      }
    });
  },

  // 导出数据
  exportData() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
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
