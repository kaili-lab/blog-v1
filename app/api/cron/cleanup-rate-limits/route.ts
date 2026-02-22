import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// Vercel Cron Job: runs every Monday at midnight UTC
// Schedule is defined in vercel.json
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const deleted = await prisma.rateLimit.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });

    logger.info("Expired rate limit records cleaned up", {
      deletedCount: deleted.count,
    });

    return NextResponse.json({ success: true, deletedCount: deleted.count });
  } catch (error) {
    logger.error("Failed to clean up expired rate limit records", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 }
    );
  }
}
