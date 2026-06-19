import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { Site } from "./sites";

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

const sitesCol = (userId: string) =>
  adminDb.collection("users").doc(userId).collection("sites");
const siteDoc = (userId: string, siteId: string) =>
  sitesCol(userId).doc(siteId);
const activeDoc = (userId: string) =>
  adminDb.collection("users").doc(userId).collection("settings").doc("active");

export async function listSitesServer(userId: string): Promise<Site[]> {
  const snap = await sitesCol(userId).orderBy("createdAt", "asc").get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || "Untitled",
      isDefault: !!data.isDefault,
      createdAt: data.createdAt || new Date().toISOString(),
      color: data.color,
      publishTarget: data.publishTarget || "wordpress",
    } as Site;
  });
}

export async function getSiteServer(
  userId: string,
  siteId: string
): Promise<Site | null> {
  const snap = await siteDoc(userId, siteId).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  return {
    id: snap.id,
    name: data.name || "Untitled",
    isDefault: !!data.isDefault,
    createdAt: data.createdAt || new Date().toISOString(),
    color: data.color,
    publishTarget: data.publishTarget || "wordpress",
  };
}

export async function createSiteServer(
  userId: string,
  name: string,
  opts?: { color?: string; isDefault?: boolean }
): Promise<Site> {
  const ref = sitesCol(userId).doc();
  const site: Site = {
    id: ref.id,
    name: (name || "").trim() || "Untitled",
    createdAt: new Date().toISOString(),
    isDefault: !!opts?.isDefault,
    color: opts?.color,
  };
  await ref.set(site);
  return site;
}

export async function renameSiteServer(
  userId: string,
  siteId: string,
  name: string
): Promise<void> {
  await siteDoc(userId, siteId).set({ name: name.trim() }, { merge: true });
}

export async function deleteSiteServer(
  userId: string,
  siteId: string
): Promise<void> {
  await siteDoc(userId, siteId).delete();
}

export async function getActiveSiteIdServer(
  userId: string
): Promise<string | null> {
  const snap = await activeDoc(userId).get();
  if (!snap.exists) return null;
  return ((snap.data() || {}).activeSiteId as string) || null;
}

export async function setActiveSiteIdServer(
  userId: string,
  siteId: string
): Promise<void> {
  await activeDoc(userId).set(
    {
      activeSiteId: siteId,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Verify that a site belongs to a user. Returns true if siteId is owned.
 */
export async function userOwnsSite(
  userId: string,
  siteId: string
): Promise<boolean> {
  const snap = await siteDoc(userId, siteId).get();
  return snap.exists;
}

/**
 * Count of sites for a user — used to prevent deleting the last one.
 */
export async function countSitesServer(userId: string): Promise<number> {
  const snap = await sitesCol(userId).count().get();
  return snap.data().count;
}
