// pages/index/index.js
const app = getApp();
const linkService = require('../../services/link');

Page({
  data: {
    links: [],
    categories: ['全部', '技术', '生活', '娱乐', '工作', '学习', '其他'],
    currentCategory: '全部',
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20
  },

  onLoad() {
    this.loadLinks();
  },

  onShow() {
    // 检查是否需要刷新
    const needRefresh = wx.getStorageSync('needRefreshLinks');
    if (needRefresh) {
      wx.removeStorageSync('needRefreshLinks');
      this.refreshLinks();
    }

    // 检查是否有待添加的链接（从剪贴板识别）
    if (app.globalData.pendingLink) {
      // app.js 中已经处理了弹窗，这里不需要重复处理
    }
  },

  // 加载链接列表
  async loadLinks() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const { currentCategory, page, pageSize } = this.data;
      const res = await linkService.getLinks({
        category: currentCategory === '全部' ? '' : currentCategory,
        page,
        pageSize
      });

      const newLinks = res.data || [];
      this.setData({
        links: page === 1 ? newLinks : [...this.data.links, ...newLinks],
        hasMore: newLinks.length >= pageSize,
        page: page + 1
      });
    } catch (err) {
      console.error('加载链接失败：', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 刷新链接列表
  refreshLinks() {
    this.setData({
      links: [],
      page: 1,
      hasMore: true
    }, () => {
      this.loadLinks();
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.refreshLinks();
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom() {
    this.loadLinks();
  },

  // 切换分类
  onCategoryChange(e) {
    const category = e.currentTarget.dataset.category;
    if (category === this.data.currentCategory) return;

    this.setData({
      currentCategory: category,
      links: [],
      page: 1,
      hasMore: true
    }, () => {
      this.loadLinks();
    });
  },

  // 跳转到搜索页
  goToSearch() {
    wx.navigateTo({ url: '/pages/search/search' });
  },

  // 跳转到添加链接页
  goToAddLink() {
    wx.navigateTo({ url: '/pages/add-link/add-link' });
  },

  // 跳转到链接详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/link-detail/link-detail?id=${id}` });
  },

  // 长按删除
  onLongPress(e) {
    const id = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;

    wx.showActionSheet({
      itemList: ['删除'],
      success: async (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '确认删除',
            content: '确定要删除这个链接吗？',
            success: async (modalRes) => {
              if (modalRes.confirm) {
                await this.deleteLink(id, index);
              }
            }
          });
        }
      }
    });
  },

  // 删除链接
  async deleteLink(id, index) {
    try {
      await linkService.deleteLink(id);
      const links = [...this.data.links];
      links.splice(index, 1);
      this.setData({ links });
      wx.showToast({ title: '已删除', icon: 'success' });
    } catch (err) {
      console.error('删除失败：', err);
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  // 处理分享
  onShareAppMessage() {
    return {
      title: '记忆万物 - 收藏你的每一个灵感',
      path: '/pages/index/index'
    };
  }
});
