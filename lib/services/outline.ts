import { config } from "../config";
import { BlogOutline, ResearchData } from "../../types/blog";
import { AITextGenerator, ChatMessage } from "./ai";

export class OutlineService {
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

  async generateOutline(
    topic: string,
    researchData: ResearchData,
    extraContext?: string
  ): Promise<BlogOutline> {
    try {
      const prompt = this.buildOutlinePrompt(topic, researchData, extraContext);

      const messages: ChatMessage[] = [
        {
          role: "system",
          content: `You are a senior editorial strategist. You produce reader-first, high-converting blog outlines.
          Write all titles and text in the same language as the provided topic/title.
          Key requirements:
          - Clear, differentiating angle in the title
          - 4–6 sections with logical progression (context → action)
          - Concrete, actionable key points supported by the provided research
          - Tone: professional, warm, accessible (avoid unnecessary jargon)
          - SEO intent integrated naturally (no over-optimization)

          CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no code blocks, no explanations.
          Start directly with { and end with }. Escape all quotes inside strings with \\.
          
          Example format:
          {
            "title": "Article Title Here",
            "introduction": "Introduction text here",
            "sections": [
              {
                "title": "Section Title",
                "keyPoints": ["Point 1", "Point 2", "Point 3"],
                "estimatedWordCount": 300
              }
            ],
            "conclusion": "Conclusion text here"
          }`,
        },
        {
          role: "user",
          content: prompt,
        },
      ];

      const content = await this.generator.generateText(messages, {
        model: this.modelOverride,
        maxTokens: 2000,
        temperature: 0.7,
        reasoningEffort: this.reasoningEffort,
        verbosity: this.verbosity,
        provider: this.provider,
      });

      console.log(
        "Outline generation - Raw content length:",
        content?.length || 0
      );
      console.log(
        "Outline generation - Content preview:",
        content?.substring(0, 200)
      );

      if (!content || content.trim() === "") {
        console.error(
          "Empty content from AI. Model:",
          this.modelOverride,
          "Provider:",
          this.provider
        );
        throw new Error("No content generated for outline");
      }

      // Parse and validate the JSON response (robust against code fences)
      const cleaned = this.extractJson(content);

      // Fix common JSON issues before parsing
      const fixedJson = this.fixCommonJsonIssues(cleaned);

      const outline = JSON.parse(fixedJson) as BlogOutline;
      return this.validateAndEnhanceOutline(outline, topic);
    } catch (error) {
      console.error("Outline generation error:", error);
      throw new Error("Failed to generate blog outline");
    }
  }

  private buildOutlinePrompt(
    topic: string,
    researchData: ResearchData,
    extraContext?: string
  ): string {
    const researchSummary = researchData.results
      .slice(0, 5)
      .map(
        (result) => `- ${result.title}: ${result.content.substring(0, 200)}...`
      )
      .join("\n");

    return `
Generate a complete blog outline in JSON for the topic: "${topic}".

Research (recent snippets):
${researchSummary}

Additional constraints (if any):
${(extraContext || "").trim()}

Structure requirements (strictly follow keys):
{
  "title": "Compelling article title",
  "introduction": {
    "keyPoints": ["Clear promise", "Why it matters now", "What the reader will learn"],
    "tone": "professional-warm|educational|approachable expert"
  },
  "sections": [
    {
      "title": "Section title",
      "keyPoints": ["Concrete key idea 1", "Key idea 2 supported by a data point", "Key idea 3 with example"],
      "estimatedWordCount": 300,
      "subsections": ["Optional subsection 1", "Optional subsection 2"]
    }
  ],
  "conclusion": {
    "keyPoints": ["Memorable synthesis", "Immediate actionable advice"],
    "callToAction": "Natural, value-oriented CTA"
  }
}

Criteria:
- 4–6 sections (250–400 words each), natural progression
- Concrete points based on the provided research
- Benefit-oriented title with natural primary keyword
- Consistent tone: professional, warm, clear, dynamic

Write the outline’s content in the same language as the provided topic/title.`;
  }

  private extractJson(text: string): string {
    // Remove markdown code fences if present
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```[a-zA-Z]*\n/, "")
        .replace(/\n```$/, "")
        .trim();
    }
    // Try to locate first JSON object boundaries
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return cleaned.substring(start, end + 1);
    }
    return cleaned;
  }

  private fixCommonJsonIssues(json: string): string {
    let fixed = json;

    // Fix unescaped quotes in strings
    // This regex finds strings and escapes unescaped quotes within them
    fixed = fixed.replace(/"([^"]*?)"/g, (match, content) => {
      // Don't touch if it's a key or already properly escaped
      if (content.includes('\\"')) return match;
      // Escape any remaining quotes in the content
      const escaped = content.replace(/(?<!\\)"/g, '\\"');
      return `"${escaped}"`;
    });

    // Fix trailing commas before closing braces/brackets
    fixed = fixed.replace(/,(\s*[}\]])/g, "$1");

    // Fix missing commas between properties
    fixed = fixed.replace(/"\s*\n\s*"/g, '",\n"');

    // Fix newlines in strings (replace with spaces)
    fixed = fixed.replace(/"([^"]*)\n([^"]*)"/g, (match, before, after) => {
      return `"${before} ${after}"`;
    });

    return fixed;
  }

  private validateAndEnhanceOutline(
    outline: BlogOutline,
    topic: string
  ): BlogOutline {
    // Validate required fields
    if (
      !outline.title ||
      !outline.introduction ||
      !outline.sections ||
      !outline.conclusion
    ) {
      throw new Error("Invalid outline structure");
    }

    // Ensure we have 4-6 sections
    if (outline.sections.length < 4) {
      // Add generic sections if needed
      while (outline.sections.length < 4) {
        outline.sections.push({
          title: `Aspect important de ${topic}`,
          keyPoints: [
            `Point à développer sur ${topic}`,
            `Détail complémentaire`,
            `Exemple concret`,
          ],
          estimatedWordCount: 300,
        });
      }
    }

    // Ensure each section has sufficient key points
    outline.sections = outline.sections.map((section) => ({
      ...section,
      keyPoints:
        section.keyPoints.length >= 2
          ? section.keyPoints
          : [
              ...section.keyPoints,
              `Point complémentaire sur ${section.title}`,
              `Détail important à retenir`,
            ],
      estimatedWordCount: section.estimatedWordCount || 300,
    }));

    return outline;
  }
}
