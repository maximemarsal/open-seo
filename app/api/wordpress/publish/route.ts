import { NextRequest, NextResponse } from "next/server";
import { WordPressService } from "@/lib/services/wordpress";
import { config } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const { title, content, excerpt, slug, tags } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    // Check if WordPress is configured
    if (
      !config.wordpress.url ||
      !config.wordpress.username ||
      !config.wordpress.password
    ) {
      return NextResponse.json(
        {
          error: "WordPress is not configured",
          hint: "Please set WORDPRESS_URL, WORDPRESS_USERNAME, and WORDPRESS_PASSWORD in your environment variables",
        },
        { status: 400 }
      );
    }

    const wordpressService = new WordPressService();

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
