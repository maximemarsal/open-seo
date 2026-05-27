import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getTokenFromHeader } from "@/lib/auth-server";
import { ensureUserMigrated } from "@/lib/services/migration.server";
import {
  listSitesServer,
  createSiteServer,
  setActiveSiteIdServer,
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

export async function GET(request: NextRequest) {
  const r = await authUser(request);
  if (r instanceof NextResponse) return r;
  const sites = await listSitesServer(r);
  return NextResponse.json({ sites });
}

export async function POST(request: NextRequest) {
  const r = await authUser(request);
  if (r instanceof NextResponse) return r;
  const userId = r;
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const color = typeof body.color === "string" ? body.color : undefined;
  const site = await createSiteServer(userId, name, { color });
  // If this is the user's only/first explicit creation, optionally activate it.
  if (body.activate) {
    await setActiveSiteIdServer(userId, site.id);
  }
  return NextResponse.json({ site });
}
