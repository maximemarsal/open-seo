// Server-side article generation pipeline, shared by:
//   - app/api/generate/route.ts (legacy SSE streaming endpoint)
//   - lib/services/generationJobs.server.ts (background job worker)
//
// The pipeline runs research → outline → writing → SEO → images → cover →
// CTA injection → optional publish, reporting progress through a callback.
import { ResearchService } from "./research";
import { OutlineService } from "./outline";
import { WriterService } from "./writer";
import { SEOService } from "./seo";
import { UnsplashService } from "./unsplash";
import { getSitePublishContext } from "./publish.server";
import { getUserApiKeysServer } from "./userKeys.server";
import { getUserProfileServer } from "./userProfile.server";
import { getWpCredentialsServer } from "./wpCredentials.server";
import { config as appConfig } from "../config";
import {
  GenerationProgress,
  BlogContent,
  ImageAsset,
  CTA,
} from "../../types/blog";

export interface GenerationOptions {
  topic: string;
  publishToWordPress?: boolean;
  researchDepth?: "shallow" | "moderate" | "deep";
  useResearch?: boolean;
  extraContext?: string;
  numberOfImages?: number;
  model?: string;
  openaiModel?: string;
  aiProvider?: string;
  gpt5ReasoningEffort?: string;
  gpt5Verbosity?: string;
  ctas?: CTA[];
}

export interface GenerationResult {
  target?: "wordpress" | "blog-api";
  postId?: number;
  editUrl?: string;
  slug?: string;
  url?: string;
  seoScore: number;
  wordCount: number;
  articleContent: string;
  outline: any;
  seoMetadata: any;
  images: ImageAsset[];
  coverImageUrl?: string;
  research: {
    model?: string;
    queries?: string[];
    usage?: any;
    sample: { title: string; url: string }[];
  };
  recommendations: string[];
  tokenUsage: { input: number; output: number; total: number };
  totalTokens: number;
}

// Parse and format provider errors into a user-friendly message + hint.
export function parseErrorMessage(
  error: any,
  aiProvider?: string
): { message: string; hint?: string } {
  const errorMessage =
    error?.response?.data?.error?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    error?.toString() ||
    "An unknown error occurred";

  const errorString = errorMessage.toLowerCase();
  const statusCode =
    error?.response?.status || error?.status || error?.statusCode;

  const getProviderName = () => {
    if (!aiProvider) return "your AI provider";
    const names: Record<string, string> = {
      openai: "OpenAI",
      anthropic: "Anthropic",
      gemini: "Google Gemini",
      deepseek: "DeepSeek",
      qwen: "Alibaba Qwen",
      grok: "xAI Grok",
      perplexity: "Perplexity",
    };
    return names[aiProvider] || aiProvider;
  };

  const providerName = getProviderName();

  if (
    errorString.includes("insufficient") ||
    errorString.includes("balance") ||
    errorString.includes("credit") ||
    errorString.includes("payment") ||
    errorString.includes("billing") ||
    errorString.includes("account has insufficient") ||
    errorString.includes("you exceeded your current quota") ||
    errorString.includes("quota exceeded") ||
    errorString.includes("billing hard limit") ||
    statusCode === 402 ||
    statusCode === 403
  ) {
    const minAmount = providerName.toLowerCase().includes("perplexity")
      ? "$10"
      : "$5";
    return {
      message: `Insufficient credits in your ${providerName} account`,
      hint: `Please add at least ${minAmount} in credits to your ${providerName} account. Go to Settings → Billing in your ${providerName} dashboard to add credits.`,
    };
  }

  if (
    errorString.includes("invalid api key") ||
    errorString.includes("invalid key") ||
    errorString.includes("authentication") ||
    errorString.includes("unauthorized") ||
    errorString.includes("api key not found") ||
    errorString.includes("invalid_api_key") ||
    errorString.includes("incorrect api key") ||
    errorString.includes("api key is invalid") ||
    statusCode === 401
  ) {
    return {
      message: `Invalid API key for ${providerName}`,
      hint: `Your ${providerName} API key appears to be invalid or expired. Please check your API key in the Settings page and make sure it's correct. You can generate a new key from your ${providerName} dashboard.`,
    };
  }

  if (
    errorString.includes("rate limit") ||
    (errorString.includes("quota") && !errorString.includes("insufficient")) ||
    errorString.includes("too many requests") ||
    errorString.includes("limit exceeded") ||
    errorString.includes("requests per minute") ||
    statusCode === 429
  ) {
    return {
      message: `Rate limit exceeded for ${providerName}`,
      hint: `You've reached the rate limit for ${providerName}. Please wait a few minutes and try again, or upgrade your plan if you need higher limits.`,
    };
  }

  if (
    errorString.includes("model not found") ||
    errorString.includes("invalid model") ||
    errorString.includes("model does not exist")
  ) {
    return {
      message: "Invalid model selected",
      hint: "The selected AI model is not available or doesn't exist. Please try selecting a different model.",
    };
  }

  if (
    errorString.includes("timeout") ||
    errorString.includes("network") ||
    errorString.includes("connection") ||
    errorString.includes("econnrefused") ||
    errorString.includes("enotfound")
  ) {
    return {
      message: "Network connection error",
      hint: "There was a problem connecting to the AI service. Please check your internet connection and try again.",
    };
  }

  return {
    message: errorMessage,
    hint: "Please check your API keys in Settings and ensure you have sufficient credits. If the problem persists, try again in a few minutes.",
  };
}

