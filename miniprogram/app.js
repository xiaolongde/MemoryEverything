// app.js
App({
  globalData: {
    userInfo: null,
    openid: null,
    isLogin: false
  },

  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'your-env-id', // 替换为你的云开发环境 ID
        traceUser: true
      });
    }

    // 获取用户 openid
    this.getOpenid();
  },

  // 获取用户 openid
  async getOpenid() {
    // 先从缓存获取
    const openid = wx.getStorageSync('openid');
    if (openid) {
      this.globalData.openid = openid;
      this.globalData.isLogin = true;
      return openid;
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'getOpenid'
      });
      if (res.result && res.result.openid) {
        this.globalData.openid = res.result.openid;
        this.globalData.isLogin = true;
        wx.setStorageSync('openid', res.result.openid);
        return res.result.openid;
      }
    } catch (err) {
      console.error('获取 openid 失败：', err);
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
