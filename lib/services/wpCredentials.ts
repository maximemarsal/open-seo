import { db } from "../firebase";
import { doc, getDoc, setDoc, deleteField } from "firebase/firestore";

export interface WpCredentials {
  wordpressUrl?: string;
  wordpressUsername?: string;
  wordpressPassword?: string;
}

const wpDoc = (userId: string, siteId: string) =>
  doc(db, "users", userId, "sites", siteId, "private", "wpCredentials");

export async function getWpCredentials(
  userId: string,
  siteId: string
): Promise<WpCredentials | null> {
  const snap = await getDoc(wpDoc(userId, siteId));
  if (!snap.exists()) return null;
  const data = snap.data();
  const { updatedAt, ...rest } = data;
  return rest as WpCredentials;
}

export async function saveWpCredentials(
  userId: string,
  siteId: string,
  creds: WpCredentials
): Promise<void> {
  const toUpdate: Record<string, any> = {};
  const toDelete: Record<string, any> = {};
  for (const [key, value] of Object.entries(creds)) {
    if (value && String(value).trim() !== "") {
      toUpdate[key] = String(value).trim();
    } else {
      toDelete[key] = deleteField();
    }
  }
  await setDoc(
    wpDoc(userId, siteId),
    {
      ...toUpdate,
      ...toDelete,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
