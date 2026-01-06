import "server-only";

import { prisma } from "../db";
import { logger } from "../logger";
import { auth } from "@/auth";
import { searchPosts } from "../actions/post-embedding";

// 博客文章类型（包含关联数据）
export type PostWithRelations = {
  id: string;
  title: string;
  slug: string;
  brief: string;
  content: string;
  coverImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  published: boolean;
  featured: boolean;
  views: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  author: {
    id: string;
    name: string;
    image: string | null;
  };
  tags: {
    id: string;
    name: string;
    slug: string;
  }[];
};

/**
 * 📊 查询所有文章（支持分页和搜索）
 * TODO: should only use one search function with embedding search
 */
export async function queryAllPosts(
  page: number = 1,
  pageSize: number = 10,
  searchTerm?: string
) {
  try {
    // 构建搜索条件
    const whereCondition = searchTerm
      ? {
          OR: [
            { title: { contains: searchTerm, mode: "insensitive" as const } },
            { brief: { contains: searchTerm, mode: "insensitive" as const } },
          ],
        }
      : {};

    // 并行查询：文章列表 + 总数
    const [posts, totalCount] = await Promise.all([
      prisma.post.findMany({
        where: whereCondition,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          tags: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      prisma.post.count({ where: whereCondition }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      success: true,
      posts: posts as PostWithRelations[],
      totalPages,
      currentPage: page,
      totalCount,
    };
  } catch (error) {
    logger.error("Query posts failed", error);
    return {
      success: false,
      error: "Failed to fetch posts",
      posts: [],
      totalPages: 0,
      currentPage: page,
      totalCount: 0,
    };
  }
}

/**
 * 🔍 根据 ID 获取单个博客文章
 * @param id - 文章 ID
 * @param allowUnpublished - 是否允许查询未发布的文章（默认 false，只有管理员可以）
 */
export async function getPostById(
  id: string,
  allowUnpublished: boolean = false
) {
  try {
    // 如果需要查询未发布的文章，检查管理员权限
    if (allowUnpublished) {
      const session = await auth();
      if (!session?.user?.id || session.user.role !== "admin") {
        return {
          success: false,
          error: "Only administrators can view unpublished posts",
        };
      }
    }

    // 构建查询条件
    const whereCondition = allowUnpublished ? { id } : { id, published: true };

    const post = await prisma.post.findUnique({
      where: whereCondition,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!post) {
      return { success: false, error: "Post not found" };
    }

    return { success: true, post };
  } catch (error) {
    logger.error("Failed to get post by ID", error);
    return { success: false, error: "Failed to fetch post" };
  }
}

/**
 * 📋 获取所有分类（用于下拉选择）
 */
export async function getAllCategories() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    return {
      success: true,
      categories,
    };
  } catch (error) {
    logger.error("Get all categories failed", error);
    return {
      success: false,
      error: "Failed to fetch categories",
      categories: [],
    };
  }
}

/**
 * 🏷️ 获取所有标签（用于多选）
 */
export async function getAllTags() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    return {
      success: true,
      tags,
    };
  } catch (error) {
    logger.error("Get all tags failed", error);
    return {
      success: false,
      error: "Failed to fetch tags",
      tags: [],
    };
  }
}

/**
 * 📰 查询所有已发布的文章（前台使用）
 * TODO: should only use one search function with embedding search
 */
export async function queryPublishedPosts(
  page: number = 1,
  pageSize: number = 10,
  searchTerm?: string,
  categorySlug?: string,
  tagSlug?: string
) {
  try {
    // 构建搜索条件
    const whereCondition: {
      published: boolean;
      OR?: Array<
        | { title: { contains: string; mode: "insensitive" } }
        | { brief: { contains: string; mode: "insensitive" } }
      >;
      category?: { slug: string };
      tags?: { some: { slug: string } };
    } = {
      published: true,
    };

    // 搜索关键词
    if (searchTerm) {
      whereCondition.OR = [
        { title: { contains: searchTerm, mode: "insensitive" as const } },
        { brief: { contains: searchTerm, mode: "insensitive" as const } },
      ];
    }

    // 按分类筛选
    if (categorySlug) {
      whereCondition.category = {
        slug: categorySlug,
      };
    }

    // 按标签筛选
    if (tagSlug) {
      whereCondition.tags = {
        some: {
          slug: tagSlug,
        },
      };
    }

    // 并行查询：文章列表 + 总数
    const [posts, totalCount] = await Promise.all([
      prisma.post.findMany({
        where: whereCondition,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          tags: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      prisma.post.count({ where: whereCondition }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    // 手动排序：优先按 publishedAt，然后按 createdAt
    const sortedPosts = posts.sort(
      (a: PostWithRelations, b: PostWithRelations) => {
        // 如果两个都有 publishedAt，按 publishedAt 排序
        if (a.publishedAt && b.publishedAt) {
          return (
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime()
          );
        }
        // 如果只有 a 有 publishedAt，a 排在前面
        if (a.publishedAt && !b.publishedAt) {
          return -1;
        }
        // 如果只有 b 有 publishedAt，b 排在前面
        if (!a.publishedAt && b.publishedAt) {
          return 1;
        }
        // 如果都没有 publishedAt，按 createdAt 排序
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    );

    logger.info("Published posts query completed", {
      totalCount,
      totalPages,
      currentPage: page,
      returnedCount: posts.length,
    });

    return {
      success: true,
      posts: sortedPosts as PostWithRelations[],
      totalPages,
      currentPage: page,
      totalCount,
    };
  } catch (error) {
    logger.error("Query published posts failed", error);
    return {
      success: false,
      error: "Failed to fetch posts",
      posts: [],
      totalPages: 0,
      currentPage: page,
      totalCount: 0,
    };
  }
}

/**
 * 📖 根据 slug 获取已发布的文章详情（前台使用）
 */
export async function getPublishedPostBySlug(slug: string) {
  try {
    logger.info("Getting published post by slug", { slug });

    const post = await prisma.post.findUnique({
      where: {
        slug,
        published: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!post) {
      return { success: false, error: "Post not found" };
    }

    return { success: true, post: post as PostWithRelations };
  } catch (error) {
    logger.error("Failed to get published post by slug", error);
    return { success: false, error: "Failed to fetch post" };
  }
}

/**
 * 📊 获取Dashboard统计数据
 */
export async function getDashboardStats() {
  try {
    // 计算30天前的日期
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 并行查询所有统计数据
    const [totalArticles, recentArticles, totalTags, totalViews] =
      await Promise.all([
        // 总文章数
        prisma.post.count(),

        // 30天内发布的文章数
        prisma.post.count({
          where: {
            published: true,
            publishedAt: {
              gte: thirtyDaysAgo,
            },
          },
        }),

        // 总标签数
        prisma.tag.count(),

        // 总浏览量
        prisma.post.aggregate({
          _sum: {
            views: true,
          },
          where: {
            published: true,
          },
        }),
      ]);

    return {
      success: true,
      stats: {
        totalArticles,
        recentArticles,
        totalTags,
        totalViews: totalViews._sum.views || 0,
      },
    };
  } catch (error) {
    logger.error("Failed to get dashboard stats", error);
    return {
      success: false,
      error: "Failed to fetch dashboard statistics",
      stats: {
        totalArticles: 0,
        recentArticles: 0,
        totalTags: 0,
        totalViews: 0,
      },
    };
  }
}

/**
 * 📋 获取最近的文章列表（用于Dashboard）
 */
export async function getRecentPosts(limit: number = 5) {
  try {
    const posts = await prisma.post.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return {
      success: true,
      posts: posts as unknown as PostWithRelations[],
    };
  } catch (error) {
    logger.error("Failed to get recent posts", error);
    return {
      success: false,
      error: "Failed to fetch recent posts",
      posts: [],
    };
  }
}

/**
 * 智能计算相似度阈值
 */
function getSmartSimilarityThreshold(
  searchQuery: string,
  customThreshold?: number
): number {
  if (customThreshold !== undefined) {
    return customThreshold;
  }

  // 检测语言类型
  const isChinese = /[\u4e00-\u9fff]/.test(searchQuery);
  const isEnglish = /^[a-zA-Z\s]+$/.test(searchQuery);

  // 根据语言和查询长度智能选择阈值
  if (isChinese) {
    if (searchQuery.length <= 2) {
      return 0.2; // 中文短词
    } else if (searchQuery.length <= 4) {
      return 0.3; // 中文短语
    } else {
      return 0.4; // 中文长句
    }
  } else if (isEnglish) {
    if (searchQuery.length <= 3) {
      return 0.4; // 英文短词
    } else if (searchQuery.length <= 10) {
      return 0.5; // 英文短语
    } else {
      return 0.6; // 英文长句
    }
  } else {
    return 0.3; // 混合语言或未知
  }
}

/**
 * 🔍 混合搜索文章（模糊搜索 + 向量搜索）
 * 策略：
 * 1. 先尝试模糊搜索（快速、精确）
 * 2. 如果结果不够，补充向量搜索（智能、语义）
 * 3. 合并去重结果
 */
export async function searchPostsWithFilters(
  searchQuery: string,
  options: {
    page?: number;
    pageSize?: number;
    categorySlug?: string;
    tagSlug?: string;
    onlyPublished?: boolean;
    minSimilarity?: number;
  } = {}
) {
  try {
    const {
      page = 1,
      pageSize = 10,
      categorySlug,
      tagSlug,
      onlyPublished = true,
      minSimilarity,
    } = options;

    // 如果查询未发布的文章，需要检查管理员权限
    if (!onlyPublished) {
      const session = await auth();
      if (!session?.user?.id || session.user.role !== "admin") {
        return {
          success: false,
          error: "Only administrators can search unpublished posts",
          posts: [],
          totalPages: 0,
          currentPage: page,
          totalCount: 0,
          searchQuery,
        };
      }
    }

    // 智能选择相似度阈值
    const smartThreshold = getSmartSimilarityThreshold(
      searchQuery,
      minSimilarity
    );

    // 1. 先尝试传统模糊搜索
    const traditionalWhereCondition: {
      OR: Array<{
        title?: { contains: string; mode: "insensitive" };
        content?: { contains: string; mode: "insensitive" };
        brief?: { contains: string; mode: "insensitive" };
      }>;
      published?: boolean;
      category?: { slug: string };
      tags?: { some: { slug: string } };
    } = {
      OR: [
        { title: { contains: searchQuery, mode: "insensitive" } },
        { content: { contains: searchQuery, mode: "insensitive" } },
        { brief: { contains: searchQuery, mode: "insensitive" } },
      ],
    };

    if (onlyPublished) {
      traditionalWhereCondition.published = true;
    }

    if (categorySlug) {
      traditionalWhereCondition.category = { slug: categorySlug };
    }

    if (tagSlug) {
      traditionalWhereCondition.tags = { some: { slug: tagSlug } };
    }

    // 执行传统搜索
    const [traditionalPosts, traditionalCount] = await Promise.all([
      prisma.post.findMany({
        where: traditionalWhereCondition,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: onlyPublished
          ? { publishedAt: "desc" }
          : { createdAt: "desc" },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          tags: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      prisma.post.count({ where: traditionalWhereCondition }),
    ]);

    // 2. 判断是否需要向量搜索
    const needsVectorSearch = traditionalPosts.length < pageSize * 0.8; // 如果传统搜索结果不足80%

    let vectorPosts: PostWithRelations[] = [];
    let vectorCount = 0;

    if (needsVectorSearch) {
      // 3. 执行向量搜索
      const vectorResult = await searchPosts(searchQuery, {
        limit: pageSize - traditionalPosts.length, // 补充剩余数量
        minSimilarity: smartThreshold,
        page: 1,
        onlyPublished,
      });

      if (vectorResult.success && vectorResult.posts.length > 0) {
        // 4. 对向量搜索结果应用过滤
        const vectorPostIds = vectorResult.posts.map((p) => p.id);

        const vectorWhereCondition: {
          id: { in: string[] };
          published?: boolean;
          category?: { slug: string };
          tags?: { some: { slug: string } };
        } = {
          id: { in: vectorPostIds },
        };

        if (onlyPublished) {
          vectorWhereCondition.published = true;
        }

        if (categorySlug) {
          vectorWhereCondition.category = { slug: categorySlug };
        }

        if (tagSlug) {
          vectorWhereCondition.tags = { some: { slug: tagSlug } };
        }

        const [filteredVectorPosts, filteredVectorCount] = await Promise.all([
          prisma.post.findMany({
            where: vectorWhereCondition,
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              author: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
              tags: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
            orderBy: onlyPublished
              ? { publishedAt: "desc" }
              : { createdAt: "desc" },
          }),
          prisma.post.count({ where: vectorWhereCondition }),
        ]);

        // 合并相似度信息
        vectorPosts = filteredVectorPosts.map((post: PostWithRelations) => {
          const vectorPost = vectorResult.posts.find((vp) => vp.id === post.id);
          return {
            ...post,
            similarity: vectorPost?.similarity || 0,
            snippet: vectorPost?.snippet || post.brief,
          };
        });

        vectorCount = filteredVectorCount;
      }
    }

    // 5. 合并结果并去重
    const allPosts = [...traditionalPosts, ...vectorPosts];
    const uniquePosts = allPosts.filter(
      (post, index, self) => index === self.findIndex((p) => p.id === post.id)
    );

    // 6. 按相关性排序（传统搜索结果优先，然后按相似度）
    const sortedPosts = uniquePosts.sort(
      (
        a: PostWithRelations & { similarity?: number },
        b: PostWithRelations & { similarity?: number }
      ) => {
        // 传统搜索结果优先
        const aIsTraditional = traditionalPosts.some(
          (tp: PostWithRelations) => tp.id === a.id
        );
        const bIsTraditional = traditionalPosts.some(
          (tp: PostWithRelations) => tp.id === b.id
        );

        if (aIsTraditional && !bIsTraditional) return -1;
        if (!aIsTraditional && bIsTraditional) return 1;

        // 如果都是向量搜索结果，按相似度排序
        const aSimilarity =
          (a as PostWithRelations & { similarity?: number }).similarity || 0;
        const bSimilarity =
          (b as PostWithRelations & { similarity?: number }).similarity || 0;
        if (aSimilarity > 0 || bSimilarity > 0) {
          return bSimilarity - aSimilarity;
        }

        // 否则按时间排序
        return (
          new Date(b.publishedAt || b.createdAt).getTime() -
          new Date(a.publishedAt || a.createdAt).getTime()
        );
      }
    );

    const totalCount = traditionalCount + vectorCount;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      success: true,
      posts: sortedPosts as PostWithRelations[],
      totalPages,
      currentPage: page,
      totalCount,
      searchQuery,
      searchType: needsVectorSearch ? "hybrid" : "traditional",
      traditionalCount: traditionalPosts.length,
      vectorCount: vectorPosts.length,
    };
  } catch (error) {
    logger.error("Hybrid search failed", error);
    return {
      success: false,
      error: "Failed to search posts",
      posts: [],
      totalPages: 0,
      currentPage: options.page || 1,
      totalCount: 0,
      searchQuery,
    };
  }
}
