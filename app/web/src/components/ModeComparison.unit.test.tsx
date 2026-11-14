import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModeComparison } from "./ModeComparison";
import type { RoutesResponse } from "../api/schemas";

const route = {
  legs: [
    {
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
    },
  ],
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

const mockData: RoutesResponse = {
  vessel_direct: [route],
  vessel_feeder: [],
  air: [
    {
      ...route,
      total_wtw_kg_co2e_per_t: 5000,
      total_ttw_kg_co2e_per_t: 4000,
      total_wtt_kg_co2e_per_t: 1000,
      total_km: 9000,
    },
  ],
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
    modes: ["vessel", "air"],
    inland_mode: "truck",
  },
};

describe("ModeComparison", () => {
  it("renders cards for categories with routes", () => {
    render(
      <ModeComparison data={mockData} scope="wtw" onFilterMode={vi.fn()} />
    );
    expect(screen.getByText("Vessel (direct)")).toBeInTheDocument();
    expect(screen.getByText("Air")).toBeInTheDocument();
  });

  it("does not render cards for empty categories", () => {
    render(
      <ModeComparison data={mockData} scope="wtw" onFilterMode={vi.fn()} />
    );
    expect(screen.queryByText("Truck")).not.toBeInTheDocument();
    expect(screen.queryByText("Rail")).not.toBeInTheDocument();
  });

  it("shows best route emissions", () => {
    render(
      <ModeComparison data={mockData} scope="wtw" onFilterMode={vi.fn()} />
    );
    expect(screen.getByText("160 kg CO₂e/t")).toBeInTheDocument();
    expect(screen.getByText("5.0 t CO₂e/t")).toBeInTheDocument();
  });

  it("calls onFilterMode when card is clicked", () => {
    const onFilter = vi.fn();
    render(
      <ModeComparison data={mockData} scope="wtw" onFilterMode={onFilter} />
    );
    fireEvent.click(screen.getByText("Air"));
    expect(onFilter).toHaveBeenCalledWith("air");
  });

  it("renders nothing when all categories empty", () => {
    const empty: RoutesResponse = {
      ...mockData,
      vessel_direct: [],
      air: [],
    };
    const { container } = render(
      <ModeComparison data={empty} scope="wtw" onFilterMode={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("uses TTW scope when selected", () => {
    render(
      <ModeComparison data={mockData} scope="ttw" onFilterMode={vi.fn()} />
    );
    expect(screen.getAllByText("130 kg CO₂e/t")).toHaveLength(1);
  });
});
