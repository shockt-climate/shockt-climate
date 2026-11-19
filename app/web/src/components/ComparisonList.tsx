import type { JSX } from "react";
import type { ComparisonRoute, RoutesResponse } from "../api/schemas";
import type { RouteCategory } from "../types";
import { ROUTE_CATEGORIES } from "../types";

interface Props {
  comparison: NonNullable<RoutesResponse["comparison"]>;
}

const LABELS: Record<RouteCategory, string> = {
  vessel_direct: "Vessel (direct)",
  vessel_feeder: "Vessel (feeder)",
  air: "Air",
  truck: "Truck",
  rail: "Rail",
};

function formatKg(value: number): string {
  return value >= 1000
    ? `${(value / 1000).toFixed(1)} t`
    : `${value.toFixed(1)} kg`;
}

function DeltaBadge({ delta }: { delta: number }): JSX.Element {
  if (delta === 0) {
    return <span className="delta-badge delta-badge--na">0.0 kg CO₂e/t</span>;
  }
  const text = delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
  const cls = delta > 0 ? "delta-badge--increase" : "delta-badge--decrease";
  return (
    <span className={`delta-badge ${cls}`}>
      {delta > 0 ? "↑" : "↓"} {text} kg CO₂e/t
    </span>
  );
}

function ComparisonRow({
  entry,
}: {
  entry: ComparisonRoute;
}): JSX.Element {
  const primary = entry.primary;
  const compare = entry.compare;

  return (
    <div className="comparison-row">
      <div className="comparison-cell">
        {primary ? (
          <>
            <div className="comparison-emissions">
              {formatKg(primary.total_wtw_kg_co2e_per_t)} CO₂e/t
            </div>
            <div className="comparison-meta">
              {primary.legs.map((l) => l.name).join(" → ")}
            </div>
          </>
        ) : (
          <div className="comparison-unavailable">
            {entry.note ?? "Not available"}
          </div>
        )}
      </div>

      <div className="comparison-delta">
        {primary && compare ? (
          <DeltaBadge
            delta={compare.total_wtw_kg_co2e_per_t - primary.total_wtw_kg_co2e_per_t}
          />
        ) : (
          <span className="delta-badge delta-badge--na">—</span>
        )}
      </div>

      <div className="comparison-cell">
        {compare ? (
          <>
            <div className="comparison-emissions">
              {formatKg(compare.total_wtw_kg_co2e_per_t)} CO₂e/t
            </div>
            <div className="comparison-meta">
              {compare.legs.map((l) => l.name).join(" → ")}
            </div>
          </>
        ) : (
          <div className="comparison-unavailable">
            {entry.note ?? "Not available"}
          </div>
        )}
      </div>
    </div>
  );
}

export function ComparisonList({ comparison }: Props): JSX.Element {
  const categories = ROUTE_CATEGORIES.filter((c) => {
    const entries = comparison[c] as ComparisonRoute[] | undefined;
    return entries && entries.length > 0;
  });

  if (categories.length === 0) {
    return (
      <div className="comparison-empty">
        No routes to compare between these scenarios.
      </div>
    );
  }

  return (
    <div className="comparison-list">
      <div className="comparison-header">
        <span>Primary scenario</span>
        <span>Delta</span>
        <span>Compare scenario</span>
      </div>
      {categories.map((cat) => {
        const entries = comparison[cat] as ComparisonRoute[];
        return (
          <section key={cat}>
            <h3 className="route-category-heading">{LABELS[cat]}</h3>
            {entries.map((entry, i) => (
              <ComparisonRow key={i} entry={entry} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
