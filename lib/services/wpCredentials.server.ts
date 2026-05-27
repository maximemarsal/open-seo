import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { WpCredentials } from "./wpCredentials";

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

const wpRef = (userId: string, siteId: string) =>
  adminDb
    .collection("users")
    .doc(userId)
    .collection("sites")
    .doc(siteId)
    .collection("private")
    .doc("wpCredentials");

export async function getWpCredentialsServer(
  userId: string,
  siteId: string
): Promise<WpCredentials | null> {
  const snap = await wpRef(userId, siteId).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  const { updatedAt, ...rest } = data;
  return rest as WpCredentials;
}

export async function saveWpCredentialsServer(
  userId: string,
  siteId: string,
  creds: WpCredentials
): Promise<void> {
  await wpRef(userId, siteId).set(
    {
      ...creds,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
