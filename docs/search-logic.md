# 搜索逻辑说明

## 概览

本项目有两套搜索入口：**前台 `/posts` 页面**和**后台 Dashboard**。两者共用同一套底层搜索函数，但在触发条件、文章范围和过滤维度上有所不同。

---

## `/posts` 页面搜索

### 搜索入口

搜索框位于全局 **Navbar**（`components/search-input.tsx`），桌面端常驻展示，移动端在汉堡菜单中出现。

- 支持 **Enter 键** 和 **Search 按钮** 两种触发方式
- 提交时构建 URL `?search=<query>` 并**保留**当前的 `category`、`tag` 参数
- 搜索词清空时跳转至 `/posts`（清除 search 参数）
- 分类 / 标签通过 `PostFilters`（`app/posts/post-filters.tsx`）的下拉选择触发，保留现有 search 参数并重置 `page`

### 核心分支（`app/posts/posts-content.tsx`）

```
已登录 + 有搜索词  →  searchPostsWithFilters()   ← AI 混合搜索
未登录 + 有搜索词  →  queryPublishedPosts()        ← 传统关键词搜索
无搜索词（任意）   →  queryPublishedPosts()        ← 普通列表
```

未登录时页面展示提示："Log in to unlock AI-powered semantic search"。

---

## Dashboard 搜索

### 搜索入口

Dashboard 有独立搜索框（`app/dashboard/posts/post-table.tsx`），支持 **Enter 键** 和 **Search 按钮**。

### 核心分支（`app/dashboard/posts/page.tsx`）

```
有搜索词  →  searchPostsWithFilters(…, { onlyPublished: false })  ← AI 混合搜索（含草稿）
无搜索词  →  queryAllPosts()                                        ← 全量列表（含草稿）
```

Dashboard 不检查是否登录（依赖路由层的 admin 鉴权），只要有搜索词就使用混合搜索。

---

## 两端对比

| 维度 | `/posts` 页面 | Dashboard |
|------|:---:|:---:|
| 搜索框位置 | Navbar（全局） | 页内独立 |
| 有搜索按钮 | ✓ | ✓ |
| 向量搜索触发条件 | 已登录 + 有搜索词 | 仅需有搜索词 |
| 文章范围 | 仅已发布 | 全部（含草稿） |
| 支持分类 / 标签过滤 | ✓ | ✗ |
| 无搜索词时函数 | `queryPublishedPosts` | `queryAllPosts` |
| 有搜索词时函数 | `searchPostsWithFilters` | `searchPostsWithFilters` |
| 搜索字段（有搜索词） | `title`、`brief`、`content` | `title`、`brief`、`content` |
| 搜索字段（无搜索词） | `title`、`brief`、`content` | `title`、`brief` |

---

## 底层函数说明

### `queryPublishedPosts`（`lib/db-access/post.ts`）

- 仅返回 `published: true` 的文章
- 搜索字段：`title`、`brief`、`content`（大小写不敏感）
- 支持 `categorySlug`、`tagSlug` 过滤
- 排序：`publishedAt DESC NULLS LAST, createdAt DESC`（有发布时间的文章优先）

### `queryAllPosts`（`lib/db-access/post.ts`）

- 返回所有文章（含草稿）
- 搜索字段：`title`、`brief`（大小写不敏感）
- 无发布状态过滤
- 排序：`createdAt DESC`

### `searchPostsWithFilters`（`lib/db-access/post.ts`）

混合搜索的核心函数，分 6 步执行：

#### Step 1 — 权限检查
仅当 `onlyPublished: false`（查看草稿）时，验证请求方是否为 admin。

#### Step 2 — 智能相似度阈值
根据查询语言和长度自动计算向量相似度门槛：

| 语言 | 长度 | 阈值 |
|------|------|------|
| 中文 | ≤ 2 字 | 0.2 |
| 中文 | ≤ 4 字 | 0.3 |
| 中文 | > 4 字 | 0.4 |
| 英文 | ≤ 3 字 | 0.4 |
| 英文 | ≤ 10 字 | 0.5 |
| 英文 | > 10 字 | 0.6 |
| 混合 / 其他 | — | 0.3 |

#### Step 3 — 传统模糊搜索
在 `title`、`content`、`brief` 三字段进行大小写不敏感的 `contains` 搜索，支持 `categorySlug`、`tagSlug` 过滤。

#### Step 4 — 条件性向量搜索
仅当传统搜索结果 **< pageSize × 80%** 时触发，补充不足的结果数量。
调用 `searchPosts()`（`lib/actions/post-embedding.ts`），使用 OpenAI `text-embedding-3-small` 模型（1536 维）执行余弦相似度搜索，向量存储在 `post_embeddings` 表。

向量搜索结果再经过 Prisma 重新过滤（应用 `categorySlug`、`tagSlug`）后与传统结果合并。

#### Step 4.5 — Embedding 缺失自动补偿
当向量搜索返回空结果时，系统检测传统搜索结果中缺少 embedding 的文章，直接调用 `generatePostEmbeddings()` 补充生成。该步骤为 fire-and-forget（不 await），不阻塞当前搜索响应。

#### Step 5 — 合并去重
将传统结果和向量结果按 `post.id` 去重合并。

#### Step 6 — 排序
- 传统搜索结果优先
- 向量结果按相似度降序排列
- 其余按 `publishedAt / createdAt` 降序排列

#### totalCount 计算
`totalCount = traditionalCount + uniqueVectorOnlyCount`（仅统计向量结果中不与传统结果重叠的文章），避免重复计数导致分页虚高。

---

## Embedding 生命周期

1. **创建/更新文章**时，`lib/actions/post.ts` 使用 Next.js `after()` API（`next/server`）在响应返回客户端后异步触发 `generatePostEmbeddings()`
2. `generatePostEmbeddings()` 对 `title` 和 `content` 生成 embedding 并存入 `post_embeddings` 表
3. 若 embedding 生成失败，文章将缺少 embedding；下次被传统搜索命中时，Step 4.5 会自动触发补充生成

---

## 已知限制

- `queryAllPosts`（Dashboard 无搜索词时）只搜索 `title` 和 `brief`，未包含 `content`
- 向量搜索的 totalCount 基于当前页的去重结果推算，无法精确反映全局唯一总数
- 混合搜索不支持翻页时保持向量搜索的一致性（每页独立触发向量搜索）
