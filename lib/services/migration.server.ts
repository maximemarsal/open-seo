/**
 * One-time migration from "single site per user" to "N sites per user".
 *
 * Idempotent: if the user already has at least one site, this is a no-op.
 * Otherwise, creates a "Default" site and moves all per-site data into it:
 *   - WordPress credentials (from apiKeys.wordpress*)
 *   - Business context + known titles (from private/profile)
 *   - CTA templates (from private/ctaTemplates)
 *   - Articles (from articles collection)
 *   - Scheduled-articles index entries (rewritten with new docId)
 *
 * Called from API routes right after verifyIdToken to make sure existing
 * accounts continue to work seamlessly.
 */
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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
 * Ensure the given user has been migrated to the multi-site model.
 * Returns the activeSiteId after migration (or existing one if already migrated).
 */
export async function ensureUserMigrated(userId: string): Promise<string> {
  const userRef = adminDb.collection("users").doc(userId);
  const sitesCol = userRef.collection("sites");
  const activeRef = userRef.collection("settings").doc("active");

  // Fast path: if at least one site exists, we're already migrated.
  const sitesSnap = await sitesCol.limit(1).get();
  if (!sitesSnap.empty) {
    // Make sure activeSiteId is set; if not, use the first site.
    const activeSnap = await activeRef.get();
    const currentActive = activeSnap.exists
      ? (activeSnap.data() || {}).activeSiteId
      : null;
    if (currentActive) return currentActive as string;

    const fallback = sitesSnap.docs[0].id;
    await activeRef.set(
      { activeSiteId: fallback, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return fallback;
  }

  // Otherwise migrate.
  const newSiteRef = sitesCol.doc();
  const newSiteId = newSiteRef.id;
  const now = new Date().toISOString();

  await newSiteRef.set({
    id: newSiteId,
    name: "Default",
    isDefault: true,
    createdAt: now,
  });

  // 1. Move WordPress credentials out of apiKeys
  try {
    const apiKeysRef = userRef.collection("private").doc("apiKeys");
    const apiKeysSnap = await apiKeysRef.get();
    if (apiKeysSnap.exists) {
      const data = apiKeysSnap.data() || {};
      const wp = {
        wordpressUrl: data.wordpressUrl || "",
        wordpressUsername: data.wordpressUsername || "",
        wordpressPassword: data.wordpressPassword || "",
      };
      if (wp.wordpressUrl || wp.wordpressUsername || wp.wordpressPassword) {
        await newSiteRef
          .collection("private")
          .doc("wpCredentials")
          .set({ ...wp, updatedAt: now }, { merge: true });
      }
    }
  } catch (err) {
    console.warn("migration: failed to move WP credentials:", err);
  }

  // 2. Copy profile (businessContext, knownArticleTitles, lastWpSyncAt)
  try {
    const oldProfileRef = userRef.collection("private").doc("profile");
    const profileSnap = await oldProfileRef.get();
    if (profileSnap.exists) {
      const data = profileSnap.data() || {};
      await newSiteRef
        .collection("private")
        .doc("profile")
        .set({ ...data, updatedAt: now }, { merge: true });
    }
  } catch (err) {
    console.warn("migration: failed to copy profile:", err);
  }

  // 3. Copy CTA templates
  try {
    const oldCtaRef = userRef.collection("private").doc("ctaTemplates");
    const ctaSnap = await oldCtaRef.get();
    if (ctaSnap.exists) {
      const data = ctaSnap.data() || {};
      await newSiteRef
        .collection("private")
        .doc("ctaTemplates")
        .set({ ...data, updatedAt: now }, { merge: true });
    }
  } catch (err) {
    console.warn("migration: failed to copy CTA templates:", err);
  }

  // 4. Move articles (copy then delete originals) — in chunks to handle volume
  try {
    const oldArticlesCol = userRef.collection("articles");
    const articlesSnap = await oldArticlesCol.get();
    if (!articlesSnap.empty) {
      // Firestore allows up to 500 ops per batch
      const docs = articlesSnap.docs;
      for (let i = 0; i < docs.length; i += 200) {
        const slice = docs.slice(i, i + 200);
        const batch = adminDb.batch();
        for (const docSnap of slice) {
          const data = docSnap.data();
          const newRef = newSiteRef.collection("articles").doc(docSnap.id);
          batch.set(newRef, data);
          batch.delete(docSnap.ref);
        }
        await batch.commit();
      }
    }
  } catch (err) {
    console.warn("migration: failed to move articles:", err);
  }

  // 5. Rewrite scheduledArticles index entries to include siteId
  try {
    const scheduledSnap = await adminDb
      .collection("scheduledArticles")
      .where("userId", "==", userId)
      .get();
    if (!scheduledSnap.empty) {
      const batch = adminDb.batch();
      for (const docSnap of scheduledSnap.docs) {
        const data = docSnap.data();
        // Skip if already migrated (has siteId)
        if (data.siteId) continue;
        const articleId = data.articleId as string;
        const scheduledAt = data.scheduledAt as string;
        if (!articleId || !scheduledAt) continue;
        const newDocId = `${userId}__${newSiteId}__${articleId}`;
        batch.set(adminDb.collection("scheduledArticles").doc(newDocId), {
          userId,
          siteId: newSiteId,
          articleId,
          scheduledAt,
        });
        batch.delete(docSnap.ref);
      }
      await batch.commit();
    }
  } catch (err) {
    console.warn("migration: failed to rewrite scheduledArticles index:", err);
  }

  // 6. Mark active site
  await activeRef.set(
    {
      activeSiteId: newSiteId,
      migratedAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  return newSiteId;
}
