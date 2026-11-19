import { useState, type JSX } from "react";
import type { RouteResponse } from "../api/schemas";
import type { PathMap } from "../pathDetail";
import { LegRow, formatDuration, formatKg, formatKm } from "./LegRow";
import { DisruptionBadge } from "./DisruptionBadge";

interface Props {
  route: RouteResponse;
  rank: number;
  selected: boolean;
  onSelect: () => void;
  disruptedPassages: ReadonlySet<string>;
  scenario: string;
  paths: PathMap;
}

export function RouteDetail({
  route,
  rank,
  selected,
  onSelect,
  disruptedPassages,
  scenario,
  paths,
}: Props): JSX.Element {
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  const allExpanded = expanded.size === route.legs.length;

  function toggleLeg(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div
      className={`route-card ${selected ? "route-card--selected" : ""}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
    >
      <div className="route-card-header">
        <span className="route-rank">#{rank}</span>
        <span className="route-emissions">
          {formatKg(route.total_wtw_kg_co2e_per_t)} CO₂e / t
        </span>
        {route.total_wtw_kg_co2e != null && (
          <span className="route-total">
            ({formatKg(route.total_wtw_kg_co2e)} total)
          </span>
        )}
        <span className="route-distance">{formatKm(route.total_km)}</span>
        <span className="route-duration">
          {formatDuration(route.total_duration_h)}
        </span>
      </div>

      <div className="route-legs">
        <button
          type="button"
          className="route-legs-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(
              allExpanded ? new Set() : new Set(route.legs.map((_, i) => i))
            );
          }}
        >
          {allExpanded ? "Collapse all legs" : "Expand all legs"}
        </button>
        {route.legs.map((leg, i) => (
          <LegRow
            key={i}
            leg={leg}
            expanded={expanded.has(i)}
            onToggle={() => toggleLeg(i)}
            scenario={scenario}
            paths={paths}
          />
        ))}
      </div>

      {route.passages.length > 0 && (
        <div className="route-passages">
          Passages: {route.passages.join(", ")}
          <DisruptionBadge
            passages={route.passages}
            disruptedPassages={disruptedPassages}
          />
        </div>
      )}
    </div>
  );
}
