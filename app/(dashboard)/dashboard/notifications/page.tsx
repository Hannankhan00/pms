"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  ShieldAlert,
  Info,
  Layers,
  Filter,
  RefreshCw,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface NotificationItem {
  id: string;
  type: "SYSTEM" | "LOW_STOCK" | "EXPIRY_WARNING" | "COMPLIANCE";
  title: string;
  message: string;
  isRead: boolean;
  referenceId?: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      let url = "/api/notifications?limit=50";
      if (activeFilter === "UNREAD") {
        url += "&isRead=false";
      } else if (activeFilter !== "ALL") {
        url += `&type=${activeFilter}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setNotifications(json.data.items || []);
          setTotal(json.data.total || 0);
          setUnreadCount(json.data.unreadCount || 0);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [activeFilter]);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // Ignore
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications/mark-all-read", { method: "POST" });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {
      // Ignore
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "LOW_STOCK":
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case "COMPLIANCE":
        return <ShieldAlert className="h-4 w-4 text-rose-600" />;
      case "EXPIRY_WARNING":
        return <Layers className="h-4 w-4 text-orange-600" />;
      default:
        return <Info className="h-4 w-4 text-teal-600" />;
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case "LOW_STOCK":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "COMPLIANCE":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "EXPIRY_WARNING":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-teal-50 text-teal-700 border-teal-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t.notifications?.title ?? "Notifications & System Alerts"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t.notifications?.subtitle ??
              "Real-time operational alerts, inventory threshold notifications, and compliance monitoring."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchNotifications}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>{t.common?.refresh ?? "Refresh"}</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition-colors shadow-sm"
            >
              <CheckCheck className="h-4 w-4" />
              <span>{t.notifications?.markAllRead ?? "Mark All as Read"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <Filter className="h-4 w-4 text-slate-400 mr-1" />
        {[
          { key: "ALL", label: t.notifications?.all ?? "All" },
          { key: "UNREAD", label: `${t.notifications?.unread ?? "Unread"} (${unreadCount})` },
          { key: "LOW_STOCK", label: t.notifications?.lowStock ?? "Low Stock" },
          { key: "COMPLIANCE", label: t.notifications?.compliance ?? "Compliance" },
          { key: "EXPIRY_WARNING", label: t.notifications?.expiryWarning ?? "Expiry" },
          { key: "SYSTEM", label: t.notifications?.system ?? "System" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeFilter === tab.key
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-teal-600" />
            <span>Loading alerts...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="h-8 w-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {t.notifications?.noNotifications ?? "No notifications found"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              All systems are normal. No active threshold alerts or warnings.
            </p>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`p-4 transition-colors flex items-start justify-between gap-4 ${
                !item.isRead ? "bg-teal-50/20" : "bg-white hover:bg-slate-50/60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  {getTypeIcon(item.type)}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${getTypeBadgeStyle(
                        item.type
                      )}`}
                    >
                      {item.type.replace("_", " ")}
                    </span>
                    {!item.isRead && (
                      <span className="flex h-2 w-2 rounded-full bg-teal-600" />
                    )}
                    <span className="font-mono text-xs text-slate-400">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="mt-1 text-sm font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-0.5 text-xs text-slate-600 leading-relaxed max-w-2xl">
                    {item.message}
                  </p>

                  {item.referenceId && (
                    <div className="mt-2 text-[11px] font-mono text-slate-400">
                      Reference ID: {item.referenceId}
                    </div>
                  )}
                </div>
              </div>

              {!item.isRead && (
                <button
                  onClick={() => markAsRead(item.id)}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors"
                >
                  <Check className="h-3.5 w-3.5 text-teal-600" />
                  <span>{t.notifications?.markRead ?? "Mark read"}</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
