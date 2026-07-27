'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface SSEOptions {
  url: string;
  token: string | null;
  onMessage?: (event: string, data: unknown) => void;
  enabled?: boolean;
  reconnectInterval?: number;
}

export function useSSE({ url, token, onMessage, enabled = true, reconnectInterval = 3000 }: SSEOptions) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!token || !enabled) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const separator = url.includes('?') ? '&' : '?';
    const fullUrl = `${url}${separator}token=${encodeURIComponent(token)}`;

    const eventSource = new EventSource(fullUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onMessage?.(parsed.event || 'message', parsed.data || parsed);
      } catch {
        onMessage?.('message', event.data);
      }
    };

    // Listen for typed events
    eventSource.addEventListener('location_update', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        onMessage?.('location_update', data);
      } catch { /* ignore parse errors */ }
    });

    eventSource.addEventListener('trip_status', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        onMessage?.('trip_status', data);
      } catch { /* ignore */ }
    });

    eventSource.addEventListener('trip_assigned', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        onMessage?.('trip_assigned', data);
      } catch { /* ignore */ }
    });

    eventSource.addEventListener('dashboard_update', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        onMessage?.('dashboard_update', data);
      } catch { /* ignore */ }
    });

    eventSource.onerror = () => {
      setConnected(false);
      setError('Connection lost. Reconnecting...');
      eventSource.close();

      // Reconnect after delay
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, reconnectInterval);
    };
  }, [url, token, onMessage, enabled, reconnectInterval]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return { connected, error };
}
