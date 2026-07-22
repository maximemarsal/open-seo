// Legacy streaming (SSE) generation endpoint. The pipeline itself lives in
// lib/services/generation.server.ts and is shared with the background job
// worker (lib/services/generationJobs.server.ts) — prefer POST /api/generate/jobs
// for anything that must survive the user leaving the page.
import { NextRequest, NextResponse } from "next/server";
import { GenerationProgress } from "../../../types/blog";
import {
  verifyIdToken,
  getTokenFromHeader,
  resolveSiteId,
} from "../../../lib/auth-server";
import { ensureUserMigrated } from "../../../lib/services/migration.server";
import {
  prepareGeneration,
  runGenerationPipeline,
  parseErrorMessage,
  GenerationOptions,
} from "../../../lib/services/generation.server";

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

    // Migrate legacy user data on first authenticated call.
    await ensureUserMigrated(userId);

    // Resolve which site this request targets.
    let siteId: string;
    try {
      siteId = await resolveSiteId(request, userId);
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message || "No site available" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const options: GenerationOptions = {
      topic: body.topic,
      publishToWordPress: body.publishToWordPress === true,
      researchDepth: body.researchDepth || "moderate",
      useResearch: body.useResearch !== false,
      extraContext: body.extraContext || "",
      numberOfImages: Number(body.numberOfImages) || 0,
      model: body.model,
      openaiModel: body.openaiModel,
      aiProvider: body.aiProvider,
      gpt5ReasoningEffort: body.gpt5ReasoningEffort,
      gpt5Verbosity: body.gpt5Verbosity,
      ctas: Array.isArray(body.ctas) ? body.ctas : [],
    };

    if (!options.topic || typeof options.topic !== "string") {
      return NextResponse.json(
        { error: "Topic is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate required API keys before opening the stream.
    const prepared = await prepareGeneration(userId, siteId, options);
    if (prepared.missingKeys.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required API keys: ${prepared.missingKeys.join(", ")}`,
          hint: "Please configure your API keys in the Settings page.",
        },
        { status: 400 }
      );
    }

    // Create a ReadableStream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;

        const send = (type: string, payload: any) => {
          if (isClosed) return;
          try {
            const data = `data: ${JSON.stringify({ type, payload })}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          } catch (e) {
            console.error(`Error sending ${type}:`, e);
            isClosed = true;
          }
        };

        const close = () => {
          if (isClosed) return;
          try {
            controller.close();
          } catch {}
          isClosed = true;
        };

        try {
          const result = await runGenerationPipeline(
            userId,
            siteId,
            options,
            (progress: GenerationProgress) => send("progress", progress),
            prepared
          );
          send("complete", result);
        } catch (error: any) {
          console.error("Generation error:", error);
          const parsedError = parseErrorMessage(error, options.aiProvider);
          send("error", {
            message: parsedError.message,
            hint: parsedError.hint,
          });
        } finally {
          close();
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
