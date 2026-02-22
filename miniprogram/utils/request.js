// utils/request.js
// HTTP 请求封装，对接后台服务器

const { API_CONFIG } = require('./constants');

/**
 * 通用请求方法
 * @param {string} url - 接口路径（不含 baseUrl）
 * @param {Object} options - 请求配置
 * @param {string} options.method - 请求方法，默认 GET
 * @param {Object} options.data - 请求体/查询参数
 * @param {Object} options.header - 自定义请求头
 * @returns {Promise<Object>} 响应数据（已解包 data 字段）
 */
function request(url, { method = 'GET', data = {}, header = {} } = {}) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token') || '';

    wx.request({
      url: `${API_CONFIG.BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...header
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          // token 过期，清除登录态
          wx.removeStorageSync('token');
          wx.removeStorageSync('openid');
          reject(new Error('登录已过期，请重新登录'));
        } else {
          reject(new Error(res.data?.message || `请求失败 (${res.statusCode})`));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'));
      }
    });
  });
}

/**
 * 上传文件
 * @param {string} url - 接口路径
 * @param {string} filePath - 本地文件路径
 * @param {string} name - 文件对应的 key
 * @param {Object} formData - 额外表单数据
 * @returns {Promise<Object>}
 */
function uploadFile(url, { filePath, name = 'file', formData = {} } = {}) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token') || '';

    wx.uploadFile({
      url: `${API_CONFIG.BASE_URL}${url}`,
      filePath,
      name,
      formData,
      header: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(res.data));
          } catch {
            resolve(res.data);
          }
        } else {
          reject(new Error(`上传失败 (${res.statusCode})`));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '上传失败'));
      }
    });
  });
}

// 便捷方法
const get = (url, data) => request(url, { method: 'GET', data });
const post = (url, data) => request(url, { method: 'POST', data });
const put = (url, data) => request(url, { method: 'PUT', data });
const del = (url, data) => request(url, { method: 'DELETE', data });

module.exports = {
  request,
  uploadFile,
  get,
  post,
  put,
  del
};
