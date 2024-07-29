
import os

from qgis.PyQt import uic
from qgis.PyQt.QtWidgets import (
    QDialog,
    QMessageBox,
    QFileDialog,
    QPushButton,
    QLineEdit,
    QComboBox,
    QLabel,
    QListWidget,
)

from .nsmpgCore.pyqgis_utils import (
    get_fields,
    get_vector_layers,
    load_layer_file
)

from qgis.core import (
    QgsVectorLayer,
)

MAP_SETTINGS_DIALOG_CLASS,_ = uic.loadUiType(os.path.join(
    os.path.dirname(__file__), 'map_settings_dialog.ui'))

IMPORT_SHP_TEXT = 'Import map from shapefile...'

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
        
        self.temp_map_layer = None
        self.map_layer = None
        self.settings = {
            'selected_map': '',
            'shp_source': '',
            'selected_fields': [],
            'join_field': '',
        }

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

        self.import_widgets = [self.loadShapefileButton, self.shapefilePathLineEdit]

        self.mapSelectionComboBox.currentIndexChanged.connect(self.map_selection_combobox_event)
        self.loadShapefileButton.clicked.connect(self.load_shapefile_button_event)
        self.addButton.clicked.connect(lambda: self.list_move_element(self.blackList, self.whiteList))
        self.removeButton.clicked.connect(lambda: self.list_move_element(self.whiteList, self.blackList))

        self.set_show_import_widgets(False)
        
    def list_move_element(self, source_list: QListWidget, destination_list: QListWidget):
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
            self.temp_map_layer = self.map_relations[selected_map_index][0]

        self.update_target_field_combobox()

    def update_map_combobox(self):
        maps: dict[QgsVectorLayer] = get_vector_layers()
        self.map_relations = [(map, map.id(), map.name()) for map in maps]

        map_names = [IMPORT_SHP_TEXT] + [item[2] for item in self.map_relations]

        default_selection = min(1, map_names.__len__())
        self.mapSelectionComboBox.clear()
        self.mapSelectionComboBox.addItems(map_names)
        self.mapSelectionComboBox.setCurrentIndex(default_selection)

    def update_target_field_combobox(self):
        fields = get_fields(self.temp_map_layer)
        self.targetFieldComboBox.clear()
        self.targetFieldComboBox.addItems(fields)

    def load_shapefile_button_event(self):
        temp_shp_source = QFileDialog.getOpenFileName(self, 'Open shapefile', None, "shapefiles (*.shp)")[0]
        if temp_shp_source == "":
            QMessageBox.warning(self, "Warning", 
                                'No shapefile was selected.', 
                                QMessageBox.Ok)
            return
        self.shp_source = temp_shp_source
        layer_preload = load_layer_file(self.shp_source)
        if not layer_preload.isValid(): return # continue if layer is valid
        self.temp_map_layer = layer_preload
        self.update_target_field_combobox()
        self.shapefilePathLineEdit.setText(self.shp_source)

    def update_settings(self, settings: dict):
        self.mapSelectionComboBox.setCurrentText(settings['selected_map'])
        self.shapefilePathLineEdit.setText(settings['shp_source'])

        self.blackList.clear()
        self.whiteList.clear()
        for item in self.fields:
            if item in settings['selected_fields']:
                self.whiteList.addItem(item)
            else:
                self.blackList.addItem(item)

        self.targetFieldComboBox.setCurrentText(settings['join_field'])

    def set_show_import_widgets(self, show=True):
        if show: 
            for w in self.import_widgets: w.show()
        else: 
            for w in self.import_widgets: w.hide()

    def get_list_items(self, list_widget: QListWidget):
        return [list_widget.item(i).text() for i in range(list_widget.count())]

    def showEvent(self, a0):
        self.update_map_combobox()
        self.update_settings(self.settings)
        return super().showEvent(a0)
    
    def accept(self) -> None:
        temp_selected_map = self.mapSelectionComboBox.currentText()
        if temp_selected_map == IMPORT_SHP_TEXT:
            shp_path = self.shapefilePathLineEdit.text()
            if shp_path == '' or not os.path.exists(shp_path):
                QMessageBox.warning(self, 'Warning', 
                                    f'No valid shapefile was selected.',
                                    QMessageBox.Ok)
                return
            self.settings['selected_map'] = temp_selected_map
            self.settings['shp_source'] = shp_path
        else: 
            self.shapefilePathLineEdit.setText('')
            self.settings['shp_source'] = ''
            
        temp_join_field = self.targetFieldComboBox.currentText()
        if temp_join_field == '':
            QMessageBox.warning(self, "Warning", 
                                'No join field was selected.', 
                                QMessageBox.Ok)
            return
        self.settings['join_field'] = temp_join_field
        
        self.settings['selected_fields'] = self.get_list_items(self.whiteList)
        if len(self.settings['selected_fields']) == 0:
            self.map_layer = None
            QMessageBox.information(self, "Information", 
                                'No features were selected for mapping. \nNo maps will be generated.', 
                                QMessageBox.Ok)
            
        self.map_layer = self.temp_map_layer
        super(MapSettingsDialog, self).accept()

    def reject(self) -> None:
        self.temp_map_layer = None
        super(MapSettingsDialog, self).reject()