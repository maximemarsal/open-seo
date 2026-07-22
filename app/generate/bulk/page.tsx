"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Rocket,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  FileText,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Calendar,
  X,
  Target,
  Edit2,
  Globe,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { getUserApiKeys } from "../../../lib/services/userKeys";
import { getWpCredentials } from "../../../lib/services/wpCredentials";
import { getBlogApiCredentials } from "../../../lib/services/blogApiCredentials";
import { CTA } from "../../../types/blog";
import CTAModal from "../../../components/CTAModal";
import { useSite } from "../../../contexts/SiteContext";

// GPT-5.5 and above use a different effort scale (no "minimal", adds "xhigh")
function isGpt55Plus(model: string): boolean {
  const m = (model || "").toLowerCase();
  const match = m.match(/^gpt-(\d+)(?:\.(\d+))?/);
  if (!match) return false;
  const major = parseInt(match[1], 10);
  const minor = match[2] ? parseInt(match[2], 10) : 0;
  if (major > 5) return true;
  if (major === 5 && minor >= 5) return true;
  return false;
}

interface BulkTopic {
  id: string;
  topic: string;
  status: "pending" | "generating" | "completed" | "failed";
  progress?: number;
  message?: string;
  articleId?: string;
  error?: string;
}

interface GenerationConfig {
  aiProvider: "openai" | "anthropic" | "gemini" | "deepseek" | "qwen" | "grok";
  model: string;
  useResearch: boolean;
  researchDepth: "shallow" | "moderate" | "deep";
  numberOfImages: number;
  publishToWordPress: boolean;
  extraContext: string;
  gpt5ReasoningEffort: "minimal" | "low" | "medium" | "high" | "xhigh";
  gpt5Verbosity: "low" | "medium" | "high";
  autoSchedule: boolean;
  intervalDays: number;
  startDate: string; // YYYY-MM-DD
  publishTime: string; // HH:MM
  delayMs: number; // delay between generations (rate-limit safety)
}

const todayYmd = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

// A background generation job, as returned by /api/generate/jobs. Jobs run
// ON THE SERVER — the page only enqueues them and polls their status, so the
// user can safely close the tab mid-generation.
interface ServerJob {
  id: string;
  topic: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  message?: string;
  currentSection?: string;
  articleId?: string;
  scheduledAt?: string | null;
  // Small result summary written by the worker — articleTitle is the final
  // SEO title, shown next to the original topic so both stay linked.
  result?: {
    articleTitle?: string;
    seoScore?: number;
    wordCount?: number;
  };
  error?: string;
  errorHint?: string;
  createdAt: string;
}

const JOBS_POLL_INTERVAL_MS = 4000;

