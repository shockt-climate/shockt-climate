import { useCallback, useState } from "react";
import type { RoutesResponse } from "../api/schemas";
import { fetchRoutes, type RoutesParams } from "../api/client";

export interface UseRoutesReturn {
  data: RoutesResponse | null;
  loading: boolean;
  error: string | null;
  fetch: (params: RoutesParams) => Promise<void>;
}

export function useRoutes(): UseRoutesReturn {
  const [data, setData] = useState<RoutesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doFetch = useCallback(async (params: RoutesParams) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRoutes(params);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetch: doFetch };
}
