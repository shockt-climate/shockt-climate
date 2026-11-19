import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { RouteResponse } from "../api/schemas";
import { useSeaPaths } from "./usePaths";

function pathBody(from: string, scenario: string, km = 100, matches = true) {
  return {
    from_node: from,
    to_node: "eu_seaport:NLRTM",
    scenario,
    coordinates: [
      [1, 2],
      [3, 4],
    ],
    km,
    stored_km: matches ? km : km + 50,
    km_matches: matches,
    passages: ["suez"],
    closed: ["northwest"],
    source: "searoute 1.6.0",
  };
}

function route(
  from: string,
  basis: "modelled" | "observed" = "modelled",
): RouteResponse {
  return {
    legs: [
      {
        name: "A → B",
        from_node: from,
        to_node: "eu_seaport:NLRTM",
        from_name: "A",
        to_name: "B",
        from_lat: 1,
        from_lon: 2,
        to_lat: 3,
        to_lon: 4,
        network: "sea",
        mode: "ocean",
        km: 100,
        duration_h: 4,
        wtw_kg_co2e_per_tkm: 0.02,
        wtw_kg_co2e_per_t: 2,
        share_of_route: 1,
        factor: {
          source: "uk_desnz",
          source_row_id: "r1",
          variant: "v",
          vehicle_type: "container_ship",
          size_class: "average",
        },
        distance_basis: basis,
        distance_source: "searoute 1.6.0",
        passages: [],
      },
    ],
    total_wtw_kg_co2e_per_t: 2,
    total_wtw_kg_co2e: null,
    total_km: 100,
    total_duration_h: 4,
    passages: [],
    scenario: "open",
    traffic_volume: null,
  };
}

function okResponse(body: unknown) {
  return { ok: true, json: () => Promise.resolve(body) };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useSeaPaths", () => {
  it("fetches nothing without a route", () => {
    const { result } = renderHook(() => useSeaPaths(null, "open"));
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.paths.size).toBe(0);
    expect(result.current.notice).toBeNull();
  });

  it("fetches only the active scenario when it is open", async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse(pathBody("departure_port:ONE", "open")) as Response,
    );
    const r = route("departure_port:ONE");
    const { result } = renderHook(() => useSeaPaths(r, "open"));
    await waitFor(() => expect(result.current.paths.size).toBe(1));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("also fetches the open baseline for another scenario", async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      const scenario =
        new URL(String(url), "http://x").searchParams.get("scenario") ?? "";
      return Promise.resolve(
        okResponse(pathBody("departure_port:TWO", scenario)) as Response,
      );
    });
    const r = route("departure_port:TWO");
    const { result } = renderHook(() => useSeaPaths(r, "red_sea_closed"));
    await waitFor(() => expect(result.current.paths.size).toBe(2));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not fetch observed legs", () => {
    const r = route("departure_port:THREE", "observed");
    renderHook(() => useSeaPaths(r, "open"));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("serves a repeated request from the cache", async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse(pathBody("departure_port:FOUR", "open")) as Response,
    );
    const r = route("departure_port:FOUR");
    const first = renderHook(() => useSeaPaths(r, "open"));
    await waitFor(() => expect(first.result.current.paths.size).toBe(1));
    const second = renderHook(() => useSeaPaths(r, "open"));
    await waitFor(() => expect(second.result.current.paths.size).toBe(1));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reports a notice when a fetch fails", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "err",
      text: () => Promise.resolve("boom"),
    } as Response);
    const r = route("departure_port:FIVE");
    const { result } = renderHook(() => useSeaPaths(r, "open"));
    await waitFor(() => expect(result.current.notice).toMatch(/unavailable/));
  });

  it("reports a notice when a path does not match its stored distance", async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse(
        pathBody("departure_port:SIX", "open", 100, false),
      ) as Response,
    );
    const r = route("departure_port:SIX");
    const { result } = renderHook(() => useSeaPaths(r, "open"));
    await waitFor(() =>
      expect(result.current.notice).toMatch(/does not match/),
    );
  });
});
