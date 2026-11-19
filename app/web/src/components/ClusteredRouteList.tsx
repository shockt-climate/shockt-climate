import { type JSX, useState } from "react";
import type { RoutesResponse } from "../api/schemas";
import type { RouteCategory } from "../types";
import { ROUTE_CATEGORIES, CLUSTERED_CATEGORIES } from "../types";
import type { PathMap } from "../pathDetail";
import { RouteDetail } from "./RouteDetail";

interface Props {
  data: RoutesResponse;
  selectedIndex: { category: RouteCategory; index: number } | null;
  onSelectRoute: (category: RouteCategory, index: number) => void;
  disruptedPassages: ReadonlySet<string>;
  paths: PathMap;
}

const CATEGORY_LABELS: Record<RouteCategory, string> = {
  vessel_direct: "Vessel (direct)",
  vessel_feeder: "Vessel (feeder)",
  air: "Air",
  truck: "Truck",
  rail: "Rail",
};

export function ClusteredRouteList({
  data,
  selectedIndex,
  onSelectRoute,
  disruptedPassages,
  paths,
}: Props): JSX.Element {
  const [activeTab, setActiveTab] = useState<RouteCategory | "all">("all");
  const [expandedClusters, setExpandedClusters] = useState<ReadonlySet<string>>(
    new Set(),
  );

  function toggleCluster(key: string) {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const categoriesWithClusters = ROUTE_CATEGORIES.filter((cat) => {
    const clustered = data[CLUSTERED_CATEGORIES[cat]];
    return clustered != null && clustered.clusters.length > 0;
  });

  const categories =
    activeTab === "all" ? categoriesWithClusters : [activeTab];

  const totalClusters = categoriesWithClusters.reduce((sum, cat) => {
    const clustered = data[CLUSTERED_CATEGORIES[cat]];
    return sum + (clustered?.clusters.length ?? 0);
  }, 0);

  if (totalClusters === 0) {
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
          All ({totalClusters} groups)
        </button>
        {categoriesWithClusters.map((cat) => {
          const clustered = data[CLUSTERED_CATEGORIES[cat]];
          const count = clustered?.clusters.length ?? 0;
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={activeTab === cat}
              className={activeTab === cat ? "tab--active" : ""}
              onClick={() => setActiveTab(cat)}
            >
              {CATEGORY_LABELS[cat]} ({count})
            </button>
          );
        })}
      </div>

      {categories.map((cat) => {
        const clustered = data[CLUSTERED_CATEGORIES[cat]];
        if (!clustered) return null;

        let flatIndex = 0;

        return (
          <section key={cat} className="route-category">
            {activeTab === "all" && (
              <h3 className="route-category-heading">
                {CATEGORY_LABELS[cat]}
              </h3>
            )}
            {clustered.clusters.map((cluster) => {
              const clusterKey = `${cat}-${cluster.rank}`;
              const isExpanded = expandedClusters.has(clusterKey);
              const rep = cluster.routes[cluster.representative_index];
              const repFlatIndex = flatIndex + cluster.representative_index;
              const alternatives = cluster.routes.filter(
                (_, i) => i !== cluster.representative_index,
              );
              const clusterStartIndex = flatIndex;
              flatIndex += cluster.routes.length;

              const [lo, hi] = cluster.emissions_range;
              const rangeLabel =
                lo === hi
                  ? `${lo.toFixed(1)} kg`
                  : `${lo.toFixed(1)}–${hi.toFixed(1)} kg`;

              return (
                <div
                  key={clusterKey}
                  className={`cluster-group cluster-group--${cluster.break_type}`}
                >
                  <div className="cluster-header">
                    <span className="cluster-range">
                      {rangeLabel} CO₂e/t
                    </span>
                    {cluster.routes.length > 1 && (
                      <button
                        className="cluster-toggle"
                        onClick={() => toggleCluster(clusterKey)}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded
                          ? "Hide alternatives"
                          : `+${alternatives.length} alternative${alternatives.length === 1 ? "" : "s"}`}
                      </button>
                    )}
                  </div>

                  {rep && (
                    <RouteDetail
                      route={rep}
                      rank={cluster.rank}
                      selected={
                        selectedIndex?.category === cat &&
                        selectedIndex.index === repFlatIndex
                      }
                      onSelect={() => onSelectRoute(cat, repFlatIndex)}
                      disruptedPassages={disruptedPassages}
                      scenario={data.query.scenario}
                      paths={paths}
                    />
                  )}

                  {isExpanded && (
                    <div className="cluster-alternatives">
                      {alternatives.map((route, altIdx) => {
                        const originalIdx =
                          altIdx >= cluster.representative_index
                            ? altIdx + 1
                            : altIdx;
                        const routeFlatIndex =
                          clusterStartIndex + originalIdx;
                        return (
                          <RouteDetail
                            key={`${clusterKey}-alt-${altIdx}`}
                            route={route}
                            rank={cluster.rank}
                            selected={
                              selectedIndex?.category === cat &&
                              selectedIndex.index === routeFlatIndex
                            }
                            onSelect={() =>
                              onSelectRoute(cat, routeFlatIndex)
                            }
                            disruptedPassages={disruptedPassages}
                            scenario={data.query.scenario}
                            paths={paths}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
