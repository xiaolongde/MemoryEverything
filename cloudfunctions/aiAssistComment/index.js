// 云函数入口文件 - aiAssistComment
// AI 辅助点评：根据 AI 解读生成点评建议

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

// 构建辅助点评 Prompt
function buildCommentPrompt(title, aiInsight, userInput) {
  const insightSummary = formatInsight(aiInsight);

  return `你是一个点评撰写助手。请根据以下信息帮助用户撰写点评：

**文章标题**：${title || '无'}

**AI 解读摘要**：
${insightSummary}

**用户已输入**：${userInput || '暂无'}

请生成 3 个不同角度的点评建议，每个建议 80-120 字。要求：

1. **实践应用角度**：从如何应用到工作/生活的角度撰写
2. **个人成长角度**：从对个人成长的启发角度撰写
3. **深度思考角度**：从批判性思考和多角度分析的角度撰写

每个点评应该：
- 结合内容的核心观点
- 有个人化的思考
- 语言真诚自然，避免空话套话
- 可以提出问题或延伸思考

返回 JSON 格式（不要包含任何其他内容，包括 markdown 代码块标记）：
{
  "suggestions": [
    {
      "angle": "实践应用",
      "content": "点评内容...",
      "icon": "🎯"
    },
    {
      "angle": "个人成长",
      "content": "点评内容...",
      "icon": "🌱"
    },
    {
      "angle": "深度思考",
      "content": "点评内容...",
      "icon": "🧠"
    }
  ]
}

请严格按照上述 JSON 格式返回，不要添加任何额外的文字说明或 markdown 标记。`;
}

// 格式化 AI 解读为简洁摘要
function formatInsight(aiInsight) {
  if (!aiInsight) return '暂无 AI 解读';

  let summary = '';

  // 添加核心观点
  if (aiInsight.keyPoints && aiInsight.keyPoints.length > 0) {
    summary += '核心观点：\n';
    aiInsight.keyPoints.slice(0, 3).forEach((point, index) => {
      summary += `${index + 1}. ${point.title}：${point.content}\n`;
    });
    summary += '\n';
  }

  // 添加关键洞察
  if (aiInsight.insights) {
    if (aiInsight.insights.value) {
      summary += `价值：${aiInsight.insights.value}\n`;
    }
    if (aiInsight.insights.inspiration) {
      summary += `启发：${aiInsight.insights.inspiration}\n`;
    }
  }

  return summary || '暂无详细解读';
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
              content: '你是一个点评撰写助手，擅长帮助用户撰写有深度、有见地的内容点评。你的建议要真诚、具体、有启发性。'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        parameters: {
          result_format: 'message',
          temperature: 0.8,  // 较高的创造性
          top_p: 0.9,
          max_tokens: 1500
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${AI_CONFIG.QWEN_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
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
    if (!result.suggestions || !Array.isArray(result.suggestions)) {
      throw new Error('返回格式错误：缺少 suggestions 数组');
    }

    const suggestions = result.suggestions
      .filter(s => s.angle && s.content)
      .map(s => ({
        angle: s.angle,
        content: truncate(s.content, 300),
        icon: s.icon || '💡'
      }))
      .slice(0, 3);  // 最多 3 个

    if (suggestions.length === 0) {
      throw new Error('未生成有效的点评建议');
    }

    return { suggestions };
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

// 生成本地降级建议
function generateFallbackSuggestions(title, aiInsight) {
  const suggestions = [
    {
      angle: '实践应用',
      content: `这篇关于"${title}"的内容提供了很多实用的观点。我计划将其中的方法应用到实际工作中，并观察效果。特别是需要注意在具体场景中如何灵活运用，避免生搬硬套。`,
      icon: '🎯'
    },
    {
      angle: '个人成长',
      content: `读完这篇内容，让我重新审视了自己的思维方式。文中提到的一些观点挑战了我之前的认知，这种认知冲突恰恰是成长的机会。我会持续关注这个领域的发展。`,
      icon: '🌱'
    },
    {
      angle: '深度思考',
      content: `虽然文章提出了一些有价值的观点，但也需要批判性地看待。不同场景下的适用性、可能的局限性、以及与其他理论的对比，都值得进一步探讨。`,
      icon: '🧠'
    }
  ];

  return { suggestions };
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { title, aiInsight, userInput } = event;

  console.log('收到 AI 辅助点评请求：', { title, hasInsight: !!aiInsight });

  try {
    // 如果没有配置 API Key，使用降级方案
    if (!AI_CONFIG.QWEN_API_KEY || AI_CONFIG.QWEN_API_KEY === 'your-api-key-here') {
      console.log('未配置 AI API，使用降级方案');
      const fallbackResult = generateFallbackSuggestions(title, aiInsight);
      return {
        success: true,
        data: fallbackResult,
        fallback: true
      };
    }

    // 构建 prompt
    const prompt = buildCommentPrompt(title, aiInsight, userInput);

    // 调用 AI API
    console.log('调用通义千问 API...');
    const aiResponse = await callQwenAPI(prompt);
    console.log('AI 返回内容长度：', aiResponse.length);

    // 解析返回结果
    const result = parseAIResponse(aiResponse);

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('AI 辅助点评失败：', error);

    // 失败时使用降级方案
    const fallbackResult = generateFallbackSuggestions(title, aiInsight);

    return {
      success: true,
      data: fallbackResult,
      fallback: true,
      error: error.message
    };
  }
};
