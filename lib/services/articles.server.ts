// Server-side service for managing articles in Firestore (per-site scoped)
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
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

const articlesCol = (userId: string, siteId: string) =>
  adminDb
    .collection("users")
    .doc(userId)
    .collection("sites")
    .doc(siteId)
    .collection("articles");

const articleDoc = (userId: string, siteId: string, articleId: string) =>
  articlesCol(userId, siteId).doc(articleId);

/**
 * Save a new article to Firestore (per site)
 */
export async function saveArticle(
  userId: string,
  siteId: string,
  article: Omit<SavedArticle, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<SavedArticle> {
  const now = new Date().toISOString();
  const docRef = articlesCol(userId, siteId).doc();

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
 * Get all articles for a user/site
 */
export async function getUserArticles(
  userId: string,
  siteId: string
): Promise<SavedArticle[]> {
  const snapshot = await articlesCol(userId, siteId)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => doc.data() as SavedArticle);
}

/**
 * Get a single article by ID
 */
export async function getArticleById(
  userId: string,
  siteId: string,
  articleId: string
): Promise<SavedArticle | null> {
  const docSnap = await articleDoc(userId, siteId, articleId).get();
  if (!docSnap.exists) return null;

  return docSnap.data() as SavedArticle;
}

/**
 * Update an article
 */
export async function updateArticle(
  userId: string,
  siteId: string,
  articleId: string,
  updates: Partial<SavedArticle>
): Promise<SavedArticle | null> {
  const docRef = articleDoc(userId, siteId, articleId);

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
  siteId: string,
  articleId: string
): Promise<boolean> {
  const docRef = articleDoc(userId, siteId, articleId);
  const docSnap = await docRef.get();
  if (!docSnap.exists) return false;
  await docRef.delete();
  return true;
}

/**
 * Schedule an article for publication
 */
export async function scheduleArticle(
  userId: string,
  siteId: string,
  articleId: string,
  scheduledAt: string
): Promise<SavedArticle | null> {
  const updated = await updateArticle(userId, siteId, articleId, {
    status: "scheduled",
    scheduledAt,
  });
  if (updated) {
    await upsertScheduledIndex({ userId, siteId, articleId, scheduledAt });
  }
  return updated;
}

/**
 * Unschedule an article (back to draft)
 */
export async function unscheduleArticle(
  userId: string,
  siteId: string,
  articleId: string
): Promise<SavedArticle | null> {
  const updated = await updateArticle(userId, siteId, articleId, {
    status: "draft",
    scheduledAt: null,
  });
  if (updated) {
    await removeScheduledIndex(userId, siteId, articleId);
  }
  return updated;
}

/**
 * Mark article as published
 */
export async function markArticlePublished(
  userId: string,
  siteId: string,
  articleId: string,
  // Target-specific references: WordPress (postId/editUrl) or Blog API (slug/url).
  refs: {
    wordpressPostId?: number;
    wordpressEditUrl?: string;
    blogApiSlug?: string;
    blogApiUrl?: string;
  }
): Promise<SavedArticle | null> {
  const patch: Partial<SavedArticle> = {
    status: "published",
    publishedAt: new Date().toISOString(),
  };
  if (refs.wordpressPostId !== undefined)
    patch.wordpressPostId = refs.wordpressPostId;
  if (refs.wordpressEditUrl !== undefined)
    patch.wordpressEditUrl = refs.wordpressEditUrl;
  if (refs.blogApiSlug !== undefined) patch.blogApiSlug = refs.blogApiSlug;
  if (refs.blogApiUrl !== undefined) patch.blogApiUrl = refs.blogApiUrl;

  const updated = await updateArticle(userId, siteId, articleId, patch);
  if (updated) {
    await removeScheduledIndex(userId, siteId, articleId);
  }
  return updated;
}

// Scheduled index helpers (global collection to avoid scanning all users/sites)
type ScheduledIndex = {
  userId: string;
  siteId: string;
  articleId: string;
  scheduledAt: string;
};

function scheduledDocId(userId: string, siteId: string, articleId: string) {
  return `${userId}__${siteId}__${articleId}`;
}

async function upsertScheduledIndex(entry: ScheduledIndex) {
  const docId = scheduledDocId(entry.userId, entry.siteId, entry.articleId);
  await adminDb.collection("scheduledArticles").doc(docId).set(entry);
}

async function removeScheduledIndex(
  userId: string,
  siteId: string,
  articleId: string
) {
  const docId = scheduledDocId(userId, siteId, articleId);
  await adminDb.collection("scheduledArticles").doc(docId).delete();
}

/**
 * Atomically claim a scheduled article for publishing.
 * Returns true only if THIS caller won the race.
 */
export async function tryClaimScheduledEntry(
  userId: string,
  siteId: string,
  articleId: string
): Promise<boolean> {
  const docId = scheduledDocId(userId, siteId, articleId);
  const ref = adminDb.collection("scheduledArticles").doc(docId);
  try {
    return await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return false;
      tx.delete(ref);
      return true;
    });
  } catch (err) {
    console.error("tryClaimScheduledEntry transaction failed:", err);
    return false;
  }
}

export async function getScheduledArticlesDueIndexed(): Promise<
  ScheduledIndex[]
> {
  const now = new Date().toISOString();
  const snap = await adminDb
    .collection("scheduledArticles")
    .where("scheduledAt", "<=", now)
    .get();
  return snap.docs.map((d) => {
    const data = d.data() as Partial<ScheduledIndex>;
    return {
      userId: data.userId || "",
      // Backwards-compat: legacy docs may not have siteId yet. Migration
      // will rewrite them. Fallback to empty string — the cron will skip
      // entries with no siteId to avoid publishing into the wrong site.
      siteId: (data as any).siteId || "",
      articleId: data.articleId || "",
      scheduledAt: data.scheduledAt || now,
    };
  });
}
