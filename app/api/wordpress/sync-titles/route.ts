import { NextRequest, NextResponse } from "next/server";
import { WordPressService } from "@/lib/services/wordpress";
import { verifyIdToken, getTokenFromHeader } from "@/lib/auth-server";
import { getUserApiKeysServer } from "@/lib/services/userKeys.server";
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

    const userKeys = await getUserApiKeysServer(userId);
    const wordpressCredentials = {
      url: userKeys?.wordpressUrl || process.env.WORDPRESS_URL || "",
      username:
        userKeys?.wordpressUsername || process.env.WORDPRESS_USERNAME || "",
      password:
        userKeys?.wordpressPassword || process.env.WORDPRESS_PASSWORD || "",
    };

    if (
      !wordpressCredentials.url ||
      !wordpressCredentials.username ||
      !wordpressCredentials.password
    ) {
      return NextResponse.json(
        {
          error: "WordPress is not configured",
          hint: "Add your WordPress credentials in Settings first.",
        },
        { status: 400 }
      );
    }

    const wordpressService = new WordPressService(wordpressCredentials);
    const wpPosts = await wordpressService.fetchAllPostTitles();
    const wpTitles = wpPosts.map((p) => p.title).filter(Boolean);

    // Include locally published titles too (in case some weren't pulled or are pending)
    const localArticles = await getUserArticles(userId);
    const localTitles = localArticles
      .map((a) => a.title || a.seoMetadata?.metaTitle || "")
      .filter(Boolean);

    const allTitles = [...wpTitles, ...localTitles];
    const { count, lastWpSyncAt } = await setKnownTitles(userId, allTitles);

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
