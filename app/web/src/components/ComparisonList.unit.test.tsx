import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComparisonList } from "./ComparisonList";
import type { LegResponse } from "../api/schemas";

const leg: LegResponse = {
  name: "A → B",
  from_node: "a",
  to_node: "b",
  from_name: "A",
  to_name: "B",
  from_lat: 0,
  from_lon: 0,
  to_lat: 1,
  to_lon: 1,
  network: "sea",
  mode: "ocean",
  km: 10000,
  duration_h: 240,
  wtw_kg_co2e_per_tkm: 0.016,
  wtw_kg_co2e_per_t: 160,
  share_of_route: 1,
  factor: {
    source: "uk_desnz",
    source_row_id: "uk_1",
    variant: "Container ship / Average",
    vehicle_type: "container_ship",
    size_class: "average",
  },
  distance_basis: "modelled",
  distance_source: "searoute 1.6.0",
  passages: [],
};

const routeA = {
  legs: [leg],
  total_wtw_kg_co2e_per_t: 160,
  total_wtw_kg_co2e: null,
  total_km: 10000,
  total_duration_h: 240,
  passages: [],
  scenario: "open",
  traffic_volume: null,
};

const routeB = {
  ...routeA,
  total_wtw_kg_co2e_per_t: 200,
};

describe("ComparisonList", () => {
  it("renders matched pair with delta", () => {
    const comparison = {
      vessel_direct: [
        {
          primary: routeA,
          compare: routeB,
          delta_wtw_kg_co2e_per_t: 40,
          note: null,
        },
      ],
    };
    render(<ComparisonList comparison={comparison} />);
    expect(screen.getByText("160.0 kg CO₂e/t")).toBeInTheDocument();
    expect(screen.getByText("200.0 kg CO₂e/t")).toBeInTheDocument();
    expect(screen.getByText(/\+40\.0/)).toBeInTheDocument();
  });

  it("renders primary-only route with note", () => {
    const comparison = {
      vessel_direct: [
        {
          primary: routeA,
          compare: null,
          delta_wtw_kg_co2e_per_t: null,
          note: "Route not available under suez_closed",
        },
      ],
    };
    render(<ComparisonList comparison={comparison} />);
    expect(
      screen.getByText("Route not available under suez_closed")
    ).toBeInTheDocument();
  });

  it("renders compare-only route", () => {
    const comparison = {
      vessel_direct: [
        {
          primary: null,
          compare: routeB,
          delta_wtw_kg_co2e_per_t: null,
          note: "Route not available under open",
        },
      ],
    };
    render(<ComparisonList comparison={comparison} />);
    expect(
      screen.getByText("Route not available under open")
    ).toBeInTheDocument();
    expect(screen.getByText("200.0 kg CO₂e/t")).toBeInTheDocument();
  });

  it("shows empty message when no categories have entries", () => {
    render(<ComparisonList comparison={{}} />);
    expect(
      screen.getByText("No routes to compare between these scenarios.")
    ).toBeInTheDocument();
  });

  it("shows category heading", () => {
    const comparison = {
      air: [
        {
          primary: routeA,
          compare: routeB,
          delta_wtw_kg_co2e_per_t: 40,
          note: null,
        },
      ],
    };
    render(<ComparisonList comparison={comparison} />);
    expect(screen.getByText("Air")).toBeInTheDocument();
  });
});
