import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComparisonList } from "./ComparisonList";

const leg = {
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
  ttw_kg_co2e_per_tkm: 0.013,
  wtt_kg_co2e_per_tkm: 0.003,
  wtw_kg_co2e_per_tkm: 0.016,
  wtw_kg_co2e_per_t: 160,
  passages: [],
};

const routeA = {
  legs: [leg],
  total_wtw_kg_co2e_per_t: 160,
  total_ttw_kg_co2e_per_t: 130,
  total_wtt_kg_co2e_per_t: 30,
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
  total_ttw_kg_co2e_per_t: 170,
  total_wtt_kg_co2e_per_t: 30,
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
    render(<ComparisonList comparison={comparison} scope="wtw" />);
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
    render(<ComparisonList comparison={comparison} scope="wtw" />);
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
    render(<ComparisonList comparison={comparison} scope="wtw" />);
    expect(
      screen.getByText("Route not available under open")
    ).toBeInTheDocument();
    expect(screen.getByText("200.0 kg CO₂e/t")).toBeInTheDocument();
  });

  it("shows empty message when no categories have entries", () => {
    render(<ComparisonList comparison={{}} scope="wtw" />);
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
    render(<ComparisonList comparison={comparison} scope="wtw" />);
    expect(screen.getByText("Air")).toBeInTheDocument();
  });
});
