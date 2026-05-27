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
import {
  Site,
  createSite,
  getActiveSiteId,
  listSites,
  setActiveSiteId,
  renameSite,
  deleteSite as deleteSiteService,
} from "../lib/services/sites";

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

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [activeSiteId, setActiveSiteIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const userId = user?.uid;

  const load = useCallback(async () => {
    if (!userId) {
      setSites([]);
      setActiveSiteIdState(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // Ping the API once to trigger ensureUserMigrated server-side. We
      // don't need the response — only the side effect that creates a
      // Default site for legacy users.
      try {
        const idToken = await user!.getIdToken();
        await fetch("/api/sites", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
      } catch {
        // If migration ping fails, we still try to read client-side; the
        // user just won't see the migrated data until the next refresh.
      }

      const [list, active] = await Promise.all([
        listSites(userId),
        getActiveSiteId(userId),
      ]);
      setSites(list);
      if (active && list.find((s) => s.id === active)) {
        setActiveSiteIdState(active);
      } else if (list.length > 0) {
        setActiveSiteIdState(list[0].id);
      } else {
        setActiveSiteIdState(null);
      }
    } catch (err) {
      console.error("SiteContext load failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, user]);

  useEffect(() => {
    load();
  }, [load]);

  const switchSite = useCallback(
    async (siteId: string) => {
      if (!userId) return;
      setActiveSiteIdState(siteId);
      try {
        await setActiveSiteId(userId, siteId);
      } catch (err) {
        console.warn("Failed to persist active site:", err);
      }
    },
    [userId]
  );

  const createNewSite = useCallback(
    async (name: string) => {
      if (!userId) throw new Error("Not authenticated");
      const site = await createSite(userId, name);
      setSites((prev) => [...prev, site]);
      return site;
    },
    [userId]
  );

  const renameSiteById = useCallback(
    async (siteId: string, name: string) => {
      if (!userId) throw new Error("Not authenticated");
      await renameSite(userId, siteId, name);
      setSites((prev) =>
        prev.map((s) => (s.id === siteId ? { ...s, name } : s))
      );
    },
    [userId]
  );

  const deleteSiteById = useCallback(
    async (siteId: string) => {
      if (!userId) throw new Error("Not authenticated");
      if (sites.length <= 1) {
        throw new Error("You cannot delete your last site.");
      }
      await deleteSiteService(userId, siteId);
      const remaining = sites.filter((s) => s.id !== siteId);
      setSites(remaining);
      if (activeSiteId === siteId && remaining.length > 0) {
        await switchSite(remaining[0].id);
      }
    },
    [userId, sites, activeSiteId, switchSite]
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
