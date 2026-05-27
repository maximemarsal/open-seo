import { NextRequest, NextResponse } from "next/server";
import { WordPressService } from "@/lib/services/wordpress";
import {
  verifyIdToken,
  getTokenFromHeader,
  resolveSiteId,
} from "@/lib/auth-server";
import { ensureUserMigrated } from "@/lib/services/migration.server";
import { getWpCredentialsServer } from "@/lib/services/wpCredentials.server";
import { setKnownTitles } from "@/lib/services/userProfile.server";
import { getUserArticles } from "@/lib/services/articles.server";

export async function POST(request: NextRequest) {
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

    const wpCreds = await getWpCredentialsServer(userId, siteId);
    const wordpressCredentials = {
      url: wpCreds?.wordpressUrl || process.env.WORDPRESS_URL || "",
      username:
        wpCreds?.wordpressUsername || process.env.WORDPRESS_USERNAME || "",
      password:
        wpCreds?.wordpressPassword || process.env.WORDPRESS_PASSWORD || "",
    };

    if (
      !wordpressCredentials.url ||
      !wordpressCredentials.username ||
      !wordpressCredentials.password
    ) {
      return NextResponse.json(
        {
          error: "WordPress is not configured for this site",
          hint: "Add your WordPress credentials in Settings for the active site.",
        },
        { status: 400 }
      );
    }

    const wordpressService = new WordPressService(wordpressCredentials);
    const wpPosts = await wordpressService.fetchAllPostTitles();
    const wpTitles = wpPosts.map((p) => p.title).filter(Boolean);

    // Include locally published titles too
    const localArticles = await getUserArticles(userId, siteId);
    const localTitles = localArticles
      .map((a) => a.title || a.seoMetadata?.metaTitle || "")
      .filter(Boolean);

    const allTitles = [...wpTitles, ...localTitles];
    const { count, lastWpSyncAt } = await setKnownTitles(
      userId,
      siteId,
      allTitles
    );

    return NextResponse.json({
      success: true,
      count,
      lastWpSyncAt,
      wpCount: wpTitles.length,
      localCount: localTitles.length,
    });
  } catch (error: any) {
    console.error("WordPress sync-titles error:", error);
    return NextResponse.json(
      {
        error:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to sync titles from WordPress",
      },
      { status: 500 }
    );
  }
}
