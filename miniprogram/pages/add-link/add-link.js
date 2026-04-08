// pages/add-link/add-link.js
const linkService = require('../../services/link');

Page({
  data: {
    url: '',
    title: '',
    description: '',
    category: '',
    categories: ['技术', '生活', '娱乐', '工作', '学习', '阅读', '视频', '其他'],
    parsing: false,
    saving: false,
    useAI: true
  },

  onLoad(options) {
    // 从分享进入时，可能带有 url 参数
    if (options.url) {
      this.setData({ url: decodeURIComponent(options.url) });
      this.parseLink();
    }
  },

  // URL 输入
  onUrlInput(e) {
    this.setData({ url: e.detail.value });
  },

  // 标题输入
  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  // 描述输入
  onDescInput(e) {
    this.setData({ description: e.detail.value });
  },

  // 分类选择
  onCategoryChange(e) {
    const index = e.detail.value;
    this.setData({ category: this.data.categories[index] });
  },

  // AI 分类开关
  onAISwitchChange(e) {
    this.setData({ useAI: e.detail.value });
  },

  // 解析链接
  async parseLink() {
    const { url } = this.data;
    if (!url.trim()) {
      wx.showToast({ title: '请输入链接', icon: 'none' });
      return;
    }

    // 简单验证 URL 格式
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      wx.showToast({ title: '请输入有效的链接', icon: 'none' });
      return;
    }

    this.setData({ parsing: true });

    try {
      // 本地模式：简单提取域名作为标题
      const urlObj = url.match(/^https?:\/\/([^\/]+)/);
      const domain = urlObj ? urlObj[1] : '';

      // 判断来源
      let source = 'external';
      if (url.includes('mp.weixin.qq.com')) {
        source = 'wechat_article';
      } else if (
        url.includes('channels.weixin.qq.com') ||
        url.includes('finder.video.qq.com') ||
        (url.includes('weixin.qq.com') && url.includes('video'))
      ) {
        source = 'wechat_video';
      }

      this.setData({
        title: domain ? `来自 ${domain} 的${source === 'wechat_video' ? '视频' : '链接'}` : '',
        source
      });

      wx.showToast({
        title: source === 'wechat_video' ? '检测到视频号链接' : '请手动填写标题',
        icon: 'none'
      });
    } catch (err) {
      console.error('解析链接失败：', err);
      wx.showToast({ title: '解析失败', icon: 'none' });
    } finally {
      this.setData({ parsing: false });
    }
  },

  // 粘贴链接
  async pasteUrl() {
    try {
      const res = await wx.getClipboardData();
      if (res.data) {
        this.setData({ url: res.data }, () => {
          if (res.data.startsWith('http')) {
            this.parseLink();
          }
        });
      }
    } catch (err) {
      console.log('获取剪贴板失败');
    }
  },

  // 保存链接
  async save() {
    const { url, title, description, category, useAI, saving, thumbnail, source } = this.data;

    if (saving) return;

    if (!url.trim()) {
      wx.showToast({ title: '请输入链接', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      const linkData = {
        url: url.trim(),
        title: title.trim() || url,
        description: description.trim(),
        thumbnail: thumbnail || '',
        source: source || 'external',
        category: category || '',
        useAI
      };

      await linkService.addLink(linkData);

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });

      // 标记需要刷新列表
      wx.setStorageSync('needRefreshLinks', true);
      wx.setStorageSync('needRefreshCategory', true);

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      wx.hideLoading();
      console.error('保存失败：', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
