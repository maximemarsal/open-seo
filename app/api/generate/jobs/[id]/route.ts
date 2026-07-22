// Single generation job: poll status (GET) or cancel/remove (DELETE).
import { NextRequest, NextResponse } from "next/server";
import {
  verifyIdToken,
  getTokenFromHeader,
  resolveSiteId,
} from "../../../../../lib/auth-server";
import { ensureUserMigrated } from "../../../../../lib/services/migration.server";
import {
  getGenerationJob,
  deleteGenerationJob,
  kickGenerationWorker,
  requeueStaleJobs,
} from "../../../../../lib/services/generationJobs.server";

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

// GET - Fetch a single job's status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authAndSite(request);
    if (auth instanceof NextResponse) return auth;
    const { userId, siteId } = auth;

    const job = await getGenerationJob(userId, siteId, params.id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Self-heal: if the poller sees a job stuck queued/running, make sure a
    // worker is actually processing the queue (e.g. after a server restart).
    if (job.status === "queued" || job.status === "running") {
      requeueStaleJobs()
        .then(() => kickGenerationWorker())
        .catch(() => {});
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error("Error fetching generation job:", error);
    return NextResponse.json(
      { error: "Failed to fetch generation job" },
      { status: 500 }
    );
  }
}

// DELETE - Cancel a queued job or remove a finished one
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authAndSite(request);
    if (auth instanceof NextResponse) return auth;
    const { userId, siteId } = auth;

    const outcome = await deleteGenerationJob(userId, siteId, params.id);
    if (outcome === "not-found") {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (outcome === "running") {
      return NextResponse.json(
        { error: "Cannot delete a running job" },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting generation job:", error);
    return NextResponse.json(
      { error: "Failed to delete generation job" },
      { status: 500 }
    );
  }
}
