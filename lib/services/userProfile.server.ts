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

const profileRef = (userId: string) =>
  adminDb.collection("users").doc(userId).collection("private").doc("profile");

export async function getUserProfileServer(
  userId: string
): Promise<UserProfile | null> {
  const snap = await profileRef(userId).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  const { updatedAt, ...rest } = data;
  return rest as UserProfile;
}

export async function saveUserProfileServer(
  userId: string,
  partial: Partial<UserProfile>
): Promise<void> {
  await profileRef(userId).set(
    { ...partial, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

export async function setKnownTitles(
  userId: string,
  titles: string[]
): Promise<{ count: number; lastWpSyncAt: string }> {
  const deduped = dedupeTitles(titles);
  const lastWpSyncAt = new Date().toISOString();
  await profileRef(userId).set(
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
