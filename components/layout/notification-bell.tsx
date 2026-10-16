"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, ExternalLink, AlertTriangle, ShieldAlert, Info, Layers } from "lucide-react";
import Link from "next/link";
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

export function NotificationBell() {
  const { t, isRtl } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?limit=5");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setNotifications(json.data.items || []);
          setUnreadCount(json.data.unreadCount || 0);
        }
      }
    } catch {
      // Quiet background polling error suppression
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s polling
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
      setIsLoading(true);
      const res = await fetch("/api/notifications/mark-all-read", { method: "POST" });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "LOW_STOCK":
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />;
      case "COMPLIANCE":
        return <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />;
      case "EXPIRY_WARNING":
        return <Layers className="h-3.5 w-3.5 text-orange-600" />;
      default:
        return <Info className="h-3.5 w-3.5 text-teal-600" />;
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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        aria-label="View notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 font-mono text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute top-full mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden ${
            isRtl ? "left-0" : "right-0"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-800">
                {t.notifications?.title ?? "Notifications"}
              </span>
              {unreadCount > 0 && (
                <span className="rounded bg-rose-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-rose-800">
                  {unreadCount} {t.notifications?.unread ?? "unread"}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={isLoading}
                className="text-[11px] font-medium text-teal-700 hover:text-teal-900 transition-colors disabled:opacity-50"
              >
                {t.notifications?.markAllRead ?? "Mark all read"}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {t.notifications?.noNotifications ?? "No notifications"}
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 transition-colors hover:bg-slate-50/80 ${
                    !n.isRead ? "bg-teal-50/30" : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="flex-shrink-0">{getTypeIcon(n.type)}</span>
                      <span
                        className={`inline-block rounded border px-1.5 py-0.2 font-mono text-[9px] font-semibold uppercase ${getTypeBadgeStyle(
                          n.type
                        )}`}
                      >
                        {n.type.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(n.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {!n.isRead && (
                        <button
                          onClick={(e) => markAsRead(n.id, e)}
                          title="Mark as read"
                          className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="mt-1 text-xs font-semibold text-slate-900">{n.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 line-clamp-2">
                    {n.message}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50/60 p-2 text-center">
            <Link
              href="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors"
            >
              <span>{t.notifications?.viewAll ?? "View all notifications"}</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
