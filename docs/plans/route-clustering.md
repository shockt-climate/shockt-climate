# Route Clustering

- **Status:** proposed
- **Depends on:** [Route Calculator](route-calculator.md), [Cost Calculator](cost-calculator.md) (for future cost dimension)

When the route calculator enumerates routes for an origin–destination pair, many results within a mode bucket can be nearly identical — the same ocean leg to two ports 20 km apart, or two feeder routes through the same hub differing by 3% in emissions. Showing all of them forces the user to scan noise. This plan adds a post-enumeration clustering layer that groups near-identical routes, surfaces one representative per cluster, and keeps the full set available for drill-down.

---

## 1. Design goals

1. **Data-driven separation.** The algorithm finds natural breakpoints in the route set rather than relying on fixed thresholds that must be guessed in advance.
2. **Structural invariants first.** Routes that differ in country, passage set or coast region are always separate, regardless of numerical similarity.
3. **Multi-dimensional.** The clustering must work with emissions alone today and extend to cost and duration without redesign.
4. **Choice sets, not summaries.** Each cluster is a set of individually selectable routes, not a single collapsed result. The user can reject the representative and pick an alternative within the same cluster.
5. **Configurable.** Operators tune sensitivity through a small config; end users get a simple toggle.

---

## 2. Pipeline overview

```
Enumerated routes (n per mode bucket)
  → Stage 1: structural partitioning (hard + configurable rules)
  → Stage 2: Pareto filter across active dimensions
  → Stage 3: hierarchical gap clustering (primary → secondary → tertiary dimension)
  → Stage 4: backfill dominated routes into nearest leaf cluster
  → Return: partitions of clusters of routes
```

Each stage reduces or organizes; none discards data permanently. Dominated routes and collapsed siblings live in their cluster's route list.

---

## 3. Stage 1 — Structural partitioning

Split routes into groups by features that represent qualitatively different logistics choices, regardless of numerical proximity.

### 3.1 Hard invariants (always applied, not configurable)

| Rule | Why |
|---|---|
| Origin country (`iso3`) | Tariffs, rules of origin, sanctions, export controls, supplier relationships — invisible to the system |
| Hub country (feeder routes) | Transshipment regulations, bonded cargo rules |

Two routes from ports 30 km apart but in different customs territories (e.g. Shenzhen and Hong Kong) are always separate. No proximity threshold overrides country.

### 3.2 Configurable partitions (on by default)

| Rule | Method | Default | Config key |
|---|---|---|---|
| Passage set | Set equality | On | `passages_distinct` |
| Arrival coast region | Exact match on `dim_nodes.coast_region` | On | Always on (data-derived, not configurable) |
| Arrival port proximity | Haversine clustering within a coast region | 100 km | `arrival_cluster_km` |
| ~~Departure port proximity~~ | Removed: country partition is sufficient; departure variants within a country are separated by the emissions gap algorithm when they differ meaningfully | — | — |

Coast region (`west`, `east`, `gulf`, `inland`, `noncontiguous`) is already computed on `dim_nodes` by the `coast_region` macro. It provides the coarse geographic partition for free. Proximity clustering operates within a coast region, resolving finer distinctions (LA vs Long Beach = same cluster at 100 km; LA vs Oakland = different clusters).

### 3.3 Partition key

Each route receives a partition key — a tuple of its values on each rule. Routes sharing a key enter the same numerical clustering pipeline; different keys are always separate clusters.

```python
def partition_key(route: Route, nodes: dict[str, Node], ...) -> tuple:
    departure = nodes[route.legs[0].from_node]
    arrival = nodes[route.legs[-1].to_node]
    key: list[object] = [
        departure.iso3,                            # hard invariant
        frozenset(route.passages),                  # passage set
        arrival.coast_region or "unknown",          # coarse arrival geography
        arrival_proximity_clusters[arrival_id],     # fine arrival geography
    ]
    if len(route.legs) >= 3:                        # feeder route
        hub = nodes[route.legs[1].from_node]
        key.insert(1, hub.iso3)                     # hard invariant
    return tuple(key)
```

