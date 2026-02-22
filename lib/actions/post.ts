"use server";

import { after } from "next/server";
import { prisma } from "../db";
import { PostFormData, postSchema } from "../zod-validations";
import { logger } from "../logger";
import { auth } from "@/auth";
import {
  generatePostEmbeddings,
  deletePostEmbeddings,
} from "./post-embedding";

// 重新导出类型以便向后兼容
export type { PostWithRelations } from "../db-access/post";

/**
 * 🔍 验证 Slug 是否唯一
 */
export async function validatePostSlug(
  slug: string | null | undefined,
  excludeId?: string
) {
  try {
    // 输入验证（与 category.ts 保持一致）
    if (!slug || typeof slug !== "string" || slug.trim().length === 0) {
      return { success: false, error: "Slug cannot be empty" };
    }

    const existingPost = await prisma.post.findUnique({
      where: { slug },
      select: { id: true },
    });

    // 如果找到了且不是当前编辑的文章
    if (existingPost && (!excludeId || existingPost.id !== excludeId)) {
      return { success: false, error: "This slug is already taken" };
    }

    return { success: true };
  } catch (error) {
    logger.error("Post slug validation error", error);
    return { success: false, error: "Validation failed" };
  }
}

/**
 * ➕ 创建新文章
 */
export async function createPost(data: PostFormData) {
  try {
    logger.info("Creating post", { title: data.title });

    // 获取当前用户
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to create a post",
      };
    }

    // 检查是否为管理员（只有管理员可以创建文章）
    if (session.user.role !== "admin") {
      return {
        success: false,
        error: "Only administrators can create posts",
      };
    }

    // 验证数据格式
    const validatedData = postSchema.parse(data);

    // 检查 slug 唯一性
    const slugCheck = await validatePostSlug(validatedData.slug);
    if (!slugCheck.success) {
      return {
        success: false,
        error: slugCheck.error,
      };
    }

    // 验证分类是否存在
    const categoryExists = await prisma.category.findUnique({
      where: { id: validatedData.categoryId },
    });

    if (!categoryExists) {
      return {
        success: false,
        error: "Selected category does not exist",
      };
    }

    // 验证标签是否都存在
    if (validatedData.tagIds && validatedData.tagIds.length > 0) {
      const tagsCount = await prisma.tag.count({
        where: {
          id: { in: validatedData.tagIds },
        },
      });

      if (tagsCount !== validatedData.tagIds.length) {
        return {
          success: false,
          error: "One or more selected tags do not exist",
        };
      }
    }

    // 创建文章
    const newPost = await prisma.post.create({
      data: {
        title: validatedData.title,
        slug: validatedData.slug,
        brief: validatedData.brief,
        content: validatedData.content,
        coverImage: validatedData.coverImage || null,
        categoryId: validatedData.categoryId,
        authorId: session.user.id,
        published: validatedData.published,
        featured: validatedData.featured,
        metaTitle: validatedData.metaTitle,
        metaDescription: validatedData.metaDescription,
        publishedAt: validatedData.published ? new Date() : null,
        // 在创建时直接连接标签
        tags: {
          connect: (validatedData.tagIds || []).map((id) => ({ id })),
        },
      },
    });

    logger.info("Post created successfully", {
      id: newPost.id,
      title: newPost.title,
    });

    // 文章保存成功后，在响应返回给客户端之后异步生成 embedding
    after(async () => {
      try {
        await generatePostEmbeddings({
          id: newPost.id,
          title: newPost.title,
          content: newPost.content,
        });
        logger.info("Embeddings generated successfully", { postId: newPost.id });
      } catch (err) {
        logger.error("Failed to generate embeddings after post creation", err);
      }
    });

    return {
      success: true,
      message: "Post created successfully",
      post: newPost,
    };
  } catch (error) {
    logger.error("Create post failed", error);
    return {
      success: false,
      error: "Failed to create post",
    };
  }
}

/**
 * ✏️ 更新文章
 */
