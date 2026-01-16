"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X, ExternalLink, DollarSign } from "lucide-react";

interface ApiKeyTooltipProps {
  service: string;
}

const API_INSTRUCTIONS: Record<
  string,
  {
    title: string;
    steps: string[];
    url: string;
    minCredit: string;
    notes?: string;
  }
> = {
  openai: {
    title: "OpenAI API Key",
    steps: [
      "Go to platform.openai.com/api-keys",
      "Sign in or create an account",
      "Click 'Create new secret key'",
      "Give it a name and copy the key (starts with 'sk-')",
      "Go to Settings → Billing to add credits",
      "Add at least $5 to start using the API",
    ],
    url: "https://platform.openai.com/api-keys",
    minCredit: "$5 minimum recommended",
    notes:
      "A minimum of $5 in credits is required to activate the API. Depending on the model used, generating an article costs approximately $0.05 on average.",
  },
  perplexity: {
    title: "Perplexity API Key",
    steps: [
      "Go to perplexity.ai/settings/api",
      "Sign in to your account",
      "Click 'Generate' to create a new API key",
      "Copy the key (starts with 'pplx-')",
      "Go to the Billing section",
      "Add credits to your account ($3+ recommended)",
    ],
    url: "https://www.perplexity.ai/settings/api",
    minCredit: "$3 minimum recommended",
    notes:
      "A minimum of $3 in credits is required to activate the API. Used for real-time web research. Generating an article with research costs approximately $0.05 on average depending on the model.",
  },
  anthropic: {
    title: "Anthropic Claude API Key",
    steps: [
      "Go to console.anthropic.com/settings/keys",
      "Create an account or sign in",
      "Click 'Create Key'",
      "Name your key and copy it (starts with 'sk-ant-')",
      "Go to Settings → Billing",
      "Add credits ($5+ recommended)",
    ],
    url: "https://console.anthropic.com/settings/keys",
    minCredit: "$5 minimum recommended",
    notes:
      "A minimum of $5 in credits is required to activate the API. Depending on the model used, generating an article costs approximately $0.05 on average.",
  },
  gemini: {
    title: "Google Gemini API Key",
    steps: [
      "Go to aistudio.google.com/app/apikey",
      "Sign in with your Google account",
      "Click 'Get API key' or 'Create API key'",
      "Select or create a Google Cloud project",
      "Copy the key (starts with 'AI')",
      "Free tier: 60 requests/min, no credit card needed!",
    ],
    url: "https://aistudio.google.com/app/apikey",
    minCredit: "Free tier: 60 requests/min (15 RPM for Gemini 2.5 Pro)",
    notes:
      "Generous free tier with no credit card required! Paid tier available via Google Cloud for higher limits.",
  },
  deepseek: {
    title: "DeepSeek API Key",
    steps: [
      "Go to platform.deepseek.com/api_keys",
      "Create an account or sign in",
      "Click 'Create API Key'",
      "Copy the key (starts with 'sk-')",
      "Go to Account → Billing",
      "Add credits ($5+ recommended)",
    ],
    url: "https://platform.deepseek.com/api_keys",
    minCredit: "$5 minimum recommended",
    notes:
      "A minimum of $5 in credits is required to activate the API. Depending on the model used, generating an article costs approximately $0.05 on average.",
  },
  qwen: {
    title: "Alibaba Qwen API Key",
    steps: [
      "Go to dashscope.console.aliyun.com",
      "Sign in with Alibaba Cloud account (create if needed)",
      "Navigate to API-KEY management",
      "Click 'Create API Key'",
      "Copy the key",
      "Add credits via Alibaba Cloud billing",
    ],
    url: "https://dashscope.console.aliyun.com/apiKey",
    minCredit: "$5 minimum recommended",
    notes:
      "A minimum of $5 in credits is required to activate the API. Requires Alibaba Cloud account. Depending on the model used, generating an article costs approximately $0.05 on average.",
  },
  grok: {
    title: "xAI Grok API Key",
    steps: [
      "Go to console.x.ai",
      "Sign in or create an account",
      "Navigate to API Keys section",
      "Click 'Create API Key'",
      "Copy the key (starts with 'xai-')",
      "Add credits via billing section",
    ],
    url: "https://console.x.ai/",
    minCredit: "$10 minimum recommended",
    notes:
      "A minimum of $10 in credits is required to activate the API. Currently in beta. Depending on the model used, generating an article costs approximately $0.05 on average.",
  },
  unsplash: {
    title: "Unsplash Access Key",
    steps: [
      "Go to unsplash.com/oauth/applications",
      "Sign in or create an account",
      "Click 'New Application'",
      "Accept terms and create your app",
      "Copy your 'Access Key' from the app page",
      "Free tier: 50 requests/hour!",
    ],
    url: "https://unsplash.com/oauth/applications",
    minCredit: "Free tier: 50 requests/hour",
    notes:
      "Completely free for development and production! No credit card needed. Used to add beautiful images to articles.",
  },
  wordpress: {
    title: "WordPress Application Password",
    steps: [
      "Log in to your WordPress admin panel",
      "Go to Users → Your Profile",
      "Find your Username at the top (this is what you'll use in the settings)",
      "Scroll down to 'Application Passwords' section",
      "Enter a name (e.g., 'Open SEO')",
      "Click 'Add New Application Password'",
      "Copy the generated password (format: xxxx xxxx xxxx xxxx)",
    ],
    url: "",
    minCredit: "Free (your own WordPress site)",
    notes:
      "Use your WordPress username (the one displayed in Users → Your Profile → Username, same as your login) + application password (NOT your regular login password). Requires WordPress 5.6+.",
  },
};

