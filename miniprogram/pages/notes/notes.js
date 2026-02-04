// pages/notes/notes.js
const app = getApp();
const noteService = require('../../services/note');

Page({
  data: {
    notes: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20
  },

  onLoad() {
    this.loadNotes();
  },

  onShow() {
    const needRefresh = wx.getStorageSync('needRefreshNotes');
    if (needRefresh) {
      wx.removeStorageSync('needRefreshNotes');
      this.refreshNotes();
    }
  },

  // 加载感悟列表
  async loadNotes() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const { page, pageSize } = this.data;
      const res = await noteService.getNotes({ page, pageSize });

      const newNotes = res.data || [];
      this.setData({
        notes: page === 1 ? newNotes : [...this.data.notes, ...newNotes],
        hasMore: newNotes.length >= pageSize,
        page: page + 1
      });
    } catch (err) {
      console.error('加载感悟失败：', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 刷新列表
  refreshNotes() {
    this.setData({
      notes: [],
      page: 1,
      hasMore: true
    }, () => {
      this.loadNotes();
    });
  },

  onPullDownRefresh() {
    this.refreshNotes();
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    this.loadNotes();
  },

  // 新建感悟
  goToAdd() {
    wx.navigateTo({ url: '/pages/note-edit/note-edit' });
  },

  // 编辑感悟
  goToEdit(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/note-edit/note-edit?id=${id}` });
  },

  // 长按删除
  onLongPress(e) {
    const id = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;

    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success: async (res) => {
        if (res.tapIndex === 0) {
          this.goToEdit(e);
        } else if (res.tapIndex === 1) {
          wx.showModal({
            title: '确认删除',
            content: '确定要删除这条感悟吗？',
            success: async (modalRes) => {
              if (modalRes.confirm) {
                await this.deleteNote(id, index);
              }
            }
          });
        }
      }
    });
  },

  // 删除感悟
  async deleteNote(id, index) {
    try {
      await noteService.deleteNote(id);
      const notes = [...this.data.notes];
      notes.splice(index, 1);
      this.setData({ notes });
      wx.showToast({ title: '已删除', icon: 'success' });
    } catch (err) {
      console.error('删除失败：', err);
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  onShareAppMessage() {
    return {
      title: '记忆万物 - 记录你的每一个感悟',
      path: '/pages/notes/notes'
    };
  }
});
