"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  FolderOpen,
  Calendar,
  Layers,
  Globe,
  Plus,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useSidebar } from "../contexts/SidebarContext";
import { useSite } from "../contexts/SiteContext";
import { toast } from "react-hot-toast";

export default function Sidebar() {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const {
    sites,
    activeSite,
    activeSiteId,
    switchSite,
    createNewSite,
    isLoading: isSitesLoading,
  } = useSite();
  const [siteMenuOpen, setSiteMenuOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [showNewSiteInput, setShowNewSiteInput] = useState(false);
  const [creatingSite, setCreatingSite] = useState(false);
  const siteMenuRef = useRef<HTMLDivElement>(null);

  // Click outside closes the menu
  useEffect(() => {
    if (!siteMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        siteMenuRef.current &&
        !siteMenuRef.current.contains(e.target as Node)
      ) {
        setSiteMenuOpen(false);
        setShowNewSiteInput(false);
        setNewSiteName("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [siteMenuOpen]);

  const handleCreateSite = async () => {
    const name = newSiteName.trim();
    if (!name) {
      toast.error("Donne un nom au site");
      return;
    }
    try {
      setCreatingSite(true);
      const site = await createNewSite(name);
      await switchSite(site.id);
      toast.success(`Site "${site.name}" créé et activé`);
      setNewSiteName("");
      setShowNewSiteInput(false);
      setSiteMenuOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Erreur création site");
    } finally {
      setCreatingSite(false);
    }
  };

  const handleSwitchSite = async (siteId: string) => {
    if (siteId === activeSiteId) {
      setSiteMenuOpen(false);
      return;
    }
    try {
      await switchSite(siteId);
      setSiteMenuOpen(false);
      toast.success("Site changé");
      // Force a soft refresh of pages that load per-site data
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Erreur changement site");
    }
  };

  const menuItems = [
    {
      id: "generate",
      label: "Post Creation",
      icon: FileText,
      path: "/generate",
    },
    {
      id: "bulk",
      label: "Bulk Generation",
      icon: Layers,
      path: "/generate/bulk",
    },
    {
      id: "articles",
      label: "My Articles",
      icon: FolderOpen,
      path: "/generate/articles",
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: Calendar,
      path: "/generate/calendar",
    },
    {
      id: "sites",
      label: "Sites",
      icon: Globe,
      path: "/generate/sites",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      path: "/generate/settings",
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Déconnexion réussie");
      router.push("/");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      className="h-screen bg-white/80 backdrop-blur-xl border-r border-gray-200 text-gray-900 flex flex-col fixed left-0 top-0 z-40 shadow-xl"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <AnimatePresence mode="wait">
            {!isCollapsed ? (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-2"
              >
                <img 
                  src="/images/Logo vert Open-SEO.png" 
                  alt="Open SEO" 
                  className="h-8 w-auto"
                />
                <span className="text-xl font-bold text-gray-900">
                  Open SEO
                </span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <img 
                  src="/images/Logo vert Open-SEO.png" 
                  alt="Open SEO" 
                  className="h-8 w-auto"
                />
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-700" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            )}
          </button>
        </div>
      </div>

      {/* Site Switcher */}
      <div className="px-4 pt-4 pb-2 relative" ref={siteMenuRef}>
        <button
          onClick={() => setSiteMenuOpen((o) => !o)}
          className={`w-full flex items-center ${
            isCollapsed ? "justify-center" : "justify-between gap-2"
          } px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200`}
          title={activeSite?.name || "No site"}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm font-medium text-gray-800 truncate"
                >
                  {isSitesLoading
                    ? "Chargement..."
                    : activeSite?.name || "Aucun site"}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          {!isCollapsed && (
            <ChevronsUpDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
        </button>

        <AnimatePresence>
          {siteMenuOpen && !isCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute z-50 mt-2 left-4 right-4 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
            >
              <div className="max-h-64 overflow-y-auto">
                {sites.map((site) => (
                  <button
                    key={site.id}
                    onClick={() => handleSwitchSite(site.id)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors text-sm"
                  >
                    <span className="text-gray-800 truncate text-left flex-1">
                      {site.name}
                      {site.isDefault && (
                        <span className="ml-2 text-xs text-gray-400">
                          (default)
                        </span>
                      )}
                    </span>
                    {site.id === activeSiteId && (
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-100 p-2">
                {showNewSiteInput ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={newSiteName}
                      onChange={(e) => setNewSiteName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateSite();
                        if (e.key === "Escape") {
                          setShowNewSiteInput(false);
                          setNewSiteName("");
                        }
                      }}
                      placeholder="Nom du site"
                      disabled={creatingSite}
                      className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400/50"
                    />
                    <button
                      onClick={handleCreateSite}
                      disabled={creatingSite || !newSiteName.trim()}
                      className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium disabled:bg-gray-300"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewSiteInput(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-sm text-gray-700"
                  >
                    <Plus className="w-4 h-4" />
                    Nouveau site
                  </button>
                )}
                <button
                  onClick={() => {
                    setSiteMenuOpen(false);
                    router.push("/generate/sites");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-xs text-gray-500 mt-1"
                >
                  Gérer les sites →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;

          return (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center ${
                isCollapsed ? "justify-center" : "gap-3"
              } px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? "bg-gray-900 text-white font-semibold shadow-lg"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center ${
            isCollapsed ? "justify-center" : "gap-3"
          } px-4 py-3 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all text-gray-700`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.div>
  );
}
