"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key,
  Eye,
  EyeOff,
  Globe,
  Zap,
  Image,
  Save,
  Building2,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  saveUserApiKeys,
  getUserApiKeys,
} from "../../../lib/services/userKeys";
import {
  getUserProfile,
  saveUserProfile,
} from "../../../lib/services/userProfile";
import {
  getWpCredentials,
  saveWpCredentials,
} from "../../../lib/services/wpCredentials";
import {
  getBlogApiCredentials,
  saveBlogApiCredentials,
} from "../../../lib/services/blogApiCredentials";
import { setSitePublishTarget } from "../../../lib/services/sites";
import { PublishTarget } from "../../../types/blog";
import { useSite } from "../../../contexts/SiteContext";
import ApiKeyTooltip from "../../../components/ApiKeyTooltip";

interface ApiKeys {
  openaiKey: string;
  perplexityKey: string;
  anthropicKey: string;
  geminiKey: string;
  deepseekKey: string;
  qwenKey: string;
  grokKey: string;
  unsplashKey: string;
  wordpressUrl: string;
  wordpressUsername: string;
  wordpressPassword: string;
  blogApiUrl: string;
  blogApiKey: string;
  blogAuthorName: string;
  blogAuthorAvatarUrl: string;
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeSiteId, activeSite, refresh: refreshSites } = useSite();
  const router = useRouter();
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAiChanges, setHasAiChanges] = useState(false);
  const [hasOtherChanges, setHasOtherChanges] = useState(false);
  const [hasWordPressChanges, setHasWordPressChanges] = useState(false);
  const [hasBlogApiChanges, setHasBlogApiChanges] = useState(false);
  const [publishTarget, setPublishTarget] =
    useState<PublishTarget>("wordpress");
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    openaiKey: "",
    perplexityKey: "",
    anthropicKey: "",
    geminiKey: "",
    deepseekKey: "",
    qwenKey: "",
    grokKey: "",
    unsplashKey: "",
    wordpressUrl: "",
    wordpressUsername: "",
    wordpressPassword: "",
    blogApiUrl: "",
    blogApiKey: "",
    blogAuthorName: "",
    blogAuthorAvatarUrl: "",
  });
  const [originalKeys, setOriginalKeys] = useState<ApiKeys>({
    openaiKey: "",
    perplexityKey: "",
    anthropicKey: "",
    geminiKey: "",
    deepseekKey: "",
    qwenKey: "",
    grokKey: "",
    unsplashKey: "",
    wordpressUrl: "",
    wordpressUsername: "",
    wordpressPassword: "",
    blogApiUrl: "",
    blogApiKey: "",
    blogAuthorName: "",
    blogAuthorAvatarUrl: "",
  });

  // Business context + WordPress sync state
  const [businessContext, setBusinessContext] = useState("");
  const [originalBusinessContext, setOriginalBusinessContext] = useState("");
  const [hasBusinessContextChanges, setHasBusinessContextChanges] =
    useState(false);
  const [isSavingContext, setIsSavingContext] = useState(false);

  const [knownTitlesCount, setKnownTitlesCount] = useState(0);
  const [lastWpSyncAt, setLastWpSyncAt] = useState<string | null>(null);
  const [isSyncingTitles, setIsSyncingTitles] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Load from Firestore on mount
  useEffect(() => {
    const loadAll = async () => {
      if (!user || !activeSiteId) return;

      try {
        setIsLoading(true);
        const [keys, profile, wp, blog] = await Promise.all([
          getUserApiKeys(user.uid),
          getUserProfile(user.uid, activeSiteId),
          getWpCredentials(user.uid, activeSiteId),
          getBlogApiCredentials(user.uid, activeSiteId),
        ]);
        const loadedKeys = {
          openaiKey: keys?.openaiKey || "",
          perplexityKey: keys?.perplexityKey || "",
          anthropicKey: keys?.anthropicKey || "",
          geminiKey: keys?.geminiKey || "",
          deepseekKey: keys?.deepseekKey || "",
          qwenKey: keys?.qwenKey || "",
          grokKey: keys?.grokKey || "",
          unsplashKey: keys?.unsplashKey || "",
          // WP credentials are now per-site
          wordpressUrl: wp?.wordpressUrl || "",
          wordpressUsername: wp?.wordpressUsername || "",
          wordpressPassword: wp?.wordpressPassword || "",
          // Blog API credentials are per-site too
          blogApiUrl: blog?.blogApiUrl || "",
          blogApiKey: blog?.blogApiKey || "",
          blogAuthorName: blog?.blogAuthorName || "",
          blogAuthorAvatarUrl: blog?.blogAuthorAvatarUrl || "",
        };
        setApiKeys(loadedKeys);
        setOriginalKeys(loadedKeys);
        setPublishTarget(activeSite?.publishTarget || "wordpress");

        if (profile) {
          setBusinessContext(profile.businessContext || "");
          setOriginalBusinessContext(profile.businessContext || "");
          setKnownTitlesCount((profile.knownArticleTitles || []).length);
          setLastWpSyncAt(profile.lastWpSyncAt || null);
        } else {
          // Reset for new sites with no profile yet
          setBusinessContext("");
          setOriginalBusinessContext("");
          setKnownTitlesCount(0);
          setLastWpSyncAt(null);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        toast.error("Failed to load your settings");
      } finally {
        setIsLoading(false);
      }
    };

    loadAll();
  }, [user, activeSiteId]);

  useEffect(() => {
    if (isLoading) return;
    setHasBusinessContextChanges(businessContext !== originalBusinessContext);
  }, [businessContext, originalBusinessContext, isLoading]);

  // Detect changes in each section
  useEffect(() => {
    if (isLoading) return;

    // AI Services changes
    const aiChanged =
      apiKeys.openaiKey !== originalKeys.openaiKey ||
      apiKeys.perplexityKey !== originalKeys.perplexityKey ||
      apiKeys.anthropicKey !== originalKeys.anthropicKey ||
      apiKeys.geminiKey !== originalKeys.geminiKey ||
      apiKeys.deepseekKey !== originalKeys.deepseekKey ||
      apiKeys.qwenKey !== originalKeys.qwenKey ||
      apiKeys.grokKey !== originalKeys.grokKey;

    // Other Services changes
    const otherChanged = apiKeys.unsplashKey !== originalKeys.unsplashKey;

    // WordPress changes
    const wordpressChanged =
      apiKeys.wordpressUrl !== originalKeys.wordpressUrl ||
      apiKeys.wordpressUsername !== originalKeys.wordpressUsername ||
      apiKeys.wordpressPassword !== originalKeys.wordpressPassword;

    // Blog API changes
    const blogApiChanged =
      apiKeys.blogApiUrl !== originalKeys.blogApiUrl ||
      apiKeys.blogApiKey !== originalKeys.blogApiKey ||
      apiKeys.blogAuthorName !== originalKeys.blogAuthorName ||
      apiKeys.blogAuthorAvatarUrl !== originalKeys.blogAuthorAvatarUrl;

    setHasAiChanges(aiChanged);
    setHasOtherChanges(otherChanged);
    setHasWordPressChanges(wordpressChanged);
    setHasBlogApiChanges(blogApiChanged);
  }, [apiKeys, originalKeys, isLoading]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setIsSaving(true);

      // Test WordPress credentials if they have changed
      if (hasWordPressChanges && apiKeys.wordpressUrl && apiKeys.wordpressUsername && apiKeys.wordpressPassword) {
        const testResponse = await fetch("/api/wordpress/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wordpressUrl: apiKeys.wordpressUrl,
            wordpressUsername: apiKeys.wordpressUsername,
            wordpressPassword: apiKeys.wordpressPassword,
          }),
        });

        const testResult = await testResponse.json();

        if (!testResult.success) {
          toast.error(`WordPress Test Failed: ${testResult.message}`, {
            duration: 6000,
          });
          setIsSaving(false);
          return;
        } else {
          toast.success(`WordPress Connected: ${testResult.message}`, {
            duration: 4000,
          });
        }
      }

      // Persist non-WP, non-Blog-API keys (shared across sites)
      const {
        wordpressUrl,
        wordpressUsername,
        wordpressPassword,
        blogApiUrl,
        blogApiKey,
        blogAuthorName,
        blogAuthorAvatarUrl,
        ...aiAndOther
      } = apiKeys;
      await saveUserApiKeys(user.uid, aiAndOther);

      // Persist WP credentials per-site
      if (activeSiteId && hasWordPressChanges) {
        await saveWpCredentials(user.uid, activeSiteId, {
          wordpressUrl,
          wordpressUsername,
          wordpressPassword,
        });
      }
      setOriginalKeys(apiKeys);
      const wpWasChanged = hasWordPressChanges;
      setHasAiChanges(false);
      setHasOtherChanges(false);
      setHasWordPressChanges(false);
      toast.success(
        `Settings saved${
          activeSite?.name ? ` for site "${activeSite.name}"` : ""
        }!`
      );

      // Auto-sync titles on first WP credentials save (knownArticleTitles empty for this site)
      if (
        wpWasChanged &&
        apiKeys.wordpressUrl &&
        apiKeys.wordpressUsername &&
        apiKeys.wordpressPassword &&
        !lastWpSyncAt
      ) {
        await handleSyncTitles({ silent: true });
      }
    } catch (error) {
      console.error("Error saving API keys:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeTarget = async (target: PublishTarget) => {
    if (target === publishTarget) return;
    setPublishTarget(target); // optimistic
    if (!user || !activeSiteId) return;
    try {
      setIsSavingTarget(true);
      await setSitePublishTarget(user.uid, activeSiteId, target);
      await refreshSites();
      toast.success(
        target === "blog-api"
          ? "Destination set to Blog API for this site."
          : "Destination set to WordPress for this site."
      );
    } catch (error) {
      console.error("Error changing publish target:", error);
      toast.error("Failed to change publishing destination");
      setPublishTarget(activeSite?.publishTarget || "wordpress"); // revert
    } finally {
      setIsSavingTarget(false);
    }
  };

  const handleSaveBlogApi = async () => {
    if (!user || !activeSiteId) return;
    try {
      setIsSaving(true);

      // Test the Blog API credentials if URL + key are present
      if (apiKeys.blogApiUrl && apiKeys.blogApiKey) {
        const testResponse = await fetch("/api/blog-api/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blogApiUrl: apiKeys.blogApiUrl,
            blogApiKey: apiKeys.blogApiKey,
          }),
        });
        const testResult = await testResponse.json();
        if (!testResult.success) {
          toast.error(`Blog API Test Failed: ${testResult.message}`, {
            duration: 6000,
          });
          setIsSaving(false);
          return;
        }
        toast.success(`Blog API Connected: ${testResult.message}`, {
          duration: 4000,
        });
      }

      await saveBlogApiCredentials(user.uid, activeSiteId, {
        blogApiUrl: apiKeys.blogApiUrl,
        blogApiKey: apiKeys.blogApiKey,
        blogAuthorName: apiKeys.blogAuthorName,
        blogAuthorAvatarUrl: apiKeys.blogAuthorAvatarUrl,
      });

      setOriginalKeys(apiKeys);
      setHasBlogApiChanges(false);
      toast.success(
        `Blog API settings saved${
          activeSite?.name ? ` for site "${activeSite.name}"` : ""
        }!`
      );
    } catch (error) {
      console.error("Error saving Blog API settings:", error);
      toast.error("Failed to save Blog API settings");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleShowKey = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveContext = async () => {
    if (!user || !activeSiteId) return;
    try {
      setIsSavingContext(true);
      await saveUserProfile(user.uid, activeSiteId, { businessContext });
      setOriginalBusinessContext(businessContext);
      setHasBusinessContextChanges(false);
      toast.success(
        `Business context saved for site "${activeSite?.name || ""}"!`
      );
    } catch (error) {
      console.error("Error saving business context:", error);
      toast.error("Failed to save business context");
    } finally {
      setIsSavingContext(false);
    }
  };

  const handleSyncTitles = async (
    opts: { silent?: boolean } = {}
  ): Promise<void> => {
    if (!user) return;
    if (
      !apiKeys.wordpressUrl ||
      !apiKeys.wordpressUsername ||
      !apiKeys.wordpressPassword
    ) {
      toast.error("Configure your WordPress credentials first.");
      return;
    }
    try {
      setIsSyncingTitles(true);
      const idToken = await user.getIdToken();
      const resp = await fetch("/api/wordpress/sync-titles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          ...(activeSiteId ? { "x-site-id": activeSiteId } : {}),
        },
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || "Sync failed");
      }
      setKnownTitlesCount(data.count || 0);
      setLastWpSyncAt(data.lastWpSyncAt || new Date().toISOString());
      if (!opts.silent) {
        toast.success(
          `Synced ${data.count} article titles (${data.wpCount} from WP, ${data.localCount} local).`
        );
      } else {
        toast(`Auto-synced ${data.count} titles from WordPress.`, {
          icon: "🔄",
        });
      }
    } catch (error: any) {
      console.error("Sync titles error:", error);
      toast.error(error?.message || "Failed to sync titles");
    } finally {
      setIsSyncingTitles(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">
            Configure your API keys and integrations
          </p>
          {activeSite && (
            <p className="text-sm text-blue-700 mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Site actif :{" "}
              <span className="font-semibold">{activeSite.name}</span>
              <span className="text-gray-500">
                · WordPress + Business Context sont par-site, les clés IA sont
                partagées
              </span>
            </p>
          )}
        </motion.div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8"
        >
          <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
            <Key className="w-5 h-5" />
            🔒 Your keys are secure
          </h3>
          <p className="text-green-800 text-sm">
            All API keys are encrypted and stored securely. They're never
            exposed to the browser and are only accessed server-side for API
            calls. Only you can access your keys.
          </p>
        </motion.div>

        {/* Business Context Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl shadow-xl p-8 mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-600" />
            Business Context
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            Décrivez votre entreprise. Ce contexte est automatiquement injecté
            dans chaque génération d'article et chaque génération d'idées de
            titres.
          </p>

          <textarea
            value={businessContext}
            onChange={(e) => setBusinessContext(e.target.value)}
            placeholder="Ex : Nom : Acme Running. Secteur : équipement sportif. Audience : coureurs amateurs et marathoniens. Ton : enthousiaste, expert, accessible. USP : conseils basés sur la science et testés en conditions réelles..."
            rows={8}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 placeholder-gray-400 resize-y"
          />
          <p className="text-xs text-gray-500 mt-2">
            {businessContext.length} caractères
          </p>

          <AnimatePresence>
            {hasBusinessContextChanges && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 flex justify-end"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveContext}
                  disabled={isSavingContext}
                  className={`px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 ${
                    isSavingContext
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-gray-900 to-gray-700 text-white"
                  }`}
                >
                  {isSavingContext ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* AI Services Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-xl p-8 mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Zap className="w-6 h-6 text-purple-600" />
            AI Services
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            Configure your AI provider API keys for content generation
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* OpenAI */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <img
                    src="/images/OpenAI 2.svg"
                    alt="OpenAI"
                    className="w-5 h-5 object-contain"
                  />
                  <span>OpenAI API Key</span>
                  <span className="text-gray-400">(Optional)</span>
                <ApiKeyTooltip service="openai" />
                </div>
              </label>
              <div className="relative">
                <input
                  type={showKeys["openai"] ? "text" : "password"}
                  value={apiKeys.openaiKey}
                  onChange={(e) =>
                    setApiKeys({ ...apiKeys, openaiKey: e.target.value })
                  }
                  placeholder="sk-..."
                  className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey("openai")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys["openai"] ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Perplexity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <img
                    src="/images/Perplexity Color.svg"
                    alt="Perplexity"
                    className="w-5 h-5 object-contain"
                  />
                  <span>Perplexity API Key</span>
                  <span className="text-gray-400">(Optional)</span>
                <ApiKeyTooltip service="perplexity" />
                </div>
              </label>
              <div className="relative">
                <input
                  type={showKeys["perplexity"] ? "text" : "password"}
                  value={apiKeys.perplexityKey}
                  onChange={(e) =>
                    setApiKeys({ ...apiKeys, perplexityKey: e.target.value })
                  }
                  placeholder="pplx-..."
                  className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey("perplexity")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys["perplexity"] ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Anthropic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <img
                    src="/images/Anthropic 1.svg"
                    alt="Anthropic"
                    className="w-5 h-5 object-contain"
                  />
                  <span>Anthropic API Key</span>
                <span className="text-gray-400">(Optional)</span>
                <ApiKeyTooltip service="anthropic" />
                </div>
              </label>
              <div className="relative">
                <input
                  type={showKeys["anthropic"] ? "text" : "password"}
                  value={apiKeys.anthropicKey}
                  onChange={(e) =>
                    setApiKeys({ ...apiKeys, anthropicKey: e.target.value })
                  }
                  placeholder="sk-ant-..."
                  className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey("anthropic")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys["anthropic"] ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Google Gemini */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <img
                    src="/images/Logo Gemini.svg"
                    alt="Google Gemini"
                    className="w-5 h-5 object-contain"
                  />
                  <span>Google Gemini API Key</span>
                <span className="text-gray-400">(Optional)</span>
                <ApiKeyTooltip service="gemini" />
                </div>
              </label>
              <div className="relative">
                <input
                  type={showKeys["gemini"] ? "text" : "password"}
                  value={apiKeys.geminiKey}
                  onChange={(e) =>
                    setApiKeys({ ...apiKeys, geminiKey: e.target.value })
                  }
                  placeholder="AI..."
                  className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey("gemini")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys["gemini"] ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* DeepSeek */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <img
                    src="/images/Deepseek 2.svg"
                    alt="DeepSeek"
                    className="w-5 h-5 object-contain"
                  />
                  <span>DeepSeek API Key</span>
                <span className="text-gray-400">(Optional)</span>
                <ApiKeyTooltip service="deepseek" />
                </div>
              </label>
              <div className="relative">
                <input
                  type={showKeys["deepseek"] ? "text" : "password"}
                  value={apiKeys.deepseekKey}
                  onChange={(e) =>
                    setApiKeys({ ...apiKeys, deepseekKey: e.target.value })
                  }
                  placeholder="sk-..."
                  className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey("deepseek")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys["deepseek"] ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Alibaba Qwen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <img
                    src="/images/Logo Qwen.svg"
                    alt="Alibaba Qwen"
                    className="w-5 h-5 object-contain"
                  />
                  <span>Alibaba Qwen API Key</span>
                <span className="text-gray-400">(Optional)</span>
                <ApiKeyTooltip service="qwen" />
                </div>
              </label>
              <div className="relative">
                <input
                  type={showKeys["qwen"] ? "text" : "password"}
                  value={apiKeys.qwenKey}
                  onChange={(e) =>
                    setApiKeys({ ...apiKeys, qwenKey: e.target.value })
                  }
                  placeholder="sk-..."
                  className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey("qwen")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys["qwen"] ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* xAI Grok */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <img
                    src="/images/Grok 1.svg"
                    alt="xAI Grok"
                    className="w-5 h-5 object-contain"
                  />
                  <span>xAI Grok API Key</span>
                <span className="text-gray-400">(Optional)</span>
                <ApiKeyTooltip service="grok" />
                </div>
              </label>
              <div className="relative">
                <input
                  type={showKeys["grok"] ? "text" : "password"}
                  value={apiKeys.grokKey}
                  onChange={(e) =>
                    setApiKeys({ ...apiKeys, grokKey: e.target.value })
                  }
                  placeholder="xai-..."
                  className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey("grok")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys["grok"] ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Save Button for AI Services */}
          <AnimatePresence>
            {hasAiChanges && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 flex justify-end"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 ${
                    isSaving
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-gray-900 to-gray-700 text-white"
                  }`}
                >
                  {isSaving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Other Services Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl shadow-xl p-8 mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Image className="w-6 h-6 text-green-600" />
            Other Services
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            Additional services for enhanced content features
          </p>

          <div className="space-y-6">
            {/* Unsplash */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <img
                    src="/images/Unsplash Vector Icon.svg"
                    alt="Unsplash"
                    className="w-5 h-5 object-contain"
                  />
                  <span>Unsplash Access Key</span>
                <span className="text-gray-400">(Optional)</span>
                <ApiKeyTooltip service="unsplash" />
                </div>
              </label>
              <div className="relative">
                <input
                  type={showKeys["unsplash"] ? "text" : "password"}
                  value={apiKeys.unsplashKey}
                  onChange={(e) =>
                    setApiKeys({ ...apiKeys, unsplashKey: e.target.value })
                  }
                  placeholder="For article images"
                  className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey("unsplash")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys["unsplash"] ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Used to fetch royalty-free images for your articles
              </p>
            </div>
          </div>

          {/* Save Button for Other Services */}
          <AnimatePresence>
            {hasOtherChanges && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 flex justify-end"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 ${
                    isSaving
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-gray-900 to-gray-700 text-white"
                  }`}
                >
                  {isSaving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Publishing destination selector (per-site) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-3xl shadow-xl p-8 mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Globe className="w-6 h-6 text-gray-700" />
            Publishing Destination
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            Choose where articles for the site
            {activeSite?.name ? ` "${activeSite.name}"` : ""} are published. Each
            site publishes to one destination.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(
              [
                { key: "wordpress", label: "WordPress", desc: "Publish via the WordPress REST API." },
                { key: "blog-api", label: "Blog API", desc: "Push to a custom blog ingestion API." },
              ] as { key: PublishTarget; label: string; desc: string }[]
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                disabled={isSavingTarget}
                onClick={() => handleChangeTarget(opt.key)}
                className={`text-left p-5 rounded-2xl border-2 transition-all ${
                  publishTarget === opt.key
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                } ${isSavingTarget ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">
                    {opt.label}
                  </span>
                  {publishTarget === opt.key && (
                    <span className="text-xs font-medium text-white bg-gray-900 rounded-full px-2 py-0.5">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* WordPress Section */}
        {publishTarget === "wordpress" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-3xl shadow-xl p-8 mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <img
              src="/images/Icône WordPress.svg"
              alt="WordPress"
              className="w-6 h-6 object-contain"
            />
            WordPress Configuration
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            Connect your WordPress site for automatic article publishing
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <span>WordPress URL</span>
                <ApiKeyTooltip service="wordpress" />
                </div>
              </label>
              <input
                type="url"
                value={apiKeys.wordpressUrl}
                onChange={(e) =>
                  setApiKeys({ ...apiKeys, wordpressUrl: e.target.value })
                }
                placeholder="https://yoursite.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <span>WordPress Username</span>
                </div>
              </label>
              <input
                type="text"
                value={apiKeys.wordpressUsername}
                onChange={(e) =>
                  setApiKeys({ ...apiKeys, wordpressUsername: e.target.value })
                }
                placeholder="admin"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <span>WordPress Application Password</span>
                </div>
              </label>
              <div className="relative">
                <input
                  type={showKeys["wordpress"] ? "text" : "password"}
                  value={apiKeys.wordpressPassword}
                  onChange={(e) =>
                    setApiKeys({
                      ...apiKeys,
                      wordpressPassword: e.target.value,
                    })
                  }
                  placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                  className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey("wordpress")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys["wordpress"] ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Create an application password in WordPress: Users → Your
                Profile → Application Passwords
              </p>
            </div>
          </div>

          {/* Sync existing articles from WordPress */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Sync existing articles
                </h3>
                <p className="text-sm text-gray-600">
                  Importe les titres déjà publiés sur WordPress pour éviter les
                  doublons lors de la génération d'idées.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {knownTitlesCount > 0 ? (
                    <>
                      {knownTitlesCount} titre
                      {knownTitlesCount > 1 ? "s" : ""} synchronisé
                      {knownTitlesCount > 1 ? "s" : ""}
                      {lastWpSyncAt
                        ? ` · dernière sync : ${new Date(
                            lastWpSyncAt
                          ).toLocaleString("fr-FR")}`
                        : ""}
                    </>
                  ) : (
                    "Aucune synchronisation pour le moment."
                  )}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSyncTitles()}
                disabled={
                  isSyncingTitles ||
                  !apiKeys.wordpressUrl ||
                  !apiKeys.wordpressUsername ||
                  !apiKeys.wordpressPassword
                }
                className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${
                  isSyncingTitles ||
                  !apiKeys.wordpressUrl ||
                  !apiKeys.wordpressUsername ||
                  !apiKeys.wordpressPassword
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                }`}
              >
                <motion.div
                  animate={isSyncingTitles ? { rotate: 360 } : { rotate: 0 }}
                  transition={
                    isSyncingTitles
                      ? { duration: 1, repeat: Infinity, ease: "linear" }
                      : { duration: 0 }
                  }
                >
                  <RefreshCw className="w-4 h-4" />
                </motion.div>
                {isSyncingTitles ? "Syncing..." : "Sync from WordPress"}
              </motion.button>
            </div>
          </div>

          {/* Save Button for WordPress */}
          <AnimatePresence>
            {hasWordPressChanges && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 flex justify-end"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 ${
                    isSaving
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-gray-900 to-gray-700 text-white"
                  }`}
                >
                  {isSaving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        )}

        {/* Blog API Section */}
        {publishTarget === "blog-api" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-3xl shadow-xl p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Globe className="w-6 h-6 text-gray-700" />
              Blog API Configuration
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              Push generated articles to a custom blog ingestion API (HTML
              format).
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blog API URL
                </label>
                <input
                  type="url"
                  value={apiKeys.blogApiUrl}
                  onChange={(e) =>
                    setApiKeys({ ...apiKeys, blogApiUrl: e.target.value })
                  }
                  placeholder="https://yoursite.com/api/blog"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Base URL of the ingestion API, e.g.
                  https://jadoremaloc.com/api/blog
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showKeys["blogApi"] ? "text" : "password"}
                    value={apiKeys.blogApiKey}
                    onChange={(e) =>
                      setApiKeys({ ...apiKeys, blogApiKey: e.target.value })
                    }
                    placeholder="Bearer token (BLOG_API_KEY)"
                    className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey("blogApi")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKeys["blogApi"] ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Sent as <code>Authorization: Bearer &lt;key&gt;</code> on every
                  request.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Author name (optional)
                  </label>
                  <input
                    type="text"
                    value={apiKeys.blogAuthorName}
                    onChange={(e) =>
                      setApiKeys({ ...apiKeys, blogAuthorName: e.target.value })
                    }
                    placeholder="Jane Doe"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Author avatar URL (optional)
                  </label>
                  <input
                    type="url"
                    value={apiKeys.blogAuthorAvatarUrl}
                    onChange={(e) =>
                      setApiKeys({
                        ...apiKeys,
                        blogAuthorAvatarUrl: e.target.value,
                      })
                    }
                    placeholder="https://.../avatar.jpg"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>
            </div>

            <AnimatePresence>
              {hasBlogApiChanges && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-6 flex justify-end"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveBlogApi}
                    disabled={isSaving}
                    className={`px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 ${
                      isSaving
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-gray-900 to-gray-700 text-white"
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save
                      </>
                    )}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
