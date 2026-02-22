// pages/category-detail/category-detail.js
// 分类详情页 - 显示某分类或标签下的所有内容

const linkService = require('../../services/link');

Page({
  data: {
    title: '',
    category: '',
    tag: '',
    isPending: false,
    list: [],
    loading: false
  },

  onLoad(options) {
    const { category, tag, pending } = options;
    
    if (pending === '1') {
      this.setData({ 
        title: '待整理',
        isPending: true 
      });
    } else if (category) {
      this.setData({ 
        title: decodeURIComponent(category),
        category: decodeURIComponent(category)
      });
    } else if (tag) {
      this.setData({ 
        title: `#${decodeURIComponent(tag)}`,
        tag: decodeURIComponent(tag)
      });
    }

    wx.setNavigationBarTitle({ title: this.data.title });
    this.loadList();
  },

  async loadList() {
    this.setData({ loading: true });

    try {
      let res;

      if (this.data.isPending) {
        res = await linkService.getLinks({ category: '', pageSize: 50 });
        // 过滤出没有分类的链接
        res.data = (res.data || []).filter(item => !item.category);
      } else if (this.data.category) {
        res = await linkService.getLinksByCategory(this.data.category);
      } else if (this.data.tag) {
        res = await linkService.getLinksByTag(this.data.tag);
      } else {
        res = { data: [] };
      }

      this.setData({
        list: res.data || []
      });
    } catch (err) {
      console.error('加载列表失败：', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onPullDownRefresh() {
    this.loadList();
    wx.stopPullDownRefresh();
  },

  onItemTap(e) {
    const item = e.currentTarget.dataset.item;
    wx.navigateTo({
      url: `/pages/link-detail/link-detail?id=${item._id}`
    });
  }
});
