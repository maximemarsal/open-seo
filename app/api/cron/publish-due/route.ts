import { NextRequest, NextResponse } from "next/server";
import { getScheduledArticlesDueIndexed, getArticleById, markArticlePublished } from "../../../../lib/services/articles.server";
import { getUserApiKeysServer } from "../../../../lib/services/userKeys.server";
import { WordPressService } from "../../../../lib/services/wordpress";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  try {
    if (!CRON_SECRET) {
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();
    if (token !== CRON_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const dueArticles = await getScheduledArticlesDueIndexed();
    const results: Array<{
      articleId: string;
      userId: string;
      status: "published" | "skipped" | "failed";
      reason?: string;
    }> = [];

    for (const entry of dueArticles) {
      try {
        const userId = entry.userId;
        const articleId = entry.articleId;

        if (!userId) {
          results.push({
            articleId,
            userId: "unknown",
            status: "skipped",
            reason: "Missing userId on article",
          });
          continue;
        }

        // Fetch full article data
        const article = await getArticleById(userId, articleId);
        if (!article) {
          results.push({
            articleId,
            userId,
            status: "skipped",
            reason: "Article not found",
          });
          continue;
        }

        const userKeys = await getUserApiKeysServer(userId);
        const wordpressCredentials = {
          url: userKeys?.wordpressUrl || process.env.WORDPRESS_URL || "",
          username: userKeys?.wordpressUsername || process.env.WORDPRESS_USERNAME || "",
          password: userKeys?.wordpressPassword || process.env.WORDPRESS_PASSWORD || "",
        };

        if (
          !wordpressCredentials.url ||
          !wordpressCredentials.username ||
          !wordpressCredentials.password
        ) {
          results.push({
            articleId,
            userId,
            status: "skipped",
            reason: "Missing WordPress credentials",
          });
          continue;
        }

        const wordpressService = new WordPressService(wordpressCredentials);
        const blogContent = {
          html: article.content,
          wordCount: article.wordCount,
        };

        const wpResult = await wordpressService.createDraftPost(
          blogContent,
          article.seoMetadata,
          article.title,
          "publish"
        );

        await markArticlePublished(
          userId,
          articleId,
          wpResult.postId,
          wpResult.editUrl
        );

        results.push({
          articleId,
          userId,
          status: "published",
        });
      } catch (error: any) {
        results.push({
          articleId: entry.articleId,
          userId: entry.userId || "unknown",
          status: "failed",
          reason: error?.message || "Unknown error",
        });
      }
    }

    return NextResponse.json({
      processed: results.length,
      published: results.filter((r) => r.status === "published").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
    });
  } catch (error) {
    console.error("Cron publish-due error:", error);
    return NextResponse.json(
      { error: "Cron failed" },
      { status: 500 }
    );
  }
}

