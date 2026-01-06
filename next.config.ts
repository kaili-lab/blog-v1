import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 关键配置：告诉 Next.js 不要打包这些包，直接使用 node_modules 中的版本，升级Nextjs16之后遇到的问题：因为使用tiktoken，Nextjs16的tuebo导致tiktoken无法被正确打包，所以需要告诉Nextjs不要打包tiktoken
  // transliteration 包在 Next.js 16 Turbopack 构建时无法正确解析浏览器版本，需要外部化处理
  serverExternalPackages: ["tiktoken", "@dqbd/tiktoken", "transliteration"],

  /* config options here */

  // 🚀 生产环境优化：自动移除 console.log
  // 保留 console.error 和 console.warn 用于错误追踪
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"], // 保留错误和警告日志
          }
        : false, // 开发环境保留所有日志
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            // 禁止你的网站被嵌入到任何<iframe>中,防止点击劫持攻击（Clickjacking）
            // blog通常不需要被嵌入，用DENY没问题
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            // 强制浏览器严格按照Content-Type解析资源,防止MIME类型嗅探攻击——浏览器可能把文本文件当作脚本执行
            // 通用防护，建议所有项目都加上
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },

  images: {
    // 启用 Next.js 图片优化
    unoptimized: false,
    // 配置允许的远程图片域名
    remotePatterns: [
      // Google 用户头像
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      // GitHub 用户头像
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
      // Cloudinary 图片 - 主要配置
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      // Pollinations.ai 图片
      {
        protocol: "https",
        hostname: "image.pollinations.ai",
        pathname: "/**",
      },
      // Placeholder 图片
      {
        protocol: "https",
        hostname: "via.placeholder.com",
        pathname: "/**",
      },
    ],
    // 图片优化配置
    formats: ["image/webp", "image/avif"], // 优先使用现代格式
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048], // 设备尺寸
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // 图片尺寸
    minimumCacheTTL: 60, // 最小缓存时间（秒）
  },
};

export default nextConfig;
