
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
    QCheckBox,
)

from qgis.core import (
    QgsVectorLayer,
)

MAP_SETTINGS_DIALOG_CLASS,_ = uic.loadUiType(os.path.join(
    os.path.dirname(__file__), 'ui/map_settings_dialog.ui'))

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

        self.fields = []
        self.settings = {
            'selected_fields': [],
        }

        self.excludeLabel: QLabel
        self.includeLabel: QLabel
        self.blackList: QListWidget
        self.whiteList: QListWidget
        self.addButton: QPushButton
        self.removeButton: QPushButton

        self.addButton.clicked.connect(lambda: self.list_move_element(self.blackList, self.whiteList))
        self.removeButton.clicked.connect(lambda: self.list_move_element(self.whiteList, self.blackList))

    def list_move_element(self, source_list: QListWidget, destination_list: QListWidget):
        """Move an item from the source list to the destination list.

        Args:
            source_list (QListWidget): The original list.
            destination_list (QListWidget): The target list.
        """
        for item in source_list.selectedItems():
            item_index = source_list.row(item)
            destination_list.addItem(source_list.takeItem(item_index))

    def update_input_states(self, settings: dict):
        """
        Updates the GUI state based on the provided map settings dictionary.

        Args:
            settings (dict): A dictionary containing the current map settings.
                Expected keys are 'shp_source', 'selected_map', and 
                'join_field'.
        """
        self.fields = ['C. Dk./LTA Pct.', 'Ensemble Med./LTA Pct.', 'Probability Below Normal', 
                  'Probability of Normal', 'Probability Above Normal', 'Ensemble Med. Pctl.', 
                  'Current Season Pctl.']
        if self.parentWidget().forecastRadioButton.isChecked():
            self.fields.append('C. Dk.+Forecast/LTA Pct.')
        if self.parentWidget().rainy_season_detection_dialog.sosEnabled:
            self.fields.append('Start of Season')
            self.fields.append('Start of Season Anomaly')

        self.blackList.clear()
        self.whiteList.clear()
        for item in self.fields:
            if item in settings['selected_fields']:
                self.whiteList.addItem(item)
            else:
                self.blackList.addItem(item)

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
        self.settings['selected_fields'] = self.get_list_items(self.whiteList)
        if len(self.settings['selected_fields']) == 0:
            QMessageBox.information(self, "Information", 
                                'No features were selected for mapping. \nNo maps will be generated.', 
                                QMessageBox.Ok)
        
        super(MapSettingsDialog, self).accept()

    def reject(self) -> None:
        """Closes the dialog without saving changes."""
        ...
        super(MapSettingsDialog, self).reject()