import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getTokenFromHeader } from "@/lib/auth-server";
import {
  createArticle,
  listArticles,
  ArticleStatus,
} from "@/lib/services/articles.server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const idToken = getTokenFromHeader(authHeader);
  if (!idToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const userId = await verifyIdToken(idToken);
  if (!userId) {
    return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
  }

  const articles = await listArticles(userId);
  return NextResponse.json({ articles });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const idToken = getTokenFromHeader(authHeader);
  if (!idToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const userId = await verifyIdToken(idToken);
  if (!userId) {
    return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
  }

  const body = await request.json();
  const {
    title,
    topic,
    slug,
    status = "draft",
    scheduledAt,
    publishedAt,
    wordpressPostId,
    wordpressEditUrl,
    contentHtml,
    wordCount,
    seo,
  } = body;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!["draft", "scheduled", "published"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const article = await createArticle(userId, {
    title,
    topic,
    slug,
    status: status as ArticleStatus,
    scheduledAt,
    publishedAt,
    wordpressPostId,
    wordpressEditUrl,
    contentHtml,
    wordCount,
    seo,
  });

  return NextResponse.json({ article });
}

