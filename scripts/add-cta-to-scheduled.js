/**
 * One-off script: inject a saved CTA template into already-generated articles.
 *
 * Use case: articles were bulk-generated and scheduled without CTAs. This
 * script injects N copies of a named CTA template (from the site's saved
 * templates) into the HTML content of every SCHEDULED article of a site,
 * using the same placement logic as the generation pipeline (random distinct
 * positions: after intro / after a section / end).
 *
 * Articles whose content already contains a `cta-block` are skipped.
 *
 * Usage:
 *   node scripts/add-cta-to-scheduled.js --email=user@x.com --site="plan de travail" --template="le bon cta" --count=2
 *   node scripts/add-cta-to-scheduled.js ... --apply        # write changes
 *   node scripts/add-cta-to-scheduled.js ... --status=all   # also patch drafts/published (default: scheduled)
 */

const fs = require("fs");
const path = require("path");
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

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
const getArg = (name, fallback) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=").slice(1).join("=") : fallback;
};
const EMAIL = getArg("email");
const SITE_NAME = (getArg("site") || "").toLowerCase();
const TEMPLATE_NAME = (getArg("template") || "").toLowerCase();
const COUNT = Math.min(Math.max(parseInt(getArg("count", "2"), 10) || 2, 1), 3);
const STATUS = getArg("status", "scheduled"); // "scheduled" | "all"

if (!EMAIL || !SITE_NAME || !TEMPLATE_NAME) {
  console.error(
    'Usage: node scripts/add-cta-to-scheduled.js --email=... --site="..." --template="..." [--count=2] [--apply]'
  );
  process.exit(1);
}

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

// ============================================================
// CTA HTML + injection — ported from app/api/generate/route.ts
// (generateCTAHtml + injectCTAsIntoArticle) so placement matches
// what the generation pipeline produces.
// ============================================================

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateCTAHtml(cta) {
  const { title, description, buttonText, buttonUrl, imageUrl, style, customColors } = cta;

  const getStyleClasses = () => {
    if (style === "custom" && customColors) {
      return {
        container: `background: ${customColors.background || "#f0f0f0"};`,
        title: `color: ${customColors.titleColor || "#111"};`,
        description: `color: ${customColors.descriptionColor || "#555"};`,
        button: `background: ${customColors.buttonBackground || "#111"}; color: ${customColors.buttonTextColor || "#fff"}; text-decoration: none;`,
      };
    }
    switch (style) {
      case "bordered":
        return {
          container: "border: 2px solid #111; background: #fff;",
          title: "color: #111;",
          description: "color: #555;",
          button: "background: #111; color: #fff; text-decoration: none;",
        };
      case "gradient":
        return {
          container: "background: linear-gradient(135deg, #111 0%, #333 50%, #555 100%);",
          title: "color: #fff;",
          description: "color: #e5e5e5;",
          button: "background: #fff; color: #111; text-decoration: none;",
        };
      case "minimal":
        return {
          container: "background: #f5f5f5;",
          title: "color: #111;",
          description: "color: #555;",
          button: "color: #111; text-decoration: underline;",
        };
      default:
        return {
          container: "background: #f0f0f0; border: 1px solid #ddd;",
          title: "color: #111;",
          description: "color: #555;",
          button: "background: #111; color: #fff; text-decoration: none;",
        };
    }
  };

  const styles = getStyleClasses();

  const imageHtml = imageUrl
    ? `<div style="flex-shrink: 0;"><img src="${imageUrl}" alt="${escapeHtml(title || "CTA")}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 0.75rem;" /></div>`
    : "";

  const buttonHtml = buttonUrl
    ? `<a href="${escapeHtml(buttonUrl)}" target="_blank" rel="noopener noreferrer" style="${styles.button} display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 600; transition: all 0.2s;">${escapeHtml(buttonText || "Learn More")} <span style="font-size: 1rem;">→</span></a>`
    : "";

  return `<div class="cta-block" style="${styles.container} padding: 2rem; border-radius: 1rem; margin: 2rem 0; ${imageUrl ? "display: flex; gap: 1.5rem; align-items: center;" : ""}">${imageHtml}<div style="flex: 1;"><h3 style="${styles.title} font-size: 1.5rem; font-weight: bold; margin: 0 0 0.75rem 0;">${escapeHtml(title || "")}</h3><p style="${styles.description} margin: 0 0 1.5rem 0; line-height: 1.6;">${escapeHtml(description || "")}</p>${buttonHtml}</div></div>`;
}

