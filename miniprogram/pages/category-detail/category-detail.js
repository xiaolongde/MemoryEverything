// pages/category-detail/category-detail.js
// 分类详情页 - 显示某分类或标签下的所有内容

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
      const db = wx.cloud.database();
      const _ = db.command;
      let query = {};

      if (this.data.isPending) {
        query = { category: '' };
      } else if (this.data.category) {
        query = { category: this.data.category };
      } else if (this.data.tag) {
        query = { tags: _.elemMatch(_.eq(this.data.tag)) };
      }

      const res = await db.collection('links')
        .where(query)
        .orderBy('createTime', 'desc')
        .limit(50)
        .get();

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