interface PreparedGeneration {
  missingKeys: string[];
  effectiveKeys: any;
  publishCtx: Awaited<ReturnType<typeof getSitePublishContext>> | null;
}

/**
 * Load user keys + per-site credentials and check that everything required
 * for the requested options is configured. Does not mutate anything.
 */
export async function prepareGeneration(
  userId: string,
  siteId: string,
  options: GenerationOptions
): Promise<PreparedGeneration> {
  const userKeys = await getUserApiKeysServer(userId);
  const wpCreds = await getWpCredentialsServer(userId, siteId);

  const effectiveKeys = {
    openai: userKeys?.openaiKey || process.env.OPENAI_API_KEY,
    perplexity: userKeys?.perplexityKey || process.env.PERPLEXITY_API_KEY,
    anthropic: userKeys?.anthropicKey || process.env.ANTHROPIC_API_KEY,
    gemini: userKeys?.geminiKey || process.env.GOOGLE_GEMINI_API_KEY,
    deepseek: userKeys?.deepseekKey || process.env.DEEPSEEK_API_KEY,
    qwen: userKeys?.qwenKey || process.env.QWEN_API_KEY,
    grok: userKeys?.grokKey || process.env.GROK_API_KEY,
    unsplash: userKeys?.unsplashKey || process.env.UNSPLASH_ACCESS_KEY,
    wordpress: {
      url: wpCreds?.wordpressUrl || process.env.WORDPRESS_URL,
      username: wpCreds?.wordpressUsername || process.env.WORDPRESS_USERNAME,
      password: wpCreds?.wordpressPassword || process.env.WORDPRESS_PASSWORD,
    },
  };

  const missingKeys: string[] = [];

  if (
    !effectiveKeys.openai &&
    !effectiveKeys.anthropic &&
    !effectiveKeys.gemini &&
    !effectiveKeys.deepseek &&
    !effectiveKeys.qwen &&
    !effectiveKeys.grok
  ) {
    missingKeys.push(
      "AI Provider (OpenAI, Anthropic, Gemini, DeepSeek, Qwen, or Grok)"
    );
  }

  const useResearch = options.useResearch !== false;
  if (useResearch && !effectiveKeys.perplexity) {
    missingKeys.push("Perplexity (for web research)");
  }

  const publishCtx = options.publishToWordPress
    ? await getSitePublishContext(userId, siteId)
    : null;
  if (options.publishToWordPress && !publishCtx?.configured) {
    missingKeys.push(
      publishCtx?.notConfiguredMessage || "Publishing credentials"
    );
  }

  if ((options.numberOfImages || 0) > 0 && !effectiveKeys.unsplash) {
    missingKeys.push("Unsplash (for images)");
  }

  return { missingKeys, effectiveKeys, publishCtx };
}

/**
 * Run the full generation pipeline. Throws on failure (use parseErrorMessage
 * to format the error for users). `prepared` may be passed to reuse the key
 * validation already done by the caller.
 */
