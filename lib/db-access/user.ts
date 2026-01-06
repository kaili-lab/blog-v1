import "server-only";

import { prisma } from "../db";
import { logger } from "../logger";

// ✅ 用户列表数据类型定义
export type UserWithPosts = {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
  createdAt: Date;
  postCount: number;
};

/**
 * 分页查询所有用户
 *
 * @param page - 当前页码（从 1 开始）
 * @param pageSize - 每页数量
 * @returns 包含用户列表、总页数、当前页、总数量的对象
 */
export async function queryAllUsers(
  page: number = 1,
  pageSize: number = 10
): Promise<{
  users: UserWithPosts[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}> {
  try {
    // 1️⃣ 并行查询：用户列表 + 总数
    const [users, totalCount] = await Promise.all([
      // 查询当前页的用户，并计算每个用户的文章数
      prisma.user.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          createdAt: true,
          _count: {
            select: { posts: true },
          },
        },
      }),

      // 查询总数量
      prisma.user.count(),
    ]);

    // 2️⃣ 数据转换：将 _count.posts 转为 postCount
    const transformedUsers: UserWithPosts[] = users.map(
      (user: {
        id: string;
        name: string;
        email: string;
        role: string;
        image: string | null;
        createdAt: Date;
        _count: { posts: number };
      }) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        createdAt: user.createdAt,
        postCount: user._count.posts,
      })
    );

    // 3️⃣ 计算总页数
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      users: transformedUsers,
      totalPages,
      currentPage: page,
      totalCount,
    };
  } catch (error) {
    logger.error("Query users failed", error);
    throw new Error("Failed to fetch users");
  }
}

/**
 * 🔍 获取 admin 用户信息
 *
 * @returns admin 用户对象或 null
 */
export async function getAdminUser() {
  try {
    const adminUser = await prisma.user.findFirst({
      where: { role: "admin" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
      },
    });

    if (!adminUser) {
      logger.warn("Admin user not found");
      return null;
    }

    return adminUser;
  } catch (error) {
    logger.error("Get admin user failed", error);
    return null;
  }
}
