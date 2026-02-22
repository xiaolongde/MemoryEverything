// server/routes/ai.js
// AI 功能路由（可选，无 AI 配置时使用降级方案）

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

/**
 * POST /ai/insight
 * 生成 AI 深度解读
 */
router.post('/insight', async (req, res) => {
  try {
    const { linkId, title, description, summary, url } = req.body;

    const aiApiUrl = process.env.AI_API_URL;
    const aiApiKey = process.env.AI_API_KEY;

    let insightData;

    if (aiApiUrl && aiApiKey) {
      // 如果配置了 AI API，调用远程 AI
      try {
        const axios = require('axios');
        const aiRes = await axios.post(aiApiUrl, {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: '你是一个帮助用户理解和分析文章的助手。请根据提供的信息生成深度解读。'
            },
            {
              role: 'user',
              content: `请分析以下链接内容：\n标题：${title}\n描述：${description}\n摘要：${summary}\n链接：${url}\n\n请提供：1. 核心要点（3个左右）2. 思考问题（2-3个）3. 一句话总结`
            }
          ]
        }, {
          headers: {
            'Authorization': `Bearer ${aiApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });

        const content = aiRes.data.choices?.[0]?.message?.content || '';
        insightData = parseAIInsight(content);
      } catch (aiErr) {
        console.error('AI API 调用失败，使用降级方案：', aiErr.message);
        insightData = generateFallbackInsight(title, description);
      }
    } else {
      // 无 AI 配置，使用降级方案
      insightData = generateFallbackInsight(title, description);
    }

    // 保存到数据库
    if (linkId) {
      const db = getDB();
      db.prepare('UPDATE links SET ai_insight = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
        .run(JSON.stringify(insightData), linkId, req.userId);
    }

    res.json({
      success: true,
      data: insightData,
      fallback: !aiApiUrl || !aiApiKey
    });
  } catch (err) {
    console.error('生成 AI 解读失败：', err);
    res.status(500).json({ success: false, message: '生成失败' });
  }
});

/**
 * POST /ai/assist-comment
 * AI 辅助点评
 */
router.post('/assist-comment', async (req, res) => {
  try {
    const { title, aiInsight, userInput } = req.body;

    const aiApiUrl = process.env.AI_API_URL;
    const aiApiKey = process.env.AI_API_KEY;

    let suggestions;

    if (aiApiUrl && aiApiKey) {
      try {
        const axios = require('axios');
        const aiRes = await axios.post(aiApiUrl, {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: '你是一个帮助用户撰写文章点评的助手。请提供3条点评建议。'
            },
            {
              role: 'user',
              content: `文章标题：${title}\n${aiInsight ? 'AI 解读：' + JSON.stringify(aiInsight) : ''}\n用户已输入：${userInput || '（空）'}\n\n请提供3条不同角度的点评建议，每条50-100字。以JSON数组格式返回：["建议1", "建议2", "建议3"]`
            }
          ]
        }, {
          headers: {
            'Authorization': `Bearer ${aiApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });

        const content = aiRes.data.choices?.[0]?.message?.content || '';
        try {
          // 尝试从回复中提取 JSON 数组
          const match = content.match(/\[[\s\S]*\]/);
          suggestions = match ? JSON.parse(match[0]) : generateFallbackSuggestions(title);
        } catch {
          suggestions = generateFallbackSuggestions(title);
        }
      } catch (aiErr) {
        console.error('AI API 调用失败：', aiErr.message);
        suggestions = generateFallbackSuggestions(title);
      }
    } else {
      suggestions = generateFallbackSuggestions(title);
    }

    res.json({
      success: true,
      data: { suggestions },
      fallback: !aiApiUrl || !aiApiKey
    });
  } catch (err) {
    console.error('获取点评建议失败：', err);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

/**
 * 降级方案：生成简单的解读
 */
function generateFallbackInsight(title, description) {
  return {
    keyPoints: [
      `这篇内容讨论了「${title || '未知主题'}」相关话题`,
      description ? `主要内容：${description.substring(0, 100)}` : '尚无详细描述，建议阅读原文了解更多',
      '建议结合自己的经验和需求来理解这篇内容'
    ],
    questions: [
      '这篇内容的核心观点是什么？你是否认同？',
      '这对你的工作/生活有什么启发？',
      '你会如何将这些知识应用到实际中？'
    ],
    summary: `关于「${title || '未知主题'}」的内容，值得深入阅读和思考。`
  };
}

/**
 * 降级方案：生成点评建议
 */
function generateFallbackSuggestions(title) {
  return [
    `这篇关于「${title}」的内容让我印象深刻，尤其是其中关于核心概念的阐述，值得反复品味。`,
    `读完「${title}」后，我认为其中的方法论可以应用到日常工作中，特别是在提升效率方面。`,
    `「${title}」提出了一些独特的视角，虽然有些观点我还需要进一步验证，但整体启发很大。`
  ];
}

/**
 * 从 AI 回复中解析解读数据
 */
function parseAIInsight(content) {
  // 简单解析，AI 回复格式可能不固定
  const lines = content.split('\n').filter(l => l.trim());
  const keyPoints = [];
  const questions = [];
  let summary = '';
  let section = '';

  for (const line of lines) {
    if (line.includes('核心要点') || line.includes('要点')) {
      section = 'points';
      continue;
    }
    if (line.includes('思考问题') || line.includes('问题')) {
      section = 'questions';
      continue;
    }
    if (line.includes('总结') || line.includes('一句话')) {
      section = 'summary';
      continue;
    }

    const cleaned = line.replace(/^[\d\.\-\*\s]+/, '').trim();
    if (!cleaned) continue;

    if (section === 'points') keyPoints.push(cleaned);
    else if (section === 'questions') questions.push(cleaned);
    else if (section === 'summary') summary = cleaned;
  }

  return {
    keyPoints: keyPoints.length > 0 ? keyPoints : ['暂无要点'],
    questions: questions.length > 0 ? questions : ['这篇内容对你有什么启发？'],
    summary: summary || content.substring(0, 100)
  };
}

module.exports = router;
