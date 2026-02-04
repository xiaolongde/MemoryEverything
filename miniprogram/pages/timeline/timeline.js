// pages/timeline/timeline.js
// 动态页 - 时间线流水账，类似文件传输助手

const app = getApp();
const linkService = require('../../services/link');
const noteService = require('../../services/note');
const { formatTime } = require('../../utils/format');

Page({
  data: {
    items: [],        // 混合的时间线数据
    loading: false,
    refreshing: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    showAddMenu: false  // 是否显示添加菜单
  },

  onLoad() {
    this.loadTimeline();
  },

  onShow() {
    // 检查是否需要刷新
    const needRefresh = wx.getStorageSync('needRefreshTimeline');
    if (needRefresh) {
      wx.removeStorageSync('needRefreshTimeline');
      this.refreshTimeline();
    }
  },

  // 加载时间线数据
  async loadTimeline() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const { page, pageSize } = this.data;
      
      // 并行获取链接和感悟
      const [linksRes, notesRes] = await Promise.all([
        linkService.getLinks({ page, pageSize }),
        noteService.getNotes({ page, pageSize })
      ]);

      // 合并并按时间排序
      const links = (linksRes.data || []).map(item => ({
        ...item,
        itemType: 'link',
        displayTime: formatTime(item.createTime)
      }));

      const notes = (notesRes.data || []).map(item => ({
        ...item,
        itemType: 'note',
        displayTime: formatTime(item.createTime)
      }));

      const newItems = [...links, ...notes].sort((a, b) => {
        const timeA = a.createTime?.$date || a.createTime || 0;
        const timeB = b.createTime?.$date || b.createTime || 0;
        return new Date(timeB) - new Date(timeA);
      });

      // 判断是否还有更多
      const hasMore = links.length >= pageSize || notes.length >= pageSize;

      this.setData({
        items: page === 1 ? newItems : [...this.data.items, ...newItems],
        hasMore,
        page: page + 1
      });
    } catch (err) {
      console.error('加载时间线失败：', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false, refreshing: false });
    }
  },

  // 刷新时间线
  refreshTimeline() {
    this.setData({
      items: [],
      page: 1,
      hasMore: true,
      refreshing: true
    }, () => {
      this.loadTimeline();
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.refreshTimeline();
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom() {
    this.loadTimeline();
  },

  // 切换添加菜单
  toggleAddMenu() {
    this.setData({ showAddMenu: !this.data.showAddMenu });
  },

  // 隐藏添加菜单
  hideAddMenu() {
    this.setData({ showAddMenu: false });
  },

  // 添加链接
  goToAddLink() {
    this.hideAddMenu();
    wx.navigateTo({ url: '/pages/add-link/add-link' });
  },

  // 添加感悟
  goToAddNote() {
    this.hideAddMenu();
    wx.navigateTo({ url: '/pages/note-edit/note-edit' });
  },

  // 跳转到搜索
  goToSearch() {
    wx.switchTab({ url: '/pages/search/search' });
  },

  // 点击链接项
  onLinkTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/link-detail/link-detail?id=${id}` });
  },

  // 点击感悟项
  onNoteTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/note-edit/note-edit?id=${id}` });
  },

  // 长按删除
  onItemLongPress(e) {
    const { id, type } = e.currentTarget.dataset;
    
    wx.showActionSheet({
      itemList: ['删除'],
      success: async (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '确认删除',
            content: '确定要删除吗？',
            success: async (modalRes) => {
              if (modalRes.confirm) {
                await this.deleteItem(id, type);
              }
            }
          });
        }
      }
    });
  },

  // 删除项目
  async deleteItem(id, type) {
    try {
      if (type === 'link') {
        await linkService.deleteLink(id);
      } else {
        await noteService.deleteNote(id);
      }
      
      // 从列表中移除
      const items = this.data.items.filter(item => item._id !== id);
      this.setData({ items });
      
      wx.showToast({ title: '已删除', icon: 'success' });
    } catch (err) {
      console.error('删除失败：', err);
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '记忆万物 - 收藏你的每一个灵感',
      path: '/pages/timeline/timeline'
    };
  }
});
