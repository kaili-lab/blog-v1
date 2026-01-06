import "server-only";

import { prisma } from "../db";
import { logger } from "../logger";

// ✅ 更直观的类型定义
export type TagWithPosts = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  postCount: number; // 直接用 postCount，不用 _count
};

/**
 * 📊 查询所有标签（支持分页）
 *
 * @param page - 当前页码（从 1 开始）
 * @param pageSize - 每页数量
 * @returns 包含标签列表、总页数、当前页、总数量的对象
 */
export async function queryAllTags(
  page: number = 1,
  pageSize: number = 10
): Promise<{
  tags: TagWithPosts[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}> {
  try {
    // 1️⃣ 并行查询：标签列表 + 总数
    const [tags, totalCount] = await Promise.all([
      // 查询当前页的标签，并计算每个标签的文章数
      prisma.tag.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { posts: true },
          },
        },
      }),

      // 查询总数量
      prisma.tag.count(),
    ]);

    // 2️⃣ 数据转换：将 _count.posts 转为 postCount
    const transformedTags: TagWithPosts[] = tags.map(
      (tag: {
        id: string;
        name: string;
        slug: string;
        createdAt: Date;
        _count: { posts: number };
      }) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        createdAt: tag.createdAt,
        postCount: tag._count.posts,
      })
    );

    // 3️⃣ 计算总页数
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      tags: transformedTags,
      totalPages,
      currentPage: page,
      totalCount,
    };
  } catch (error) {
    logger.error("Query tags failed", error);
    throw new Error("Failed to fetch tags");
  }
}
