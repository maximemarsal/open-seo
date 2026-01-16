import axios from "axios";
import { config } from "../config";
import { WordPressPost, SEOMetadata, BlogContent } from "../../types/blog";

type WordPressCredentials = {
  url: string;
  username: string;
  password: string;
};

export class WordPressService {
  private wordpressApi;
  private credentials: WordPressCredentials;

  constructor(credentials?: Partial<WordPressCredentials>) {
    const url = (credentials?.url || config.wordpress.url || "").replace(
      /\/$/,
      ""
    );
    const username = credentials?.username || config.wordpress.username;
    const password = (credentials?.password || config.wordpress.password || "")
      // Remove spaces from application password if present
      .replace(/\s+/g, "");

    this.credentials = { url, username, password };

    this.wordpressApi = axios.create({
      baseURL: `${this.credentials.url}/wp-json/wp/v2`,
      auth: {
        username: this.credentials.username,
        password: this.credentials.password,
      },
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "BlogGeneratorAI/1.0",
      },
    });
  }

  async createDraftPost(
    content: BlogContent,
    seoMetadata: SEOMetadata,
    topic: string,
    status: "draft" | "publish" = "publish",
    featuredImageUrl?: string
  ): Promise<{ postId: number; editUrl: string }> {
    try {
      // Clean the HTML to avoid duplicate H1 when WordPress theme also renders the title
      const cleanedHtml = this.stripLeadingTitle(content.html, seoMetadata.metaTitle);

      // Extract first image from content if no featured image provided
      const firstImageUrl = featuredImageUrl || this.extractFirstImageUrl(content.html);

      const post: WordPressPost = {
        title: seoMetadata.metaTitle,
        content: cleanedHtml,
        status,
        excerpt: seoMetadata.metaDescription,
        slug: seoMetadata.slug,
        meta: {
          _yoast_wpseo_title: seoMetadata.metaTitle,
          _yoast_wpseo_metadesc: seoMetadata.metaDescription,
          _yoast_wpseo_focuskw: seoMetadata.keywords[0] || topic,
          _yoast_wpseo_meta_robots_noindex: "0",
          _yoast_wpseo_meta_robots_nofollow: "0",
          generated_by: "Blog Generator AI",
          generation_date: new Date().toISOString(),
          source_topic: topic,
          word_count: content.wordCount.toString(),
        },
      };

      // 1. Try to create a basic draft first (minimal payload to avoid permission issues with meta/taxonomies)
      const response = await this.wordpressApi.post("/posts", {
        title: post.title,
        content: post.content,
        status: post.status,
        slug: post.slug,
        excerpt: post.excerpt,
      });

      const postId = response.data.id;
      const editUrl = `${this.credentials.url}/wp-admin/post.php?post=${postId}&action=edit`;

      // 2. If successful, update with all other details (meta, slug, taxonomies)
      try {
        const categories = await this.getOrCreateCategories(["IA", "Blog Automatique"]);
        const tags = await this.getOrCreateTags(seoMetadata.keywords);

        await this.wordpressApi.post(`/posts/${postId}`, {
          categories,
          tags,
        });
      } catch (updateError) {
        console.warn("Created draft but failed to update with full details:", updateError);
      }

      // 3. Set featured image from first image in content
      if (firstImageUrl) {
        await this.setFeaturedImageFromUrl(postId, firstImageUrl, seoMetadata.metaTitle);
      }

      // 4. Add SEO metadata if Yoast is available
      await this.addYoastSEO(postId, seoMetadata);

      return {
        postId,
        editUrl,
      };
    } catch (error: any) {
      console.error("WordPress post creation error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
        },
      });
      throw new Error("Failed to create WordPress draft");
    }
  }

  // Extract first image URL from HTML content
  private extractFirstImageUrl(html: string): string | null {
    if (!html) return null;
    const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return imgMatch ? imgMatch[1] : null;
  }

  async setFeaturedImageFromUrl(
    postId: number,
    imageUrl: string,
    alt: string
  ): Promise<void> {
    try {
      // Fetch image bytes from external URL
      const img = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
      });

      // Determine content type and file extension
      const contentType = img.headers["content-type"] || "image/jpeg";
      const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
      const fileName = `cover-${postId}-${Date.now()}.${extension}`;

      // Upload to WP media library
      const mediaResponse = await this.wordpressApi.post("/media", img.data, {
        headers: {
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Type": contentType,
        },
      });

      const mediaId = mediaResponse.data.id;

      // Update alt text
      try {
        await this.wordpressApi.post(`/media/${mediaId}`, { alt_text: alt });
      } catch (altError) {
        console.warn("Failed to set alt text:", altError);
      }

      // Attach as featured image
      await this.wordpressApi.post(`/posts/${postId}`, {
        featured_media: mediaId,
      });

      console.log(`Featured image set successfully for post ${postId}`);
    } catch (error: any) {
      console.warn("Failed to set featured image:", error?.message || error);
    }
  }

  private async addYoastSEO(
    postId: number,
    seoMetadata: SEOMetadata
  ): Promise<void> {
    const yoastMeta = {
      yoast_head_json: {
        title: seoMetadata.metaTitle,
        description: seoMetadata.metaDescription,
      },
      meta: {
        _yoast_wpseo_title: seoMetadata.metaTitle,
        _yoast_wpseo_metadesc: seoMetadata.metaDescription,
        _yoast_wpseo_focuskw: seoMetadata.keywords[0] || "",
      },
    };

    // Method 1: Try updating via post endpoint with meta field
    try {
      await this.wordpressApi.post(`/posts/${postId}`, {
        meta: yoastMeta.meta,
      });
      console.log("Yoast meta updated via post endpoint");
      return;
    } catch (error: any) {
      console.warn("Method 1 (post meta) failed:", error?.response?.data?.message || error.message);
    }

    // Method 2: Try Yoast's own REST API endpoint (if available)
    try {
      // Yoast uses a different base path: /wp-json/yoast/v1/
      await axios.post(
        `${this.credentials.url}/wp-json/yoast/v1/posts/${postId}`,
        {
          wpseo_title: seoMetadata.metaTitle,
          wpseo_metadesc: seoMetadata.metaDescription,
          wpseo_focuskw: seoMetadata.keywords[0] || "",
        },
        {
          auth: {
            username: this.credentials.username,
            password: this.credentials.password,
          },
        }
      );
      console.log("Yoast meta updated via Yoast REST API");
      return;
    } catch (error: any) {
      console.warn("Method 2 (Yoast API) failed:", error?.response?.data?.message || error.message);
    }

    // Method 3: Direct meta endpoint
    try {
      await this.wordpressApi.post(`/posts/${postId}/meta`, yoastMeta.meta);
      console.log("Yoast meta updated via direct meta endpoint");
    } catch (error: any) {
      console.warn("Method 3 (direct meta) failed:", error?.response?.data?.message || error.message);
      console.warn("Could not add Yoast SEO metadata - you may need to add it manually or check Yoast REST API settings");
    }
  }

  private async getOrCreateCategories(
    categoryNames: string[]
  ): Promise<number[]> {
    const categoryIds: number[] = [];

    for (const name of categoryNames) {
      try {
        // First, try to find existing category
        const searchResponse = await this.wordpressApi.get("/categories", {
          params: { search: name },
        });

        let categoryId: number;

        if (searchResponse.data.length > 0) {
          categoryId = searchResponse.data[0].id;
        } else {
          // Create new category
          const createResponse = await this.wordpressApi.post("/categories", {
            name,
            slug: this.slugify(name),
          });
          categoryId = createResponse.data.id;
        }

        categoryIds.push(categoryId);
      } catch (error) {
        console.warn(`Could not handle category "${name}":`, error);
      }
    }

    return categoryIds;
  }

  private async getOrCreateTags(tagNames: string[]): Promise<number[]> {
    const tagIds: number[] = [];

    for (const name of tagNames) {
      try {
        // First, try to find existing tag
        const searchResponse = await this.wordpressApi.get("/tags", {
          params: { search: name },
        });

        let tagId: number;

        if (searchResponse.data.length > 0) {
          tagId = searchResponse.data[0].id;
        } else {
          // Create new tag
          const createResponse = await this.wordpressApi.post("/tags", {
            name,
            slug: this.slugify(name),
          });
          tagId = createResponse.data.id;
        }

        tagIds.push(tagId);
      } catch (error) {
        console.warn(`Could not handle tag "${name}":`, error);
      }
    }

    return tagIds;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[àáâãäå]/g, "a")
      .replace(/[èéêë]/g, "e")
      .replace(/[ìíîï]/g, "i")
      .replace(/[òóôõö]/g, "o")
      .replace(/[ùúûü]/g, "u")
      .replace(/[ýÿ]/g, "y")
      .replace(/[ñ]/g, "n")
      .replace(/[ç]/g, "c")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // Remove any H1 blocks so WordPress theme title is not duplicated
  private stripLeadingTitle(html: string, title: string): string {
    if (!html) return html;

    let cleaned = html;

    cleaned = cleaned.replace(
      new RegExp(
        `<header[^>]*>\\s*<h1[^>]*>\\s*${this.escapeRegex(title)}\\s*<\\/h1>\\s*<\\/header>`,
        "i"
      ),
      ""
    );

    cleaned = cleaned.replace(
      new RegExp(`^\\s*<h1[^>]*>\\s*${this.escapeRegex(title)}\\s*<\\/h1>\\s*`, "i"),
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

  async testConnection(): Promise<{
    success: boolean;
    message: string;
    user?: any;
  }> {
    try {
      const response = await this.wordpressApi.get("/users/me");
      
      if (response.status === 200 && response.data) {
        return {
          success: true,
          message: `Connection successful! Authenticated as: ${response.data.name}`,
          user: {
            id: response.data.id,
            name: response.data.name,
            email: response.data.email,
            roles: response.data.roles,
          },
        };
      }

      return {
        success: false,
        message: "Unable to authenticate with WordPress",
      };
    } catch (error: any) {
      console.error("WordPress connection test failed:", error);

      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 401) {
          return {
            success: false,
            message:
              "Authentication failed: Invalid username or application password. Please check your credentials in Settings.",
          };
        } else if (status === 403) {
          return {
            success: false,
            message:
              "Access forbidden: Your user account doesn't have sufficient permissions to create posts.",
          };
        } else if (status === 404) {
          return {
            success: false,
            message:
              "WordPress site not found or REST API is disabled. Please check your site URL.",
          };
        } else {
          return {
            success: false,
            message: `Connection failed: ${data?.message || error.message}`,
          };
        }
      } else if (error.code === "ENOTFOUND") {
        return {
          success: false,
          message:
            "Site not found: Please check your WordPress URL (make sure it includes https://).",
        };
      } else if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
        return {
          success: false,
          message:
            "Connection timeout: The WordPress site took too long to respond.",
        };
      }

      return {
        success: false,
        message: `Connection error: ${error.message}`,
      };
    }
  }

  async getPostStats(): Promise<{
    totalPosts: number;
    draftPosts: number;
    publishedPosts: number;
  }> {
    try {
      const [allPosts, draftPosts, publishedPosts] = await Promise.all([
        this.wordpressApi.get("/posts", { params: { per_page: 1 } }),
        this.wordpressApi.get("/posts", {
          params: { status: "draft", per_page: 1 },
        }),
        this.wordpressApi.get("/posts", {
          params: { status: "publish", per_page: 1 },
        }),
      ]);

      return {
        totalPosts: parseInt(allPosts.headers["x-wp-total"] || "0"),
        draftPosts: parseInt(draftPosts.headers["x-wp-total"] || "0"),
        publishedPosts: parseInt(publishedPosts.headers["x-wp-total"] || "0"),
      };
    } catch (error) {
      console.error("Failed to get post stats:", error);
      return { totalPosts: 0, draftPosts: 0, publishedPosts: 0 };
    }
  }
}