export async function updatePost(data: PostFormData, postId: string) {
  try {
    logger.info("Updating post", { postId, title: data.title });

    // 获取当前用户
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to update a post",
      };
    }

    // 验证数据格式
    const validatedData = postSchema.parse(data);

    // 检查文章是否存在
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        published: true,
      },
    });

    if (!existingPost) {
      return {
        success: false,
        error: "Post not found",
      };
    }

    // 检查权限（只有作者或管理员可以编辑）
    if (
      existingPost.authorId !== session.user.id &&
      session.user.role !== "admin"
    ) {
      return {
        success: false,
        error: "You don't have permission to edit this post",
      };
    }

    // 检查 slug 唯一性（排除当前文章）
    const slugCheck = await validatePostSlug(validatedData.slug, postId);
    if (!slugCheck.success) {
      return {
        success: false,
        error: slugCheck.error,
      };
    }

    // 验证分类是否存在
    const categoryExists = await prisma.category.findUnique({
      where: { id: validatedData.categoryId },
    });

    if (!categoryExists) {
      return {
        success: false,
        error: "Selected category does not exist",
      };
    }

    // 验证标签是否都存在
    if (validatedData.tagIds && validatedData.tagIds.length > 0) {
      const tagsCount = await prisma.tag.count({
        where: {
          id: { in: validatedData.tagIds },
        },
      });

      if (tagsCount !== validatedData.tagIds.length) {
        return {
          success: false,
          error: "One or more selected tags do not exist",
        };
      }
    }

    // 更新文章
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        title: validatedData.title,
        slug: validatedData.slug,
        brief: validatedData.brief,
        content: validatedData.content,
        coverImage: validatedData.coverImage || null,
        categoryId: validatedData.categoryId,
        published: validatedData.published,
        featured: validatedData.featured,
        metaTitle: validatedData.metaTitle,
        metaDescription: validatedData.metaDescription,
        // 如果从未发布变为发布，设置发布时间
        publishedAt:
          validatedData.published && !existingPost.published
            ? new Date()
            : undefined,
        tags: {
          set: [], // 先清空现有关联
          connect: (validatedData.tagIds || []).map((id) => ({ id })),
        },
      },
    });

    logger.info("Post updated successfully", {
      id: updatedPost.id,
      title: updatedPost.title,
    });

    // 文章内容变更后，重新生成 embedding（先删旧的，再建新的）
    after(async () => {
      try {
        await deletePostEmbeddings(updatedPost.id);
        await generatePostEmbeddings({
          id: updatedPost.id,
          title: updatedPost.title,
          content: updatedPost.content,
        });
        logger.info("Embeddings regenerated successfully", { postId: updatedPost.id });
      } catch (err) {
        logger.error("Failed to regenerate embeddings after post update", err);
      }
    });

    return {
      success: true,
      message: "Post updated successfully",
      post: updatedPost,
    };
  } catch (error) {
    logger.error("Update post failed", error);
    return {
      success: false,
      error: "Failed to update post",
    };
  }
}

/**
 * 🗑️ 删除文章
 */
export async function deletePost(postId: string) {
  try {
    logger.info("Attempting to delete post", { postId });

    // 获取当前用户
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to delete a post",
      };
    }

    // 检查文章是否存在
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        authorId: true,
      },
    });

    if (!existingPost) {
      return {
        success: false,
        error: "Post not found",
      };
    }

    // 检查权限（只有作者或管理员可以删除）
    if (
      existingPost.authorId !== session.user.id &&
      session.user.role !== "admin"
    ) {
      return {
        success: false,
        error: "You don't have permission to delete this post",
      };
    }

    // 删除文章
    await prisma.post.delete({
      where: { id: postId },
    });

    logger.info("Post deleted successfully", {
      postId,
      title: existingPost.title,
    });

    return {
      success: true,
      message: `Post "${existingPost.title}" deleted successfully`,
    };
  } catch (error) {
    logger.error("Delete post failed", error);
    return {
      success: false,
      error: "Failed to delete post",
    };
  }
}

/**
 * 📢 切换文章发布状态
 */
export async function togglePublishPost(postId: string) {
  try {
    logger.info("Toggling publish status", { postId });

    // 获取当前用户
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to toggle publish status",
      };
    }

    // 检查文章是否存在
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        authorId: true,
        published: true,
      },
    });

    if (!existingPost) {
      return {
        success: false,
        error: "Post not found",
      };
    }

    // 检查权限（只有作者或管理员可以切换发布状态）
    if (
      existingPost.authorId !== session.user.id &&
      session.user.role !== "admin"
    ) {
      return {
        success: false,
        error:
          "You don't have permission to toggle publish status for this post",
      };
    }

    // 切换发布状态
    const newPublishedStatus = !existingPost.published;
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        published: newPublishedStatus,
        // 如果从未发布变为发布，设置发布时间
        publishedAt: newPublishedStatus ? new Date() : undefined,
      },
    });

    return {
      success: true,
      message: `Post ${
        newPublishedStatus ? "published" : "unpublished"
      } successfully`,
      post: updatedPost,
    };
  } catch (error) {
    logger.error("Toggle publish status failed", error);
    return {
      success: false,
      error: "Failed to toggle publish status",
    };
  }
}

/**
 * 增加文章浏览量
 */
export async function incrementPostViews(postId: string) {
  try {
    await prisma.post.update({
      where: { id: postId },
      data: {
        views: {
          increment: 1,
        },
      },
    });

    logger.info("Post views incremented", { postId });
    return { success: true };
  } catch (error) {
    logger.error("Failed to increment post views", error);
    return { success: false, error: "Failed to update views" };
  }
}
