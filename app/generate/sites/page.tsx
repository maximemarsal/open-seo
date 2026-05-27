"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../../contexts/AuthContext";
import { useSite } from "../../../contexts/SiteContext";
import { useRouter } from "next/navigation";

export default function SitesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const {
    sites,
    activeSiteId,
    isLoading,
    switchSite,
    createNewSite,
    renameSiteById,
    deleteSiteById,
  } = useSite();
  const [creatingName, setCreatingName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!authLoading && !user) {
    router.push("/");
    return null;
  }

  const handleCreate = async () => {
    const name = creatingName.trim();
    if (!name) {
      toast.error("Donne un nom au site");
      return;
    }
    try {
      setIsCreating(true);
      const site = await createNewSite(name);
      toast.success(`Site "${site.name}" créé`);
      setCreatingName("");
    } catch (err: any) {
      toast.error(err?.message || "Erreur création");
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const name = editingName.trim();
    if (!name) {
      toast.error("Le nom ne peut pas être vide");
      return;
    }
    try {
      await renameSiteById(editingId, name);
      toast.success("Site renommé");
      setEditingId(null);
      setEditingName("");
    } catch (err: any) {
      toast.error(err?.message || "Erreur renommage");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (sites.length <= 1) {
      toast.error("Tu ne peux pas supprimer ton dernier site");
      return;
    }
    const ok = window.confirm(
      `Supprimer le site "${name}" ?\n\nLes articles, business context, credentials WordPress et CTAs de ce site seront détachés (les documents Firestore restent mais ne seront plus accessibles depuis l'app).`
    );
    if (!ok) return;
    try {
      setDeletingId(id);
      await deleteSiteById(id);
      toast.success(`Site "${name}" supprimé`);
    } catch (err: any) {
      toast.error(err?.message || "Erreur suppression");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent flex items-center gap-3">
            <Globe className="w-8 h-8 text-blue-600" />
            Sites
          </h1>
          <p className="text-gray-500 mt-2">
            Gère plusieurs sites WordPress dans le même compte. Chaque site a
            son propre business context, ses propres credentials, ses propres
            articles et ses propres CTAs. Les clés API IA sont partagées.
          </p>
        </motion.div>

        {/* Create form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-200 shadow p-6 mb-6"
        >
          <h2 className="text-sm font-semibold text-gray-800 mb-3">
            Créer un nouveau site
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={creatingName}
              onChange={(e) => setCreatingName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Ex : Acme Running, Site client X..."
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
              disabled={isCreating}
            />
            <button
              onClick={handleCreate}
              disabled={isCreating || !creatingName.trim()}
              className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 disabled:bg-gray-300 transition flex items-center gap-2"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Créer
            </button>
          </div>
        </motion.div>

        {/* List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-200 shadow overflow-hidden"
        >
          {isLoading ? (
            <div className="p-10 text-center text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Chargement...
            </div>
          ) : sites.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              Aucun site pour l'instant.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              <AnimatePresence>
                {sites.map((site) => {
                  const isActive = site.id === activeSiteId;
                  const isEditing = editingId === site.id;
                  return (
                    <motion.div
                      key={site.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="p-4 flex items-center gap-4 hover:bg-gray-50 transition"
                    >
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            autoFocus
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit();
                              if (e.key === "Escape") {
                                setEditingId(null);
                                setEditingName("");
                              }
                            }}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 truncate">
                              {site.name}
                            </p>
                            {site.isDefault && (
                              <span className="text-xs text-gray-400">
                                (default)
                              </span>
                            )}
                            {isActive && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                                actif
                              </span>
                            )}
                          </div>
                        )}
                        {!isEditing && (
                          <p className="text-xs text-gray-400 mt-1">
                            Créé le {new Date(site.createdAt).toLocaleDateString("fr-FR")}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSaveEdit}
                              className="p-2 hover:bg-green-50 rounded-lg"
                              title="Save"
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditingName("");
                              }}
                              className="p-2 hover:bg-gray-100 rounded-lg"
                              title="Cancel"
                            >
                              <X className="w-4 h-4 text-gray-500" />
                            </button>
                          </>
                        ) : (
                          <>
                            {!isActive && (
                              <button
                                onClick={() => switchSite(site.id)}
                                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                              >
                                Activer
                              </button>
                            )}
                            <button
                              onClick={() => handleStartEdit(site.id, site.name)}
                              className="p-2 hover:bg-gray-100 rounded-lg"
                              title="Rename"
                            >
                              <Edit2 className="w-4 h-4 text-gray-500" />
                            </button>
                            <button
                              onClick={() => handleDelete(site.id, site.name)}
                              disabled={
                                sites.length <= 1 || deletingId === site.id
                              }
                              className="p-2 hover:bg-red-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                              title={
                                sites.length <= 1
                                  ? "Tu ne peux pas supprimer ton dernier site"
                                  : "Delete"
                              }
                            >
                              {deletingId === site.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-red-500" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