export async function runGenerationPipeline(
  userId: string,
  siteId: string,
  options: GenerationOptions,
  onProgress?: (progress: GenerationProgress) => void,
  prepared?: PreparedGeneration
): Promise<GenerationResult> {
  const {
    topic,
    publishToWordPress = false,
    researchDepth = "moderate",
    useResearch = true,
    extraContext = "",
    numberOfImages = 0,
    openaiModel,
    model,
    aiProvider,
    gpt5ReasoningEffort,
    gpt5Verbosity,
    ctas = [],
  } = options;

  const prep = prepared || (await prepareGeneration(userId, siteId, options));
  if (prep.missingKeys.length > 0) {
    throw new Error(
      `Missing required API keys: ${prep.missingKeys.join(", ")}`
    );
  }
  const { effectiveKeys, publishCtx } = prep;

  const sendProgress = (progress: GenerationProgress) => {
    try {
      onProgress?.(progress);
    } catch {
      // Progress reporting must never kill the pipeline.
    }
  };

  // Override runtime config object with user keys (no process.env mutation)
  const originalConfig = JSON.parse(JSON.stringify(appConfig));
  if (effectiveKeys.openai)
    appConfig.openai.apiKey = effectiveKeys.openai as string;
  if (effectiveKeys.anthropic)
    appConfig.anthropic.apiKey = effectiveKeys.anthropic as string;
  if (effectiveKeys.gemini)
    appConfig.gemini.apiKey = effectiveKeys.gemini as string;
  if (effectiveKeys.deepseek)
    appConfig.deepseek.apiKey = effectiveKeys.deepseek as string;
  if (effectiveKeys.qwen) appConfig.qwen.apiKey = effectiveKeys.qwen as string;
  if (effectiveKeys.grok) appConfig.grok.apiKey = effectiveKeys.grok as string;
  if (effectiveKeys.perplexity)
    appConfig.perplexity.apiKey = effectiveKeys.perplexity as string;
  if (effectiveKeys.unsplash)
    appConfig.unsplash.accessKey = effectiveKeys.unsplash as string;
  if (effectiveKeys.wordpress.url)
    appConfig.wordpress.url = effectiveKeys.wordpress.url as string;
  if (effectiveKeys.wordpress.username)
    appConfig.wordpress.username = effectiveKeys.wordpress.username as string;
  if (effectiveKeys.wordpress.password)
    appConfig.wordpress.password = effectiveKeys.wordpress.password as string;

  const restoreConfig = () => {
    appConfig.openai.apiKey = originalConfig.openai.apiKey;
    appConfig.anthropic.apiKey = originalConfig.anthropic.apiKey;
    appConfig.gemini.apiKey = originalConfig.gemini.apiKey;
    appConfig.deepseek.apiKey = originalConfig.deepseek.apiKey;
    appConfig.qwen.apiKey = originalConfig.qwen.apiKey;
    appConfig.grok.apiKey = originalConfig.grok.apiKey;
    appConfig.perplexity.apiKey = originalConfig.perplexity.apiKey;
    appConfig.unsplash.accessKey = originalConfig.unsplash.accessKey;
    appConfig.wordpress.url = originalConfig.wordpress.url;
    appConfig.wordpress.username = originalConfig.wordpress.username;
    appConfig.wordpress.password = originalConfig.wordpress.password;
  };

  try {
    // Load user profile (per-site) to enrich context with today's date + business context
    const profile = await getUserProfileServer(userId, siteId);
    const today = new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const businessContext = (profile?.businessContext || "").trim();
    const enrichedContext = [
      `Today's date: ${today}.`,
      businessContext
        ? `Business context (always honor this — the user's company, audience, tone, USP):\n${businessContext}`
        : "",
      (extraContext || "").trim(),
    ]
      .filter(Boolean)
      .join("\n\n");

    const researchService = new ResearchService();
    const effectiveModel = model || openaiModel;
    const serviceOpts = {
      model: effectiveModel,
      reasoningEffort: gpt5ReasoningEffort as any,
      verbosity: gpt5Verbosity as any,
      provider: aiProvider as any,
    };
    const outlineService = new OutlineService(serviceOpts);
    const writerService = new WriterService(serviceOpts);
    const seoService = new SEOService(serviceOpts);

    // Step 1: Research (optional)
    let researchData: any = {
      query: topic,
      results: [],
      timestamp: new Date(),
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: undefined,
      queries: [],
    };
    if (useResearch) {
      sendProgress({
        step: "research",
        message: "Researching recent information...",
        progress: 10,
      });
      researchData = await researchService.searchTopic(topic, researchDepth);
    }
    (researchData as any).extraContext = enrichedContext;

    // Step 2: Generate outline
    sendProgress({
      step: "outline",
      message: "Generating article outline...",
      progress: 25,
    });
    const outline = await outlineService.generateOutline(
      topic,
      researchData,
      enrichedContext
    );

    // Step 3: Write article
    sendProgress({
      step: "writing",
      message: "Writing the article...",
      progress: 40,
    });
    const content = await writerService.writeCompleteArticle(
      outline,
      researchData,
      (progress) => {
        sendProgress({
          step: "writing",
          message: `Writing...`,
          progress:
            40 +
            (progress.section === "Introduction"
              ? 5
              : progress.section === "Conclusion"
              ? 25
              : 15),
          currentSection: progress.section,
        });
      }
    );

    // Step 4: Generate SEO metadata
    sendProgress({
      step: "seo",
      message: "Generating SEO metadata...",
      progress: 80,
    });
    const seoMetadata = await seoService.generateSEOMetadata(
      outline,
      content,
      topic
    );
    const seoAnalysis = await seoService.analyzeSEOScore(seoMetadata, content);

    // Step 4.5: Choose N random sections and fetch one image per selected section
    let images: ImageAsset[] = [];
    let contentWithImages: BlogContent = content;
    if (Number(numberOfImages) > 0) {
      sendProgress({
        step: "images",
        message: "Fetching images per section (Unsplash)...",
        progress: 85,
      });

      const unsplash = new UnsplashService();
      const maxImages = Math.min(Math.max(Number(numberOfImages), 0), 5);
      const totalSections = outline.sections.length;
      const targetCount = Math.min(maxImages, totalSections);
      const indices = pickRandomIndices(targetCount, totalSections);

      const sectionImageMap: Record<
        number,
        {
          url: string;
          alt: string;
          author?: string;
          authorUrl?: string;
          searchTerm?: string;
        }
      > = {};

      const termCounts: Record<string, number> = {};

      for (const idx of indices) {
        const sec = outline.sections[idx];
        const term = await unsplash.generateSearchTermForSection(
          sec,
          outline.title,
          seoMetadata?.metaDescription
        );
        termCounts[term] = (termCounts[term] || 0) + 1;
        const page = termCounts[term];
        const imgs = await unsplash.searchImages([term], 1, page);
        if (imgs.length > 0) {
          const img = {
            ...imgs[0],
            alt: imgs[0].alt || `${term} — ${sec.title}`,
            searchTerm: term,
          };
          sectionImageMap[idx] = img;
          images.push(img);
        }
      }

      if (Object.keys(sectionImageMap).length > 0) {
        const updatedHtml = injectImagesBySection(
          content.html,
          sectionImageMap
        );
        contentWithImages = { ...content, html: updatedHtml };
      }
    }

    // Step 4.55: Fetch a DEDICATED cover image (hero), distinct from the
    // in-body images. Best-effort.
    let coverImageUrl: string | undefined;
    try {
      const coverUnsplash = new UnsplashService();
      const usedIds = new Set(
        images.map((i) => i.id).filter(Boolean) as string[]
      );
      const coverTerm = await coverUnsplash.generateSearchTermForArticle(
        outline.title,
        seoMetadata?.metaDescription,
        seoMetadata?.keywords
      );
      let candidates = await coverUnsplash.searchImages([coverTerm], 5, 1);
      let pick =
        candidates.find((c) => c.id && !usedIds.has(c.id)) || candidates[0];
      if (!pick) {
        candidates = await coverUnsplash.searchImages([coverTerm], 5, 2);
        pick =
          candidates.find((c) => c.id && !usedIds.has(c.id)) || candidates[0];
      }
      coverImageUrl = pick?.url;
    } catch {
      // Cover image is optional — ignore failures.
    }

    // Step 4.6: Inject CTAs into the article
    if (ctas && ctas.length > 0) {
      const htmlWithCTAs = injectCTAsIntoArticle(
        contentWithImages.html,
        ctas,
        outline.sections.length
      );
      contentWithImages = { ...contentWithImages, html: htmlWithCTAs };
    }

    // Step 5: Publish to the site's target (WordPress or Blog API) if enabled
    let publishResult: {
      target: "wordpress" | "blog-api";
      postId?: number;
      editUrl?: string;
      slug?: string;
      url?: string;
    } | null = null;
    if (publishToWordPress && publishCtx) {
      sendProgress({
        step: "wordpress",
        message:
          publishCtx.target === "blog-api"
            ? "Publishing to Blog API..."
            : "Publishing to WordPress...",
        progress: 90,
      });

      publishResult = await publishCtx.publish(
        contentWithImages,
        seoMetadata,
        topic,
        coverImageUrl ||
          (images && images.length > 0 ? images[0].url : undefined)
      );
    }

    sendProgress({
      step: "completed",
      message: publishToWordPress
        ? "Article generated and published!"
        : "Article generated successfully!",
      progress: 100,
    });

    const writerUsage = (
      writerService as any
    )?.generator?.getUsageTotals?.() || { input: 0, output: 0, total: 0 };
    const seoUsage = (seoService as any)?.generator?.getUsageTotals?.() || {
      input: 0,
      output: 0,
      total: 0,
    };
    const aiInputTokens = (writerUsage.input || 0) + (seoUsage.input || 0);
    const aiOutputTokens = (writerUsage.output || 0) + (seoUsage.output || 0);
    const aiGenerationTokens = aiInputTokens + aiOutputTokens;

    const perplexityTokens = researchData.usage?.totalTokens || 0;
    const totalTokens = aiGenerationTokens + perplexityTokens;

    return {
      ...(publishResult
        ? {
            target: publishResult.target,
            postId: publishResult.postId,
            editUrl: publishResult.editUrl,
            slug: publishResult.slug,
            url: publishResult.url,
          }
        : {}),
      seoScore: seoAnalysis.score,
      wordCount: contentWithImages.wordCount,
      articleContent: contentWithImages.html,
      outline,
      seoMetadata,
      images,
      coverImageUrl,
      research: {
        model: researchData.model,
        queries: researchData.queries,
        usage: researchData.usage,
        sample: researchData.results
          .slice(0, 5)
          .map((r: { title: string; url: string }) => ({
            title: r.title,
            url: r.url,
          })),
      },
      recommendations: seoAnalysis.recommendations,
      tokenUsage: {
        input: aiInputTokens,
        output: aiOutputTokens,
        total: aiGenerationTokens,
      },
      totalTokens,
    };
  } finally {
    restoreConfig();
  }
}

