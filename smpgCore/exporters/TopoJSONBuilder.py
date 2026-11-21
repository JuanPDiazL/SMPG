"""Builds TopoJSON from GeoJSON with NumPy, for the web report's map (see WebExporter.py)."""
import math
from typing import Callable, List, Optional, Set

import numpy as np

# The report zooms a place until it fills 60% of the map's view: in a 1200-px-wide view (a
# maximized map card) the place then spans this many pixels (see simplify_topojson())
FOCUSED_PLACE_PX = 720
# What that view shows around the place: a square this many times the place's size, centred on it
# (its smaller side spans size / 0.6; the square covers views up to twice as wide as tall)
FOCUSED_VIEW_SPAN = 2 / 0.6


def geojson_to_topojson(feature_collection: dict, quantization: float, object_name: str = 'map') -> dict:
    """Builds a quantized TopoJSON topology from a GeoJSON FeatureCollection of polygons.

    The method of topojson-server; with the same quantization it gives the same arcs as pytopojson
    (its Python port, the plugin's converter before; checked on the sample maps), built with NumPy
    about ten times faster.
    The coordinates are rounded to a grid of `quantization` steps across the layer's bounds;
    consecutive points of a ring rounded to the same grid point are kept once, and a ring left with
    fewer than 4 points is padded with its first one. The rings are then cut into arcs at the
    junctions, the points rings use with different neighbours (where rings meet; a ring touching
    itself isn't cut there), and every arc is stored once: a ring using it again refers to it (as ~index when
    reversed). A ring without junctions is stored whole, matched whatever its starting point.

    Args:
        feature_collection (dict): Features with a Polygon or MultiPolygon geometry, or none.
        quantization (float): The number of grid steps across the bounds (e.g. 1e5).
        object_name (str, optional): The name of the layer in the topology's objects.
            Defaults to 'map'.

    Returns:
        dict: The TopoJSON topology, with its transform and delta-encoded arcs.

    Raises:
        ValueError: If a geometry isn't a Polygon or a MultiPolygon.
    """
    # every feature's polygons (lists of rings), None without a geometry
    feature_polygons = []
    for feature in feature_collection['features']:
        geometry = feature['geometry']
        if geometry is None:
            feature_polygons.append(None)
        elif geometry['type'] == 'Polygon':
            feature_polygons.append([geometry['coordinates']])
        elif geometry['type'] == 'MultiPolygon':
            feature_polygons.append(geometry['coordinates'])
        else:
            raise ValueError(f"Only polygons can be converted to TopoJSON, not {geometry['type']}.")
    raw_rings = [np.asarray(ring, dtype=float)[:, :2]
                 for polygons in feature_polygons if polygons for polygon in polygons for ring in polygon]

    # quantize with topojson-server's bounds and scale, rounded half to even as pytopojson did
    arcs = []
    topology_extras = {}
    rings = []  # every ring's grid points, without its closing point
    if raw_rings:
        points = np.concatenate(raw_rings)
        x_0, y_0 = (float(v) for v in points.min(axis=0))
        x_1, y_1 = (float(v) for v in points.max(axis=0))
        k_x = (quantization - 1) / (x_1 - x_0) if x_0 < x_1 else 1
        k_y = (quantization - 1) / (y_1 - y_0) if y_0 < y_1 else 1
        grid = np.empty(points.shape, dtype=np.int64)
        grid[:, 0] = np.rint((points[:, 0] - x_0) * k_x)
        grid[:, 1] = np.rint((points[:, 1] - y_0) * k_y)
        topology_extras = {'bbox': [x_0, y_0, x_1, y_1],
                           'transform': {'scale': [1 / k_x, 1 / k_y], 'translate': [x_0, y_0]}}

        ring_starts = np.cumsum([0] + [len(ring) for ring in raw_rings[:-1]])
        is_kept = np.ones(len(grid), dtype=bool)
        is_kept[1:] = (grid[1:] != grid[:-1]).any(axis=1)
        is_kept[ring_starts] = True
        kept_counts = np.add.reduceat(is_kept.astype(np.int64), ring_starts)
        for ring in np.split(grid[is_kept], np.cumsum(kept_counts)[:-1]):
            if len(ring) < 4:
                ring = np.concatenate([ring, np.repeat(ring[:1], 4 - len(ring), axis=0)])
            if (ring[0] == ring[-1]).all():
                ring = ring[:-1]
            rings.append(ring)

    if rings:
        ring_lengths = np.array([len(ring) for ring in rings], dtype=np.int64)
        ring_starts = np.concatenate([[0], np.cumsum(ring_lengths)[:-1]])
        points = np.concatenate(rings)

        # a point id per distinct grid point
        _, point_ids = np.unique(points[:, 0] * (int(points[:, 1].max()) + 1) + points[:, 1],
                                 return_inverse=True)
        point_ids = point_ids.ravel()

        # each point's neighbours in its ring (rings are cyclic); a junction is a point used with
        # more than one pair of neighbours. Only a ring's first visit of a point counts, so a ring
        # touching itself isn't cut there (as topojson-server, which ignores self-intersections)
        position = np.arange(len(points))
        start = np.repeat(ring_starts, ring_lengths)
        length = np.repeat(ring_lengths, ring_lengths)
        previous_ids = point_ids[start + (position - start - 1) % length]
        next_ids = point_ids[start + (position - start + 1) % length]
        ring_of_point = np.repeat(np.arange(len(rings)), ring_lengths)
        _, first_visits = np.unique(np.stack([point_ids, ring_of_point], axis=1), axis=0, return_index=True)
        neighbour_pairs = np.unique(np.stack([point_ids, np.minimum(previous_ids, next_ids),
                                              np.maximum(previous_ids, next_ids)], axis=1)[first_visits], axis=0)
        is_junction = np.bincount(neighbour_pairs[:, 0], minlength=len(points))[point_ids] > 1
    else:
        ring_lengths = ring_starts = point_ids = is_junction = None

    open_arc_index = {}    # an arc's point ids (bytes) -> its index
    closed_arc_index = {}  # a closed ring's point ids from its lowest one (bytes) -> its index

    def add_arc(arc_points: np.ndarray) -> int:
        # delta-encoded, as topojson-server's delta: the first point, then the moves that aren't zero
        moves = np.diff(arc_points, axis=0)
        moves = moves[(moves != 0).any(axis=1)]
        if len(moves) == 0:
            moves = np.zeros((1, 2), dtype=np.int64)
        arcs.append([arc_points[0].tolist()] + moves.tolist())
        return len(arcs) - 1

    def open_arc(indexes: np.ndarray) -> int:
        ids = point_ids[indexes]
        key = ids.tobytes()
        if key in open_arc_index:
            return open_arc_index[key]
        reverse_key = ids[::-1].tobytes()
        if reverse_key in open_arc_index:
            return ~open_arc_index[reverse_key]
        open_arc_index[key] = add_arc(points[indexes])
        return open_arc_index[key]

    def closed_arc(indexes: np.ndarray) -> int:
        ids = point_ids[indexes]
        forward = np.roll(indexes, -int(np.argmin(ids)))
        key = point_ids[forward].tobytes()
        if key in closed_arc_index:
            return closed_arc_index[key]
        backward = np.roll(indexes[::-1], -int(np.argmin(ids[::-1])))
        reverse_key = point_ids[backward].tobytes()
        if reverse_key in closed_arc_index:
            return ~closed_arc_index[reverse_key]
        closed_arc_index[key] = add_arc(points[np.append(forward, forward[0])])
        return closed_arc_index[key]

    def ring_arcs(ring_index: int) -> list:
        first, count = ring_starts[ring_index], ring_lengths[ring_index]
        indexes = np.arange(first, first + count)
        cuts = np.flatnonzero(is_junction[indexes])
        if len(cuts) == 0:
            return [closed_arc(indexes)]
        # from the first junction around the ring and back to it
        rotated = np.append(np.roll(indexes, -cuts[0]), indexes[cuts[0]])
        bounds = list(cuts - cuts[0]) + [count]
        return [open_arc(rotated[bounds[i]:bounds[i + 1] + 1]) for i in range(len(bounds) - 1)]

    # the features as geometries, as topojson-server's geometry
    geometries = []
    ring_index = 0
    for feature, polygons in zip(feature_collection['features'], feature_polygons):
        if polygons is None:
            geometry = {'type': None}
        else:
            polygon_arcs = []
            for polygon in polygons:
                polygon_arcs.append([ring_arcs(ring_index + i) for i in range(len(polygon))])
                ring_index += len(polygon)
            geometry = {'type': feature['geometry']['type'],
                        'arcs': polygon_arcs[0] if feature['geometry']['type'] == 'Polygon' else polygon_arcs}
            if feature['geometry'].get('bbox') is not None:
                geometry['bbox'] = feature['geometry']['bbox']
        if feature.get('id'):
            geometry['id'] = feature['id']
        if feature.get('bbox') is not None:
            geometry['bbox'] = feature['bbox']
        if feature.get('properties'):
            geometry['properties'] = feature['properties']
        geometries.append(geometry)

    collection = {'type': 'GeometryCollection', 'geometries': geometries}
    if feature_collection.get('bbox') is not None:
        collection['bbox'] = feature_collection['bbox']
    return {'type': 'Topology', 'objects': {object_name: collection}, 'arcs': arcs, **topology_extras}


