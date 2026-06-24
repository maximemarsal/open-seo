import { NextRequest, NextResponse } from "next/server";
import {
  verifyIdToken,
  getTokenFromHeader,
  resolveSiteId,
} from "@/lib/auth-server";
import { getUserApiKeysServer } from "@/lib/services/userKeys.server";
import {
  getUserProfileServer,
  dedupeTitles,
} from "@/lib/services/userProfile.server";
import { getUserArticleTitles } from "@/lib/services/articles.server";
import { ensureUserMigrated } from "@/lib/services/migration.server";
import { config as appConfig } from "@/lib/config";
import { AITextGenerator, ChatMessage } from "@/lib/services/ai";

type Provider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "deepseek"
  | "qwen"
  | "grok";

const DEFAULT_MODELS: Record<Provider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet",
  gemini: "gemini-2.5-flash",
  deepseek: "deepseek-r1",
  qwen: "qwen-qwq-32b-preview",
  grok: "grok-4",
};

function extractJsonArray(text: string): string[] {
  if (!text) return [];

  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```[a-zA-Z]*\n/, "")
      .replace(/\n```$/, "")
      .trim();
  }

  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    const slice = cleaned.substring(start, end + 1);
    try {
      const parsed = JSON.parse(slice);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((x) => typeof x === "string")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    } catch {
      // fallthrough to line-based parsing
    }
  }

  // Fallback: parse line by line, strip bullets/numbers
  return cleaned
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•\d.)\]]+\s*/, "").trim())
    .map((line) => line.replace(/^["'`]|["'`]$/g, "").trim())
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const idToken = getTokenFromHeader(authHeader);
    if (!idToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = await verifyIdToken(idToken);
    if (!userId) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    await ensureUserMigrated(userId);
    let siteId: string;
    try {
      siteId = await resolveSiteId(request, userId);
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message || "No site available" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const count = Math.min(Math.max(parseInt(body.count, 10) || 10, 1), 30);
    const provider: Provider = (body.aiProvider as Provider) || "openai";
    const model: string = body.model || DEFAULT_MODELS[provider];

    const userKeys = await getUserApiKeysServer(userId);
    const profile = await getUserProfileServer(userId, siteId);

    const effectiveKey: Record<Provider, string | undefined> = {
      openai: userKeys?.openaiKey || process.env.OPENAI_API_KEY,
      anthropic: userKeys?.anthropicKey || process.env.ANTHROPIC_API_KEY,
      gemini: userKeys?.geminiKey || process.env.GOOGLE_GEMINI_API_KEY,
      deepseek: userKeys?.deepseekKey || process.env.DEEPSEEK_API_KEY,
      qwen: userKeys?.qwenKey || process.env.QWEN_API_KEY,
      grok: userKeys?.grokKey || process.env.GROK_API_KEY,
    };

    if (!effectiveKey[provider]) {
      return NextResponse.json(
        {
          error: `Missing API key for provider "${provider}"`,
          hint: "Configure your API key in Settings.",
        },
        { status: 400 }
      );
    }

    // Override appConfig with user keys (required for non-OpenAI providers)
    const original = {
      openai: appConfig.openai.apiKey,
      anthropic: appConfig.anthropic.apiKey,
      gemini: appConfig.gemini.apiKey,
      deepseek: appConfig.deepseek.apiKey,
      qwen: appConfig.qwen.apiKey,
      grok: appConfig.grok.apiKey,
    };
    if (effectiveKey.openai) appConfig.openai.apiKey = effectiveKey.openai;
    if (effectiveKey.anthropic)
      appConfig.anthropic.apiKey = effectiveKey.anthropic;
    if (effectiveKey.gemini) appConfig.gemini.apiKey = effectiveKey.gemini;
    if (effectiveKey.deepseek)
      appConfig.deepseek.apiKey = effectiveKey.deepseek;
    if (effectiveKey.qwen) appConfig.qwen.apiKey = effectiveKey.qwen;
    if (effectiveKey.grok) appConfig.grok.apiKey = effectiveKey.grok;

    try {
      const today = new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const businessContext = (profile?.businessContext || "").trim();

      // Build the exclusion list from every source we have so we never repeat
      // existing topics: WordPress-synced titles, the user's own saved articles
      // (any target / status), and titles the client already has on screen or
      // queued (passed as `excludeTitles`).
      const savedTitles = await getUserArticleTitles(userId, siteId).catch(
        () => [] as string[]
      );
      const clientExcludes: string[] = Array.isArray(body.excludeTitles)
        ? body.excludeTitles.filter((t: unknown) => typeof t === "string")
        : [];
      const knownTitles = dedupeTitles([
        ...(profile?.knownArticleTitles || []),
        ...savedTitles,
        ...clientExcludes,
      ]);

      const knownBlock = knownTitles.length
        ? `Existing/already-generated article titles (DO NOT repeat, paraphrase, or propose near-duplicates of these — pick genuinely fresh topics and angles):\n${knownTitles
            .slice(0, 300)
            .map((t) => `- ${t}`)
            .join("\n")}`
        : "There are no previously published or generated articles yet.";

      const userPrompt = `Today's date: ${today}.

${
  businessContext
    ? `Business context (this is the user's company — every idea must serve this audience and align with this positioning):\n${businessContext}`
    : "No business context provided — propose evergreen, broadly useful article titles."
}

${knownBlock}

Generate ${count} distinct, SEO-friendly article TITLE IDEAS that this business could publish next.

Strict rules:
- Each item is ONLY a title (no description, no numbering, no quotes).
- Titles must be in the same language as the business context above (default: French).
- Avoid duplicates and near-duplicates of the existing titles listed above (different wording but same topic counts as a duplicate — exclude it).
- Cover varied subtopics, formats, and angles so the ${count} ideas are also distinct from EACH OTHER.
- Prefer concrete, benefit-driven angles over vague topics.
- Return ONLY a valid JSON array of strings. No markdown, no commentary.

Format strictly:
["First title", "Second title", "Third title"]`;

      const messages: ChatMessage[] = [
        {
          role: "system",
          content:
            "You are a senior SEO editor. You produce concise, click-worthy, non-redundant article title ideas tailored to the user's business. You ALWAYS respond with a valid JSON array of strings and nothing else.",
        },
        { role: "user", content: userPrompt },
      ];

      const generator = new AITextGenerator(
        effectiveKey.openai || "",
        appConfig.openai.model
      );
      const raw = await generator.generateText(messages, {
        model,
        provider,
        temperature: 0.8,
        maxTokens: 1500,
      });

      const ideas = extractJsonArray(raw).slice(0, count);

      return NextResponse.json({ ideas });
    } finally {
      appConfig.openai.apiKey = original.openai;
      appConfig.anthropic.apiKey = original.anthropic;
      appConfig.gemini.apiKey = original.gemini;
      appConfig.deepseek.apiKey = original.deepseek;
      appConfig.qwen.apiKey = original.qwen;
      appConfig.grok.apiKey = original.grok;
    }
  } catch (error: any) {
    console.error("Generate ideas error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate ideas" },
      { status: 500 }
    );
  }
}
