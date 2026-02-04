// utils/storage.js
// 本地存储工具

const CACHE_PREFIX = 'me_';
const CACHE_EXPIRE = 24 * 60 * 60 * 1000; // 默认缓存24小时

/**
 * 设置缓存
 */
function setCache(key, data, expire = CACHE_EXPIRE) {
  const cacheKey = CACHE_PREFIX + key;
  const cacheData = {
    data,
    expire: Date.now() + expire
  };
  
  try {
    wx.setStorageSync(cacheKey, cacheData);
    return true;
  } catch (err) {
    console.error('设置缓存失败：', err);
    return false;
  }
}

/**
 * 获取缓存
 */
function getCache(key) {
  const cacheKey = CACHE_PREFIX + key;
  
  try {
    const cacheData = wx.getStorageSync(cacheKey);
    
    if (!cacheData) return null;
    
    // 检查是否过期
    if (cacheData.expire && Date.now() > cacheData.expire) {
      wx.removeStorageSync(cacheKey);
      return null;
    }
    
    return cacheData.data;
  } catch (err) {
    console.error('获取缓存失败：', err);
    return null;
  }
}

/**
 * 删除缓存
 */
function removeCache(key) {
  const cacheKey = CACHE_PREFIX + key;
  
  try {
    wx.removeStorageSync(cacheKey);
    return true;
  } catch (err) {
    console.error('删除缓存失败：', err);
    return false;
  }
}

/**
 * 清除所有应用缓存
 */
function clearAllCache() {
  try {
    const res = wx.getStorageInfoSync();
    const keys = res.keys.filter(key => key.startsWith(CACHE_PREFIX));
    
    keys.forEach(key => {
      wx.removeStorageSync(key);
    });
    
    return true;
  } catch (err) {
    console.error('清除缓存失败：', err);
    return false;
  }
}

module.exports = {
  setCache,
  getCache,
  removeCache,
  clearAllCache
};
