import { useState, type JSX } from "react";
import type { EmissionScope, RouteCategory } from "./types";
import { SearchBar, type SearchParams } from "./components/SearchBar";
import { RouteList } from "./components/RouteList";
import { RouteMap } from "./components/RouteMap";
import { EmissionsScopeToggle } from "./components/EmissionsScopeToggle";
import { useRoutes } from "./hooks/useRoutes";

export function App(): JSX.Element {
  const routes = useRoutes();
  const [scope, setScope] = useState<EmissionScope>("wtw");
  const [selectedRoute, setSelectedRoute] = useState<{
    category: RouteCategory;
    index: number;
  } | null>(null);

  function handleSubmit(params: SearchParams) {
    setSelectedRoute(null);
    routes.fetch({
      origin: params.origin,
      destination: params.destination,
      cargo_t: params.cargoT ?? undefined,
      modes: params.modes.join(","),
      inland_mode: params.inlandMode,
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
          <div className="results-toolbar">
            <EmissionsScopeToggle value={scope} onChange={setScope} />
          </div>

          <div className="results-layout">
            <RouteList
              data={routes.data}
              scope={scope}
              selectedIndex={selectedRoute}
              onSelectRoute={(category, index) =>
                setSelectedRoute({ category, index })
              }
            />
            <RouteMap data={routes.data} selectedIndex={selectedRoute} />
          </div>
        </>
      )}
    </div>
  );
}