export default function ApiKeyTooltip({ service }: ApiKeyTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const info = API_INSTRUCTIONS[service];

  if (!info) return null;

  const handleClose = () => {
    setIsClosing(true);
    setIsOpen(false);
    // Reset closing state after animation completes
    setTimeout(() => setIsClosing(false), 300);
  };

  const handleOpen = () => {
    if (!isClosing) {
      setIsOpen(true);
    }
  };

  // Function to render text with clickable URLs
  const renderStepWithLinks = (
    text: string,
    linkColor: "blue" | "green" = "blue"
  ) => {
    // Regex to match URLs (http/https or domain.com/path)
    const urlRegex = /(https?:\/\/[^\s]+|[\w-]+\.[\w.-]+(?:\/[^\s]*)?)/g;
    const matches: Array<{ text: string; index: number; url: string }> = [];
    let match;

    // Find all URL matches
    while ((match = urlRegex.exec(text)) !== null) {
      const matchedText = match[0];

      // Skip if it looks like a price (starts with $ or is a decimal number)
      // Skip common abbreviations like "e.g.", "i.e.", etc.
      if (
        matchedText.match(/^\$?\d+\.\d+$/) ||
        matchedText.match(/^\d+\.\d+$/) ||
        text.substring(Math.max(0, match.index - 1), match.index) === "$" ||
        matchedText.toLowerCase() === "e.g." ||
        matchedText.toLowerCase() === "i.e." ||
        matchedText.match(/^[a-z]\.g\.$/i) ||
        matchedText.match(/^[a-z]\.[a-z]\.$/i)
      ) {
        continue;
      }

      matches.push({
        text: matchedText,
        index: match.index,
        url: matchedText.startsWith("http")
          ? matchedText
          : `https://${matchedText}`,
      });
    }

    if (matches.length === 0) {
      return <span>{text}</span>;
    }

    // Build array of text parts and links
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    const linkClass =
      linkColor === "green"
        ? "text-green-800 hover:text-green-900 hover:underline font-semibold"
        : "text-blue-600 hover:text-blue-700 hover:underline font-medium";

    matches.forEach((match, idx) => {
      // Add text before the URL
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${idx}`}>
            {text.substring(lastIndex, match.index)}
          </span>
        );
      }

      // Add the clickable URL
      parts.push(
        <a
          key={`link-${idx}`}
          href={match.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={linkClass}
        >
          {match.text}
        </a>
      );

      lastIndex = match.index + match.text.length;
    });

    // Add remaining text after last URL
    if (lastIndex < text.length) {
      parts.push(<span key="text-end">{text.substring(lastIndex)}</span>);
    }

    return <>{parts}</>;
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleOpen}
        disabled={isOpen || isClosing}
        className="ml-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Help"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop - Click to close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              onMouseDown={(e) => {
                // Close if clicking directly on backdrop (not on modal)
                if (e.target === e.currentTarget) {
                  e.stopPropagation();
                  handleClose();
                }
              }}
            >
              {/* Modal - Stop propagation to prevent closing when clicking inside */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto relative z-10"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {info.title}
                  </h3>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 space-y-4">
                  {/* Steps */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      How to get your API key:
                    </h4>
                    <ol className="space-y-2">
                      {info.steps.map((step, index) => (
                        <li
                          key={index}
                          className="flex gap-3 text-sm text-gray-600"
                        >
                          <span className="flex-shrink-0 w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </span>
                          <span className="pt-0.5">
                            {renderStepWithLinks(step)}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Pricing Info & Notes Combined - Only show for paid services */}
                  {service !== "wordpress" && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-semibold text-green-900 mb-1">
                              Pricing & Credits
                            </p>
                            <p className="text-sm text-green-800">
                              {info.minCredit}
                            </p>
                          </div>
                          {info.notes && (
                            <p className="text-xs text-green-700 leading-relaxed">
                              {renderStepWithLinks(info.notes, "green")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes only for WordPress (no pricing section) */}
                  {service === "wordpress" && info.notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-xs text-blue-800 leading-relaxed">
                        {renderStepWithLinks(info.notes, "blue")}
                      </p>
                    </div>
                  )}

                  {/* Link */}
                  {info.url && (
                    <a
                      href={info.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Laisser le navigateur gérer l'ouverture du lien
                      }}
                      onMouseUp={(e) => {
                        e.stopPropagation();
                      }}
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 active:bg-gray-700 transition-colors cursor-pointer relative z-10 no-underline"
                      style={{ pointerEvents: "auto", textDecoration: "none" }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open {info.title.split(" ")[0]} Dashboard
                    </a>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
