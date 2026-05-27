import { db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  orderBy,
  query,
} from "firebase/firestore";

export interface Site {
  id: string;
  name: string;
  isDefault?: boolean;
  createdAt: string;
  color?: string;
}

const sitesCol = (userId: string) => collection(db, "users", userId, "sites");
const siteDoc = (userId: string, siteId: string) =>
  doc(db, "users", userId, "sites", siteId);
const activeDoc = (userId: string) =>
  doc(db, "users", userId, "settings", "active");

export async function listSites(userId: string): Promise<Site[]> {
  const snap = await getDocs(query(sitesCol(userId), orderBy("createdAt", "asc")));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || "Untitled",
      isDefault: !!data.isDefault,
      createdAt: data.createdAt || new Date().toISOString(),
      color: data.color,
    } as Site;
  });
}

export async function createSite(
  userId: string,
  name: string,
  opts?: { color?: string; isDefault?: boolean }
): Promise<Site> {
  const ref = doc(sitesCol(userId));
  const site: Site = {
    id: ref.id,
    name: name.trim() || "Untitled",
    createdAt: new Date().toISOString(),
    isDefault: !!opts?.isDefault,
    color: opts?.color,
  };
  await setDoc(ref, site);
  return site;
}

export async function renameSite(
  userId: string,
  siteId: string,
  name: string
): Promise<void> {
  await setDoc(siteDoc(userId, siteId), { name: name.trim() }, { merge: true });
}

export async function deleteSite(
  userId: string,
  siteId: string
): Promise<void> {
  await deleteDoc(siteDoc(userId, siteId));
}

export async function getActiveSiteId(
  userId: string
): Promise<string | null> {
  const snap = await getDoc(activeDoc(userId));
  if (!snap.exists()) return null;
  return (snap.data().activeSiteId as string) || null;
}

export async function setActiveSiteId(
  userId: string,
  siteId: string
): Promise<void> {
  await setDoc(
    activeDoc(userId),
    {
      activeSiteId: siteId,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
