import type { JSX } from "react";
import type { LegResponse } from "../api/schemas";
import { MODE_COLORS } from "../types";

interface Props {
  leg: LegResponse;
  expanded: boolean;
  onToggle: () => void;
}

export function formatKg(value: number): string {
  return value >= 1000
    ? `${(value / 1000).toFixed(1)} t`
    : `${value.toFixed(1)} kg`;
}

export function formatDuration(hours: number | null): string {
  if (hours == null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

export function formatKm(km: number): string {
  return km >= 1000
    ? `${(km / 1000).toFixed(1)}k km`
    : `${Math.round(km)} km`;
}

function factorLabel(factor: LegResponse["factor"]): string {
  const parts = [factor.vehicle_type, factor.size_class].filter(
    (p): p is string => p != null && p !== ""
  );
  return parts.length > 0 ? parts.join(" / ") : factor.variant;
}

export function LegRow({ leg, expanded, onToggle }: Props): JSX.Element {
  return (
    <div className="route-leg-block">
      <button
        type="button"
        className="route-leg"
        aria-expanded={expanded}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <span className="route-leg-caret" aria-hidden="true">
          {expanded ? "▾" : "▸"}
        </span>
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
      </button>

      {expanded && (
        <dl className="route-leg-detail">
          <dt>Calculation</dt>
          <dd>
            {leg.km.toLocaleString()} km × {leg.wtw_kg_co2e_per_tkm} kg CO₂e/t·km
            = {leg.wtw_kg_co2e_per_t.toLocaleString()} kg CO₂e/t (
            {(leg.share_of_route * 100).toFixed(1)}% of route)
          </dd>
          <dt>Emission factor</dt>
          <dd>
            {factorLabel(leg.factor)} — {leg.factor.source}, row{" "}
            {leg.factor.source_row_id}
          </dd>
          <dt>Distance</dt>
          <dd>
            {leg.distance_basis} — {leg.distance_source || "source not recorded"}
          </dd>
          <dt>From → to</dt>
          <dd>
            {leg.from_name} → {leg.to_name}
          </dd>
          {leg.passages.length > 0 && (
            <>
              <dt>Passages</dt>
              <dd>{leg.passages.join(", ")}</dd>
            </>
          )}
        </dl>
      )}
    </div>
  );
}
