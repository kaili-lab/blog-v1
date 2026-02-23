import { connection } from "next/server";
import { CommentWithAuthor, getAllComments } from "@/lib/db-access/comment";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { CommentActions } from "@/app/dashboard/comments/comment-actions";

export default async function CommentsPage() {
  await connection();

  const result = await getAllComments();

  if (!result.success) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Failed to load comments: {result.error}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const comments = result.comments;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">Comments</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          {comments.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No comments yet
              </h3>
              <p className="text-muted-foreground">
                Comments will appear here once users start commenting on your
                posts.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4 md:px-6 min-w-[200px]">
                      Author
                    </TableHead>
                    <TableHead className="px-4 md:px-6 min-w-[250px] max-w-md">
                      Content
                    </TableHead>
                    <TableHead className="px-4 md:px-6 min-w-[180px] max-w-xs">
                      Post
                    </TableHead>
                    <TableHead className="px-4 md:px-6 whitespace-nowrap w-[100px]">
                      Replies
                    </TableHead>
                    <TableHead className="px-4 md:px-6 whitespace-nowrap w-[120px]">
                      Status
                    </TableHead>
                    <TableHead className="px-4 md:px-6 whitespace-nowrap w-[140px]">
                      Date
                    </TableHead>
                    <TableHead className="px-4 md:px-6 whitespace-nowrap w-[180px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comments.map((comment: CommentWithAuthor) => (
                    <TableRow key={comment.id}>
                      <TableCell className="px-4 md:px-6 py-4 md:py-5 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={comment.author.image || ""} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                              {comment.author.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">
                              {comment.author.name || "Anonymous"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {"email" in comment.author
                                ? comment.author.email
                                : "No email"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 md:px-6 py-4 md:py-5 min-w-[250px] max-w-md">
                        <p className="text-foreground truncate">
                          {comment.content}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 md:px-6 py-4 md:py-5 min-w-[180px] max-w-xs">
                        <Link
                          href={`/posts/${comment.post.slug}`}
                          className="text-primary hover:underline text-sm truncate block"
                          title={comment.post.title}
                        >
                          {comment.post.title}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 md:px-6 py-4 md:py-5 whitespace-nowrap w-[100px]">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MessageSquare className="w-4 h-4" />
                          <span>{comment._count.replies}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 md:px-6 py-4 md:py-5 whitespace-nowrap w-[120px]">
                        <Badge
                          variant={comment.approved ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {comment.approved ? "Approved" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 md:px-6 py-4 md:py-5 whitespace-nowrap w-[140px]">
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 md:px-6 py-4 md:py-5 whitespace-nowrap w-[180px]">
                        <CommentActions comment={comment} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
