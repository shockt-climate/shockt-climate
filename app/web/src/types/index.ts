export type LaneMode = "vessel" | "air" | "truck" | "rail";

export type RouteCategory =
  | "vessel_direct"
  | "vessel_feeder"
  | "air"
  | "truck"
  | "rail";

export const ROUTE_CATEGORIES: readonly RouteCategory[] = [
  "vessel_direct",
  "vessel_feeder",
  "air",
  "truck",
  "rail",
] as const;

export type ClusteredRouteCategory =
  | "vessel_direct_clustered"
  | "vessel_feeder_clustered"
  | "air_clustered"
  | "truck_clustered"
  | "rail_clustered";

export const CLUSTERED_CATEGORIES: Record<RouteCategory, ClusteredRouteCategory> = {
  vessel_direct: "vessel_direct_clustered",
  vessel_feeder: "vessel_feeder_clustered",
  air: "air_clustered",
  truck: "truck_clustered",
  rail: "rail_clustered",
};

export const MODE_COLORS: Record<string, string> = {
  ocean: "#2563eb",
  sea: "#2563eb",
  air: "#9ca3af",
  truck: "#ea580c",
  road: "#ea580c",
  rail: "#16a34a",
};
