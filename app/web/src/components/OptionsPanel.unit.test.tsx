import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OptionsPanel } from "./OptionsPanel";

describe("OptionsPanel", () => {
  const defaultProps = {
    scenario: "open",
    compareScenario: null as string | null,
    onScenarioChange: vi.fn(),
    onCompareChange: vi.fn(),
    inlandMode: "truck" as const,
    onInlandModeChange: vi.fn(),
    hs6: "",
    onHs6Change: vi.fn(),
    collapse: true,
    onCollapseChange: vi.fn(),
    collapsePct: null,
    onCollapsePctChange: vi.fn(),
  };

  it("is collapsed by default", () => {
    render(<OptionsPanel {...defaultProps} />);
    expect(screen.getByText(/Advanced options/)).toBeInTheDocument();
    expect(screen.queryByText("Scenario")).not.toBeInTheDocument();
  });

  it("expands on click", () => {
    render(<OptionsPanel {...defaultProps} />);
    fireEvent.click(screen.getByText(/Advanced options/));
    expect(screen.getByText("Scenario")).toBeInTheDocument();
    expect(screen.getByText("Inland mode")).toBeInTheDocument();
    expect(screen.getByText("HS-6 code")).toBeInTheDocument();
  });

  it("calls onHs6Change when HS-6 input changes", () => {
    const onHs6 = vi.fn();
    render(<OptionsPanel {...defaultProps} onHs6Change={onHs6} />);
    fireEvent.click(screen.getByText(/Advanced options/));
    const input = screen.getByPlaceholderText("e.g. 841810");
    fireEvent.change(input, { target: { value: "841810" } });
    expect(onHs6).toHaveBeenCalledWith("841810");
  });

  it("calls onInlandModeChange when inland mode changes", () => {
    const onInland = vi.fn();
    render(<OptionsPanel {...defaultProps} onInlandModeChange={onInland} />);
    fireEvent.click(screen.getByText(/Advanced options/));
    const select = screen.getByDisplayValue("Truck");
    fireEvent.change(select, { target: { value: "rail" } });
    expect(onInland).toHaveBeenCalledWith("rail");
  });

  it("sets aria-expanded", () => {
    render(<OptionsPanel {...defaultProps} />);
    const toggle = screen.getByText(/Advanced options/);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});
