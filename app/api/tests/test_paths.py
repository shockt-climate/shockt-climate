from pathlib import Path

import yaml
from starlette.testclient import TestClient

from shockt_api.paths import SCENARIO_CLOSED

MUMBAI = "departure_port:IND_300"
CHITTAGONG = "departure_port:BGD_100"
ROTTERDAM = "eu_seaport:NLRTM"
SOURCES_YAML = Path(__file__).parents[3] / "data-pipelines" / "config" / "sources.yaml"


def _path(client: TestClient, scenario: str, origin: str = MUMBAI, **extra: str):
    return client.get(
        "/routes/path",
        params={"from_node": origin, "to_node": ROTTERDAM, "scenario": scenario, **extra},
    )


class TestPath:
    def test_open_path_matches_the_stored_distance(self, client: TestClient) -> None:
        resp = _path(client, "open")
        assert resp.status_code == 200
        body = resp.json()
        assert body["km_matches"] is True
        assert body["km"] == body["stored_km"]
        assert {"suez", "babalmandab", "gibraltar"} <= set(body["passages"])
        assert body["closed"] == ["northwest"]
        assert body["source"].startswith("searoute ")

    def test_path_runs_between_the_two_nodes(self, client: TestClient) -> None:
        coordinates = _path(client, "open").json()["coordinates"]
        assert len(coordinates) > 10
        start, end = coordinates[0], coordinates[-1]
        assert abs(start[0] - 18.95) < 2 and abs(start[1] - 72.84) < 2
        assert abs(end[0] - 51.92) < 2 and abs(end[1] - 4.50) < 2

    def test_closing_the_red_sea_diverts_via_the_cape(self, client: TestClient) -> None:
        open_body = _path(client, "open").json()
        closed_body = _path(client, "red_sea_closed").json()
        assert closed_body["km_matches"] is True
        assert closed_body["km"] > open_body["km"]
        assert closed_body["passages"] == ["south_africa"]
        assert closed_body["closed"] == ["northwest", "babalmandab"]
        assert closed_body["coordinates"] != open_body["coordinates"]

    def test_a_length_that_differs_from_the_stored_distance_is_flagged(
        self, client: TestClient
    ) -> None:
        body = _path(client, "open", origin=CHITTAGONG).json()
        assert body["stored_km"] == 15000.0
        assert body["km_matches"] is False

    def test_unknown_scenario_is_rejected(self, client: TestClient) -> None:
        assert _path(client, "no_such_scenario").status_code == 422

    def test_unknown_node_is_not_found(self, client: TestClient) -> None:
        assert _path(client, "open", origin="departure_port:NOPE").status_code == 404

    def test_pair_without_a_stored_distance_is_not_found(self, client: TestClient) -> None:
        resp = client.get(
            "/routes/path",
            params={"from_node": "departure_port:CHN_200", "to_node": ROTTERDAM},
        )
        assert resp.status_code == 404


def test_scenarios_match_the_pipeline_config() -> None:
    config = yaml.safe_load(SOURCES_YAML.read_text())
    declared = config["distances"]["sea"]["scenarios"]
    assert {name: tuple(closed) for name, closed in declared.items()} == SCENARIO_CLOSED