// ============================================================
// HTML helpers (images + CTA injection)
// ============================================================

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Inject one image into specific section indices (0-based) right after each section's H2
function injectImagesBySection(
  html: string,
  sectionImageMap: Record<
    number,
    { url: string; alt: string; author?: string; authorUrl?: string }
  >
): string {
  if (!sectionImageMap || Object.keys(sectionImageMap).length === 0)
    return html;

  const parts = html.split(/(<h2[^>]*>.*?<\/h2>)/i);
  let result = "";
  let sectionCounter = -1;

  for (let i = 0; i < parts.length; i++) {
    const chunk = parts[i];
    const isH2 = /<h2[^>]*>.*?<\/h2>/i.test(chunk);
    result += chunk;

    if (isH2) {
      sectionCounter += 1;
      const img = sectionImageMap[sectionCounter];
      if (img) {
        const caption = img.author
          ? `<figcaption>Photo: <a href="${
              img.authorUrl || "#"
            }" target="_blank" rel="noopener noreferrer">${
              img.author
            }</a> / Unsplash</figcaption>`
          : "";
        result += `
<figure class="my-6">
  <img src="${img.url}" alt="${escapeHtml(
          img.alt
        )}" style="width:100%;height:auto;border-radius:8px;" />
  ${caption}
</figure>`;
      }
    }
  }

  return result;
}

