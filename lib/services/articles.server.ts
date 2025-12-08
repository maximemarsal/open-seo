// Server-side service for managing articles in Firestore
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { SavedArticle } from "../../types/blog";

// Initialize Firebase Admin (server-side)
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

/**
 * Save a new article to Firestore
 */
export async function saveArticle(
  userId: string,
  article: Omit<SavedArticle, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<SavedArticle> {
  const now = new Date().toISOString();
  const docRef = adminDb
    .collection("users")
    .doc(userId)
    .collection("articles")
    .doc();

  const savedArticle: SavedArticle = {
    ...article,
    id: docRef.id,
    userId,
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(savedArticle);
  return savedArticle;
}

/**
 * Get all articles for a user
 */
export async function getUserArticles(userId: string): Promise<SavedArticle[]> {
  const snapshot = await adminDb
    .collection("users")
    .doc(userId)
    .collection("articles")
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => doc.data() as SavedArticle);
}

/**
 * Get a single article by ID
 */
export async function getArticleById(
  userId: string,
  articleId: string
): Promise<SavedArticle | null> {
  const docRef = adminDb
    .collection("users")
    .doc(userId)
    .collection("articles")
    .doc(articleId);

  const docSnap = await docRef.get();
  if (!docSnap.exists) return null;

  return docSnap.data() as SavedArticle;
}

/**
 * Update an article
 */
export async function updateArticle(
  userId: string,
  articleId: string,
  updates: Partial<SavedArticle>
): Promise<SavedArticle | null> {
  const docRef = adminDb
    .collection("users")
    .doc(userId)
    .collection("articles")
    .doc(articleId);

  const docSnap = await docRef.get();
  if (!docSnap.exists) return null;

  const updatedData = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await docRef.update(updatedData);

  const updatedDoc = await docRef.get();
  return updatedDoc.data() as SavedArticle;
}

/**
 * Delete an article
 */
export async function deleteArticle(
  userId: string,
  articleId: string
): Promise<boolean> {
  const docRef = adminDb
    .collection("users")
    .doc(userId)
    .collection("articles")
    .doc(articleId);

  const docSnap = await docRef.get();
  if (!docSnap.exists) return false;

  await docRef.delete();
  return true;
}

/**
 * Get scheduled articles (for cron job)
 */
export async function getScheduledArticlesDue(): Promise<SavedArticle[]> {
  const now = new Date().toISOString();
  
  // Query all users' articles that are scheduled and due
  const usersSnapshot = await adminDb.collection("users").get();
  const dueArticles: SavedArticle[] = [];

  for (const userDoc of usersSnapshot.docs) {
    const articlesSnapshot = await userDoc.ref
      .collection("articles")
      .where("status", "==", "scheduled")
      .where("scheduledAt", "<=", now)
      .get();

    for (const articleDoc of articlesSnapshot.docs) {
      dueArticles.push(articleDoc.data() as SavedArticle);
    }
  }

  return dueArticles;
}

/**
 * Schedule an article for publication
 */
export async function scheduleArticle(
  userId: string,
  articleId: string,
  scheduledAt: string
): Promise<SavedArticle | null> {
  return updateArticle(userId, articleId, {
    status: "scheduled",
    scheduledAt,
  });
}

/**
 * Unschedule an article (back to draft)
 */
export async function unscheduleArticle(
  userId: string,
  articleId: string
): Promise<SavedArticle | null> {
  return updateArticle(userId, articleId, {
    status: "draft",
    scheduledAt: undefined,
  });
}

/**
 * Mark article as published
 */
export async function markArticlePublished(
  userId: string,
  articleId: string,
  wordpressPostId: number,
  wordpressEditUrl: string
): Promise<SavedArticle | null> {
  return updateArticle(userId, articleId, {
    status: "published",
    publishedAt: new Date().toISOString(),
    wordpressPostId,
    wordpressEditUrl,
  });
}

