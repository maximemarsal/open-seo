"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Save,
  X,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  saveUserApiKeys,
  getUserApiKeys,
} from "../lib/services/userKeys";
import ApiKeyTooltip from "./ApiKeyTooltip";

interface MissingApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  missingKeys: {
    key: string;
    label: string;
    placeholder: string;
  }[];
  userId: string;
  onSaved: () => void;
}

// API explanations and links
const API_INFO: Record<
  string,
  {
    why: string;
    url: string;
    provider: string;
    logo?: string;
    setupTime?: string;
  }
> = {
    openaiKey: {
      why: "Powers the AI content generation engine",
      url: "https://platform.openai.com/api-keys",
      provider: "OpenAI",
    logo: "/images/OpenAI 2.svg",
    setupTime: "~2 min",
    },
    perplexityKey: {
      why: "Enables real-time web research for up-to-date content",
      url: "https://www.perplexity.ai/settings/api",
      provider: "Perplexity",
    logo: "/images/Perplexity Color.svg",
    setupTime: "~2 min",
    },
    anthropicKey: {
      why: "Powers Claude AI for advanced content generation",
      url: "https://console.anthropic.com/settings/keys",
      provider: "Anthropic",
    logo: "/images/Anthropic 1.svg",
    setupTime: "~2 min",
    },
    geminiKey: {
      why: "Enables Google's Gemini AI for content creation",
      url: "https://aistudio.google.com/app/apikey",
      provider: "Google",
    logo: "/images/Logo Gemini.svg",
    setupTime: "~1 min",
    },
    deepseekKey: {
      why: "Powers DeepSeek AI for efficient content generation",
      url: "https://platform.deepseek.com/api_keys",
      provider: "DeepSeek",
    logo: "/images/Deepseek 2.svg",
    setupTime: "~2 min",
    },
    qwenKey: {
      why: "Enables Alibaba's Qwen AI for content creation",
      url: "https://dashscope.console.aliyun.com/apiKey",
      provider: "Alibaba",
    logo: "/images/Logo Qwen.svg",
    setupTime: "~2 min",
    },
    grokKey: {
      why: "Powers xAI's Grok for advanced content generation",
      url: "https://console.x.ai/",
      provider: "xAI",
    logo: "/images/Grok 1.svg",
    setupTime: "~2 min",
  },
  unsplashKey: {
    why: "Provides high-quality images for your articles",
    url: "https://unsplash.com/oauth/applications",
    provider: "Unsplash",
    logo: "/images/Unsplash Vector Icon.svg",
    setupTime: "~2 min",
    },
  };

export default function MissingApiKeyModal({
  isOpen,
  onClose,
  missingKeys,
  userId,
  onSaved,
}: MissingApiKeyModalProps) {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Load existing keys to avoid overwriting previously saved providers
      const existingKeys = userId ? await getUserApiKeys(userId) : null;

      // Merge existing keys with the new ones coming from this modal
      const mergedKeys = {
        ...(existingKeys || {}),
        ...keys,
      };

      await saveUserApiKeys(userId, mergedKeys);
      toast.success("API keys saved successfully!");
      onSaved();
      onClose();
    } catch (error) {
      console.error("Error saving API keys:", error);
      toast.error("Failed to save API keys");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleShowKey = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - Click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal - Stop propagation to prevent closing when clicking inside */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto relative z-10"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-orange-500" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Missing API Keys
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-6 space-y-6">
                {/* Warning Message */}
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <p className="text-sm text-orange-800">
                    The following API keys are required for article generation
                    but haven't been configured yet. Click on the links below to
                    get your keys (takes ~2 min per service).
                  </p>
                </div>

                {/* Explanation about pricing */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-green-900 mb-2">
                    💰 How it works
                  </h4>
                  <div className="space-y-2 text-sm text-green-800">
                    <p>
                      <strong>This tool is completely free!</strong> However, AI
                      services have a cost, and you'll need to connect your own
                      AI account to pay for the API usage.
                    </p>
                    <p>
                      Depending on the AI provider you choose, generating an
                      article costs approximately <strong>$0.05</strong> per
                      article on average. You only pay for what you use directly
                      to the AI provider.
                    </p>
                  </div>
                </div>

                {/* API Key Inputs */}
                <div className="space-y-6">
                  {missingKeys.map((item) => {
                    const info = API_INFO[item.key];
                    return (
                      <div key={item.key} className="space-y-3">
                        <div className="flex items-start gap-3">
                          {info?.logo && (
                            <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg border border-gray-200 p-2 flex items-center justify-center">
                              <img
                                src={info.logo}
                                alt={info.provider}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <label className="block text-sm font-medium text-gray-700">
                            {item.label}
                          </label>
                                <ApiKeyTooltip
                                  service={
                                    item.key === "openaiKey"
                                      ? "openai"
                                      : item.key === "perplexityKey"
                                      ? "perplexity"
                                      : item.key === "anthropicKey"
                                      ? "anthropic"
                                      : item.key === "geminiKey"
                                      ? "gemini"
                                      : item.key === "deepseekKey"
                                      ? "deepseek"
                                      : item.key === "qwenKey"
                                      ? "qwen"
                                      : item.key === "grokKey"
                                      ? "grok"
                                      : item.key === "unsplashKey"
                                      ? "unsplash"
                                      : "openai"
                                  }
                                />
                              </div>
                              {info?.setupTime && (
                                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                                  ⏱️ {info.setupTime}
                                </span>
                              )}
                            </div>
                          {info && (
                            <p className="text-xs text-gray-500 mb-2">
                              {info.why}
                            </p>
                          )}
                          </div>
                        </div>
                        <div className="relative">
                          <input
                            type={showKeys[item.key] ? "text" : "password"}
                            value={keys[item.key] || ""}
                            onChange={(e) =>
                              setKeys({ ...keys, [item.key]: e.target.value })
                            }
                            placeholder={item.placeholder}
                            className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
                          />
                          <button
                            type="button"
                            onClick={() => toggleShowKey(item.key)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showKeys[item.key] ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Tip:</strong> You can also configure all your API
                    keys in the Settings page for future use.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={
                      isSaving ||
                      missingKeys.some((item) => !keys[item.key]?.trim())
                    }
                    className={`flex-1 px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
                      isSaving ||
                      missingKeys.some((item) => !keys[item.key]?.trim())
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gray-900 text-white hover:bg-gray-800"
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
                        Save & Continue
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