function pickRandomIndices(count: number, total: number): number[] {
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count);
}

// Generate HTML for a CTA block
function generateCTAHtml(cta: CTA): string {
  const { title, description, buttonText, buttonUrl, imageUrl, style, customColors } = cta;

  const getStyleClasses = () => {
    if (style === "custom" && customColors) {
      return {
        container: `background: ${customColors.background || "#f0f0f0"};`,
        title: `color: ${customColors.titleColor || "#111"};`,
        description: `color: ${customColors.descriptionColor || "#555"};`,
        button: `background: ${customColors.buttonBackground || "#111"}; color: ${customColors.buttonTextColor || "#fff"}; text-decoration: none;`,
      };
    }

    switch (style) {
      case "bordered":
        return {
          container: "border: 2px solid #111; background: #fff;",
          title: "color: #111;",
          description: "color: #555;",
          button: "background: #111; color: #fff; text-decoration: none;",
        };
      case "gradient":
        return {
          container: "background: linear-gradient(135deg, #111 0%, #333 50%, #555 100%);",
          title: "color: #fff;",
          description: "color: #e5e5e5;",
          button: "background: #fff; color: #111; text-decoration: none;",
        };
      case "minimal":
        return {
          container: "background: #f5f5f5;",
          title: "color: #111;",
          description: "color: #555;",
          button: "color: #111; text-decoration: underline;",
        };
      default:
        return {
          container: "background: #f0f0f0; border: 1px solid #ddd;",
          title: "color: #111;",
          description: "color: #555;",
          button: "background: #111; color: #fff; text-decoration: none;",
        };
    }
  };

  const styles = getStyleClasses();

  const imageHtml = imageUrl
    ? `<div style="flex-shrink: 0;"><img src="${imageUrl}" alt="${escapeHtml(title || 'CTA')}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 0.75rem;" /></div>`
    : '';

  const buttonHtml = buttonUrl
    ? `<a href="${escapeHtml(buttonUrl)}" target="_blank" rel="noopener noreferrer" style="${styles.button} display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 600; transition: all 0.2s;">${escapeHtml(buttonText || 'Learn More')} <span style="font-size: 1rem;">→</span></a>`
    : '';

  return `<div class="cta-block" style="${styles.container} padding: 2rem; border-radius: 1rem; margin: 2rem 0; ${imageUrl ? 'display: flex; gap: 1.5rem; align-items: center;' : ''}">${imageHtml}<div style="flex: 1;"><h3 style="${styles.title} font-size: 1.5rem; font-weight: bold; margin: 0 0 0.75rem 0;">${escapeHtml(title || '')}</h3><p style="${styles.description} margin: 0 0 1.5rem 0; line-height: 1.6;">${escapeHtml(description || '')}</p>${buttonHtml}</div></div>`;
}

