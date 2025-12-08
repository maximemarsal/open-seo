import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

// Ensure Firebase Admin is initialized (shared with other server utilities)
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

export type ArticleStatus = "draft" | "scheduled" | "published";

export interface StoredArticle {
  id: string;
  title: string;
  topic?: string;
  slug?: string;
  status: ArticleStatus;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  wordpressPostId?: number;
  wordpressEditUrl?: string;
  contentHtml?: string;
  wordCount?: number;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    slug?: string;
    keywords?: string[];
  };
}

export type CreateArticleInput = Omit<
  StoredArticle,
  "id" | "createdAt" | "updatedAt"
> & { id?: string };

const collectionForUser = (userId: string) =>
  adminDb.collection("users").doc(userId).collection("private").doc("articles").collection("items");

export async function createArticle(
  userId: string,
  data: CreateArticleInput
): Promise<StoredArticle> {
  const now = new Date().toISOString();
  const id = data.id || randomUUID();
  const record: StoredArticle = {
    id,
    title: data.title,
    topic: data.topic,
    slug: data.slug,
    status: data.status,
    scheduledAt: data.scheduledAt || null,
    publishedAt: data.publishedAt || null,
    wordpressPostId: data.wordpressPostId,
    wordpressEditUrl: data.wordpressEditUrl,
    contentHtml: data.contentHtml,
    wordCount: data.wordCount,
    seo: data.seo,
    createdAt: now,
    updatedAt: now,
  };

  const sanitized = removeUndefined(record);

  await collectionForUser(userId).doc(id).set(sanitized);
  return sanitized;
}

export async function updateArticle(
  userId: string,
  id: string,
  updates: Partial<StoredArticle>
): Promise<StoredArticle | null> {
  const ref = collectionForUser(userId).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const existing = snap.data() as StoredArticle;
  const merged: StoredArticle = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
    id,
  };
  const sanitized = removeUndefined(merged);
  await ref.set(sanitized);
  return sanitized;
}

export async function listArticles(userId: string): Promise<StoredArticle[]> {
  const snap = await collectionForUser(userId).orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => d.data() as StoredArticle);
}

export async function getArticle(
  userId: string,
  id: string
): Promise<StoredArticle | null> {
  const doc = await collectionForUser(userId).doc(id).get();
  if (!doc.exists) return null;
  return doc.data() as StoredArticle;
}

// Utility to strip undefined (Firestore rejects undefined)
function removeUndefined<T extends Record<string, any>>(obj: T): T {
  const copy: Record<string, any> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined) copy[k] = v;
  });
  return copy as T;
}

