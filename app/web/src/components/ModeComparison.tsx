import type { JSX } from "react";
import type { RoutesResponse } from "../api/schemas";
import type { EmissionScope, RouteCategory } from "../types";
import { ROUTE_CATEGORIES } from "../types";

interface Props {
  data: RoutesResponse;
  scope: EmissionScope;
  onFilterMode: (category: RouteCategory) => void;
}

const LABELS: Record<RouteCategory, string> = {
  vessel_direct: "Vessel (direct)",
  vessel_feeder: "Vessel (feeder)",
  air: "Air",
  truck: "Truck",
  rail: "Rail",
};

function scopeTotal(
  route: RoutesResponse["vessel_direct"][number],
  scope: EmissionScope
): number {
  switch (scope) {
    case "wtw":
      return route.total_wtw_kg_co2e_per_t;
    case "ttw":
      return route.total_ttw_kg_co2e_per_t;
    case "wtt":
      return route.total_wtt_kg_co2e_per_t;
  }
}

function formatKg(value: number): string {
  return value >= 1000
    ? `${(value / 1000).toFixed(1)} t`
    : `${value.toFixed(0)} kg`;
}

function formatDuration(hours: number | null): string {
  if (hours == null) return "—";
  if (hours < 48) return `${hours.toFixed(0)} h`;
  return `${(hours / 24).toFixed(0)} days`;
}

export function ModeComparison({
  data,
  scope,
  onFilterMode,
}: Props): JSX.Element {
  const cards = ROUTE_CATEGORIES.filter((c) => data[c].length > 0);

  if (cards.length === 0) return <></>;

  return (
    <div className="mode-comparison">
      {cards.map((cat) => {
        const best = data[cat][0];
        const emissions = scopeTotal(best, scope);
        return (
          <button
            key={cat}
            className="mode-card"
            onClick={() => onFilterMode(cat)}
          >
            <div className="mode-card-label">{LABELS[cat]}</div>
            <div className="mode-card-emissions">
              {formatKg(emissions)} CO₂e/t
            </div>
            <div className="mode-card-meta">
              {(best.total_km / 1000).toFixed(0)}k km &middot;{" "}
              {formatDuration(best.total_duration_h)}
            </div>
            <div className="mode-card-count">
              {data[cat].length} route{data[cat].length !== 1 ? "s" : ""}
            </div>
          </button>
        );
      })}
    </div>
  );
}
