
import os
from qgis.core import (
    QgsProject,
    QgsVectorLayer,
    QgsVectorLayerJoinInfo, 
    QgsSymbol,
    QgsRendererRange,
    QgsGraduatedSymbolRenderer,
    QgsApplication,
    QgsGradientColorRamp
)

def load_layer(source: str):
    source = os.path.normpath(source)
    basename_split = os.path.splitext(os.path.basename(source))
    filename = basename_split[0]
    extension = basename_split[1]
    if extension == '.shp':
        return QgsVectorLayer(source, filename, "ogr")
    elif extension == '.csv':
        return QgsVectorLayer(f'file:///{source}?type=csv&detectTypes=yes&geomType=none', filename, "delimitedtext")

def get_fields(layer :QgsVectorLayer) -> list[str]:
    return layer.fields().names()

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

def apply_style_file(source: str, map: QgsVectorLayer, attribute: str):
    map.loadNamedStyle(source)
    map.renderer().setClassAttribute(attribute)
    map.triggerRepaint()

# def apply_default_style(map: QgsVectorLayer):
#     ranges_list = [
#         [0, 50, '0 - 50', '#000000'],
#         [50, 100, '50 - 100', '#FFFFFF']
#     ]

#     renderer_ranges = []
#     for min, max, label, color in ranges_list:
#         symbol = QgsSymbol.defaultSymbol(map.geometryType())
#         symbol.setColor(QColor(color))
#         renderer_ranges.append(QgsRendererRange(min, max, symbol, label))

#     renderer = QgsGraduatedSymbolRenderer('', renderer_ranges)
#     renderer.setClassificationMethod(QgsApplication.classificationMethodRegistry().method("Quantile"))
#     renderer.setClassAttribute('climatology_summary_Probability Below Normal')
#     map.setRenderer(renderer)

def applyGraduatedSymbologyStandardMode(layer: QgsVectorLayer, field: str, n_classes, class_method):
    symbol = QgsSymbol.defaultSymbol(layer.geometryType())
    colorRamp = QgsGradientColorRamp.create({'color1':'255,0,0,255', 'color2':'0,0,255,255','stops':'0.25;255,255,0,255:0.50;0,255,0,255:0.75;0,255,255,255'})
    renderer = QgsGraduatedSymbolRenderer.createRenderer( layer, field, n_classes, class_method, symbol, colorRamp )
    #renderer.setSizeScaleField("LABELRANK")
    layer.setRenderer( renderer )

    class_methods = { 
        QgsApplication.classificationMethodRegistry().method("EqualInterval") : "Equal Interval",
        QgsApplication.classificationMethodRegistry().method("Quantile")      : "Quantile",
        QgsApplication.classificationMethodRegistry().method("Jenks")         : "Natural Breaks (Jenks)",
        QgsApplication.classificationMethodRegistry().method("StdDev")        : "Standard Deviation",
        QgsApplication.classificationMethodRegistry().method("Pretty")        : "Pretty Breaks",
        }

    targetField = 'POP_OTHER'
    n_classes = 6
    for class_method in class_methods.keys():
        layer = QgsVectorLayer('C:/data/ne_10m_populated_places.shp', class_methods[class_method] , 'ogr')
        if layer.isValid():
            applyGraduatedSymbologyStandardMode( layer, targetField, n_classes, class_method)
            QgsProject.instance().addMapLayers([layer])