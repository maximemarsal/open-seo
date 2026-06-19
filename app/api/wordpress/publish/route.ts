import { NextRequest, NextResponse } from "next/server";
import {
  verifyIdToken,
  getTokenFromHeader,
  resolveSiteId,
} from "@/lib/auth-server";
import { ensureUserMigrated } from "@/lib/services/migration.server";
import { getSitePublishContext } from "@/lib/services/publish.server";

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

    await ensureUserMigrated(userId);
    let siteId: string;
    try {
      siteId = await resolveSiteId(request, userId);
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message || "No site available" },
        { status: 400 }
      );
    }

    const ctx = await getSitePublishContext(userId, siteId);

    if (!ctx.configured) {
      return NextResponse.json(
        { error: ctx.notConfiguredMessage || "Publishing is not configured" },
        { status: 400 }
      );
    }

    // Test connection first
    const connection = await ctx.testConnection();
    if (!connection.success) {
      return NextResponse.json({ error: connection.message }, { status: 401 });
    }

    const blogContent = {
      html: content,
      wordCount: content.split(/\s+/).length,
    };

    const seoMetadata = {
      metaTitle: title,
      metaDescription: excerpt || "",
      slug: slug || "",
      keywords: tags || [],
    };

    const result = await ctx.publish(blogContent, seoMetadata, title);

    return NextResponse.json({
      success: true,
      target: result.target,
      // WordPress-shaped fields (kept for backward compatibility with the UI)
      postId: result.postId,
      editUrl: result.editUrl,
      // Blog API fields
      slug: result.slug,
      url: result.url,
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
