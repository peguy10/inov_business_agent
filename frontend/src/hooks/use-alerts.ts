"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Alert } from "@/lib/types";

interface AlertsResponse {
  alerts: Alert[];
  unread_count: number;
}

export function useAlerts(pollIntervalMs = 60000) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await api.get<AlertsResponse>("/alerts?unread_only=true&per_page=10");
      setAlerts(data.alerts);
      setUnreadCount(data.unread_count);
    } catch {
      // silently ignore - alerts are a non-critical enhancement
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();

    if (pollIntervalMs <= 0) return;

    const interval = setInterval(fetchAlerts, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchAlerts, pollIntervalMs]);

  const markRead = useCallback(async (id: number) => {
    await api.post(`/alerts/${id}/read`);
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await api.post("/alerts/read-all");
    setAlerts([]);
    setUnreadCount(0);
  }, []);

  return { alerts, unreadCount, isLoading, refresh: fetchAlerts, markRead, markAllRead };
}
