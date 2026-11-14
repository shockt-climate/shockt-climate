import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DisruptionBadge } from "./DisruptionBadge";

describe("DisruptionBadge", () => {
  it("renders nothing when no passages are disrupted", () => {
    const { container } = render(
      <DisruptionBadge
        passages={["suez", "panama"]}
        disruptedPassages={new Set<string>()}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders badge for a single disrupted passage", () => {
    render(
      <DisruptionBadge
        passages={["suez", "panama"]}
        disruptedPassages={new Set(["suez"])}
      />
    );
    expect(screen.getByText(/suez/)).toBeInTheDocument();
    expect(screen.getByText(/⚠/)).toBeInTheDocument();
  });

  it("renders count for multiple disrupted passages", () => {
    render(
      <DisruptionBadge
        passages={["suez", "panama"]}
        disruptedPassages={new Set(["suez", "panama"])}
      />
    );
    expect(screen.getByText(/2 passages/)).toBeInTheDocument();
  });

  it("only counts passages that are in the route", () => {
    render(
      <DisruptionBadge
        passages={["suez"]}
        disruptedPassages={new Set(["suez", "panama"])}
      />
    );
    expect(screen.getByText(/suez/)).toBeInTheDocument();
    expect(screen.queryByText(/panama/)).not.toBeInTheDocument();
  });
});
