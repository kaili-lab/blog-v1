import "server-only";

import { prisma } from "../db";
import { logger } from "../logger";

// ✅ 更直观的类型定义
export type CategoryWithPosts = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  postCount: number; // 直接用 postCount，不用 _count
};

// query all categories with pagination
// page should have default value 1
// limit should have default value 5
// should return total pages
export async function queryAllCategories(page: number = 1, limit: number = 5) {
  try {
    const totalCount = await prisma.category.count();

    const categoriesRaw = await prisma.category.findMany({
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // ✅ 转换为更直观的数据结构
    const categories: CategoryWithPosts[] = categoriesRaw.map(
      (category: {
        id: string;
        name: string;
        slug: string;
        createdAt: Date;
        _count: { posts: number };
      }) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        createdAt: category.createdAt,
        postCount: category._count.posts, // 转换为 postCount
      })
    );

    return {
      success: true,
      categories,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    };
  } catch (error) {
    logger.error("Category query error:", error);
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
        categories: [],
        totalPages: 0,
        totalCount: 0,
      };
    }
    return {
      success: false,
      error: "An unexpected error occurred",
      categories: [],
      totalPages: 0,
      totalCount: 0,
    };
  }
}
