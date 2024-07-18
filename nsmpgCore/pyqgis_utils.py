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

def load_layer_file(source: str):
    source = os.path.normpath(source)
    basename_split = os.path.splitext(os.path.basename(source))
    filename = basename_split[0]
    extension = basename_split[1]
    if extension == '.shp':
        return QgsVectorLayer(source, filename, "ogr")
    elif extension == '.csv':
        return QgsVectorLayer(f'file:///{source}?type=csv&detectTypes=yes&geomType=none', filename, "delimitedtext")

def get_fields(layer :QgsVectorLayer) -> list[str]:
    if layer is not None:
        return layer.fields().names()
    return []

def get_vector_layers() -> list[QgsVectorLayer]:
    layers: dict[str, QgsVectorLayer] = QgsProject.instance().mapLayers()
    vector_layers = []
    for layer in layers.values():
        if layer.providerType() == 'ogr':
            vector_layers.append(layer)
    return vector_layers

def join_layers(data_layer: QgsVectorLayer, target_layer: QgsVectorLayer, target_field: str):
    join = QgsVectorLayerJoinInfo()
    join.setJoinLayer(data_layer)
    join.setJoinFieldName('field_1')
    join.setTargetFieldName(target_field)
    join.setUsingMemoryCache(True)
    target_layer.addJoin(join)

def add_to_project(*layers: QgsVectorLayer) -> None:
    for layer in layers:
        if not layer.isValid():
            QgsMessageLog.logMessage('Could not load the layer.')
        else: 
            QgsProject.instance().addMapLayer(layer)

def add_to_group(layer: QgsVectorLayer, group_name: str) -> None:
    root = QgsProject.instance().layerTreeRoot()
    group = root.findGroup(group_name)
    if group is None:
        group = root.addGroup(group_name)
    group.addLayer(layer)

def apply_style_file(source: str, map: QgsVectorLayer, attribute: str):
    map.loadNamedStyle(source)
    map.renderer().setClassAttribute(attribute)
    map.triggerRepaint()

def apply_default_symbology(map_layer: QgsVectorLayer, class_attribute: str, nclasses=10):
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
    if name == '': name = layer.name()
    layer.setName(prefix + name + suffix)