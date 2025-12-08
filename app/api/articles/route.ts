import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getTokenFromHeader } from "../../../lib/auth-server";
import {
  saveArticle,
  getUserArticles,
} from "../../../lib/services/articles.server";

// GET - Fetch all articles for user
export async function GET(request: NextRequest) {
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

    const articles = await getUserArticles(userId);
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

    const body = await request.json();
    const { title, content, seoMetadata, outline, images, wordCount } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    const article = await saveArticle(userId, {
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

