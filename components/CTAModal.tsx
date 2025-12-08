"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Image as ImageIcon, Save, Trash2 } from "lucide-react";
import { CTA } from "../types/blog";
import CTAPreview from "./CTAPreview";
import { toast } from "react-hot-toast";
import {
  CTATemplate,
  getCTATemplates,
  saveCTATemplate,
  deleteCTATemplate,
} from "../lib/services/ctaTemplates";

interface CTAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cta: CTA) => void;
  existingCTA?: CTA;
  maxPosition: number;
  userId: string;
}

export default function CTAModal({
  isOpen,
  onClose,
  onSave,
  existingCTA,
  maxPosition,
  userId,
}: CTAModalProps) {
  const [title, setTitle] = useState(existingCTA?.title || "");
  const [description, setDescription] = useState(
    existingCTA?.description || ""
  );
  const [buttonText, setButtonText] = useState(existingCTA?.buttonText || "");
  const [buttonUrl, setButtonUrl] = useState(existingCTA?.buttonUrl || "");
  const [positionType, setPositionType] = useState<CTA["positionType"]>(
    existingCTA?.positionType || "after-intro"
  );
  const [sectionNumber, setSectionNumber] = useState(
    existingCTA?.sectionNumber || 1
  );
  const [style, setStyle] = useState<CTA["style"]>(
    existingCTA?.style || "default"
  );
  const [imageUrl, setImageUrl] = useState(existingCTA?.imageUrl || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [showAIModule, setShowAIModule] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiProvider, setAiProvider] = useState<
    "openai" | "anthropic" | "gemini" | "deepseek" | "qwen" | "grok"
  >("openai");
  const [aiModel, setAiModel] = useState<string>("gpt-4o-mini");
  const [gpt5ReasoningEffort, setGpt5ReasoningEffort] = useState<
    "minimal" | "low" | "medium" | "high"
  >("medium");
  const [gpt5Verbosity, setGpt5Verbosity] = useState<"low" | "medium" | "high">(
    "medium"
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ctaTemplates, setCtaTemplates] = useState<CTATemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  // Custom colors
  const [customColors, setCustomColors] = useState<CTA["customColors"]>(
    existingCTA?.customColors || {
      background: "#f0f0f0",
      titleColor: "#111111",
      descriptionColor: "#555555",
      buttonBackground: "#111111",
      buttonTextColor: "#ffffff",
    }
  );

  // Load templates when modal opens (only if userId is provided -> real generator, not landing guest)
  useEffect(() => {
    const loadTemplates = async () => {
      if (!isOpen || !userId) return;
      try {
        const templates = await getCTATemplates(userId);
        setCtaTemplates(templates);
      } catch (error) {
        console.error("Error loading templates:", error);
      }
    };
    loadTemplates();
  }, [isOpen, userId]);

  useEffect(() => {
    if (existingCTA) {
      setTitle(existingCTA.title || "");
      setDescription(existingCTA.description || "");
      setButtonText(existingCTA.buttonText || "");
      setButtonUrl(existingCTA.buttonUrl || "");
      setPositionType(existingCTA.positionType || "after-intro");
      setSectionNumber(existingCTA.sectionNumber || 1);
      setStyle(existingCTA.style || "default");
      setImageUrl(existingCTA.imageUrl || "");
      setCustomColors(
        existingCTA.customColors || {
          background: "#f0f0f0",
          titleColor: "#111111",
          descriptionColor: "#555555",
          buttonBackground: "#111111",
          buttonTextColor: "#ffffff",
        }
      );
    }
  }, [existingCTA]);

  // Load template when selected
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId === "") return;

    const template = ctaTemplates.find((t) => t.id === templateId);
    if (template) {
      setTitle(template.cta.title || "");
      setDescription(template.cta.description || "");
      setButtonText(template.cta.buttonText || "");
      setButtonUrl(template.cta.buttonUrl || "");
      setPositionType(template.cta.positionType || "after-intro");
      setSectionNumber(template.cta.sectionNumber || 1);
      setStyle(template.cta.style || "default");
      setImageUrl(template.cta.imageUrl || "");
      if (template.cta.customColors) {
        setCustomColors(template.cta.customColors);
      }
      toast.success("Template loaded!");
    }
  };

  // Delete template
  const handleDeleteTemplate = async () => {
    if (!userId || !selectedTemplate) return;

    const template = ctaTemplates.find((t) => t.id === selectedTemplate);
    if (!template) return;

    if (!confirm(`Delete template "${template.name}"?`)) return;

    try {
      await deleteCTATemplate(userId, selectedTemplate);

      // Reload templates
      const updatedTemplates = await getCTATemplates(userId);
      setCtaTemplates(updatedTemplates);

      // Reset selection
      setSelectedTemplate("");
      toast.success("Template deleted!");
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateText = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please describe what the CTA should say");
      return;
    }

    setIsGeneratingText(true);
    try {
      const response = await fetch("/api/generate-cta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          url: buttonUrl || "https://example.com",
          userId,
          aiProvider,
          model: aiModel,
          reasoningEffort: (aiModel || "").startsWith("gpt-5")
            ? gpt5ReasoningEffort
            : undefined,
          verbosity: (aiModel || "").startsWith("gpt-5")
            ? gpt5Verbosity
            : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate CTA text");
      }

      const data = await response.json();
      setTitle(data.title);
      setDescription(data.description);
      setButtonText(data.buttonText);
      setShowAIModule(false);
      setAiPrompt("");
      toast.success("CTA text generated successfully!");
    } catch (error) {
      console.error("Error generating CTA text:", error);
      toast.error("Failed to generate CTA text");
    } finally {
      setIsGeneratingText(false);
    }
  };

  const handleSave = async () => {
    if (
      !title.trim() ||
      !description.trim() ||
      !buttonText.trim() ||
      !buttonUrl.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const cta: CTA = {
      id: existingCTA?.id || `cta-${Date.now()}`,
      title,
      description,
      buttonText,
      buttonUrl,
      imageUrl: imageUrl || undefined,
      imageFile: imageFile || undefined,
      positionType,
      sectionNumber:
        positionType === "after-section" ? sectionNumber : undefined,
      style,
      customColors: style === "custom" ? customColors : undefined,
    };

    // Save as template if requested (only when we have a valid userId, i.e. in real generator)
    if (userId && saveAsTemplate && templateName.trim()) {
      try {
        const { id, imageFile, ...ctaData } = cta;
        const template: Omit<CTATemplate, "createdAt" | "updatedAt"> = {
          id: `template-${Date.now()}`,
          name: templateName.trim(),
          cta: ctaData,
        };
        await saveCTATemplate(userId, template);
        toast.success("CTA saved as template!");
      } catch (error) {
        console.error("Error saving template:", error);
        toast.error("Failed to save template");
      }
    }

    onSave(cta);
    handleClose();
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setButtonText("");
    setButtonUrl("");
    setPositionType("after-intro");
    setSectionNumber(1);
    setStyle("default");
    setImageUrl("");
    setImageFile(null);
    setShowAIModule(false);
    setAiPrompt("");
    setSelectedTemplate("");
    setSaveAsTemplate(false);
    setTemplateName("");
    onClose();
  };

  const previewCTA: CTA = {
    id: "preview",
    title,
    description,
    buttonText,
    buttonUrl: buttonUrl || "https://example.com",
    imageUrl,
    positionType,
    sectionNumber: positionType === "after-section" ? sectionNumber : undefined,
    style,
    customColors: style === "custom" ? customColors : undefined,
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              {existingCTA ? "Edit CTA" : "Add Call-to-Action"}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Form Column */}
              <div className="space-y-6">
                {/* Template Selector (only when userId is present -> real generator) */}
                {userId && ctaTemplates.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Load from Template
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedTemplate}
                        onChange={(e) => handleTemplateSelect(e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-gray-900"
                      >
                        <option value="">-- Create New CTA --</option>
                        {ctaTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                      {selectedTemplate && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleDeleteTemplate}
                          className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                          title="Delete template"
                        >
                          <Trash2 className="w-5 h-5" />
                        </motion.button>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Generation Module */}
                <div className="border-2 border-purple-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowAIModule(!showAIModule)}
                    className="w-full bg-gradient-to-r from-purple-50 to-blue-50 p-4 flex items-center justify-between hover:from-purple-100 hover:to-blue-100 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-gray-900">
                        Generate with AI
                      </span>
                    </div>
                    <motion.div
                      animate={{ rotate: showAIModule ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-purple-600"
                    >
                      ▼
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {showAIModule && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="p-4 bg-white space-y-4"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            What should the CTA say? *
                          </label>
                          <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="e.g., Encourage readers to try our free 14-day trial of our project management software..."
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-gray-900 resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              AI Provider
                            </label>
                            <select
                              value={aiProvider}
                              onChange={(e) => {
                                const provider = e.target
                                  .value as typeof aiProvider;
                                setAiProvider(provider);
                                // Set default model for each provider
                                if (provider === "openai")
                                  setAiModel("gpt-4o-mini");
                                else if (provider === "anthropic")
                                  setAiModel("claude-opus-4");
                                else if (provider === "gemini")
                                  setAiModel("gemini-2.5-pro");
                                else if (provider === "deepseek")
                                  setAiModel("deepseek-r1");
                                else if (provider === "qwen")
                                  setAiModel("qwen-qwq-32b-preview");
                                else if (provider === "grok")
                                  setAiModel("grok-4");
                              }}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-gray-900"
                            >
                              <option value="openai">OpenAI</option>
                              <option value="anthropic">
                                Anthropic (Claude)
                              </option>
                              <option value="gemini">Google Gemini</option>
                              <option value="deepseek">DeepSeek</option>
                              <option value="qwen">Alibaba Qwen</option>
                              <option value="grok">xAI Grok</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Model
                            </label>
                            {aiProvider === "openai" && (
                              <select
                                value={aiModel}
                                onChange={(e) => setAiModel(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-gray-900"
                              >
                                <option value="gpt-4o-mini">GPT-4o Mini</option>
                                <option value="gpt-4o">GPT-4o</option>
                                <option value="gpt-4.1">GPT-4.1</option>
                                <option value="gpt-5">GPT-5</option>
                                <option value="gpt-5-mini">GPT-5 Mini</option>
                                <option value="gpt-5-nano">GPT-5 Nano</option>
                              </select>
                            )}
                            {aiProvider === "anthropic" && (
                              <select
                                value={aiModel}
                                onChange={(e) => setAiModel(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-gray-900"
                              >
                                <option value="claude-opus-4">
                                  Claude Opus 4
                                </option>
                                <option value="claude-sonnet">
                                  Claude Sonnet
                                </option>
                                <option value="claude-sonnet-4.5">
                                  Claude Sonnet 4.5
                                </option>
                              </select>
                            )}
                            {aiProvider === "gemini" && (
                              <select
                                value={aiModel}
                                onChange={(e) => setAiModel(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-gray-900"
                              >
                                <option value="gemini-2.5-pro">
                                  Gemini 2.5 Pro
                                </option>
                                <option value="gemini-2.5-flash">
                                  Gemini 2.5 Flash
                                </option>
                              </select>
                            )}
                            {aiProvider === "deepseek" && (
                              <select
                                value={aiModel}
                                onChange={(e) => setAiModel(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-gray-900"
                              >
                                <option value="deepseek-r1">DeepSeek R1</option>
                              </select>
                            )}
                            {aiProvider === "qwen" && (
                              <select
                                value={aiModel}
                                onChange={(e) => setAiModel(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-gray-900"
                              >
                                <option value="qwen-qwq-32b-preview">
                                  Qwen QwQ 32B
                                </option>
                              </select>
                            )}
                            {aiProvider === "grok" && (
                              <select
                                value={aiModel}
                                onChange={(e) => setAiModel(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-gray-900"
                              >
                                <option value="grok-4">Grok 4</option>
                              </select>
                            )}
                          </div>
                        </div>

                        {/* GPT-5 Options */}
                        <AnimatePresence>
                          {aiProvider === "openai" &&
                            (aiModel || "").startsWith("gpt-5") && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="grid grid-cols-2 gap-4"
                              >
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Reasoning Effort
                                  </label>
                                  <select
                                    value={gpt5ReasoningEffort}
                                    onChange={(e) =>
                                      setGpt5ReasoningEffort(
                                        e.target.value as any
                                      )
                                    }
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-gray-900"
                                  >
                                    <option value="minimal">Minimal</option>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Verbosity
                                  </label>
                                  <select
                                    value={gpt5Verbosity}
                                    onChange={(e) =>
                                      setGpt5Verbosity(e.target.value as any)
                                    }
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-gray-900"
                                  >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                  </select>
                                </div>
                              </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleGenerateText}
                          disabled={isGeneratingText || !aiPrompt.trim()}
                          className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                            isGeneratingText || !aiPrompt.trim()
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg"
                          }`}
                        >
                          {isGeneratingText ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                              />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5" />
                              Generate CTA Text
                            </>
                          )}
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image (optional)
                  </label>
                  <div className="space-y-3">
                    {imageUrl ? (
                      <div className="relative">
                        <img
                          src={imageUrl}
                          alt="CTA"
                          className="w-full h-40 object-cover rounded-xl"
                        />
                        <button
                          onClick={() => {
                            setImageUrl("");
                            setImageFile(null);
                          }}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl hover:border-gray-400 transition-colors flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-700"
                      >
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-sm font-medium">
                          Upload Image
                        </span>
                        <span className="text-xs">Max 5MB</span>
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Manual Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Button URL *
                  </label>
                  <input
                    type="url"
                    value={buttonUrl}
                    onChange={(e) => setButtonUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ready to get started?"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Join thousands of users who are already benefiting..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-gray-900 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Button Text *
                  </label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="Get Started Now"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-gray-900"
                  />
                </div>

                {/* Position */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position in Article
                  </label>
                  <select
                    value={positionType}
                    onChange={(e) =>
                      setPositionType(e.target.value as CTA["positionType"])
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-gray-900"
                  >
                    <option value="after-intro">After Introduction</option>
                    <option value="after-section">
                      After Specific Section
                    </option>
                    <option value="middle">Middle of Article (Auto)</option>
                    <option value="before-conclusion">Before Conclusion</option>
                    <option value="end">End of Article</option>
                  </select>

                  <AnimatePresence>
                    {positionType === "after-section" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3"
                      >
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          Section Number
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={sectionNumber}
                          onChange={(e) =>
                            setSectionNumber(parseInt(e.target.value) || 1)
                          }
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-gray-900"
                          placeholder="e.g., 2"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Will adapt if the article has fewer sections
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Style
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(
                      [
                        "default",
                        "bordered",
                        "gradient",
                        "minimal",
                        "custom",
                      ] as const
                    ).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStyle(s)}
                        className={`px-4 py-3 rounded-xl font-medium transition-all ${
                          style === s
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Colors */}
                <AnimatePresence>
                  {style === "custom" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 pt-4 border-t border-gray-200"
                    >
                      <h4 className="font-semibold text-gray-900">
                        Custom Colors
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            Background
                          </label>
                          <input
                            type="color"
                            value={customColors?.background}
                            onChange={(e) =>
                              setCustomColors({
                                ...customColors,
                                background: e.target.value,
                              })
                            }
                            className="w-full h-10 rounded-lg cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            Title Color
                          </label>
                          <input
                            type="color"
                            value={customColors?.titleColor}
                            onChange={(e) =>
                              setCustomColors({
                                ...customColors,
                                titleColor: e.target.value,
                              })
                            }
                            className="w-full h-10 rounded-lg cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            Description
                          </label>
                          <input
                            type="color"
                            value={customColors?.descriptionColor}
                            onChange={(e) =>
                              setCustomColors({
                                ...customColors,
                                descriptionColor: e.target.value,
                              })
                            }
                            className="w-full h-10 rounded-lg cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            Button BG
                          </label>
                          <input
                            type="color"
                            value={customColors?.buttonBackground}
                            onChange={(e) =>
                              setCustomColors({
                                ...customColors,
                                buttonBackground: e.target.value,
                              })
                            }
                            className="w-full h-10 rounded-lg cursor-pointer"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            Button Text
                          </label>
                          <input
                            type="color"
                            value={customColors?.buttonTextColor}
                            onChange={(e) =>
                              setCustomColors({
                                ...customColors,
                                buttonTextColor: e.target.value,
                              })
                            }
                            className="w-full h-10 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Preview Column - Always visible */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Live Preview
                </h3>
                <div className="bg-gray-50 p-6 rounded-2xl">
                  <CTAPreview cta={previewCTA} />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 space-y-4">
            {/* Save as Template Option (only when userId is present -> real generator) */}
            {userId && (
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="saveAsTemplate"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="mt-1 w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-400"
                />
                <div className="flex-1">
                  <label
                    htmlFor="saveAsTemplate"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    Save as template for future use
                  </label>
                  <AnimatePresence>
                    {saveAsTemplate && (
                      <motion.input
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Template name (e.g., Product Launch CTA)"
                        className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400/50 text-sm text-gray-900"
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleClose}
                className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                className="px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                {saveAsTemplate && <Save className="w-4 h-4" />}
                {existingCTA ? "Update CTA" : "Add CTA"}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
