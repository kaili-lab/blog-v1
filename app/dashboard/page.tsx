import { connection } from "next/server";
import { getDashboardStats, getRecentPosts } from "@/lib/db-access/post";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardPage() {
  // 确保每次请求都从数据库读取最新数据，不走 Next.js 缓存
  await connection();

  const [statsResult, recentPostsResult] = await Promise.all([
    getDashboardStats(),
    getRecentPosts(5),
  ]);

  const stats = statsResult.success
    ? statsResult.stats
    : {
        totalArticles: 0,
        recentArticles: 0,
        totalTags: 0,
        totalViews: 0,
      };

  const recentPosts = recentPostsResult.success ? recentPostsResult.posts : [];

  // 格式化数字显示
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  return (
    <div className="bg-background min-h-full">
      <div className="px-3 md:px-4 lg:px-6 py-3 md:py-4 lg:py-5 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Dashboard
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/dashboard/posts/create">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                <Plus className="w-4 h-4" />
                New Article
              </Button>
            </Link>
            <Link href="/dashboard/categories">
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                New Category
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 md:mb-8">
          {/* Total Articles */}
          <div className="bg-card rounded-lg border border-border p-4 md:p-6 shadow-sm">
            <div className="text-sm text-muted-foreground mb-2">
              Total Articles
            </div>
            <div className="text-3xl font-bold text-foreground">
              {formatNumber(stats.totalArticles)}
            </div>
          </div>

          {/* 30 days articles */}
          <div className="bg-card rounded-lg border border-border p-4 md:p-6 shadow-sm">
            <div className="text-sm text-muted-foreground mb-2">
              30 days articles
            </div>
            <div className="text-3xl font-bold text-foreground">
              {formatNumber(stats.recentArticles)}
            </div>
          </div>

          {/* Tag Count */}
          <div className="bg-card rounded-lg border border-border p-4 md:p-6 shadow-sm">
            <div className="text-sm text-muted-foreground mb-2">Tag Count</div>
            <div className="text-3xl font-bold text-foreground">
              {formatNumber(stats.totalTags)}
            </div>
          </div>

          {/* Visitor Statistics */}
          <div className="bg-card rounded-lg border border-border p-4 md:p-6 shadow-sm">
            <div className="text-sm text-muted-foreground mb-2">
              Visitor Statistics
            </div>
            <div className="text-3xl font-bold text-foreground">
              {formatNumber(stats.totalViews)}
            </div>
          </div>
        </div>

        {/* Recent Articles Section */}
        <div className="bg-card rounded-lg border border-border shadow-sm">
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">
              Recent Articles
            </h2>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 md:px-6 py-2 md:py-3 text-sm font-medium text-muted-foreground">
                    Title
                  </th>
                  <th className="text-left px-4 md:px-6 py-2 md:py-3 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left px-4 md:px-6 py-2 md:py-3 text-sm font-medium text-muted-foreground">
                    Category
                  </th>
                  <th className="text-left px-4 md:px-6 py-2 md:py-3 text-sm font-medium text-muted-foreground">
                    Time
                  </th>
                  <th className="text-left px-4 md:px-6 py-2 md:py-3 text-sm font-medium text-muted-foreground">
                    Operations
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentPosts.length > 0 ? (
                  recentPosts.map((post) => (
                    <tr
                      key={post.id}
                      className="border-b border-border hover:bg-accent/50 transition-colors"
                    >
                      <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-foreground">
                        <div className="max-w-xs truncate" title={post.title}>
                          {post.title}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium",
                            post.published
                              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                          )}
                        >
                          {post.published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-muted-foreground">
                        {post.category.name}
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-muted-foreground">
                        {post.publishedAt
                          ? new Date(post.publishedAt).toLocaleDateString()
                          : new Date(post.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/dashboard/posts/edit/${post.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 md:px-6 py-8 text-center text-muted-foreground"
                    >
                      No articles found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
