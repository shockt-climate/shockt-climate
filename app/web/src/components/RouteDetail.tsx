import type { JSX } from "react";
import type { RouteResponse } from "../api/schemas";
import { MODE_COLORS } from "../types";
import { DisruptionBadge } from "./DisruptionBadge";

interface Props {
  route: RouteResponse;
  rank: number;
  selected: boolean;
  onSelect: () => void;
  disruptedPassages: ReadonlySet<string>;
}

function formatKg(value: number): string {
  return value >= 1000
    ? `${(value / 1000).toFixed(1)} t`
    : `${value.toFixed(1)} kg`;
}

function formatDuration(hours: number | null): string {
  if (hours == null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

function formatKm(km: number): string {
  return km >= 1000
    ? `${(km / 1000).toFixed(1)}k km`
    : `${Math.round(km)} km`;
}

export function RouteDetail({
  route,
  rank,
  selected,
  onSelect,
  disruptedPassages,
}: Props): JSX.Element {
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
        {route.legs.map((leg, i) => (
          <div key={i} className="route-leg">
            <span
              className="route-leg-mode"
              style={{
                borderLeft: `3px solid ${MODE_COLORS[leg.mode] ?? "#888"}`,
                paddingLeft: 6,
              }}
            >
              {leg.mode}
            </span>
            <span className="route-leg-name">{leg.name}</span>
            <span className="route-leg-distance">{formatKm(leg.km)}</span>
            <span className="route-leg-duration">
              {formatDuration(leg.duration_h)}
            </span>
            <span className="route-leg-emissions">
              {formatKg(leg.wtw_kg_co2e_per_t)}
            </span>
          </div>
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
