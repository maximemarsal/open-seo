"use client";

import { useState } from "react";
import { Copy, Check, Eye, Code, Upload } from "lucide-react";
import { toast } from "react-hot-toast";

interface ArticleDisplayProps {
  content: string;
  seoMetadata?: {
    metaTitle: string;
    metaDescription: string;
    slug: string;
    keywords: string[];
  };
  topic?: string;
  onPublishToWordPress?: () => void;
  isPublishing?: boolean;
}

export default function ArticleDisplay({
  content,
  seoMetadata,
  topic,
  onPublishToWordPress,
  isPublishing = false,
}: ArticleDisplayProps) {
  const [viewMode, setViewMode] = useState<"preview" | "html">("preview");
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast.success(`${type} copied to clipboard!`);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      toast.error("Copy failed");
    }
  };

  const cleanHtmlForWordPress = (html: string) => {
    // Remove the article wrapper for WordPress
    return html
      .replace(/<article[^>]*>/, "")
      .replace(/<\/article>/, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/, "")
      .replace(/<div class="article-content"[^>]*>/, "")
      .replace(/<\/div>$/, "")
      .trim();
  };

  const wordPressReadyHtml = cleanHtmlForWordPress(content);

  return (
    <div className="border-t pt-6">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-semibold text-gray-900">
          Generated article
        </h4>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("preview")}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition ${
              viewMode === "preview"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={() => setViewMode("html")}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition ${
              viewMode === "html"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Code className="w-4 h-4" />
            HTML
          </button>
          {onPublishToWordPress && (
            <button
              onClick={onPublishToWordPress}
              disabled={isPublishing}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition ${
                isPublishing
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              <Upload className="w-4 h-4" />
              {isPublishing ? "Publishing..." : "Publish to WordPress"}
            </button>
          )}
        </div>
      </div>

      {/* SEO Metadata Copy Section */}
      {seoMetadata && (
        <div className="mb-6 p-6 bg-gray-50 border border-gray-200 rounded-2xl">
          <h5 className="font-semibold mb-4 text-gray-900">SEO Metadata</h5>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-600">
                  Title:
                </span>
                <p className="text-sm text-gray-900 mt-1">
                  {seoMetadata.metaTitle}
                </p>
              </div>
              <button
                onClick={() =>
                  copyToClipboard(seoMetadata.metaTitle, "SEO title")
                }
                className="ml-2 p-2 text-gray-500 hover:text-gray-900 transition"
              >
                {copied === "SEO title" ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-600">
                  Description:
                </span>
                <p className="text-sm text-gray-900 mt-1">
                  {seoMetadata.metaDescription}
                </p>
              </div>
              <button
                onClick={() =>
                  copyToClipboard(seoMetadata.metaDescription, "Description")
                }
                className="ml-2 p-2 text-gray-500 hover:text-gray-900 transition"
              >
                {copied === "Description" ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-600">Slug:</span>
                <p className="text-sm text-gray-900 mt-1">{seoMetadata.slug}</p>
              </div>
              <button
                onClick={() => copyToClipboard(seoMetadata.slug, "Slug")}
                className="ml-2 p-2 text-gray-500 hover:text-gray-900 transition"
              >
                {copied === "Slug" ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-600">
                  Keywords:
                </span>
                <p className="text-sm text-gray-900 mt-1">
                  {seoMetadata.keywords.join(", ")}
                </p>
              </div>
              <button
                onClick={() =>
                  copyToClipboard(seoMetadata.keywords.join(", "), "Keywords")
                }
                className="ml-2 p-2 text-gray-500 hover:text-gray-900 transition"
              >
                {copied === "Keywords" ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Display */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">
            {viewMode === "preview" ? "Article preview" : "HTML for WordPress"}
          </span>
          <button
            onClick={() =>
              copyToClipboard(
                viewMode === "preview" ? content : wordPressReadyHtml,
                "Article"
              )
            }
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition"
          >
            {copied === "Article" ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            Copy
          </button>
        </div>

        <div className="p-8 max-h-[600px] overflow-y-auto">
          {viewMode === "preview" ? (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
              {wordPressReadyHtml}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
