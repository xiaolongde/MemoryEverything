// 云函数入口文件 - parseLink
const cloud = require('wx-server-sdk');
const axios = require('axios');
const cheerio = require('cheerio');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 云函数入口函数
exports.main = async (event, context) => {
  const { url } = event;

  if (!url) {
    return {
      success: false,
      message: '缺少 URL 参数'
    };
  }

  try {
    // 请求网页内容
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.0'
      },
      timeout: 10000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // 提取信息
    let title = '';
    let description = '';
    let thumbnail = '';
    let source = 'external';

    // 标题：优先使用 og:title，其次是 title 标签
    title = $('meta[property="og:title"]').attr('content') 
      || $('meta[name="title"]').attr('content')
      || $('title').text()
      || '';

    // 描述：优先使用 og:description
    description = $('meta[property="og:description"]').attr('content')
      || $('meta[name="description"]').attr('content')
      || '';

    // 缩略图：优先使用 og:image
    thumbnail = $('meta[property="og:image"]').attr('content')
      || $('meta[name="image"]').attr('content')
      || '';

    // 判断来源类型
    if (url.includes('mp.weixin.qq.com')) {
      source = 'wechat_article';
      
      // 微信文章特殊处理
      if (!title) {
        title = $('#activity-name').text().trim() || $('#js_article_title').text().trim();
      }
      if (!description) {
        description = $('#js_content').text().substring(0, 200).trim();
      }
    } else if (url.includes('channels.weixin.qq.com') || url.includes('video.weixin.qq.com')) {
      source = 'wechat_video';
    }

    // 清理数据
    title = title.trim().substring(0, 100);
    description = description.trim().substring(0, 500);

    return {
      success: true,
      data: {
        title,
        description,
        thumbnail,
        source
      }
    };
  } catch (error) {
    console.error('解析链接失败：', error);
    return {
      success: false,
      message: error.message || '解析失败'
    };
  }
};
