"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Zap,
  Brain,
  CheckCircle2,
  ChevronDown,
  Globe,
  Rocket,
  ArrowRight,
  TrendingUp,
  Shield,
  LogOut,
  Search,
  FileText,
  BarChart3,
  Clock,
  Cpu,
  Newspaper,
  Plus,
  Edit2,
  Trash2,
  Target,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthModal from "../components/AuthModal";
import CTAModal from "../components/CTAModal";
import ArticleDisplay from "../components/ArticleDisplay";
import { CTA } from "../types/blog";
import { toast } from "react-hot-toast";
import demoArticle from "../lib/demo-article.json";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDemoArticle, setShowDemoArticle] = useState(true);
  const [topic, setTopic] = useState(
    "The Future of AI-Powered Content Creation: Trends and Opportunities for 2025"
  );
  const [publishToWordPress, setPublishToWordPress] = useState(false);
  const [researchDepth, setResearchDepth] = useState<
    "shallow" | "moderate" | "deep"
  >("moderate");
  const [numberOfImages, setNumberOfImages] = useState(5);
  const [extraContext, setExtraContext] = useState("");
  const [useResearch, setUseResearch] = useState<boolean>(true);
  const [aiProvider, setAiProvider] = useState<
    "openai" | "anthropic" | "gemini" | "deepseek" | "qwen" | "grok"
  >("openai");
  const [model, setModel] = useState<string>("gpt-4o-mini");
  const [openaiModel, setOpenaiModel] = useState<string>("gpt-4o-mini");
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ctas, setCtas] = useState<CTA[]>([
    {
      id: "demo-cta-1",
      title: "Ready to Transform Your Content Strategy?",
      description:
        "Join thousands of marketers using AI to create high-performing content that ranks and converts.",
      buttonText: "Start Free Trial",
      buttonUrl: "https://example.com/signup",
      imageUrl:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=300&fit=crop",
      positionType: "middle",
      style: "gradient",
    },
  ]);
  const [showCTAModal, setShowCTAModal] = useState(false);
  const [editingCTA, setEditingCTA] = useState<CTA | undefined>();

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

  const handleGenerate = () => {
    if (!topic.trim()) {
      toast.error("Veuillez entrer un sujet");
      return;
    }

    if (!user) {
      // Save config to localStorage before auth
      localStorage.setItem(
        "pendingGeneration",
        JSON.stringify({
          topic,
          publishToWordPress,
          researchDepth,
          numberOfImages,
          extraContext,
          useResearch,
          aiProvider,
          model,
          openaiModel,
          geminiModel,
          anthropicModel,
          deepseekModel,
          qwenModel,
          grokModel,
          gpt5ReasoningEffort,
          gpt5Verbosity,
          ctas,
        })
      );
      setShowAuthModal(true);
    } else {
      // User is logged in, go to generate page with params
      const params = new URLSearchParams({
        topic,
        publishToWordPress: publishToWordPress.toString(),
        researchDepth,
        numberOfImages: numberOfImages.toString(),
        extraContext,
        useResearch: useResearch.toString(),
        aiProvider,
        model,
      });
      router.push(`/generate?${params.toString()}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Déconnexion réussie");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Redirect will happen automatically in the auth modal
    const params = new URLSearchParams({
      topic,
      publishToWordPress: publishToWordPress.toString(),
      researchDepth,
      numberOfImages: numberOfImages.toString(),
      extraContext,
      useResearch: useResearch.toString(),
      aiProvider,
      model,
    });
    router.push(`/generate?${params.toString()}`);
  };

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

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <Sparkles className="w-8 h-8 text-gray-900" />
            <span className="text-2xl font-bold text-gray-900">BlogGen AI</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            {loading ? (
              <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
            ) : user ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push("/generate")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-lg"
                >
                  <Rocket className="w-4 h-4" />
                  <span>Dashboard</span>
                </motion.button>
                <span className="text-sm text-gray-600 hidden md:block">
                  {user.email}
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 border-2 border-gray-200 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </motion.button>
              </>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-2.5 bg-white text-gray-900 border-2 border-gray-200 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                Sign In
              </motion.button>
            )}
          </motion.div>
        </nav>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
            >
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 border border-green-200 rounded-full mb-6"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 font-semibold">
                  100% Free Forever • Use Your Own API Keys
                </span>
              </motion.div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-black via-gray-700 to-gray-500 bg-clip-text text-transparent leading-tight">
                SEO Blog Articles
                <br />
                <span className="text-4xl md:text-5xl lg:text-6xl">
                  That Cost You Nothing
                </span>
              </h1>

              <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                Generate unlimited SEO-optimized articles that actually rank on
                Google with your own API keys.
                <span className="font-semibold text-gray-900">
                  {" "}
                  No subscriptions. No hidden fees. Just $0.01-$0.05 per
                  article.
                </span>
              </p>

              {/* Hero CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                {user ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push("/generate")}
                    className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg flex items-center gap-3 shadow-xl hover:shadow-2xl transition-all"
                  >
                    <Rocket className="w-5 h-5" />
                    Go to Dashboard
                  </motion.button>
                ) : (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowAuthModal(true)}
                      className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg flex items-center gap-3 shadow-xl hover:shadow-2xl transition-all"
                    >
                      <Rocket className="w-5 h-5" />
                      Start Generating Free
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        const element =
                          document.getElementById("generator-form");
                        element?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="px-8 py-4 bg-white text-gray-900 border-2 border-gray-200 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all"
                    >
                      Try Demo
                    </motion.button>
                  </>
                )}
              </motion.div>
            </motion.div>

            {/* Interactive Demo Section */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative mb-8"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
                {/* Animated Dashboard Preview */}
                <div className="aspect-video bg-gradient-to-br from-gray-50 via-white to-gray-50 p-8">
                  <div className="max-w-4xl mx-auto h-full">
                    {/* Mock Browser Bar */}
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center gap-2 mb-6"
                    >
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-lg px-4 py-1.5 text-xs text-gray-500">
                        bloggen.ai/generate
                      </div>
                    </motion.div>

                    {/* Animated Content */}
                    <div className="space-y-4">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 }}
                        className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Brain className="w-5 h-5 text-purple-600" />
                          <div className="flex-1">
                            <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ delay: 1, duration: 1.5 }}
                                className="h-full bg-purple-600"
                              />
                            </div>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-2 bg-gray-200 rounded w-full" />
                          <div className="h-2 bg-gray-200 rounded w-4/5" />
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.5 }}
                        className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <div className="flex-1">
                            <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ delay: 2, duration: 1.5 }}
                                className="h-full bg-blue-600"
                              />
                            </div>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-2 bg-gray-200 rounded w-full" />
                          <div className="h-2 bg-gray-200 rounded w-3/4" />
                          <div className="h-2 bg-gray-200 rounded w-5/6" />
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 3 }}
                        className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                          <div>
                            <p className="font-semibold text-gray-900">
                              Article Generated
                            </p>
                            <p className="text-sm text-gray-600">
                              SEO optimized and ready to publish
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>

                {/* Floating Stats - Simplified */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-4"
                >
                  {[
                    { icon: Zap, value: "2min", label: "Generation" },
                    { icon: CheckCircle2, value: "98%", label: "SEO Score" },
                    { icon: Brain, value: "GPT-5", label: "AI Powered" },
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.4 + i * 0.1 }}
                      className="bg-white/95 backdrop-blur-xl rounded-2xl p-3 shadow-xl border border-gray-200 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                        <stat.icon className="w-5 h-5 text-gray-700" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">
                          {stat.value}
                        </p>
                        <p className="text-xs text-gray-600">{stat.label}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </motion.div>

            {/* Value Proposition Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="max-w-4xl mx-auto my-12"
            >
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 p-6 md:p-8 shadow-xl">
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-white text-center md:text-left flex-1">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          delay: 0.9,
                          type: "spring",
                          stiffness: 200,
                        }}
                        className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold mb-3"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>100% FREE FOREVER</span>
                      </motion.div>

                      <h2 className="text-2xl md:text-3xl font-bold mb-2">
                        Use Your Own API Keys
                      </h2>
                      <p className="text-green-50 text-sm md:text-base">
                        Generate unlimited articles with zero platform fees. Pay
                        only $0.01-$0.05 per article directly to AI providers.
                      </p>
                    </div>

                    <div className="flex gap-3 flex-shrink-0">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1 }}
                        className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center min-w-[80px]"
                      >
                        <CheckCircle2 className="w-5 h-5 text-white mx-auto mb-1" />
                        <p className="text-xs text-white font-semibold">Free</p>
                        <p className="text-[10px] text-green-100">Forever</p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1.1 }}
                        className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center min-w-[80px]"
                      >
                        <Zap className="w-5 h-5 text-white mx-auto mb-1" />
                        <p className="text-xs text-white font-semibold">
                          Your Keys
                        </p>
                        <p className="text-[10px] text-green-100">
                          Full Control
                        </p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1.2 }}
                        className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center min-w-[80px]"
                      >
                        <Rocket className="w-5 h-5 text-white mx-auto mb-1" />
                        <p className="text-xs text-white font-semibold">
                          Unlimited
                        </p>
                        <p className="text-[10px] text-green-100">No Limits</p>
                      </motion.div>
                    </div>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl" />
              </div>
            </motion.div>

            {/* Transition Element */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center justify-center my-16"
            >
              <div className="flex items-center gap-4">
                <div className="h-px w-16 bg-gradient-to-r from-transparent to-gray-300" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-900 to-gray-600 flex items-center justify-center"
                >
                  <Sparkles className="w-6 h-6 text-white" />
                </motion.div>
                <div className="h-px w-16 bg-gradient-to-l from-transparent to-gray-300" />
              </div>
            </motion.div>

            {/* Generator Form */}
            <motion.div
              id="generator-form"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="relative"
            >
              <div className="relative bg-white border border-gray-200 rounded-3xl p-6 md:p-10 shadow-xl mb-12 max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8, type: "spring" }}
                    className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl mb-4 shadow-lg"
                  >
                    <Rocket className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    Generate Your Article
                  </h3>
                  <p className="text-gray-600">
                    Configure your article settings and let AI do the work
                  </p>
                </div>
              {/* Topic Input */}
              <div className="mb-6">
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
                />
              </div>

              {/* AI Provider & Model */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    AI Provider
                  </label>
                  <select
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value as any)}
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
                      className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-gray-900 appearance-none cursor-pointer transition-all"
                    >
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                        <option value="gemini-2.5-flash">
                          Gemini 2.5 Flash
                        </option>
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
                      className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-gray-900 appearance-none cursor-pointer transition-all"
                    >
                      <option value="claude-opus-4">Claude Opus 4</option>
                      <option value="claude-sonnet">Claude Sonnet</option>
                      <option value="claude-sonnet-4.5">
                        Claude Sonnet 4.5
                      </option>
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
                      className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-gray-900 appearance-none cursor-pointer transition-all"
                    >
                        <option value="qwen-qwq-32b-preview">
                          Qwen QwQ 32B
                        </option>
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
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6"
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
                        onChange={(e) =>
                          setGpt5Verbosity(e.target.value as any)
                        }
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
              <div className="space-y-4 mb-6">
                <motion.label
                  whileHover={{ x: 2 }}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={useResearch}
                      onChange={(e) => setUseResearch(e.target.checked)}
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
                        onChange={(e) =>
                          setPublishToWordPress(e.target.checked)
                        }
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
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Add Images (Unsplash): {numberOfImages}
                </label>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={1}
                  value={numberOfImages}
                    onChange={(e) =>
                      setNumberOfImages(parseInt(e.target.value))
                    }
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-900"
                />
              </div>

                {/* CTAs Section */}
                <div className="mb-6">
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
                      className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
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
                                  {cta.positionType === "end" &&
                                    "End of Article"}
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
                    className="space-y-6 mb-6"
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
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Generate Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerate}
                disabled={!topic.trim()}
                className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all relative overflow-hidden ${
                  !topic.trim()
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-2xl shadow-gray-900/30 hover:shadow-gray-900/50"
                }`}
              >
                {!topic.trim() ? null : (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                  />
                )}
                <Rocket className="w-6 h-6 relative z-10" />
                <span className="relative z-10">
                  {user ? "Generate Article" : "Start Generating (Free)"}
                </span>
              </motion.button>

              {!user && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-center text-sm text-gray-500 mt-4"
                >
                  No credit card required - Free to start
                </motion.p>
              )}
              </div>
            </motion.div>

            {/* Demo Article Display */}
            {showDemoArticle && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.9 }}
              className="max-w-5xl mx-auto mb-20"
            >
                <div className="backdrop-blur-xl bg-white/80 border border-gray-200 rounded-3xl p-8 shadow-2xl">
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      ✨ Demo Article Generated
                </h3>
                    <p className="text-gray-600">
                      See what our AI can create in just minutes
                </p>
              </div>

                  <ArticleDisplay
                    content={demoArticle.articleContent}
                    seoMetadata={demoArticle.seoMetadata}
                    topic={topic}
                  />
                </div>
              </motion.div>
            )}

            {/* How It Works - Pipeline Visualization */}
                  <motion.div
              initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="max-w-6xl mx-auto mb-20"
                  >
              <div className="text-center mb-12">
                <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                  From Topic to Traffic in Minutes
                </h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Our AI-powered pipeline generates articles that rank and
                  convert
                </p>
                    </div>

              {/* Pipeline Flow */}
              <div className="relative">
                <div className="relative bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-lg">
                  {/* Steps Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  {/* Step 1: Research */}
                  <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1, type: "spring" }}
                      viewport={{ once: true }}
                      whileHover={{ y: -5, scale: 1.02 }}
                      className="relative group"
                    >
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col items-center text-center">
                          <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 400 }}
                            className="mb-4"
                          >
                            <img
                              src="/images/Perplexity Color.svg"
                              alt="Perplexity"
                              className="h-12 w-12"
                            />
                          </motion.div>
                          <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-xs mb-2">
                        1
                      </div>
                          <h4 className="text-gray-900 font-bold text-sm mb-1">
                            Research
                          </h4>
                          <p className="text-gray-600 text-xs">
                            Real-time web data
                          </p>
                    </div>
                    </div>
                      {/* Arrow */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        viewport={{ once: true }}
                        className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10"
                      >
                        <div className="text-gray-400 text-2xl">→</div>
                      </motion.div>
                  </motion.div>

                  {/* Step 2: Outline */}
                  <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      viewport={{ once: true }}
                      whileHover={{ y: -5, scale: 1.02 }}
                      className="relative group"
                    >
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col items-center text-center">
                          <motion.div
                            whileHover={{ scale: 1.1, rotate: -5 }}
                            transition={{ type: "spring", stiffness: 400 }}
                            className="mb-4"
                          >
                            <svg
                              className="w-12 h-12 text-gray-700"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </motion.div>
                          <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-xs mb-2">
                        2
                      </div>
                          <h4 className="text-gray-900 font-bold text-sm mb-1">
                            Outline
                          </h4>
                          <p className="text-gray-600 text-xs">
                            Strategic structure
                          </p>
                    </div>
                    </div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        viewport={{ once: true }}
                        className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10"
                      >
                        <div className="text-gray-400 text-2xl">→</div>
                      </motion.div>
                  </motion.div>

                  {/* Step 3: Writing */}
                  <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                      viewport={{ once: true }}
                      whileHover={{ y: -5, scale: 1.02 }}
                      className="relative group"
                    >
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col items-center text-center">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 400 }}
                            className="mb-4 h-12 flex items-center justify-center gap-2"
                          >
                            <img
                              src="/images/OpenAI 2.svg"
                              alt="OpenAI"
                              className="h-8 w-8"
                            />
                            <img
                              src="/images/Anthropic 1.svg"
                              alt="Anthropic"
                              className="h-8 w-8"
                            />
                            <img
                              src="/images/Logo Gemini.svg"
                              alt="Gemini"
                              className="h-8 w-8"
                            />
                          </motion.div>
                          <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-xs mb-2">
                        3
                      </div>
                          <h4 className="text-gray-900 font-bold text-sm mb-1">
                            Writing
                          </h4>
                          <p className="text-gray-600 text-xs">
                            AI-powered content
                          </p>
                    </div>
                    </div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        viewport={{ once: true }}
                        className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10"
                      >
                        <div className="text-gray-400 text-2xl">→</div>
                      </motion.div>
                  </motion.div>

                    {/* Step 4: SEO */}
                  <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, type: "spring" }}
                      viewport={{ once: true }}
                      whileHover={{ y: -5, scale: 1.02 }}
                      className="relative group"
                    >
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col items-center text-center">
                  <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 400 }}
                            className="mb-4"
                  >
                            <img
                              src="/images/Google.svg"
                              alt="Google"
                              className="h-12 w-12"
                            />
                          </motion.div>
                          <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-xs mb-2">
                        4
                      </div>
                          <h4 className="text-gray-900 font-bold text-sm mb-1">
                            SEO
                          </h4>
                          <p className="text-gray-600 text-xs">
                            Optimized to rank
                          </p>
                    </div>
                    </div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        viewport={{ once: true }}
                        className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10"
                      >
                        <div className="text-gray-400 text-2xl">→</div>
                      </motion.div>
                  </motion.div>

                    {/* Step 5: Publish */}
                  <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5, type: "spring" }}
                      viewport={{ once: true }}
                      whileHover={{ y: -5, scale: 1.02 }}
                      className="relative group"
                    >
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col items-center text-center">
                  <motion.div
                            whileHover={{ scale: 1.1, rotate: -5 }}
                            transition={{ type: "spring", stiffness: 400 }}
                            className="mb-4"
                          >
                            <img
                              src="/images/Icône WordPress.svg"
                              alt="WordPress"
                              className="h-12 w-12"
                            />
                          </motion.div>
                          <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-xs mb-2">
                        5
                      </div>
                          <h4 className="text-gray-900 font-bold text-sm mb-1">
                            Publish
                          </h4>
                          <p className="text-gray-600 text-xs">
                            Auto-publish ready
                          </p>
                    </div>
                    </div>
                  </motion.div>
                  </div>

                  {/* Bottom Stats */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    viewport={{ once: true }}
                    className="flex items-center justify-center gap-8 pt-4 border-t border-gray-200"
                  >
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">~2min</p>
                      <p className="text-xs text-gray-600">Average time</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">98%</p>
                      <p className="text-xs text-gray-600">SEO Score</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">10K+</p>
                      <p className="text-xs text-gray-600">
                        Articles generated
                      </p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Proof Section - Google Search Console Style */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="max-w-6xl mx-auto mb-12"
            >
              <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl border border-gray-200">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                  <img
                    src="/images/Icône Search Console 2025.svg"
                    alt="Google Search Console"
                    className="h-10 w-10"
                  />
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
                      Real Performance Data
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Google Search Console - Last 90 days
                    </p>
                  </div>
                  </div>
                  
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    viewport={{ once: true }}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200"
                  >
                    <p className="text-sm text-blue-700 font-medium mb-1">
                      Total Clicks
                    </p>
                    <p className="text-3xl font-bold text-blue-900">12.4K</p>
                    <p className="text-xs text-blue-600 mt-1">
                      ↑ 245% vs previous period
                    </p>
                  </motion.div>

                      <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                        viewport={{ once: true }}
                    className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200"
                      >
                    <p className="text-sm text-green-700 font-medium mb-1">
                      Impressions
                    </p>
                    <p className="text-3xl font-bold text-green-900">287K</p>
                    <p className="text-xs text-green-600 mt-1">
                      ↑ 312% vs previous period
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    viewport={{ once: true }}
                    className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200"
                  >
                    <p className="text-sm text-purple-700 font-medium mb-1">
                      Avg. CTR
                    </p>
                    <p className="text-3xl font-bold text-purple-900">4.3%</p>
                    <p className="text-xs text-purple-600 mt-1">
                      ↑ 0.8% vs previous period
                        </p>
                      </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    viewport={{ once: true }}
                    className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200"
                  >
                    <p className="text-sm text-orange-700 font-medium mb-1">
                      Avg. Position
                    </p>
                    <p className="text-3xl font-bold text-orange-900">8.2</p>
                    <p className="text-xs text-orange-600 mt-1">
                      ↑ 12.3 positions improved
                    </p>
                  </motion.div>
                  </div>

                {/* Chart */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    viewport={{ once: true }}
                  className="bg-gray-50 rounded-xl p-6 border border-gray-200"
                  >
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-semibold text-gray-900">
                      Traffic Growth Over Time
                    </h4>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-gray-600">Clicks</span>
                    </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-gray-600">Impressions</span>
                </div>
              </div>
          </div>

                  {/* Simplified Chart Visualization */}
                  <div className="relative h-64">
                    <svg
                      className="w-full h-full"
                      viewBox="0 0 800 250"
                      preserveAspectRatio="none"
                    >
                      {/* Grid lines */}
                      <line
                        x1="0"
                        y1="50"
                        x2="800"
                        y2="50"
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />
                      <line
                        x1="0"
                        y1="100"
                        x2="800"
                        y2="100"
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />
                      <line
                        x1="0"
                        y1="150"
                        x2="800"
                        y2="150"
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />
                      <line
                        x1="0"
                        y1="200"
                        x2="800"
                        y2="200"
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />

                      {/* Impressions line (green) */}
                      <motion.path
                        d="M 0 220 L 100 210 L 200 195 L 300 180 L 400 160 L 500 140 L 600 110 L 700 80 L 800 50"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        transition={{ duration: 2, ease: "easeOut" }}
            viewport={{ once: true }}
                      />

                      {/* Clicks line (blue) */}
                      <motion.path
                        d="M 0 230 L 100 225 L 200 215 L 300 200 L 400 185 L 500 165 L 600 140 L 700 110 L 800 80"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        transition={{
                          duration: 2,
                          ease: "easeOut",
                          delay: 0.2,
                        }}
                        viewport={{ once: true }}
                      />

                      {/* Gradient fill for impressions */}
                      <defs>
                        <linearGradient
                          id="greenGradient"
                          x1="0%"
                          y1="0%"
                          x2="0%"
                          y2="100%"
                        >
                          <stop
                            offset="0%"
                            stopColor="#10b981"
                            stopOpacity="0.2"
                          />
                          <stop
                            offset="100%"
                            stopColor="#10b981"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>
                      <motion.path
                        d="M 0 220 L 100 210 L 200 195 L 300 180 L 400 160 L 500 140 L 600 110 L 700 80 L 800 50 L 800 250 L 0 250 Z"
                        fill="url(#greenGradient)"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 0.5 }}
                        viewport={{ once: true }}
                      />
                    </svg>

                    {/* X-axis labels */}
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 px-2">
                      <span>Day 1</span>
                      <span>Day 30</span>
                      <span>Day 60</span>
                      <span>Day 90</span>
                    </div>
                  </div>
                </motion.div>

                {/* Bottom Note */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  viewport={{ once: true }}
                  className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl"
                >
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-900">
                      <span className="font-semibold">
                        Real results from AI-generated articles:
                      </span>{" "}
                      Articles created with our platform consistently rank in
                      top 10 positions within 60 days, with strategic CTAs
                      converting readers into customers.
                    </p>
                  </div>
                </motion.div>
            </div>
          </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-8 md:py-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From research to publication, all in one powerful platform
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* AI Research Feature */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center p-2">
                    <img
                      src="/images/Perplexity Color.svg"
                      alt="Perplexity"
                      className="w-full h-full"
                    />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      AI Research
                    </h3>
                    <p className="text-sm text-gray-500">Real-time web data</p>
                  </div>
                </div>

                {/* Animated Search Demo */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-3"
                  >
                    <Search className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    <div className="flex-1 h-3 bg-purple-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: "100%" }}
                        transition={{ delay: 0.5, duration: 1.5 }}
                        viewport={{ once: true }}
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                      />
                    </div>
                  </motion.div>
                  
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + i * 0.2 }}
                      viewport={{ once: true }}
                      className="flex items-start gap-3 bg-white rounded-lg p-3"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <div className="h-2 bg-gray-200 rounded w-full" />
                        <div className="h-2 bg-gray-200 rounded w-3/4" />
                      </div>
                    </motion.div>
                  ))}
                </div>

                <p className="text-gray-600 mt-4">
                  Perplexity AI gathers the latest information from across the
                  web
                </p>
              </div>
            </motion.div>

            {/* Smart Writing Feature */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center p-2">
                    <div className="flex flex-col items-center gap-0.5 w-full">
                      <img
                        src="/images/OpenAI 2.svg"
                        alt="OpenAI"
                        className="w-4 h-4"
                      />
                      <div className="flex items-center gap-1">
                        <img
                          src="/images/Anthropic 1.svg"
                          alt="Anthropic"
                          className="w-4 h-4"
                        />
                        <img
                          src="/images/Logo Gemini.svg"
                          alt="Gemini"
                          className="w-4 h-4"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Smart Writing
                    </h3>
                    <p className="text-sm text-gray-500">Multiple AI models</p>
                  </div>
                </div>

                {/* Animated Writing Demo */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3 font-mono text-sm">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "100%" }}
                    transition={{ delay: 0.5, duration: 2 }}
                    viewport={{ once: true }}
                    className="overflow-hidden"
                  >
                    <p className="text-gray-700 leading-relaxed">
                      The future of AI in healthcare is transforming how we
                      diagnose and treat patients...
                    </p>
                  </motion.div>

                  {/* AI Model Badges */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {["GPT-5", "Claude", "Gemini"].map((model, i) => (
                      <motion.span
                        key={model}
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 2 + i * 0.2 }}
                        viewport={{ once: true }}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold"
                      >
                        {model}
                      </motion.span>
                    ))}
                  </div>
                </div>

                <p className="text-gray-600 mt-4">
                  Choose from GPT-5, Claude Opus, Gemini Pro, and more
                </p>
              </div>
            </motion.div>

            {/* SEO Optimization Feature */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center p-2">
                    <img
                      src="/images/Google.svg"
                      alt="Google"
                      className="w-full h-full"
                    />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      SEO Optimized
                    </h3>
                    <p className="text-sm text-gray-500">
                      Automatic optimization
                    </p>
                  </div>
                </div>

                {/* Animated SEO Score */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <div className="relative w-32 h-32 mx-auto">
                    <svg className="transform -rotate-90 w-32 h-32">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <motion.circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#10b981"
                        strokeWidth="8"
                        fill="transparent"
                        strokeLinecap="round"
                        initial={{
                          strokeDasharray: "351.68",
                          strokeDashoffset: "351.68",
                        }}
                        whileInView={{ strokeDashoffset: "35.17" }}
                        transition={{
                          delay: 0.5,
                          duration: 2,
                          ease: "easeOut",
                        }}
                        viewport={{ once: true }}
                      />
                    </svg>
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.5 }}
                      viewport={{ once: true }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="text-center">
                        <motion.p
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          transition={{ delay: 2 }}
                          viewport={{ once: true }}
                          className="text-4xl font-bold text-green-600"
                        >
                          98
                        </motion.p>
                        <p className="text-xs text-gray-500 font-semibold">
                          SEO Score
                        </p>
                      </div>
                    </motion.div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {["Meta Title", "Description", "Keywords"].map(
                      (item, i) => (
                      <motion.div
                        key={item}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 2.2 + i * 0.1 }}
                        viewport={{ once: true }}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-600">{item}</span>
                      </motion.div>
                      )
                    )}
                  </div>
                </div>

                <p className="text-gray-600 mt-4">
                  Auto-generated meta tags, keywords, and structure
                </p>
              </div>
            </motion.div>

            {/* Lightning Fast Feature */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-yellow-100 rounded-2xl flex items-center justify-center">
                    <Clock className="w-7 h-7 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Lightning Fast
                    </h3>
                    <p className="text-sm text-gray-500">Under 2 minutes</p>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                  {[
                    { label: "Research", icon: Brain, delay: 0.5 },
                    { label: "Outline", icon: FileText, delay: 1 },
                    { label: "Writing", icon: Sparkles, delay: 1.5 },
                    { label: "SEO", icon: Globe, delay: 2 },
                  ].map((step) => (
                    <div key={step.label}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <step.icon className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">
                            {step.label}
                          </span>
                        </div>
                        <motion.span
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          transition={{ delay: step.delay + 0.5 }}
                          viewport={{ once: true }}
                          className="text-xs text-green-600 font-semibold"
                        >
                          Done ✓
                        </motion.span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: "100%" }}
                          transition={{ delay: step.delay, duration: 0.5 }}
                          viewport={{ once: true }}
                          className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                        />
                      </div>
                    </div>
                  ))}

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 2.5 }}
                    viewport={{ once: true }}
                    className="flex items-center justify-center gap-2 pt-2"
                  >
                    <Zap className="w-5 h-5 text-yellow-600" />
                    <span className="text-lg font-bold text-gray-900">
                      Complete in 2min
                    </span>
                  </motion.div>
                </div>

                <p className="text-gray-600 mt-4">
                  From topic to published article in record time
                </p>
              </div>
            </motion.div>

            {/* WordPress Integration Feature */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden lg:col-span-2"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center p-2">
                      <img
                        src="/images/Icône WordPress.svg"
                        alt="WordPress"
                        className="w-full h-full"
                      />
                  </div>
                  <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        Auto-Publish to WordPress
                      </h3>
                      <p className="text-sm text-gray-500">
                        One-click integration
                      </p>
                  </div>
                </div>
                      <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                        viewport={{ once: true }}
                    className="hidden md:flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold"
                  >
                    <Zap className="w-4 h-4" />
                    Instant
                  </motion.div>
                            </div>

                {/* Simplified Visual */}
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8 border border-gray-200">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    {/* Article Preview */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                      viewport={{ once: true }}
                      className="flex-1 bg-white rounded-xl p-6 shadow-md border border-gray-200"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <FileText className="w-6 h-6 text-blue-600" />
                        <div className="flex-1">
                          <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                          <div className="h-2 bg-gray-100 rounded w-1/2" />
                          </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-gray-100 rounded w-full" />
                        <div className="h-2 bg-gray-100 rounded w-5/6" />
                        <div className="h-2 bg-gray-100 rounded w-4/5" />
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          SEO: 98%
                        </div>
                        <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                          Ready
                        </div>
                      </div>
                      </motion.div>

                    {/* Arrow */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1, type: "spring" }}
                      viewport={{ once: true }}
                      className="flex items-center justify-center"
                    >
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                        <ArrowRight className="w-6 h-6 text-white" />
                  </div>
                    </motion.div>

                    {/* WordPress Site */}
                  <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 }}
                    viewport={{ once: true }}
                      className="flex-1 bg-white rounded-xl p-6 shadow-md border-2 border-green-200"
                  >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                          <Globe className="w-6 h-6 text-white" />
                        </div>
                      <div className="flex-1">
                          <p className="font-bold text-gray-900">
                            Your WordPress
                          </p>
                          <p className="text-xs text-gray-500">yourblog.com</p>
                      </div>
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm font-semibold text-green-700 mb-1">
                          ✓ Published Successfully
                        </p>
                        <p className="text-xs text-green-600">
                          Article is now live on your site
                        </p>
                    </div>
                  </motion.div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <p className="text-gray-600 text-sm">
                    Connect once, publish forever. No manual copy-paste needed.
                </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>Takes 2 seconds</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              Ready to Generate SEO Articles That Rank?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Join thousands of content creators using BlogGen AI to create
              high-quality, SEO-optimized articles in minutes.
            </p>
            {user ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/generate")}
                className="px-10 py-5 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl font-bold text-xl flex items-center gap-3 mx-auto shadow-2xl hover:shadow-gray-900/50 transition-all"
              >
                <Rocket className="w-6 h-6" />
                Go to Dashboard
              </motion.button>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAuthModal(true)}
                  className="px-10 py-5 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl font-bold text-xl flex items-center gap-3 shadow-2xl hover:shadow-gray-900/50 transition-all"
                >
                  <Rocket className="w-6 h-6" />
                  Start Free Now
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const element = document.getElementById("generator-form");
                    element?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-10 py-5 bg-white text-gray-900 border-2 border-gray-200 rounded-2xl font-bold text-xl hover:bg-gray-50 transition-all"
                >
                  Try Demo
                </motion.button>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-6">
              ✓ No credit card required • ✓ Free forever • ✓ Use your own API
              keys
            </p>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-12 border-t border-gray-200">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-gray-900" />
              <span className="text-lg font-bold text-gray-900">
                BlogGen AI
              </span>
            </div>
            <p className="text-gray-600 text-center md:text-left">
              © 2025 BlogGen AI. All rights reserved.
            </p>
            </div>

            {/* Legal Links */}
            <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm text-gray-600 border-t border-gray-200 pt-6">
              <Link
                href="/privacy"
                className="hover:text-gray-900 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="hover:text-gray-900 transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/disclaimer"
                className="hover:text-gray-900 transition-colors"
              >
                Disclaimer
              </Link>
              <Link
                href="/cookies"
                className="hover:text-gray-900 transition-colors"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </footer>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode="signup"
        onSuccess={handleAuthSuccess}
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
        maxPosition={6}
        userId={user?.uid || ""}
      />
    </div>
  );
}
