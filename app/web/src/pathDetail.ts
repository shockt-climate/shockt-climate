import type { LegResponse, PathResponse } from "./api/schemas";

export type PathMap = ReadonlyMap<string, PathResponse>;

export interface PathDetail {
  /** Passages the open route uses that this scenario closes. */
  avoided: readonly string[];
  /** Passages this scenario's path crosses that the open route does not. */
  divertedVia: readonly string[];
  openPassages: readonly string[];
  /** Extra km against the open path; null when there is no open baseline. */
  extraKm: number | null;
}

export function pathKey(from: string, to: string, scenario: string): string {
  return `${from}|${to}|${scenario}`;
}

export function isModelledSeaLeg(leg: LegResponse): boolean {
  return leg.network === "sea" && leg.distance_basis === "modelled";
}

/** A path only counts when its computed length agrees with the stored distance. */
export function usablePath(
  leg: LegResponse,
  scenario: string,
  paths: PathMap,
): PathResponse | undefined {
  const path = paths.get(pathKey(leg.from_node, leg.to_node, scenario));
  return path?.km_matches ? path : undefined;
}

export function pathDetail(
  leg: LegResponse,
  scenario: string,
  paths: PathMap,
): PathDetail | null {
  const path = usablePath(leg, scenario, paths);
  if (!path) return null;
  if (scenario === "open") {
    return {
      avoided: [],
      divertedVia: [],
      openPassages: path.passages,
      extraKm: null,
    };
  }
  const open = usablePath(leg, "open", paths);
  if (!open) {
    return {
      avoided: [],
      divertedVia: path.passages,
      openPassages: [],
      extraKm: null,
    };
  }
  return {
    avoided: open.passages.filter((p) => path.closed.includes(p)),
    divertedVia: path.passages.filter((p) => !open.passages.includes(p)),
    openPassages: open.passages,
    extraKm: path.km - open.km,
  };
}
