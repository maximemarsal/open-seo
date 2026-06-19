import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { BlogApiCredentials } from "./blogApiCredentials";

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

const blogRef = (userId: string, siteId: string) =>
  adminDb
    .collection("users")
    .doc(userId)
    .collection("sites")
    .doc(siteId)
    .collection("private")
    .doc("blogApiCredentials");

export async function getBlogApiCredentialsServer(
  userId: string,
  siteId: string
): Promise<BlogApiCredentials | null> {
  const snap = await blogRef(userId, siteId).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  const { updatedAt, ...rest } = data;
  return rest as BlogApiCredentials;
}

export async function saveBlogApiCredentialsServer(
  userId: string,
  siteId: string,
  creds: BlogApiCredentials
): Promise<void> {
  await blogRef(userId, siteId).set(
    {
      ...creds,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
