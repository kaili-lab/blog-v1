# Inngest 配置说明

## 为什么需要 Inngest

本项目的两个核心 AI 功能依赖异步后台任务运行，而不是在 HTTP 请求周期内同步执行：

- **发布文章 → 生成向量 Embedding**：文章发布时，需要对标题和正文分块、调用 OpenAI embedding API、将结果写入 `post_embeddings` 表。这个过程耗时较长，不适合阻塞在发布请求里。
- **发布文章 → 生成 AI 封面**：调用 GPT-4o-mini 生成摘要 → GPT-4o 转换 prompt → gpt-4o-image 生成图片 → 上传 Cloudinary，链路更长。

Inngest 充当异步任务队列，支持步骤级重试（最多 3 次）、并发控制和执行历史记录，出错时可以在控制台手动重放。

---

## 注册的函数

| 函数 ID | 文件 | 触发事件 | 描述 |
|---------|------|---------|------|
| `process-embedding` | `lib/inngest/functions.ts` | `post/embedding.generate` | 生成文章向量 Embedding |
| `cleanup-rate-limit-records` | `lib/inngest/functions.ts` | 每周一 00:00 Cron | 清理过期的频率限制记录 |

触发路径（以 `process-embedding` 为例）：

```
发布文章
  → lib/actions/post.ts createPost()
  → inngest.send({ name: "post/embedding.generate", data: { postId } })
  → Inngest 服务 发出 HTTP POST
  → /api/inngest (app/api/inngest/route.ts)
  → processEmbedding 函数执行
  → lib/actions/post-embedding.ts generatePostEmbeddings()
  → 向量写入 post_embeddings 表
```

---

## 本地开发

本地开发使用 Inngest Dev Server，无需注册账号，也无需填写 `INNGEST_EVENT_KEY` 和 `INNGEST_SIGNING_KEY`（留空即可，Dev Server 会自动跳过签名验证）。

**步骤：**

1. 先启动 Next.js 开发服务器：
   ```bash
   npm run dev
   ```

2. 在新终端启动 Inngest Dev Server：
   ```bash
   npm run inngest
   # 等价于：npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
   ```

3. 打开 `http://localhost:8288`，可以看到已注册的函数列表

4. 发布一篇文章后，Dev Server 会自动接收事件并执行 `process-embedding` 函数，在 UI 中可以看到每个步骤的执行日志

**注意：** 如果只启动了 `npm run dev` 而没有启动 Inngest Dev Server，发布文章不会报错，但 Embedding 不会生成，语义搜索将无结果。

---

## 生产环境（Vercel）

### 1. 注册 Inngest

前往 [inngest.com](https://inngest.com) 注册账号并创建一个 App。免费套餐包含：
- 每月 50,000 次函数调用
- 最多 5 个并发执行
- 7 天执行历史记录

### 2. 同步 App

在 Inngest 控制台：**Apps → Sync New App**，填入部署地址：

```
https://your-domain.com/api/inngest
```

同步成功后，控制台会列出检测到的两个函数（`process-embedding` 和 `cleanup-rate-limit-records`）。

### 3. 获取密钥

在 Inngest 控制台 → **Settings → Keys**，复制：
- **Event Key**（用于客户端发送事件）
- **Signing Key**（用于验证 Inngest 发出的 HTTP 请求）

### 4. 配置 Vercel 环境变量

```env
INNGEST_EVENT_KEY=evt_xxxxxxxxxxxxxxxx
INNGEST_SIGNING_KEY=signkey-prod-xxxxxxxxxxxxxxxx
```

### 5. 重新部署

Vercel 重新部署后，Inngest 与应用的连接即生效。此后每次发布文章都会自动触发后台任务。

---

## 功能降级说明

| Inngest 状态 | 发布文章 | 封面图生成 | 语义搜索 |
|-------------|---------|----------|---------|
| 正常运行 | ✅ | ✅ 异步生成 | ✅ 正常 |
| 未启动（本地） | ✅ | ❌ 不生成 | ❌ 无结果 |
| 未配置（生产） | ✅ | ❌ 不生成 | ❌ 无结果 |
| 任务失败，已重试 3 次 | ✅ | ❌ 本次失败 | ⚠️ 该文章无向量 |

任务失败时，可以在 Inngest 控制台找到对应的执行记录并手动重放（Replay），无需重新发布文章。

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `lib/inngest/client.ts` | Inngest 客户端初始化 |
| `lib/inngest/functions.ts` | 两个注册函数的实现 |
| `lib/inngest/types.ts` | 事件类型定义 |
| `app/api/inngest/route.ts` | Inngest HTTP 端点（GET/POST/PUT） |
| `lib/actions/post-embedding.ts` | Embedding 生成逻辑 |
