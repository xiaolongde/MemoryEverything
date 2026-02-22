// 云函数入口文件 - aiInsight
// AI 深度解读：提取核心观点、深度洞察和思考问题

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
  MODEL: 'qwen-turbo'
};

// 构建深度解读 Prompt
function buildInsightPrompt(title, description, summary, url) {
  return `你是一个内容深度分析专家。请对以下内容进行深度解读：

**内容信息**：
- 标题：${title || '无'}
- 描述：${description || '无'}
- 一句话摘要：${summary || '无'}
- URL：${url || '无'}

**请返回 JSON 格式（不要包含任何其他内容，包括 markdown 代码块标记）**：
{
  "keyPoints": [
    {
      "title": "核心观点1的标题",
      "content": "观点的详细描述（1-2句话，50-80字）",
      "importance": 1
    }
  ],
  "insights": {
    "value": "这篇内容的核心价值是什么？为什么值得收藏？（50-100字）",
    "inspiration": "这篇内容可以给我们什么启发？有什么新的思考角度？（50-100字）",
    "application": "这些观点可以应用在哪些具体场景？如何实践？（50-100字）",
    "connection": "这篇内容与哪些知识领域或概念相关？可以联想到什么？（50-100字）"
  },
  "questions": [
    "一个引导深度思考的问题，帮助读者结合自身经验思考",
    "一个关于实践应用的问题，启发读者思考如何落地",
    "一个批判性思考的问题，引导读者多角度审视观点"
  ]
}

**要求**：
1. keyPoints：提取 3-5 个最核心的观点，按重要性排序（importance: 1-5）
2. insights：每项 50-100 字，要有深度和启发性
3. questions：生成 3-5 个启发性问题，帮助用户深入思考和撰写点评
4. 用中文输出，语言精炼专业，避免空话套话
5. 如果内容信息不足，基于标题和常识进行合理推测，但要保持客观

请严格按照上述 JSON 格式返回，不要添加任何额外的文字说明或 markdown 标记。`;
}

