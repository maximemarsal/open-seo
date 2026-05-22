"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Calendar,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { getUserApiKeys } from "../../../lib/services/userKeys";

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

export default function BulkGeneratePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [topics, setTopics] = useState<BulkTopic[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<GenerationConfig>({
    aiProvider: "openai",
    model: "gpt-4o-mini",
    useResearch: true,
    researchDepth: "moderate",
    numberOfImages: 0,
    autoSchedule: false,
    intervalDays: 3,
    startDate: todayYmd(),
    publishTime: "09:00",
    delayMs: 2000,
  });

  // Generate-ideas modal state
  const [isIdeasOpen, setIsIdeasOpen] = useState(false);
  const [ideasCount, setIdeasCount] = useState(10);
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
  const [ideas, setIdeas] = useState<{ title: string; selected: boolean }[]>(
    []
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Persist topics in localStorage so accidental refresh doesn't wipe the queue
  const storageKey = user ? `bulkQueue.${user.uid}` : null;

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

  const resetTopic = (id: string) => {
    setTopics(
      topics.map((t) =>
        t.id === id
          ? { ...t, status: "pending", progress: undefined, error: undefined }
          : t
      )
    );
  };

  const updateTopicStatus = (
    id: string,
    updates: Partial<BulkTopic>
  ) => {
    setTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const computeScheduledAt = (index: number): string => {
    const [hh, mm] = (config.publishTime || "09:00").split(":");
    const base = new Date(`${config.startDate}T00:00:00`);
    base.setHours(parseInt(hh, 10) || 9, parseInt(mm, 10) || 0, 0, 0);
    base.setDate(base.getDate() + index * (config.intervalDays || 3));
    return base.toISOString();
  };

  const generateSingleArticle = async (
    topicItem: BulkTopic,
    scheduleIndex: number
  ): Promise<boolean> => {
    updateTopicStatus(topicItem.id, {
      status: "generating",
      progress: 0,
      message: "Starting...",
    });

    try {
      const idToken = await user?.getIdToken();
      if (!idToken) {
        throw new Error("Authentication failed");
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          topic: topicItem.topic,
          publishToWordPress: false,
          researchDepth: config.researchDepth,
          numberOfImages: config.numberOfImages,
          aiProvider: config.aiProvider,
          model: config.model,
          useResearch: config.useResearch,
          ctas: [],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Generation failed");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Stream not available");
      }

      let buffer = "";
      let articleId: string | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value, { stream: true });
        buffer += chunk;

        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (part.trim().startsWith("data: ")) {
            try {
              const jsonStr = part.trim().substring(6);
              const data = JSON.parse(jsonStr);

              if (data.type === "progress") {
                updateTopicStatus(topicItem.id, {
                  progress: data.payload.progress,
                  message: data.payload.message,
                });
              } else if (data.type === "complete") {
                // Auto-save the article
                const saveResponse = await fetch("/api/articles", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                  },
                  body: JSON.stringify({
                    title: data.payload.seoMetadata?.metaTitle || topicItem.topic,
                    content: data.payload.articleContent,
                    seoMetadata: data.payload.seoMetadata,
                    outline: data.payload.outline,
                    images: data.payload.images,
                    wordCount: data.payload.wordCount,
                  }),
                });

                if (saveResponse.ok) {
                  const saveData = await saveResponse.json();
                  articleId = saveData.article.id;

                  // Auto-schedule if enabled
                  if (config.autoSchedule && articleId) {
                    try {
                      const scheduledAt = computeScheduledAt(scheduleIndex);
                      await fetch(`/api/articles/${articleId}/schedule`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${idToken}`,
                        },
                        body: JSON.stringify({ scheduledAt }),
                      });
                    } catch (scheduleErr) {
                      console.warn(
                        "Auto-schedule failed for article",
                        articleId,
                        scheduleErr
                      );
                    }
                  }
                }
              } else if (data.type === "error") {
                throw new Error(data.payload.message || "Generation error");
              }
            } catch (parseError) {
              // Ignore parse errors
            }
          }
        }
      }

      updateTopicStatus(topicItem.id, {
        status: "completed",
        progress: 100,
        message: "Completed!",
        articleId,
      });

      return true;
    } catch (error: any) {
      updateTopicStatus(topicItem.id, {
        status: "failed",
        error: error.message || "Unknown error",
        message: error.message,
      });
      return false;
    }
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

    setIsGenerating(true);
    setIsPaused(false);
    isPausedRef.current = false;

    // Scheduling index continues from already-completed/scheduled topics
    // so that resuming after a pause keeps the cadence correct.
    const alreadyScheduledCount = topics.filter(
      (t) => t.status === "completed"
    ).length;
    let scheduledInRun = 0;
    let successesInRun = 0;
    let failuresInRun = 0;

    for (const topicItem of pendingTopics) {
      // Check if paused using ref (not state) to get current value
      if (isPausedRef.current) {
        break;
      }

      const scheduleIndex = alreadyScheduledCount + scheduledInRun;
      const ok = await generateSingleArticle(topicItem, scheduleIndex);
      if (ok) {
        successesInRun += 1;
        if (config.autoSchedule) scheduledInRun += 1;
      } else {
        failuresInRun += 1;
      }

      // Small delay between generations to avoid rate limits
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, config.delayMs || 0))
      );
    }

    setIsGenerating(false);
    if (!isPausedRef.current) {
      if (config.autoSchedule && scheduledInRun > 0) {
        const firstAt = computeScheduledAt(alreadyScheduledCount);
        const lastAt = computeScheduledAt(
          alreadyScheduledCount + scheduledInRun - 1
        );
        toast.success(
          `Done — ${successesInRun} article${
            successesInRun > 1 ? "s" : ""
          } generated, ${scheduledInRun} scheduled from ${new Date(
            firstAt
          ).toLocaleDateString("fr-FR")} to ${new Date(
            lastAt
          ).toLocaleDateString("fr-FR")}.`,
          { duration: 6000 }
        );
      } else {
        toast.success(
          `Done — ${successesInRun} generated${
            failuresInRun ? `, ${failuresInRun} failed` : ""
          }.`
        );
      }
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
        },
        body: JSON.stringify({
          count: ideasCount,
          aiProvider: config.aiProvider,
          model: config.model,
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

  const pauseGeneration = () => {
    setIsPaused(true);
    isPausedRef.current = true;
    toast("Generation paused", { icon: "⏸️" });
  };

  const resumeGeneration = () => {
    setIsPaused(false);
    isPausedRef.current = false;
    startBulkGeneration();
  };

  const completedCount = topics.filter((t) => t.status === "completed").length;
  const failedCount = topics.filter((t) => t.status === "failed").length;
  const pendingCount = topics.filter((t) => t.status === "pending").length;

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

        {/* Stats */}
        {topics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-4 gap-4 mb-6"
          >
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{topics.length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">Failed</p>
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
                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                    disabled={isGenerating}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  >
                    {config.aiProvider === "openai" && (
                      <>
                        <option value="gpt-4o-mini">GPT-4o Mini</option>
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4.1">GPT-4.1</option>
                      </>
                    )}
                    {config.aiProvider === "anthropic" && (
                      <>
                        <option value="claude-sonnet">Claude Sonnet</option>
                        <option value="claude-opus-4">Claude Opus 4</option>
                      </>
                    )}
                    {config.aiProvider === "gemini" && (
                      <>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
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
                    Images
                  </label>
                  <select
                    value={config.numberOfImages}
                    onChange={(e) =>
                      setConfig({ ...config, numberOfImages: parseInt(e.target.value) })
                    }
                    disabled={isGenerating}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value={0}>None</option>
                    <option value={1}>1 image</option>
                    <option value={2}>2 images</option>
                    <option value={3}>3 images</option>
                  </select>
                </div>

                <div className="col-span-2 md:col-span-4">
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
                      {item.status === "completed" && item.articleId && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() =>
                            router.push(`/generate/calendar?articleId=${item.articleId}`)
                          }
                          className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
                        >
                          Schedule
                        </motion.button>
                      )}
                      {item.status === "failed" && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => resetTopic(item.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <RotateCcw className="w-4 h-4 text-gray-500" />
                        </motion.button>
                      )}
                      {item.status === "pending" && !isGenerating && (
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

        {/* Action Buttons */}
        {topics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-4"
          >
            {!isGenerating ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startBulkGeneration}
                disabled={pendingCount === 0}
                className="flex-1 py-4 bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 hover:shadow-lg transition-all disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed"
              >
                <Rocket className="w-5 h-5" />
                Generate All ({pendingCount} articles)
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={isPaused ? resumeGeneration : pauseGeneration}
                className="flex-1 py-4 bg-yellow-500 text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 hover:bg-yellow-600 transition-colors"
              >
                {isPaused ? (
                  <>
                    <Play className="w-5 h-5" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-5 h-5" />
                    Pause
                  </>
                )}
              </motion.button>
            )}

            {completedCount > 0 && !isGenerating && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push("/generate/articles")}
                className="px-8 py-4 bg-green-600 text-white rounded-2xl font-semibold text-lg hover:bg-green-700 transition-colors"
              >
                View Articles
              </motion.button>
            )}
          </motion.div>
        )}
      </div>

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
