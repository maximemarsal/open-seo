import { db } from "../firebase";
import { doc, getDoc, setDoc, deleteField } from "firebase/firestore";

export interface BlogApiCredentials {
  // Base URL of the ingestion API, e.g. https://jadoremaloc.com/api/blog
  blogApiUrl?: string;
  blogApiKey?: string;
  // Optional default author applied to every pushed article
  blogAuthorName?: string;
  blogAuthorAvatarUrl?: string;
  // Public image URL used to replace inline base64 (e.g. uploaded CTA images),
  // which the ingestion API can't host. Empty = base64 images are removed.
  blogFallbackImageUrl?: string;
}

const blogDoc = (userId: string, siteId: string) =>
  doc(db, "users", userId, "sites", siteId, "private", "blogApiCredentials");

export async function getBlogApiCredentials(
  userId: string,
  siteId: string
): Promise<BlogApiCredentials | null> {
  const snap = await getDoc(blogDoc(userId, siteId));
  if (!snap.exists()) return null;
  const data = snap.data();
  const { updatedAt, ...rest } = data;
  return rest as BlogApiCredentials;
}

export async function saveBlogApiCredentials(
  userId: string,
  siteId: string,
  creds: BlogApiCredentials
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
    blogDoc(userId, siteId),
    {
      ...toUpdate,
      ...toDelete,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