// Inject CTAs into the article at specified positions
export function injectCTAsIntoArticle(
  html: string,
  ctas: CTA[],
  totalSections: number
): string {
  if (!ctas || ctas.length === 0) return html;

  const parts = html.split(/(<h[12][^>]*>.*?<\/h[12]>)/i);

  const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
  const middleSection = Math.floor(h2Count / 2);
  const beforeConclusionSection = Math.max(0, h2Count - 1);

  const expandedCtas: CTA[] = [];
  const usedPositions = new Set<string>();

  const allPositionSlots = [
    { type: "after-intro", key: "after-intro" },
    ...Array.from({ length: h2Count }, (_, i) => ({ type: "after-section", section: i + 1, key: `section-${i + 1}` })),
    { type: "end", key: "end" }
  ];

  for (const cta of ctas) {
    if (cta.positionType === "random") {
      const count = Math.min(Math.max(cta.randomCount || 1, 1), 3);

      const availableSlots = allPositionSlots.filter(slot => !usedPositions.has(slot.key));

      const shuffled = [...availableSlots].sort(() => Math.random() - 0.5);
      const selectedSlots = shuffled.slice(0, Math.min(count, availableSlots.length));

      for (const slot of selectedSlots) {
        usedPositions.add(slot.key);

        if (slot.type === "after-intro") {
          expandedCtas.push({ ...cta, positionType: "after-intro" });
        } else if (slot.type === "after-section" && "section" in slot) {
          expandedCtas.push({ ...cta, positionType: "after-section", sectionNumber: slot.section });
        } else if (slot.type === "end") {
          expandedCtas.push({ ...cta, positionType: "end" });
        }
      }
    } else {
      if (cta.positionType === "after-section") {
        usedPositions.add(`section-${cta.sectionNumber || 1}`);
      } else {
        usedPositions.add(cta.positionType);
      }
      expandedCtas.push(cta);
    }
  }

  let result = "";
  let currentSection = 0;
  let totalH2Found = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    result += part;

    const isH2 = /<h2[^>]*>/i.test(part);
    if (isH2) {
      totalH2Found++;
      currentSection = totalH2Found;
    }

    const isAfterContent = i > 0 && i % 2 === 0;
    if (isAfterContent) {
      const ctasToInject: CTA[] = [];

      for (const cta of expandedCtas) {
        let shouldInject = false;

        switch (cta.positionType) {
          case "after-intro":
            shouldInject = totalH2Found === 0 && i === 2;
            break;

          case "after-section":
            const targetSection = cta.sectionNumber || 1;
            const effectiveSection = Math.min(targetSection, h2Count);
            shouldInject = currentSection === effectiveSection;
            break;

          case "middle":
            shouldInject = currentSection === middleSection;
            break;

          case "before-conclusion":
            shouldInject = currentSection === beforeConclusionSection;
            break;

          case "end":
            shouldInject = i === parts.length - 1;
            break;
        }

        if (shouldInject) {
          ctasToInject.push(cta);
        }
      }

      for (const cta of ctasToInject) {
        result += generateCTAHtml(cta);
      }
    }
  }

  return result;
}
