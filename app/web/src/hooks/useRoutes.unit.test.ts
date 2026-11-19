import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRoutes } from "./useRoutes";

const validResponse = {
  vessel_direct: [],
  vessel_feeder: [],
  air: [],
  truck: [],
  rail: [],
  vessel_direct_clustered: null,
  vessel_feeder_clustered: null,
  air_clustered: null,
  truck_clustered: null,
  rail_clustered: null,
  comparison: null,
  factors: {},
  commodity: null,
  query: {
    origin: "BGD",
    destination: "TX",
    cargo_t: null,
    scenario: "open",
    modes: ["vessel"],
    inland_mode: "truck",
  },
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useRoutes", () => {
  it("starts with null data and no loading", () => {
    const { result } = renderHook(() => useRoutes());
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets data on successful fetch", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(validResponse),
    });

    const { result } = renderHook(() => useRoutes());

    await act(async () => {
      await result.current.fetch({ origin: "BGD", destination: "TX" });
    });

    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.query.origin).toBe("BGD");
    expect(result.current.loading).toBe(false);
  });

  it("sets error on failed fetch", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: () => Promise.resolve("boom"),
    });

    const { result } = renderHook(() => useRoutes());

    await act(async () => {
      await result.current.fetch({ origin: "BGD", destination: "TX" });
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain("500");
    expect(result.current.loading).toBe(false);
  });
});
