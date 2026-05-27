import { NextRequest, NextResponse } from "next/server";
import {
  verifyIdToken,
  getTokenFromHeader,
  resolveSiteId,
} from "../../../../lib/auth-server";
import { ensureUserMigrated } from "../../../../lib/services/migration.server";
import {
  getArticleById,
  updateArticle,
  deleteArticle,
} from "../../../../lib/services/articles.server";

async function authAndSite(
  request: NextRequest
): Promise<{ userId: string; siteId: string } | NextResponse> {
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
  try {
    const siteId = await resolveSiteId(request, userId);
    return { userId, siteId };
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "No site available" },
      { status: 400 }
    );
  }
}

// GET - Fetch a single article
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authAndSite(request);
    if (auth instanceof NextResponse) return auth;
    const { userId, siteId } = auth;

    const article = await getArticleById(userId, siteId, params.id);
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }
    return NextResponse.json({ article });
  } catch (error) {
    console.error("Error fetching article:", error);
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 }
    );
  }
}

// PUT - Update an article
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authAndSite(request);
    if (auth instanceof NextResponse) return auth;
    const { userId, siteId } = auth;

    const body = await request.json();
    const article = await updateArticle(userId, siteId, params.id, body);
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }
    return NextResponse.json({ article });
  } catch (error) {
    console.error("Error updating article:", error);
    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an article
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authAndSite(request);
    if (auth instanceof NextResponse) return auth;
    const { userId, siteId } = auth;

    const deleted = await deleteArticle(userId, siteId, params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting article:", error);
    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 }
    );
  }
}
