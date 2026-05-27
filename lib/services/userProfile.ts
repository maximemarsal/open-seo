import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface UserProfile {
  businessContext?: string;
  knownArticleTitles?: string[];
  lastWpSyncAt?: string;
}

const profileDoc = (userId: string, siteId: string) =>
  doc(db, "users", userId, "sites", siteId, "private", "profile");

export async function getUserProfile(
  userId: string,
  siteId: string
): Promise<UserProfile | null> {
  const docSnap = await getDoc(profileDoc(userId, siteId));
  if (!docSnap.exists()) return null;
  const { updatedAt, ...rest } = docSnap.data();
  return rest as UserProfile;
}

export async function saveUserProfile(
  userId: string,
  siteId: string,
  partial: Partial<UserProfile>
): Promise<void> {
  await setDoc(
    profileDoc(userId, siteId),
    { ...partial, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

export function dedupeTitles(titles: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of titles) {
    const t = (raw || "").trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}
