import { useEffect, useState } from "react";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

interface DisruptionEntry {
  passage: string;
  status: string;
  since_date: string | null;
  description: string | null;
}

export interface UseDisruptionsReturn {
  disruptedPassages: ReadonlySet<string>;
  loading: boolean;
}

export function useDisruptions(): UseDisruptionsReturn {
  const [disrupted, setDisrupted] = useState<ReadonlySet<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(`${BASE_URL}/disruptions`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: DisruptionEntry[]) => {
        if (cancelled) return;
        const set = new Set<string>();
        for (const d of data) {
          if (d.status === "disrupted") set.add(d.passage);
        }
        setDisrupted(set);
      })
      .catch(() => {
        if (!cancelled) setDisrupted(new Set());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { disruptedPassages: disrupted, loading };
}
