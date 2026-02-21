import { getPostComments } from "@/lib/db-access/comment";
import { markdownToHtml } from "@/lib/markdown";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MarkdownContent } from "@/components/markdown-content";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, Eye, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PostWithRelations } from "@/lib/db-access/post";

// 🚀 优化 2：动态导入评论区组件（减少首屏 JS）
const CommentSection = dynamic(
  () =>
    import("@/components/comment-section").then((mod) => ({
      default: mod.CommentSection,
    })),
  {
    loading: () => (
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-foreground mb-6">Comments</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-muted rounded-lg"></div>
          <div className="h-20 bg-muted rounded-lg"></div>
        </div>
      </div>
    ),
  }
);

interface PostDetailContentProps {
  post: PostWithRelations;
}

export async function PostDetailContent({ post }: PostDetailContentProps) {
  // 获取评论
  const commentsResult = await getPostComments(post.id);
  const comments = commentsResult.comments || [];

  // 渲染markdown内容
  const htmlContent = await markdownToHtml(post.content);

  // 计算阅读时间（假设每分钟阅读200字）
  const wordsCount = post.content.split(/\s+/).length;
  const readingTime = Math.ceil(wordsCount / 200);

  return (
    <article className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Cover Image Section */}
      {post.coverImage && (
        <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden mb-8">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
      )}
      {/* Back Button */}
      <Link href="/posts">
        <Button variant="ghost" className="mb-6 -ml-4">
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
          Back to Posts
        </Button>
      </Link>

      {/* Category & Featured Badge */}
      <div className="flex items-center gap-2 mb-4">
        <Link href={`/posts?category=${post.category.slug}`}>
          <Badge
            variant="secondary"
            className="hover:bg-secondary/80 cursor-pointer"
          >
            {post.category.name}
          </Badge>
        </Link>
        {post.featured && (
          <Badge
            variant="default"
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            Featured
          </Badge>
        )}
      </div>

      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
        {post.title}
      </h1>

      {/* Brief */}
      <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
        {post.brief}
      </p>

      {/* Author & Meta Info */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-8 mb-4 border-b border-border">
        <div className="flex items-center gap-4">
          {/* Author Avatar */}
          <Avatar className="w-12 h-12">
            <AvatarImage
              src={post.author.image || undefined}
              alt={post.author.name}
            />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {post.author.name[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div>
            <p className="font-semibold text-foreground">{post.author.name}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" aria-hidden="true" />
                <span>
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" aria-hidden="true" />
                <span>{readingTime} min read</span>
              </div>
            </div>
          </div>
        </div>

        {/* Views */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Eye className="w-4 h-4" aria-hidden="true" />
          <span className="text-sm">{post.views || 0} views</span>
        </div>
      </div>
      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link key={tag.id} href={`/posts?tag=${tag.slug}`}>
                <Badge
                  variant="outline"
                  className="bg-slate-300 px-2 py-1 hover:bg-accent cursor-pointer"
                >
                  # {tag.name}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Article Content */}
      <div className="mb-12">
        <MarkdownContent html={htmlContent} />
      </div>

      {/* Comments Section */}
      <CommentSection postId={post.id} initialComments={comments} />
    </article>
  );
}
