/**
 * One-off recovery script for CTA templates "lost" during the multi-site rollout.
 *
 * Context: the multi-site migration (lib/services/migration.server.ts) only copies
 * the old account-level CTA templates
 *     /users/{uid}/private/ctaTemplates
 * into the Default site when the user has NO site yet. If a site already existed
 * when the migration ran, the fast-path short-circuited and the old CTAs were never
 * copied — they still live at the old path but are invisible to the new per-site UI.
 *
 * This script copies the old CTA templates into the user's ACTIVE site doc
 *     /users/{uid}/sites/{activeSiteId}/private/ctaTemplates
 * merging by template id (existing site templates are kept, missing old ones added).
 * The old doc is left untouched.
 *
 * Usage:
 *   node scripts/recover-ctas.js                 # dry-run, all users
 *   node scripts/recover-ctas.js --user=UID      # dry-run, single user
 *   node scripts/recover-ctas.js --apply         # write changes, all users
 *   node scripts/recover-ctas.js --apply --user=UID
 */

const fs = require("fs");
const path = require("path");
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// --- Minimal .env.local loader (handles leading whitespace + quotes) ---
function loadEnv(file) {
  const full = path.resolve(__dirname, "..", file);
  if (!fs.existsSync(full)) return;
  const lines = fs.readFileSync(full, "utf8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnv(".env.local");
loadEnv(".env");

// --- CLI args ---
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const userArg = args.find((a) => a.startsWith("--user="));
const ONLY_USER = userArg ? userArg.split("=")[1] : null;

// --- Firebase admin init ---
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}
const db = getFirestore();

async function resolveActiveSiteId(userRef) {
  const activeSnap = await userRef.collection("settings").doc("active").get();
  const active = activeSnap.exists
    ? (activeSnap.data() || {}).activeSiteId
    : null;
  if (active) return active;
  // Fallback: first site
  const sitesSnap = await userRef.collection("sites").limit(1).get();
  if (!sitesSnap.empty) return sitesSnap.docs[0].id;
  return null;
}

async function processUser(userId) {
  const userRef = db.collection("users").doc(userId);

  // 1. Old account-level CTA doc
  const oldRef = userRef.collection("private").doc("ctaTemplates");
  const oldSnap = await oldRef.get();
  if (!oldSnap.exists) return { userId, status: "no-old-doc" };

  const oldTemplates = (oldSnap.data() || {}).templates || [];
  if (!Array.isArray(oldTemplates) || oldTemplates.length === 0) {
    return { userId, status: "old-doc-empty" };
  }

  // 2. Active site
  const siteId = await resolveActiveSiteId(userRef);
  if (!siteId) return { userId, status: "no-site", oldCount: oldTemplates.length };

  // 3. Existing per-site CTA doc
  const newRef = userRef
    .collection("sites")
    .doc(siteId)
    .collection("private")
    .doc("ctaTemplates");
  const newSnap = await newRef.get();
  const existing = newSnap.exists
    ? (newSnap.data() || {}).templates || []
    : [];

  // 4. Merge by id — keep existing, add missing old ones
  const existingIds = new Set(existing.map((t) => t && t.id));
  const toAdd = oldTemplates.filter((t) => t && t.id && !existingIds.has(t.id));

  if (toAdd.length === 0) {
    return {
      userId,
      siteId,
      status: "already-present",
      oldCount: oldTemplates.length,
      existingCount: existing.length,
    };
  }

  const merged = [...existing, ...toAdd];

  if (APPLY) {
    await newRef.set(
      { templates: merged, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  }

  return {
    userId,
    siteId,
    status: APPLY ? "recovered" : "would-recover",
    added: toAdd.length,
    addedNames: toAdd.map((t) => t.name || t.id),
    existingCount: existing.length,
    totalAfter: merged.length,
  };
}

async function main() {
  console.log(
    `\n=== CTA recovery — ${APPLY ? "APPLY (writing)" : "DRY-RUN (no writes)"} ===\n`
  );

  let userIds;
  if (ONLY_USER) {
    userIds = [ONLY_USER];
  } else {
    // Use listDocuments() — user docs often hold only subcollections and no
    // top-level fields, so they are "phantom" docs that a .get() query skips.
    const userRefs = await db.collection("users").listDocuments();
    userIds = userRefs.map((r) => r.id);
  }

  const summary = {};
  for (const uid of userIds) {
    try {
      const res = await processUser(uid);
      summary[res.status] = (summary[res.status] || 0) + 1;
      if (
        res.status === "recovered" ||
        res.status === "would-recover" ||
        res.status === "no-site"
      ) {
        console.log(JSON.stringify(res));
      }
    } catch (err) {
      summary["error"] = (summary["error"] || 0) + 1;
      console.error(`user ${uid} failed:`, err.message);
    }
  }

  console.log(`\n--- Summary (${userIds.length} users) ---`);
  console.log(JSON.stringify(summary, null, 2));
  if (!APPLY) {
    console.log(
      "\nDry-run only. Re-run with --apply to write the recovered CTAs.\n"
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
