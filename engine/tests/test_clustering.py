from shockt_engine import (
    DimensionConfig,
    Factor,
    Node,
    Route,
    RouteCollapseConfig,
    RouteLeg,
    cluster_nodes_by_proximity,
    cluster_routes,
)


def _factor(mode: str = "ocean", wtw: float = 0.015) -> Factor:
    return Factor(
        source="test",
        source_row_id="test",
        mode=mode,
        variant="test",
        vehicle_type=None,
        size_class=None,
        haul=None,
        radiative_forcing=None,
        wtw_kg_co2e_per_tkm=wtw,
    )


def _route(
    emissions: float,
    km: float = 10000.0,
    *,
    from_node: str = "departure_port:A",
    to_node: str = "arrival_seaport:LA",
    passages: tuple[str, ...] = (),
    mode: str = "vessel",
    hub_node: str | None = None,
) -> Route:
    factor = _factor()
    if hub_node:
        legs = (
            RouteLeg(
                name="leg1",
                from_node=from_node,
                to_node=hub_node,
                network="sea",
                factor_mode="ocean",
                km=km / 3,
                duration_h=None,
                factor=factor,
                passages=(),
            ),
            RouteLeg(
                name="leg2",
                from_node=hub_node,
                to_node=to_node,
                network="sea",
                factor_mode="ocean",
                km=km / 3,
                duration_h=None,
                factor=factor,
                passages=passages,
            ),
            RouteLeg(
                name="leg3",
                from_node=to_node,
                to_node="destination_state:TX",
                network="road",
                factor_mode="truck",
                km=km / 3,
                duration_h=None,
                factor=factor,
                passages=(),
            ),
        )
    else:
        legs = (
            RouteLeg(
                name="leg1",
                from_node=from_node,
                to_node=to_node,
                network="sea",
                factor_mode="ocean",
                km=km * 0.8,
                duration_h=None,
                factor=factor,
                passages=passages,
            ),
            RouteLeg(
                name="leg2",
                from_node=to_node,
                to_node="destination_state:TX",
                network="road",
                factor_mode="truck",
                km=km * 0.2,
                duration_h=None,
                factor=factor,
                passages=(),
            ),
        )
    return Route(
        mode=mode,
        legs=legs,
        total_km=km,
        total_duration_h=None,
        total_wtw_kg_co2e_per_t=emissions,
        passages=passages,
        scenario="open",
    )


NODES: dict[str, Node] = {
    "departure_port:A": Node("departure_port", "Port A", "CHN", 31.0, 121.0, "A"),
    "departure_port:B": Node("departure_port", "Port B", "CHN", 31.01, 121.01, "B"),
    "departure_port:C": Node("departure_port", "Port C", "IND", 19.0, 72.8, "C"),
    "departure_port:HUB": Node("departure_port", "Hub", "SGP", 1.3, 103.8, "HUB"),
    "arrival_seaport:LA": Node(
        "arrival_seaport", "Los Angeles", "USA", 33.74, -118.27, "2704", coast_region="west"
    ),
    "arrival_seaport:LB": Node(
        "arrival_seaport", "Long Beach", "USA", 33.77, -118.19, "2709", coast_region="west"
    ),
    "arrival_seaport:NY": Node(
        "arrival_seaport", "New York", "USA", 40.68, -74.04, "0401", coast_region="east"
    ),
    "arrival_seaport:OAK": Node(
        "arrival_seaport", "Oakland", "USA", 37.80, -122.30, "2811", coast_region="west"
    ),
    "destination_state:TX": Node(
        "destination_state", "Texas", "USA", 31.0, -100.0, "TX", coast_region="gulf"
    ),
}


def test_empty_input():
    assert cluster_routes([], NODES) == []


def test_single_route():
    r = _route(100.0)
    result = cluster_routes([r], NODES)
    assert len(result) == 1
    assert result[0].routes == (r,)
    assert result[0].rank == 1
    assert result[0].representative_index == 0


def test_two_near_identical_routes_cluster_together():
    routes = [_route(100.0, km=10000), _route(101.0, km=10100)]
    config = RouteCollapseConfig(min_representatives=1)
    result = cluster_routes(routes, NODES, config)
    assert len(result) == 1
    assert len(result[0].routes) == 2


def test_clear_gap_produces_natural_break():
    routes = [
        _route(100.0),
        _route(101.0),
        _route(102.0),
        _route(150.0),
        _route(151.0),
    ]
    config = RouteCollapseConfig(min_representatives=1)
    result = cluster_routes(routes, NODES, config)
    assert len(result) == 2
    assert len(result[0].routes) == 3
    assert len(result[1].routes) == 2
    assert result[0].break_type == "natural"


def test_uniform_spread_forces_span_splits():
    routes = [_route(100.0 + i * 10) for i in range(10)]
    config = RouteCollapseConfig(
        min_representatives=1,
        dimensions=(DimensionConfig(key="emissions", gap_ratio=3.0, max_span_pct=25.0),),
    )
    result = cluster_routes(routes, NODES, config)
    assert len(result) >= 4


def test_min_representatives_forces_floor_split():
    routes = [_route(100.0), _route(100.5), _route(101.0)]
    config = RouteCollapseConfig(min_representatives=3)
    result = cluster_routes(routes, NODES, config)
    assert len(result) >= 2


def test_max_representatives_merges_clusters():
    routes = [
        _route(100.0),
        _route(200.0),
        _route(300.0),
        _route(400.0),
    ]
    config = RouteCollapseConfig(min_representatives=1, max_representatives=2)
    result = cluster_routes(routes, NODES, config)
    assert len(result) <= 2


