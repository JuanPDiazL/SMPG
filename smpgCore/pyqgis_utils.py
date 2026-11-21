import os
import struct
from typing import Dict, List, Optional, Set

import numpy as np

from qgis.PyQt.QtGui import QColor
from qgis.PyQt import QtCore

from qgis.core import (
    QgsProject,
    QgsVectorLayer,
    QgsVectorLayerJoinInfo,
    QgsGraduatedSymbolRenderer,
    QgsCategorizedSymbolRenderer,
    QgsGradientColorRamp,
    QgsFillSymbol,
    QgsSimpleFillSymbolLayer,
    QgsRendererRange,
    QgsRendererCategory,
    QgsClassificationQuantile,
    QgsMessageLog,
    QgsWkbTypes,
    QgsGeometry,
    QgsFeature,
    QgsSpatialIndex,
)

def load_layer_file(source: str) -> QgsVectorLayer:
    """Load a vector layer from a file.

    Args:
        source (str): The path to the layer file.

    Returns:
        QgsVectorLayer: The loaded layer.
    """
    source = os.path.normpath(source)
    filename, extension = os.path.splitext(os.path.basename(source))
    if extension == '.shp':
        return QgsVectorLayer(source, filename, "ogr")
    elif extension == '.csv':
        return QgsVectorLayer(f'file:///{source}?type=csv&detectTypes=yes&geomType=none', filename, "delimitedtext")
    
def validate_layer(layer: QgsVectorLayer) -> QgsVectorLayer:
    """Validate a vector layer.
    It will return the layer if it is valid, otherwise it will return None.
    
    Args:
        layer (QgsVectorLayer): The layer to validate.

    Returns:
        QgsVectorLayer: The validated layer or None if it is not valid.
    """
    if layer is None or not layer.isValid():
        return None
    return layer


def get_fields(layer :QgsVectorLayer) -> list[str]:
    """Get the fields of a vector layer.

    Args:
        layer (QgsVectorLayer): The layer to get the fields for.

    Returns:
        list[str]: A list of field names in the layer.
    """
    if layer is not None:
        return layer.fields().names()
    return []

def get_polygon_field_data(layer :QgsVectorLayer, field: str) -> dict[str, str]:
    """Get the field data for each polygon of a layer.
    
    Args:
        layer (QgsVectorLayer): The layer to get the polygon IDs from.
        field (str): The field to get the data for.

    Returns:
       dict[str]: A dictionary with polygon IDs as keys and field data as values.
    """
    field_data = {}
    for feature in layer.getFeatures():
        if feature.geometry().type() == QgsWkbTypes.PolygonGeometry:
            field_data[feature.id()] = feature[field]
    return field_data

def get_vector_layers() -> dict[str, QgsVectorLayer]:
    """Get all vector layers in the project.

    Get all vector layers in the project that have the provider "ogr".

    Returns:
        dict[str, QgsVectorLayer]: A dictionary of vector layers in the project.
    """
    layers: dict[str, QgsVectorLayer] = QgsProject.instance().mapLayers().values()
    vector_layers = {v.name(): v for v in layers if v.providerType() == 'ogr'}
    return vector_layers

def join_layers(data_layer: QgsVectorLayer, target_layer: QgsVectorLayer, target_field: str):
    """Join two layer attribute tables together.

    Args:
        data_layer (QgsVectorLayer): The layer to join from.
        target_layer (QgsVectorLayer): The layer to join to.
        target_field (str): The field in the target layer that will be used for 
            joining.
    """
    join = QgsVectorLayerJoinInfo()
    join.setJoinLayer(data_layer)
    join.setJoinFieldName('field_1')
    join.setTargetFieldName(target_field)
    join.setUsingMemoryCache(True)
    target_layer.addJoin(join)

def add_to_project(*layers: QgsVectorLayer) -> None:
    """Add one or more layers to the current QGIS project.

    Args:
        *layers (QgsVectorLayer): The layers to add to the project.
    """
    for layer in layers:
        if not layer.isValid():
            QgsMessageLog.logMessage('Could not load the layer.')
        else: 
            QgsProject.instance().addMapLayer(layer)

def apply_style_file(source: str, map: QgsVectorLayer, attribute: str):
    """Apply a style from a file to a vector layer.

    Args:
        source (str): The path to the style file.
        map (QgsVectorLayer): The layer to apply the style to.
        attribute (str): The name of the attribute that the style is for.
    """
    map.loadNamedStyle(source)
    map.renderer().setClassAttribute(attribute)
    map.triggerRepaint()

def apply_symbology(map_layer: QgsVectorLayer, class_attribute: str, symbology: dict) -> None:
    """Apply a symbology to the given map layer.
    
    Args:
        map_layer (QgsVectorLayer): The layer object that will receive the 
            style.
        class_attribute (str): A string representing the attribute on which the 
            style is based.
        symbology (dict): A dictionary containing the symbology information.
    """
    legend_type = symbology["type"]
    legend = symbology["legend"]
    legend_classes = []
    if legend_type == "graduated":
        renderer_constructor = QgsGraduatedSymbolRenderer
        renderer_class_constructor = QgsRendererRange
    elif legend_type == "categorized":
        renderer_constructor = QgsCategorizedSymbolRenderer
        renderer_class_constructor = QgsRendererCategory
    for key, value in legend.items():
        symbol_layer = QgsSimpleFillSymbolLayer(
            color=QColor(value["color"]), 
            strokeStyle=QtCore.Qt.PenStyle.NoPen
        )
        symbol = QgsFillSymbol([symbol_layer])
        legend_class = renderer_class_constructor(*value["values"], symbol, key)
        legend_classes.append(legend_class)
    renderer = renderer_constructor(class_attribute, legend_classes)
    map_layer.setRenderer(renderer)

