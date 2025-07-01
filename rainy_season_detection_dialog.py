import os
import time
import traceback

from qgis.PyQt import uic
from qgis.PyQt.QtWidgets import (
    QDialog,
    QMessageBox,
)

from qgis.core import (
    QgsTask, 
    QgsTaskManager,
)

SOS_DIALOG_CLASS,_ = uic.loadUiType(os.path.join(
    os.path.dirname(__file__), 'ui/rainy_season_detection_dialog.ui'))

class RainySeasonDetectionDialog(QDialog, SOS_DIALOG_CLASS):
    """
    A dialog window to ...
    """
    def __init__(self, parent=None):
        super(RainySeasonDetectionDialog, self).__init__(parent)
        self.setupUi(self)
        
        self.setModal(True)