def test_max_per_cluster_caps_alternatives():
    routes = [_route(100.0 + i * 0.1) for i in range(10)]
    config = RouteCollapseConfig(min_representatives=1, max_per_cluster=3)
    result = cluster_routes(routes, NODES, config)
    for cluster in result:
        assert len(cluster.routes) <= 3


def test_different_countries_always_separate():
    routes = [
        _route(100.0, from_node="departure_port:A"),
        _route(100.1, from_node="departure_port:C"),
    ]
    config = RouteCollapseConfig(min_representatives=1)
    result = cluster_routes(routes, NODES, config)
    assert len(result) == 2


def test_different_passages_always_separate():
    routes = [
        _route(100.0, passages=("suez",)),
        _route(100.1, passages=("cape",)),
    ]
    config = RouteCollapseConfig(min_representatives=1)
    result = cluster_routes(routes, NODES, config)
    assert len(result) == 2


def test_same_passages_can_cluster():
    routes = [
        _route(100.0, passages=("suez",)),
        _route(100.1, passages=("suez",)),
    ]
    config = RouteCollapseConfig(min_representatives=1)
    result = cluster_routes(routes, NODES, config)
    assert len(result) == 1


def test_passages_distinct_false_ignores_passages():
    routes = [
        _route(100.0, passages=("suez",)),
        _route(100.1, passages=("cape",)),
    ]
    config = RouteCollapseConfig(min_representatives=1, passages_distinct=False)
    result = cluster_routes(routes, NODES, config)
    assert len(result) == 1


def test_different_coast_regions_separate():
    routes = [
        _route(100.0, to_node="arrival_seaport:LA"),
        _route(100.1, to_node="arrival_seaport:NY"),
    ]
    config = RouteCollapseConfig(min_representatives=1)
    result = cluster_routes(routes, NODES, config)
    assert len(result) == 2


def test_nearby_arrival_ports_cluster_together():
    routes = [
        _route(100.0, to_node="arrival_seaport:LA"),
        _route(100.1, to_node="arrival_seaport:LB"),
    ]
    config = RouteCollapseConfig(min_representatives=1, arrival_cluster_km=100.0)
    result = cluster_routes(routes, NODES, config)
    assert len(result) == 1


def test_distant_arrival_ports_separate():
    routes = [
        _route(100.0, to_node="arrival_seaport:LA"),
        _route(100.1, to_node="arrival_seaport:OAK"),
    ]
    config = RouteCollapseConfig(min_representatives=1, arrival_cluster_km=50.0)
    result = cluster_routes(routes, NODES, config)
    assert len(result) == 2


def test_disabled_returns_single_cluster():
    routes = [_route(100.0), _route(200.0), _route(300.0)]
    config = RouteCollapseConfig(enabled=False)
    result = cluster_routes(routes, NODES, config)
    assert len(result) == 1
    assert len(result[0].routes) == 3


def test_emissions_range_covers_all_routes():
    routes = [_route(100.0), _route(150.0), _route(200.0)]
    config = RouteCollapseConfig(min_representatives=1)
    result = cluster_routes(routes, NODES, config)
    for cluster in result:
        for route in cluster.routes:
            assert cluster.emissions_range[0] <= route.total_wtw_kg_co2e_per_t
            assert route.total_wtw_kg_co2e_per_t <= cluster.emissions_range[1]


def test_distance_range_covers_all_routes():
    routes = [_route(100.0, km=5000), _route(100.1, km=15000)]
    config = RouteCollapseConfig(min_representatives=1)
    result = cluster_routes(routes, NODES, config)
    for cluster in result:
        for route in cluster.routes:
            assert cluster.distance_range[0] <= route.total_km
            assert route.total_km <= cluster.distance_range[1]


def test_deterministic_output():
    routes = [_route(100.0 + i * 5) for i in range(8)]
    config = RouteCollapseConfig(min_representatives=2)
    result1 = cluster_routes(routes, NODES, config)
    result2 = cluster_routes(routes, NODES, config)
    assert len(result1) == len(result2)
    for c1, c2 in zip(result1, result2, strict=True):
        assert c1.routes == c2.routes
        assert c1.break_type == c2.break_type


def test_cluster_nodes_by_proximity():
    ids = ["arrival_seaport:LA", "arrival_seaport:LB", "arrival_seaport:NY"]
    clusters = cluster_nodes_by_proximity(ids, NODES, threshold_km=100.0)
    assert clusters["arrival_seaport:LA"] == clusters["arrival_seaport:LB"]
    assert clusters["arrival_seaport:LA"] != clusters["arrival_seaport:NY"]


def test_representative_is_lowest_emissions():
    routes = [_route(150.0), _route(100.0), _route(120.0)]
    config = RouteCollapseConfig(min_representatives=1)
    result = cluster_routes(sorted(routes, key=lambda r: r.total_wtw_kg_co2e_per_t), NODES, config)
    for cluster in result:
        rep = cluster.routes[cluster.representative_index]
        assert all(rep.total_wtw_kg_co2e_per_t <= r.total_wtw_kg_co2e_per_t for r in cluster.routes)


def test_ranks_are_sequential():
    routes = [_route(100.0 + i * 50) for i in range(5)]
    result = cluster_routes(routes, NODES)
    ranks = [c.rank for c in result]
    assert ranks == list(range(1, len(ranks) + 1))


def test_hub_country_partitions_feeder_routes():
    routes = [
        _route(100.0, hub_node="departure_port:HUB"),
        _route(100.1, hub_node="departure_port:A"),
    ]
    config = RouteCollapseConfig(min_representatives=1)
    result = cluster_routes(routes, NODES, config)
    assert len(result) == 2
