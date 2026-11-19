import { useState, type JSX } from "react";
import type { RouteCategory } from "./types";
import { SearchBar, type SearchParams } from "./components/SearchBar";
import { RouteList } from "./components/RouteList";
import { RouteMap } from "./components/RouteMap";
import { ModeComparison } from "./components/ModeComparison";
import { ComparisonList } from "./components/ComparisonList";
import { CommodityContext } from "./components/CommodityContext";
import { useRoutes } from "./hooks/useRoutes";
import { useDisruptions } from "./hooks/useDisruptions";
import { useSeaPaths } from "./hooks/usePaths";

export function App(): JSX.Element {
  const routes = useRoutes();
  const disruptions = useDisruptions();
  const [selectedRoute, setSelectedRoute] = useState<{
    category: RouteCategory;
    index: number;
  } | null>(null);

  const selected =
    routes.data && selectedRoute
      ? (routes.data[selectedRoute.category][selectedRoute.index] ?? null)
      : null;
  const { paths, notice } = useSeaPaths(
    selected,
    routes.data?.query.scenario ?? "open"
  );

  function handleSubmit(params: SearchParams) {
    setSelectedRoute(null);
    routes.fetch({
      origin: params.origin,
      destination: params.destination,
      cargo_t: params.cargoT ?? undefined,
      modes: params.modes.join(","),
      inland_mode: params.inlandMode,
      scenario: params.scenario,
      compare_scenario: params.compareScenario ?? undefined,
      hs6: params.hs6 ?? undefined,
    });
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>ShockT Route Calculator</h1>
        <p>
          Compare freight routes by carbon footprint across transport modes.
        </p>
      </header>

      <SearchBar onSubmit={handleSubmit} loading={routes.loading} />

      {routes.error && (
        <div className="error-banner" role="alert">
          {routes.error}
        </div>
      )}

      {routes.data && (
        <>
          <ModeComparison
            data={routes.data}
            onFilterMode={(category) => {
              setSelectedRoute({ category, index: 0 });
            }}
          />

          {routes.data.commodity != null && (
            <CommodityContext commodity={routes.data.commodity} />
          )}

          {routes.data.comparison != null ? (
            <ComparisonList
              comparison={routes.data.comparison}
              />
          ) : (
            <div className="results-layout">
              <RouteList
                data={routes.data}
                    selectedIndex={selectedRoute}
                onSelectRoute={(category, index) =>
                  setSelectedRoute({ category, index })
                }
                disruptedPassages={disruptions.disruptedPassages}
                paths={paths}
              />
              <div>
                <RouteMap
                  data={routes.data}
                  selectedIndex={selectedRoute}
                  paths={paths}
                />
                {notice && <div className="path-notice">{notice}</div>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
