// Server-side service to access user API keys from Firestore
// This runs on the server with admin privileges

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin (server-side)
if (getApps().length === 0) {
  // In production, use service account credentials
  // For now, we'll use the default credentials from environment
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const adminDb = getFirestore();

export interface UserApiKeys {
  openaiKey?: string;
  perplexityKey?: string;
  anthropicKey?: string;
  geminiKey?: string;
  deepseekKey?: string;
  qwenKey?: string;
  grokKey?: string;
  unsplashKey?: string;
  wordpressUrl?: string;
  wordpressUsername?: string;
  wordpressPassword?: string;
}

/**
 * Get user API keys from Firestore (server-side only)
 * This function should ONLY be called from API routes
 */
export async function getUserApiKeysServer(
  userId: string
): Promise<UserApiKeys | null> {
  try {
    const docRef = adminDb
      .collection("users")
      .doc(userId)
      .collection("private")
      .doc("apiKeys");

    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();
      if (!data) return null;

      // Remove metadata fields
      const { updatedAt, ...keys } = data;
      return keys as UserApiKeys;
    }

    return null;
  } catch (error) {
    console.error("Error fetching user API keys:", error);
    return null;
  }
}
