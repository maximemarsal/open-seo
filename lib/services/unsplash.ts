import axios from "axios";
import OpenAI from "openai";
import { config } from "../config";
import { ImageAsset, BlogSection } from "../../types/blog";

export class UnsplashService {
  private http;
  private openai: OpenAI | null = null;

  constructor() {
    this.http = axios.create({
      baseURL: config.unsplash.baseUrl,
      headers: {
        Authorization: `Client-ID ${config.unsplash.accessKey}`,
      },
    });

    if (config.openai.apiKey) {
      this.openai = new OpenAI({ apiKey: config.openai.apiKey });
    }
  }

  async translateKeywordsToEnglish(keywords: string[]): Promise<string[]> {
    // If already looks English enough or OpenAI is not configured, return as-is
    const needsTranslation = keywords.some((k) => /[àâäéèêëîïôöùûüç]/i.test(k));
    if (!needsTranslation || !this.openai) return keywords;

    try {
      const prompt = `Translate the following SEO keywords to natural English, lowercase, comma-separated. Keep meanings: \n${keywords.join(
        ", "
      )}`;
      const res = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: "system",
            content:
              "You translate keywords to English only. Return comma-separated.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 120,
      });
      const text = (res.choices[0].message.content || "").trim();
      return text
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0);
    } catch {
      return keywords;
    }
  }

  async searchImages(
    keywords: string[],
    count: number,
    page: number = 1
  ): Promise<ImageAsset[]> {
    if (!config.unsplash.accessKey || count <= 0) return [];
    // Skip if placeholder key is still set
    if (/your_unsplash_access_key_here/i.test(config.unsplash.accessKey)) {
      return [];
    }

    try {
      const translated = await this.translateKeywordsToEnglish(keywords);
      const query = translated.slice(0, 5).join(" ");

      const perPage = Math.min(Math.max(count, 1), 5);
      const response = await this.http.get("/search/photos", {
        params: {
          query,
          per_page: perPage,
          page,
          orientation: "landscape",
          content_filter: "high",
          order_by: "relevant",
          lang: "en",
        },
      });

      const results = response.data?.results || [];
      return results.map(
        (r: any): ImageAsset => ({
          id: r.id,
          url: r.urls?.regular || r.urls?.small || r.urls?.full,
          alt:
            r.alt_description || r.description || translated[0] || "blog image",
          author: r.user?.name,
          authorUrl: r.user?.links?.html,
        })
      );
    } catch (error) {
      console.warn(
        "Unsplash search failed:",
        (error as any)?.response?.status || (error as any)?.message
      );
      return [];
    }
  }

  // Generate a broad English Unsplash search term from full section context
  async generateSearchTermForSection(
    section: BlogSection,
    articleTitle?: string,
    articleDescription?: string
  ): Promise<string> {
    const fallbackTerms = [
      section.title,
      ...(section.keyPoints || []),
      articleTitle || "",
      articleDescription || "",
    ].filter(Boolean);

    // Fallback when OpenAI is not available
    if (!this.openai) {
      const translated = await this.translateKeywordsToEnglish(fallbackTerms);
      return this.normalizeBroad(translated.join(" ")) || "kitchen countertop";
    }

    try {
      const prompt = `You are an expert image curator for Unsplash.
Context:
- Article title: ${articleTitle || ""}
- Article description: ${articleDescription || ""}
- Section title: ${section.title}

Goal: Return ONE concise English search term (1–3 words, lowercase) that best matches a concrete photographic SUBJECT (object/place/material/scene) for this section. Be generic, no specific.
Guidelines:
- Prefer physical subjects over abstract concepts.
- No punctuation, brands, or locations. Output ONLY the term.`;

      const res = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: "system",
            content:
              "You generate terse, high-signal image search terms for Unsplash. Output only the term.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 40,
      });

      let text = (res.choices[0].message.content || "").trim();
      text = text.replace(/^"|"$/g, "").split(/\n|,/)[0].trim();
      text = this.normalizeBroad(text);
      if (!text) {
        const translated = await this.translateKeywordsToEnglish(fallbackTerms);
        const normalized = this.normalizeBroad(translated.join(" "));
        return normalized || "kitchen countertop";
      }
      return text;
    } catch {
      const translated = await this.translateKeywordsToEnglish(fallbackTerms);
      const normalized = this.normalizeBroad(translated.join(" "));
      return normalized || "kitchen countertop";
    }
  }

  private normalizeBroad(text: string): string {
    const stopwords = new Set([
      "the",
      "a",
      "an",
      "of",
      "for",
      "and",
      "to",
      "in",
      "on",
      "with",
      "by",
      "from",
      "at",
      "as",
      "about",
      "into",
      "over",
      "under",
      "between",
      "across",
      "per",
      "vs",
      "via",
    ]);

    const tokens = String(text)
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t && !stopwords.has(t));

    // Keep up to 3 tokens (allow simple material + noun combos)
    const trimmed = tokens.slice(0, 3).join(" ");
    return trimmed.trim();
  }
}
