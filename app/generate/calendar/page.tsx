"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  FileText,
  Send,
  X,
  GripVertical,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../../contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { SavedArticle } from "../../../types/blog";

type ViewMode = "month" | "week";

interface DayCell {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  articles: SavedArticle[];
}

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [articles, setArticles] = useState<SavedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [draggedArticle, setDraggedArticle] = useState<SavedArticle | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [articleToSchedule, setArticleToSchedule] = useState<SavedArticle | null>(null);

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

  // Check if there's an article ID in URL to pre-select for scheduling
  useEffect(() => {
    const articleId = searchParams.get("articleId");
    if (articleId && articles.length > 0) {
      const article = articles.find((a) => a.id === articleId);
      if (article && article.status !== "published") {
        setArticleToSchedule(article);
        setShowScheduleModal(true);
      }
    }
  }, [searchParams, articles]);

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

  const handleSchedule = async (article: SavedArticle, date: Date, time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const scheduledDate = new Date(date);
    scheduledDate.setHours(hours, minutes, 0, 0);

    if (scheduledDate <= new Date()) {
      toast.error("Please select a future date and time");
      return;
    }

    try {
      const idToken = await user?.getIdToken();
      const response = await fetch(`/api/articles/${article.id}/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ scheduledAt: scheduledDate.toISOString() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to schedule");
      }

      const data = await response.json();
      setArticles(
        articles.map((a) => (a.id === article.id ? { ...a, ...data.article } : a))
      );
      toast.success("Article scheduled!");
      setShowScheduleModal(false);
      setArticleToSchedule(null);
    } catch (error: any) {
      console.error("Error scheduling article:", error);
      toast.error(error.message || "Failed to schedule article");
    }
  };

  const handleUnschedule = async (articleId: string) => {
    try {
      const idToken = await user?.getIdToken();
      const response = await fetch(`/api/articles/${articleId}/schedule`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) throw new Error("Failed to unschedule");

      const data = await response.json();
      setArticles(
        articles.map((a) => (a.id === articleId ? { ...a, ...data.article } : a))
      );
      toast.success("Article unscheduled");
    } catch (error) {
      console.error("Error unscheduling:", error);
      toast.error("Failed to unschedule article");
    }
  };

  const handleDragStart = (e: React.DragEvent, article: SavedArticle) => {
    setDraggedArticle(article);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (draggedArticle && draggedArticle.status !== "published") {
      setSelectedDate(date);
      setArticleToSchedule(draggedArticle);
      setShowScheduleModal(true);
    }
    setDraggedArticle(null);
  };

  // Calendar generation helpers
  const getDaysInMonth = (date: Date): DayCell[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days: DayCell[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const currentDay = new Date(startDate);
      currentDay.setDate(startDate.getDate() + i);

      const dayArticles = articles.filter((a) => {
        if (!a.scheduledAt) return false;
        const scheduled = new Date(a.scheduledAt);
        return (
          scheduled.getDate() === currentDay.getDate() &&
          scheduled.getMonth() === currentDay.getMonth() &&
          scheduled.getFullYear() === currentDay.getFullYear()
        );
      });

      days.push({
        date: currentDay,
        isCurrentMonth: currentDay.getMonth() === month,
        isToday: currentDay.getTime() === today.getTime(),
        articles: dayArticles,
      });
    }

    return days;
  };

  const getWeekDays = (date: Date): DayCell[] => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: DayCell[] = [];

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);

      const dayArticles = articles.filter((a) => {
        if (!a.scheduledAt) return false;
        const scheduled = new Date(a.scheduledAt);
        return (
          scheduled.getDate() === currentDay.getDate() &&
          scheduled.getMonth() === currentDay.getMonth() &&
          scheduled.getFullYear() === currentDay.getFullYear()
        );
      });

      days.push({
        date: currentDay,
        isCurrentMonth: true,
        isToday: currentDay.getTime() === today.getTime(),
        articles: dayArticles,
      });
    }

    return days;
  };

  const navigatePrev = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const navigateNext = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  };

  const formatWeekRange = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return `${startOfWeek.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    })} - ${endOfWeek.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  };

  const unscheduledArticles = articles.filter(
    (a) => a.status === "draft" && !a.scheduledAt
  );

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

  const days = viewMode === "month" ? getDaysInMonth(currentDate) : getWeekDays(currentDate);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Content Calendar</h1>
          <p className="text-gray-600">
            Drag and drop articles to schedule their publication
          </p>
        </motion.div>

        <div className="flex gap-6">
          {/* Sidebar - Unscheduled Articles */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-72 flex-shrink-0"
          >
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sticky top-8">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Unscheduled Articles
              </h3>
              <div className="space-y-2 max-h-[60vh] overflow-auto">
                {unscheduledArticles.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No unscheduled articles
                  </p>
                ) : (
                  unscheduledArticles.map((article) => (
                    <div
                      key={article.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, article)}
                      className="p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-grab hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-4 h-4 text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {article.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {article.wordCount} words
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* Calendar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1"
          >
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Calendar Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={navigatePrev}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-lg font-semibold text-gray-900 min-w-[200px] text-center">
                    {viewMode === "month"
                      ? formatMonthYear(currentDate)
                      : formatWeekRange(currentDate)}
                  </h2>
                  <button
                    onClick={navigateNext}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goToToday}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Today
                  </button>
                </div>

                {/* View Mode Toggle */}
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("month")}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                      viewMode === "month"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setViewMode("week")}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                      viewMode === "week"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Week
                  </button>
                </div>
              </div>

              {/* Month View */}
              {viewMode === "month" && (
                <div className="p-4">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map((day) => (
                      <div
                        key={day}
                        className="text-center text-sm font-medium text-gray-500 py-2"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {days.map((day, index) => (
                      <div
                        key={index}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day.date)}
                        className={`min-h-[100px] p-2 rounded-lg border transition-all ${
                          day.isCurrentMonth
                            ? "bg-white border-gray-200"
                            : "bg-gray-50 border-gray-100"
                        } ${day.isToday ? "ring-2 ring-gray-900" : ""} ${
                          draggedArticle ? "hover:bg-blue-50 hover:border-blue-300" : ""
                        }`}
                      >
                        <div
                          className={`text-sm font-medium mb-1 ${
                            day.isCurrentMonth ? "text-gray-900" : "text-gray-400"
                          }`}
                        >
                          {day.date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {day.articles.slice(0, 2).map((article) => (
                            <div
                              key={article.id}
                              className="text-xs p-1.5 bg-blue-100 text-blue-700 rounded truncate cursor-pointer hover:bg-blue-200 transition-colors"
                              onClick={() => {
                                setArticleToSchedule(article);
                                setSelectedDate(day.date);
                                if (article.scheduledAt) {
                                  const scheduled = new Date(article.scheduledAt);
                                  setSelectedTime(
                                    `${scheduled.getHours().toString().padStart(2, "0")}:${scheduled.getMinutes().toString().padStart(2, "0")}`
                                  );
                                }
                                setShowScheduleModal(true);
                              }}
                            >
                              {article.title}
                            </div>
                          ))}
                          {day.articles.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{day.articles.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Week View */}
              {viewMode === "week" && (
                <div className="p-4">
                  <div className="grid grid-cols-7 gap-2">
                    {days.map((day, index) => (
                      <div
                        key={index}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day.date)}
                        className={`min-h-[400px] p-3 rounded-lg border transition-all ${
                          day.isToday
                            ? "bg-blue-50 border-blue-200 ring-2 ring-blue-400"
                            : "bg-white border-gray-200"
                        } ${
                          draggedArticle ? "hover:bg-blue-50 hover:border-blue-300" : ""
                        }`}
                      >
                        <div className="text-center mb-4">
                          <div className="text-xs text-gray-500 uppercase">
                            {weekDays[index]}
                          </div>
                          <div
                            className={`text-2xl font-bold ${
                              day.isToday ? "text-blue-600" : "text-gray-900"
                            }`}
                          >
                            {day.date.getDate()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {day.date.toLocaleDateString("fr-FR", { month: "short" })}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {day.articles.map((article) => (
                            <div
                              key={article.id}
                              className="p-2 bg-blue-100 text-blue-700 rounded-lg text-sm cursor-pointer hover:bg-blue-200 transition-colors"
                              onClick={() => {
                                setArticleToSchedule(article);
                                setSelectedDate(day.date);
                                if (article.scheduledAt) {
                                  const scheduled = new Date(article.scheduledAt);
                                  setSelectedTime(
                                    `${scheduled.getHours().toString().padStart(2, "0")}:${scheduled.getMinutes().toString().padStart(2, "0")}`
                                  );
                                }
                                setShowScheduleModal(true);
                              }}
                            >
                              <div className="font-medium truncate">{article.title}</div>
                              {article.scheduledAt && (
                                <div className="text-xs mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(article.scheduledAt).toLocaleTimeString(
                                    "fr-FR",
                                    { hour: "2-digit", minute: "2-digit" }
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Schedule Modal */}
      <AnimatePresence>
        {showScheduleModal && articleToSchedule && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowScheduleModal(false);
              setArticleToSchedule(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Schedule Article</h2>
                <button
                  onClick={() => {
                    setShowScheduleModal(false);
                    setArticleToSchedule(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-1">Article</p>
                <p className="font-medium text-gray-900">{articleToSchedule.title}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={
                      selectedDate
                        ? selectedDate.toISOString().split("T")[0]
                        : new Date().toISOString().split("T")[0]
                    }
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                {articleToSchedule.status === "scheduled" && (
                  <button
                    onClick={() => {
                      handleUnschedule(articleToSchedule.id);
                      setShowScheduleModal(false);
                      setArticleToSchedule(null);
                    }}
                    className="flex-1 px-4 py-3 border border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all"
                  >
                    Unschedule
                  </button>
                )}
                <button
                  onClick={() =>
                    handleSchedule(
                      articleToSchedule,
                      selectedDate || new Date(),
                      selectedTime
                    )
                  }
                  className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                >
                  <CalendarIcon className="w-5 h-5" />
                  {articleToSchedule.status === "scheduled"
                    ? "Update Schedule"
                    : "Schedule"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

