import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmissionsScopeToggle } from "./EmissionsScopeToggle";

describe("EmissionsScopeToggle", () => {
  it("renders all three scope buttons", () => {
    render(<EmissionsScopeToggle value="wtw" onChange={vi.fn()} />);
    expect(screen.getByText("WTW")).toBeInTheDocument();
    expect(screen.getByText("TTW")).toBeInTheDocument();
    expect(screen.getByText("WTT")).toBeInTheDocument();
  });

  it("marks the active scope", () => {
    render(<EmissionsScopeToggle value="ttw" onChange={vi.fn()} />);
    const ttw = screen.getByText("TTW");
    expect(ttw).toHaveAttribute("aria-checked", "true");
  });

  it("calls onChange on click", () => {
    const onChange = vi.fn();
    render(<EmissionsScopeToggle value="wtw" onChange={onChange} />);
    fireEvent.click(screen.getByText("TTW"));
    expect(onChange).toHaveBeenCalledWith("ttw");
  });
});
