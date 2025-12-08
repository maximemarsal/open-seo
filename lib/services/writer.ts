import { config } from "../config";
import {
  BlogOutline,
  BlogSection,
  BlogContent,
  ResearchData,
} from "../../types/blog";
import { AITextGenerator, ChatMessage } from "./ai";

export class WriterService {
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

  async writeCompleteArticle(
    outline: BlogOutline,
    researchData: ResearchData,
    onProgress?: (progress: { section: string; content: string }) => void
  ): Promise<BlogContent> {
    try {
      let fullContent = "";
      let allSources: string[] = [];

      // Write introduction
      const introContent = await this.writeIntroduction(
        outline,
        researchData,
        "",
        (researchData as any)?.extraContext
      );
      fullContent += introContent.html;
      allSources.push(...(introContent.sources || []));

      onProgress?.({ section: "Introduction", content: introContent.html });

      // Write each section
      for (let i = 0; i < outline.sections.length; i++) {
        const section = outline.sections[i];
        const sectionContent = await this.writeSection(
          section,
          outline,
          researchData,
          fullContent,
          (researchData as any)?.extraContext
        );

        fullContent += sectionContent.html;
        allSources.push(...(sectionContent.sources || []));

        onProgress?.({ section: section.title, content: sectionContent.html });
      }

      // Write conclusion
      const conclusionContent = await this.writeConclusion(
        outline,
        researchData,
        fullContent,
        (researchData as any)?.extraContext
      );
      fullContent += conclusionContent.html;
      allSources.push(...(conclusionContent.sources || []));

      onProgress?.({ section: "Conclusion", content: conclusionContent.html });

      // Remove duplicate sources
      const uniqueSources = Array.from(new Set(allSources));

      return {
        html: this.wrapInArticleStructure(fullContent, outline.title),
        wordCount: this.countWords(fullContent),
        sources: uniqueSources,
      };
    } catch (error) {
      console.error("Article writing error:", error);
      throw new Error("Failed to write article");
    }
  }

  private async writeIntroduction(
    outline: BlogOutline,
    researchData: ResearchData,
    context: string,
    extraContext?: string
  ): Promise<BlogContent> {
    const prompt = this.buildIntroductionPrompt(
      outline,
      researchData,
      extraContext
    );

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a senior copywriter. Write engaging, elegant introductions.
        Write in the same language as the provided outline title.
        Requirements:
        - Strong hook in the first sentence (question, data, concrete stake)
        - State reader intent and benefit clearly
        - Announce the promise (what the reader will get)
        - Tone: professional, warm, clear; no unnecessary jargon
        - 150–220 words; short-to-medium sentences; good rhythm
        - Clean semantic HTML (<p>, <strong>, <em>); no <h1>
        - Avoid clichés (e.g., “In this article…”); prefer a vivid opening.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const content = await this.generator.generateText(messages, {
      model: this.modelOverride,
      maxTokens: 1500, // Increased for full Perplexity context + GPT-5 reasoning (will be x5 = 7500 for GPT-5)
      temperature: 0.7,
      reasoningEffort: this.reasoningEffort,
      verbosity: this.verbosity,
      provider: this.provider,
    });

    return {
      html: content,
      wordCount: this.countWords(content),
      sources: this.extractSources(content),
    };
  }

  private async writeSection(
    section: BlogSection,
    outline: BlogOutline,
    researchData: ResearchData,
    previousContent: string,
    extraContext?: string
  ): Promise<BlogContent> {
    const prompt = this.buildSectionPrompt(
      section,
      outline,
      researchData,
      previousContent,
      extraContext
    );

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a senior writer. Produce pedagogical, structured, pleasant sections.
        Write in the same language as the provided outline title.
        Rules:
        - H2 title = provided section title, followed by a bridge sentence linking to previous context
        - Develop each key point with examples, micro-steps, or mini-cases
        - Target length ≈ ${section.estimatedWordCount} words; short paragraphs
        - Add H3s when helpful for pacing
        - Prefer lists (<ul><li>) to synthesize steps/tips
        - Style: concrete, active, precise; avoid repetition and filler
        - Clean HTML: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>
        - Natural SEO (no keyword stuffing).`,
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const content = await this.generator.generateText(messages, {
      model: this.modelOverride,
      maxTokens: 2000, // Increased for full Perplexity context + GPT-5 reasoning (will be x5 = 10000 for GPT-5)
      temperature: 0.7,
      reasoningEffort: this.reasoningEffort,
      verbosity: this.verbosity,
      provider: this.provider,
    });

    return {
      html: content,
      wordCount: this.countWords(content),
      sources: this.extractSources(content),
    };
  }

  private async writeConclusion(
    outline: BlogOutline,
    researchData: ResearchData,
    previousContent: string,
    extraContext?: string
  ): Promise<BlogContent> {
    const prompt = this.buildConclusionPrompt(
      outline,
      researchData,
      previousContent,
      extraContext
    );

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a senior writer. Craft memorable conclusions that inspire action.
        Write in the same language as the provided outline title.
        Expectations:
        - Fast, clear synthesis (what to remember)
        - Put in perspective (why it matters now)
        - Natural, useful CTA (next concrete step)
        - 130–180 words, positive and motivating tone
        - Clean HTML: <h2>, <p>, <strong>, <em>`,
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const content = await this.generator.generateText(messages, {
      model: this.modelOverride,
      maxTokens: 1200, // Increased for full Perplexity context + GPT-5 reasoning (will be x5 = 6000 for GPT-5)
      temperature: 0.7,
      reasoningEffort: this.reasoningEffort,
      verbosity: this.verbosity,
      provider: this.provider,
    });

    return {
      html: content,
      wordCount: this.countWords(content),
      sources: this.extractSources(content),
    };
  }