### 3.4 Proximity clustering for geographic partitions

Uses greedy agglomerative clustering by haversine distance, the same approach as the existing `deduplicate_port_clusters`:

```python
def cluster_nodes_by_proximity(
    node_ids: list[str],
    nodes: dict[str, Node],
    threshold_km: float,
) -> dict[str, int]:
    """Assign each node to a cluster ID. Nodes within threshold_km share a cluster."""
    sorted_ids = sorted(node_ids)  # deterministic ordering
    clusters: list[list[str]] = []
    for nid in sorted_ids:
        placed = False
        for cluster in clusters:
            if any(
                haversine_km(nodes[nid], nodes[member]) < threshold_km
                for member in cluster
            ):
                cluster.append(nid)
                placed = True
                break
        if not placed:
            clusters.append([nid])
    return {nid: i for i, cluster in enumerate(clusters) for nid in cluster}
```

### 3.5 Future: leg mode signature

When the API returns mixed inland modes in a single response (today `inland_mode` is a query parameter), the tuple of transport modes across legs — e.g. `("ocean", "truck")` vs `("ocean", "rail")` — becomes a configurable partition. Not implemented until the API supports it.

---

## 4. Stage 2 — Pareto filter

Within each structural partition, identify routes on the Pareto frontier — those not dominated on any active dimension.

A route is **dominated** if another route in the same partition is at least as good on every dimension and strictly better on at least one:

```
Route A dominates Route B when:
  A.emissions ≤ B.emissions  AND  A.cost ≤ B.cost  AND  A.duration ≤ B.duration
  with at least one strict inequality
```

Dominated routes are not discarded — they are set aside for backfill in Stage 4.

### 4.1 Dimensionality

| Active dimensions | Algorithm | Complexity |
|---|---|---|
| 1 (emissions only, today) | Sorted list; every route is non-dominated | O(n log n) |
| 2 (emissions + cost) | Sort by first, sweep for monotone decrease in second | O(n log n) |
| 3 (emissions + cost + duration) | Brute-force pairwise dominance check | O(n² × d) |

At n ≤ 100 routes per partition and d ≤ 3, all three are sub-millisecond.

### 4.2 Why Pareto

The frontier surfaces the genuine tradeoffs: to get lower emissions you must pay more, or to save time you must accept more CO₂. Routes behind the frontier are strictly worse on all measured axes. The frontier naturally adapts as dimensions are added — no reweighting, no composite score.

### 4.3 Frontier size by dimensionality

| Dimensions | Typical frontier size (of 100 routes) |
|---|---|
| 1 | 100 (all non-dominated) |
| 2 | 8–15 |
| 3 | 25–40 |

At 3 dimensions the frontier retains enough routes for gap clustering to be useful but discards the clearly inferior majority. At 4+ dimensions the frontier retains most routes and stops being a useful filter; if a fourth dimension is added, collapse to a weighted composite score and use 1D gap detection (see §6.3).

### 4.4 Graceful degradation

When cost data is absent (most users today), only emissions is active. With one dimension, every route is non-dominated, so the Pareto filter is a no-op and the pipeline falls through to gap clustering unchanged. No special-casing needed.

---

## 5. Stage 3 — Hybrid gap + width clustering

Within each structural partition, after the Pareto filter, group the surviving routes into clusters using data-driven breakpoint detection.

### 5.1 Algorithm

```
1. Sort frontier routes by emissions (the primary dimension)
2. Compute gaps between consecutive routes
3. Mark natural breaks: gaps where gap > gap_ratio × median_gap
4. Form initial clusters from the breaks
5. SPLIT pass: while any cluster spans > max_span_pct of the partition's median value,
     split it at its largest internal gap
6. FLOOR pass: while total clusters < min_representatives and splittable clusters remain,
     split the widest-spanning cluster at its largest internal gap
7. CAP pass: while total clusters > max_representatives,
     merge the two clusters separated by the smallest gap
```

