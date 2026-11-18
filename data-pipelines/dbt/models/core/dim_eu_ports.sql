/*
EU seaports that are destinations, from `seed_eu_ports` (`shockt ref unlocode`): each at its UN/LOCODE
coordinates, or where the code list gives none, at the most populous GeoNames city of the same
country and name.
*/
with geonames as (
    select distinct on (city.country_code, city.name_normalized)
        city.country_code,
        city.name_normalized,
        city.lat,
        city.lon
    from {{ ref('stg_geonames_cities') }} as city
    order by city.country_code, city.name_normalized, city.population desc
)

select
    port.locode,
    port.iso2,
    port.iso3,
    port.name,
    coalesce(port.lat, geonames.lat) as lat,
    coalesce(port.lon, geonames.lon) as lon,
    case when port.lat is not null then 'unlocode' else 'geonames_city' end as location_method
from {{ ref('seed_eu_ports') }} as port
left join geonames
    on geonames.country_code = port.iso2
    and geonames.name_normalized = {{ normalize_place('port.name_wo_diacritics') }}
