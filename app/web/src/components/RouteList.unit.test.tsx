import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RouteList } from "./RouteList";
import type { RouteResponse, RoutesResponse } from "../api/schemas";

const route: RouteResponse = {
  legs: [
    {
      name: "Chittagong → LA",
      from_node: "departure_port:BGD_100",
      to_node: "arrival_seaport:2704",
      from_name: "Chittagong",
      to_name: "LA",
      from_lat: 22,
      from_lon: 91,
      to_lat: 33,
      to_lon: -118,
      network: "sea",
      mode: "ocean",
      km: 18950,
      duration_h: 456,
      wtw_kg_co2e_per_tkm: 0.016,
      wtw_kg_co2e_per_t: 303.2,
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
    },
  ],
  total_wtw_kg_co2e_per_t: 303.2,
  total_wtw_kg_co2e: null,
  total_km: 18950,
  total_duration_h: 456,
  passages: [],
  scenario: "open",
  traffic_volume: null,
};

const mockData: RoutesResponse = {
  vessel_direct: [route, { ...route, total_wtw_kg_co2e_per_t: 400 }],
  vessel_feeder: [],
  air: [{ ...route, total_wtw_kg_co2e_per_t: 8000 }],
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
    modes: ["vessel", "air"],
    inland_mode: "truck",
  },
};

const noDisruptions = new Set<string>();

describe("RouteList", () => {
  it("shows tab counts", () => {
    render(
      <RouteList
        data={mockData}
        selectedIndex={null}
        onSelectRoute={vi.fn()}
        disruptedPassages={noDisruptions}
        paths={new Map()}
      />
    );
    expect(screen.getByText("All (3)")).toBeInTheDocument();
    expect(screen.getByText("Vessel (direct) (2)")).toBeInTheDocument();
    expect(screen.getByText("Air (1)")).toBeInTheDocument();
  });

  it("does not show tabs for empty categories", () => {
    render(
      <RouteList
        data={mockData}
        selectedIndex={null}
        onSelectRoute={vi.fn()}
        disruptedPassages={noDisruptions}
        paths={new Map()}
      />
    );
    expect(screen.queryByText(/Truck/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rail/)).not.toBeInTheDocument();
  });

  it("filters by tab", () => {
    render(
      <RouteList
        data={mockData}
        selectedIndex={null}
        onSelectRoute={vi.fn()}
        disruptedPassages={noDisruptions}
        paths={new Map()}
      />
    );
    fireEvent.click(screen.getByText("Air (1)"));
    const cards = document.querySelectorAll(".route-card");
    expect(cards).toHaveLength(1);
  });

  it("shows empty message when no routes", () => {
    const empty: RoutesResponse = {
      ...mockData,
      vessel_direct: [],
      air: [],
    };
    render(
      <RouteList
        data={empty}
        selectedIndex={null}
        onSelectRoute={vi.fn()}
        disruptedPassages={noDisruptions}
        paths={new Map()}
      />
    );
    expect(screen.getByText("No routes found.")).toBeInTheDocument();
  });

  it("calls onSelectRoute when a card is clicked", () => {
    const onSelect = vi.fn();
    render(
      <RouteList
        data={mockData}
        selectedIndex={null}
        onSelectRoute={onSelect}
        disruptedPassages={noDisruptions}
        paths={new Map()}
      />
    );
    const cards = document.querySelectorAll(".route-card");
    fireEvent.click(cards[0]);
    expect(onSelect).toHaveBeenCalledWith("vessel_direct", 0);
  });
});
