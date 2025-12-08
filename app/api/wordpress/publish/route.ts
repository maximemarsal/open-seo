import { NextRequest, NextResponse } from "next/server";
import { WordPressService } from "@/lib/services/wordpress";
import { verifyIdToken, getTokenFromHeader } from "@/lib/auth-server";
import { getUserApiKeysServer } from "@/lib/services/userKeys.server";

export async function POST(request: NextRequest) {
  try {
    const { title, content, excerpt, slug, tags } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    // Authenticate user to fetch their WordPress credentials
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

    const userKeys = await getUserApiKeysServer(userId);
    const wordpressCredentials = {
      url: userKeys?.wordpressUrl || process.env.WORDPRESS_URL || "",
      username: userKeys?.wordpressUsername || process.env.WORDPRESS_USERNAME || "",
      password: userKeys?.wordpressPassword || process.env.WORDPRESS_PASSWORD || "",
    };

    // Check if WordPress is configured (user keys take priority over env)
    if (
      !wordpressCredentials.url ||
      !wordpressCredentials.username ||
      !wordpressCredentials.password
    ) {
      return NextResponse.json(
        {
          error: "WordPress is not configured",
          hint:
            "Add your WordPress URL, username and application password in Settings, or set WORDPRESS_URL/USERNAME/PASSWORD.",
        },
        { status: 400 }
      );
    }

    const wordpressService = new WordPressService(wordpressCredentials);

    // Test connection first
    const connection = await wordpressService.testConnection();
    if (!connection.success) {
      return NextResponse.json(
        {
          error: connection.message,
          hint:
            "Vérifiez l'identifiant WordPress et le mot de passe d'application (sans espaces superflus).",
        },
        { status: 401 }
      );
    }

    // Create the post - use the correct structure expected by createDraftPost
    const blogContent = {
      html: content,
      sections: [],
      images: [],
      wordCount: content.split(/\s+/).length,
      sources: [],
    };

    const seoMetadata = {
      metaTitle: title,
      metaDescription: excerpt || "",
      slug: slug || "",
      keywords: tags || [],
    };

    const result = await wordpressService.createDraftPost(
      blogContent,
      seoMetadata,
      title
    );

    return NextResponse.json({
      success: true,
      postId: result.postId,
      editUrl: result.editUrl,
    });
  } catch (error) {
    console.error("Error publishing to WordPress:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to publish to WordPress",
      },
      { status: 500 }
    );
  }
}
