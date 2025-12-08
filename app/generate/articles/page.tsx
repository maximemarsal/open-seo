"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "react-hot-toast";

type Article = {
  id: string;
  title: string;
  topic?: string;
  status: "draft" | "scheduled" | "published";
  scheduledAt?: string;
  publishedAt?: string;
  wordpressPostId?: number;
  wordpressEditUrl?: string;
  createdAt: string;
};

export default function ArticlesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>("");

  const loadArticles = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/articles", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load articles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) router.push("/");
    if (user) loadArticles();
  }, [user, authLoading]);

  const publishArticle = async (id: string, publishAt?: string) => {
    if (!user) return;
    setPublishingId(id);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/articles/${id}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ publishAt }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Publish failed");
      }
      toast.success(publishAt ? "Article scheduled" : "Article published");
      setSchedulingId(null);
      setScheduleDate("");
      await loadArticles();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Publish failed");
    } finally {
      setPublishingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse text-gray-500">Loading articles...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Articles</h1>
          <p className="text-gray-600">
            Manage generated articles, publish now or schedule.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/generate/calendar")}
            className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-800"
          >
            Open Calendar
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Scheduled
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Published
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{article.title}</div>
                    <div className="text-xs text-gray-500">{article.topic}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        article.status === "published"
                          ? "bg-green-100 text-green-800"
                          : article.status === "scheduled"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {article.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {article.scheduledAt
                      ? format(new Date(article.scheduledAt), "PPpp")
                      : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {article.publishedAt
                      ? format(new Date(article.publishedAt), "PPpp")
                      : "-"}
                  </td>
                  <td className="px-6 py-4 space-x-2">
                    <button
                      disabled={publishingId === article.id}
                      onClick={() => publishArticle(article.id)}
                      className="px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60"
                    >
                      {publishingId === article.id ? "Publishing..." : "Publish now"}
                    </button>
                    <button
                      onClick={() => {
                        setSchedulingId(article.id);
                        setScheduleDate("");
                      }}
                      className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-800"
                    >
                      Schedule
                    </button>
                    {article.wordpressEditUrl && (
                      <a
                        href={article.wordpressEditUrl}
                        target="_blank"
                        className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                        rel="noreferrer"
                      >
                        Open in WP
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {schedulingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Schedule publication</h3>
            <p className="text-sm text-gray-600">
              Choose date and time (local). WordPress will receive this schedule.
            </p>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSchedulingId(null);
                  setScheduleDate("");
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!scheduleDate || publishingId === schedulingId}
                onClick={() => publishArticle(schedulingId!, scheduleDate)}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {publishingId === schedulingId ? "Scheduling..." : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

