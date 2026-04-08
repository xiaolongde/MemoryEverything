// pages/video-list/video-list.js
const linkService = require('../../services/link');

Page({
  data: {
    videos: [],
    loading: true,
    page: 1,
    hasMore: true,
    activeCategory: '',
    categories: ['全部', '教程', '知识科普', '生活记录', '搞笑', '种草', '其他']
  },

  onLoad() {
    this.loadVideos();
  },

  onShow() {
    if (wx.getStorageSync('needRefreshLinks')) {
      wx.removeStorageSync('needRefreshLinks');
      this.setData({ videos: [], page: 1, hasMore: true });
      this.loadVideos();
    }
  },

  loadVideos() {
    this.setData({ loading: true });
    const { page, activeCategory } = this.data;

    try {
      const res = linkService.getVideoLinks({
        category: activeCategory,
        page,
        pageSize: 20
      });

      const newVideos = res.data || [];
      this.setData({
        videos: page === 1 ? newVideos : this.data.videos.concat(newVideos),
        hasMore: newVideos.length >= 20,
        loading: false
      });
    } catch (err) {
      console.error('加载视频列表失败：', err);
      this.setData({ loading: false });
    }
  },

  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category;
    const activeCategory = category === '全部' ? '' : category;
    this.setData({ activeCategory, videos: [], page: 1, hasMore: true });
    this.loadVideos();
  },

  onVideoTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/video-detail/video-detail?id=${id}`
    });
  },

  onPullDownRefresh() {
    this.setData({ videos: [], page: 1, hasMore: true });
    this.loadVideos();
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ page: this.data.page + 1 });
    this.loadVideos();
  },

  goAdd() {
    wx.navigateTo({ url: '/pages/add-link/add-link' });
  }
});