def simplify_topojson(topology: dict, max_shift_px: float, simplify_lines: Callable,
                      find_broken_places: Callable, object_name: str = 'map') -> dict:
    """Simplifies a quantized topology's arcs, by at most max_shift_px at each place's own zoom.

    Each arc is simplified once (Douglas-Peucker, by simplify_lines()), keeping its end points, so
    borders shared by two places stay shared. Its tolerance is the size (the larger side of the
    bounding box, in metres) of the smallest place whose zoomed view shows it (FOCUSED_VIEW_SPAN)
    × max_shift_px / FOCUSED_PLACE_PX: zoomed to any place as the report does, no border in view
    moves by more than max_shift_px, and borders near places without a size (slivers) aren't
    simplified. Places that break (find_broken_places(), or a ring
    left without area) get their original arcs back, until none breaks.

    Args:
        topology (dict): A topology from geojson_to_topojson(), with a transform.
        max_shift_px (float): The largest shift of a border, in pixels, at a place's zoom.
        simplify_lines (Callable): (lines, tolerances) -> lines: simplifies each line (an (n, 2)
            array, in metres) by its tolerance, keeping its first and last points, and returns a
            subset of its points (see simplify_lines() in pyqgis_utils.py).
        find_broken_places (Callable): (original, changed, checked) -> set of indexes: the
            places among checked (changed since the last call) that became invalid or overlap
            another place, given every place's original polygons and the changed places' new ones
            (see find_broken_places() in pyqgis_utils.py); each place is None or a list of
            polygons, each a list of rings ((n, 2) arrays of longitude, latitude).
        object_name (str, optional): The layer's name in the topology's objects. Defaults to 'map'.

    Returns:
        dict: A new topology with the simplified arcs (delta-encoded); the others are the same.
    """
    if 'transform' not in topology or not topology['arcs']:
        return topology
    scale = np.array(topology['transform']['scale'], dtype=float)
    translate = np.array(topology['transform']['translate'], dtype=float)
    arcs = [np.cumsum(np.array(arc, dtype=np.int64), axis=0) for arc in topology['arcs']]
    # metres per grid step, at the map's mean latitude (its places span at most a few degrees)
    latitude = translate[1] + scale[1] * np.concatenate(arcs)[:, 1].mean()
    metres = scale * np.array([111320 * math.cos(math.radians(latitude)), 110540])

    geometries = topology['objects'][object_name]['geometries']
    place_arcs = [None if geometry.get('type') is None else _arc_indexes(geometry['arcs'])
                  for geometry in geometries]
    # every place's zoomed view (a square around it, in grid units) and the tolerance it needs
    views, view_tolerances = [], []
    for indexes in place_arcs:
        if indexes:
            points = np.concatenate([arcs[i] for i in indexes])
            low, high = points.min(axis=0), points.max(axis=0)
            size = ((high - low) * metres).max()
            half_span = size * FOCUSED_VIEW_SPAN / 2 / metres
            views.append(np.concatenate([(low + high) / 2 - half_span, (low + high) / 2 + half_span]))
            view_tolerances.append(size * max_shift_px / FOCUSED_PLACE_PX)
    views, view_tolerances = np.array(views).reshape(-1, 4), np.array(view_tolerances)
    # each arc: the smallest tolerance among the views its bounding box meets
    arc_boxes = np.array([np.concatenate([arc.min(axis=0), arc.max(axis=0)]) for arc in arcs])
    in_view = ((arc_boxes[:, None, 0] <= views[None, :, 2]) & (arc_boxes[:, None, 2] >= views[None, :, 0])
               & (arc_boxes[:, None, 1] <= views[None, :, 3]) & (arc_boxes[:, None, 3] >= views[None, :, 1]))
    tolerances = np.where(in_view, view_tolerances[None, :], np.inf).min(axis=1, initial=np.inf)
    tolerances[~np.isfinite(tolerances)] = 0

    simplified_lines = simplify_lines([arc * metres for arc in arcs], tolerances.tolist())
    simplified = []
    for arc, line in zip(arcs, simplified_lines):
        points = np.rint(line / metres).astype(np.int64)
        # only shorter subsets of the arc with its end points are used; otherwise the arc itself
        simplified.append(points if 2 <= len(points) < len(arc) and (points[0] == arc[0]).all()
                          and (points[-1] == arc[-1]).all() else arc)

    def place_rings(arc_points: List[np.ndarray], geometry: dict) -> Optional[list]:
        """the place's polygons as lists of rings of grid points, joined from its arcs"""
        if geometry.get('type') is None:
            return None
        polygons = [geometry['arcs']] if geometry['type'] == 'Polygon' else geometry['arcs']
        rings = []
        for polygon in polygons:
            polygon_rings = []
            for ring in polygon:
                parts = [arc_points[i] if i >= 0 else arc_points[~i][::-1] for i in ring]
                # consecutive arcs share their joining point
                polygon_rings.append(np.concatenate([parts[0]] + [part[1:] for part in parts[1:]]))
            rings.append(polygon_rings)
        return rings
    def to_degrees(rings: Optional[list]) -> Optional[list]:
        return None if rings is None else [[translate + ring * scale for ring in polygon] for polygon in rings]
    def area(ring: np.ndarray) -> float:
        return abs(np.dot(ring[:-1, 0], ring[1:, 1]) - np.dot(ring[1:, 0], ring[:-1, 1])) / 2

    original_rings = [place_rings(arcs, geometry) for geometry in geometries]
    original_polygons = [to_degrees(rings) for rings in original_rings]
    restored: Set[int] = set()
    newly_restored: Set[int] = set()
    first_check = True
    while True:
        current = [arcs[i] if i in restored else simplified[i] for i in range(len(arcs))]
        changed = [place for place, indexes in enumerate(place_arcs)
                   if indexes and any(current[i] is not arcs[i] for i in indexes)]
        # after the first check, only the places whose arcs were just restored changed
        checked = changed if first_check else [place for place, indexes in enumerate(place_arcs)
                                               if indexes and newly_restored.intersection(indexes)]
        first_check = False
        current_rings = {place: place_rings(current, geometries[place]) for place in changed}
        broken = set(find_broken_places(original_polygons,
                                        {place: to_degrees(rings) for place, rings in current_rings.items()},
                                        checked))
        broken |= {place for place in checked if place in current_rings
                   and any(area(before) > 0 and area(after) == 0
                           for polygon_before, polygon_after in zip(original_rings[place], current_rings[place])
                           for before, after in zip(polygon_before, polygon_after))}
        newly_restored = {i for place in broken for i in place_arcs[place]} - restored
        if not newly_restored:
            break
        restored |= newly_restored

    def delta(points: np.ndarray) -> list:
        moves = np.diff(points, axis=0)
        moves = moves[(moves != 0).any(axis=1)]
        if len(moves) == 0:
            moves = np.zeros((1, 2), dtype=np.int64)
        return [points[0].tolist()] + moves.tolist()
    return {**topology, 'arcs': [delta(points) for points in current]}


def _arc_indexes(arcs: list) -> List[int]:
    """The arcs a geometry uses (their indexes, reversed ones as their own), from its nested lists."""
    if isinstance(arcs, list):
        return sorted({i for item in arcs for i in _arc_indexes(item)})
    return [~arcs if arcs < 0 else arcs]
