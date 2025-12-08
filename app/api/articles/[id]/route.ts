import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getTokenFromHeader } from "@/lib/auth-server";
import {
  getArticle,
  updateArticle,
  ArticleStatus,
} from "@/lib/services/articles.server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authHeader = request.headers.get("authorization");
  const idToken = getTokenFromHeader(authHeader);
  if (!idToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const userId = await verifyIdToken(idToken);
  if (!userId) {
    return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
  }

  const existing = await getArticle(userId, params.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const allowedStatus: ArticleStatus[] = ["draft", "scheduled", "published"];
  if (body.status && !allowedStatus.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await updateArticle(userId, params.id, body);
  return NextResponse.json({ article: updated });
}

