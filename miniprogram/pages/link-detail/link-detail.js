// pages/link-detail/link-detail.js
const linkService = require('../../services/link');
const { post } = require('../../utils/request');
const { formatTime } = require('../../utils/format');

Page({
  data: {
    link: null,
    loading: true,
    commentContent: '',
    rating: 0,
    generatingInsight: false,  // 是否正在生成 AI 解读
    showSuggestions: false,    // 是否显示点评建议弹窗
    loadingSuggestions: false, // 是否正在加载建议
    commentSuggestions: [],    // AI 点评建议列表
    suggestionsFallback: false // 是否使用降级建议
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

  // 生成 AI 深度解读
  async generateInsight() {
    const { link } = this.data;
    if (!link || this.data.generatingInsight) return;

    this.setData({ generatingInsight: true });

    try {
      const res = await post('/ai/insight', {
        linkId: link._id,
        title: link.title,
        description: link.description,
        summary: link.summary,
        url: link.url
      });

      if (res && res.success) {
        // 更新 link 数据
        this.setData({
          'link.aiInsight': res.data
        });

        wx.showToast({
          title: res.fallback ? '生成成功（降级）' : '生成成功',
          icon: 'success'
        });

        // 标记需要刷新列表
        wx.setStorageSync('needRefreshTimeline', true);
      } else {
        throw new Error('生成失败');
      }
    } catch (err) {
      console.error('生成 AI 解读失败：', err);
      wx.showToast({
        title: '生成失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ generatingInsight: false });
    }
  },

  // 点击思考问题
  onQuestionTap(e) {
    const question = e.currentTarget.dataset.question;
    if (!question) return;

    const currentComment = this.data.commentContent;
    const newComment = currentComment
      ? `${currentComment}\n\n${question}\n`
      : `${question}\n`;

    this.setData({ commentContent: newComment });

    wx.showToast({
      title: '已添加到点评',
      icon: 'success',
      duration: 1500
    });

    // 滚动到点评区域
    wx.pageScrollTo({
      selector: '.comment-section',
      duration: 300
    });
  },

  // 获取 AI 点评建议
  async getCommentSuggestions() {
    const { link, commentContent } = this.data;
    if (!link || this.data.loadingSuggestions) return;

    this.setData({
      showSuggestions: true,
      loadingSuggestions: true,
      commentSuggestions: [],
      suggestionsFallback: false
    });

    try {
      const res = await post('/ai/assist-comment', {
        title: link.title,
        aiInsight: link.aiInsight,
        userInput: commentContent
      });

      if (res && res.success) {
        this.setData({
          commentSuggestions: res.data.suggestions || [],
          suggestionsFallback: res.fallback || false
        });
      } else {
        throw new Error('获取建议失败');
      }
    } catch (err) {
      console.error('获取 AI 点评建议失败：', err);
      wx.showToast({
        title: '获取建议失败',
        icon: 'none'
      });
      this.closeSuggestions();
    } finally {
      this.setData({ loadingSuggestions: false });
    }
  },

  // 选择点评建议
  selectSuggestion(e) {
    const content = e.currentTarget.dataset.content;
    if (!content) return;

    this.setData({
      commentContent: content,
      showSuggestions: false
    });

    wx.showToast({
      title: '已应用建议',
      icon: 'success',
      duration: 1500
    });

    // 滚动到点评输入框
    wx.pageScrollTo({
      selector: '.comment-input',
      duration: 300
    });
  },

  // 关闭建议弹窗
  closeSuggestions() {
    this.setData({ showSuggestions: false });
  },

  // 阻止冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
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
