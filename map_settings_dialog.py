
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
    """A dialog window for selecting map settings.
    
    Attributes:
        fields (list): List of possible fields to generate the maps from.
        temp_map_layer (QgsVectorLayer): Temporary vector layer selected from 
            shapefile or vector layer.
        map_layer (QgsVectorLayer): The actual map layer selected by user.
        settings (dict): Dictionary containing user-selected settings, 
            including shp_source, selected_map, join_field, and 
            selected_fields.
    """
    def __init__(self, parent=None):
        """Constructor."""
        super(MapSettingsDialog, self).__init__(parent)
        self.setupUi(self)

        self.setModal(True)

        self.fields = ['C. Dk./LTA Pct.', 'Ensemble Med./LTA Pct.', 'Probability Below Normal', 
                  'Probability in Normal', 'Probability Above Normal', 'Ensemble Med. Pctl.', 
                  'Current Season Pctl.']
        
        self.temp_map_layer: QgsVectorLayer = None
        self.map_layer: QgsVectorLayer = None
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
        """Move an item from the source list to the destination list.

        Args:
            source_list (QListWidget): The original list.
            destination_list (QListWidget): The target list.
        """
        for item in source_list.selectedItems():
            item_index = source_list.row(item)
            destination_list.addItem(source_list.takeItem(item_index))

    def map_selection_combobox_event(self, index):
        """Update the selected map layer and display its fields.

        Args:
            index (int): The current index of the combo box.
        """
        self.shapefilePathLineEdit.setText("")
        self.temp_map_layer = self.map_relations[index][0]
        self.update_target_field_combobox_content()

    def update_map_combobox_content(self):
        """Update the content of the map selection combo box."""
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
        """Load a new shapefile and update the widgets."""
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
        """
        Updates the GUI state based on the provided map settings dictionary.

        Args:
            settings (dict): A dictionary containing the current map settings.
                Expected keys are 'shp_source', 'selected_map', and 
                'join_field'.
        """
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
        """
        Update the widgets based on whether a shapefile or project layer is 
        selected.
        """
        if self.useProjectLayerRadioButton.isChecked():
            for w in self.use_project_layer_widgets: w.show()
            for w in self.import_shp_widgets: w.hide()
        if self.useShapefileRadioButton.isChecked():
            for w in self.import_shp_widgets: w.show()
            for w in self.use_project_layer_widgets: w.hide()

    def get_list_items(self, list_widget: QListWidget):
        """Retrieves a list of items from a given QListWidget.

        Args:
            list_widget (QListWidget): The QListWidget instance to retrieve 
                items from.

        Returns:
            list: A list of strings representing the items in the QListWidget.
        """
        return [list_widget.item(i).text() for i in range(list_widget.count())]

    def showEvent(self, a0):
        """Function to run when the dialog is oppened."""
        self.update_input_states(self.settings)
        return super().showEvent(a0)
    
    def accept(self) -> None:
        """Close the dialog and save settings."""
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
        """Closes the dialog without saving changes."""
        self.temp_map_layer = None
        super(MapSettingsDialog, self).reject()