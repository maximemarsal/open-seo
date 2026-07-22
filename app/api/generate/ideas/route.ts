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

// ---------------------------------------------------------------------------
// Similarity filtering — prompt instructions alone don't stop the model from
// rehashing the same themes with new wording, so we enforce novelty in code.
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  // French
  "les", "des", "une", "aux", "avec", "pour", "sans", "sur", "sous", "dans",
  "est", "vos", "votre", "nos", "notre", "ses", "son", "leur", "leurs", "qui",
  "que", "quoi", "comment", "pourquoi", "quand", "plus", "moins", "tout",
  "tous", "toute", "toutes", "bien", "faire", "ans", "chez", "entre", "vers",
  "par", "pas", "mais", "aussi", "afin", "ces", "cette", "etre", "avoir",
  "guide", "conseils", "astuces", "erreurs", "eviter", "reussir", "grace",
  // English
  "the", "and", "for", "with", "your", "how", "why", "what", "best", "tips",
  "guide", "top", "avoid", "mistakes",
]);

// Lowercase, strip accents/punctuation, keep significant words only.
// Trailing s/x are stripped (light stemming) so "locataire"/"locataires"
// count as the same word.
function significantWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
      .map((w) => w.replace(/[sx]$/, ""))
  );
}

// Overlap coefficient: |A ∩ B| / min(|A|, |B|). Robust when one title is
// much shorter than the other.
function titleSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  small.forEach((w) => {
    if (large.has(w)) inter++;
  });
  return inter / small.size;
}

// Two titles sharing ≥60% of their significant words = same subject.
const SIMILARITY_THRESHOLD = 0.6;

/**
 * Keywords that dominate the existing catalogue (appear in ≥25% of titles).
 * Fed back into the prompt so the model steers AWAY from them, instead of
 * producing yet another variation.
 */
function overusedKeywords(titles: string[], max = 8): string[] {
  if (titles.length < 4) return [];
  const counts = new Map<string, number>();
  for (const t of titles) {
    significantWords(t).forEach((w) => {
      counts.set(w, (counts.get(w) || 0) + 1);
    });
  }
  return Array.from(counts.entries())
    .filter(([, n]) => n / titles.length >= 0.25)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

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
    // Over-request so the similarity filter below can drop near-duplicates
    // and still return the requested count.
    const askCount = Math.min(count * 2, 40);
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

      // Themes already saturating the catalogue — force the model away from
      // them instead of letting it produce the umpteenth variation.
      const overused = overusedKeywords(knownTitles);
      const overusedBlock = overused.length
        ? `\nOVERUSED themes in the catalogue above: "${overused.join(
            '", "'
          )}". These subjects are saturated — AT MOST 2 of your ideas may touch any of them. Explore the OTHER facets of this business instead: adjacent problems of the same audience, different personas (beginner vs expert, different customer types), different content formats (case study, comparison, checklist, myth-busting, data/trends, regulation, seasonal), different stages of the customer journey (discovery, evaluation, onboarding, daily use, renewal).`
        : "";

      const userPrompt = `Today's date: ${today}.

${
  businessContext
    ? `Business context (this is the user's company — every idea must serve this audience and align with this positioning):\n${businessContext}`
    : "No business context provided — propose evergreen, broadly useful article titles."
}

${knownBlock}
${overusedBlock}

Generate ${askCount} distinct, SEO-friendly article TITLE IDEAS that this business could publish next.

Strict rules:
- Each item is ONLY a title (no description, no numbering, no quotes).
- Titles must be in the same language as the business context above (default: French).
- Avoid duplicates and near-duplicates of the existing titles listed above (different wording but same topic counts as a duplicate — exclude it).
- Every idea must target a DIFFERENT theme: no two ideas may share their main keyword or answer the same search intent.
- Spread the ideas across different personas, funnel stages, and content formats — not ${askCount} variations of the flagship topic.
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
        temperature: 0.9,
        maxTokens: 2500,
      });

      // Enforce novelty in code: drop any idea too close to an existing
      // title/topic OR to an already-accepted idea, then trim to `count`.
      const knownSets = knownTitles.map(significantWords);
      const acceptedSets: Set<string>[] = [];
      const ideas: string[] = [];
      for (const candidate of extractJsonArray(raw)) {
        if (ideas.length >= count) break;
        const words = significantWords(candidate);
        const tooClose = [...knownSets, ...acceptedSets].some(
          (s) => titleSimilarity(words, s) >= SIMILARITY_THRESHOLD
        );
        if (tooClose) continue;
        acceptedSets.push(words);
        ideas.push(candidate);
      }

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
