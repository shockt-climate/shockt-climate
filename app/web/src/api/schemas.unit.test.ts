import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import {
  LegResponse,
  RouteResponse,
  ComparisonRoute,
  RoutesResponse,
  NodeResult,
  CountryResult,
  FactorInfo,
} from "./schemas";

const validLeg = {
  name: "Chittagong → Los Angeles",
  from_node: "departure_port:BGD_100",
  to_node: "arrival_seaport:2704",
  from_name: "Chittagong",
  to_name: "Los Angeles",
  from_lat: 22.33,
  from_lon: 91.8,
  to_lat: 33.74,
  to_lon: -118.27,
  network: "sea",
  mode: "ocean",
  km: 18950,
  duration_h: 456,
  wtw_kg_co2e_per_tkm: 0.0158,
  wtw_kg_co2e_per_t: 299.4,
  share_of_route: 0.56,
  factor: {
    source: "uk_desnz",
    source_row_id: "uk_1",
    variant: "Container ship / Average",
    vehicle_type: "container_ship",
    size_class: "average",
  },
  distance_basis: "modelled",
  distance_source: "searoute 1.6.0",
  passages: ["babalmandab", "suez", "gibraltar"],
};

const validRoute = {
  legs: [validLeg],
  total_wtw_kg_co2e_per_t: 535.5,
  total_wtw_kg_co2e: null,
  total_km: 21150,
  total_duration_h: 478.5,
  passages: ["babalmandab", "suez"],
  scenario: "open",
  traffic_volume: null,
};

describe("LegResponse schema", () => {
  it("decodes a valid leg", () => {
    const result = Schema.decodeUnknownSync(LegResponse)(validLeg);
    expect(result.name).toBe("Chittagong → Los Angeles");
    expect(result.km).toBe(18950);
    expect(result.passages).toHaveLength(3);
  });

  it("accepts null duration_h", () => {
    const result = Schema.decodeUnknownSync(LegResponse)({
      ...validLeg,
      duration_h: null,
    });
    expect(result.duration_h).toBeNull();
  });

  it("rejects missing required fields", () => {
    const { name: _, ...noName } = validLeg;
    expect(() => Schema.decodeUnknownSync(LegResponse)(noName)).toThrow();
  });
});

describe("RouteResponse schema", () => {
  it("decodes a valid route", () => {
    const result = Schema.decodeUnknownSync(RouteResponse)(validRoute);
    expect(result.total_wtw_kg_co2e_per_t).toBe(535.5);
    expect(result.scenario).toBe("open");
  });

  it("accepts null total_wtw_kg_co2e", () => {
    const result = Schema.decodeUnknownSync(RouteResponse)(validRoute);
    expect(result.total_wtw_kg_co2e).toBeNull();
  });
});

describe("ComparisonRoute schema", () => {
  it("decodes a matched pair", () => {
    const result = Schema.decodeUnknownSync(ComparisonRoute)({
      primary: validRoute,
      compare: validRoute,
      delta_wtw_kg_co2e_per_t: 12.3,
      note: null,
    });
    expect(result.delta_wtw_kg_co2e_per_t).toBe(12.3);
  });

  it("accepts null primary for compare-only routes", () => {
    const result = Schema.decodeUnknownSync(ComparisonRoute)({
      primary: null,
      compare: validRoute,
      delta_wtw_kg_co2e_per_t: null,
      note: "Route not available under open",
    });
    expect(result.primary).toBeNull();
    expect(result.note).toContain("not available");
  });
});

describe("RoutesResponse schema", () => {
  it("decodes a full response", () => {
    const response = {
      vessel_direct: [validRoute],
      vessel_feeder: [],
      air: [],
      truck: [],
      rail: [],
      comparison: null,
      factors: {
        ocean: {
          source: "uk_desnz",
          vehicle_type: "container_ship",
          size_class: "average",
          wtw: 0.0158,
        },
      },
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
    const result = Schema.decodeUnknownSync(RoutesResponse)(response);
    expect(result.vessel_direct).toHaveLength(1);
    expect(result.query.origin).toBe("BGD");
  });
});

describe("NodeResult schema", () => {
  it("decodes a node", () => {
    const result = Schema.decodeUnknownSync(NodeResult)({
      node_id: "departure_port:BGD_100",
      kind: "departure_port",
      name: "Chittagong",
      iso3: "BGD",
      lat: 22.33,
      lon: 91.8,
    });
    expect(result.node_id).toBe("departure_port:BGD_100");
  });
});

describe("CountryResult schema", () => {
  it("decodes a country", () => {
    const result = Schema.decodeUnknownSync(CountryResult)({
      iso3: "BGD",
      name: "Bangladesh",
      modes: ["vessel", "air"],
    });
    expect(result.iso3).toBe("BGD");
    expect(result.modes).toEqual(["vessel", "air"]);
  });
});

describe("FactorInfo schema", () => {
  it("decodes a factor", () => {
    const result = Schema.decodeUnknownSync(FactorInfo)({
      source: "uk_desnz",
      vehicle_type: "container_ship",
      size_class: "average",
      wtw: 0.0158,
    });
    expect(result.source).toBe("uk_desnz");
    expect(result.wtw).toBe(0.0158);
  });

  it("accepts null size_class", () => {
    const result = Schema.decodeUnknownSync(FactorInfo)({
      source: "epa_hub",
      vehicle_type: "rail",
      size_class: null,
      wtw: 0.0278,
    });
    expect(result.size_class).toBeNull();
  });
});
