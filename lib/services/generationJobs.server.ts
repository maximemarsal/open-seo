// Server-side background generation jobs.
//
// Articles are generated ON THE SERVER so the user can close the page:
//   - Jobs live at users/{uid}/sites/{siteId}/generationJobs/{jobId}
//     (full payload + live status/progress, polled by the UI).
//   - A global "generationQueue" collection indexes pending jobs so the
//     worker/cron can find work without scanning all users (same pattern as
//     the "scheduledArticles" index used by the publish cron).
//   - kickGenerationWorker() starts an in-process loop that claims queued
//     entries atomically (safe across multiple server instances) and runs
//     them sequentially. It is invoked fire-and-forget after enqueueing and
//     from a cron backstop, and is a no-op if a loop is already running.
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { CTA, GenerationProgress } from "../../types/blog";
import {
  GenerationOptions,
  runGenerationPipeline,
  prepareGeneration,
  parseErrorMessage,
} from "./generation.server";
import {
  saveArticle,
  markArticlePublished,
  scheduleArticle,
} from "./articles.server";

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const adminDb = getFirestore();

export type GenerationJobStatus = "queued" | "running" | "completed" | "failed";

export interface GenerationJob {
  id: string;
  userId: string;
  siteId: string;
  topic: string;
  // Everything the pipeline needs, minus the topic (stored separately above).
  options: Omit<GenerationOptions, "topic">;
  // When set, the saved article is scheduled at this ISO date after generation.
  scheduledAt?: string | null;
  status: GenerationJobStatus;
  step?: string;
  progress: number;
  message: string;
  currentSection?: string;
  articleId?: string;
  // Small result summary for the UI (never the article content — that lives
  // on the saved article doc).
  result?: {
    articleTitle?: string;
    seoScore?: number;
    wordCount?: number;
    target?: string;
    postId?: number;
    editUrl?: string;
    slug?: string;
    url?: string;
    recommendations?: string[];
    tokenUsage?: { input: number; output: number; total: number };
    totalTokens?: number;
    research?: any;
  };
  error?: string;
  errorHint?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
}

const jobsCol = (userId: string, siteId: string) =>
  adminDb
    .collection("users")
    .doc(userId)
    .collection("sites")
    .doc(siteId)
    .collection("generationJobs");

const queueCol = adminDb.collection("generationQueue");

const queueDocId = (userId: string, siteId: string, jobId: string) =>
  `${userId}__${siteId}__${jobId}`;

// Remove undefined values recursively — Firestore rejects them.
function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return null as any;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined) as any;
  const cleaned: any = {};
  for (const [k, v] of Object.entries(obj as any)) {
    if (v !== undefined) cleaned[k] = stripUndefined(v);
  }
  return cleaned;
}

export async function enqueueGenerationJobs(
  userId: string,
  siteId: string,
  items: { topic: string; scheduledAt?: string | null }[],
  options: Omit<GenerationOptions, "topic">
): Promise<GenerationJob[]> {
  const base = Date.now();
  const jobs: GenerationJob[] = [];

  const batch = adminDb.batch();
  items.forEach((item, index) => {
    // Offset each item by 1ms so ordering inside a batch stays deterministic
    // (jobs list is ordered by createdAt, the queue is drained oldest-first).
    const createdAt = new Date(base + index).toISOString();
    const jobRef = jobsCol(userId, siteId).doc();
    const job: GenerationJob = stripUndefined({
      id: jobRef.id,
      userId,
      siteId,
      topic: item.topic,
      options,
      scheduledAt: item.scheduledAt || null,
      status: "queued",
      progress: 0,
      message: "Waiting in queue...",
      createdAt,
      updatedAt: createdAt,
    });
    batch.set(jobRef, job);
    batch.set(queueCol.doc(queueDocId(userId, siteId, jobRef.id)), {
      userId,
      siteId,
      jobId: jobRef.id,
      createdAt,
      claimedAt: null,
    });
    jobs.push(job);
  });
  await batch.commit();

  return jobs;
}

export async function listGenerationJobs(
  userId: string,
  siteId: string,
  limit = 50
): Promise<GenerationJob[]> {
  const snap = await jobsCol(userId, siteId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as GenerationJob);
}

export async function getGenerationJob(
  userId: string,
  siteId: string,
  jobId: string
): Promise<GenerationJob | null> {
  const snap = await jobsCol(userId, siteId).doc(jobId).get();
  return snap.exists ? (snap.data() as GenerationJob) : null;
}

