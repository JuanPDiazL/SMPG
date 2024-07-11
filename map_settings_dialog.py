
import os

from PyQt5 import QtGui

from qgis.PyQt import uic
from qgis.PyQt.QtWidgets import *

from .nsmpgCore.pyqgis_utils import (
    apply_style_file,
    get_fields,
    get_vector_layers,
    join_layers,
    load_layer
)

from qgis.core import (
    QgsProject,
    QgsVectorLayer,
)

MAP_SETTINGS_DIALOG_CLASS,_ = uic.loadUiType(os.path.join(
    os.path.dirname(__file__), 'map_settings_dialog.ui'))

class MapSettingsDialog(QDialog, MAP_SETTINGS_DIALOG_CLASS):
    def __init__(self, parent=None):
        """Constructor."""
        super(MapSettingsDialog, self).__init__(parent)
        # Set up the user interface from Designer through FORM_CLASS.
        # After self.setupUi() you can access any designer object by doing
        # self.<objectname>, and you can use autoconnect slots - see
        # http://qt-project.org/doc/qt-4.8/designer-using-a-ui-file.html
        # #widgets-and-dialogs-with-auto-connect
        self.setupUi(self)

        self.setModal(True)

        self.fields = ['C. Dk./LTA Pct.', 'E. LTM/LTA Pct.', 'Probability Below Normal', 
                  'Probability in Normal', 'Probability Above Normal', 'E. LTM Pctl.', 
                  'Current Season Pctl.']
        
        self.map_layer = None

        self.mapSelectionComboBox: QComboBox
        self.loadShapefileButton: QPushButton
        self.shapefilePathLineEdit: QLineEdit
        self.excludeLabel: QLabel
        self.includeLabel: QLabel
        self.blackList: QListWidget
        self.whiteList: QListWidget
        self.addButton: QPushButton
        self.removeButton: QPushButton
        self.targetLabel: QLabel
        self.targetFieldComboBox: QComboBox
        self.exportPNGMapsCheckBox: QCheckBox

        self.import_widgets = [self.loadShapefileButton, self.shapefilePathLineEdit]

        self.mapSelectionComboBox.currentIndexChanged.connect(self.map_selection_combobox_event)
        self.loadShapefileButton.clicked.connect(self.shp_event)
        self.addButton.clicked.connect(lambda: self.list_move_event(self.blackList, self.whiteList))
        self.removeButton.clicked.connect(lambda: self.list_move_event(self.whiteList, self.blackList))

        self.set_show_import_widgets(False)
        self.update_attributes_list()
        
    def list_move_event(self, source_list: QListWidget, destination_list: QListWidget):
        for item in source_list.selectedItems():
            item_index = source_list.row(item)
            destination_list.addItem(source_list.takeItem(item_index))

    def map_selection_combobox_event(self, index):
        if index == 0: 
            self.set_show_import_widgets(True)
            return
        else: self.set_show_import_widgets(False)

        if index > 0:
            selected_map_index = max(0, index - 1)
            fields = get_fields(self.map_relations[selected_map_index][0])
            self.targetFieldComboBox.clear()
            self.targetFieldComboBox.addItems(fields)

    def update_attributes_list(self):
        self.blackList.addItems(self.fields)

    def showEvent(self, a0):
        self.update_map_combobox()
        return super().showEvent(a0)

    def update_map_combobox(self):
        maps: dict[QgsVectorLayer] = get_vector_layers()
        self.map_relations = [(map, map.id(), map.name()) for map in maps]

        map_names = ['Import map from shapefile...'] + [item[2] for item in self.map_relations]

        default_selection = min(1, map_names.__len__())
        self.mapSelectionComboBox.clear()
        self.mapSelectionComboBox.addItems(map_names)
        self.mapSelectionComboBox.setCurrentIndex(default_selection)

    def shp_event(self):
        self.shp_source = QFileDialog.getOpenFileName(self, 'Open shapefile', None, "shapefiles (*.shp)")[0]
        self.csv_source = QFileDialog.getOpenFileName(self, 'Open stats file', None, "shapefiles (*.csv)")[0]

        self.map_layer = load_layer(self.shp_source)
        print(get_fields(self.map_layer))
        statistics = load_layer(self.csv_source)

    def set_show_import_widgets(self, show=True):
        if show: 
            for w in self.import_widgets: w.show()
        else: 
            for w in self.import_widgets: w.hide()