def apply_default_symbology(map_layer: QgsVectorLayer, class_attribute: str, nclasses=10):
    """Apply a default symbology to the given map layer.
    
    This function uses the QgsGraduatedSymbolRenderer class to generate a 
    default symbology for the layer, using the specified class_attribute as the 
    classification method. The resulting symbology will have a gradient color 
    ramp with three stops: 0.25 (white), 0.50 (gray), and 0.75 (black).

    Args:
        map_layer (QgsVectorLayer): The layer object that will receive the 
            symbology.
        class_attribute (str): A string representing the attribute on which the 
            symbology is based.
        nclasses (int): An integer representing the number of classes for the 
            symbology.
    """
    color_ramp_properties = {
        'color1':'255,255,255,255', 
        'stops':'0.25;192,192,192,255:0.50;128,128,128,255:0.75;64,64,64,255',
        'color2':'0,0,0,255',
        }
    color_ramp = QgsGradientColorRamp.create(color_ramp_properties)
    renderer = QgsGraduatedSymbolRenderer()
    renderer.setSourceColorRamp(color_ramp)
    renderer.setClassAttribute(class_attribute)
    renderer.setClassificationMethod(QgsClassificationQuantile())
    renderer.updateClasses(map_layer, nclasses)
    map_layer.setRenderer(renderer)

def rename_layer(layer: QgsVectorLayer, name='', prefix='', suffix=''):
    """Rename a vector layer.

    Args:
        layer (QgsVectorLayer): The layer to rename.
        name (str, optional): The new name for the layer. Defaults to ''.
        prefix (str, optional): A prefix to add to the new name. 
            Defaults to ''.
        suffix (str, optional): A suffix to add to the new name. 
            Defaults to ''.
    """
    if name == '': name = layer.name()
    layer.setName(prefix + name + suffix)

def get_root():
    return QgsProject.instance().layerTreeRoot()

def simplify_lines(lines: List[np.ndarray], tolerances: List[float]) -> List[np.ndarray]:
    """Simplifies each line with GEOS's Douglas-Peucker (QgsGeometry.simplify()), which keeps its
    first and last points and returns a subset of its points.

    Args:
        lines (list[ndarray]): The lines, (n, 2) arrays.
        tolerances (list[float]): Each line's tolerance: the farthest a point may be from the
            simplified line, in the lines' units; 0 leaves the line as it is.

    Returns:
        list[ndarray]: The simplified lines.
    """
    simplified = []
    for line, tolerance in zip(lines, tolerances):
        if tolerance <= 0 or len(line) <= 2:
            simplified.append(line)
            continue
        # through WKB (little-endian LineString), much faster than building points one by one
        geometry = QgsGeometry()
        geometry.fromWkb(struct.pack('<BII', 1, 2, len(line)) + np.ascontiguousarray(line, '<f8').tobytes())
        wkb = bytes(geometry.simplify(float(tolerance)).asWkb())
        if len(wkb) < 9 or struct.unpack_from('<BI', wkb) != (1, 2):
            simplified.append(line)
            continue
        count = struct.unpack_from('<I', wkb, 5)[0]
        simplified.append(np.frombuffer(wkb, '<f8', 2 * count, 9).reshape(count, 2))
    return simplified

def find_broken_places(original: List[Optional[list]], changed: Dict[int, Optional[list]],
                       checked: List[int]) -> Set[int]:
    """The places that a change of geometry broke: valid before and invalid now (e.g. a border
    crossing itself), or overlapping a place they didn't overlap before. Problems the original
    geometries already had are left alone.

    Args:
        original (list): Every place's polygons: None, or a list of polygons, each a list of rings
            ((n, 2) arrays of x, y, closed).
        changed (dict): The new polygons of every place that differs from the original, by index.
        checked (list[int]): The places to check (with every place they touch): those changed
            since the last check.

    Returns:
        set[int]: The broken places' indexes.
    """
    def geometry(polygons: Optional[list]) -> Optional[QgsGeometry]:
        if not polygons:
            return None
        parts = [struct.pack('<BII', 1, 6, len(polygons))]   # little-endian MultiPolygon
        for rings in polygons:
            parts.append(struct.pack('<BII', 1, 3, len(rings)))
            for ring in rings:
                parts.append(struct.pack('<I', len(ring)) + np.ascontiguousarray(ring, '<f8').tobytes())
        result = QgsGeometry()
        result.fromWkb(b''.join(parts))
        return result
    def interiors_meet(a: QgsGeometry, b: QgsGeometry) -> bool:
        """whether two places overlap (more than a shared border)"""
        engine = QgsGeometry.createGeometryEngine(a.constGet())
        engine.prepareGeometry()
        return engine.relatePattern(b.constGet(), 'T********')
    before = [geometry(polygons) for polygons in original]
    after = list(before)
    for place, polygons in changed.items():
        after[place] = geometry(polygons)
    index = QgsSpatialIndex()
    for place, place_geometry in enumerate(after):
        if place_geometry is not None:
            feature = QgsFeature(place)
            feature.setGeometry(place_geometry)
            index.addFeature(feature)
    broken = set()
    checked_set = set(checked)
    for place in checked:
        if after[place] is None:
            continue
        if before[place].isGeosValid() and not after[place].isGeosValid():
            broken.add(place)
        for other in index.intersects(after[place].boundingBox()):
            if other == place or (other in checked_set and other < place):
                continue   # each pair once
            # the original pair only when needed: overlaps are rare
            if interiors_meet(after[place], after[other]) and not interiors_meet(before[place], before[other]):
                broken.update((place, other))
    return broken
