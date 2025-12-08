"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { addMonths, addWeeks, endOfMonth, format, startOfMonth, startOfWeek } from "date-fns";
import { toast } from "react-hot-toast";

type Article = {
  id: string;
  title: string;
  topic?: string;
  status: "draft" | "scheduled" | "published";
  scheduledAt?: string;
  wordpressEditUrl?: string;
};

type ViewMode = "month" | "week";

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

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
      await loadArticles();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Publish failed");
    } finally {
      setPublishingId(null);
    }
  };

  const unscheduled = articles.filter((a) => !a.scheduledAt && a.status !== "published");

  const scheduledByDay = useMemo(() => {
    const map: Record<string, Article[]> = {};
    articles.forEach((a) => {
      if (a.scheduledAt) {
        const dayKey = format(new Date(a.scheduledAt), "yyyy-MM-dd");
        map[dayKey] = map[dayKey] || [];
        map[dayKey].push(a);
      }
    });
    return map;
  }, [articles]);

  const currentMonthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfMonth(currentDate);
    const days: Date[] = [];
    let cursor = start;
    while (cursor <= end || days.length % 7 !== 0) {
      days.push(cursor);
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    }
    return days;
  }, [currentDate]);

  const currentWeekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => new Date(start.getTime() + i * 24 * 60 * 60 * 1000));
  }, [currentDate]);

  const onDropDate = async (date: Date, articleId: string) => {
    const time = window.prompt("Heure (HH:MM)", "09:00") || "09:00";
    const [h, m] = time.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) {
      toast.error("Heure invalide");
      return;
    }
    const scheduled = new Date(date);
    scheduled.setHours(h, m, 0, 0);
    await publishArticle(articleId, scheduled.toISOString());
  };

  if (authLoading || loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse text-gray-500">Loading calendar...</div>
      </div>
    );
  }

  const renderDayCell = (day: Date) => {
    const key = format(day, "yyyy-MM-dd");
    const dayArticles = scheduledByDay[key] || [];
    return (
      <div
        key={key}
        className="border border-gray-200 min-h-[120px] p-2 rounded-lg bg-white"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const articleId = e.dataTransfer.getData("text/plain");
          if (articleId) onDropDate(day, articleId);
        }}
      >
        <div className="text-xs text-gray-500 mb-1">{format(day, "EEE d")}</div>
        <div className="space-y-2">
          {dayArticles.map((a) => (
            <div
              key={a.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)}
              className="p-2 bg-amber-50 border border-amber-200 rounded-md text-sm text-gray-800 cursor-move"
            >
              {a.title}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const nav = (
    <div className="flex gap-3">
      <button
        onClick={() =>
          setCurrentDate((d) =>
            viewMode === "month" ? addMonths(d, -1) : addWeeks(d, -1)
          )
        }
        className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
      >
        Prev
      </button>
      <button
        onClick={() => setCurrentDate(new Date())}
        className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
      >
        Today
      </button>
      <button
        onClick={() =>
          setCurrentDate((d) =>
            viewMode === "month" ? addMonths(d, 1) : addWeeks(d, 1)
          )
        }
        className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
      >
        Next
      </button>
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600">
            Drag articles onto a date to schedule WordPress publication.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode("month")}
            className={`px-3 py-2 rounded-lg border ${
              viewMode === "month"
                ? "bg-gray-900 text-white border-gray-900"
                : "border-gray-200 text-gray-800"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={`px-3 py-2 rounded-lg border ${
              viewMode === "week"
                ? "bg-gray-900 text-white border-gray-900"
                : "border-gray-200 text-gray-800"
            }`}
          >
            Week
          </button>
          {nav}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-3 bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Unscheduled</h3>
            <span className="text-sm text-gray-500">{unscheduled.length}</span>
          </div>
          <div className="space-y-2">
            {unscheduled.map((a) => (
              <div
                key={a.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)}
                className="p-3 border border-gray-200 rounded-xl bg-gray-50 cursor-move"
              >
                <div className="font-medium text-gray-900 text-sm">{a.title}</div>
                <div className="text-xs text-gray-500">{a.topic}</div>
                <div className="flex gap-2 mt-2">
                  <button
                    disabled={publishingId === a.id}
                    onClick={() => publishArticle(a.id)}
                    className="px-3 py-1 text-xs rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60"
                  >
                    Publish now
                  </button>
                  <button
                    disabled={publishingId === a.id}
                    onClick={() => onDropDate(new Date(), a.id)}
                    className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-gray-800 hover:bg-gray-50"
                  >
                    Schedule today
                  </button>
                </div>
              </div>
            ))}
            {unscheduled.length === 0 && (
              <div className="text-sm text-gray-500">All articles are scheduled.</div>
            )}
          </div>
        </div>

        <div className="col-span-9 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {viewMode === "month"
                ? format(currentDate, "LLLL yyyy")
                : `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "PP")}`}
            </h3>
          </div>

          {viewMode === "month" ? (
            <div className="grid grid-cols-7 gap-3">
              {currentMonthDays.map((day) => renderDayCell(day))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-3">
              {currentWeekDays.map((day) => renderDayCell(day))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

