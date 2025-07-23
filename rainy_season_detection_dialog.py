import os
import time
import traceback

from qgis.PyQt import uic
from qgis.PyQt.QtWidgets import (
    QDialog,
    QMessageBox,
    QComboBox,
    QGroupBox,
    QSpinBox,
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

    sosGroupBox: QGroupBox
    sos1stThresholdSpinBox: QSpinBox
    sos2ndThresholdSpinBox: QSpinBox

    sosEnabled: bool
    sosFirstThreshold: int
    sosSecondThreshold: int

    def __init__(self, parent=None):
        super(RainySeasonDetectionDialog, self).__init__(parent)
        self.setupUi(self)

        self.setModal(True)

    def showEvent(self, a0):
        """Function to run when the dialog is oppened."""
        self.sosGroupBox.setChecked(self.sosEnabled)
        self.sos1stThresholdSpinBox.setValue(self.sosFirstThreshold)
        self.sos2ndThresholdSpinBox.setValue(self.sosSecondThreshold)
        return super().showEvent(a0)
    
    def accept(self) -> None:
        """Saves the SOS parameters when the dialog box is accepted."""
        self.sosFirstThreshold = self.sos1stThresholdSpinBox.value()
        self.sosSecondThreshold = self.sos2ndThresholdSpinBox.value()
        self.sosEnabled = self.sosGroupBox.isChecked()
        super(RainySeasonDetectionDialog, self).accept()

    def reject(self) -> None:
        """
        Reverts the state of the dialog when the dialog box is 
        rejected.
        """
        super(RainySeasonDetectionDialog, self).reject()
