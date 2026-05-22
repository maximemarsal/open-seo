import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface UserProfile {
  businessContext?: string;
  knownArticleTitles?: string[];
  lastWpSyncAt?: string;
}

const PROFILE_PATH = (userId: string) =>
  doc(db, "users", userId, "private", "profile");

export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  const docSnap = await getDoc(PROFILE_PATH(userId));
  if (!docSnap.exists()) return null;
  const { updatedAt, ...rest } = docSnap.data();
  return rest as UserProfile;
}

export async function saveUserProfile(
  userId: string,
  partial: Partial<UserProfile>
): Promise<void> {
  await setDoc(
    PROFILE_PATH(userId),
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
