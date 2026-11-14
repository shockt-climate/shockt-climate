import { useCallback, useEffect, useRef, useState } from "react";
import type { NodeResult } from "../api/schemas";
import { searchNodes } from "../api/client";

const DEBOUNCE_MS = 300;

export interface UseNodesReturn {
  results: readonly NodeResult[];
  loading: boolean;
  search: (q: string, kind?: string) => void;
  clear: () => void;
}

export function useNodes(): UseNodesReturn {
  const [results, setResults] = useState<readonly NodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const abortRef = useRef<AbortController>(null);

  const clear = useCallback(() => {
    setResults([]);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const search = useCallback((q: string, kind?: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const nodes = await searchNodes(q, kind, 20, controller.signal);
        if (!controller.signal.aborted) {
          setResults(nodes);
        }
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { results, loading, search, clear };
}
