"use client";

import React, { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  FileText,
  X,
  GripVertical,
  Trash2,
  Send,
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

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEK_DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const isPastDate = (date: Date, hour?: number) => {
  const target = new Date(date);
  if (hour !== undefined) {
    target.setHours(hour, 0, 0, 0);
  } else {
    target.setHours(23, 59, 59, 999);
  }
  return target.getTime() < Date.now();
};

function CalendarPageContent() {
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
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

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
        headers: { Authorization: `Bearer ${idToken}` },
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
      setArticles(articles.map((a) => (a.id === article.id ? { ...a, ...data.article } : a)));
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
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!response.ok) throw new Error("Failed to unschedule");
      const data = await response.json();
      setArticles(articles.map((a) => (a.id === articleId ? { ...a, ...data.article } : a)));
      toast.success("Article unscheduled");
    } catch (error) {
      console.error("Error unscheduling:", error);
      toast.error("Failed to unschedule article");
    }
  };

  const handlePublishNow = async (articleId: string) => {
    try {
      const idToken = await user?.getIdToken();
      const response = await fetch(`/api/articles/${articleId}/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to publish");
      }
      const data = await response.json();
      setArticles(articles.map((a) => (a.id === articleId ? { ...a, ...data.article } : a)));
      toast.success("Article published!");
      setShowScheduleModal(false);
      setArticleToSchedule(null);
    } catch (error: any) {
      console.error("Error publishing:", error);
      toast.error(error.message || "Failed to publish");
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

  const handleDrop = (e: React.DragEvent, date: Date, hour?: number) => {
    e.preventDefault();
    if (!draggedArticle || draggedArticle.status === "published") {
      setHoveredCell(null);
      return;
    }

    // Prevent drops on past dates
    const dropDate = new Date(date);
    if (hour !== undefined) dropDate.setHours(hour, 0, 0, 0);
    if (isPastDate(dropDate, hour)) {
      toast.error("Impossible de planifier dans le passé");
      setDraggedArticle(null);
      setHoveredCell(null);
      return;
    }

    // If it's a reschedule of an already scheduled article and we have an hour, apply directly
    if (draggedArticle.status === "scheduled" && hour !== undefined) {
      const timeStr = `${hour.toString().padStart(2, "0")}:00`;
      handleSchedule(draggedArticle, dropDate, timeStr);
      setDraggedArticle(null);
      setHoveredCell(null);
      return;
    }

    // Otherwise open scheduling modal (for drafts or month view without hour)
    if (hour !== undefined) {
      setSelectedTime(`${hour.toString().padStart(2, "0")}:00`);
    }
    setSelectedDate(dropDate);
    setArticleToSchedule(draggedArticle);
    setShowScheduleModal(true);

    setDraggedArticle(null);
    setHoveredCell(null);
  };

  const getDaysInMonth = (date: Date): DayCell[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
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

  const getArticleAtHour = (articles: SavedArticle[], hour: number) => {
    return articles.filter((a) => {
      if (!a.scheduledAt) return false;
      const scheduled = new Date(a.scheduledAt);
      return scheduled.getHours() === hour;
    });
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

  const formatMonthYear = (date: Date) =>
    date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const formatWeekRange = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return `${startOfWeek.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - ${endOfWeek.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;
  };

  const unscheduledArticles = articles.filter((a) => a.status === "draft" && !a.scheduledAt);
  const days = viewMode === "month" ? getDaysInMonth(currentDate) : getWeekDays(currentDate);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full"
        />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Content Calendar
          </h1>
          <p className="text-slate-500 mt-1">Drag articles to schedule publication</p>
        </motion.div>

        <div className="flex gap-6">
          {/* Sidebar - Unscheduled Articles */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-72 flex-shrink-0"
          >
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 shadow-xl shadow-slate-200/50 p-5 sticky top-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <FileText className="w-5 h-5 text-indigo-500" />
                </motion.div>
                Unscheduled
                <span className="ml-auto bg-indigo-100 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  {unscheduledArticles.length}
                </span>
              </h3>

              <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-auto pr-1">
                <AnimatePresence mode="popLayout">
                  {unscheduledArticles.length === 0 ? (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-slate-400 text-center py-8"
                    >
                      No articles to schedule
                    </motion.p>
                  ) : (
                    unscheduledArticles.map((article, index) => (
                      <motion.div
                        key={article.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: index * 0.05 }}
                        draggable
                        onDragStart={(e: any) => handleDragStart(e, article)}
                        onDragEnd={() => setDraggedArticle(null)}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-3 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 cursor-grab active:cursor-grabbing group shadow-sm hover:shadow-md transition-shadow ${
                          draggedArticle?.id === article.id ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-4 h-4 text-slate-300 mt-0.5 group-hover:text-slate-500 transition-colors" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {article.title}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {article.wordCount} words
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Calendar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex-1"
          >
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 shadow-xl shadow-slate-200/50 overflow-hidden">
              {/* Calendar Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={navigatePrev}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                  </motion.button>

                  <motion.h2
                    key={currentDate.toISOString()}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-lg font-semibold text-slate-900 min-w-[220px] text-center capitalize"
                  >
                    {viewMode === "month" ? formatMonthYear(currentDate) : formatWeekRange(currentDate)}
                  </motion.h2>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={navigateNext}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentDate(new Date())}
                    className="ml-2 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Today
                  </motion.button>
                </div>

                {/* View Toggle */}
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                  {(["month", "week"] as ViewMode[]).map((mode) => (
                    <motion.button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`relative px-4 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize ${
                        viewMode === mode ? "text-white" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {viewMode === mode && (
                        <motion.div
                          layoutId="viewToggle"
                          className="absolute inset-0 bg-slate-900 rounded-lg"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <span className="relative z-10">{mode}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Month View */}
              <AnimatePresence mode="wait">
                {viewMode === "month" && (
                  <motion.div
                    key="month"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="p-4"
                  >
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {WEEK_DAYS.map((day) => (
                        <div key={day} className="text-center text-xs font-semibold text-slate-400 py-2 uppercase tracking-wider">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {days.map((day, index) => {
                        const cellId = `month-${day.date.toISOString()}`;
                        const isHovered = hoveredCell === cellId && draggedArticle;

                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.01 }}
                            onDragOver={(e) => {
                              handleDragOver(e);
                              setHoveredCell(cellId);
                            }}
                            onDragLeave={() => setHoveredCell(null)}
                            onDrop={(e) => handleDrop(e, day.date)}
                            className={`min-h-[100px] p-2 rounded-xl border transition-all duration-200 ${
                              day.isCurrentMonth
                                ? "bg-white border-slate-100"
                                : "bg-slate-50/50 border-slate-50"
                            } ${day.isToday ? "ring-2 ring-indigo-500 ring-offset-2" : ""} ${
                              isHovered ? "bg-indigo-50 border-indigo-300 scale-[1.02]" : ""
                            }`}
                          >
                            <div className={`text-sm font-medium mb-1 ${
                              day.isCurrentMonth ? "text-slate-900" : "text-slate-300"
                            } ${day.isToday ? "text-indigo-600" : ""}`}>
                              {day.date.getDate()}
                            </div>
                            <div className="space-y-1">
                              <AnimatePresence>
                                  {day.articles.slice(0, 2).map((article) => (
                                  <motion.div
                                    key={article.id}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    whileHover={{ scale: 1.05 }}
                                      draggable
                                      onDragStart={(e: any) => handleDragStart(e, article)}
                                      onDragEnd={() => setDraggedArticle(null)}
                                    onClick={() => {
                                      setArticleToSchedule(article);
                                      setSelectedDate(day.date);
                                      if (article.scheduledAt) {
                                        const scheduled = new Date(article.scheduledAt);
                                        setSelectedTime(`${scheduled.getHours().toString().padStart(2, "0")}:${scheduled.getMinutes().toString().padStart(2, "0")}`);
                                      }
                                      setShowScheduleModal(true);
                                    }}
                                    className="text-xs p-1.5 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-rose-500 text-white rounded-lg truncate cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                                  >
                                    {article.title}
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                              {day.articles.length > 2 && (
                                <div className="text-xs text-slate-400 font-medium">
                                  +{day.articles.length - 2} more
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Week View with Time Grid */}
                {viewMode === "week" && (
                  <motion.div
                    key="week"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="p-4"
                  >
                    {/* Day Headers */}
                    <div className="grid grid-cols-8 gap-1 mb-2 sticky top-0 bg-white/90 backdrop-blur-sm z-10 pb-2">
                      <div className="w-16" /> {/* Time column spacer */}
                      {days.map((day, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`text-center p-3 rounded-xl ${
                            day.isToday
                              ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg"
                              : "bg-slate-50"
                          }`}
                        >
                          <div className={`text-xs font-semibold uppercase tracking-wider ${
                            day.isToday ? "text-indigo-100" : "text-slate-400"
                          }`}>
                            {WEEK_DAYS[index]}
                          </div>
                          <div className={`text-2xl font-bold mt-1 ${
                            day.isToday ? "text-white" : "text-slate-900"
                          }`}>
                            {day.date.getDate()}
                          </div>
                          <div className={`text-xs mt-0.5 ${
                            day.isToday ? "text-indigo-100" : "text-slate-400"
                          }`}>
                            {day.date.toLocaleDateString("fr-FR", { month: "short" })}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Time Grid */}
                    <div className="max-h-[600px] overflow-auto rounded-xl border border-slate-100">
                      {HOURS.map((hour) => (
                        <div key={hour} className="grid grid-cols-8 gap-1 min-h-[60px]">
                          {/* Time Label */}
                          <div className="w-16 flex-shrink-0 text-right pr-3 py-2">
                            <span className="text-xs font-medium text-slate-400">
                              {hour.toString().padStart(2, "0")}:00
                            </span>
                          </div>

                          {/* Day Cells */}
                          {days.map((day, dayIndex) => {
                            const cellId = `week-${day.date.toISOString()}-${hour}`;
                            const isHovered = hoveredCell === cellId && draggedArticle;
                            const articlesAtHour = getArticleAtHour(day.articles, hour);
                            const isPast = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate(), hour) < new Date();

                            return (
                              <motion.div
                                key={`${dayIndex}-${hour}`}
                                onDragOver={(e) => {
                                  handleDragOver(e);
                                  setHoveredCell(cellId);
                                }}
                                onDragLeave={() => setHoveredCell(null)}
                                onDrop={(e) => handleDrop(e, day.date, hour)}
                                onClick={() => {
                                  if (!isPast) {
                                    setSelectedDate(day.date);
                                    setSelectedTime(`${hour.toString().padStart(2, "0")}:00`);
                                    setArticleToSchedule(null);
                                    setShowScheduleModal(true);
                                  }
                                }}
                                className={`relative border-t border-slate-100 p-1 transition-all duration-200 cursor-pointer ${
                                  isPast ? "bg-slate-50/50" : "hover:bg-slate-50"
                                } ${isHovered ? "bg-indigo-50 scale-[1.02]" : ""} ${
                                  hour % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                                }`}
                              >
                                <AnimatePresence>
                                  {articlesAtHour.map((article) => (
                                    <motion.div
                                      key={article.id}
                                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.8 }}
                                      whileHover={{ scale: 1.02 }}
                                      draggable
                                      onDragStart={(e: any) => handleDragStart(e, article)}
                                      onDragEnd={() => setDraggedArticle(null)}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setArticleToSchedule(article);
                                        setSelectedDate(day.date);
                                        if (article.scheduledAt) {
                                          const scheduled = new Date(article.scheduledAt);
                                          setSelectedTime(`${scheduled.getHours().toString().padStart(2, "0")}:${scheduled.getMinutes().toString().padStart(2, "0")}`);
                                        }
                                        setShowScheduleModal(true);
                                      }}
                                      className="p-2 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-rose-500 text-white rounded-lg text-xs font-medium shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                                    >
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>
                                          {new Date(article.scheduledAt!).toLocaleTimeString("fr-FR", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </span>
                                      </div>
                                      <div className="truncate mt-1">{article.title}</div>
                                    </motion.div>
                                  ))}
                                </AnimatePresence>
                              </motion.div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Schedule Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowScheduleModal(false);
              setArticleToSchedule(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                  {articleToSchedule ? "Schedule Article" : "Select Article"}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setShowScheduleModal(false);
                    setArticleToSchedule(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </motion.button>
              </div>

              {articleToSchedule ? (
                <>
                  <div className="mb-6 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Article</p>
                    <p className="font-semibold text-slate-900">{articleToSchedule.title}</p>
                    <p className="text-sm text-slate-500 mt-1">{articleToSchedule.wordCount} words</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                      <input
                        type="date"
                        value={selectedDate ? selectedDate.toISOString().split("T")[0] : new Date().toISOString().split("T")[0]}
                        onChange={(e) => setSelectedDate(new Date(e.target.value))}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Time</label>
                      <input
                        type="time"
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    {articleToSchedule.status === "scheduled" && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          handleUnschedule(articleToSchedule.id);
                          setShowScheduleModal(false);
                          setArticleToSchedule(null);
                        }}
                        className="flex-1 px-4 py-3 border-2 border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Unschedule
                      </motion.button>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handlePublishNow(articleToSchedule.id)}
                      className="flex-1 px-4 py-3 border-2 border-green-200 text-green-600 rounded-xl font-semibold hover:bg-green-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Publish Now
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSchedule(articleToSchedule, selectedDate || new Date(), selectedTime)}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-rose-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <CalendarIcon className="w-4 h-4" />
                      {articleToSchedule.status === "scheduled" ? "Update" : "Schedule"}
                    </motion.button>
                  </div>
                </>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-auto">
                  <p className="text-sm text-slate-500 mb-4">
                    Select an article to schedule for{" "}
                    <span className="font-semibold text-slate-900">
                      {selectedDate?.toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}{" "}
                      at {selectedTime}
                    </span>
                  </p>
                  {unscheduledArticles.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">No articles available</p>
                  ) : (
                    unscheduledArticles.map((article) => (
                      <motion.button
                        key={article.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setArticleToSchedule(article)}
                        className="w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-xl text-left transition-colors"
                      >
                        <p className="font-medium text-slate-900">{article.title}</p>
                        <p className="text-sm text-slate-500 mt-1">{article.wordCount} words</p>
                      </motion.button>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Wrapper with Suspense for useSearchParams
export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full"
          />
        </div>
      }
    >
      <CalendarPageContent />
    </Suspense>
  );
}
