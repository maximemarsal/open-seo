"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { Site } from "../lib/services/sites";

interface SiteContextValue {
  sites: Site[];
  activeSite: Site | null;
  activeSiteId: string | null;
  isLoading: boolean;
  switchSite: (siteId: string) => Promise<void>;
  createNewSite: (name: string) => Promise<Site>;
  renameSiteById: (siteId: string, name: string) => Promise<void>;
  deleteSiteById: (siteId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const SiteContext = createContext<SiteContextValue>({
  sites: [],
  activeSite: null,
  activeSiteId: null,
  isLoading: true,
  switchSite: async () => {},
  createNewSite: async () => ({
    id: "",
    name: "",
    createdAt: new Date().toISOString(),
  }),
  renameSiteById: async () => {},
  deleteSiteById: async () => {},
  refresh: async () => {},
});

async function authedFetch(
  user: { getIdToken: () => Promise<string> },
  url: string,
  init?: RequestInit
): Promise<Response> {
  const idToken = await user.getIdToken();
  const headers = new Headers(init?.headers || {});
  headers.set("Authorization", `Bearer ${idToken}`);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers });
}

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [activeSiteId, setActiveSiteIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setSites([]);
      setActiveSiteIdState(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // /api/sites runs ensureUserMigrated server-side, so on first call it
      // creates the Default site from any legacy data. It then returns the
      // list of sites + the activeSiteId. Going through the API means we
      // bypass any client-side Firestore rules issues.
      const resp = await authedFetch(user, "/api/sites");
      if (!resp.ok) throw new Error(`GET /api/sites returned ${resp.status}`);
      const data = (await resp.json()) as {
        sites: Site[];
        activeSiteId: string | null;
      };
      setSites(data.sites || []);
      setActiveSiteIdState(data.activeSiteId || null);
    } catch (err) {
      console.error("SiteContext load failed:", err);
      setSites([]);
      setActiveSiteIdState(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Wait until firebase auth is done resolving before we try to load.
    if (authLoading) return;
    load();
  }, [load, authLoading]);

  const switchSite = useCallback(
    async (siteId: string) => {
      if (!user) return;
      setActiveSiteIdState(siteId);
      try {
        await authedFetch(user, `/api/sites/${siteId}/activate`, {
          method: "POST",
        });
      } catch (err) {
        console.warn("Failed to persist active site:", err);
      }
    },
    [user]
  );

  const createNewSite = useCallback(
    async (name: string) => {
      if (!user) throw new Error("Not authenticated");
      const resp = await authedFetch(user, "/api/sites", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to create site");
      }
      const data = (await resp.json()) as { site: Site };
      setSites((prev) => [...prev, data.site]);
      return data.site;
    },
    [user]
  );

  const renameSiteById = useCallback(
    async (siteId: string, name: string) => {
      if (!user) throw new Error("Not authenticated");
      const resp = await authedFetch(user, `/api/sites/${siteId}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to rename site");
      }
      setSites((prev) =>
        prev.map((s) => (s.id === siteId ? { ...s, name } : s))
      );
    },
    [user]
  );

  const deleteSiteById = useCallback(
    async (siteId: string) => {
      if (!user) throw new Error("Not authenticated");
      if (sites.length <= 1) {
        throw new Error("You cannot delete your last site.");
      }
      const resp = await authedFetch(user, `/api/sites/${siteId}`, {
        method: "DELETE",
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to delete site");
      }
      const remaining = sites.filter((s) => s.id !== siteId);
      setSites(remaining);
      if (activeSiteId === siteId && remaining.length > 0) {
        await switchSite(remaining[0].id);
      }
    },
    [user, sites, activeSiteId, switchSite]
  );

  const activeSite = useMemo(
    () => sites.find((s) => s.id === activeSiteId) || null,
    [sites, activeSiteId]
  );

  const value: SiteContextValue = {
    sites,
    activeSite,
    activeSiteId,
    isLoading,
    switchSite,
    createNewSite,
    renameSiteById,
    deleteSiteById,
    refresh: load,
  };

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  return useContext(SiteContext);
}

/**
 * Convenience wrapper around fetch that injects the active siteId header.
 * Use this anywhere you call a server route that depends on the site scope.
 */
export function useFetchWithSite() {
  const { activeSiteId } = useSite();
  const { user } = useAuth();

  return useCallback(
    async (url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers || {});
      if (user) {
        const idToken = await user.getIdToken();
        headers.set("Authorization", `Bearer ${idToken}`);
      }
      if (activeSiteId) {
        headers.set("x-site-id", activeSiteId);
      }
      return fetch(url, { ...init, headers });
    },
    [user, activeSiteId]
  );
}
