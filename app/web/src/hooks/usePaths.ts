import { useEffect, useState } from "react";
import { fetchPath } from "../api/client";
import type { PathResponse, RouteResponse } from "../api/schemas";
import { isModelledSeaLeg, pathKey, type PathMap } from "../pathDetail";

interface Request {
  key: string;
  from: string;
  to: string;
  scenario: string;
}

export interface UseSeaPathsReturn {
  paths: PathMap;
  notice: string | null;
}

const cache = new Map<string, PathResponse>();

function requestsFor(route: RouteResponse | null, scenario: string): Request[] {
  if (!route) return [];
  const scenarios = scenario === "open" ? ["open"] : [scenario, "open"];
  const requests = new Map<string, Request>();
  for (const leg of route.legs.filter(isModelledSeaLeg)) {
    for (const s of scenarios) {
      const key = pathKey(leg.from_node, leg.to_node, s);
      requests.set(key, {
        key,
        from: leg.from_node,
        to: leg.to_node,
        scenario: s,
      });
    }
  }
  return [...requests.values()];
}

/** The real sea paths of the route's modelled sea legs, for the scenario and for `open`. */
export function useSeaPaths(
  route: RouteResponse | null,
  scenario: string,
): UseSeaPathsReturn {
  const [paths, setPaths] = useState<PathMap>(new Map());
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const requests = requestsFor(route, scenario);
    const snapshot = (): PathMap =>
      new Map(
        requests.flatMap((r) => {
          const path = cache.get(r.key);
          return path ? [[r.key, path] as const] : [];
        }),
      );
    const controller = new AbortController();

    setPaths(snapshot());
    setFailed(false);

    for (const r of requests.filter((q) => !cache.has(q.key))) {
      fetchPath(r.from, r.to, r.scenario, controller.signal)
        .then((path) => {
          cache.set(r.key, path);
          if (!controller.signal.aborted) setPaths(snapshot());
        })
        .catch(() => {
          if (!controller.signal.aborted) setFailed(true);
        });
    }
    return () => controller.abort();
  }, [route, scenario]);

  let notice: string | null = null;
  if (failed) notice = "Sea path unavailable; showing straight lines.";
  else if ([...paths.values()].some((p) => !p.km_matches))
    notice =
      "A sea path does not match its stored distance; showing a straight line.";
  return { paths, notice };
}
