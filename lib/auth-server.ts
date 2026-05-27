// Server-side authentication helpers
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin (server-side) if not already initialized
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const adminAuth = getAuth();

/**
 * Verify Firebase ID token and return user ID
 * @param idToken - Firebase ID token from the client
 * @returns User ID or null if invalid
 */
export async function verifyIdToken(idToken: string): Promise<string | null> {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

/**
 * Get ID token from Authorization header
 * @param authHeader - Authorization header value
 * @returns ID token or null
 */
export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Resolve the active site for the request.
 *
 * Lookup order:
 *   1. `x-site-id` header (if present and owned by this user)
 *   2. The activeSiteId stored at users/{userId}/settings/active
 *   3. Throws an Error if no site can be resolved (route should 400)
 *
 * Callers MUST have called `ensureUserMigrated(userId)` first, so an account
 * with legacy data will always have at least one site by the time this runs.
 */
export async function resolveSiteId(
  request: Request,
  userId: string
): Promise<string> {
  // Local imports to avoid pulling firebase-admin into client bundles.
  const [{ getSiteServer, getActiveSiteIdServer, listSitesServer }] =
    await Promise.all([import("./services/sites.server")]);

  const headerSite = request.headers.get("x-site-id")?.trim();
  if (headerSite) {
    const owned = await getSiteServer(userId, headerSite);
    if (owned) return headerSite;
    // Header was supplied but doesn't belong to this user — silently fall
    // back to active site rather than leaking ownership info.
  }

  const activeSiteId = await getActiveSiteIdServer(userId);
  if (activeSiteId) {
    const owned = await getSiteServer(userId, activeSiteId);
    if (owned) return activeSiteId;
  }

  // Absolute fallback: pick the user's first site if any exists.
  const sites = await listSitesServer(userId);
  if (sites.length > 0) return sites[0].id;

  throw new Error("No site available for this user");
}
