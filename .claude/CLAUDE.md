# Blog v1 — Claude 开发规范

## 包管理器

使用 **pnpm**，不要使用 npm 或 yarn。

---

## Next.js 缓存规范（重要，踩过坑）

### 动态页面（Dashboard 等需要实时数据的页面）

用 `connection()` from `next/server`，在函数体最顶部 await：

```ts
import { connection } from "next/server";

export default async function DashboardPage() {
  await connection();
  const data = await fetchFromDB();
  // ...
}
```

- **不要用** `export const dynamic = "force-dynamic"`（旧 API，仍有效但不推荐）
- **不要用** `unstable_noStore()`（已弃用）

### 需要 ISR 缓存的页面（文章详情等）

```ts
export const revalidate = 3600; // 秒
```

### 关于 `cacheComponents: true`

- 这是 Next.js 未来方向，**不要在现有项目中单独启用**
- 启用后要求所有 Server Component 的 DB 调用都包在 `<Suspense>` 内，会破坏大量现有页面
- 当前项目**未启用**，不要添加到 next.config.ts

### Dashboard 页面清单（均需 `connection()`）

- `app/dashboard/page.tsx` ✅
- `app/dashboard/comments/page.tsx` ✅
- `app/dashboard/posts/page.tsx` — 有 `searchParams`，自动动态，无需额外处理
- `app/dashboard/posts/edit/[id]/page.tsx` — 动态路由，自动动态
- `app/dashboard/posts/create/page.tsx` — 纯表单，不读 DB，无需处理

---

## Embedding 生成

**不使用 Inngest**（已移除）。改用 Next.js `after()` API：

```ts
import { after } from "next/server";
import { generatePostEmbeddings, deletePostEmbeddings } from "./post-embedding";

// 在 createPost / updatePost 中：
after(async () => {
  await generatePostEmbeddings({ id, title, content });
});
```

- `after()` 在 HTTP 响应发送后异步执行，不阻塞用户操作
- 本地 `npm run dev` 即可测试，embedding 生成后查 `post_embeddings` 表验证

---

## 向量搜索阈值

统一阈值 `0.4`，定义在 `lib/db-access/post.ts` 的 `getSmartSimilarityThreshold()`：

- 中文短词（≤2字）：`0.2`（保留，短词难搜）
- 其余所有情况：`0.4`

**历史 bug：** 之前英文查询阈值按字符长度分级（0.4/0.5/0.6），导致 "postgresql mysql"（16字符）触发 0.6 阈值搜不到结果。已修复为统一 0.4。

---

## 搜索逻辑

两条路径，详见 `docs/search-logic.md`：

| 场景 | 函数 | 说明 |
|---|---|---|
| `/posts` 已登录 + 有搜索词 | `searchPostsWithFilters()` | 传统搜索 + 向量补充（混合） |
| `/posts` 未登录 | `queryPublishedPosts()` | 纯传统搜索 |
| Dashboard 有搜索词 | `searchPostsWithFilters({ onlyPublished: false })` | 混合，包含草稿 |

**传统搜索限制：** Prisma `contains` 把整个搜索词当作一个子字符串，不分词。"postgresql mysql" 搜不到标题含 "PostgreSQL Over MySQL" 的文章。如需改进，考虑按空格拆分为多个 AND 条件。

---

## Vercel 部署注意事项

### Prisma Migration

`migration.sql` 顶部必须有：

```sql
CREATE EXTENSION IF NOT EXISTS "vector";
```

如果 migration 失败（P3009），在 Vercel 数据库中执行：

```bash
npx prisma migrate resolve --applied init
```

### 环境变量

必需变量见 `.env.example`。移除了 Inngest 后，原 `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` 已替换为 `CRON_SECRET`（Vercel Cron 鉴权用，任意随机字符串，`openssl rand -hex 32` 生成）。

### Vercel Cron Job

`vercel.json` 已配置每周一 0:00 UTC 清理过期 rate limit 记录（`/api/cron/cleanup-rate-limits`）。

---

## 已知问题 / 技术债

- `queryAllPosts`（Dashboard 无搜索词时）只搜索 `title` 和 `brief`，未包含 `content`
- 向量搜索 totalCount 基于当前页去重推算，无法精确反映全局唯一总数
- 传统搜索不支持多词分词匹配（整串 contains），多关键词搜索体验差

---

## 项目关键文件

| 文件 | 用途 |
|---|---|
| `lib/db-access/post.ts` | 核心数据查询，含混合搜索逻辑 |
| `lib/actions/post.ts` | Server Actions，含 after() embedding 触发 |
| `lib/actions/post-embedding.ts` | Embedding 生成/删除 |
| `lib/ai/embedding.ts` | OpenAI embedding 封装，MAX_TOKENS=8191，chunk=500 |
| `app/api/cron/cleanup-rate-limits/route.ts` | Vercel Cron，清理过期 rate limit |
| `docs/search-logic.md` | 搜索架构详细文档 |
