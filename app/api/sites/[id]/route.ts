import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getTokenFromHeader } from "@/lib/auth-server";
import { ensureUserMigrated } from "@/lib/services/migration.server";
import {
  userOwnsSite,
  renameSiteServer,
  deleteSiteServer,
  countSitesServer,
  getActiveSiteIdServer,
  setActiveSiteIdServer,
  listSitesServer,
} from "@/lib/services/sites.server";

async function authUser(request: NextRequest): Promise<string | NextResponse> {
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
  return userId;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const r = await authUser(request);
  if (r instanceof NextResponse) return r;
  const userId = r;
  const siteId = params.id;
  if (!(await userOwnsSite(userId, siteId))) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }
  const body = await request.json().catch(() => ({}));
  if (typeof body.name === "string") {
    const n = body.name.trim();
    if (!n) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      );
    }
    await renameSiteServer(userId, siteId, n);
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const r = await authUser(request);
  if (r instanceof NextResponse) return r;
  const userId = r;
  const siteId = params.id;
  if (!(await userOwnsSite(userId, siteId))) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }
  const count = await countSitesServer(userId);
  if (count <= 1) {
    return NextResponse.json(
      {
        error:
          "You cannot delete your last site. Create another one first, then delete this one.",
      },
      { status: 400 }
    );
  }
  await deleteSiteServer(userId, siteId);

  // If we deleted the active site, switch to another one.
  const currentActive = await getActiveSiteIdServer(userId);
  if (!currentActive || currentActive === siteId) {
    const remaining = await listSitesServer(userId);
    if (remaining.length > 0) {
      await setActiveSiteIdServer(userId, remaining[0].id);
    }
  }
  return NextResponse.json({ success: true });
}
