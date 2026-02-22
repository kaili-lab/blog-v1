import {
  generateEmbedding,
  batchGenerateEmbeddings,
  chunkText,
  countTokens,
  MAX_TOKENS,
} from "../ai/embedding";
import {
  insertEmbedding,
  batchInsertEmbeddings,
  searchSimilarEmbeddings,
  deleteEmbeddingsByPostId,
} from "../vector";
import { prisma } from "../db";
import { logger } from "../logger";
import type { PostWithRelations } from "../db-access/post";

export interface Post {
  id: string;
  title: string;
  content: string;
}

/**
 * 为文章生成所有 embeddings
 */
export async function generatePostEmbeddings(post: Post) {
  try {
    const { id, title, content } = post;

    // 1. 生成标题 embedding（总是单独一条）
    logger.info(`Generating embedding for post ${post.id} - title`);
    const titleEmbedding = await generateEmbedding(title);
    const titleTokens = countTokens(title);

    await insertEmbedding({
      postId: id,
      contentType: "title",
      textChunk: title,
      embedding: titleEmbedding,
      tokenCount: titleTokens,
    });
    logger.info("Title Embedding inserted");

    // 2. 处理正文：检查是否需要分块
    const contentTokens = countTokens(content);

    if (contentTokens <= MAX_TOKENS) {
      // 正文较短，整体 embed
      const contentEmbedding = await generateEmbedding(content);
      await insertEmbedding({
        postId: id,
        contentType: "content",
        textChunk: content,
        embedding: contentEmbedding,
        tokenCount: contentTokens,
      });
      logger.info("Content Embedding inserted");
    } else {
      // 正文较长，需要分块
      const chunks = chunkText(content, {
        maxTokens: 500,
        overlap: 50,
      });

      // 批量生成 embeddings（性能优化）
      const chunkTexts = chunks.map((c) => c.text);
      const chunkEmbeddings = await batchGenerateEmbeddings(chunkTexts);

      // 批量插入数据库
      await batchInsertEmbeddings(
        chunks.map((chunk, index) => ({
          postId: id,
          contentType: "chunk" as const,
          textChunk: chunk.text,
          embedding: chunkEmbeddings[index],
          chunkIndex: chunk.index,
          tokenCount: chunk.tokenCount,
        }))
      );
      logger.info("Chunk Embeddings inserted");
    }
  } catch (error) {
    logger.error(`Failed to generate embeddings for post ${post.id}:`, error);
    throw error;
  }
}

/**
 * 搜索文章（去重 + 排序）
 */
export async function searchPosts(
  query: string,
  options: {
    limit?: number;
    minSimilarity?: number;
    page?: number;
    onlyPublished?: boolean;
  } = {}
) {
  const {
    limit = 10,
    minSimilarity = 0.4,
    page = 1,
    onlyPublished = true,
  } = options;

  try {
    // 1. Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // 2. Vector search
    const results = await searchSimilarEmbeddings(queryEmbedding, {
      limit: limit * 2, // Get more for deduplication
      minSimilarity,
    });
    // 3. Deduplicate by post
    const uniquePosts = new Map<string, (typeof results)[0]>();
    for (const result of results) {
      const existing = uniquePosts.get(result.post_id);
      if (!existing || result.similarity > existing.similarity) {
        uniquePosts.set(result.post_id, result);
      }
    }

    // 4. Get full post data for the unique posts
    const postIds = Array.from(uniquePosts.keys());
    const posts = await prisma.post.findMany({
      where: {
        id: { in: postIds },
        ...(onlyPublished && { published: true }), // 可选的发布状态过滤
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        author: {
          select: { id: true, name: true, image: true },
        },
        tags: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { publishedAt: "desc" },
    });

    // 5. Combine with search metadata
    type EnrichedPost = PostWithRelations & {
      similarity: number;
      snippet: string;
    };
    const enrichedPosts: EnrichedPost[] = posts.map(
      (post: PostWithRelations) => {
        const searchResult = uniquePosts.get(post.id);
        return {
          ...post,
          similarity: searchResult?.similarity || 0,
          snippet:
            searchResult?.text_chunk?.slice(0, 200) + "..." || post.brief,
        };
      }
    );

    // 6. Sort by similarity and apply pagination
    const sortedPosts = enrichedPosts
      .sort((a: EnrichedPost, b: EnrichedPost) => b.similarity - a.similarity)
      .slice((page - 1) * limit, page * limit);

    const totalPages = Math.ceil(enrichedPosts.length / limit);

    return {
      success: true,
      posts: sortedPosts,
      totalCount: enrichedPosts.length,
      currentPage: page,
      totalPages,
      searchQuery: query,
    };
  } catch (error) {
    logger.error("Search posts error:", error);
    return {
      success: false,
      posts: [],
      totalCount: 0,
      currentPage: page,
      totalPages: 0,
      searchQuery: query,
    };
  }
}

/**
 * 删除文章的所有 embeddings（更新文章时先清理旧数据）
 */
export async function deletePostEmbeddings(postId: string) {
  try {
    await deleteEmbeddingsByPostId(postId);
    logger.info("Post embeddings deleted", { postId });
  } catch (error) {
    logger.error("Failed to delete post embeddings", error);
    throw error;
  }
}
