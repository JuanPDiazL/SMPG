
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
    QRadioButton,
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

        self.fields = ['C. Dk./LTA Pct.', 'Ensemble Med./LTA Pct.', 'Probability Below Normal', 
                  'Probability in Normal', 'Probability Above Normal', 'Ensemble Med. Pctl.', 
                  'Current Season Pctl.']
        
        self.temp_map_layer = None
        self.map_layer = None
        self.settings = {
            'selected_map': '',
            'shp_source': '',
            'selected_fields': [],
            'join_field': '',
        }

        self.useProjectLayerRadioButton: QRadioButton
        self.useShapefileRadioButton: QRadioButton
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

        self.import_shp_widgets = [self.loadShapefileButton, self.shapefilePathLineEdit]
        self.use_project_layer_widgets = [self.mapSelectionComboBox]

        self.useProjectLayerRadioButton.toggled.connect(self.source_selection_rb_event)
        self.useShapefileRadioButton.toggled.connect(self.source_selection_rb_event)
        self.mapSelectionComboBox.currentIndexChanged.connect(self.map_selection_combobox_event)
        self.loadShapefileButton.clicked.connect(self.load_shapefile_button_event)
        self.addButton.clicked.connect(lambda: self.list_move_element(self.blackList, self.whiteList))
        self.removeButton.clicked.connect(lambda: self.list_move_element(self.whiteList, self.blackList))

        self.source_selection_rb_event()
        
    def list_move_element(self, source_list: QListWidget, destination_list: QListWidget):
        for item in source_list.selectedItems():
            item_index = source_list.row(item)
            destination_list.addItem(source_list.takeItem(item_index))

    def map_selection_combobox_event(self, index):
        self.shapefilePathLineEdit.setText("")
        self.temp_map_layer = self.map_relations[index][0]
        self.update_target_field_combobox_content()

    def update_map_combobox_content(self):
        maps = get_vector_layers()
        self.map_relations = [(map, map.id(), map.name()) for map in maps]
        map_names = [item[2] for item in self.map_relations]

        self.mapSelectionComboBox.clear()
        self.mapSelectionComboBox.addItems(map_names)

    def update_target_field_combobox_content(self):
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
        self.update_target_field_combobox_content()
        self.mapSelectionComboBox.setCurrentIndex(-1)
        self.shapefilePathLineEdit.setText(self.shp_source)

    def update_input_states(self, settings: dict):
        if settings['shp_source'] == "":
            self.useProjectLayerRadioButton.setChecked(True)
            self.update_map_combobox_content()
            self.mapSelectionComboBox.setCurrentText(settings['selected_map'])
        else:
            self.useShapefileRadioButton.setChecked(True)
            self.mapSelectionComboBox.setCurrentIndex(-1)
        self.shapefilePathLineEdit.setText(settings['shp_source'])

        self.blackList.clear()
        self.whiteList.clear()
        for item in self.fields:
            if item in settings['selected_fields']:
                self.whiteList.addItem(item)
            else:
                self.blackList.addItem(item)

        self.targetFieldComboBox.setCurrentText(settings['join_field'])

    def source_selection_rb_event(self):
        if self.useProjectLayerRadioButton.isChecked():
            for w in self.use_project_layer_widgets: w.show()
            for w in self.import_shp_widgets: w.hide()
        if self.useShapefileRadioButton.isChecked():
            for w in self.import_shp_widgets: w.show()
            for w in self.use_project_layer_widgets: w.hide()

    def get_list_items(self, list_widget: QListWidget):
        return [list_widget.item(i).text() for i in range(list_widget.count())]

    def showEvent(self, a0):
        self.update_input_states(self.settings)
        return super().showEvent(a0)
    
    def accept(self) -> None:
        if self.useShapefileRadioButton.isChecked():
            shp_path = self.shapefilePathLineEdit.text()
            if shp_path == '' or not os.path.exists(shp_path):
                QMessageBox.warning(self, 'Warning', 
                                    f'No valid shapefile was selected.',
                                    QMessageBox.Ok)
                return
            self.settings['shp_source'] = shp_path
            self.settings['selected_map'] = ''
        elif self.useProjectLayerRadioButton.isChecked():
            selected_layer = self.mapSelectionComboBox.currentText()
            if selected_layer == '':
                QMessageBox.warning(self, 'Warning', 
                                    f'No vector layer was selected.',
                                    QMessageBox.Ok)
                return
            temp_selected_map_name = self.mapSelectionComboBox.currentText()
            self.settings['selected_map'] = temp_selected_map_name
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