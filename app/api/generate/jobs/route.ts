// Background generation jobs: enqueue (POST), list (GET), clear finished
// (DELETE ?scope=finished). Generation runs server-side so the user can
// close the page — the UI just polls GET for status.
import { NextRequest, NextResponse } from "next/server";
import {
  verifyIdToken,
  getTokenFromHeader,
  resolveSiteId,
} from "../../../../lib/auth-server";
import { ensureUserMigrated } from "../../../../lib/services/migration.server";
import {
  enqueueGenerationJobs,
  listGenerationJobs,
  clearFinishedJobs,
  kickGenerationWorker,
  requeueStaleJobs,
} from "../../../../lib/services/generationJobs.server";
import { prepareGeneration } from "../../../../lib/services/generation.server";

export const maxDuration = 60;

const MAX_JOBS_PER_BATCH = 50;

async function authAndSite(
  request: NextRequest
): Promise<{ userId: string; siteId: string } | NextResponse> {
  const idToken = getTokenFromHeader(request.headers.get("authorization"));
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
  try {
    const siteId = await resolveSiteId(request, userId);
    return { userId, siteId };
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "No site available" },
      { status: 400 }
    );
  }
}

// POST - Enqueue one or more generation jobs
export async function POST(request: NextRequest) {
  try {
    const auth = await authAndSite(request);
    if (auth instanceof NextResponse) return auth;
    const { userId, siteId } = auth;

    const body = await request.json();
    const rawTopics = Array.isArray(body.topics) ? body.topics : [];
    const items = rawTopics
      .map((t: any) =>
        typeof t === "string"
          ? { topic: t.trim(), scheduledAt: null }
          : {
              topic: String(t?.topic || "").trim(),
              scheduledAt: t?.scheduledAt || null,
            }
      )
      .filter((t: { topic: string }) => t.topic.length > 0);

    if (items.length === 0) {
      return NextResponse.json(
        { error: "At least one topic is required" },
        { status: 400 }
      );
    }
    if (items.length > MAX_JOBS_PER_BATCH) {
      return NextResponse.json(
        { error: `Too many topics (max ${MAX_JOBS_PER_BATCH} per batch)` },
        { status: 400 }
      );
    }

    const options = {
      publishToWordPress: !!body.options?.publishToWordPress,
      researchDepth: body.options?.researchDepth || "moderate",
      useResearch: body.options?.useResearch !== false,
      extraContext: body.options?.extraContext || "",
      numberOfImages: Number(body.options?.numberOfImages) || 0,
      model: body.options?.model || undefined,
      aiProvider: body.options?.aiProvider || undefined,
      gpt5ReasoningEffort: body.options?.gpt5ReasoningEffort || undefined,
      gpt5Verbosity: body.options?.gpt5Verbosity || undefined,
      ctas: Array.isArray(body.options?.ctas) ? body.options.ctas : [],
    };

    // Fail fast on missing keys so the user gets immediate feedback instead
    // of a queue full of failed jobs.
    const prep = await prepareGeneration(userId, siteId, {
      ...options,
      topic: items[0].topic,
    });
    if (prep.missingKeys.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required API keys: ${prep.missingKeys.join(", ")}`,
          hint: "Please configure your API keys in the Settings page.",
        },
        { status: 400 }
      );
    }

    const jobs = await enqueueGenerationJobs(userId, siteId, items, options);

    // Start processing immediately (no-op if a worker loop already runs in
    // this process). The cron backstop picks up anything left over.
    kickGenerationWorker();

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Error enqueueing generation jobs:", error);
    return NextResponse.json(
      { error: "Failed to enqueue generation jobs" },
      { status: 500 }
    );
  }
}

// GET - List jobs for the active site (also self-heals the queue: re-queues
// stale claims and kicks the worker, so polling from the UI resumes any work
// left over after a server restart).
export async function GET(request: NextRequest) {
  try {
    const auth = await authAndSite(request);
    if (auth instanceof NextResponse) return auth;
    const { userId, siteId } = auth;

    const limit = Math.min(
      Math.max(parseInt(request.nextUrl.searchParams.get("limit") || "50", 10) || 50, 1),
      100
    );

    const jobs = await listGenerationJobs(userId, siteId, limit);

    const hasPending = jobs.some(
      (j) => j.status === "queued" || j.status === "running"
    );
    if (hasPending) {
      requeueStaleJobs()
        .then(() => kickGenerationWorker())
        .catch(() => {});
    }

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Error listing generation jobs:", error);
    return NextResponse.json(
      { error: "Failed to list generation jobs" },
      { status: 500 }
    );
  }
}

// DELETE ?scope=finished - Remove all completed/failed jobs of the site
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authAndSite(request);
    if (auth instanceof NextResponse) return auth;
    const { userId, siteId } = auth;

    const scope = request.nextUrl.searchParams.get("scope");
    if (scope !== "finished") {
      return NextResponse.json(
        { error: "Unsupported scope — use ?scope=finished" },
        { status: 400 }
      );
    }

    const removed = await clearFinishedJobs(userId, siteId);
    return NextResponse.json({ removed });
  } catch (error) {
    console.error("Error clearing generation jobs:", error);
    return NextResponse.json(
      { error: "Failed to clear generation jobs" },
      { status: 500 }
    );
  }
}
