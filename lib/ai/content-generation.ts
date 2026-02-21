import { getOpenAIClient } from "./openai-client";
import { logger } from "@/lib/logger";

/**
 * 检测文本主要语言
 */
const detectLanguage = (text: string): "zh" | "en" => {
  const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const totalChars = text.replace(/\s/g, "").length; // 去除空格后的字符数

  // 如果中文字符占比超过 30%，认为是中文
  return totalChars > 0 && chineseCharCount / totalChars > 0.3 ? "zh" : "en";
};

/**
 * Generate blog content summary using OpenAI
 * Automatically detects language and generates summary in the same language
 * @param content - The content prompt or topic
 * @returns Promise with generated summary text
 */
export async function generateBlogContent(content: string): Promise<string> {
  if (!content.trim()) {
    throw new Error("Content prompt is required");
  }

  try {
    const language = detectLanguage(content);

    const prompts = {
      zh: {
        system:
          "你是一个专业的技术博客编辑，擅长用简洁、具体、可视化的语言总结技术文章。",
        user: `为这篇博客主题生成摘要："${content}"

          要求：
          1. 字数：50-80字以内（最多3句话，不能更多）
          2. 必须包含：主要概念、关键机制/过程、具体成果
          3. 使用具体、可视化的表达 - 优先使用具体术语而非抽象概念
          4. 提及可触摸的元素，如：系统、流程、转换、关系、组件

          好的表达 vs 不好的表达：
          ❌ "提升开发体验" → ✅ "减少构建时间并简化组件架构"
          ❌ "讨论最佳实践" → ✅ "演示测试模式和调试工作流"  
          ❌ "涵盖高级概念" → ✅ "探索服务端与客户端之间的数据流动"

          这个摘要将用于：
          1. 帮助读者理解文章
          2. 生成编辑风格的插画封面

          重点关注可以被视觉化描绘的概念（流程、关系、前后状态、系统交互）。

          只输出摘要文本，不要任何格式标记。`,
      },
      en: {
        system:
          "You are a professional tech blog editor who excels at summarizing technical articles in concise, specific, and visualizable language.",
        user: `Generate a summary for this blog post topic: "${content}"

          Requirements:
          1. Length: 50-70 words maximum (2-3 sentences, no more)
          2. Must include: main concept, key mechanisms/processes, concrete outcomes
          3. Use specific, visualizable language - prefer concrete terms over abstractions
          4. Mention tangible elements like: systems, flows, transformations, relationships, components

          Examples of good vs bad phrasing:
          ❌ "improves developer experience" → ✅ "reduces build time and simplifies component architecture"
          ❌ "discusses best practices" → ✅ "demonstrates testing patterns and debugging workflows"
          ❌ "covers advanced concepts" → ✅ "explores data streaming between server and client"

          This summary will be used to:
          1. Help readers understand the article
          2. Generate an editorial illustration cover image

          Focus on concepts that can be visually depicted (processes, relationships, before/after states, system interactions).

          Output only the summary text, no formatting.`,
      },
    };

    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: prompts[language].system,
        },
        {
          role: "user",
          content: prompts[language].user,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const generatedText = response.choices[0]?.message?.content;

    if (!generatedText) {
      throw new Error("No content generated");
    }

    return generatedText.trim();
  } catch (error) {
    logger.error(
      "Content generation failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    // Re-throw the error so it can be caught by the calling component
    throw new Error("AI content generation failed, please try again!");
  }
}
