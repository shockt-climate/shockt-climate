"""Route clustering: group near-identical routes by structural and numerical similarity."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Mapping
from dataclasses import dataclass
from statistics import median
from typing import Literal

from shockt_engine.routing import Node, Route, haversine_km

BreakType = Literal["natural", "span", "floor"]


@dataclass(frozen=True)
class DimensionConfig:
    """Per-dimension clustering parameters."""

    key: str
    gap_ratio: float = 3.0
    max_span_pct: float = 25.0


_DEFAULT_DIMENSIONS = (DimensionConfig(key="emissions"),)


@dataclass(frozen=True)
class RouteCollapseConfig:
    """Controls route clustering behavior."""

    enabled: bool = True
    passages_distinct: bool = True
    arrival_cluster_km: float = 100.0
    dimensions: tuple[DimensionConfig, ...] = _DEFAULT_DIMENSIONS
    min_representatives: int = 1
    max_representatives: int | None = None
    max_per_cluster: int | None = None
    include_dominated: bool = True


_DEFAULT_CONFIG = RouteCollapseConfig()


@dataclass(frozen=True)
class RouteCluster:
    """A group of similar routes with one representative."""

    rank: int
    representative_index: int
    routes: tuple[Route, ...]
    emissions_range: tuple[float, float]
    distance_range: tuple[float, float]
    break_type: BreakType


def cluster_nodes_by_proximity(
    node_ids: list[str],
    nodes: Mapping[str, Node],
    threshold_km: float,
) -> dict[str, int]:
    """Assign each node to a cluster ID. Nodes within threshold_km share a cluster."""
    sorted_ids = sorted(node_ids)
    clusters: list[list[str]] = []
    for nid in sorted_ids:
        n = nodes[nid]
        placed = False
        for cluster in clusters:
            if any(
                haversine_km(n.lat, n.lon, nodes[m].lat, nodes[m].lon) < threshold_km
                for m in cluster
            ):
                cluster.append(nid)
                placed = True
                break
        if not placed:
            clusters.append([nid])
    return {nid: i for i, cluster in enumerate(clusters) for nid in cluster}


def _partition_key(
    route: Route,
    nodes: Mapping[str, Node],
    arrival_clusters: dict[str, int],
    config: RouteCollapseConfig,
) -> tuple:
    departure = nodes[route.legs[0].from_node]
    arrival_node_id = route.legs[-1].from_node if len(route.legs) >= 2 else route.legs[-1].to_node
    arrival = nodes[arrival_node_id]

    key: list[object] = [departure.iso3]

    if len(route.legs) >= 3:
        hub = nodes[route.legs[1].from_node]
        key.append(hub.iso3)
    else:
        key.append(None)

    if config.passages_distinct:
        key.append(frozenset(route.passages))
    else:
        key.append(None)

    key.append(arrival.coast_region)
    key.append(arrival_clusters.get(arrival_node_id, -1))

    return tuple(key)


def _split_at_largest_gap(
    routes: list[Route],
) -> tuple[list[Route], list[Route]]:
    """Split a sorted route list at the largest emissions gap."""
    gaps = [
        routes[i + 1].total_wtw_kg_co2e_per_t - routes[i].total_wtw_kg_co2e_per_t
        for i in range(len(routes) - 1)
    ]
    split_at = max(range(len(gaps)), key=lambda i: gaps[i])
    return routes[: split_at + 1], routes[split_at + 1 :]


def _cluster_span(routes: list[Route]) -> float:
    if len(routes) <= 1:
        return 0.0
    return routes[-1].total_wtw_kg_co2e_per_t - routes[0].total_wtw_kg_co2e_per_t


def _gap_width_cluster(
    routes: list[Route],
    dim_config: DimensionConfig,
    min_reps: int,
    max_reps: int | None,
) -> list[tuple[list[Route], BreakType]]:
    """The 7-step gap + width clustering algorithm."""
    if len(routes) <= 1:
        return [(routes, "natural")]

    gaps = [
        routes[i + 1].total_wtw_kg_co2e_per_t - routes[i].total_wtw_kg_co2e_per_t
        for i in range(len(routes) - 1)
    ]
    med = median(gaps)
    threshold = dim_config.gap_ratio * med

    break_indices: list[int] = []
    if med > 0:
        break_indices = [i for i, g in enumerate(gaps) if g > threshold]

    clusters: list[list[Route]] = []
    break_types: list[BreakType] = []
    prev = 0
    for idx in break_indices:
        clusters.append(routes[prev : idx + 1])
        break_types.append("natural")
        prev = idx + 1
    clusters.append(routes[prev:])
    break_types.append("natural")

    median_value = median(r.total_wtw_kg_co2e_per_t for r in routes)
    max_span = median_value * dim_config.max_span_pct / 100.0 if median_value > 0 else 0.0

    if max_span > 0:
        changed = True
        while changed:
            changed = False
            new_clusters: list[list[Route]] = []
            new_types: list[BreakType] = []
            for c, bt in zip(clusters, break_types, strict=True):
                if len(c) >= 3 and _cluster_span(c) > max_span:
                    left, right = _split_at_largest_gap(c)
                    new_clusters.extend([left, right])
                    new_types.extend(["span", "span"])
                    changed = True
                else:
                    new_clusters.append(c)
                    new_types.append(bt)
            clusters = new_clusters
            break_types = new_types

    while len(clusters) < min_reps:
        widest_idx = -1
        widest_span = 0.0
        for i, c in enumerate(clusters):
            if len(c) >= 2:
                s = _cluster_span(c)
                if s > widest_span:
                    widest_span = s
                    widest_idx = i
        if widest_idx < 0:
            break
        left, right = _split_at_largest_gap(clusters[widest_idx])
        clusters[widest_idx : widest_idx + 1] = [left, right]
        break_types[widest_idx : widest_idx + 1] = ["floor", "floor"]

    if max_reps is not None:
        while len(clusters) > max_reps and len(clusters) >= 2:
            smallest_gap = float("inf")
            merge_idx = 0
            for i in range(len(clusters) - 1):
                gap = (
                    clusters[i + 1][0].total_wtw_kg_co2e_per_t
                    - clusters[i][-1].total_wtw_kg_co2e_per_t
                )
                if gap < smallest_gap:
                    smallest_gap = gap
                    merge_idx = i
            merged = clusters[merge_idx] + clusters[merge_idx + 1]
            clusters[merge_idx : merge_idx + 2] = [merged]
            break_types[merge_idx : merge_idx + 2] = [break_types[merge_idx]]

    return list(zip(clusters, break_types, strict=True))


def cluster_routes(
    routes: list[Route],
    nodes: Mapping[str, Node],
    config: RouteCollapseConfig | None = None,
) -> list[RouteCluster]:
    """Group routes into clusters by structural and numerical similarity.

    Takes a single mode category's routes (sorted ascending by emissions).
    Returns a list of RouteCluster objects, ranked by representative emissions.
    """
    if config is None:
        config = _DEFAULT_CONFIG

    if not config.enabled or len(routes) <= 1:
        if not routes:
            return []
        return [
            RouteCluster(
                rank=1,
                representative_index=0,
                routes=tuple(routes),
                emissions_range=(
                    routes[0].total_wtw_kg_co2e_per_t,
                    routes[-1].total_wtw_kg_co2e_per_t,
                ),
                distance_range=(
                    min(r.total_km for r in routes),
                    max(r.total_km for r in routes),
                ),
                break_type="natural",
            )
        ]

    arrival_ids = list(
        {r.legs[-1].from_node if len(r.legs) >= 2 else r.legs[-1].to_node for r in routes if r.legs}
    )
    arrival_clusters = cluster_nodes_by_proximity(arrival_ids, nodes, config.arrival_cluster_km)

    groups: dict[tuple, list[Route]] = defaultdict(list)
    for route in routes:
        key = _partition_key(route, nodes, arrival_clusters, config)
        groups[key].append(route)

    dim_config = config.dimensions[0] if config.dimensions else DimensionConfig(key="emissions")

    all_clusters: list[tuple[list[Route], BreakType]] = []
    for partition_routes in groups.values():
        partition_routes.sort(key=lambda r: r.total_wtw_kg_co2e_per_t)
        clusters = _gap_width_cluster(
            partition_routes, dim_config, config.min_representatives, config.max_representatives
        )
        all_clusters.extend(clusters)

    all_clusters.sort(key=lambda c: c[0][0].total_wtw_kg_co2e_per_t)

    result: list[RouteCluster] = []
    for rank, (cluster_routes_list, break_type) in enumerate(all_clusters, 1):
        capped = cluster_routes_list
        if config.max_per_cluster is not None:
            capped = cluster_routes_list[: config.max_per_cluster]

        emissions = [r.total_wtw_kg_co2e_per_t for r in capped]
        distances = [r.total_km for r in capped]
        result.append(
            RouteCluster(
                rank=rank,
                representative_index=0,
                routes=tuple(capped),
                emissions_range=(min(emissions), max(emissions)),
                distance_range=(min(distances), max(distances)),
                break_type=break_type,
            )
        )

    return result
