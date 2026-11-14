export type LaneMode = "vessel" | "air" | "truck" | "rail";

export type EmissionScope = "wtw" | "ttw" | "wtt";

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

export const MODE_COLORS: Record<string, string> = {
  ocean: "#2563eb",
  sea: "#2563eb",
  air: "#9ca3af",
  truck: "#ea580c",
  road: "#ea580c",
  rail: "#16a34a",
};
