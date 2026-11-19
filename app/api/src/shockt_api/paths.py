"""The /routes/path endpoint: the sea path `searoute` finds for a stored node pair and scenario."""

import logging
from functools import lru_cache
from importlib.metadata import version

import searoute
from fastapi import APIRouter, HTTPException

from shockt_api.db import CachedData
from shockt_api.schemas import PathResponse

router = APIRouter()
logger = logging.getLogger(__name__)

SCENARIO_CLOSED: dict[str, tuple[str, ...]] = {
    "open": ("northwest",),
    "panama_closed": ("northwest", "panama"),
    "red_sea_closed": ("northwest", "babalmandab"),
    "panama_and_red_sea_closed": ("northwest", "panama", "babalmandab"),
}
"""Passages closed in each scenario, by `searoute`'s names. A test pins this to the pipeline's
`distances.sea.scenarios` in `config/sources.yaml`."""

KM_TOLERANCE = 1.0
"""The stored distances are rounded to 0.1 km; a computed length further off is a mismatch."""

CACHE_SIZE = 512


def _get_data() -> CachedData:
    """Placeholder replaced by `init_paths` with the real cached data."""
    raise RuntimeError("cached data not initialized")


def init_paths(data: CachedData) -> None:
    """Inject the cached data into this module. Called once at startup."""
    global _get_data
    _cached = data
    expected = data.distance_sources.get("sea", "")
    installed = f"searoute {version('searoute')}"
    if expected and expected != installed:
        logger.warning(
            "sea distances were built with %r but %r is installed; paths may not match km",
            expected,
            installed,
        )

    def _get_data() -> CachedData:
        return _cached


@lru_cache(maxsize=CACHE_SIZE)
def _search(
    origin: tuple[float, float], destination: tuple[float, float], closed: tuple[str, ...]
) -> tuple[float, tuple[tuple[float, float], ...], tuple[str, ...]]:
    """Length (km), path as (lat, lon) points and passages crossed. Arguments are (lon, lat)."""
    feature = searoute.searoute(
        list(origin),
        list(destination),
        units="km",
        restrictions=list(closed),
        return_passages=True,
    )
    properties = feature["properties"]
    coordinates = feature["geometry"]["coordinates"]
    path = tuple((float(lat), float(lon)) for lon, lat in coordinates)
    passages = tuple(sorted(properties.get("traversed_passages") or ()))
    return float(properties["length"]), path, passages


@router.get("/routes/path")
def get_path(from_node: str, to_node: str, scenario: str = "open") -> PathResponse:
    closed = SCENARIO_CLOSED.get(scenario)
    if closed is None:
        raise HTTPException(
            status_code=422,
            detail=f"unknown scenario {scenario!r}; expected one of {sorted(SCENARIO_CLOSED)}",
        )

    data = _get_data()
    origin = data.nodes.get(from_node)
    destination = data.nodes.get(to_node)
    if origin is None or destination is None:
        raise HTTPException(status_code=404, detail="unknown node")
    stored = data.distances.sea.get((from_node, to_node), {}).get(scenario)
    if stored is None:
        raise HTTPException(
            status_code=404, detail=f"no stored sea distance for {from_node} -> {to_node}"
        )

    km, path, passages = _search(
        (origin.lon, origin.lat), (destination.lon, destination.lat), closed
    )
    return PathResponse(
        from_node=from_node,
        to_node=to_node,
        scenario=scenario,
        coordinates=[[lat, lon] for lat, lon in path],
        km=round(km, 1),
        stored_km=round(stored.km, 1),
        km_matches=abs(km - stored.km) <= KM_TOLERANCE,
        passages=list(passages),
        closed=list(closed),
        source=f"searoute {version('searoute')}",
    )
