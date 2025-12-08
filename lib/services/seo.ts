import { config } from "../config";
import { SEOMetadata, BlogContent, BlogOutline } from "../../types/blog";
import { AITextGenerator, ChatMessage } from "./ai";

export class SEOService {
  private generator: AITextGenerator;
  private modelOverride?: string;
  private reasoningEffort?: "minimal" | "faible" | "moyen" | "élevé";
  private verbosity?: "faible" | "moyenne" | "élevée";
  private provider?:
    | "openai"
    | "anthropic"
    | "gemini"
    | "deepseek"
    | "qwen"
    | "grok";

  constructor(options?: {
    model?: string;
    reasoningEffort?: "minimal" | "faible" | "moyen" | "élevé";
    verbosity?: "faible" | "moyenne" | "élevée";
    provider?: "openai" | "anthropic" | "gemini" | "deepseek" | "qwen" | "grok";
  }) {
    this.generator = new AITextGenerator(
      config.openai.apiKey,
      config.openai.model
    );
    this.modelOverride = options?.model;
    this.reasoningEffort = options?.reasoningEffort;
    this.verbosity = options?.verbosity;
    this.provider = options?.provider;
  }

  async generateSEOMetadata(
    outline: BlogOutline,
    content: BlogContent,
    topic: string
  ): Promise<SEOMetadata> {
    try {
      const prompt = this.buildSEOPrompt(outline, content, topic);

      const messages: ChatMessage[] = [
        {
          role: "system",
          content: `You are a SEO/Copywriting expert. Generate clickworthy (non-clickbait) metadata.
          Write outputs in the same language as the provided topic/title.
          Rules:
          - Title ≤ 60 characters, clear, benefit + natural primary keyword
          - Description ≤ 160 characters, value + curiosity, action verb
          - Slug short, readable, keyword patterns (dashes), no stop-words
          - Tone: professional, engaging

          Respond ONLY with valid JSON, no extra text.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ];

      const seoData = await this.generator.generateText(messages, {
        model: this.modelOverride,
        maxTokens: 1000, // Increased for GPT-5 reasoning + output (will be x5 = 5000 for GPT-5)
        temperature: 0.3,
        reasoningEffort: this.reasoningEffort,
        verbosity: this.verbosity,
        provider: this.provider,
      });
      if (!seoData) {
        throw new Error("No SEO data generated");
      }

      const cleaned = this.extractJson(seoData);
      const metadata = JSON.parse(cleaned) as SEOMetadata;
      return this.validateAndOptimizeSEO(metadata, topic);
    } catch (error) {
      console.error("SEO generation error:", error);
      throw new Error("Failed to generate SEO metadata");
    }
  }

  private extractJson(text: string): string {
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```[a-zA-Z]*\n/, "")
        .replace(/\n```$/, "")
        .trim();
    }
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return cleaned.substring(start, end + 1);
    }
    return cleaned;
  }

  private buildSEOPrompt(
    outline: BlogOutline,
    content: BlogContent,
    topic: string
  ): string {
    const contentPreview = content.html
      .replace(/<[^>]*>/g, " ")
      .substring(0, 500)
      .trim();

    const keyWords = this.extractKeywords(outline, topic);

    return `
Generate optimal, engaging SEO metadata for this blog post:

MAIN TOPIC: ${topic}
ARTICLE TITLE: ${outline.title}
IDENTIFIED KEYWORDS: ${keyWords.join(", ")}

CONTENT (preview):
${contentPreview}...

MAIN SECTIONS:
${outline.sections.map((s) => `- ${s.title}`).join("\n")}

Return JSON with this exact structure and well-filled fields:
{
  "metaTitle": "SEO-optimized title (max 60 characters)",
  "metaDescription": "Engaging meta description (max 160 characters)",
  "slug": "seo-optimized-url-slug",
  "keywords": ["keyword-1", "keyword-2", "keyword-3", "keyword-4", "keyword-5"]
}

Mandatory criteria:
- Meta title: max 60 chars, includes primary keyword
- Meta description: max 160 chars, compels click
- Slug: URL-friendly, with dashes, max 60 chars
- Keywords: 5–8 relevant terms, mix of short- and long-tail

Write outputs in the same language as the provided topic/title.`;
  }

  private extractKeywords(outline: BlogOutline, topic: string): string[] {
    const text = `${outline.title} ${outline.sections
      .map((s) => s.title)
      .join(" ")} ${topic}`;
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3);

    // Count word frequency
    const wordCount: { [key: string]: number } = {};
    words.forEach((word) => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Return most frequent words
    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private validateAndOptimizeSEO(
    metadata: SEOMetadata,
    topic: string
  ): SEOMetadata {
    // Validate and fix meta title length
    if (metadata.metaTitle.length > 60) {
      metadata.metaTitle = metadata.metaTitle.substring(0, 57) + "...";
    }

    // Validate and fix meta description length
    if (metadata.metaDescription.length > 160) {
      metadata.metaDescription =
        metadata.metaDescription.substring(0, 157) + "...";
    }

    // Ensure slug is URL-friendly
    metadata.slug = this.generateSlug(metadata.slug || metadata.metaTitle);

    // Ensure we have keywords
    if (!metadata.keywords || metadata.keywords.length === 0) {
      metadata.keywords = [
        topic.toLowerCase(),
        "guide",
        "conseils",
        "2024",
        "stratégie",
      ];
    }

    return metadata;
  }

  private generateSlug(text: string): string {
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
      .replace(/^-|-$/g, "")
      .substring(0, 60);
  }

  async analyzeSEOScore(
    metadata: SEOMetadata,
    content: BlogContent
  ): Promise<{
    score: number;
    recommendations: string[];
  }> {
    let score = 0;
    const recommendations: string[] = [];

    // Title length check
    if (metadata.metaTitle.length >= 30 && metadata.metaTitle.length <= 60) {
      score += 20;
    } else {
      recommendations.push(
        "Optimiser la longueur du titre SEO (30-60 caractères)"
      );
    }

    // Description length check
    if (
      metadata.metaDescription.length >= 120 &&
      metadata.metaDescription.length <= 160
    ) {
      score += 20;
    } else {
      recommendations.push(
        "Optimiser la longueur de la description (120-160 caractères)"
      );
    }

    // Keywords in title
    const titleLower = metadata.metaTitle.toLowerCase();
    const keywordsInTitle = metadata.keywords.filter((kw) =>
      titleLower.includes(kw.toLowerCase())
    );
    if (keywordsInTitle.length >= 1) {
      score += 20;
    } else {
      recommendations.push("Inclure au moins un mot-clé dans le titre");
    }

    // Content length
    if (content.wordCount >= 800) {
      score += 20;
    } else {
      recommendations.push(
        "Augmenter la longueur du contenu (minimum 800 mots)"
      );
    }

    // Slug optimization
    if (metadata.slug.length <= 60 && metadata.slug.includes("-")) {
      score += 20;
    } else {
      recommendations.push("Optimiser le slug URL");
    }

    return { score, recommendations };
  }
}
