import { NextRequest, NextResponse } from "next/server";
import {
  verifyIdToken,
  getTokenFromHeader,
  resolveSiteId,
} from "../../../../../lib/auth-server";
import { ensureUserMigrated } from "../../../../../lib/services/migration.server";
import { getArticleById } from "../../../../../lib/services/articles.server";
import {
  publishArticleToSite,
  PublishConfigError,
  PublishAuthError,
} from "../../../../../lib/services/publish.server";

// POST - Publish an article to WordPress immediately or at scheduled time
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idToken = getTokenFromHeader(request.headers.get("authorization"));
    if (!idToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const userId = await verifyIdToken(idToken);
    if (!userId) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }
    await ensureUserMigrated(userId);
    const siteId = await resolveSiteId(request, userId);

    // Get the article (from the active site)
    const article = await getArticleById(userId, siteId, params.id);
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Publish to whatever target this site is configured for (WordPress or Blog API)
    const { article: updatedArticle, result } = await publishArticleToSite(
      userId,
      siteId,
      article
    );

    return NextResponse.json({
      success: true,
      article: updatedArticle,
      target: result.target,
      wordpress:
        result.target === "wordpress"
          ? { postId: result.postId, editUrl: result.editUrl }
          : undefined,
      blogApi:
        result.target === "blog-api"
          ? { slug: result.slug, url: result.url }
          : undefined,
    });
  } catch (error) {
    if (error instanceof PublishConfigError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof PublishAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error publishing article:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to publish article",
      },
      { status: 500 }
    );
  }
}
