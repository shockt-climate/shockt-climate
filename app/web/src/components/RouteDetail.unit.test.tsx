import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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
      share_of_route: 0.44,
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

  describe("leg details", () => {
    function renderRoute(onSelect = vi.fn()) {
      render(
        <RouteDetail
          route={mockRoute}
          rank={1}
          selected={false}
          onSelect={onSelect}
          disruptedPassages={noDisruptions}
        />
      );
      return onSelect;
    }

    it("starts collapsed", () => {
      renderRoute();
      expect(screen.queryByText("Calculation")).not.toBeInTheDocument();
    });

    it("expands one leg to show the calculation, factor and distance source", () => {
      const onSelect = renderRoute();
      fireEvent.click(screen.getByText("Chittagong → Los Angeles"));
      expect(screen.getByText("Calculation")).toBeInTheDocument();
      expect(screen.getByText(/0\.0158 kg CO₂e\/t·km/)).toBeInTheDocument();
      expect(screen.getByText(/56\.0% of route/)).toBeInTheDocument();
      expect(screen.getAllByText(/row\s+uk_1/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/searoute 1\.6\.0/).length).toBeGreaterThan(0);
      expect(screen.getAllByText("Calculation")).toHaveLength(1);
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("collapses an expanded leg", () => {
      renderRoute();
      const leg = screen.getByText("Chittagong → Los Angeles");
      fireEvent.click(leg);
      fireEvent.click(leg);
      expect(screen.queryByText("Calculation")).not.toBeInTheDocument();
    });

    it("expands and collapses all legs", () => {
      renderRoute();
      fireEvent.click(screen.getByText("Expand all legs"));
      expect(screen.getAllByText("Calculation")).toHaveLength(2);
      fireEvent.click(screen.getByText("Collapse all legs"));
      expect(screen.queryByText("Calculation")).not.toBeInTheDocument();
    });
  });
});
