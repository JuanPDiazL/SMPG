import os

from qgis.core import (
    QgsProject,
    QgsVectorLayer,
    QgsVectorLayerJoinInfo,
    QgsGraduatedSymbolRenderer,
    QgsGradientColorRamp,
    QgsClassificationQuantile,
    QgsMessageLog,
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

def get_vector_layers() -> list[QgsVectorLayer]:
    """Get all vector layers in the project.

    Get all vector layers in the project that have the provider "ogr".

    Returns:
        list[QgsVectorLayer]: A list of vector layers in the project.
    """
    layers: dict[str, QgsVectorLayer] = QgsProject.instance().mapLayers()
    vector_layers = []
    for layer in layers.values():
        if layer.providerType() == 'ogr':
            vector_layers.append(layer)
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

# def add_to_group(layer: QgsVectorLayer, group_name: str) -> None:
#     """Add a layer to a group in the project.

#     Args:
#         layer (QgsVectorLayer): The layer to add to the group.
#         group_name (str): The name of the group to add the layer to.
#     """
#     root = QgsProject.instance().layerTreeRoot()
#     group = root.findGroup(group_name)
#     if group is None:
#         group = root.addGroup(group_name)
#     group.addLayer(layer)

def apply_style_file(source: str, map: QgsVectorLayer, attribute: str):
    """Apply a style from a style file to a vector layer.

    Args:
        source (str): The path to the style file.
        map (QgsVectorLayer): The layer to apply the style to.
        attribute (str): The name of the attribute that the style is for.
    """
    map.loadNamedStyle(source)
    map.renderer().setClassAttribute(attribute)
    map.triggerRepaint()

def apply_default_attr_style(map_layer: QgsVectorLayer, class_attribute: str) -> None:
    """Apply a default attribute style to the given map layer.
    
    If the class_attribute is recognized, this function will apply a 
    pre-defined attribute style to the layer. Otherwise, it will fall back to 
    applying a default symbology.
    
    Args:
        map_layer (QgsVectorLayer): The layer object that will receive the 
            style.
        class_attribute (str): A string representing the attribute on which the 
            style is based.
    """
    layer_styles_folder = os.path.join(os.path.dirname(__file__), 'res', 'layer_styles')
    attribute_style_relation = {
        'C. Dk./LTA Pct.':          'rainfall_anomaly_percent_polygon',
        'Ensemble Med./LTA Pct.':   'rainfall_anomaly_percent_polygon',
        'Probability Below Normal': 'prob_below_normal_polygons',
        'Probability in Normal':    'prob_above_normal_polygons',
        'Probability Above Normal': 'prob_above_normal_polygons',
        'Ensemble Med. Pctl.':      'SMPG_most prob scenario at EOS_wet',
        'Current Season Pctl.':     'SMPG_precipitation_percentile',
    }
    for attribute_key in attribute_style_relation:
        if class_attribute.rfind(attribute_key) != -1:
            style_file = attribute_style_relation[attribute_key]
            style_file_path = os.path.join(layer_styles_folder, f'{style_file}.qml')
            apply_style_file(style_file_path, map_layer, class_attribute)
            return
    apply_default_symbology(map_layer, class_attribute)

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