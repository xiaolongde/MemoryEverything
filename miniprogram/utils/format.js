// utils/format.js
// 格式化工具函数

/**
 * 格式化时间
 */
function formatTime(date) {
  if (!date) return '';
  
  // 如果是时间戳或字符串，转换为 Date 对象
  if (typeof date === 'number' || typeof date === 'string') {
    date = new Date(date);
  }
  
  // 如果是云开发的时间对象
  if (date.$date) {
    date = new Date(date.$date);
  }

  const now = new Date();
  const diff = now - date;
  
  // 小于1分钟
  if (diff < 60 * 1000) {
    return '刚刚';
  }
  
  // 小于1小时
  if (diff < 60 * 60 * 1000) {
    return Math.floor(diff / (60 * 1000)) + '分钟前';
  }
  
  // 小于24小时
  if (diff < 24 * 60 * 60 * 1000) {
    return Math.floor(diff / (60 * 60 * 1000)) + '小时前';
  }
  
  // 小于7天
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return Math.floor(diff / (24 * 60 * 60 * 1000)) + '天前';
  }
  
  // 其他情况显示日期
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // 同一年不显示年份
  if (year === now.getFullYear()) {
    return `${month}-${day}`;
  }
  
  return `${year}-${month}-${day}`;
}

/**
 * 格式化数字（超过1000显示为1k）
 */
function formatNumber(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return String(num);
}

/**
 * 截断文本
 */
function truncate(str, length = 50) {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

module.exports = {
  formatTime,
  formatNumber,
  truncate
};
