// pages/search/search.js
const linkService = require('../../services/link');
const noteService = require('../../services/note');

Page({
  data: {
    keyword: '',
    category: '',
    tag: '',
    activeTab: 'link', // link | note
    links: [],
    notes: [],
    loading: false,
    searched: false,
    historyList: []
  },

  onLoad(options) {
    // 从分类/标签页跳转过来
    if (options.category) {
      this.setData({ category: decodeURIComponent(options.category) });
      this.searchByCategory();
    } else if (options.tag) {
      this.setData({ tag: decodeURIComponent(options.tag) });
      this.searchByTag();
    }

    // 加载搜索历史
    const history = wx.getStorageSync('searchHistory') || [];
    this.setData({ historyList: history });
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  // 执行搜索
  async doSearch() {
    const { keyword } = this.data;
    if (!keyword.trim()) {
      wx.showToast({ title: '请输入搜索内容', icon: 'none' });
      return;
    }

    // 保存搜索历史
    this.saveHistory(keyword.trim());

    this.setData({
      loading: true,
      searched: true,
      category: '',
      tag: ''
    });

    try {
      const [linksRes, notesRes] = await Promise.all([
        linkService.searchLinks(keyword),
        noteService.searchNotes(keyword)
      ]);

      this.setData({
        links: linksRes.data || [],
        notes: notesRes.data || []
      });
    } catch (err) {
      console.error('搜索失败：', err);
      wx.showToast({ title: '搜索失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 按分类搜索
  async searchByCategory() {
    const { category } = this.data;
    this.setData({ loading: true, searched: true });

    try {
      const res = await linkService.getLinksByCategory(category);
      this.setData({
        links: res.data || [],
        activeTab: 'link'
      });
    } catch (err) {
      console.error('搜索失败：', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 按标签搜索
  async searchByTag() {
    const { tag } = this.data;
    this.setData({ loading: true, searched: true });

    try {
      const res = await linkService.getLinksByTag(tag);
      this.setData({
        links: res.data || [],
        activeTab: 'link'
      });
    } catch (err) {
      console.error('搜索失败：', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 切换 Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 保存搜索历史
  saveHistory(keyword) {
    let history = wx.getStorageSync('searchHistory') || [];
    
    // 移除重复的
    history = history.filter(item => item !== keyword);
    
    // 添加到开头
    history.unshift(keyword);
    
    // 最多保留10条
    if (history.length > 10) {
      history = history.slice(0, 10);
    }

    wx.setStorageSync('searchHistory', history);
    this.setData({ historyList: history });
  },

  // 点击历史记录
  onHistoryTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ keyword }, () => {
      this.doSearch();
    });
  },

  // 清除搜索历史
  clearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定要清除搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('searchHistory');
          this.setData({ historyList: [] });
        }
      }
    });
  },

  // 跳转到链接详情
  goToLinkDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/link-detail/link-detail?id=${id}` });
  },

  // 跳转到感悟编辑
  goToNoteEdit(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/note-edit/note-edit?id=${id}` });
  }
});