/**
 * Delete a job. Queued jobs are also removed from the queue (cancelled).
 * Running jobs cannot be deleted.
 */
export async function deleteGenerationJob(
  userId: string,
  siteId: string,
  jobId: string
): Promise<"deleted" | "running" | "not-found"> {
  const jobRef = jobsCol(userId, siteId).doc(jobId);
  const snap = await jobRef.get();
  if (!snap.exists) return "not-found";
  const job = snap.data() as GenerationJob;
  if (job.status === "running") return "running";

  // For queued jobs, remove the queue entry atomically first so the worker
  // can't claim it mid-delete.
  if (job.status === "queued") {
    await queueCol.doc(queueDocId(userId, siteId, jobId)).delete();
  }
  await jobRef.delete();
  return "deleted";
}

/** Delete all completed/failed jobs of a site. Returns how many were removed. */
export async function clearFinishedJobs(
  userId: string,
  siteId: string
): Promise<number> {
  const snap = await jobsCol(userId, siteId)
    .where("status", "in", ["completed", "failed"])
    .get();
  if (snap.empty) return 0;
  const batch = adminDb.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

// ============================================================
// Worker
// ============================================================

// A job whose claim is older than this AND whose job doc hasn't been updated
// recently is considered dead (server restarted mid-generation) → re-queued.
const STALE_CLAIM_MS = 30 * 60 * 1000;
const STALE_HEARTBEAT_MS = 10 * 60 * 1000;
// Pause between two generations (rate-limit safety, mirrors the old client).
const DELAY_BETWEEN_JOBS_MS = 2000;

// Per-process guard: only one worker loop per server instance. Cross-instance
// safety comes from the atomic claim transaction.
let workerRunning = false;

/**
 * Re-queue jobs whose worker died (claim held for a long time with no
 * heartbeat on the job doc). Returns the number of re-queued jobs.
 */
export async function requeueStaleJobs(): Promise<number> {
  const snap = await queueCol.orderBy("createdAt", "asc").limit(100).get();
  const now = Date.now();
  let requeued = 0;

  for (const doc of snap.docs) {
    const entry = doc.data() as any;
    if (!entry.claimedAt) continue;
    if (now - Date.parse(entry.claimedAt) < STALE_CLAIM_MS) continue;

    const jobRef = jobsCol(entry.userId, entry.siteId).doc(entry.jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) {
      await doc.ref.delete();
      continue;
    }
    const job = jobSnap.data() as GenerationJob;
    // Recent heartbeat → genuinely long-running job, leave it alone.
    if (
      job.updatedAt &&
      now - Date.parse(job.updatedAt) < STALE_HEARTBEAT_MS
    ) {
      continue;
    }

    await adminDb.runTransaction(async (tx) => {
      const fresh = await tx.get(doc.ref);
      if (!fresh.exists || !(fresh.data() as any).claimedAt) return;
      tx.update(doc.ref, { claimedAt: null });
      tx.update(jobRef, {
        status: "queued",
        progress: 0,
        message: "Re-queued after interruption",
        updatedAt: new Date().toISOString(),
      });
    });
    requeued++;
  }

  return requeued;
}

/** Atomically claim the oldest unclaimed queue entry. */
async function claimNextEntry(): Promise<{
  userId: string;
  siteId: string;
  jobId: string;
  ref: FirebaseFirestore.DocumentReference;
} | null> {
  const snap = await queueCol.orderBy("createdAt", "asc").limit(25).get();
  const candidates = snap.docs.filter((d) => !(d.data() as any).claimedAt);

  for (const doc of candidates) {
    try {
      const claimed = await adminDb.runTransaction(async (tx) => {
        const fresh = await tx.get(doc.ref);
        if (!fresh.exists) return false;
        if ((fresh.data() as any).claimedAt) return false;
        tx.update(doc.ref, { claimedAt: new Date().toISOString() });
        return true;
      });
      if (claimed) {
        const data = doc.data() as any;
        return {
          userId: data.userId,
          siteId: data.siteId,
          jobId: data.jobId,
          ref: doc.ref,
        };
      }
    } catch (err) {
      console.error("claimNextEntry transaction failed:", err);
    }
  }
  return null;
}

async function processClaimedEntry(entry: {
  userId: string;
  siteId: string;
  jobId: string;
  ref: FirebaseFirestore.DocumentReference;
}): Promise<void> {
  const { userId, siteId, jobId } = entry;
  const jobRef = jobsCol(userId, siteId).doc(jobId);
  const jobSnap = await jobRef.get();

  if (!jobSnap.exists) {
    await entry.ref.delete();
    return;
  }
  const job = jobSnap.data() as GenerationJob;
  if (job.status === "completed" || job.status === "failed") {
    await entry.ref.delete();
    return;
  }

  const nowIso = () => new Date().toISOString();
  await jobRef.update({
    status: "running",
    progress: 0,
    message: "Starting generation...",
    startedAt: nowIso(),
    updatedAt: nowIso(),
  });

  // Throttled progress writes (max ~1 write/1.5s, always on step change).
  let lastWrite = 0;
  let lastStep = "";
  const onProgress = (p: GenerationProgress) => {
    const now = Date.now();
    if (p.step === lastStep && now - lastWrite < 1500) return;
    lastStep = p.step;
    lastWrite = now;
    jobRef
      .update(
        stripUndefined({
          step: p.step,
          progress: p.progress,
          message: p.message,
          currentSection: p.currentSection || null,
          updatedAt: nowIso(),
        })
      )
      .catch(() => {});
  };

  const options: GenerationOptions = { ...job.options, topic: job.topic };

  try {
    const result = await runGenerationPipeline(
      userId,
      siteId,
      options,
      onProgress
    );

    // Save the article (same shape as POST /api/articles).
    const article = await saveArticle(
      userId,
      siteId,
      stripUndefined({
        title: result.seoMetadata?.metaTitle || job.topic,
        topic: job.topic,
        content: result.articleContent,
        seoMetadata: result.seoMetadata || {
          metaTitle: job.topic,
          metaDescription: "",
          slug: "",
          keywords: [],
        },
        ...(result.outline ? { outline: result.outline } : {}),
        images: result.images || [],
        ...(result.coverImageUrl ? { coverImageUrl: result.coverImageUrl } : {}),
        wordCount: result.wordCount || 0,
        status: "draft" as const,
      })
    );

    if (result.target) {
      // Published during generation — reflect it on the article.
      await markArticlePublished(userId, siteId, article.id, {
        wordpressPostId: result.postId,
        wordpressEditUrl: result.editUrl,
        blogApiSlug: result.slug,
        blogApiUrl: result.url,
      });
    } else if (job.scheduledAt) {
      await scheduleArticle(userId, siteId, article.id, job.scheduledAt);
    }

    await jobRef.update(
      stripUndefined({
        status: "completed",
        step: "completed",
        progress: 100,
        message: "Completed!",
        articleId: article.id,
        result: {
          articleTitle: article.title,
          seoScore: result.seoScore,
          wordCount: result.wordCount,
          target: result.target,
          postId: result.postId,
          editUrl: result.editUrl,
          slug: result.slug,
          url: result.url,
          recommendations: result.recommendations,
          tokenUsage: result.tokenUsage,
          totalTokens: result.totalTokens,
          research: result.research,
        },
        finishedAt: nowIso(),
        updatedAt: nowIso(),
      })
    );
  } catch (error: any) {
    console.error(`Generation job ${jobId} failed:`, error);
    const parsed = parseErrorMessage(error, options.aiProvider);
    await jobRef
      .update(
        stripUndefined({
          status: "failed",
          error: parsed.message,
          errorHint: parsed.hint || null,
          message: parsed.message,
          finishedAt: nowIso(),
          updatedAt: nowIso(),
        })
      )
      .catch(() => {});
  } finally {
    await entry.ref.delete().catch(() => {});
  }
}

/**
 * Start the worker loop for this process (no-op if already running).
 * Fire-and-forget: never await this from a request handler on a
 * long-running server; the cron backstop covers serverless deployments.
 */
export function kickGenerationWorker(): void {
  if (workerRunning) return;
  workerRunning = true;

  (async () => {
    try {
      while (true) {
        const entry = await claimNextEntry();
        if (!entry) break;
        await processClaimedEntry(entry);
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_JOBS_MS));
      }
    } catch (err) {
      console.error("Generation worker loop crashed:", err);
    } finally {
      workerRunning = false;
    }
  })();
}

/** Run the worker to completion (used by the cron backstop). */
export async function drainGenerationQueue(): Promise<void> {
  if (workerRunning) return;
  workerRunning = true;
  try {
    while (true) {
      const entry = await claimNextEntry();
      if (!entry) break;
      await processClaimedEntry(entry);
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_JOBS_MS));
    }
  } finally {
    workerRunning = false;
  }
}
