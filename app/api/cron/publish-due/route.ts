import { NextRequest, NextResponse } from "next/server";
import {
  getScheduledArticlesDueIndexed,
  getArticleById,
  tryClaimScheduledEntry,
  updateArticle,
} from "../../../../lib/services/articles.server";
import { publishArticleToSite } from "../../../../lib/services/publish.server";

const CRON_SECRET = process.env.CRON_SECRET;

// Verify authorization for cron endpoint
function verifyAuth(request: NextRequest): boolean {
  // Check for Vercel cron header (Vercel automatically adds this)
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  if (vercelCronHeader) {
    return true;
  }

  // Check for Bearer token (for external cron services like cron-job.org, Upstash, etc.)
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (CRON_SECRET && token === CRON_SECRET) {
    return true;
  }

  return false;
}

async function executeCronJob() {
  const dueArticles = await getScheduledArticlesDueIndexed();
  const results: Array<{
    articleId: string;
    userId: string;
    siteId: string;
    status: "published" | "skipped" | "failed";
    reason?: string;
  }> = [];

  for (const entry of dueArticles) {
    const userId = entry.userId;
    const articleId = entry.articleId;
    const siteId = entry.siteId;

    if (!userId || !siteId) {
      results.push({
        articleId,
        userId: userId || "unknown",
        siteId: siteId || "unknown",
        status: "skipped",
        reason: "Missing userId or siteId on index entry — needs migration",
      });
      continue;
    }

    // ATOMIC CLAIM: read + delete the scheduledArticles entry in one
    // transaction. If another concurrent cron already claimed it, skip.
    const claimed = await tryClaimScheduledEntry(userId, siteId, articleId);
    if (!claimed) {
      results.push({
        articleId,
        userId,
        siteId,
        status: "skipped",
        reason: "Already claimed by another cron run",
      });
      continue;
    }

    try {
      // Fetch full article data (scoped to site)
      const article = await getArticleById(userId, siteId, articleId);
      if (!article) {
        results.push({
          articleId,
          userId,
          siteId,
          status: "skipped",
          reason: "Article not found",
        });
        continue;
      }

      // Safety net: if status is already "published", don't re-publish
      if (article.status === "published") {
        results.push({
          articleId,
          userId,
          siteId,
          status: "skipped",
          reason: "Article already marked as published",
        });
        continue;
      }

      // Publish to whatever target this site is configured for (WordPress or
      // Blog API). publishArticleToSite resolves the target, validates the
      // credentials/connection, publishes, and marks the article published.
      await publishArticleToSite(userId, siteId, article);

      results.push({
        articleId,
        userId,
        siteId,
        status: "published",
      });
    } catch (error: any) {
      // The article was claimed (removed from index) but publishing failed.
      // We do NOT re-add it to the index — that's what caused 5x duplicates.
      // Instead, demote to draft so the user knows it failed and can use
      // the "Republish" button to retry manually after fixing the issue.
      try {
        await updateArticle(userId, siteId, articleId, {
          status: "draft",
          scheduledAt: null,
        });
      } catch (revertErr) {
        console.error(
          "Failed to revert article after publish failure:",
          revertErr
        );
      }
      results.push({
        articleId,
        userId,
        siteId,
        status: "failed",
        reason: error?.message || "Unknown error",
      });
    }
  }

  return {
    processed: results.length,
    published: results.filter((r) => r.status === "published").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  };
}

// POST handler for external cron services (cron-job.org, Upstash, etc.)
export async function POST(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await executeCronJob();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Cron publish-due error:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}

// GET handler for Vercel Cron (Vercel calls cron endpoints with GET)
export async function GET(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await executeCronJob();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Cron publish-due error:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
