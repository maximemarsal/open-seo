import { NextRequest, NextResponse } from "next/server";
import { validateConfig } from "../../../lib/config";
import { ResearchService } from "../../../lib/services/research";
import { OutlineService } from "../../../lib/services/outline";
import { WriterService } from "../../../lib/services/writer";
import { SEOService } from "../../../lib/services/seo";
import { WordPressService } from "../../../lib/services/wordpress";
import {
  GenerationProgress,
  BlogContent,
  ImageAsset,
  CTA,
} from "../../../types/blog";
import { UnsplashService } from "../../../lib/services/unsplash";
import { config as appConfig } from "../../../lib/config";
import { verifyIdToken, getTokenFromHeader } from "../../../lib/auth-server";
import { getUserApiKeysServer } from "../../../lib/services/userKeys.server";

// Helper function to parse and format error messages
function parseErrorMessage(
  error: any,
  aiProvider?: string
): { message: string; hint?: string } {
  // Extract error message from various error formats (axios, native Error, etc.)
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

  // Get provider name for better error messages
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

  // Check for insufficient credits/balance
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

  // Check for invalid API key
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

  // Check for rate limit / quota exceeded
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

  // Check for model not found / invalid model
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

  // Check for network/timeout errors
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

  // Default error message
  return {
    message: errorMessage,
    hint: "Please check your API keys in Settings and ensure you have sufficient credits. If the problem persists, try again in a few minutes.",
  };
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authHeader = request.headers.get("authorization");
    const idToken = getTokenFromHeader(authHeader);

    if (!idToken) {
      return NextResponse.json(
        { error: "Missing authentication token" },
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

    // 2. Get user API keys from Firestore
    const userKeys = await getUserApiKeysServer(userId);

    // 3. Merge user keys with environment variables (user keys take priority)
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
        url: userKeys?.wordpressUrl || process.env.WORDPRESS_URL,
        username: userKeys?.wordpressUsername || process.env.WORDPRESS_USERNAME,
        password: userKeys?.wordpressPassword || process.env.WORDPRESS_PASSWORD,
      },
    };

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
    } = await request.json();

    if (!topic || typeof topic !== "string") {
      return NextResponse.json(
        { error: "Topic is required and must be a string" },
        { status: 400 }
      );
    }

    // 4. Validate required API keys
    const missingKeys: string[] = [];

    // Always need an AI provider key
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

    // Check Perplexity if research is enabled
    if (useResearch && !effectiveKeys.perplexity) {
      missingKeys.push("Perplexity (for web research)");
    }

    // Check WordPress if publishing is enabled
    if (publishToWordPress) {
      if (
        !effectiveKeys.wordpress.url ||
        !effectiveKeys.wordpress.username ||
        !effectiveKeys.wordpress.password
      ) {
        missingKeys.push("WordPress credentials");
      }
    }

    // Check Unsplash if images are requested
    if (numberOfImages > 0 && !effectiveKeys.unsplash) {
      missingKeys.push("Unsplash (for images)");
    }

    if (missingKeys.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required API keys: ${missingKeys.join(", ")}`,
          hint: "Please configure your API keys in the Settings page.",
        },
        { status: 400 }
      );
    }

    // 5. Override runtime config object with user keys (no process.env mutation)
    const originalConfig = JSON.parse(JSON.stringify(appConfig));
    if (effectiveKeys.openai)
      appConfig.openai.apiKey = effectiveKeys.openai as string;
    if (effectiveKeys.anthropic)
      appConfig.anthropic.apiKey = effectiveKeys.anthropic as string;
    if (effectiveKeys.gemini)
      appConfig.gemini.apiKey = effectiveKeys.gemini as string;
    if (effectiveKeys.deepseek)
      appConfig.deepseek.apiKey = effectiveKeys.deepseek as string;
    if (effectiveKeys.qwen)
      appConfig.qwen.apiKey = effectiveKeys.qwen as string;
    if (effectiveKeys.grok)
      appConfig.grok.apiKey = effectiveKeys.grok as string;
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
      // Shallow restore relevant fields
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

    // Create a ReadableStream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;

        const sendProgress = (progress: GenerationProgress) => {
          if (isClosed) return;
          try {
          const data = `data: ${JSON.stringify({
            type: "progress",
            payload: progress,
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
          } catch (e) {
            console.error("Error sending progress:", e);
            isClosed = true;
          }
        };

        const sendComplete = (result: any) => {
          if (isClosed) return;
          try {
          const data = `data: ${JSON.stringify({
            type: "complete",
            payload: result,
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
          controller.close();
          } catch (e) {
            console.error("Error sending complete:", e);
          } finally {
            isClosed = true;
          }
        };

        const sendError = (error: string) => {
          if (isClosed) return;
          try {
          const data = `data: ${JSON.stringify({
            type: "error",
            payload: { message: error },
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
          controller.close();
          } catch (e) {
            console.error("Error sending error:", e);
          } finally {
            isClosed = true;
          }
        };

        try {
          // Initialize services
          const researchService = new ResearchService();
          const effectiveModel = model || openaiModel;
          const outlineService = new OutlineService({
            model: effectiveModel,
            reasoningEffort: gpt5ReasoningEffort,
            verbosity: gpt5Verbosity,
            provider: aiProvider,
          });
          const writerService = new WriterService({
            model: effectiveModel,
            reasoningEffort: gpt5ReasoningEffort,
            verbosity: gpt5Verbosity,
            provider: aiProvider,
          });
          const seoService = new SEOService({
            model: effectiveModel,
            reasoningEffort: gpt5ReasoningEffort,
            verbosity: gpt5Verbosity,
            provider: aiProvider,
          });
          const wordpressService = publishToWordPress
            ? new WordPressService()
            : null;

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

            researchData = await researchService.searchTopic(
              topic,
              researchDepth
            );
          }
          // Attach extra context for downstream writer usage
          (researchData as any).extraContext = extraContext;

          // Step 2: Generate outline
          sendProgress({
            step: "outline",
            message: "Generating article outline...",
            progress: 25,
          });

          const outline = await outlineService.generateOutline(
            topic,
            researchData,
            extraContext
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
          const seoAnalysis = await seoService.analyzeSEOScore(
            seoMetadata,
            content
          );

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

            // Track term usage to paginate Unsplash results when repeated
            const termCounts: Record<string, number> = {};

            for (const idx of indices) {
              const sec = outline.sections[idx];
              // Generate a concise Unsplash search term from full section context
              const term = await unsplash.generateSearchTermForSection(
                sec,
                outline.title,
                seoMetadata?.metaDescription
              );
              termCounts[term] = (termCounts[term] || 0) + 1;
              const page = termCounts[term]; // 1-based page index to get next result
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

          // Step 4.6: Inject CTAs into the article
          if (ctas && ctas.length > 0) {
            const htmlWithCTAs = injectCTAsIntoArticle(
              contentWithImages.html,
              ctas,
              outline.sections.length
            );
            contentWithImages = { ...contentWithImages, html: htmlWithCTAs };
          }

          // Step 5: Create WordPress draft (if enabled)
          let wordpressResult: { postId: number; editUrl: string } | null =
            null;
          if (publishToWordPress && wordpressService) {
            sendProgress({
              step: "wordpress",
              message: "Creating WordPress draft...",
              progress: 90,
            });

            wordpressResult = await wordpressService.createDraftPost(
              contentWithImages,
              seoMetadata,
              topic
            );

            // Set featured image if we have images
            if (wordpressResult && images && images.length > 0) {
              try {
                await wordpressService.setFeaturedImageFromUrl(
                  wordpressResult.postId,
                  images[0].url,
                  images[0].alt || seoMetadata.metaTitle
                );
              } catch (e) {
                console.warn("Could not set featured image:", e);
              }
            }
          } else {
            sendProgress({
              step: "completed",
              message: "Article generated successfully!",
              progress: 90,
            });
          }

          // Complete
          sendProgress({
            step: "completed",
            message: publishToWordPress
              ? "Article generated and posted to WordPress!"
              : "Article generated successfully!",
            progress: 100,
          });

          // Token usage from services (best-effort exact when providers return usage)
          const writerUsage = (
            writerService as any
          )?.generator?.getUsageTotals?.() || { input: 0, output: 0, total: 0 };
          const seoUsage = (
            seoService as any
          )?.generator?.getUsageTotals?.() || { input: 0, output: 0, total: 0 };
          const aiInputTokens =
            (writerUsage.input || 0) + (seoUsage.input || 0);
          const aiOutputTokens =
            (writerUsage.output || 0) + (seoUsage.output || 0);
          const aiGenerationTokens = aiInputTokens + aiOutputTokens;

          const perplexityTokens = researchData.usage?.totalTokens || 0;
          const totalTokens = aiGenerationTokens + perplexityTokens;

          // Send final result
          sendComplete({
            ...(wordpressResult
              ? {
                  postId: wordpressResult.postId,
                  editUrl: wordpressResult.editUrl,
                }
              : {}),
            seoScore: seoAnalysis.score,
            wordCount: contentWithImages.wordCount,
            articleContent: contentWithImages.html,
            outline,
            seoMetadata,
            images,
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
          });
        } catch (error: any) {
          console.error("Generation error:", error);

          // Parse error to get user-friendly message
          const parsedError = parseErrorMessage(error, aiProvider);

          // Send error with hint
          const errorData = `data: ${JSON.stringify({
            type: "error",
            payload: {
              message: parsedError.message,
              hint: parsedError.hint,
            },
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorData));
          controller.close();
        } finally {
          // Restore original runtime config
          restoreConfig();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

// Inject images into the generated HTML between major sections (after H2 blocks)
function injectImagesIntoArticle(
  html: string,
  images: { url: string; alt: string; author?: string; authorUrl?: string }[]
): string {
  if (!images || images.length === 0) return html;

  // Split on H2 to identify sections; keep the H2 markers
  const parts = html.split(/(<h2[^>]*>.*?<\/h2>)/i);
  let result = "";
  let imageIndex = 0;

  for (let i = 0; i < parts.length; i++) {
    result += parts[i];

    // After each section title block and its following content chunk, try to insert an image
    const isEndOfSectionContent = i % 2 === 0 && i > 0; // crude but effective for our structured HTML
    if (isEndOfSectionContent && imageIndex < images.length) {
      const img = images[imageIndex++];
      const caption = img.author
        ? `<figcaption>Photo: <a href="${
            img.authorUrl || "#"
          }" target="_blank" rel="noopener noreferrer">${
            img.author
          }</a> / Unsplash</figcaption>`
        : "";
      const figure = `
<figure class="my-6">
  <img src="${img.url}" alt="${escapeHtml(
        img.alt
      )}" style="width:100%;height:auto;border-radius:8px;" />
  ${caption}
</figure>`;
      result += figure;
    }
  }

  // If we didn't manage to place all images, append remaining at the end
  while (imageIndex < images.length) {
    const img = images[imageIndex++];
    result += `
<figure class="my-6">
  <img src="${img.url}" alt="${escapeHtml(
      img.alt
    )}" style="width:100%;height:auto;border-radius:8px;" />
</figure>`;
  }

  return result;
}

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
  let sectionCounter = -1; // increment when we see an H2 block

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

  // Get style classes based on CTA style
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

  return `
<div class="cta-block" style="${styles.container} padding: 2rem; border-radius: 1rem; margin: 2rem 0; ${imageUrl ? 'display: flex; gap: 1.5rem; align-items: center;' : ''}">
  ${imageUrl ? `
  <div style="flex-shrink: 0;">
    <img src="${imageUrl}" alt="${escapeHtml(title || 'CTA')}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 0.75rem;" />
  </div>` : ''}
  <div style="flex: 1;">
    <h3 style="${styles.title} font-size: 1.5rem; font-weight: bold; margin: 0 0 0.75rem 0;">
      ${escapeHtml(title || '')}
    </h3>
    <p style="${styles.description} margin: 0 0 1.5rem 0; line-height: 1.6;">
      ${escapeHtml(description || '')}
    </p>
    ${buttonUrl ? `
    <a href="${escapeHtml(buttonUrl)}" target="_blank" rel="noopener noreferrer" style="${styles.button} display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 600; transition: all 0.2s;">
      ${escapeHtml(buttonText || 'Learn More')}
      <span style="font-size: 1rem;">→</span>
    </a>` : ''}
  </div>
</div>`;
}

// Inject CTAs into the article at specified positions
function injectCTAsIntoArticle(
  html: string,
  ctas: CTA[],
  totalSections: number
): string {
  if (!ctas || ctas.length === 0) return html;

  // Split HTML by h2 tags (sections) and h1 (title)
  const parts = html.split(/(<h[12][^>]*>.*?<\/h[12]>)/i);
  let result = "";
  
  // Track sections
  let currentSection = 0; // Start at 0, will increment as we find h2s
  let totalH2Found = 0;
  
  // First pass: count total h2s to calculate positions
  const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
  const middleSection = Math.floor(h2Count / 2);
  const beforeConclusionSection = Math.max(0, h2Count - 1);
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    result += part;
    
    // Check if this is an h2 tag
    const isH2 = /<h2[^>]*>/i.test(part);
    if (isH2) {
      totalH2Found++;
      currentSection = totalH2Found;
    }
    
    // After content that follows a header
    const isAfterContent = i > 0 && i % 2 === 0;
    if (isAfterContent) {
      // Determine which CTAs to inject at this position
      const ctasToInject: CTA[] = [];
      
      for (const cta of ctas) {
        let shouldInject = false;
        
        switch (cta.positionType) {
          case "after-intro":
            // After first content block (before first h2)
            shouldInject = totalH2Found === 0 && i === 2;
            break;
            
          case "after-section":
            // After specific section number
            const targetSection = cta.sectionNumber || 1;
            // If requested section doesn't exist, place at the last available section
            const effectiveSection = Math.min(targetSection, h2Count);
            shouldInject = currentSection === effectiveSection;
            break;
            
          case "middle":
            // Middle of the article
            shouldInject = currentSection === middleSection;
            break;
            
          case "before-conclusion":
            // Before last section
            shouldInject = currentSection === beforeConclusionSection;
            break;
            
          case "end":
            // At the very end
            shouldInject = i === parts.length - 1;
            break;
        }
        
        if (shouldInject) {
          ctasToInject.push(cta);
        }
      }
      
      // Inject all CTAs for this position
      for (const cta of ctasToInject) {
        result += generateCTAHtml(cta);
      }
    }
  }

  return result;
}
