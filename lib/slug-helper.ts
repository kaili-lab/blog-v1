// 明确导入 Node.js 版本，避免 Turbopack 选择浏览器版本导致构建失败
import { slugify } from "transliteration/dist/node/src/node/index.js";

export function generateSlug(
  text: string,
  options: {
    maxLength?: number;
    separator?: string;
    replace?: Record<string, string>;
  } = {}
) {
  const {
    maxLength = 50,
    separator = "-",
    replace = {
      前端: "frontend",
      后端: "backend",
      全栈: "fullstack",
      开发: "development",
      框架: "framework",
      数据库: "database",
      教程: "tutorial",
      学习: "learning",
      实战: "practice",
      指南: "guide",
    },
  } = options;

  if (!text || typeof text !== "string") {
    return "";
  }

  const slug = slugify(text.trim(), {
    lowercase: true,
    separator,
    replace,
  });

  return slug.substring(0, maxLength).replace(new RegExp(`${separator}$`), "");
}
