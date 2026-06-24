import { NextRequest, NextResponse } from "next/server";
import {
  verifyIdToken,
  getTokenFromHeader,
  resolveSiteId,
} from "../../../lib/auth-server";
import { ensureUserMigrated } from "../../../lib/services/migration.server";
import {
  saveArticle,
  getUserArticles,
} from "../../../lib/services/articles.server";

async function authAndSite(
  request: NextRequest
): Promise<{ userId: string; siteId: string } | NextResponse> {
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

// GET - Fetch all articles for user/site
export async function GET(request: NextRequest) {
  try {
    const auth = await authAndSite(request);
    if (auth instanceof NextResponse) return auth;
    const { userId, siteId } = auth;

    const articles = await getUserArticles(userId, siteId);
    return NextResponse.json({ articles });
  } catch (error) {
    console.error("Error fetching articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}

// POST - Save a new article
export async function POST(request: NextRequest) {
  try {
    const auth = await authAndSite(request);
    if (auth instanceof NextResponse) return auth;
    const { userId, siteId } = auth;

    const body = await request.json();
    const { title, content, seoMetadata, outline, images, coverImageUrl, wordCount } =
      body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    const article = await saveArticle(userId, siteId, {
      title,
      content,
      seoMetadata: seoMetadata || {
        metaTitle: title,
        metaDescription: "",
        slug: "",
        keywords: [],
      },
      outline,
      images,
      // Firestore rejects `undefined` — only include the cover when present.
      ...(coverImageUrl ? { coverImageUrl } : {}),
      wordCount: wordCount || 0,
      status: "draft",
    });

    return NextResponse.json({ article });
  } catch (error) {
    console.error("Error saving article:", error);
    return NextResponse.json(
      { error: "Failed to save article" },
      { status: 500 }
    );
  }
}
