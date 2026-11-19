import { describe, expect, it } from "vitest";
import type { LegResponse, PathResponse } from "./api/schemas";
import {
  isModelledSeaLeg,
  pathDetail,
  pathKey,
  usablePath,
} from "./pathDetail";

const leg: LegResponse = {
  name: "Barisal → Rotterdam",
  from_node: "departure_port:BGD_1",
  to_node: "eu_seaport:NLRTM",
  from_name: "Barisal",
  to_name: "Rotterdam",
  from_lat: 22.5,
  from_lon: 89.6,
  to_lat: 51.9,
  to_lon: 4.5,
  network: "sea",
  mode: "ocean",
  km: 21748.3,
  duration_h: 939,
  wtw_kg_co2e_per_tkm: 0.01977,
  wtw_kg_co2e_per_t: 430,
  share_of_route: 1,
  factor: {
    source: "uk_desnz",
    source_row_id: "r1",
    variant: "Container ship / Average",
    vehicle_type: "container_ship",
    size_class: "average",
  },
  distance_basis: "modelled",
  distance_source: "searoute 1.6.0",
  passages: ["south_africa"],
};

function path(overrides: Partial<PathResponse>): PathResponse {
  return {
    from_node: leg.from_node,
    to_node: leg.to_node,
    scenario: "open",
    coordinates: [
      [22.5, 89.6],
      [51.9, 4.5],
    ],
    km: 14915.9,
    stored_km: 14915.9,
    km_matches: true,
    passages: ["babalmandab", "gibraltar", "suez"],
    closed: ["northwest"],
    source: "searoute 1.6.0",
    ...overrides,
  };
}

const open = path({});
const closed = path({
  scenario: "red_sea_closed",
  km: 21748.3,
  stored_km: 21748.3,
  passages: ["south_africa"],
  closed: ["northwest", "babalmandab"],
});

function paths(...list: PathResponse[]) {
  return new Map(
    list.map((p) => [pathKey(p.from_node, p.to_node, p.scenario), p] as const),
  );
}

describe("isModelledSeaLeg", () => {
  it("is true only for modelled sea legs", () => {
    expect(isModelledSeaLeg(leg)).toBe(true);
    expect(isModelledSeaLeg({ ...leg, distance_basis: "observed" })).toBe(
      false,
    );
    expect(isModelledSeaLeg({ ...leg, network: "road" })).toBe(false);
  });
});

describe("usablePath", () => {
  it("ignores a path that does not match its stored distance", () => {
    const bad = path({ km_matches: false });
    expect(usablePath(leg, "open", paths(bad))).toBeUndefined();
    expect(usablePath(leg, "open", paths(open))).toBe(open);
  });
});

describe("pathDetail", () => {
  it("is null while the path has not loaded", () => {
    expect(pathDetail(leg, "red_sea_closed", new Map())).toBeNull();
  });

  it("reports the avoided passage, the diversion and the extra km", () => {
    const detail = pathDetail(leg, "red_sea_closed", paths(open, closed));
    expect(detail?.avoided).toEqual(["babalmandab"]);
    expect(detail?.divertedVia).toEqual(["south_africa"]);
    expect(detail?.openPassages).toEqual(["babalmandab", "gibraltar", "suez"]);
    expect(detail?.extraKm).toBeCloseTo(6832.4, 1);
  });

  it("has no comparison under the open scenario", () => {
    const detail = pathDetail(leg, "open", paths(open));
    expect(detail?.avoided).toEqual([]);
    expect(detail?.extraKm).toBeNull();
  });

  it("falls back to the diversion alone when the open baseline is missing", () => {
    const detail = pathDetail(leg, "red_sea_closed", paths(closed));
    expect(detail?.divertedVia).toEqual(["south_africa"]);
    expect(detail?.avoided).toEqual([]);
    expect(detail?.extraKm).toBeNull();
  });

  it("does not list a closed passage the open route never used", () => {
    const panama = path({
      scenario: "panama_closed",
      closed: ["northwest", "panama"],
    });
    const detail = pathDetail(leg, "panama_closed", paths(open, panama));
    expect(detail?.avoided).toEqual([]);
  });
});
