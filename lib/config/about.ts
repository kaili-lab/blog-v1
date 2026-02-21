import { Briefcase, FileText, Github, Linkedin } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * 社交媒体链接配置
 * 统一管理所有社交媒体链接，避免重复
 */
export const socialLinks = {
  github: {
    url: "https://github.com/kaili-lab",
    label: "GitHub",
  },
  linkedin: {
    url: "https://www.linkedin.com/in/kai-li-696024230/",
    label: "LinkedIn",
  },
} as const;

/**
 * 个人信息配置
 */
export const profileConfig = {
  title: "Full-Stack Developer & AI Engineer",
  description: "Java backend roots, TypeScript full-stack, and AI Agent development",
  portfolioUrl: "https://kaili.dev",
  portfolioLabel: "View Full Portfolio",
} as const;

/**
 * 关于我的文本内容
 */
export const aboutContent = {
  paragraph1:
    "Full-Stack Developer with 5+ years of experience — Java backend roots, TypeScript full-stack, and AI Agent development. Hands-on with Spring Boot, Next.js, React, and data infrastructure including PostgreSQL, MySQL, Redis, and Kafka.",
  paragraph2:
    "I ship products efficiently using AI tooling while keeping engineering fundamentals solid. Remote-ready and open to new roles.",
} as const;

/**
 * 技能标签列表
 */
export const skills = [
  "Java",
  "TypeScript",
  "JavaScript",
  "Spring Boot",
  "Next.js",
  "React",
  "Express.js",
  "Hono",
  "LangChain",
  "Vercel AI SDK",
  "OpenAI API",
  "Vector Search",
  "PostgreSQL",
  "MySQL",
  "Redis",
  "Kafka",
  "English (Working Proficiency)",
  "Remote Collaboration",
] as const;

/**
 * 快速链接配置
 */
export interface QuickLink {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  external?: boolean;
}

export const quickLinks: QuickLink[] = [
  {
    title: "Portfolio",
    description: "View my work & projects",
    icon: Briefcase,
    href: "/portfolio",
  },
  {
    title: "Blog Posts",
    description: "Read my technical articles",
    icon: FileText,
    href: "/posts",
  },
  {
    title: "GitHub",
    description: "Check out my code",
    icon: Github,
    href: socialLinks.github.url,
    external: true,
  },
  {
    title: "LinkedIn",
    description: "Connect with me professionally",
    icon: Linkedin,
    href: socialLinks.linkedin.url,
    external: true,
  },
];