  private buildIntroductionPrompt(
    outline: BlogOutline,
    researchData: ResearchData,
    extraContext?: string
  ): string {
    // Include ALL research data without filtering or truncating
    const allResearch = researchData.results
      .map((r, idx) => `[Source ${idx + 1}]\n${r.content}`)
      .join("\n\n");

    return `
Write an engaging blog introduction for: "${outline.title}"

Mention these key points:
${outline.introduction.keyPoints.map((point) => `- ${point}`).join("\n")}

Desired tone: ${outline.introduction.tone}

Complete research information from Perplexity:
${allResearch}

Additional constraints (if any):
${(extraContext || "").trim()}

Sections that will be covered:
${outline.sections.map((s) => `- ${s.title}`).join("\n")}

The introduction must be engaging, informative, and make the reader want to continue.
Write in the same language as the article title.
`;
  }

  private buildSectionPrompt(
    section: BlogSection,
    outline: BlogOutline,
    researchData: ResearchData,
    previousContent: string,
    extraContext?: string
  ): string {
    // Include ALL research data without filtering or truncating
    const allResearch = researchData.results
      .map((r, idx) => `[Source ${idx + 1}]\n${r.content}`)
      .join("\n\n");

    const contextSummary =
      previousContent.length > 500
        ? previousContent.substring(previousContent.length - 500)
        : previousContent;

    return `
Write the next section for the article "${outline.title}":

SECTION TITLE: ${section.title}

Key points to develop:
${section.keyPoints.map((point) => `- ${point}`).join("\n")}

${
  section.subsections
    ? `Optional subsections:
${section.subsections.map((sub) => `- ${sub}`).join("\n")}`
    : ""
}

Target length: about ${section.estimatedWordCount} words

Article context (previous content):
${contextSummary}

Additional constraints (if any):
${(extraContext || "").trim()}

Complete research information from Perplexity:
${allResearch}

The section must flow naturally from the previous content and develop the topic.
Write in the same language as the article title.
`;
  }

  private buildConclusionPrompt(
    outline: BlogOutline,
    researchData: ResearchData,
    previousContent: string,
    extraContext?: string
  ): string {
    // Include ALL research data without filtering or truncating
    const allResearch = researchData.results
      .map((r, idx) => `[Source ${idx + 1}]\n${r.content}`)
      .join("\n\n");

    const contextSummary =
      previousContent.length > 800
        ? previousContent.substring(previousContent.length - 800)
        : previousContent;

    return `
Write a conclusion for the article "${outline.title}":

Key points to summarize:
${outline.conclusion.keyPoints.map((point) => `- ${point}`).join("\n")}

${
  outline.conclusion.callToAction
    ? `Call-to-action: ${outline.conclusion.callToAction}`
    : ""
}

Additional constraints (if any):
${(extraContext || "").trim()}

Article content to summarize:
${contextSummary}

Complete research information from Perplexity:
${allResearch}

The conclusion should synthesize the main points and encourage reader action.
Write in the same language as the article title.
`;
  }

  private wrapInArticleStructure(content: string, title: string): string {
    return `<article>
  <header>
    <h1>${title}</h1>
  </header>
  <div class="article-content">
    ${content}
  </div>
</article>`;
  }

  private countWords(html: string): number {
    // Remove HTML tags and count words
    const text = html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.split(" ").filter((word) => word.length > 0).length;
  }

  private extractSources(content: string): string[] {
    // Simple source extraction - look for URLs or source mentions
    const urlRegex = /https?:\/\/[^\s<>"]+/g;
    const urls = content.match(urlRegex) || [];
    return urls;
  }
}
