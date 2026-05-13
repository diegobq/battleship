'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export type WsConnectionState = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

export interface UseWebSocketOptions {
  url: string | null;
  onMessage?: (data: string) => void;
  maxReconnects?: number;
  baseBackoffMs?: number;
}

export interface UseWebSocketReturn {
  state: WsConnectionState;
  send: (data: string) => boolean;
}

export function useWebSocket(opts: UseWebSocketOptions): UseWebSocketReturn {
  const { url, onMessage, maxReconnects = 5, baseBackoffMs = 1_000 } = opts;
  const [state, setState] = useState<WsConnectionState>(url ? 'connecting' : 'idle');
  const socketRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!url) return;
    let attempts = 0;
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect(): void {
      if (cancelled) return;
      setState('connecting');
      const ws = new WebSocket(url!);
      socketRef.current = ws;

      ws.onopen = () => {
        attempts = 0;
        setState('open');
      };
      ws.onmessage = (e) => {
        const data = typeof e.data === 'string' ? e.data : '';
        if (data) onMessageRef.current?.(data);
      };
      ws.onerror = () => setState('error');
      ws.onclose = () => {
        if (cancelled) return;
        setState('closed');
        if (attempts < maxReconnects) {
          const delay = baseBackoffMs * Math.pow(2, attempts);
          attempts += 1;
          reconnectTimer = setTimeout(connect, delay);
        }
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socketRef.current?.close();
    };
  }, [url, maxReconnects, baseBackoffMs]);

  const send = useCallback((data: string): boolean => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
      return true;
    }
    return false;
  }, []);

  return { state, send };
}
