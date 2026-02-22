# AI Blog

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openai&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)

> 全栈博客平台：发布文章自动触发三阶段 AI Pipeline 生成封面图，搜索基于向量语义相似度而非关键词匹配。

**[🔗 在线 Demo](https://blog.kaili.dev)** · **[English](./README.md)**

---

<!-- SCREENSHOT: 录制一段 5–8 秒的 GIF，展示：在搜索框输入关键词 → 语义搜索结果出现 → 点击文章 → 顶部显示 AI 生成的封面图。保存为 public/demo.gif 后将此注释替换为：![Demo](./public/demo.gif) -->
> **截图待补充** — 部署后添加。

---

## ✨ 核心亮点

### 三阶段 AI 封面生成 Pipeline
发布文章时触发 Inngest 后台任务，按顺序执行三个步骤：GPT-4o-mini 生成 100–150 字摘要（自动识别中英文）、GPT-4o 将摘要转换为优化后的图像生成 prompt、`gpt-4o-image` 生成封面并以 WebP 格式上传至 Cloudinary。整个流程完全异步执行，任意步骤失败自动重试，发布操作本身立即返回，不受影响。

### pgvector 语义搜索
文章在发布时按段落边界分块处理——每块最多 8,191 个 token，相邻块保留 50 个 token 的重叠以保持上下文连贯性。每个分块通过 OpenAI `text-embedding-3-small` 生成 1536 维向量，存储在 PostgreSQL 的 `pgvector` 扩展中。搜索时对查询文本实时嵌入，按余弦相似度匹配，返回语义相关结果，而非简单关键词匹配。

### 双层频率限制与自动降级
评论和密码重置操作的频率限制采用双层架构：Vercel KV（Redis）作为主层提供快速内存检查，KV 不可用时自动切换至 PostgreSQL 兜底。限制规则按操作类型独立配置（`comment`：60 秒内最多 2 条；`password_reset`：15 分钟内最多 1 次）。

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 框架 | Next.js 16（App Router，Turbopack）|
| UI | React 19、Tailwind CSS v4、Radix UI、shadcn/ui |
| 语言 | TypeScript 5 |
| 数据库 | PostgreSQL（Neon Serverless）+ pgvector |
| ORM | Prisma 6 |
| 认证 | NextAuth v5 beta（JWT 策略）|
| AI | OpenAI API（GPT-4o、GPT-4o-mini、text-embedding-3-small）|
| 后台任务 | Inngest |
| 图片存储 | Cloudinary |
| 缓存 / 频率限制 | Vercel KV（Redis）|
| 邮件 | Resend |
| 数据验证 | Zod + react-hook-form |
| 测试 | Vitest |
| 部署 | Vercel |

---

## 功能详情

### 认证体系
基于 NextAuth v5 beta 构建的多提供商认证方案：
- **OAuth**：GitHub 和 Google，检测到相同邮箱时自动关联账户
- **凭证登录**：邮箱 + 密码，密码使用 bcryptjs 加密存储
- **JWT 策略**：无状态 session，角色信息（`user` / `admin`）编码在 token 中

### 基于角色的访问控制
文章的创建、编辑、删除及用户管理均为 Admin 专属路由。公开路由通过白名单显式声明，其余路由均需登录。

### 嵌套评论
评论通过自引用外键 `parentId` 支持任意层级嵌套。

### Markdown 编辑器与渲染器
基于 `marked` + `Prism.js` 构建的自定义渲染器：
- 支持 TypeScript、JavaScript、JSX/TSX、Python、CSS、JSON、Bash 代码高亮
- 代码块一键复制按钮
- 响应式表格、样式化引用块，外部链接自动新标签页打开
- 实时字数与行数统计

---

## 架构说明

**Server Actions 作为 API 层** — 所有数据变更均通过 Next.js Server Actions 处理，配合 Zod 验证，无需独立的 REST API 即可保持从客户端表单到数据库的完整类型链路。

**Neon Serverless 适配器** — Prisma 配置了 `@prisma/adapter-neon`，在 Vercel serverless 环境下实现正确的连接池管理。

**Inngest 持久化工作流** — 封面生成 pipeline 和向量索引均作为持久化后台函数运行。任意步骤失败时自动重试，不影响用户侧的发布请求。

**安全配置** — `next.config.ts` 全局设置 `X-Frame-Options: DENY` 和 `X-Content-Type-Options: nosniff`，生产环境构建时自动移除 `console.log`。

### 数据库结构（简化）

```
User ──< Account（OAuth 提供商）
User ──< Post ──< Comment（自引用实现嵌套）
                ──< PostEmbedding（向量，1536 维）
Post >── Category
Post >──< Tag（多对多）
User ──< PasswordResetToken
RateLimit（按 userId + 操作类型）
```

---

## 本地开发

### 环境依赖

- Node.js 20+
- 开启了 `pgvector` 扩展的 PostgreSQL 数据库（推荐 [Neon](https://neon.tech)）
- OpenAI API Key
- Cloudinary 账户
- GitHub 和 / 或 Google OAuth 应用凭证

### 安装

```bash
git clone https://github.com/kaili-lab/blog-v1.git
cd blog-v1
npm install
```

### 环境变量

复制 `.env.example` 为 `.env.local` 并填入对应值：

```env
# 认证
AUTH_SECRET=

# 数据库
DATABASE_URL=

# OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AI
OPENAI_API_KEY=

# 图片存储
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# 后台任务
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# 缓存与频率限制
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=

# 邮件
RESEND_API_KEY=
```

### 启动

```bash
# 执行数据库迁移
npx prisma migrate deploy

# 启动开发服务器
npm run dev
```

### Inngest 配置（AI 功能必需）

本项目使用 [Inngest](https://inngest.com) 运行两个后台任务：

| 函数 | 触发时机 | 缺失时的影响 |
|------|---------|-------------|
| `process-embedding` | 发布文章时 | 语义搜索无结果 |
| `cleanup-rate-limit-records` | 每周定时 | 过期频率限制记录在数据库中堆积 |

**本地开发 — 新开一个终端运行：**

```bash
npm run inngest
# 启动 Inngest Dev Server，自动连接到 http://localhost:3000/api/inngest
```

Dev Server 会在 `http://localhost:8288` 打开一个 UI，可以查看和重放函数执行记录。本地开发无需注册账号。

**生产环境（Vercel）— 一次性配置：**

1. 在 [inngest.com](https://inngest.com) 注册并创建应用
2. 在 Inngest 控制台 → **Apps** → **Sync App**，填入已部署的地址：
   ```
   https://your-domain.com/api/inngest
   ```
3. 从控制台复制 **Event Key** 和 **Signing Key**
4. 在 Vercel 环境变量中填入：
   ```
   INNGEST_EVENT_KEY=...
   INNGEST_SIGNING_KEY=...
   ```
5. 重新部署 — Inngest 会自动发现并注册这两个函数

> 如果生产环境未配置 Inngest，发布文章仍可成功，但不会生成封面图，也不会建立向量索引，语义搜索将返回空结果。

### 运行测试

```bash
npm test
```

---

## License

MIT

---

