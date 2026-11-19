import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCountries, fetchPath, fetchRoutes, searchNodes } from "./client";

const validRoutesResponse = {
  vessel_direct: [],
  vessel_feeder: [],
  air: [],
  truck: [],
  rail: [],
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

function mockFetch(body: unknown, status = 200) {
  (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe("fetchRoutes", () => {
  it("builds query params and decodes response", async () => {
    mockFetch(validRoutesResponse);

    const result = await fetchRoutes({
      origin: "BGD",
      destination: "TX",
    });

    expect(result.query.origin).toBe("BGD");

    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("origin=BGD");
    expect(url).toContain("destination=TX");
  });

  it("includes optional params when set", async () => {
    mockFetch(validRoutesResponse);

    await fetchRoutes({
      origin: "BGD",
      destination: "TX",
      cargo_t: 10,
      modes: "vessel",
      scenario: "suez_closed",
      compare_scenario: "open",
    });

    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("cargo_t=10");
    expect(url).toContain("modes=vessel");
    expect(url).toContain("scenario=suez_closed");
    expect(url).toContain("compare_scenario=open");
  });

  it("throws on non-ok response", async () => {
    mockFetch({ detail: "Not found" }, 404);
    await expect(fetchRoutes({ origin: "BGD", destination: "TX" })).rejects.toThrow(
      "API 404"
    );
  });

  it("throws on invalid response shape", async () => {
    mockFetch({ not: "valid" });
    await expect(
      fetchRoutes({ origin: "BGD", destination: "TX" })
    ).rejects.toThrow();
  });
});

describe("searchNodes", () => {
  it("decodes node results", async () => {
    mockFetch([
      {
        node_id: "departure_port:BGD_100",
        kind: "departure_port",
        name: "Chittagong",
        iso3: "BGD",
        lat: 22.33,
        lon: 91.8,
      },
    ]);

    const result = await searchNodes("Chittagong");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Chittagong");
  });

  it("includes kind parameter when provided", async () => {
    mockFetch([]);
    await searchNodes("BGD", "departure_port");

    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("kind=departure_port");
  });
});

describe("fetchCountries", () => {
  it("decodes country results", async () => {
    mockFetch([
      { iso3: "BGD", name: "Bangladesh", modes: ["vessel", "air"] },
    ]);

    const result = await fetchCountries();
    expect(result).toHaveLength(1);
    expect(result[0].iso3).toBe("BGD");
  });
});

describe("fetchPath", () => {
  it("requests the path for a node pair and scenario", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          from_node: "a",
          to_node: "b",
          scenario: "red_sea_closed",
          coordinates: [
            [1, 2],
            [3, 4],
          ],
          km: 10,
          stored_km: 10,
          km_matches: true,
          passages: ["south_africa"],
          closed: ["northwest", "babalmandab"],
          source: "searoute 1.6.0",
        }),
    } as Response);
    const path = await fetchPath("a", "b", "red_sea_closed");
    expect(path.passages).toEqual(["south_africa"]);
    const url = String(vi.mocked(fetch).mock.calls[0]?.[0]);
    expect(url).toContain("/routes/path?");
    expect(url).toContain("scenario=red_sea_closed");
  });

  it("rejects a response with the wrong shape", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ from_node: "a" }),
    } as Response);
    await expect(fetchPath("a", "b", "open")).rejects.toThrow();
  });
});
