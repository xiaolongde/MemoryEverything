// pages/link-detail/link-detail.js
const linkService = require('../../services/link');
const { formatTime } = require('../../utils/format');

Page({
  data: {
    link: null,
    loading: true,
    commentContent: '',
    rating: 0
  },

  onLoad(options) {
    if (options.id) {
      this.loadLink(options.id);
    }
  },

  // 加载链接详情
  async loadLink(id) {
    this.setData({ loading: true });

    try {
      const res = await linkService.getLinkById(id);
      if (res.data) {
        const link = res.data;
        link.createTimeStr = formatTime(link.createTime);
        
        this.setData({
          link,
          commentContent: link.comment?.content || '',
          rating: link.comment?.rating || 0
        });
      }
    } catch (err) {
      console.error('加载链接详情失败：', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 打开链接
  openLink() {
    const url = this.data.link?.url;
    if (!url) return;

    // 复制链接
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({ title: '链接已复制', icon: 'success' });
      }
    });
  },

  // 在浏览器中打开（如果是网页链接）
  openInBrowser() {
    const url = this.data.link?.url;
    if (!url) return;

    // 检查是否是微信文章，可以直接打开
    if (url.includes('mp.weixin.qq.com')) {
      wx.navigateTo({
        url: `/pages/webview/webview?url=${encodeURIComponent(url)}`
      });
    } else {
      wx.setClipboardData({
        data: url,
        success: () => {
          wx.showToast({ title: '链接已复制，请在浏览器中打开', icon: 'none' });
        }
      });
    }
  },

  // 评分变化
  onRatingChange(e) {
    const rating = e.currentTarget.dataset.rating;
    this.setData({ rating });
  },

  // 点评内容变化
  onCommentInput(e) {
    this.setData({ commentContent: e.detail.value });
  },

  // 保存点评
  async saveComment() {
    const { link, commentContent, rating } = this.data;
    if (!link) return;

    wx.showLoading({ title: '保存中...' });

    try {
      await linkService.updateLink(link._id, {
        comment: {
          content: commentContent,
          rating: rating,
          updateTime: new Date()
        }
      });

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });

      // 标记需要刷新列表
      wx.setStorageSync('needRefreshLinks', true);
    } catch (err) {
      wx.hideLoading();
      console.error('保存点评失败：', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  // 切换收藏
  async toggleFavorite() {
    const { link } = this.data;
    if (!link) return;

    try {
      const newValue = !link.isFavorite;
      await linkService.updateLink(link._id, { isFavorite: newValue });

      this.setData({
        'link.isFavorite': newValue
      });

      wx.showToast({
        title: newValue ? '已收藏' : '已取消收藏',
        icon: 'success'
      });

      wx.setStorageSync('needRefreshLinks', true);
    } catch (err) {
      console.error('切换收藏失败：', err);
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  // 删除链接
  deleteLink() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个链接吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await linkService.deleteLink(this.data.link._id);
            wx.setStorageSync('needRefreshLinks', true);
            wx.navigateBack();
            wx.showToast({ title: '已删除', icon: 'success' });
          } catch (err) {
            console.error('删除失败：', err);
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 分享
  onShareAppMessage() {
    const { link } = this.data;
    return {
      title: link?.title || '分享一个链接',
      path: `/pages/link-detail/link-detail?id=${link?._id}`
    };
  }
});
