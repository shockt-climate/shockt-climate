import { useEffect, useRef, type JSX } from "react";
import type { RoutesResponse, RouteResponse } from "../api/schemas";
import type { RouteCategory } from "../types";
import { MODE_COLORS, ROUTE_CATEGORIES } from "../types";

interface Props {
  data: RoutesResponse | null;
  selectedIndex: { category: RouteCategory; index: number } | null;
}

type L = typeof import("leaflet");

let leafletLoaded: Promise<{
  L: L;
  GeodesicLine: typeof import("leaflet.geodesic").GeodesicLine;
}> | null = null;

function loadLeaflet() {
  if (!leafletLoaded) {
    leafletLoaded = Promise.all([
      import("leaflet"),
      import("leaflet.geodesic"),
    ]).then(([leaflet, geodesic]) => ({
      L: leaflet.default ?? leaflet,
      GeodesicLine: geodesic.GeodesicLine,
    }));
  }
  return leafletLoaded;
}

export function RouteMap({ data, selectedIndex }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layersRef = useRef<import("leaflet").Layer[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    loadLeaflet().then(({ L, GeodesicLine }) => {
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current).setView([20, 0], 2);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 18,
        }).addTo(mapRef.current);
      }

      const map = mapRef.current;

      for (const layer of layersRef.current) {
        map.removeLayer(layer);
      }
      layersRef.current = [];

      if (!data) return;

      const allLegs: {
        leg: RouteResponse["legs"][number];
        highlight: boolean;
      }[] = [];

      for (const cat of ROUTE_CATEGORIES) {
        const routes = data[cat];
        for (let i = 0; i < routes.length; i++) {
          const isSelected =
            selectedIndex?.category === cat && selectedIndex.index === i;
          // A route is selected: draw only that one. Otherwise draw all.
          if (selectedIndex && !isSelected) continue;
          for (const leg of routes[i].legs) {
            allLegs.push({ leg, highlight: isSelected });
          }
        }
      }

      const bounds: [number, number][] = [];

      for (const { leg, highlight } of allLegs) {
        const from: [number, number] = [leg.from_lat, leg.from_lon];
        const to: [number, number] = [leg.to_lat, leg.to_lon];
        bounds.push(from, to);

        const color = MODE_COLORS[leg.mode] ?? MODE_COLORS[leg.network] ?? "#888";
        const line = new GeodesicLine([from, to], {
          color,
          weight: highlight ? 4 : 2,
          opacity: highlight ? 1 : 0.4,
        });
        line.addTo(map);
        layersRef.current.push(line);

        if (highlight) {
          const fromMarker = L.circleMarker(from, {
            radius: 5,
            color,
            fillOpacity: 0.8,
          })
            .bindTooltip(leg.from_name)
            .addTo(map);
          const toMarker = L.circleMarker(to, {
            radius: 5,
            color,
            fillOpacity: 0.8,
          })
            .bindTooltip(leg.to_name)
            .addTo(map);
          layersRef.current.push(fromMarker, toMarker);
        }
      }

      if (bounds.length > 0) {
        map.fitBounds(L.latLngBounds(bounds).pad(0.1));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [data, selectedIndex]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="route-map"
      style={{ height: 400, width: "100%" }}
    />
  );
}
