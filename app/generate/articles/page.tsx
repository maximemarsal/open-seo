"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  Trash2,
  Eye,
  Send,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { SavedArticle } from "../../../types/blog";

type StatusFilter = "all" | "draft" | "scheduled" | "published";

export default function ArticlesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [articles, setArticles] = useState<SavedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedArticle, setSelectedArticle] = useState<SavedArticle | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchArticles();
    }
  }, [user]);

  const fetchArticles = async () => {
    try {
      setIsLoading(true);
      const idToken = await user?.getIdToken();
      const response = await fetch("/api/articles", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch articles");

      const data = await response.json();
      setArticles(data.articles || []);
    } catch (error) {
      console.error("Error fetching articles:", error);
      toast.error("Failed to load articles");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (articleId: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;

    try {
      const idToken = await user?.getIdToken();
      const response = await fetch(`/api/articles/${articleId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete article");

      setArticles(articles.filter((a) => a.id !== articleId));
      toast.success("Article deleted");
    } catch (error) {
      console.error("Error deleting article:", error);
      toast.error("Failed to delete article");
    }
  };

  const handlePublishNow = async (articleId: string) => {
    try {
      const idToken = await user?.getIdToken();
      const response = await fetch(`/api/articles/${articleId}/publish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to publish");
      }

      const data = await response.json();
      setArticles(
        articles.map((a) =>
          a.id === articleId ? { ...a, ...data.article } : a
        )
      );
      toast.success("Article published successfully!");
    } catch (error: any) {
      console.error("Error publishing article:", error);
      toast.error(error.message || "Failed to publish article");
    }
  };

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.seoMetadata?.metaDescription
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || article.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Draft
          </span>
        );
      case "scheduled":
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Scheduled
          </span>
        );
      case "published":
        return (
          <span className="px-2 py-1 bg-green-100 text-green-600 text-xs font-medium rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Published
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Articles</h1>
          <p className="text-gray-600">
            Manage your generated articles and schedule publications
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {(["all", "draft", "scheduled", "published"] as StatusFilter[]).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all capitalize ${
                    statusFilter === status
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {status}
                </button>
              )
            )}
          </div>
        </motion.div>

        {/* Articles List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {filteredArticles.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No articles found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Generate your first article to get started"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <button
                  onClick={() => router.push("/generate")}
                  className="px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all"
                >
                  Generate Article
                </button>
              )}
            </div>
          ) : (
            filteredArticles.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(article.status)}
                      {article.scheduledAt && article.status === "scheduled" && (
                        <span className="text-xs text-gray-500">
                          Scheduled for {formatDate(article.scheduledAt)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {article.seoMetadata?.metaDescription || "No description"}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                      <span>{article.wordCount} words</span>
                      <span>•</span>
                      <span>Created {formatDate(article.createdAt)}</span>
                      {article.publishedAt && (
                        <>
                          <span>•</span>
                          <span>Published {formatDate(article.publishedAt)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedArticle(article);
                        setShowPreview(true);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-5 h-5 text-gray-500" />
                    </button>

                    {article.status !== "published" && (
                      <button
                        onClick={() => handlePublishNow(article.id)}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Publish now"
                      >
                        <Send className="w-5 h-5 text-blue-500" />
                      </button>
                    )}

                    {article.status !== "published" && (
                      <button
                        onClick={() =>
                          router.push(`/generate/calendar?articleId=${article.id}`)
                        }
                        className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Schedule"
                      >
                        <Calendar className="w-5 h-5 text-purple-500" />
                      </button>
                    )}

                    {article.wordpressEditUrl && (
                      <a
                        href={article.wordpressEditUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                        title="Open in WordPress"
                      >
                        <ExternalLink className="w-5 h-5 text-green-500" />
                      </a>
                    )}

                    <button
                      onClick={() => handleDelete(article.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && selectedArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedArticle.title}
                </h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>
              <div
                className="p-6 overflow-auto max-h-[60vh] prose prose-gray max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

