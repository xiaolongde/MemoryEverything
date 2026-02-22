// app.js
const { post } = require('./utils/request');

App({
  globalData: {
    userInfo: null,
    openid: null,
    isLogin: false,
    pendingLink: null,  // 待添加的链接
    lastClipboard: ''   // 上次剪贴板内容（避免重复提示）
  },

  onLaunch() {
    // 登录获取 openid
    this.login();
  },

  // 每次小程序显示时检测剪贴板
  onShow() {
    this.checkClipboard();
  },

  // 检测剪贴板中的链接
  async checkClipboard() {
    try {
      const res = await wx.getClipboardData();
      const content = res.data?.trim();
      
      // 没有内容或与上次相同，跳过
      if (!content || content === this.globalData.lastClipboard) {
        return;
      }

      // 检测是否是链接
      if (this.isValidUrl(content)) {
        this.globalData.lastClipboard = content;
        this.globalData.pendingLink = content;
        
        // 弹窗提示用户
        wx.showModal({
          title: '检测到链接',
          content: this.truncateUrl(content),
          confirmText: '立即添加',
          cancelText: '忽略',
          success: (modalRes) => {
            if (modalRes.confirm) {
              // 跳转到添加页面
              wx.navigateTo({
                url: `/pages/add-link/add-link?url=${encodeURIComponent(content)}`
              });
            }
            this.globalData.pendingLink = null;
          }
        });
      }
    } catch (err) {
      // 用户可能拒绝了剪贴板权限，静默处理
      console.log('读取剪贴板失败', err);
    }
  },

  // 验证是否是有效链接
  isValidUrl(str) {
    if (!str) return false;
    // 匹配 http/https 链接
    const urlPattern = /^https?:\/\/[\w\-]+(\.[\w\-]+)+([\w\-.,@?^=%&:\/~+#]*[\w\-@?^=%&\/~+#])?$/i;
    // 也支持短链接格式
    const shortUrlPattern = /^https?:\/\/[\w\-]+\.[\w]{2,}/i;
    return urlPattern.test(str) || shortUrlPattern.test(str);
  },

  // 截断过长的 URL 用于显示
  truncateUrl(url, maxLength = 50) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  },

  // 登录：使用 wx.login 获取 code，发送给后台换取 openid 和 token
  async login() {
    // 先从缓存获取
    const token = wx.getStorageSync('token');
    const openid = wx.getStorageSync('openid');
    if (token && openid) {
      this.globalData.openid = openid;
      this.globalData.isLogin = true;
      return openid;
    }

    try {
      const loginRes = await wx.login();
      const res = await post('/auth/login', { code: loginRes.code });
      if (res.openid) {
        this.globalData.openid = res.openid;
        this.globalData.isLogin = true;
        wx.setStorageSync('openid', res.openid);
        if (res.token) {
          wx.setStorageSync('token', res.token);
        }
        return res.openid;
      }
    } catch (err) {
      console.error('登录失败：', err);
    }
    return null;
  },

  // 获取用户信息
  async getUserInfo() {
    if (this.globalData.userInfo) {
      return this.globalData.userInfo;
    }

    try {
      const res = await wx.getUserProfile({
        desc: '用于完善用户资料'
      });
      this.globalData.userInfo = res.userInfo;
      wx.setStorageSync('userInfo', res.userInfo);
      return res.userInfo;
    } catch (err) {
      console.error('获取用户信息失败：', err);
      return null;
    }
  }
});
