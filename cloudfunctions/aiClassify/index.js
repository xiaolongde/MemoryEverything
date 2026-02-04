// 云函数入口文件 - aiClassify
const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// AI API 配置（请替换为实际的 API 配置）
const AI_CONFIG = {
  // 通义千问 API
  QWEN_API_URL: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
  QWEN_API_KEY: 'your-api-key-here', // 替换为你的 API Key
  
  // 或者使用其他 AI 服务
  // OPENAI_API_URL: 'https://api.openai.com/v1/chat/completions',
  // OPENAI_API_KEY: 'your-openai-key'
};

// 分类候选列表
const CATEGORIES = ['技术', '生活', '娱乐', '工作', '学习', '阅读', '视频', '音乐', '购物', '美食', '旅行', '健康', '财经', '其他'];

// 构建 Prompt
function buildPrompt(title, description, url) {
  return `你是一个内容分类助手。请分析以下内容，返回 JSON 格式结果。

内容信息：
- 标题：${title || '无'}
- 描述：${description || '无'}
- URL：${url || '无'}

请返回以下 JSON 格式（只返回 JSON，不要包含其他内容）：
{
  "category": "最匹配的分类",
  "tags": ["标签1", "标签2", "标签3"],
  "summary": "一句话摘要（不超过50字）"
}

分类候选：${CATEGORIES.join('、')}
标签：请根据内容提取3-5个关键词作为标签`;
}

// 调用通义千问 API
async function callQwenAPI(prompt) {
  const response = await axios.post(
    AI_CONFIG.QWEN_API_URL,
    {
      model: 'qwen-turbo',
      input: {
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      parameters: {
        result_format: 'message'
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.QWEN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  const content = response.data?.output?.choices?.[0]?.message?.content || '';
  return content;
}

// 解析 AI 返回的 JSON
function parseAIResponse(content) {
  try {
    // 尝试提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      
      // 验证分类是否在候选列表中
      if (!CATEGORIES.includes(result.category)) {
        result.category = '其他';
      }
      
      // 确保 tags 是数组
      if (!Array.isArray(result.tags)) {
        result.tags = [];
      }
      
      // 限制标签数量
      result.tags = result.tags.slice(0, 5);
      
      // 限制摘要长度
      if (result.summary && result.summary.length > 100) {
        result.summary = result.summary.substring(0, 100);
      }
      
      return result;
    }
  } catch (err) {
    console.error('解析 AI 返回失败：', err);
  }
  
  return {
    category: '其他',
    tags: [],
    summary: ''
  };
}

// 简单的本地分类（备用方案）
function localClassify(title, description, url) {
  const text = `${title} ${description} ${url}`.toLowerCase();
  
  const rules = [
    { keywords: ['代码', '编程', '开发', 'api', 'github', 'npm', 'code', 'javascript', 'python', 'react', 'vue', '前端', '后端', '算法'], category: '技术' },
    { keywords: ['视频', 'video', 'bilibili', 'youtube', '抖音', '快手', 'tv'], category: '视频' },
    { keywords: ['音乐', 'music', '歌曲', '网易云', 'spotify', 'qq音乐'], category: '音乐' },
    { keywords: ['学习', '课程', '教程', '培训', '考试', '大学', '教育'], category: '学习' },
    { keywords: ['阅读', '书籍', '小说', '文章', 'book', '图书'], category: '阅读' },
    { keywords: ['工作', '招聘', '简历', '职场', '办公', 'hr', '面试'], category: '工作' },
    { keywords: ['购物', '淘宝', '京东', '拼多多', '商品', '优惠', '电商'], category: '购物' },
    { keywords: ['美食', '菜谱', '餐厅', '食物', '烹饪', '吃'], category: '美食' },
    { keywords: ['旅行', '旅游', '酒店', '机票', '景点', '出行'], category: '旅行' },
    { keywords: ['健康', '医疗', '健身', '养生', '运动', '减肥'], category: '健康' },
    { keywords: ['财经', '股票', '基金', '理财', '投资', '金融'], category: '财经' },
    { keywords: ['游戏', '电竞', 'game', '娱乐', '直播'], category: '娱乐' },
    { keywords: ['生活', '日常', '家居', '宠物', '家庭'], category: '生活' }
  ];
  
  for (const rule of rules) {
    if (rule.keywords.some(keyword => text.includes(keyword))) {
      return {
        category: rule.category,
        tags: [],
        summary: ''
      };
    }
  }
  
  return {
    category: '其他',
    tags: [],
    summary: ''
  };
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { title, description, url } = event;

  try {
    // 如果没有配置 API Key，使用本地分类
    if (!AI_CONFIG.QWEN_API_KEY || AI_CONFIG.QWEN_API_KEY === 'your-api-key-here') {
      console.log('未配置 AI API，使用本地分类');
      const result = localClassify(title, description, url);
      return {
        success: true,
        data: result
      };
    }

    // 构建 prompt
    const prompt = buildPrompt(title, description, url);
    
    // 调用 AI API
    const aiResponse = await callQwenAPI(prompt);
    
    // 解析返回结果
    const result = parseAIResponse(aiResponse);

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('AI 分类失败：', error);
    
    // 失败时使用本地分类作为备用
    const fallbackResult = localClassify(title, description, url);
    
    return {
      success: true,
      data: fallbackResult,
      fallback: true
    };
  }
};
