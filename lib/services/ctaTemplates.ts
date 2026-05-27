import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { CTA } from "../../types/blog";

export interface CTATemplate {
  id: string;
  name: string; // User-defined name for the template
  cta: Omit<CTA, "id">; // CTA data without the id (will be generated when used)
  createdAt: string;
  updatedAt: string;
}

/**
 * Remove all undefined values from an object recursively.
 * Firestore does not accept undefined values.
 */
function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefined);

  const cleaned: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = removeUndefined(obj[key]);
    }
  }
  return cleaned;
}

const ctaDocRef = (userId: string, siteId: string) =>
  doc(db, "users", userId, "sites", siteId, "private", "ctaTemplates");

/**
 * Save a CTA template to Firestore (per site).
 * Templates are stored in a single doc:
 * /users/{userId}/sites/{siteId}/private/ctaTemplates
 */
export async function saveCTATemplate(
  userId: string,
  siteId: string,
  template: Omit<CTATemplate, "createdAt" | "updatedAt">
): Promise<void> {
  const docRef = ctaDocRef(userId, siteId);

  const snap = await getDoc(docRef);
  const existing = snap.exists()
    ? (snap.data().templates as CTATemplate[] | undefined) || []
    : [];

  // Create the new template
  const newTemplate: CTATemplate = {
    ...template,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Remove all undefined values before saving to Firestore
  const cleanedTemplate = removeUndefined(newTemplate);

  await setDoc(docRef, {
    templates: [...existing, cleanedTemplate],
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Get all CTA templates for a user/site
 */
export async function getCTATemplates(
  userId: string,
  siteId: string
): Promise<CTATemplate[]> {
  const docRef = ctaDocRef(userId, siteId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return [];
  const data = snap.data();
  return (data.templates as CTATemplate[]) || [];
}

/**
 * Delete a CTA template
 */
export async function deleteCTATemplate(
  userId: string,
  siteId: string,
  templateId: string
): Promise<void> {
  const docRef = ctaDocRef(userId, siteId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;

  const existing = (snap.data().templates as CTATemplate[] | undefined) || [];
  const updated = existing.filter((t) => t.id !== templateId);

  await setDoc(docRef, {
    templates: updated,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Update a CTA template
 */
export async function updateCTATemplate(
  userId: string,
  siteId: string,
  templateId: string,
  template: Omit<CTATemplate, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  const docRef = ctaDocRef(userId, siteId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error("Template not found");
  }

  const data = docSnap.data();
  const existing = (data.templates as CTATemplate[] | undefined) || [];

  const updatedTemplates = existing.map((t) =>
    t.id === templateId
      ? removeUndefined({
          ...t,
          ...template,
          id: templateId,
          updatedAt: new Date().toISOString(),
        })
      : t
  );

  await setDoc(docRef, {
    templates: updatedTemplates,
    updatedAt: new Date().toISOString(),
  });
}
