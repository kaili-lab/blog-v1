import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedPostBySlug } from "@/lib/db-access/post";
import { incrementPostViews } from "@/lib/actions/post";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { PostDetailSkeleton } from "@/components/post-detail-skeleton";
import { PostDetailContent } from "./post-detail-content";

// ISR：1 小时重新验证
export const revalidate = 3600;

/**
 * 生成页面的 SEO metadata
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublishedPostBySlug(slug);

  if (!result.success || !result.post) {
    return {
      title: "Post Not Found",
      description: "The post you're looking for doesn't exist.",
    };
  }

  const post = result.post;
  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.brief;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.author.name],
      images: post.coverImage
        ? [
            {
              url: post.coverImage,
              alt: post.title,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.coverImage ? [post.coverImage] : [],
    },
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPublishedPostBySlug(slug);

  if (!result.success || !result.post) {
    notFound();
  }

  const post = result.post;

  // 异步增加浏览量（不阻塞页面渲染）
  incrementPostViews(post.id).catch((error) =>
    console.error("Failed to increment views:", error)
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <Suspense fallback={<PostDetailSkeleton />}>
          <PostDetailContent post={post} />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
