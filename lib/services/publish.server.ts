import {
  BlogContent,
  PublishTarget,
  SEOMetadata,
  SavedArticle,
} from "../../types/blog";
import { getSiteServer } from "./sites.server";
import { getWpCredentialsServer } from "./wpCredentials.server";
import { getBlogApiCredentialsServer } from "./blogApiCredentials.server";
import { WordPressService } from "./wordpress";
import { BlogApiService } from "./blogApi";
import { markArticlePublished } from "./articles.server";

export type NormalizedPublishResult = {
  target: PublishTarget;
  // WordPress
  postId?: number;
  editUrl?: string;
  // Blog API
  slug?: string;
  url?: string;
};

/** Target isn't configured for this site (maps to HTTP 400). */
export class PublishConfigError extends Error {
  status = 400 as const;
}

/** Authentication/connection to the target failed (maps to HTTP 401). */
export class PublishAuthError extends Error {
  status = 401 as const;
}

export type SitePublishContext = {
  target: PublishTarget;
  configured: boolean;
  notConfiguredMessage?: string;
  testConnection: () => Promise<{ success: boolean; message: string }>;
  publish: (
    content: BlogContent,
    seo: SEOMetadata,
    topic: string,
    featuredImageUrl?: string
  ) => Promise<NormalizedPublishResult>;
};

/**
 * Resolve a site's publishing target and return a ready-to-use context that
 * abstracts over WordPress vs the Blog ingestion API. Each site publishes to
 * exactly one target (`site.publishTarget`, default "wordpress").
 */
export async function getSitePublishContext(
  userId: string,
  siteId: string
): Promise<SitePublishContext> {
  const site = await getSiteServer(userId, siteId);
  const target: PublishTarget = site?.publishTarget || "wordpress";

  if (target === "blog-api") {
    const creds = await getBlogApiCredentialsServer(userId, siteId);
    const url = creds?.blogApiUrl || process.env.BLOG_API_URL || "";
    const apiKey = creds?.blogApiKey || process.env.BLOG_API_KEY || "";
    const service = new BlogApiService({
      url,
      apiKey,
      authorName: creds?.blogAuthorName,
      authorAvatarUrl: creds?.blogAuthorAvatarUrl,
      fallbackImageUrl: creds?.blogFallbackImageUrl,
    });
    return {
      target,
      configured: !!(url && apiKey),
      notConfiguredMessage:
        "Blog API is not configured for this site. Add the Blog API URL and key in Settings.",
      testConnection: () => service.testConnection(),
      publish: async (content, seo, topic, featuredImageUrl) => {
        const r = await service.createPost(
          content,
          seo,
          topic,
          "published",
          featuredImageUrl
        );
        return { target, slug: r.slug, url: r.url };
      },
    };
  }

  // Default: WordPress
  const wpCreds = await getWpCredentialsServer(userId, siteId);
  const credentials = {
    url: wpCreds?.wordpressUrl || process.env.WORDPRESS_URL || "",
    username: wpCreds?.wordpressUsername || process.env.WORDPRESS_USERNAME || "",
    password: wpCreds?.wordpressPassword || process.env.WORDPRESS_PASSWORD || "",
  };
  const service = new WordPressService(credentials);
  return {
    target,
    configured: !!(
      credentials.url &&
      credentials.username &&
      credentials.password
    ),
    notConfiguredMessage:
      "WordPress is not configured for this site. Add your WordPress credentials in Settings.",
    testConnection: () => service.testConnection(),
    publish: async (content, seo, topic, featuredImageUrl) => {
      const r = await service.createDraftPost(
        content,
        seo,
        topic,
        "publish",
        featuredImageUrl
      );
      return { target, postId: r.postId, editUrl: r.editUrl };
    },
  };
}

/**
 * Publish a saved article to whatever target its site is configured for, then
 * mark it published in Firestore. Throws PublishConfigError / PublishAuthError
 * for the common, user-actionable failures.
 */
export async function publishArticleToSite(
  userId: string,
  siteId: string,
  article: SavedArticle
): Promise<{ article: SavedArticle | null; result: NormalizedPublishResult }> {
  const ctx = await getSitePublishContext(userId, siteId);
  if (!ctx.configured) {
    throw new PublishConfigError(ctx.notConfiguredMessage || "Not configured");
  }

  const connection = await ctx.testConnection();
  if (!connection.success) {
    throw new PublishAuthError(connection.message);
  }

  const content: BlogContent = {
    html: article.content,
    wordCount: article.wordCount,
  };
  const result = await ctx.publish(content, article.seoMetadata, article.title);

  const updated = await markArticlePublished(userId, siteId, article.id, {
    wordpressPostId: result.postId,
    wordpressEditUrl: result.editUrl,
    blogApiSlug: result.slug,
    blogApiUrl: result.url,
  });

  return { article: updated, result };
}
