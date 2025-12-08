import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getTokenFromHeader } from "@/lib/auth-server";
import { getUserApiKeysServer } from "@/lib/services/userKeys.server";
import {
  getArticle,
  updateArticle,
} from "@/lib/services/articles.server";
import { WordPressService } from "@/lib/services/wordpress";
import { BlogContent, SEOMetadata } from "@/types/blog";

export async function POST(
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

  const article = await getArticle(userId, params.id);
  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!article.contentHtml) {
    return NextResponse.json(
      { error: "Article content is missing; regenerate the article first." },
      { status: 400 }
    );
  }

  const { publishAt } = await request.json();
  const publishDate = publishAt ? new Date(publishAt) : null;
  const now = new Date();
  const isFuture = publishDate ? publishDate.getTime() > now.getTime() : false;
  const targetStatus = isFuture ? "future" : "publish";

  const userKeys = await getUserApiKeysServer(userId);
  const wpCredentials = {
    url: userKeys?.wordpressUrl || process.env.WORDPRESS_URL || "",
    username: userKeys?.wordpressUsername || process.env.WORDPRESS_USERNAME || "",
    password: userKeys?.wordpressPassword || process.env.WORDPRESS_PASSWORD || "",
  };

  if (!wpCredentials.url || !wpCredentials.username || !wpCredentials.password) {
    return NextResponse.json(
      { error: "WordPress credentials missing" },
      { status: 400 }
    );
  }

  const wordpressService = new WordPressService(wpCredentials);

  const content: BlogContent = {
    html: article.contentHtml,
    wordCount: article.wordCount || 0,
    sources: [],
  };

  const seoMetadata: SEOMetadata = {
    metaTitle: article.seo?.metaTitle || article.title || article.topic || "Article",
    metaDescription: article.seo?.metaDescription || "",
    slug: article.seo?.slug || article.slug || "",
    keywords: article.seo?.keywords || [],
  };

  let postId = article.wordpressPostId;
  let editUrl = article.wordpressEditUrl;

  if (postId) {
    await wordpressService.updatePostStatus(
      postId,
      targetStatus === "future" ? "future" : "publish",
      publishDate ? publishDate.toISOString() : undefined
    );
  } else {
    const result = await wordpressService.createDraftPost(
      content,
      seoMetadata,
      article.topic || article.title || "Article",
      targetStatus === "future" ? "future" : "publish",
      publishDate ? publishDate.toISOString() : undefined
    );
    postId = result.postId;
    editUrl = result.editUrl;
  }

  const updated = await updateArticle(userId, params.id, {
    wordpressPostId: postId,
    wordpressEditUrl: editUrl,
    status: targetStatus === "future" ? "scheduled" : "published",
    publishedAt: publishDate
      ? publishDate.toISOString()
      : new Date().toISOString(),
  });

  return NextResponse.json({ article: updated });
}

