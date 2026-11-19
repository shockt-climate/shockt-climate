import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScenarioSelector } from "./ScenarioSelector";

describe("ScenarioSelector", () => {
  it("renders scenario dropdown with current value", () => {
    render(
      <ScenarioSelector
        scenario="open"
        compareScenario={null}
        onScenarioChange={vi.fn()}
        onCompareChange={vi.fn()}
      />
    );
    const selects = screen.getAllByRole("combobox");
    expect(selects[0]).toHaveValue("open");
  });

  it("calls onScenarioChange when scenario changes", () => {
    const onChange = vi.fn();
    render(
      <ScenarioSelector
        scenario="open"
        compareScenario={null}
        onScenarioChange={onChange}
        onCompareChange={vi.fn()}
      />
    );
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "red_sea_closed" } });
    expect(onChange).toHaveBeenCalledWith("red_sea_closed");
  });

  it("calls onCompareChange with null when 'None' selected", () => {
    const onCompare = vi.fn();
    render(
      <ScenarioSelector
        scenario="open"
        compareScenario="red_sea_closed"
        onScenarioChange={vi.fn()}
        onCompareChange={onCompare}
      />
    );
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[1], { target: { value: "" } });
    expect(onCompare).toHaveBeenCalledWith(null);
  });

  it("excludes current scenario from compare dropdown", () => {
    render(
      <ScenarioSelector
        scenario="red_sea_closed"
        compareScenario={null}
        onScenarioChange={vi.fn()}
        onCompareChange={vi.fn()}
      />
    );
    const selects = screen.getAllByRole("combobox");
    const options = Array.from(selects[1].querySelectorAll("option"));
    const values = options.map((o) => o.getAttribute("value"));
    expect(values).not.toContain("red_sea_closed");
    expect(values).toContain("open");
  });
});
