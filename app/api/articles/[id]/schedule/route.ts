import { NextRequest, NextResponse } from "next/server";
import {
  verifyIdToken,
  getTokenFromHeader,
  resolveSiteId,
} from "../../../../../lib/auth-server";
import { ensureUserMigrated } from "../../../../../lib/services/migration.server";
import {
  scheduleArticle,
  unscheduleArticle,
} from "../../../../../lib/services/articles.server";

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

// POST - Schedule an article for future publication
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authAndSite(request);
    if (auth instanceof NextResponse) return auth;
    const { userId, siteId } = auth;

    const body = await request.json();
    const { scheduledAt } = body;

    if (!scheduledAt) {
      return NextResponse.json(
        { error: "scheduledAt is required" },
        { status: 400 }
      );
    }

    // Validate date is in the future
    const scheduleDate = new Date(scheduledAt);
    if (scheduleDate <= new Date()) {
      return NextResponse.json(
        { error: "Scheduled date must be in the future" },
        { status: 400 }
      );
    }

    const article = await scheduleArticle(
      userId,
      siteId,
      params.id,
      scheduledAt
    );
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json({ article });
  } catch (error) {
    console.error("Error scheduling article:", error);
    return NextResponse.json(
      { error: "Failed to schedule article" },
      { status: 500 }
    );
  }
}

// DELETE - Unschedule an article (back to draft)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authAndSite(request);
    if (auth instanceof NextResponse) return auth;
    const { userId, siteId } = auth;

    const article = await unscheduleArticle(userId, siteId, params.id);
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json({ article });
  } catch (error) {
    console.error("Error unscheduling article:", error);
    return NextResponse.json(
      { error: "Failed to unschedule article" },
      { status: 500 }
    );
  }
}
