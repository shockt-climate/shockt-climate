"""EU seaports from the UN/LOCODE code list, for the route calculator's destinations.

The code list is a zip of CSV files with one row per location: country, 3-character location code,
name, function digits (`1` in the first position is a port) and coordinates as `DDMMN DDDMME`. The
seed holds the ports named in config/eu_ports.yaml, with the list's coordinates where it has them.
"""

import csv
import io
import re
import zipfile
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path

import pycountry

COLUMNS = ("locode", "iso2", "iso3", "name", "name_wo_diacritics", "lat", "lon", "source")
_COORDINATES = re.compile(r"^(\d{2})(\d{2})([NS]) (\d{3})(\d{2})([EW])$")
_CODE_LIST_FILE = re.compile(r"CodeListPart\d+\.csv$")


class UnlocodeError(Exception):
    """The code list didn't parse, or a configured port isn't an EU port in it."""


@dataclass(frozen=True)
class EuPort:
    locode: str
    iso2: str
    iso3: str
    name: str
    name_wo_diacritics: str
    lat: float | None
    lon: float | None


def parse_coordinates(text: str) -> tuple[float, float] | None:
    """Decimal (lat, lon) from a UN/LOCODE coordinate such as `5155N 00430E`; None where the list
    gives none."""
    if not text:
        return None
    match = _COORDINATES.match(text)
    if match is None:
        raise UnlocodeError(f"unreadable coordinates {text!r}")
    lat_d, lat_m, ns, lon_d, lon_m, ew = match.groups()
    lat = int(lat_d) + int(lat_m) / 60
    lon = int(lon_d) + int(lon_m) / 60
    return (-lat if ns == "S" else lat, -lon if ew == "W" else lon)


def code_list_rows(archive: bytes) -> list[list[str]]:
    """Rows of every code-list CSV in the zip."""
    rows: list[list[str]] = []
    with zipfile.ZipFile(io.BytesIO(archive)) as z:
        names = sorted(n for n in z.namelist() if _CODE_LIST_FILE.search(n))
        if not names:
            raise UnlocodeError("the zip has no UNLOCODE CodeListPart CSV files")
        for name in names:
            text = z.read(name).decode("utf-8")
            rows.extend(csv.reader(io.StringIO(text, newline="")))
    return rows


def select_ports(
    rows: Iterable[Sequence[str]], locodes: Sequence[str], eu_iso2: Sequence[str]
) -> list[EuPort]:
    """The configured ports, in config order. Each must be an EU port (function `1`) in the list."""
    by_locode = {
        row[1] + row[2]: row for row in rows if len(row) == 12 and row[1] in eu_iso2 and row[2]
    }
    ports = []
    for locode in locodes:
        row = by_locode.get(locode)
        if row is None or not row[6].startswith("1"):
            raise UnlocodeError(f"{locode} is not an EU port in the UN/LOCODE code list")
        country = pycountry.countries.get(alpha_2=row[1])
        if country is None:
            raise UnlocodeError(f"ISO 3166 has no country {row[1]}")
        point = parse_coordinates(row[10])
        ports.append(
            EuPort(
                locode,
                row[1],
                country.alpha_3,
                row[3],
                row[4],
                point[0] if point else None,
                point[1] if point else None,
            )
        )
    return ports


def write_seed(ports: Sequence[EuPort], path: Path, source: str) -> None:
    with path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(COLUMNS)
        for p in ports:
            writer.writerow(
                [
                    p.locode,
                    p.iso2,
                    p.iso3,
                    p.name,
                    p.name_wo_diacritics,
                    "" if p.lat is None else f"{p.lat:.4f}",
                    "" if p.lon is None else f"{p.lon:.4f}",
                    source,
                ]
            )
