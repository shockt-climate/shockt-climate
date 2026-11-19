import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouteDetail } from "./RouteDetail";
import type { RouteResponse } from "../api/schemas";

const mockRoute: RouteResponse = {
  legs: [
    {
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
      passages: ["suez"],
    },
    {
      name: "Los Angeles → Texas",
      from_node: "arrival_seaport:2704",
      to_node: "destination_state:TX",
      from_name: "Los Angeles",
      to_name: "Texas",
      from_lat: 33.74,
      from_lon: -118.27,
      to_lat: 31.0,
      to_lon: -100.0,
      network: "road",
      mode: "truck",
      km: 2200,
      duration_h: 22.5,
      wtw_kg_co2e_per_tkm: 0.1073,
      wtw_kg_co2e_per_t: 236.1,
      passages: [],
    },
  ],
  total_wtw_kg_co2e_per_t: 535.5,
  total_wtw_kg_co2e: 5355,
  total_km: 21150,
  total_duration_h: 478.5,
  passages: ["suez"],
  scenario: "open",
  traffic_volume: null,
};

const noDisruptions = new Set<string>();

describe("RouteDetail", () => {
  it("renders rank and total emissions", () => {
    render(
      <RouteDetail
        route={mockRoute}
        rank={1}
        selected={false}
        onSelect={vi.fn()}
        disruptedPassages={noDisruptions}
      />
    );
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText(/535\.5 kg CO₂e/)).toBeInTheDocument();
  });

  it("renders all legs", () => {
    render(
      <RouteDetail
        route={mockRoute}
        rank={1}
        selected={false}
        onSelect={vi.fn()}
        disruptedPassages={noDisruptions}
      />
    );
    expect(
      screen.getByText("Chittagong → Los Angeles")
    ).toBeInTheDocument();
    expect(screen.getByText("Los Angeles → Texas")).toBeInTheDocument();
  });

  it("shows total cargo emissions when present", () => {
    render(
      <RouteDetail
        route={mockRoute}
        rank={1}
        selected={false}
        onSelect={vi.fn()}
        disruptedPassages={noDisruptions}
      />
    );
    expect(screen.getByText(/5\.4 t total/)).toBeInTheDocument();
  });


  it("shows passages", () => {
    render(
      <RouteDetail
        route={mockRoute}
        rank={1}
        selected={false}
        onSelect={vi.fn()}
        disruptedPassages={noDisruptions}
      />
    );
    expect(screen.getByText(/suez/)).toBeInTheDocument();
  });

  it("applies selected class", () => {
    const { container } = render(
      <RouteDetail
        route={mockRoute}
        rank={1}
        selected={true}
        onSelect={vi.fn()}
        disruptedPassages={noDisruptions}
      />
    );
    expect(
      container.querySelector(".route-card--selected")
    ).toBeInTheDocument();
  });

  it("formats duration as days for long routes", () => {
    render(
      <RouteDetail
        route={mockRoute}
        rank={1}
        selected={false}
        onSelect={vi.fn()}
        disruptedPassages={noDisruptions}
      />
    );
    expect(screen.getByText("19.9 days")).toBeInTheDocument();
  });
});
