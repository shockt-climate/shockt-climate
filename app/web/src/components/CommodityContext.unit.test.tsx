import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CommodityContext } from "./CommodityContext";

const commodity = {
  hs6: "841810",
  description: "Combined refrigerator-freezers",
  top_ports: [
    { node_id: "port:1", name: "Los Angeles", weight_t: 125000 },
    { node_id: "port:2", name: "Savannah", weight_t: 80000 },
  ],
};

describe("CommodityContext", () => {
  it("renders HS code", () => {
    render(<CommodityContext commodity={commodity} />);
    expect(screen.getByText(/841810/)).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<CommodityContext commodity={commodity} />);
    expect(
      screen.getByText("Combined refrigerator-freezers")
    ).toBeInTheDocument();
  });

  it("renders top ports", () => {
    render(<CommodityContext commodity={commodity} />);
    expect(screen.getByText(/Los Angeles/)).toBeInTheDocument();
    expect(screen.getByText(/Savannah/)).toBeInTheDocument();
    expect(screen.getByText("125.0k t")).toBeInTheDocument();
  });

  it("hides port list when empty", () => {
    render(
      <CommodityContext commodity={{ ...commodity, top_ports: [] }} />
    );
    expect(
      screen.queryByText("Top arrival ports by tonnage")
    ).not.toBeInTheDocument();
  });
});
