// Cron backstop for background generation jobs.
//
// On the long-running server (Railway), jobs are normally processed by the
// in-process worker kicked right after enqueueing — this cron only recovers
// work lost to a restart. On serverless deployments it is the main driver.
import { NextRequest, NextResponse } from "next/server";
import {
  drainGenerationQueue,
  requeueStaleJobs,
} from "../../../../lib/services/generationJobs.server";

export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;

function verifyAuth(request: NextRequest): boolean {
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  if (vercelCronHeader) {
    return true;
  }
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (CRON_SECRET && token === CRON_SECRET) {
    return true;
  }
  return false;
}

async function executeCronJob() {
  const requeued = await requeueStaleJobs();
  await drainGenerationQueue();
  return { requeued, drained: true };
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const result = await executeCronJob();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Cron process-generation-jobs error:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const result = await executeCronJob();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Cron process-generation-jobs error:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
