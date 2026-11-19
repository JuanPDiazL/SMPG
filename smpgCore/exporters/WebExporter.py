import pandas as pd
import numpy as np
import json
import os
import shutil as sh
import lzma
import base64

from qgis.core import (
    QgsVectorLayer,
    QgsJsonExporter,
)

from ..structures import Dataset

# The web map's coordinates are rounded to a grid of 1/MAP_QUANTIZATION of the map's extent (about
# 10 m on Kenya, 45 m on the Sahel per step): under a pixel at the map's largest zoom on maps of
# km-sized places, and the encoded map is about half as large. Slivers may collapse to nothing or
# flip their winding; the report rewinds them (rewindInvertedPolygons() in js/makeMap.js).
MAP_QUANTIZATION = 1e5

def serialize_dict(input_dict: dict):
    '''Recursively serializes a dictionary and its nested dictionaries to a flattened format.

    Args:
        input_dict (dict): The dictionary to be serialized.

    Returns:
        dict: the serializable dictionary.
    '''
    serialized_dict = {}
    for key, value in input_dict.items():
        if isinstance(value, np.ndarray):
            serialized_dict[key] = value.round(1).tolist()
        elif isinstance(value, (pd.DataFrame, pd.Series)):
            serialized_dict[key] = f'{value.round(1).to_csv()}'
        elif isinstance(value, dict):
            serialized_dict[key] = serialize_dict(value)
        else:
            serialized_dict[key] = value
    return serialized_dict

def compress(data: str) -> str:
    """
    Compresses string data using lzma (the .lzma "alone" format, which the
    report's lzma1 decoder reads) and encodes it as base64.

    Args:
        data (str): The string data to be compressed.

    Returns:
        str: A base64-encoded string representing the compressed data.
    """
    data_bytes = data.encode()
    # a dictionary of the smallest power of two holding the data: for data under preset 6's 8 MB
    # dictionary it compresses as well and needs less memory to decode; larger data uses all of it
    dict_size = 1 << max(12, (len(data_bytes) - 1).bit_length())
    compressed_data = lzma.compress(data_bytes, format=lzma.FORMAT_ALONE,
        filters=[{"id": lzma.FILTER_LZMA1, "preset": 6, "dict_size": dict_size}])
    compressed_data = base64.b64encode(compressed_data).decode("ascii")
    return compressed_data

def data_py_to_js(data_bundle: dict, destination_path: str, filename: str):
    '''Convert a dictionary of Python objects to JavaScript code.

    This function takes a dictionary of Python objects (e.g. DataFrames, dictionaries)
    and generates JavaScript code that can be used to recreate the original data in a web page.

    Args:
        data_bundle (dict): A dictionary where each key is a variable name and each value
                             is a Python object to be converted to JavaScript.
        destination_path (str): The path where the generated JavaScript file will be saved.
        filename (str): The name of the JavaScript file that will be generated.
    '''
    # each variable's text (CSV or JSON), compressed together: one blob lets lzma find the
    # repeats between variables. The report declares each item as a global variable (main.js);
    # the other values (e.g. a missing map's None) are left out, so they stay undeclared
    texts = {}
    for name, data in data_bundle.items():
        if isinstance(data, (pd.DataFrame, pd.Series)):
            texts[name] = data.round(1).to_csv()
        if isinstance(data, dict):
            texts[name] = json.dumps(serialize_dict(data))

    os.makedirs(destination_path, exist_ok=True)
    with open(f'{destination_path}/{filename}.js', 'w') as js_data_wrapper:
        js_data_wrapper.write(f'var report_data = `{compress(json.dumps(texts))}`;')

