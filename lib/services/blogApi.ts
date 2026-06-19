import axios from "axios";
import { BlogContent, SEOMetadata } from "../../types/blog";

export type BlogApiServiceCredentials = {
  // Base URL of the ingestion API, e.g. https://jadoremaloc.com/api/blog
  url: string;
  apiKey: string;
  authorName?: string;
  authorAvatarUrl?: string;
};

/**
 * Client for the Blog ingestion API (WordPress-REST-style) documented in
 * jadore-ma-loc-platform/docs/blog-api.md. Pushes generated articles as
 * `format: "html"` posts. Mirrors the surface of WordPressService so the
 * central publisher can treat both targets uniformly.
 */
export class BlogApiService {
  private api;
  private base: string;
  private authorName?: string;
  private authorAvatarUrl?: string;

  constructor(creds: BlogApiServiceCredentials) {
    this.base = (creds.url || "").trim().replace(/\/+$/, "");
    this.authorName = creds.authorName?.trim() || undefined;
    this.authorAvatarUrl = creds.authorAvatarUrl?.trim() || undefined;

    this.api = axios.create({
      baseURL: this.base,
      headers: {
        Authorization: `Bearer ${(creds.apiKey || "").trim()}`,
        "Content-Type": "application/json",
        "User-Agent": "OpenSEO/1.0",
      },
      timeout: 30000,
    });
  }

  /**
   * Create (and optionally publish) an article. Returns the resulting slug and
   * the public URL on the destination site.
   */
  async createPost(
    content: BlogContent,
    seoMetadata: SEOMetadata,
    topic: string,
    status: "draft" | "published" = "published",
    featuredImageUrl?: string
  ): Promise<{ slug: string; url: string }> {
    // Strip a leading H1 — the destination renders the title itself.
    const cleanedHtml = this.stripLeadingTitle(
      content.html,
      seoMetadata.metaTitle
    );
    const coverImage =
      featuredImageUrl || this.extractFirstImageUrl(content.html) || undefined;

    const payload: Record<string, any> = {
      title: seoMetadata.metaTitle || topic,
      content: cleanedHtml,
      format: "html",
      status,
      excerpt: seoMetadata.metaDescription || undefined,
      slug: seoMetadata.slug || undefined,
      tags: (seoMetadata.keywords || []).slice(0, 20),
      seo_title: seoMetadata.metaTitle || undefined,
      seo_description: seoMetadata.metaDescription || undefined,
      cover_image_url: coverImage,
      author_name: this.authorName,
      author_avatar_url: this.authorAvatarUrl,
    };

    // Drop undefined keys so we never send nulls the API doesn't expect.
    Object.keys(payload).forEach(
      (k) => payload[k] === undefined && delete payload[k]
    );

    try {
      const resp = await this.api.post("/posts", payload);
      const post = resp.data?.post || {};
      const slug: string = post.slug || seoMetadata.slug || "";
      return { slug, url: this.publicUrl(slug) };
    } catch (error: any) {
      throw new Error(this.describeError(error, "create the blog post"));
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.base) {
      return { success: false, message: "Blog API URL is missing." };
    }
    try {
      // Validate the write key without creating anything: POST an intentionally
      // invalid payload. Auth runs before payload validation, so a valid key
      // yields 400 (payload rejected) and an invalid key yields 401. Nothing is
      // created because `title`/`content` are required.
      const resp = await this.api.post(
        "/posts",
        {},
        { validateStatus: () => true }
      );
      if (resp.status === 401) {
        return {
          success: false,
          message: "Authentication failed: invalid API key.",
        };
      }
      // 400 = key accepted (payload rejected, as expected). 2xx would mean it
      // somehow created a post — still proves the key works.
      if (resp.status === 400 || (resp.status >= 200 && resp.status < 300)) {
        return { success: true, message: "Connection successful!" };
      }
      if (resp.status === 404) {
        return {
          success: false,
          message:
            "Endpoint not found (404). Check the Blog API URL — it should end with /api/blog.",
        };
      }
      if (resp.status === 502) {
        return {
          success: false,
          message:
            "Blog API database error (502). The destination server's database/Supabase config may be wrong.",
        };
      }
      return {
        success: false,
        message: `Unexpected response from Blog API (HTTP ${resp.status}). The destination server may be down or misconfigured (e.g. missing BLOG_API_KEY / Supabase env).`,
      };
    } catch (error: any) {
      return { success: false, message: this.describeError(error, "connect") };
    }
  }

  // Derive the public article URL from the API base (strip the /api/blog suffix).
  private publicUrl(slug: string): string {
    if (!slug) return this.base;
    try {
      const origin = new URL(this.base).origin;
      return `${origin}/blog/${slug}`;
    } catch {
      return `${this.base}/${slug}`;
    }
  }

  private extractFirstImageUrl(html: string): string | null {
    if (!html) return null;
    const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return imgMatch ? imgMatch[1] : null;
  }

  private stripLeadingTitle(html: string, title: string): string {
    if (!html) return html;
    let cleaned = html;
    cleaned = cleaned.replace(
      new RegExp(
        `<header[^>]*>\\s*<h1[^>]*>\\s*${this.escapeRegex(
          title
        )}\\s*<\\/h1>\\s*<\\/header>`,
        "i"
      ),
      ""
    );
    cleaned = cleaned.replace(
      new RegExp(
        `^\\s*<h1[^>]*>\\s*${this.escapeRegex(title)}\\s*<\\/h1>\\s*`,
        "i"
      ),
      ""
    );
    cleaned = cleaned.replace(/^\s*<h1[^>]*>.*?<\/h1>\s*/i, "");
    cleaned = cleaned.replace(/<h1[^>]*>.*?<\/h1>/gi, "");
    cleaned = cleaned.replace(/<article[^>]*>/i, "").replace(/<\/article>/i, "");
    return cleaned.trim();
  }

  private escapeRegex(text: string): string {
    return text.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  }

  private describeError(error: any, action: string): string {
    const status = error?.response?.status;
    const apiMessage =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message;
    if (status === 401) {
      return "Blog API authentication failed: invalid or missing API key.";
    }
    if (status === 400) {
      return `Blog API rejected the payload: ${apiMessage || "invalid request"}.`;
    }
    if (status === 409) {
      return "Blog API: this slug is already used (409). Change the slug or update the existing post.";
    }
    if (status === 404) {
      return "Blog API endpoint not found (404). Check the Blog API URL.";
    }
    if (status === 502) {
      return "Blog API database error (502). Try again later.";
    }
    if (error?.code === "ENOTFOUND") {
      return "Blog API host not found. Check the URL (include https://).";
    }
    if (error?.code === "ETIMEDOUT" || error?.code === "ECONNABORTED") {
      return "Blog API request timed out.";
    }
    return `Failed to ${action}: ${apiMessage || "unknown error"}`;
  }
}