// 调用通义千问 API
async function callQwenAPI(prompt) {
  try {
    const response = await axios.post(
      AI_CONFIG.QWEN_API_URL,
      {
        model: AI_CONFIG.MODEL,
        input: {
          messages: [
            {
              role: 'system',
              content: '你是一个专业的内容分析专家，擅长深度解读文章内容，提炼核心观点和洞察。你的分析要有深度、有启发性，避免空话套话。'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        parameters: {
          result_format: 'message',
          temperature: 0.7,  // 适当的创造性
          top_p: 0.8,
          max_tokens: 2000
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${AI_CONFIG.QWEN_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000  // 60秒超时
      }
    );

    const content = response.data?.output?.choices?.[0]?.message?.content || '';
    return content;
  } catch (error) {
    console.error('调用通义千问 API 失败：', error.message);
    throw error;
  }
}

// 解析 AI 返回的 JSON
function parseAIResponse(content) {
  try {
    // 移除可能的 markdown 代码块标记
    let jsonStr = content.trim();
    jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');

    // 提取 JSON 对象
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('未找到有效的 JSON 格式');
    }

    const result = JSON.parse(jsonMatch[0]);

    // 验证和规范化数据
    const normalized = {
      keyPoints: [],
      insights: {
        value: '',
        inspiration: '',
        application: '',
        connection: ''
      },
      questions: []
    };

    // 处理核心观点
    if (Array.isArray(result.keyPoints)) {
      normalized.keyPoints = result.keyPoints
        .filter(point => point.title && point.content)
        .map((point, index) => ({
          title: truncate(point.title, 30),
          content: truncate(point.content, 150),
          importance: point.importance || (index + 1)
        }))
        .slice(0, 5);  // 最多 5 个
    }

    // 处理深度洞察
    if (result.insights && typeof result.insights === 'object') {
      normalized.insights.value = truncate(result.insights.value || '', 200);
      normalized.insights.inspiration = truncate(result.insights.inspiration || '', 200);
      normalized.insights.application = truncate(result.insights.application || '', 200);
      normalized.insights.connection = truncate(result.insights.connection || '', 200);
    }

    // 处理思考问题
    if (Array.isArray(result.questions)) {
      normalized.questions = result.questions
        .filter(q => typeof q === 'string' && q.trim().length > 0)
        .map(q => truncate(q, 100))
        .slice(0, 5);  // 最多 5 个
    }

    // 验证是否有有效内容
    if (normalized.keyPoints.length === 0 &&
        !normalized.insights.value &&
        normalized.questions.length === 0) {
      throw new Error('AI 返回的内容为空或无效');
    }

    return normalized;
  } catch (error) {
    console.error('解析 AI 返回失败：', error.message);
    console.error('原始内容：', content);
    throw new Error('解析 AI 响应失败：' + error.message);
  }
}

// 截断文本到指定长度
function truncate(text, maxLength) {
  if (!text) return '';
  text = text.trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// 生成本地降级方案（当 AI 不可用时）
function generateFallbackInsight(title, description, summary) {
  const content = `${title} ${description} ${summary}`;

  return {
    keyPoints: [
      {
        title: '内容要点',
        content: summary || description || '暂无摘要，建议阅读原文了解详情。',
        importance: 1
      }
    ],
    insights: {
      value: '这篇内容值得你收藏，建议仔细阅读并结合自身经验思考。',
      inspiration: '每个人从内容中获得的启发都不同，建议记录下你的个人见解。',
      application: '思考如何将这些内容应用到你的工作或生活中。',
      connection: '尝试将这篇内容与你已有的知识体系建立联系。'
    },
    questions: [
      '这篇内容解决了什么问题？',
      '你能从中获得什么启发？',
      '如何将这些想法应用到实践中？'
    ]
  };
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { linkId, title, description, summary, url } = event;

  console.log('收到 AI 深度解读请求：', { linkId, title });

  try {
    // 检查是否已有缓存（从数据库读取）
    if (linkId) {
      const db = cloud.database();
      const linkDoc = await db.collection('links').doc(linkId).get();

      if (linkDoc.data && linkDoc.data.aiInsight) {
        console.log('使用缓存的 AI 解读结果');
        return {
          success: true,
          data: linkDoc.data.aiInsight,
          cached: true
        };
      }
    }

    // 如果没有配置 API Key，使用降级方案
    if (!AI_CONFIG.QWEN_API_KEY || AI_CONFIG.QWEN_API_KEY === 'your-api-key-here') {
      console.log('未配置 AI API，使用降级方案');
      const fallbackResult = generateFallbackInsight(title, description, summary);

      return {
        success: true,
        data: {
          ...fallbackResult,
          generatedAt: new Date(),
          modelVersion: 'fallback'
        },
        fallback: true
      };
    }

    // 构建 prompt
    const prompt = buildInsightPrompt(title, description, summary, url);

    // 调用 AI API
    console.log('调用通义千问 API...');
    const aiResponse = await callQwenAPI(prompt);
    console.log('AI 返回内容长度：', aiResponse.length);

    // 解析返回结果
    const result = parseAIResponse(aiResponse);

    // 添加元数据
    const finalResult = {
      ...result,
      generatedAt: new Date(),
      modelVersion: AI_CONFIG.MODEL
    };

    // 保存到数据库（如果提供了 linkId）
    if (linkId) {
      const db = cloud.database();
      await db.collection('links').doc(linkId).update({
        data: {
          aiInsight: finalResult
        }
      });
      console.log('AI 解读结果已保存到数据库');
    }

    return {
      success: true,
      data: finalResult
    };
  } catch (error) {
    console.error('AI 深度解读失败：', error);

    // 失败时使用降级方案
    const fallbackResult = generateFallbackInsight(title, description, summary);

    return {
      success: true,
      data: {
        ...fallbackResult,
        generatedAt: new Date(),
        modelVersion: 'fallback'
      },
      fallback: true,
      error: error.message
    };
  }
};