function injectCTAsIntoArticle(html, ctas) {
  if (!ctas || ctas.length === 0) return html;

  const parts = html.split(/(<h[12][^>]*>.*?<\/h[12]>)/i);
  const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
  const middleSection = Math.floor(h2Count / 2);
  const beforeConclusionSection = Math.max(0, h2Count - 1);

  const expandedCtas = [];
  const usedPositions = new Set();

  const allPositionSlots = [
    { type: "after-intro", key: "after-intro" },
    ...Array.from({ length: h2Count }, (_, i) => ({
      type: "after-section",
      section: i + 1,
      key: `section-${i + 1}`,
    })),
    { type: "end", key: "end" },
  ];

  for (const cta of ctas) {
    if (cta.positionType === "random") {
      const count = Math.min(Math.max(cta.randomCount || 1, 1), 3);
      const availableSlots = allPositionSlots.filter(
        (slot) => !usedPositions.has(slot.key)
      );
      const shuffled = [...availableSlots].sort(() => Math.random() - 0.5);
      const selectedSlots = shuffled.slice(0, Math.min(count, availableSlots.length));
      for (const slot of selectedSlots) {
        usedPositions.add(slot.key);
        if (slot.type === "after-intro") {
          expandedCtas.push({ ...cta, positionType: "after-intro" });
        } else if (slot.type === "after-section") {
          expandedCtas.push({
            ...cta,
            positionType: "after-section",
            sectionNumber: slot.section,
          });
        } else if (slot.type === "end") {
          expandedCtas.push({ ...cta, positionType: "end" });
        }
      }
    } else {
      if (cta.positionType === "after-section") {
        usedPositions.add(`section-${cta.sectionNumber || 1}`);
      } else {
        usedPositions.add(cta.positionType);
      }
      expandedCtas.push(cta);
    }
  }

  let result = "";
  let currentSection = 0;
  let totalH2Found = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    result += part;

    const isH2 = /<h2[^>]*>/i.test(part);
    if (isH2) {
      totalH2Found++;
      currentSection = totalH2Found;
    }

    const isAfterContent = i > 0 && i % 2 === 0;
    if (isAfterContent) {
      const ctasToInject = [];
      for (const cta of expandedCtas) {
        let shouldInject = false;
        switch (cta.positionType) {
          case "after-intro":
            shouldInject = totalH2Found === 0 && i === 2;
            break;
          case "after-section": {
            const targetSection = cta.sectionNumber || 1;
            const effectiveSection = Math.min(targetSection, h2Count);
            shouldInject = currentSection === effectiveSection;
            break;
          }
          case "middle":
            shouldInject = currentSection === middleSection;
            break;
          case "before-conclusion":
            shouldInject = currentSection === beforeConclusionSection;
            break;
          case "end":
            shouldInject = i === parts.length - 1;
            break;
        }
        if (shouldInject) ctasToInject.push(cta);
      }
      for (const cta of ctasToInject) {
        result += generateCTAHtml(cta);
      }
    }
  }

  return result;
}

// ============================================================