Steps 3–4 find natural breakpoints (data has clear jumps).
Step 5 forces separation in uniform distributions (no jumps but wide spread).
Steps 6–7 enforce output density guardrails.

### 5.2 The split operation

Always split at the largest internal gap. In a perfectly uniform distribution this is effectively bisection — the right fallback when no natural break exists.

```python
def split_cluster(cluster: list[Route]) -> tuple[list[Route], list[Route]]:
    gaps = [
        cluster[i + 1].total_wtw_kg_co2e_per_t - cluster[i].total_wtw_kg_co2e_per_t
        for i in range(len(cluster) - 1)
    ]
    split_at = max(range(len(gaps)), key=lambda i: gaps[i])
    return cluster[: split_at + 1], cluster[split_at + 1 :]
```

### 5.3 Why gap_ratio × median instead of a fixed threshold

A fixed threshold (e.g. "5% difference") must be guessed and doesn't adapt to the data. A corridor with routes spanning 100–200 kg needs different thresholds than one spanning 45–55 kg. The ratio-of-median approach scales automatically: it asks "is this gap significantly larger than what's typical for *this* set of routes?"

### 5.4 Multi-dimensional clustering

When cost (or duration) is active alongside emissions, the primary sort and gap detection use emissions (the product's core axis). Within each emissions cluster, secondary dimensions trigger sub-splits if they vary enough:

```
1. Sort frontier by emissions → gap detection → primary clusters
2. Within each primary cluster:
   a. If cost range > max_span_pct of partition cost range → sub-split by cost gaps
   b. Within each cost sub-cluster:
      If duration range > max_span_pct → sub-split by duration gaps
3. Result: a tree of clusters, one level per active dimension
```

The dimension order is set by the `dimensions` list in config: position determines hierarchy level. Emissions is always first (the product's reason for existing); cost and duration follow.

### 5.5 Behavior by distribution shape

| Distribution | Gap detection finds | Width/floor does | Result |
|---|---|---|---|
| Clear clusters (gaps) | Natural breaks | Nothing (clusters are narrow) | Natural groups |
| Uniform spread (no gaps) | 0 breaks → 1 cluster | Span exceeds max → recursive splits | ~range/max_span representatives |
| Tight pack (all similar) | 0 breaks → 1 cluster | Span is small | 1 cluster (correct) |
| One outlier + tight pack | 1 break | Floor may add more | 2–3 clusters |
| Mixed: gaps + gentle slope | Breaks at the gaps | Splits any wide slope region | Natural groups + subdivided slopes |

### 5.6 Edge cases

- **≤ 2 routes in partition:** Skip clustering; each route is its own cluster.
- **All gaps ≈ 0 (median ≈ 0):** Everything is one cluster; show the best.
- **Single route in partition:** One cluster, one representative.

---

## 6. Stage 4 — Backfill dominated routes

Routes removed by the Pareto filter are assigned back to the nearest cluster as alternatives. "Nearest" is measured by emissions distance to the cluster's representative (or composite distance when multiple dimensions are active).

Each cluster is a **choice set**: the representative is the default, but any route in the set is selectable. This handles feasibility constraints the system cannot see — a port the shipper doesn't use, a carrier they lack a contract with, operational constraints on equipment or schedule.

---

## 7. Config

```python
@dataclass(frozen=True)
class DimensionConfig:
    """Per-dimension clustering parameters."""
    key: str                # "emissions", "cost", "duration"
    gap_ratio: float        # natural break sensitivity (gap > ratio × median → break)
    max_span_pct: float     # max cluster width as % of median value

@dataclass(frozen=True)
class RouteCollapseConfig:
    """Controls route clustering behavior."""
    enabled: bool = True

    # Stage 1 — structural partitions
    passages_distinct: bool = True
    arrival_cluster_km: float = 100.0

    # Stage 3 — gap + width clustering
    dimensions: tuple[DimensionConfig, ...] = (
        DimensionConfig(key="emissions", gap_ratio=3.0, max_span_pct=25.0),
    )
    min_representatives: int = 1
    max_representatives: int | None = None
    max_per_cluster: int | None = None   # cap alternatives within a cluster

    # Output
    include_dominated: bool = True       # backfill dominated routes into clusters
```

### 7.1 Config knob summary

| Knob | What it controls | Default |
|---|---|---|
| `enabled` | Master switch; `false` bypasses all clustering | `true` |
| `passages_distinct` | Whether different passage sets force separate partitions | `true` |
| `arrival_cluster_km` | Proximity threshold for grouping arrival ports within a coast region | 100 km |
| `dimensions` | Ordered list of active dimensions with per-dimension gap_ratio and max_span_pct | Emissions only |
| `dimensions[].gap_ratio` | How obvious a jump must be to count as a natural break (higher = fewer breaks) | 3.0 |
| `dimensions[].max_span_pct` | Max cluster width as % of median value; forces separation in uniform distributions | 25.0 |
| `min_representatives` | Always show at least this many clusters per partition (if enough routes exist) | 1 |
| `max_representatives` | Hard cap on clusters per partition | None |
| `max_per_cluster` | Cap alternatives within a cluster | None |
| `include_dominated` | Whether to backfill Pareto-dominated routes into clusters | `true` |

### 7.2 Adding cost as a dimension

When cost data is available, add a second entry to `dimensions`:

```python
dimensions = (
    DimensionConfig(key="emissions", gap_ratio=3.0, max_span_pct=25.0),
    DimensionConfig(key="cost",      gap_ratio=3.0, max_span_pct=30.0),
)
```

The Pareto filter activates on both axes; gap clustering runs on emissions first, then sub-splits by cost within each emissions cluster. No structural change to the pipeline.

### 7.3 Four or more dimensions

At 4+ active dimensions, the Pareto frontier retains most routes (few are dominated on all axes simultaneously) and the hierarchical sub-splitting produces deeply nested trees that are hard to present. If a fourth dimension is added, the pipeline switches to a weighted composite score and uses 1D gap detection:

```
score = Σ (weight_d × normalized_value_d)  for each dimension d
```

Weights are set per dimension in config. The composite score replaces the multi-level hierarchy with a single ranked axis. This threshold is an implementation detail, not a user-facing choice.

---

## 8. API surface

### 8.1 Query parameters

| Parameter | Type | Default | Effect |
|---|---|---|---|
| `collapse` | bool | `true` | `false` disables clustering; returns flat route list as today |
| `collapse_pct` | float | — | Overrides `max_span_pct` for the primary dimension |
| `collapse_min` | int | — | Overrides `min_representatives` |

Structural partition rules are not exposed as query parameters — they are backend config.

### 8.2 Response schema

```python
class RouteCluster(BaseModel):
    rank: int                              # cluster rank within the partition
    representative_index: int              # index into routes of the default pick
    routes: list[RouteResponse]            # all routes in the cluster, best first
    emissions_range: tuple[float, float]   # (min, max) kg CO₂e/t
    distance_range: tuple[float, float]    # (min, max) km
    break_type: Literal["natural", "span", "floor"]

class ClusteredCategory(BaseModel):
    clusters: list[RouteCluster]
    partition_keys: list[str]              # human-readable labels for each partition split

class RoutesResponse(BaseModel):
    # Existing flat lists preserved when collapse=false
    vessel_direct: list[RouteResponse]
    vessel_feeder: list[RouteResponse]
    air: list[RouteResponse]
    truck: list[RouteResponse]
    rail: list[RouteResponse]

    # Clustered view, present when collapse=true
    vessel_direct_clustered: ClusteredCategory | None = None
    vessel_feeder_clustered: ClusteredCategory | None = None
    air_clustered: ClusteredCategory | None = None
    truck_clustered: ClusteredCategory | None = None
    rail_clustered: ClusteredCategory | None = None

    # ... existing fields unchanged ...
```

Both views are returned simultaneously during migration. The flat lists serve existing consumers; the clustered view serves the new UI. Once the frontend migrates, the flat lists can be deprecated.

### 8.3 `break_type` semantics

| Value | Meaning | UI hint |
|---|---|---|
| `natural` | A statistically significant gap separates this cluster from the next | Strong visual separator between clusters |
| `span` | Cluster was split because it spanned too wide a range, not because of a natural gap | Subtle divider; "these are separated for readability" |
| `floor` | Cluster was created to meet `min_representatives` | Subtle divider |

---

## 9. Frontend

### 9.1 Layout

Each mode tab shows clusters as card groups. The representative is the primary card; alternatives are indented or in an accordion:

```
├─ Cluster 1: 142–144 kg CO₂e/t
│  ● Shanghai → Port of LA → TX       142.1 kg     ← representative
│    Ningbo → Port of LA → TX         143.0 kg     ← alternative
│    Shanghai → Long Beach → TX       144.2 kg     ← alternative
│
├─ Cluster 2: 151–153 kg CO₂e/t
│  ● Qingdao → Port of LA → TX       151.8 kg
│    Qingdao → Long Beach → TX       152.3 kg
```

### 9.2 Controls

| Control | Location | Effect |
|---|---|---|
| "Show all routes" toggle | OptionsPanel | Sets `collapse=false`; reverts to flat list |
| Cluster expand/collapse | Per cluster | Shows or hides alternatives within a cluster |
| Route selection | Any route card | Selects that route for map display and detail view |

### 9.3 Map interaction

Selecting a cluster highlights the representative's path. Selecting an alternative within the cluster swaps the highlighted path. Clusters the user hasn't interacted with show their representative's path in a muted style.

---

## 10. Where the code lives

| Component | Location |
|---|---|
| `RouteCollapseConfig` dataclass | `engine/src/shockt_engine/clustering.py` |
| Structural partitioning | `engine/src/shockt_engine/clustering.py` |
| Pareto filter | `engine/src/shockt_engine/clustering.py` |
| Gap + width clustering | `engine/src/shockt_engine/clustering.py` |
| `coast_region` on Node | `engine/src/shockt_engine/routing.py` (add field to `Node`) |
| API integration | `app/api/src/shockt_api/routes.py` (apply clustering after enumeration) |
| Response schemas | `app/api/src/shockt_api/schemas.py` |
| Frontend components | `app/web/src/components/ClusteredRouteList.tsx` |

The clustering module is a pure function of a route list and config — no database access, no side effects. It lives in the engine alongside routing, following the same boundary: the API calls it, the engine owns the logic.

---

## 11. Data model change

Add `coast_region` to the engine's `Node` dataclass. The column already exists on `dim_nodes`; it needs to be loaded into the cached data the API reads at startup.

```python
@dataclass(frozen=True)
class Node:
    kind: str
    name: str
    iso3: str
    lat: float
    lon: float
    source_key: str
    coast_region: str | None = None
```

No migration, no new tables. The only data change is reading an existing column.

---

## 12. Implementation phases

### Phase 1 — Single-dimension clustering (emissions only)

1. Add `coast_region` to `Node` and load it from `dim_nodes`
2. Implement `clustering.py`: structural partitioning, gap + width clustering (Pareto is a no-op at 1D)
3. Add `RouteCluster` and `ClusteredCategory` to response schemas
4. Wire clustering into `/routes` endpoint, gated by `collapse` param
5. Build `ClusteredRouteList` component; keep `RouteList` as fallback

### Phase 2 — Multi-dimension clustering (emissions + cost)

Depends on [Cost Calculator](cost-calculator.md) delivering per-route cost.

1. Add `DimensionConfig` for cost to the default config
2. Activate 2D Pareto filter
3. Add cost sub-splitting within emissions clusters
4. Frontend: show cost range on cluster cards, cost column on route rows

### Phase 3 — Duration and beyond

1. Add duration as a third dimension
2. Verify Pareto frontier size stays manageable (expect ~25–40 of 100)
3. If a fourth dimension is added, switch to weighted composite score (§6.3)
