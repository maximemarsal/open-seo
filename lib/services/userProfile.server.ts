import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { UserProfile, dedupeTitles } from "./userProfile";

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

const profileRef = (userId: string, siteId: string) =>
  adminDb
    .collection("users")
    .doc(userId)
    .collection("sites")
    .doc(siteId)
    .collection("private")
    .doc("profile");

export async function getUserProfileServer(
  userId: string,
  siteId: string
): Promise<UserProfile | null> {
  const snap = await profileRef(userId, siteId).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  const { updatedAt, ...rest } = data;
  return rest as UserProfile;
}

export async function saveUserProfileServer(
  userId: string,
  siteId: string,
  partial: Partial<UserProfile>
): Promise<void> {
  await profileRef(userId, siteId).set(
    { ...partial, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

export async function setKnownTitles(
  userId: string,
  siteId: string,
  titles: string[]
): Promise<{ count: number; lastWpSyncAt: string }> {
  const deduped = dedupeTitles(titles);
  const lastWpSyncAt = new Date().toISOString();
  await profileRef(userId, siteId).set(
    {
      knownArticleTitles: deduped,
      lastWpSyncAt,
      updatedAt: lastWpSyncAt,
    },
    { merge: true }
  );
  return { count: deduped.length, lastWpSyncAt };
}

export { dedupeTitles };
