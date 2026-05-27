import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getTokenFromHeader } from "@/lib/auth-server";
import { ensureUserMigrated } from "@/lib/services/migration.server";
import {
  userOwnsSite,
  setActiveSiteIdServer,
} from "@/lib/services/sites.server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const siteId = params.id;
  if (!(await userOwnsSite(userId, siteId))) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }
  await setActiveSiteIdServer(userId, siteId);
  return NextResponse.json({ success: true, activeSiteId: siteId });
}
