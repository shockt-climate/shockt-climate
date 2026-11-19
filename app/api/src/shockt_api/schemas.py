"""Pydantic response models for the route calculator API."""

from typing import Literal

from pydantic import BaseModel


class NodeResult(BaseModel):
    node_id: str
    kind: str
    name: str
    iso3: str
    lat: float
    lon: float


class CountryResult(BaseModel):
    iso3: str
    name: str
    modes: list[str]


class LegFactorInfo(BaseModel):
    source: str
    source_row_id: str
    variant: str
    vehicle_type: str | None
    size_class: str | None


class LegResponse(BaseModel):
    name: str
    from_node: str
    to_node: str
    from_name: str
    to_name: str
    from_lat: float
    from_lon: float
    to_lat: float
    to_lon: float
    network: str
    mode: str
    km: float
    duration_h: float | None
    wtw_kg_co2e_per_tkm: float
    wtw_kg_co2e_per_t: float
    share_of_route: float
    factor: LegFactorInfo
    distance_basis: str
    distance_source: str
    passages: list[str]


class RouteResponse(BaseModel):
    legs: list[LegResponse]
    total_wtw_kg_co2e_per_t: float
    total_wtw_kg_co2e: float | None
    total_km: float
    total_duration_h: float | None
    passages: list[str]
    scenario: str
    traffic_volume: str | None = None


class ComparisonRoute(BaseModel):
    primary: RouteResponse | None
    compare: RouteResponse | None
    delta_wtw_kg_co2e_per_t: float | None
    note: str | None = None


class DisruptionInfo(BaseModel):
    passage: str
    status: str
    since_date: str | None = None
    description: str | None = None


class DisruptionAnnotation(BaseModel):
    passages: list[DisruptionInfo]
    affected_routes: dict[str, list[int]]


class FactorInfo(BaseModel):
    source: str
    vehicle_type: str
    size_class: str | None = None
    wtw: float


class CommodityContext(BaseModel):
    hs6: str
    description: str
    top_ports: list[dict[str, object]]


class QueryEcho(BaseModel):
    origin: str
    destination: str
    cargo_t: float | None
    scenario: str
    modes: list[str]
    inland_mode: str


class RouteClusterResponse(BaseModel):
    rank: int
    representative_index: int
    routes: list[RouteResponse]
    emissions_range: tuple[float, float]
    distance_range: tuple[float, float]
    break_type: Literal["natural", "span", "floor"]


class ClusteredCategoryResponse(BaseModel):
    clusters: list[RouteClusterResponse]


class RoutesResponse(BaseModel):
    vessel_direct: list[RouteResponse]
    vessel_feeder: list[RouteResponse]
    air: list[RouteResponse]
    truck: list[RouteResponse]
    rail: list[RouteResponse]
    vessel_direct_clustered: ClusteredCategoryResponse | None = None
    vessel_feeder_clustered: ClusteredCategoryResponse | None = None
    air_clustered: ClusteredCategoryResponse | None = None
    truck_clustered: ClusteredCategoryResponse | None = None
    rail_clustered: ClusteredCategoryResponse | None = None
    comparison: dict[str, list[ComparisonRoute]] | None = None
    disruptions: DisruptionAnnotation | None = None
    factors: dict[str, FactorInfo]
    commodity: CommodityContext | None = None
    query: QueryEcho


class PathResponse(BaseModel):
    from_node: str
    to_node: str
    scenario: str
    coordinates: list[list[float]]
    km: float
    stored_km: float
    km_matches: bool
    passages: list[str]
    closed: list[str]
    source: str
