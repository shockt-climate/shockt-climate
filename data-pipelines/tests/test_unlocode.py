import io
import zipfile

import pytest

from shockt.config import EuPortsConfig
from shockt.reference import unlocode

EU = ["NL", "DE", "ES"]


def row(iso2: str, loc: str, name: str, function: str, coordinates: str) -> list[str]:
    return ["", iso2, loc, name, name, "", function, "AI", "0501", "", coordinates, ""]


ROWS = [
    row("NL", "RTM", "Rotterdam", "12345---", "5155N 00430E"),
    row("ES", "VLC", "Valencia", "12345---", ""),
    row("DE", "HAM", "Hamburg", "1-------", "5331N 00956E"),
    row("NL", "UTC", "Utrecht", "--3-----", "5205N 00507E"),
    row("US", "NYC", "New York", "12345---", "4042N 07400W"),
]


def test_parse_coordinates_gives_signed_decimal_degrees() -> None:
    lat, lon = unlocode.parse_coordinates("5155N 00430E") or (0, 0)
    assert lat == pytest.approx(51.9167, abs=1e-4)
    assert lon == pytest.approx(4.5, abs=1e-4)
    south_west = unlocode.parse_coordinates("3356S 15112W") or (0, 0)
    assert south_west[0] < 0 and south_west[1] < 0


def test_parse_coordinates_is_none_where_the_list_gives_none() -> None:
    assert unlocode.parse_coordinates("") is None


def test_parse_coordinates_rejects_an_unreadable_value() -> None:
    with pytest.raises(unlocode.UnlocodeError):
        unlocode.parse_coordinates("51.9,4.5")


def test_select_ports_keeps_config_order_and_leaves_missing_coordinates_blank() -> None:
    ports = unlocode.select_ports(ROWS, ["ESVLC", "NLRTM"], EU)

    assert [p.locode for p in ports] == ["ESVLC", "NLRTM"]
    assert (ports[0].iso3, ports[0].lat, ports[0].lon) == ("ESP", None, None)
    assert ports[1].lat == pytest.approx(51.9167, abs=1e-4)


@pytest.mark.parametrize("locode", ["NLUTC", "USNYC", "NLXXX"])
def test_select_ports_rejects_a_code_that_is_not_an_eu_port(locode: str) -> None:
    with pytest.raises(unlocode.UnlocodeError, match=locode):
        unlocode.select_ports(ROWS, [locode], EU)


def test_code_list_rows_reads_every_part_in_the_zip() -> None:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as z:
        z.writestr("release/csv/UNLOCODE CodeListPart1.csv", ",NL,RTM,Rotterdam,R,,1,,,,,\n")
        z.writestr("release/csv/UNLOCODE CodeListPart2.csv", ",DE,HAM,Hamburg,H,,1,,,,,\n")
        z.writestr("release/csv/SubdivisionCodes.csv", "NL,ZH,Zuid-Holland\n")

    rows = unlocode.code_list_rows(buffer.getvalue())

    assert [r[1] + r[2] for r in rows] == ["NLRTM", "DEHAM"]


def test_eu_ports_config_rejects_a_malformed_or_repeated_locode() -> None:
    with pytest.raises(ValueError, match="UN/LOCODE"):
        EuPortsConfig(ports=["NLRTM", "rotterdam"])
    with pytest.raises(ValueError, match="UN/LOCODE"):
        EuPortsConfig(ports=["NLRTM", "NLRTM"])


def test_write_seed_round_trips_the_selected_ports(tmp_path) -> None:
    ports = unlocode.select_ports(ROWS, ["NLRTM", "ESVLC"], EU)
    path = tmp_path / "seed.csv"

    unlocode.write_seed(ports, path, "test")

    lines = path.read_text().splitlines()
    assert lines[0] == ",".join(unlocode.COLUMNS)
    assert lines[1].startswith("NLRTM,NL,NLD,Rotterdam,Rotterdam,51.9167,4.5000")
    assert lines[2].startswith("ESVLC,ES,ESP,Valencia,Valencia,,")
