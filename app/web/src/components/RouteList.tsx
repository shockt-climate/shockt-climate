import { type JSX, useState } from "react";
import type { RoutesResponse } from "../api/schemas";
import type { RouteCategory } from "../types";
import { ROUTE_CATEGORIES } from "../types";
import { RouteDetail } from "./RouteDetail";

interface Props {
  data: RoutesResponse;
  selectedIndex: { category: RouteCategory; index: number } | null;
  onSelectRoute: (category: RouteCategory, index: number) => void;
  disruptedPassages: ReadonlySet<string>;
}

const CATEGORY_LABELS: Record<RouteCategory, string> = {
  vessel_direct: "Vessel (direct)",
  vessel_feeder: "Vessel (feeder)",
  air: "Air",
  truck: "Truck",
  rail: "Rail",
};

export function RouteList({
  data,
  selectedIndex,
  onSelectRoute,
  disruptedPassages,
}: Props): JSX.Element {
  const [activeTab, setActiveTab] = useState<RouteCategory | "all">("all");

  const categories =
    activeTab === "all"
      ? ROUTE_CATEGORIES.filter((c) => data[c].length > 0)
      : [activeTab];

  const totalRoutes = ROUTE_CATEGORIES.reduce(
    (sum, c) => sum + data[c].length,
    0
  );

  if (totalRoutes === 0) {
    return <div className="route-list-empty">No routes found.</div>;
  }

  return (
    <div className="route-list">
      <div className="route-list-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === "all"}
          className={activeTab === "all" ? "tab--active" : ""}
          onClick={() => setActiveTab("all")}
        >
          All ({totalRoutes})
        </button>
        {ROUTE_CATEGORIES.filter((c) => data[c].length > 0).map((cat) => (
          <button
            key={cat}
            role="tab"
            aria-selected={activeTab === cat}
            className={activeTab === cat ? "tab--active" : ""}
            onClick={() => setActiveTab(cat)}
          >
            {CATEGORY_LABELS[cat]} ({data[cat].length})
          </button>
        ))}
      </div>

      {categories.map((cat) => (
        <section key={cat} className="route-category">
          {activeTab === "all" && (
            <h3 className="route-category-heading">
              {CATEGORY_LABELS[cat]}
            </h3>
          )}
          {data[cat].map((route, i) => (
            <RouteDetail
              key={`${cat}-${i}`}
              route={route}
              rank={i + 1}
              selected={
                selectedIndex?.category === cat && selectedIndex.index === i
              }
              onSelect={() => onSelectRoute(cat, i)}
              disruptedPassages={disruptedPassages}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