export default function BulkGeneratePage() {
  const { user, loading: authLoading } = useAuth();
  const { activeSiteId, activeSite } = useSite();
  const router = useRouter();
  const [topics, setTopics] = useState<BulkTopic[]>([]);
  const [newTopic, setNewTopic] = useState("");
  // True only while the batch is being sent to the server (enqueue call).
  const [isLaunching, setIsLaunching] = useState(false);
  // Server-side jobs for this site (queued/running/completed/failed).
  const [jobs, setJobs] = useState<ServerJob[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<GenerationConfig>({
    aiProvider: "openai",
    model: "gpt-4o-mini",
    useResearch: true,
    researchDepth: "moderate",
    numberOfImages: 0,
    publishToWordPress: false,
    extraContext: "",
    gpt5ReasoningEffort: "medium",
    gpt5Verbosity: "medium",
    autoSchedule: false,
    intervalDays: 3,
    startDate: todayYmd(),
    publishTime: "09:00",
    delayMs: 2000,
  });

  // CTAs (applied to every article in the batch)
  const [ctas, setCtas] = useState<CTA[]>([]);
  const [showCTAModal, setShowCTAModal] = useState(false);
  const [editingCTA, setEditingCTA] = useState<CTA | undefined>(undefined);

  // --- Server jobs: fetch + poll while any job is still queued/running ---
  const fetchJobs = React.useCallback(async () => {
    if (!user || !activeSiteId) return;
    try {
      const idToken = await user.getIdToken();
      const resp = await fetch("/api/generate/jobs", {
        headers: {
          Authorization: `Bearer ${idToken}`,
          "x-site-id": activeSiteId,
        },
      });
      if (!resp.ok) return;
      const data = await resp.json();
      if (Array.isArray(data.jobs)) setJobs(data.jobs);
    } catch {
      // Polling is best-effort — network hiccups just skip a tick.
    }
  }, [user, activeSiteId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const hasActiveJobs = jobs.some(
    (j) => j.status === "queued" || j.status === "running"
  );

  useEffect(() => {
    if (!hasActiveJobs) return;
    const timer = setInterval(fetchJobs, JOBS_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasActiveJobs, fetchJobs]);

  // Generate-ideas modal state
  const [isIdeasOpen, setIsIdeasOpen] = useState(false);
  const [ideasCount, setIdeasCount] = useState(10);
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
  const [ideas, setIdeas] = useState<{ title: string; selected: boolean }[]>(
    []
  );

  const handleAddCTA = () => {
    setEditingCTA(undefined);
    setShowCTAModal(true);
  };
  const handleEditCTA = (cta: CTA) => {
    setEditingCTA(cta);
    setShowCTAModal(true);
  };
  const handleDeleteCTA = (id: string) => {
    setCtas((prev) => prev.filter((c) => c.id !== id));
  };
  const handleSaveCTA = (cta: CTA) => {
    setCtas((prev) => {
      const existing = prev.find((c) => c.id === cta.id);
      if (existing) {
        return prev.map((c) => (c.id === cta.id ? cta : c));
      }
      return [...prev, cta];
    });
    setShowCTAModal(false);
    setEditingCTA(undefined);
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Persist topics in localStorage so accidental refresh doesn't wipe the queue
  // Scoped per-site so switching sites doesn't leak queue state across sites.
  const storageKey =
    user && activeSiteId
      ? `bulkQueue.${user.uid}.${activeSiteId}`
      : null;

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as BulkTopic[];
        if (Array.isArray(parsed)) {
          // Reset any in-flight statuses
          const sanitized = parsed.map((t) =>
            t.status === "generating" ? { ...t, status: "pending" as const } : t
          );
          setTopics(sanitized);
        }
      }
    } catch (err) {
      console.warn("Failed to restore bulk queue:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(topics));
    } catch (err) {
      // localStorage may be full or unavailable — non-fatal
    }
  }, [topics, storageKey]);

  const addTopic = () => {
    if (!newTopic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    const newItem: BulkTopic = {
      id: `topic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      topic: newTopic.trim(),
      status: "pending",
    };

    setTopics([...topics, newItem]);
    setNewTopic("");
  };

  const removeTopic = (id: string) => {
    setTopics(topics.filter((t) => t.id !== id));
  };

  const computeScheduledAt = (index: number): string => {
    const [hh, mm] = (config.publishTime || "09:00").split(":");
    const base = new Date(`${config.startDate}T00:00:00`);
    base.setHours(parseInt(hh, 10) || 9, parseInt(mm, 10) || 0, 0, 0);
    base.setDate(base.getDate() + index * (config.intervalDays || 3));
    return base.toISOString();
  };

  const startBulkGeneration = async () => {
    // Check API keys first
    if (user) {
      const userKeys = await getUserApiKeys(user.uid);
      const missing: string[] = [];

      if (!userKeys?.openaiKey && config.aiProvider === "openai") {
        missing.push("OpenAI API Key");
      }
      if (!userKeys?.anthropicKey && config.aiProvider === "anthropic") {
        missing.push("Anthropic API Key");
      }
      if (!userKeys?.geminiKey && config.aiProvider === "gemini") {
        missing.push("Gemini API Key");
      }
      if (!userKeys?.perplexityKey && config.useResearch) {
        missing.push("Perplexity API Key");
      }
      if (!userKeys?.unsplashKey && config.numberOfImages > 0) {
        missing.push("Unsplash API Key");
      }
      if (config.publishToWordPress) {
        if (!activeSiteId) {
          missing.push("Active site (select a site first)");
        } else if (activeSite?.publishTarget === "blog-api") {
          const blog = await getBlogApiCredentials(user.uid, activeSiteId);
          if (!blog?.blogApiUrl || !blog?.blogApiKey) {
            missing.push(
              `Blog API credentials for site "${activeSite?.name || "active"}"`
            );
          }
        } else {
          const wp = await getWpCredentials(user.uid, activeSiteId);
          if (
            !wp?.wordpressUrl ||
            !wp?.wordpressUsername ||
            !wp?.wordpressPassword
          ) {
            missing.push(
              `WordPress credentials for site "${activeSite?.name || "active"}"`
            );
          }
        }
      }
      if (
        config.aiProvider === "deepseek" &&
        !userKeys?.deepseekKey
      ) {
        missing.push("DeepSeek API Key");
      }
      if (config.aiProvider === "qwen" && !userKeys?.qwenKey) {
        missing.push("Qwen API Key");
      }
      if (config.aiProvider === "grok" && !userKeys?.grokKey) {
        missing.push("Grok API Key");
      }

      if (missing.length > 0) {
        toast.error(`Missing API keys: ${missing.join(", ")}. Go to Settings.`);
        return;
      }
    }

    const pendingTopics = topics.filter((t) => t.status === "pending");
    if (pendingTopics.length === 0) {
      toast.error("No pending topics to generate");
      return;
    }

    // Enqueue everything on the server: generation runs in the background
    // (survives closing the page) and this page just polls job status.
    setIsLaunching(true);
    try {
      const idToken = await user?.getIdToken();
      if (!idToken) {
        throw new Error("Authentication failed");
      }

      const items = pendingTopics.map((t, index) => ({
        topic: t.topic,
        scheduledAt: config.autoSchedule ? computeScheduledAt(index) : null,
      }));

      const response = await fetch("/api/generate/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          ...(activeSiteId ? { "x-site-id": activeSiteId } : {}),
        },
        body: JSON.stringify({
          topics: items,
          options: {
            publishToWordPress: config.publishToWordPress,
            researchDepth: config.researchDepth,
            numberOfImages: config.numberOfImages,
            aiProvider: config.aiProvider,
            model: config.model,
            useResearch: config.useResearch,
            extraContext: config.extraContext,
            ctas,
            ...(config.aiProvider === "openai" &&
            config.model.toLowerCase().startsWith("gpt-5")
              ? {
                  gpt5ReasoningEffort: config.gpt5ReasoningEffort,
                  gpt5Verbosity: config.gpt5Verbosity,
                }
              : {}),
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const hint = data?.hint ? ` — ${data.hint}` : "";
        throw new Error((data?.error || "Failed to start generation") + hint);
      }

      // Posted topics now live as server jobs — drop them from the local queue.
      const postedIds = new Set(pendingTopics.map((t) => t.id));
      setTopics((prev) => prev.filter((t) => !postedIds.has(t.id)));
      await fetchJobs();

      toast.success(
        `${items.length} article${items.length > 1 ? "s" : ""} en cours de génération sur le serveur — vous pouvez quitter la page.`,
        { icon: "🚀", duration: 6000 }
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to start generation");
    } finally {
      setIsLaunching(false);
    }
  };

  // Cancel a job still waiting in the queue (running jobs can't be cancelled).
  const cancelQueuedJob = async (jobId: string) => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const resp = await fetch(`/api/generate/jobs/${jobId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`,
          ...(activeSiteId ? { "x-site-id": activeSiteId } : {}),
        },
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data?.error || "Failed to cancel job");
      }
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel job");
    }
  };

  // Put a failed job's topic back in the local queue and remove the job.
  const retryFailedJob = async (job: ServerJob) => {
    setTopics((prev) => [
      ...prev,
      {
        id: `topic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        topic: job.topic,
        status: "pending",
      },
    ]);
    await cancelQueuedJob(job.id);
    toast.success("Topic re-added to the queue. Click Generate All to retry.");
  };

  const clearFinishedJobs = async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      await fetch("/api/generate/jobs?scope=finished", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`,
          ...(activeSiteId ? { "x-site-id": activeSiteId } : {}),
        },
      });
      setJobs((prev) =>
        prev.filter((j) => j.status === "queued" || j.status === "running")
      );
    } catch {
      // Best-effort — the next poll re-syncs.
    }
  };

  const handleGenerateIdeas = async () => {
    if (!user) return;
    try {
      setIsLoadingIdeas(true);
      setIdeas([]);
      const idToken = await user.getIdToken();
      const resp = await fetch("/api/generate/ideas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          ...(activeSiteId ? { "x-site-id": activeSiteId } : {}),
        },
        body: JSON.stringify({
          count: ideasCount,
          aiProvider: config.aiProvider,
          model: config.model,
          // Exclude what's already on screen or queued so re-generating yields
          // genuinely new ideas (saved-article titles are excluded server-side).
          excludeTitles: [
            ...ideas.map((i) => i.title),
            ...topics.map((t) => t.topic),
          ],
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || "Failed to generate ideas");
      }
      const list = Array.isArray(data.ideas) ? data.ideas : [];
      if (list.length === 0) {
        toast.error("No ideas returned — try again or refine your business context.");
        return;
      }
      setIdeas(list.map((title: string) => ({ title, selected: true })));
    } catch (err: any) {
      console.error("Generate ideas error:", err);
      toast.error(err?.message || "Failed to generate ideas");
    } finally {
      setIsLoadingIdeas(false);
    }
  };

  const toggleIdea = (index: number) => {
    setIdeas((prev) =>
      prev.map((idea, i) =>
        i === index ? { ...idea, selected: !idea.selected } : idea
      )
    );
  };

  const addSelectedIdeas = () => {
    const selected = ideas.filter((i) => i.selected);
    if (selected.length === 0) {
      toast.error("Select at least one idea");
      return;
    }
    const newItems: BulkTopic[] = selected.map((idea) => ({
      id: `topic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      topic: idea.title,
      status: "pending",
    }));
    setTopics((prev) => [...prev, ...newItems]);
    setIsIdeasOpen(false);
    setIdeas([]);
    toast.success(`Added ${selected.length} topic${selected.length > 1 ? "s" : ""} to queue.`);
  };

  // Local queue (not launched yet) + server-side job counters.
  const pendingCount = topics.filter((t) => t.status === "pending").length;
  const queuedJobsCount = jobs.filter((j) => j.status === "queued").length;
  const runningJobsCount = jobs.filter((j) => j.status === "running").length;
  const completedCount = jobs.filter((j) => j.status === "completed").length;
  const failedCount = jobs.filter((j) => j.status === "failed").length;
  const finishedJobsCount = completedCount + failedCount;

  // Compose UI stays enabled while jobs run server-side — only lock it
  // during the enqueue call itself.
  const isGenerating = isLaunching;

  if (authLoading) {
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
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Bulk Article Generation
          </h1>
          <p className="text-gray-500 mt-2">
            Add multiple topics and generate them all at once
          </p>
        </motion.div>

        {/* Server-side generation banner */}
        <AnimatePresence>
          {hasActiveJobs && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>
                <strong>Génération en cours sur le serveur.</strong> Vous
                pouvez quitter cette page — les articles continueront d&apos;être
                générés et programmés automatiquement.
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        {(topics.length > 0 || jobs.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-4 gap-4 mb-6"
          >
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">À lancer</p>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">En cours / file</p>
              <p className="text-2xl font-bold text-blue-600">
                {runningJobsCount + queuedJobsCount}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">Terminés</p>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">Échoués</p>
              <p className="text-2xl font-bold text-red-600">{failedCount}</p>
            </div>
          </motion.div>
        )}

        {/* Add Topic Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 mb-6"
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTopic()}
              placeholder="Enter article topic (e.g., 'Best SEO practices 2026')"
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900 placeholder-gray-400"
              disabled={isGenerating}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={addTopic}
              disabled={isGenerating || !newTopic.trim()}
              className="px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add
            </motion.button>
          </div>

          <div className="flex justify-end mt-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setIsIdeasOpen(true);
                setIdeas([]);
              }}
              disabled={isGenerating}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Generate ideas
            </motion.button>
          </div>

          {/* Config Toggle */}
          <motion.button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mt-4"
          >
            <motion.div animate={{ rotate: showConfig ? 180 : 0 }}>
              <ChevronDown className="w-4 h-4" />
            </motion.div>
            Generation Settings
          </motion.button>

          <AnimatePresence>
            {showConfig && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4"
              >
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    AI Provider
                  </label>
                  <select
                    value={config.aiProvider}
                    onChange={(e) =>
                      setConfig({ ...config, aiProvider: e.target.value as any })
                    }
                    disabled={isGenerating}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="gemini">Gemini</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="qwen">Qwen</option>
                    <option value="grok">Grok</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Model
                  </label>
                  <select
                    value={config.model}
                    onChange={(e) =>
                      setConfig({ ...config, model: e.target.value })
                    }
                    disabled={isGenerating}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  >
                    {config.aiProvider === "openai" && (
                      <>
                        <optgroup label="GPT-5.5 (latest)">
                          <option value="gpt-5.5">GPT-5.5</option>
                          <option value="gpt-5.5-pro">GPT-5.5 Pro</option>
                        </optgroup>
                        <optgroup label="GPT-5.4">
                          <option value="gpt-5.4">GPT-5.4</option>
                          <option value="gpt-5.4-mini">GPT-5.4 Mini</option>
                          <option value="gpt-5.4-nano">GPT-5.4 Nano</option>
                          <option value="gpt-5.4-pro">GPT-5.4 Pro</option>
                        </optgroup>
                        <optgroup label="GPT-5.2 / 5.1">
                          <option value="gpt-5.2">GPT-5.2</option>
                          <option value="gpt-5.2-pro">GPT-5.2 Pro</option>
                          <option value="gpt-5.1">GPT-5.1</option>
                        </optgroup>
                        <optgroup label="GPT-5">
                          <option value="gpt-5">GPT-5</option>
                          <option value="gpt-5-mini">GPT-5 Mini</option>
                          <option value="gpt-5-nano">GPT-5 Nano</option>
                          <option value="gpt-5-pro">GPT-5 Pro</option>
                        </optgroup>
                        <optgroup label="GPT-4">
                          <option value="gpt-4.1">GPT-4.1</option>
                          <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                          <option value="gpt-4.1-nano">GPT-4.1 Nano</option>
                          <option value="gpt-4o">GPT-4o</option>
                          <option value="gpt-4o-mini">GPT-4o Mini</option>
                        </optgroup>
                      </>
                    )}
                    {config.aiProvider === "anthropic" && (
                      <>
                        <option value="claude-opus-4">Claude Opus 4</option>
                        <option value="claude-sonnet-4.5">
                          Claude Sonnet 4.5
                        </option>
                        <option value="claude-sonnet">Claude Sonnet</option>
                      </>
                    )}
                    {config.aiProvider === "gemini" && (
                      <>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                        <option value="gemini-2.5-flash">
                          Gemini 2.5 Flash
                        </option>
                      </>
                    )}
                    {config.aiProvider === "deepseek" && (
                      <option value="deepseek-r1">DeepSeek R1</option>
                    )}
                    {config.aiProvider === "qwen" && (
                      <option value="qwen-qwq-32b-preview">Qwen QwQ 32B</option>
                    )}
                    {config.aiProvider === "grok" && (
                      <option value="grok-4">Grok 4</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Research Depth
                  </label>
                  <select
                    value={config.researchDepth}
                    onChange={(e) =>
                      setConfig({ ...config, researchDepth: e.target.value as any })
                    }
                    disabled={isGenerating}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="shallow">Shallow</option>
                    <option value="moderate">Moderate</option>
                    <option value="deep">Deep</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Images : {config.numberOfImages}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={1}
                    value={config.numberOfImages}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        numberOfImages: parseInt(e.target.value),
                      })
                    }
                    disabled={isGenerating}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-900 mt-3"
                  />
                </div>

                <div className="col-span-2 md:col-span-4 flex flex-wrap gap-x-6 gap-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.useResearch}
                      onChange={(e) =>
                        setConfig({ ...config, useResearch: e.target.checked })
                      }
                      disabled={isGenerating}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      Use Web Research (Perplexity)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.publishToWordPress}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          publishToWordPress: e.target.checked,
                        })
                      }
                      disabled={isGenerating}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <Globe className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      Publish to WordPress
                    </span>
                  </label>
                </div>

                {/* GPT-5 reasoning / verbosity */}
                {config.aiProvider === "openai" &&
                  config.model.toLowerCase().startsWith("gpt-5") && (
                    <div className="col-span-2 md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Reasoning Effort
                        </label>
                        <select
                          value={config.gpt5ReasoningEffort}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              gpt5ReasoningEffort: e.target.value as any,
                            })
                          }
                          disabled={isGenerating}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        >
                          {isGpt55Plus(config.model) ? (
                            <>
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="xhigh">Extra High</option>
                            </>
                          ) : (
                            <>
                              <option value="minimal">Minimal</option>
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Verbosity
                        </label>
                        <select
                          value={config.gpt5Verbosity}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              gpt5Verbosity: e.target.value as any,
                            })
                          }
                          disabled={isGenerating}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>
                  )}

                {/* Extra context (per-batch, in addition to global business context) */}
                <div className="col-span-2 md:col-span-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Extra context for this batch (optional)
                  </label>
                  <textarea
                    value={config.extraContext}
                    onChange={(e) =>
                      setConfig({ ...config, extraContext: e.target.value })
                    }
                    rows={3}
                    placeholder="Instructions ou contraintes additionnelles appliquées à tous les articles de ce batch (ex: 'angle pratique, format guide, public débutant')"
                    disabled={isGenerating}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm resize-y"
                  />
                </div>

                <div className="col-span-2 md:col-span-4 mt-2 pt-4 border-t border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={config.autoSchedule}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          autoSchedule: e.target.checked,
                        })
                      }
                      disabled={isGenerating}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Auto-schedule generated articles
                    </span>
                  </label>

                  {config.autoSchedule && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pl-6">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Tous les (jours)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={config.intervalDays}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              intervalDays: Math.max(
                                1,
                                parseInt(e.target.value, 10) || 1
                              ),
                            })
                          }
                          disabled={isGenerating}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Date de début
                        </label>
                        <input
                          type="date"
                          value={config.startDate}
                          onChange={(e) =>
                            setConfig({ ...config, startDate: e.target.value })
                          }
                          disabled={isGenerating}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Heure
                        </label>
                        <input
                          type="time"
                          value={config.publishTime}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              publishTime: e.target.value,
                            })
                          }
                          disabled={isGenerating}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Délai entre générations (ms)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={500}
                          value={config.delayMs}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              delayMs: Math.max(
                                0,
                                parseInt(e.target.value, 10) || 0
                              ),
                            })
                          }
                          disabled={isGenerating}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* CTAs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-gray-700" />
              <span className="text-sm font-medium text-gray-700">
                Call-to-Actions (applied to every article in this batch)
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddCTA}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-200 disabled:text-gray-400"
            >
              <Plus className="w-4 h-4" />
              Add CTA
            </motion.button>
          </div>

          {ctas.length === 0 ? (
            <p className="text-xs text-gray-500">
              No CTAs configured. Add one to promote your product or offer.
            </p>
          ) : (
            <div className="space-y-2">
              {ctas.map((cta) => (
                <motion.div
                  key={cta.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-3"
                >
                  {cta.imageUrl && (
                    <img
                      src={cta.imageUrl}
                      alt={cta.title || "CTA"}
                      className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">
                      {cta.title || "Untitled CTA"}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">
                      {cta.positionType === "after-intro" &&
                        "After Introduction"}
                      {cta.positionType === "after-section" &&
                        `After Section ${cta.sectionNumber || 1}`}
                      {cta.positionType === "middle" && "Middle of Article"}
                      {cta.positionType === "before-conclusion" &&
                        "Before Conclusion"}
                      {cta.positionType === "end" && "End of Article"}
                      {cta.positionType === "random" &&
                        `Random (${cta.randomCount || 1}×)`}{" "}
                      · {cta.style} style
                    </p>
                  </div>
                  <button
                    onClick={() => handleEditCTA(cta)}
                    disabled={isGenerating}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDeleteCTA(cta.id)}
                    disabled={isGenerating}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Topics List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden mb-6"
        >
          {topics.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No topics added yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Add topics above to start bulk generation
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              <AnimatePresence>
                {topics.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {item.status === "pending" && (
                        <Clock className="w-5 h-5 text-gray-400" />
                      )}
                      {item.status === "generating" && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="w-5 h-5 text-blue-500" />
                        </motion.div>
                      )}
                      {item.status === "completed" && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      {item.status === "failed" && (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>

                    {/* Topic Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {item.topic}
                      </p>
                      {item.message && (
                        <p className="text-sm text-gray-500 truncate">
                          {item.message}
                        </p>
                      )}
                      {item.error && (
                        <p className="text-sm text-red-500 truncate">{item.error}</p>
                      )}
                    </div>

                    {/* Progress */}
                    {item.status === "generating" && item.progress !== undefined && (
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-blue-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!isGenerating && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => removeTopic(item.id)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Launch button */}
        {topics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-4 mb-6"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startBulkGeneration}
              disabled={pendingCount === 0 || isLaunching}
              className="flex-1 py-4 bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 hover:shadow-lg transition-all disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed"
            >
              {isLaunching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi au serveur...
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  Generate All ({pendingCount} articles)
                </>
              )}
            </motion.button>
          </motion.div>
        )}

        {/* Server jobs */}
        {jobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden mb-6"
          >
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rocket className="w-4 h-4 text-gray-700" />
                <span className="text-sm font-medium text-gray-700">
                  Générations serveur
                </span>
                {hasActiveJobs && (
                  <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                    {runningJobsCount + queuedJobsCount} en cours
                  </span>
                )}
              </div>
              {finishedJobsCount > 0 && (
                <button
                  onClick={clearFinishedJobs}
                  className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Effacer les terminés ({finishedJobsCount})
                </button>
              )}
            </div>
            <div className="divide-y divide-gray-100">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {job.status === "queued" && (
                      <Clock className="w-5 h-5 text-gray-400" />
                    )}
                    {job.status === "running" && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Loader2 className="w-5 h-5 text-blue-500" />
                      </motion.div>
                    )}
                    {job.status === "completed" && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                    {job.status === "failed" && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {job.topic}
                    </p>
                    {job.status === "failed" ? (
                      <p className="text-sm text-red-500 truncate">
                        {job.error || "Generation failed"}
                      </p>
                    ) : job.status === "completed" ? (
                      <p className="text-sm text-gray-500 truncate">
                        {job.result?.articleTitle ? (
                          <>
                            → Article&nbsp;: «&nbsp;
                            <span className="text-gray-700 font-medium">
                              {job.result.articleTitle}
                            </span>
                            &nbsp;»
                          </>
                        ) : (
                          job.message
                        )}
                        {job.scheduledAt
                          ? ` — programmé le ${new Date(
                              job.scheduledAt
                            ).toLocaleDateString("fr-FR")}`
                          : ""}
                      </p>
                    ) : (
                      job.message && (
                        <p className="text-sm text-gray-500 truncate">
                          {job.message}
                        </p>
                      )
                    )}
                  </div>

                  {job.status === "running" && (
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${job.progress || 0}%` }}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {job.status === "completed" && job.articleId && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          router.push(
                            `/generate/calendar?articleId=${job.articleId}`
                          )
                        }
                        className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
                      >
                        {job.scheduledAt ? "Voir" : "Schedule"}
                      </motion.button>
                    )}
                    {job.status === "failed" && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => retryFailedJob(job)}
                        title="Remettre dans la file"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <RotateCcw className="w-4 h-4 text-gray-500" />
                      </motion.button>
                    )}
                    {job.status === "queued" && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => cancelQueuedJob(job.id)}
                        title="Annuler"
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </motion.button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Post-run shortcuts */}
        {completedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/generate/articles")}
              className="px-8 py-4 bg-green-600 text-white rounded-2xl font-semibold text-lg hover:bg-green-700 transition-colors"
            >
              View Articles
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* CTA Modal */}
      {user && (
        <CTAModal
          isOpen={showCTAModal}
          onClose={() => {
            setShowCTAModal(false);
            setEditingCTA(undefined);
          }}
          onSave={handleSaveCTA}
          existingCTA={editingCTA}
          maxPosition={6}
          userId={user.uid}
          siteId={activeSiteId || undefined}
        />
      )}

      {/* Generate Ideas Modal */}
      <AnimatePresence>
        {isIdeasOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => !isLoadingIdeas && setIsIdeasOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Generate article ideas
                </h3>
                <button
                  onClick={() => !isLoadingIdeas && setIsIdeasOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isLoadingIdeas}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="px-6 py-4 border-b border-gray-100 flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Combien d'idées ?
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={ideasCount}
                    onChange={(e) =>
                      setIdeasCount(
                        Math.min(
                          30,
                          Math.max(1, parseInt(e.target.value, 10) || 1)
                        )
                      )
                    }
                    disabled={isLoadingIdeas}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGenerateIdeas}
                  disabled={isLoadingIdeas}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoadingIdeas ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                {ideas.length === 0 && !isLoadingIdeas && (
                  <p className="text-sm text-gray-500 text-center py-8">
                    Les idées générées s'appuieront sur votre business context
                    et éviteront vos articles déjà publiés.
                  </p>
                )}
                {isLoadingIdeas && (
                  <div className="flex flex-col items-center py-8 gap-3 text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    <p className="text-sm">Generating ideas...</p>
                  </div>
                )}
                {ideas.length > 0 && (
                  <ul className="space-y-2">
                    {ideas.map((idea, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleIdea(i)}
                      >
                        <input
                          type="checkbox"
                          checked={idea.selected}
                          onChange={() => toggleIdea(i)}
                          className="mt-1 w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-800">
                          {idea.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {ideas.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    {ideas.filter((i) => i.selected).length} / {ideas.length}{" "}
                    sélectionnée
                    {ideas.filter((i) => i.selected).length > 1 ? "s" : ""}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsIdeasOpen(false)}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={addSelectedIdeas}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                    >
                      Add to queue
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
