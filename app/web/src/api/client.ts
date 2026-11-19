import { Schema } from "effect";
import type {
  NodeResult,
  PathResponse,
  RoutesResponse,
  CountryResult,
} from "./schemas";
import {
  NodeResult as NodeResultSchema,
  RoutesResponse as RoutesResponseSchema,
  CountryResult as CountryResultSchema,
  PathResponse as PathResponseSchema,
} from "./schemas";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

async function fetchJson(
  url: string,
  signal?: AbortSignal
): Promise<unknown> {
  const response = await fetch(url, signal ? { signal } : undefined);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `API ${response.status}: ${text.slice(0, 200) || response.statusText}`
    );
  }
  return response.json();
}

export interface RoutesParams {
  origin: string;
  destination: string;
  cargo_t?: number;
  modes?: string;
  inland_mode?: string;
  scenario?: string;
  compare_scenario?: string;
  hs6?: string;
  limit?: number;
  collapse?: boolean;
  collapse_pct?: number;
}

export async function fetchRoutes(
  params: RoutesParams
): Promise<RoutesResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("origin", params.origin);
  searchParams.set("destination", params.destination);
  if (params.cargo_t != null) searchParams.set("cargo_t", String(params.cargo_t));
  if (params.modes) searchParams.set("modes", params.modes);
  if (params.inland_mode) searchParams.set("inland_mode", params.inland_mode);
  if (params.scenario) searchParams.set("scenario", params.scenario);
  if (params.compare_scenario)
    searchParams.set("compare_scenario", params.compare_scenario);
  if (params.hs6) searchParams.set("hs6", params.hs6);
  if (params.limit != null) searchParams.set("limit", String(params.limit));
  if (params.collapse != null) searchParams.set("collapse", String(params.collapse));
  if (params.collapse_pct != null) searchParams.set("collapse_pct", String(params.collapse_pct));

  const json = await fetchJson(`${BASE_URL}/routes?${searchParams}`);
  return Schema.decodeUnknownSync(RoutesResponseSchema)(json);
}

export async function searchNodes(
  q: string,
  kind?: string,
  limit = 20,
  signal?: AbortSignal
): Promise<readonly NodeResult[]> {
  const searchParams = new URLSearchParams({ q, limit: String(limit) });
  if (kind) searchParams.set("kind", kind);

  const json = await fetchJson(
    `${BASE_URL}/nodes/search?${searchParams}`,
    signal
  );
  return Schema.decodeUnknownSync(Schema.Array(NodeResultSchema))(json);
}

export async function fetchCountries(): Promise<readonly CountryResult[]> {
  const json = await fetchJson(`${BASE_URL}/countries`);
  return Schema.decodeUnknownSync(Schema.Array(CountryResultSchema))(json);
}

export async function fetchPath(
  from: string,
  to: string,
  scenario: string,
  signal?: AbortSignal
): Promise<PathResponse> {
  const searchParams = new URLSearchParams({
    from_node: from,
    to_node: to,
    scenario,
  });
  const json = await fetchJson(`${BASE_URL}/routes/path?${searchParams}`, signal);
  return Schema.decodeUnknownSync(PathResponseSchema)(json);
}
