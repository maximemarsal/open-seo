import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getTokenFromHeader } from "../../../../../lib/auth-server";
import { getUserApiKeysServer } from "../../../../../lib/services/userKeys.server";
import {
  getArticleById,
  markArticlePublished,
} from "../../../../../lib/services/articles.server";
import { WordPressService } from "../../../../../lib/services/wordpress";

// POST - Publish an article to WordPress immediately or at scheduled time
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("authorization");
    const idToken = getTokenFromHeader(authHeader);
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

    // Get user's WordPress credentials
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
      return NextResponse.json(
        {
          error: "WordPress is not configured",
          hint: "Add your WordPress credentials in Settings.",
        },
        { status: 400 }
      );
    }

    // Get the article
    const article = await getArticleById(userId, params.id);
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Publish to WordPress
    const wordpressService = new WordPressService(wordpressCredentials);

    // Test connection first
    const connection = await wordpressService.testConnection();
    if (!connection.success) {
      return NextResponse.json(
        { error: connection.message },
        { status: 401 }
      );
    }

    // Create the post
    const blogContent = {
      html: article.content,
      wordCount: article.wordCount,
    };

    const result = await wordpressService.createDraftPost(
      blogContent,
      article.seoMetadata,
      article.title,
      "publish"
    );

    // Mark as published in our database
    const updatedArticle = await markArticlePublished(
      userId,
      params.id,
      result.postId,
      result.editUrl
    );

    return NextResponse.json({
      success: true,
      article: updatedArticle,
      wordpress: {
        postId: result.postId,
        editUrl: result.editUrl,
      },
    });
  } catch (error) {
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