async function main() {
  console.log(
    `\n=== CTA injection — ${APPLY ? "APPLY (writing)" : "DRY-RUN (no writes)"} ===`
  );

  // 1. Resolve user by email
  const userRecord = await getAuth().getUserByEmail(EMAIL);
  const userId = userRecord.uid;
  console.log(`User: ${EMAIL} → ${userId}`);

  // 2. Find the site by (partial, case-insensitive) name
  const sitesSnap = await db
    .collection("users")
    .doc(userId)
    .collection("sites")
    .get();
  const sites = sitesSnap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
  console.log(
    `Sites: ${sites.map((s) => `"${s.name || s.id}"`).join(", ") || "(none)"}`
  );
  const site = sites.find((s) =>
    String(s.name || "").toLowerCase().includes(SITE_NAME)
  );
  if (!site) {
    console.error(`No site matching "${SITE_NAME}" found.`);
    process.exit(1);
  }
  console.log(`Site: "${site.name}" (${site.id})`);

  // 3. Load the CTA template by (partial, case-insensitive) name
  const ctaSnap = await db
    .collection("users")
    .doc(userId)
    .collection("sites")
    .doc(site.id)
    .collection("private")
    .doc("ctaTemplates")
    .get();
  const templates = ctaSnap.exists ? (ctaSnap.data() || {}).templates || [] : [];
  console.log(
    `CTA templates: ${templates.map((t) => `"${t.name}"`).join(", ") || "(none)"}`
  );
  const template = templates.find((t) =>
    String(t.name || "").toLowerCase().includes(TEMPLATE_NAME)
  );
  if (!template) {
    console.error(`No CTA template matching "${TEMPLATE_NAME}" found.`);
    process.exit(1);
  }
  console.log(`Template: "${template.name}" (${template.id})`);

  // Force N random distinct placements regardless of the template's own position.
  const ctaToInject = {
    ...template.cta,
    id: template.id,
    positionType: "random",
    randomCount: COUNT,
  };

  // 4. Walk the site's articles
  const articlesSnap = await db
    .collection("users")
    .doc(userId)
    .collection("sites")
    .doc(site.id)
    .collection("articles")
    .get();

  let patched = 0;
  let skippedStatus = 0;
  let skippedHasCta = 0;

  for (const docSnap of articlesSnap.docs) {
    const article = docSnap.data() || {};
    if (STATUS !== "all" && article.status !== STATUS) {
      skippedStatus++;
      continue;
    }
    const content = article.content || "";
    if (content.includes('class="cta-block"')) {
      skippedHasCta++;
      console.log(`  ~ already has CTA: [${article.status}] ${article.title}`);
      continue;
    }

    // The placement logic depends on the HTML shape and some random slots can
    // miss (e.g. "end" when the HTML doesn't finish on a content chunk). Retry
    // with fresh random slots until the exact count lands, then fall back to
    // appending at the end of the article.
    let updated = injectCTAsIntoArticle(content, [ctaToInject]);
    let injectedCount = (updated.match(/class="cta-block"/g) || []).length;
    for (let attempt = 0; attempt < 15 && injectedCount !== COUNT; attempt++) {
      const candidate = injectCTAsIntoArticle(content, [ctaToInject]);
      const candidateCount = (candidate.match(/class="cta-block"/g) || []).length;
      if (candidateCount > injectedCount && candidateCount <= COUNT) {
        updated = candidate;
        injectedCount = candidateCount;
      }
    }
    while (injectedCount < COUNT) {
      updated += generateCTAHtml(ctaToInject);
      injectedCount++;
    }

    console.log(
      `  + inject ${injectedCount} CTA(s): [${article.status}] ${article.title} (${docSnap.id})`
    );
    if (APPLY) {
      await docSnap.ref.update({
        content: updated,
        updatedAt: new Date().toISOString(),
      });
    }
    patched++;
  }

  console.log(`\n--- Summary ---`);
  console.log(`Articles total:        ${articlesSnap.size}`);
  console.log(`Patched:               ${patched}${APPLY ? "" : " (dry-run)"}`);
  console.log(`Skipped (status):      ${skippedStatus}`);
  console.log(`Skipped (already CTA): ${skippedHasCta}`);
  if (!APPLY) {
    console.log(`\nDry-run only. Re-run with --apply to write the changes.\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