def geojson_to_topojson(feature_collection: dict, quantization: float, object_name: str = 'map') -> dict:
    """Builds a quantized TopoJSON topology from a GeoJSON FeatureCollection of polygons.

    It decodes to the same rings as pytopojson's Topology()({object_name: feature_collection},
    quantization) (the method of topojson-server), built with NumPy about ten times faster.
    The coordinates are rounded to a grid of `quantization` steps across the layer's bounds;
    consecutive points of a ring rounded to the same grid point are kept once, and a ring left with
    fewer than 4 points is padded with its first one. The rings are then cut into arcs at the
    junctions, the points used with different neighbours (where rings meet or a ring touches
    itself), and every arc is stored once: a ring using it again refers to it (as ~index when
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

    # quantize, as pytopojson's Prequantize: the same bounds and scale, rounded half to even
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
        # delta-encoded, as pytopojson's Delta: the first point, then the moves that aren't zero
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

    # the features as geometries, as pytopojson's Geometry
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

def layer_to_topojson(layer: QgsVectorLayer) -> dict:
    """Converts a vector layer into quantized TopoJSON (see MAP_QUANTIZATION)"""
    exporter = QgsJsonExporter()
    geojson: dict = json.loads(exporter.exportFeatures(layer.getFeatures()))
    return geojson_to_topojson(geojson, MAP_QUANTIZATION)

def export_to_web_files(destination_path, map_layer: QgsVectorLayer, reference_layer: QgsVectorLayer, subFolderName, structured_dataset: Dataset, ):
    """Outputs all the required data for a dynamic web report.

    Args:
        destination_path (str): The path where the web report will be saved.
        structured_dataset (Dataset): The dataset to export.
        vector_layer (QgsVectorLayer): The vector layer to export to the web report.
        subFolderName (str, optional): The name of the subfolder that will hold 
            the web report. Defaults to 'Dynamic_Web_Report'.
    """

    # Create the destination folder if it doesn't exist
    web_subfolder_path = os.path.join(destination_path, subFolderName)
    os.makedirs(web_subfolder_path, exist_ok=True)
    
    # copy web template 
    source_folder = os.path.join(os.path.dirname(__file__), '..', 'res', 'web_template')
    sh.copytree(source_folder, web_subfolder_path, dirs_exist_ok=True)
    # the template is made for a report without a forecast; otherwise some of its files (its
    # layout) are replaced by the ones made for the report's case. Without a current season there
    # is no forecast either.
    override = None
    if structured_dataset.parameters.ignore_current_season:
        override = 'ignoreCurrentSeason'
    elif structured_dataset.parameters.forecast_length > 0:
        override = 'hasForecast'
    if override is not None:
        override_folder = os.path.join(os.path.dirname(__file__), '..', 'res', 'web_template_overrides', override)
        sh.copytree(override_folder, web_subfolder_path, dirs_exist_ok=True)

    # makes subfolder for data
    data_destination_path = os.path.join(web_subfolder_path, 'data')
    os.makedirs(data_destination_path, exist_ok=True)

    # layer as geojson
    topojson_dict = {'topojson_map': None, 'reference_topojson_map': None}
    if map_layer is not None:
        topojson_dict['topojson_map'] = layer_to_topojson(map_layer)
    if reference_layer is not None:
        reference_topojson = layer_to_topojson(reference_layer)
        # a reference identical to the map isn't exported: the report then draws the map's
        if reference_topojson != topojson_dict['topojson_map']:
            topojson_dict['reference_topojson_map'] = reference_topojson
    
    # outputs all the required data for the web report
    places = structured_dataset.places
    
    properties = {
        'dataset_properties_json': structured_dataset.properties.__dict__,
        'parameters_json': structured_dataset.parameters.__dict__,
    }

    general_stats = {
        'place_general_stats_csv': pd.DataFrame(
        [p.place_general_stats for p in places.values()]),
        'place_long_term_stats_csv_obj': {k:v.place_long_term_stats for k, v in places.items()},
        'seasonal_current_totals_csv': pd.DataFrame(
        [p.seasonal_sums_upto_current for p in places.values()]),
        'seasonal_pct_of_avg_csv': pd.DataFrame(
        [p.seasonal_pct_of_avg_upto_current for p in places.values()]),
        'seasonal_forecast_totals_csv': pd.DataFrame(
        [p.seasonal_sums_upto_forecast for p in places.values()]),
        'seasonal_general_stats_csv': pd.DataFrame(
        [p.seasonal_general_stats for p in places.values()]),
        'selected_seasons_general_stats_csv': pd.DataFrame(
        [p.selected_seasons_general_stats for p in places.values()]),
    }

    seasonal_stats = {
        'seasonal_cumsum_csv_obj': {k:v.seasonal_cumsum for k, v in places.items()},
        'seasonal_ensemble_csv_obj': {k:v.seasons_ensemble for k, v in places.items()},
        'seasonal_long_term_stats_csv_obj': {k:v.seasonal_long_term_stats for k, v in places.items()},
        'seasonal_series_csv_obj': {k:v.season_df for k, v in places.items()},
    }

    selected_seasons_stats = {
        'selected_seasons_cumsum_csv_obj': {k:v.selected_seasons_cumsum for k, v in places.items()},
        'selected_seasons_ensemble_csv_obj': {k:v.selected_seasons_ensemble for k, v in places.items()},
        'selected_seasons_ensemble_with_forecast_csv_obj': {k:v.selected_seasons_ensemble_with_forecast for k, v in places.items()},
        'selected_seasons_long_term_stats_csv_obj': {k:v.selected_seasons_long_term_stats for k, v in places.items()},
    }

    # all the report's data in one file (the layout stays in its own, layout.js)
    data_py_to_js({**topojson_dict, **properties, **general_stats, **seasonal_stats, **selected_seasons_stats},
                  data_destination_path, 'data')
