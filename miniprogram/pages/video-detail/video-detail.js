// pages/video-detail/video-detail.js
const linkService = require('../../services/link');
const { formatTime } = require('../../utils/format');

Page({
  data: {
    video: null,
    loading: true,
    extracting: false,
    commentContent: '',
    rating: 0,
    categories: ['教程', '知识科普', '生活记录', '搞笑', '种草', '其他']
  },

  onLoad(options) {
    if (options.id) {
      this.loadVideo(options.id);
    }
  },

  async loadVideo(id) {
    this.setData({ loading: true });
    try {
      const res = await linkService.getLinkById(id);
      if (res.data) {
        const video = res.data;
        video.createTimeStr = formatTime(video.createTime);
        this.setData({
          video,
          commentContent: video.comment?.content || '',
          rating: video.comment?.rating || 0
        });
      }
    } catch (err) {
      console.error('加载视频详情失败：', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  extractKeyPoints() {
    const { video } = this.data;
    if (!video || this.data.extracting) return;

    this.setData({ extracting: true });
    try {
      const res = linkService.extractKeyPoints(video._id);
      if (res.success) {
        this.setData({ 'video.keyPoints': res.data });
        wx.showToast({ title: '提取成功', icon: 'success' });
      } else {
        wx.showToast({ title: '提取失败', icon: 'none' });
      }
    } catch (err) {
      console.error('提取要点失败：', err);
      wx.showToast({ title: '提取失败', icon: 'none' });
    } finally {
      this.setData({ extracting: false });
    }
  },

  openOriginal() {
    const url = this.data.video?.url;
    if (!url) return;
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({ title: '链接已复制，去微信打开', icon: 'none' });
      }
    });
  },

  onCategoryChange(e) {
    const index = e.detail.value;
    const category = this.data.categories[index];
    const { video } = this.data;
    if (!video) return;

    linkService.updateLink(video._id, { category });
    this.setData({ 'video.category': category });
    wx.showToast({ title: '分类已更新', icon: 'success' });
    wx.setStorageSync('needRefreshLinks', true);
  },

  onRatingChange(e) {
    this.setData({ rating: e.currentTarget.dataset.rating });
  },

  onCommentInput(e) {
    this.setData({ commentContent: e.detail.value });
  },

  async saveComment() {
    const { video, commentContent, rating } = this.data;
    if (!video) return;

    wx.showLoading({ title: '保存中...' });
    try {
      await linkService.updateLink(video._id, {
        comment: {
          content: commentContent,
          rating: rating,
          updateTime: new Date().toISOString()
        }
      });
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      wx.setStorageSync('needRefreshLinks', true);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  deleteVideo() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个视频收藏吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await linkService.deleteLink(this.data.video._id);
            wx.setStorageSync('needRefreshLinks', true);
            wx.navigateBack();
            wx.showToast({ title: '已删除', icon: 'success' });
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  onShareAppMessage() {
    const { video } = this.data;
    return {
      title: video?.title || '分享一个视频',
      path: `/pages/video-detail/video-detail?id=${video?._id}`
    };
  }
});
