import { Schema } from "effect";

export const LegResponse = Schema.Struct({
  name: Schema.NonEmptyString,
  from_node: Schema.NonEmptyString,
  to_node: Schema.NonEmptyString,
  from_name: Schema.String,
  to_name: Schema.String,
  from_lat: Schema.Number,
  from_lon: Schema.Number,
  to_lat: Schema.Number,
  to_lon: Schema.Number,
  network: Schema.NonEmptyString,
  mode: Schema.NonEmptyString,
  km: Schema.Number,
  duration_h: Schema.NullOr(Schema.Number),
  ttw_kg_co2e_per_tkm: Schema.Number,
  wtt_kg_co2e_per_tkm: Schema.Number,
  wtw_kg_co2e_per_tkm: Schema.Number,
  wtw_kg_co2e_per_t: Schema.Number,
  passages: Schema.Array(Schema.String),
});
export type LegResponse = typeof LegResponse.Type;

export const RouteResponse = Schema.Struct({
  legs: Schema.Array(LegResponse),
  total_wtw_kg_co2e_per_t: Schema.Number,
  total_ttw_kg_co2e_per_t: Schema.Number,
  total_wtt_kg_co2e_per_t: Schema.Number,
  total_wtw_kg_co2e: Schema.NullOr(Schema.Number),
  total_km: Schema.Number,
  total_duration_h: Schema.NullOr(Schema.Number),
  passages: Schema.Array(Schema.String),
  scenario: Schema.NonEmptyString,
  traffic_volume: Schema.NullOr(Schema.String),
});
export type RouteResponse = typeof RouteResponse.Type;

export const ComparisonRoute = Schema.Struct({
  primary: Schema.NullOr(RouteResponse),
  compare: Schema.NullOr(RouteResponse),
  delta_wtw_kg_co2e_per_t: Schema.NullOr(Schema.Number),
  note: Schema.NullOr(Schema.String),
});
export type ComparisonRoute = typeof ComparisonRoute.Type;

export const FactorInfo = Schema.Struct({
  source: Schema.NonEmptyString,
  vehicle_type: Schema.NonEmptyString,
  size_class: Schema.NullOr(Schema.String),
  ttw: Schema.Number,
  wtt: Schema.Number,
  wtw: Schema.Number,
});
export type FactorInfo = typeof FactorInfo.Type;

export const QueryEcho = Schema.Struct({
  origin: Schema.NonEmptyString,
  destination: Schema.NonEmptyString,
  cargo_t: Schema.NullOr(Schema.Number),
  scenario: Schema.NonEmptyString,
  modes: Schema.Array(Schema.String),
  inland_mode: Schema.NonEmptyString,
});
export type QueryEcho = typeof QueryEcho.Type;

export const RoutesResponse = Schema.Struct({
  vessel_direct: Schema.Array(RouteResponse),
  vessel_feeder: Schema.Array(RouteResponse),
  air: Schema.Array(RouteResponse),
  truck: Schema.Array(RouteResponse),
  rail: Schema.Array(RouteResponse),
  comparison: Schema.NullOr(
    Schema.Record({ key: Schema.String, value: Schema.Array(ComparisonRoute) })
  ),
  factors: Schema.Record({ key: Schema.String, value: FactorInfo }),
  commodity: Schema.NullOr(Schema.Unknown),
  query: QueryEcho,
});
export type RoutesResponse = typeof RoutesResponse.Type;

export const NodeResult = Schema.Struct({
  node_id: Schema.NonEmptyString,
  kind: Schema.NonEmptyString,
  name: Schema.String,
  iso3: Schema.String,
  lat: Schema.Number,
  lon: Schema.Number,
});
export type NodeResult = typeof NodeResult.Type;

export const CountryResult = Schema.Struct({
  iso3: Schema.NonEmptyString,
  name: Schema.String,
  modes: Schema.Array(Schema.String),
});
export type CountryResult = typeof CountryResult.Type;
