"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Zap,
  Brain,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Globe,
  Rocket,
  Copy,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  Target,
  Save,
  Calendar,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { GenerationProgress, CTA } from "../../types/blog";
import ArticleDisplay from "../../components/ArticleDisplay";
import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import MissingApiKeyModal from "../../components/MissingApiKeyModal";
import CTAModal from "../../components/CTAModal";
import CTAPreview from "../../components/CTAPreview";
import { getUserApiKeys } from "../../lib/services/userKeys";

export default function GeneratePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [publishToWordPress, setPublishToWordPress] = useState(false);
  const [researchDepth, setResearchDepth] = useState<
    "shallow" | "moderate" | "deep"
  >("moderate");
  const [numberOfImages, setNumberOfImages] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [extraContext, setExtraContext] = useState("");
  const [useResearch, setUseResearch] = useState<boolean>(true);
  const [openaiModel, setOpenaiModel] = useState<string>("gpt-4o-mini");
  const [aiProvider, setAiProvider] = useState<
    "openai" | "anthropic" | "gemini" | "deepseek" | "qwen" | "grok"
  >("openai");
  const [model, setModel] = useState<string>("gpt-4o-mini");
  const [geminiModel, setGeminiModel] = useState<string>("gemini-2.5-pro");
  const [anthropicModel, setAnthropicModel] = useState<string>("claude-opus-4");
  const [deepseekModel, setDeepseekModel] = useState<string>("deepseek-r1");
  const [qwenModel, setQwenModel] = useState<string>("qwen-qwq-32b-preview");
  const [grokModel, setGrokModel] = useState<string>("grok-4");
  const [gpt5ReasoningEffort, setGpt5ReasoningEffort] = useState<
    "minimal" | "low" | "medium" | "high"
  >("medium");
  const [gpt5Verbosity, setGpt5Verbosity] = useState<"low" | "medium" | "high">(
    "medium"
  );
  const [result, setResult] = useState<{
    postId?: number;
    editUrl?: string;
    seoScore: number;
    wordCount: number;
    articleContent?: string;
    seoMetadata?: any;
    outline?: any;
    research?: {
      model?: string;
      queries?: string[];
      usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      };
      sample?: { title: string; url: string }[];
    };
    images?: { url: string; alt: string; searchTerm?: string }[];
  } | null>(null);
  const [showResearch, setShowResearch] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isPublishingToWP, setIsPublishingToWP] = useState(false);
  const [showTokenUsage, setShowTokenUsage] = useState(false);
  const [showMissingKeysModal, setShowMissingKeysModal] = useState(false);
  const [isSavingArticle, setIsSavingArticle] = useState(false);
  const [savedArticleId, setSavedArticleId] = useState<string | null>(null);
  const [missingKeys, setMissingKeys] = useState<
    { key: string; label: string; placeholder: string }[]
  >([]);
  const [ctas, setCtas] = useState<CTA[]>([]);
  const [showCTAModal, setShowCTAModal] = useState(false);
  const [editingCTA, setEditingCTA] = useState<CTA | undefined>();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Load params from URL or localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);

      // First, try to get from URL params
      const urlTopic = searchParams.get("topic");
      if (urlTopic) {
        setTopic(urlTopic);
        setPublishToWordPress(
          searchParams.get("publishToWordPress") === "true"
        );
        setResearchDepth(
          (searchParams.get("researchDepth") as any) || "moderate"
        );
        setNumberOfImages(parseInt(searchParams.get("numberOfImages") || "0"));
        setExtraContext(searchParams.get("extraContext") || "");
        setUseResearch(searchParams.get("useResearch") !== "false");
        setAiProvider((searchParams.get("aiProvider") as any) || "openai");
        setModel(searchParams.get("model") || "gpt-4o-mini");

        // Clear URL params after loading
        window.history.replaceState({}, "", "/generate");

        // Auto-trigger generation
        setTimeout(() => {
          const button = document.querySelector(
            'button[type="button"]'
          ) as HTMLButtonElement;
          if (button && button.textContent?.includes("Generate")) {
            button.click();
          }
        }, 500);
        return;
      }

      // If no URL params, check localStorage for pending generation
      const pending = localStorage.getItem("pendingGeneration");
      if (pending) {
        try {
          const data = JSON.parse(pending);
          setTopic(data.topic || "");
          setPublishToWordPress(data.publishToWordPress || false);
          setResearchDepth(data.researchDepth || "moderate");
          setNumberOfImages(data.numberOfImages || 0);
          setExtraContext(data.extraContext || "");
          setUseResearch(data.useResearch !== false);
          setAiProvider(data.aiProvider || "openai");
          setModel(data.model || "gpt-4o-mini");
          setOpenaiModel(data.openaiModel || "gpt-4o-mini");
          setGeminiModel(data.geminiModel || "gemini-2.5-pro");
          setAnthropicModel(data.anthropicModel || "claude-opus-4");
          setDeepseekModel(data.deepseekModel || "deepseek-r1");
          setQwenModel(data.qwenModel || "qwen-qwq-32b-preview");
          setGrokModel(data.grokModel || "grok-4");
          setGpt5ReasoningEffort(data.gpt5ReasoningEffort || "medium");
          setGpt5Verbosity(data.gpt5Verbosity || "medium");
          setCtas(data.ctas || []);

          // Clear localStorage
          localStorage.removeItem("pendingGeneration");

          // Auto-trigger generation after a short delay
          setTimeout(() => {
            const generateBtn = document.querySelector(
              "[data-generate-btn]"
            ) as HTMLButtonElement;
            if (generateBtn) {
              generateBtn.click();
            }
          }, 500);
        } catch (e) {
          console.error("Error loading pending generation:", e);
        }
      }
    }
  }, []);


  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Déconnexion réussie");
      router.push("/");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const handleSaveCTA = (cta: CTA) => {
    if (editingCTA) {
      // Update existing CTA
      setCtas(ctas.map((c) => (c.id === cta.id ? cta : c)));
      toast.success("CTA updated!");
    } else {
      // Add new CTA
      setCtas([...ctas, cta]);
      toast.success("CTA added!");
    }
    setEditingCTA(undefined);
  };

  const handleEditCTA = (cta: CTA) => {
    setEditingCTA(cta);
    setShowCTAModal(true);
  };

  const handleDeleteCTA = (ctaId: string) => {
    setCtas(ctas.filter((c) => c.id !== ctaId));
    toast.success("CTA deleted!");
  };

  const handleAddCTA = () => {
    setEditingCTA(undefined);
    setShowCTAModal(true);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    // Check for required API keys based on selected AI provider
    if (user) {
      const userKeys = await getUserApiKeys(user.uid);
      const missing: { key: string; label: string; placeholder: string }[] = [];

      // Check OpenAI key (always required for now)
      if (!userKeys?.openaiKey && aiProvider === "openai") {
        missing.push({
          key: "openaiKey",
          label: "OpenAI API Key",
          placeholder: "sk-...",
        });
      }

      // Check Anthropic key
      if (!userKeys?.anthropicKey && aiProvider === "anthropic") {
        missing.push({
          key: "anthropicKey",
          label: "Anthropic API Key",
          placeholder: "sk-ant-...",
        });
      }

      // Check Gemini key
      if (!userKeys?.geminiKey && aiProvider === "gemini") {
        missing.push({
          key: "geminiKey",
          label: "Google Gemini API Key",
          placeholder: "AI...",
        });
      }

      // Check DeepSeek key
      if (!userKeys?.deepseekKey && aiProvider === "deepseek") {
        missing.push({
          key: "deepseekKey",
          label: "DeepSeek API Key",
          placeholder: "sk-...",
        });
      }

      // Check Qwen key
      if (!userKeys?.qwenKey && aiProvider === "qwen") {
        missing.push({
          key: "qwenKey",
          label: "Alibaba Qwen API Key",
          placeholder: "sk-...",
        });
      }

      // Check Grok key
      if (!userKeys?.grokKey && aiProvider === "grok") {
        missing.push({
          key: "grokKey",
          label: "xAI Grok API Key",
          placeholder: "xai-...",
        });
      }

      // Check Perplexity key (required if research is enabled)
      if (!userKeys?.perplexityKey && useResearch) {
        missing.push({
          key: "perplexityKey",
          label: "Perplexity API Key (for research)",
          placeholder: "pplx-...",
        });
      }

      // Check Unsplash key (required if images are requested)
      if (!userKeys?.unsplashKey && numberOfImages > 0) {
        missing.push({
          key: "unsplashKey",
          label: "Unsplash Access Key (for images)",
          placeholder: "Your Unsplash Access Key",
        });
      }

      // If there are missing keys, show the modal
      if (missing.length > 0) {
        setMissingKeys(missing);
        setShowMissingKeysModal(true);
        return;
      }
    }

    setIsGenerating(true);
    setResult(null);
    setSavedArticleId(null);
    setProgress({
      step: "research",
      message: "Starting generation...",
      progress: 0,
    });

    try {
      // Get Firebase ID token for authentication
      const idToken = await user?.getIdToken();
      if (!idToken) {
        toast.error("Authentication failed. Please log in again.");
        setIsGenerating(false);
        return;
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          topic,
          publishToWordPress,
          researchDepth,
          extraContext,
          numberOfImages,
          aiProvider,
          model:
            model ||
            openaiModel ||
            geminiModel ||
            anthropicModel ||
            deepseekModel ||
            qwenModel ||
            grokModel ||
            undefined,
          openaiModel: openaiModel || undefined,
          gpt5ReasoningEffort: gpt5ReasoningEffort || undefined,
          gpt5Verbosity: gpt5Verbosity || undefined,
          useResearch,
          ctas: ctas.map(
            ({
            id,
            title,
            description,
            buttonText,
            buttonUrl,
            imageUrl,
            positionType,
            sectionNumber,
            style,
            customColors,
            }) => ({
              id,
              title,
              description,
              buttonText,
              buttonUrl,
              imageUrl,
              positionType,
              sectionNumber,
              style,
              customColors,
            })
          ),
        }),
      });

      if (!response.ok) {
        try {
          const data = await response.json();
          const message = data?.error || "Error during generation";
          const hint = data?.hint ? ` — ${data.hint}` : "";
          throw new Error(`${message}${hint}`);
        } catch {
          throw new Error("Error during generation");
        }
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Stream not available");
      }

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value, { stream: true });
        buffer += chunk;

        // Process complete messages separated by double newlines
        const parts = buffer.split("\n\n");
        // Keep the last part in the buffer as it might be incomplete
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (part.trim().startsWith("data: ")) {
            try {
              // Remove "data: " prefix and parse
              const jsonStr = part.trim().substring(6);
              const data = JSON.parse(jsonStr);

              if (data.type === "progress") {
                setProgress(data.payload);
              } else if (data.type === "complete") {
                setResult(data.payload);
                toast.success("Article generated successfully!");
              } else if (data.type === "error") {
                const errorMessage =
                  data.payload.message || "An error occurred";
                const errorHint = data.payload.hint || "";
                throw new Error(
                  errorHint ? `${errorMessage} — ${errorHint}` : errorMessage
                );
              }
            } catch (parseError) {
              console.warn("Parsing error for chunk:", parseError);
              // Don't crash on parse error, just log it. 
              // The buffer logic handles splits, but malformed JSON from source could still trigger this.
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Unknown error");
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              error: error instanceof Error ? error.message : "Unknown error",
            }
          : null
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishToWordPress = async () => {
    if (!result || !result.articleContent) {
      toast.error("No article to publish");
      return;
    }

    setIsPublishingToWP(true);

    try {
      const idToken = await user?.getIdToken();
      if (!idToken) {
        toast.error("Authentication failed. Please log in again.");
        setIsPublishingToWP(false);
        return;
      }

      const response = await fetch("/api/wordpress/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: result.seoMetadata?.metaTitle || topic,
          content: result.articleContent,
          excerpt: result.seoMetadata?.metaDescription || "",
          slug: result.seoMetadata?.slug || "",
          tags: result.seoMetadata?.keywords || [],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to publish to WordPress");
      }

      const data = await response.json();
      setResult((prev) =>
        prev ? { ...prev, postId: data.postId, editUrl: data.editUrl } : prev
      );
      toast.success("Published to WordPress successfully!");
    } catch (error) {
      console.error("Error publishing to WordPress:", error);
      toast.error(error instanceof Error ? error.message : "Failed to publish");
    } finally {
      setIsPublishingToWP(false);
    }
  };

  const handleSaveArticle = async () => {
    if (!result || !result.articleContent) {
      toast.error("No article to save");
      return;
    }

    setIsSavingArticle(true);

    try {
      const idToken = await user?.getIdToken();
      if (!idToken) {
        toast.error("Authentication failed. Please log in again.");
        return;
      }

      const response = await fetch("/api/articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: result.seoMetadata?.metaTitle || topic,
          content: result.articleContent,
          seoMetadata: result.seoMetadata,
          outline: result.outline,
          images: result.images,
          wordCount: result.wordCount,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save article");
      }

      const data = await response.json();
      setSavedArticleId(data.article.id);
      toast.success("Article saved to your library!");
    } catch (error) {
      console.error("Error saving article:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save article");
    } finally {
      setIsSavingArticle(false);
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case "research":
        return Brain;
      case "outline":
        return Zap;
      case "writing":
        return Sparkles;
      case "seo":
        return Globe;
      case "wordpress":
      case "completed":
        return CheckCircle2;
      default:
        return Sparkles;
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 -left-32 w-96 h-96 bg-gray-200/40 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-32 w-96 h-96 bg-gray-300/30 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-4xl">
          {/* Main Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="backdrop-blur-xl bg-white/80 border border-gray-200 rounded-3xl p-8 shadow-2xl"
          >
            {/* Topic Input */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What do you want to write about?
              </label>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., The Future of AI in Healthcare"
                className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:border-gray-400 text-gray-900 placeholder-gray-400 transition-all"
                disabled={isGenerating}
              />
            </div>

            {/* AI Provider & Model */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  AI Provider
                </label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as any)}
                  disabled={isGenerating}
                  className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-gray-900 appearance-none cursor-pointer transition-all"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="qwen">Alibaba Qwen</option>
                  <option value="grok">xAI Grok</option>
                </select>
              </div>

              {aiProvider === "openai" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Model
                  </label>
                  <select
                    value={openaiModel}
                    onChange={(e) => {
                      setOpenaiModel(e.target.value);
                      setModel(e.target.value);
                    }}
                    disabled={isGenerating}
                    className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-gray-900 appearance-none cursor-pointer transition-all"
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4.1">GPT-4.1</option>
                    <option value="gpt-5">GPT-5</option>
                    <option value="gpt-5-mini">GPT-5 Mini</option>
                    <option value="gpt-5-nano">GPT-5 Nano</option>
                  </select>
                </motion.div>
              )}

              {aiProvider === "gemini" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Model
                  </label>
                  <select
                    value={geminiModel}
                    onChange={(e) => {
                      setGeminiModel(e.target.value);
                      setModel(e.target.value);
                    }}
                    disabled={isGenerating}
                    className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-gray-900 appearance-none cursor-pointer transition-all"
                  >
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  </select>
                </motion.div>
              )}

              {aiProvider === "anthropic" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Model
                  </label>
                  <select
                    value={anthropicModel}
                    onChange={(e) => {
                      setAnthropicModel(e.target.value);
                      setModel(e.target.value);
                    }}
                    disabled={isGenerating}
                    className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-gray-900 appearance-none cursor-pointer transition-all"
                  >
                    <option value="claude-opus-4">Claude Opus 4</option>
                    <option value="claude-sonnet">Claude Sonnet</option>
                    <option value="claude-sonnet-4.5">Claude Sonnet 4.5</option>
                  </select>
                </motion.div>
              )}

              {aiProvider === "deepseek" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Model
                  </label>
                  <select
                    value={deepseekModel}
                    onChange={(e) => {
                      setDeepseekModel(e.target.value);
                      setModel(e.target.value);
                    }}
                    disabled={isGenerating}
                    className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-gray-900 appearance-none cursor-pointer transition-all"
                  >
                    <option value="deepseek-r1">DeepSeek R1</option>
                  </select>
                </motion.div>
              )}

              {aiProvider === "qwen" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Model
                  </label>
                  <select
                    value={qwenModel}
                    onChange={(e) => {
                      setQwenModel(e.target.value);
                      setModel(e.target.value);
                    }}
                    disabled={isGenerating}
                    className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-gray-900 appearance-none cursor-pointer transition-all"
                  >
                    <option value="qwen-qwq-32b-preview">Qwen QwQ 32B</option>
                  </select>
                </motion.div>
              )}

              {aiProvider === "grok" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Model
                  </label>
                  <select
                    value={grokModel}
                    onChange={(e) => {
                      setGrokModel(e.target.value);
                      setModel(e.target.value);
                    }}
                    disabled={isGenerating}
                    className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-gray-900 appearance-none cursor-pointer transition-all"
                  >
                    <option value="grok-4">Grok 4</option>
                  </select>
                </motion.div>
              )}
            </div>

            {/* GPT-5 Options */}
            <AnimatePresence>
              {(openaiModel || "").startsWith("gpt-5") && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Reasoning Effort
                    </label>
                    <select
                      value={gpt5ReasoningEffort}
                      onChange={(e) =>
                        setGpt5ReasoningEffort(e.target.value as any)
                      }
                      disabled={isGenerating}
                      className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-gray-900 appearance-none cursor-pointer transition-all"
                    >
                      <option value="minimal">Minimal</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Verbosity
                    </label>
                    <select
                      value={gpt5Verbosity}
                      onChange={(e) => setGpt5Verbosity(e.target.value as any)}
                      disabled={isGenerating}
                      className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-gray-900 appearance-none cursor-pointer transition-all"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Options */}
            <div className="space-y-4 mb-8">
              <motion.label
                whileHover={{ x: 2 }}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={useResearch}
                    onChange={(e) => setUseResearch(e.target.checked)}
                    disabled={isGenerating}
                    className="sr-only"
                  />
                  <div
                    className={`w-12 h-6 rounded-full transition-colors flex items-center ${
                      useResearch ? "bg-gray-900" : "bg-gray-200"
                    }`}
                  >
                    <motion.div
                      className="w-5 h-5 bg-white rounded-full shadow-lg ml-0.5"
                      animate={{ x: useResearch ? 24 : 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                  Web Research (Perplexity){" "}
                  <span className="text-gray-500">recommended</span>
                </span>
              </motion.label>

              <AnimatePresence>
                {useResearch && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-16"
                  >
                    <div className="flex gap-2">
                      {["shallow", "moderate", "deep"].map((depth) => (
                        <motion.button
                          key={depth}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() =>
                            setResearchDepth(
                              depth as "shallow" | "moderate" | "deep"
                            )
                          }
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            researchDepth === depth
                              ? "bg-gray-900 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {depth.charAt(0).toUpperCase() + depth.slice(1)}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.label
                whileHover={{ x: 2 }}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={publishToWordPress}
                    onChange={(e) => setPublishToWordPress(e.target.checked)}
                    disabled={isGenerating}
                    className="sr-only"
                  />
                  <div
                    className={`w-12 h-6 rounded-full transition-colors flex items-center ${
                      publishToWordPress ? "bg-gray-900" : "bg-gray-200"
                    }`}
                  >
                    <motion.div
                      className="w-5 h-5 bg-white rounded-full shadow-lg ml-0.5"
                      animate={{ x: publishToWordPress ? 24 : 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                  Publish to WordPress automatically
                </span>
              </motion.label>
            </div>

            {/* Images Selection */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Add Images (Unsplash): {numberOfImages}
              </label>
              <input
                type="range"
                min={0}
                max={5}
                step={1}
                value={numberOfImages}
                onChange={(e) => setNumberOfImages(parseInt(e.target.value))}
                disabled={isGenerating}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-900"
              />
            </div>

            {/* CTAs Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-gray-700" />
                  <label className="text-sm font-medium text-gray-700">
                    Call-to-Actions (promote your product)
                  </label>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddCTA}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-200 disabled:text-gray-400"
                >
                  <Plus className="w-4 h-4" />
                  Add CTA
                </motion.button>
              </div>

              {/* CTAs List */}
              {ctas.length > 0 && (
                <div className="space-y-3">
                  {ctas.map((cta) => (
                    <motion.div
                      key={cta.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-gray-50 border border-gray-200 rounded-xl p-4"
                    >
                      <div className="flex items-start gap-4">
                        {cta.imageUrl && (
                          <img
                            src={cta.imageUrl}
                            alt={cta.title || "CTA"}
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {cta.title || "Untitled CTA"}
                          </h4>
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {cta.description || "No description"}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-500">
                              {cta.positionType === "after-intro" &&
                                "After Introduction"}
                              {cta.positionType === "after-section" &&
                                `After Section ${cta.sectionNumber || 1}`}
                              {cta.positionType === "middle" &&
                                "Middle of Article"}
                              {cta.positionType === "before-conclusion" &&
                                "Before Conclusion"}
                              {cta.positionType === "end" && "End of Article"}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500 capitalize">
                              {cta.style} style
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleEditCTA(cta)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteCTA(cta.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Advanced Options Toggle */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4"
            >
              <motion.div
                animate={{ rotate: showAdvanced ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
              Advanced Options
            </motion.button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 mb-8"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Additional Context
                    </label>
                    <textarea
                      value={extraContext}
                      onChange={(e) => setExtraContext(e.target.value)}
                      placeholder="Add instructions, tone, constraints, examples..."
                      rows={4}
                      className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-gray-900 placeholder-gray-400 transition-all resize-none"
                      disabled={isGenerating}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Generate Button */}
            <motion.button
              data-generate-btn
              whileHover={{ scale: isGenerating ? 1 : 1.02 }}
              whileTap={{ scale: isGenerating ? 1 : 0.98 }}
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              className={`w-full py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition-all ${
                isGenerating || !topic.trim()
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-gray-900 to-gray-700 text-white shadow-lg shadow-gray-900/25 hover:shadow-xl hover:shadow-gray-900/40"
              }`}
            >
              {isGenerating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-5 h-5 border-2 border-gray-300 border-t-white rounded-full"
                  />
                  Generating...
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  Generate Article
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Progress Display */}
          <AnimatePresence>
            {progress && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="backdrop-blur-xl bg-white/80 border border-gray-200 rounded-3xl p-8 shadow-2xl mb-8 mt-6"
              >
                <div className="flex items-center gap-4 mb-6">
                  <motion.div
                    animate={{ rotate: progress.error ? 0 : 360 }}
                    transition={{
                      duration: 2,
                      repeat: progress.error ? 0 : Infinity,
                      ease: "linear",
                    }}
                  >
                    {progress.error ? (
                      <AlertCircle className="w-8 h-8 text-red-500" />
                    ) : (
                      React.createElement(getStepIcon(progress.step), {
                        className: "w-8 h-8 text-gray-700",
                      })
                    )}
                  </motion.div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {progress.error
                        ? "Error"
                        : progress.step.charAt(0).toUpperCase() +
                          progress.step.slice(1)}
                    </h3>
                    <p className="text-sm text-gray-600">{progress.message}</p>
                  </div>
                </div>

                {progress.error && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 space-y-2">
                    <p className="text-red-800 font-semibold text-sm">
                      {progress.error.split(" — ")[0]}
                    </p>
                    {progress.error.includes(" — ") && (
                      <p className="text-red-700 text-sm">
                        {progress.error.split(" — ").slice(1).join(" — ")}
                      </p>
                    )}
                  </div>
                )}

                {!progress.error && (
                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-gray-900 to-gray-700"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Display */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="backdrop-blur-xl bg-white/80 border border-gray-200 rounded-3xl p-8 shadow-2xl mt-6"
              >
                <div className="flex items-center gap-3 mb-8">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <h3 className="text-2xl font-semibold text-gray-900">
                    Article Generated Successfully!
                  </h3>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="bg-gray-100 border border-gray-200 rounded-2xl p-6"
                  >
                    <p className="text-sm text-gray-600 mb-2">Words</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {result.wordCount}
                    </p>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="bg-gray-100 border border-gray-200 rounded-2xl p-6"
                  >
                    <p className="text-sm text-gray-600 mb-2">SEO Score</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {result.seoScore}/100
                    </p>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="bg-gray-100 border border-gray-200 rounded-2xl p-6"
                  >
                    <p className="text-sm text-gray-600 mb-2">Status</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {result.postId ? `#${result.postId}` : "Ready"}
                    </p>
                  </motion.div>
                </div>

                {/* Token Usage Details (collapsible) */}
                {((result as any).tokenUsage || result.research?.usage) && (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl mb-8 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowTokenUsage(!showTokenUsage)}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-lg font-semibold text-gray-900">
                        Token Usage
                      </span>
                      <motion.div
                        animate={{ rotate: showTokenUsage ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5 text-gray-700" />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {showTokenUsage && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="px-6 pt-3 pb-6"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(result as any).tokenUsage && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-3">
                                  AI Generation
                                </p>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Input:
                                    </span>
                                    <span className="font-medium text-gray-900">
                                      {(
                                        (result as any).tokenUsage.input || 0
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Output:
                                    </span>
                                    <span className="font-medium text-gray-900">
                                      {(
                                        (result as any).tokenUsage.output || 0
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between pt-2 border-t border-gray-300">
                                    <span className="text-gray-700 font-medium">
                                      Total:
                                    </span>
                                    <span className="font-bold text-gray-900">
                                      {(
                                        ((result as any).tokenUsage.input ||
                                          0) +
                                        ((result as any).tokenUsage.output || 0)
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                            {result.research?.usage && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-3">
                                  Perplexity Research
                                </p>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Input:
                                    </span>
                                    <span className="font-medium text-gray-900">
                                      {(
                                        result.research.usage.promptTokens || 0
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Output:
                                    </span>
                                    <span className="font-medium text-gray-900">
                                      {(
                                        result.research.usage
                                          .completionTokens || 0
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between pt-2 border-t border-gray-300">
                                    <span className="text-gray-700 font-medium">
                                      Total:
                                    </span>
                                    <span className="font-bold text-gray-900">
                                      {(
                                        result.research.usage.totalTokens || 0
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mb-6 flex flex-wrap gap-3">
                  {/* WordPress Edit Link */}
                  {result.postId && result.editUrl && (
                    <motion.a
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      href={result.editUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in WordPress
                    </motion.a>
                  )}

                  {/* Save Article Button */}
                  {result.articleContent && !savedArticleId && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSaveArticle}
                      disabled={isSavingArticle}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingArticle ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save to Library
                        </>
                      )}
                    </motion.button>
                  )}

                  {/* Saved + Schedule Button */}
                  {savedArticleId && (
                    <>
                      <span className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Saved
                      </span>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => router.push(`/generate/calendar?articleId=${savedArticleId}`)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
                      >
                        <Calendar className="w-4 h-4" />
                        Schedule Publication
                      </motion.button>
                    </>
                  )}
                </div>

                {/* Article Display */}
                {result.articleContent && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <ArticleDisplay
                      content={result.articleContent}
                      seoMetadata={result.seoMetadata}
                      topic={topic}
                      onPublishToWordPress={
                        !result.postId ? handlePublishToWordPress : undefined
                      }
                      isPublishing={isPublishingToWP}
                    />
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Missing API Keys Modal */}
      <MissingApiKeyModal
        isOpen={showMissingKeysModal}
        onClose={() => setShowMissingKeysModal(false)}
        missingKeys={missingKeys}
        userId={user?.uid || ""}
        onSaved={() => {
          // Retry generation after saving keys
          handleGenerate();
        }}
      />

      {/* CTA Modal */}
      <CTAModal
        isOpen={showCTAModal}
        onClose={() => {
          setShowCTAModal(false);
          setEditingCTA(undefined);
        }}
        onSave={handleSaveCTA}
        existingCTA={editingCTA}
        maxPosition={result?.outline?.sections?.length || 6}
        userId={user?.uid || ""}
      />
    </div>
  );
}
