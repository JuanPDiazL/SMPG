import os
import time
import traceback

from qgis.PyQt import uic
from qgis.PyQt.QtWidgets import (
    QWidget,
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

from .smpgCore.utils import (
    get_key_by_value
)

SOS_DIALOG_CLASS,_ = uic.loadUiType(os.path.join(
    os.path.dirname(__file__), 'ui/rainy_season_detection_dialog.ui'))

class RainySeasonDetectionDialog(QDialog, SOS_DIALOG_CLASS):
    """
    A dialog window to ...
    """

    sosGroupBox: QGroupBox
    sosDetectionMethodComboBox: QComboBox
    sos1stThresholdSpinBox: QSpinBox
    sos2ndThresholdSpinBox: QSpinBox

    pctAvgWidgetGroup: QWidget
    sosFixed1stThresholdSpinBox: QSpinBox
    sosFixed2ndThresholdSpinBox: QSpinBox


    sosEnabled: bool
    sosDetectionMethod: str
    sosFirstThreshold: int
    sosSecondThreshold: int
    sosFixedFirstThreshold: int
    sosFixedSecondThreshold: int


    sos_detection_methods = {
        'Fixed Threshold (mm)': 'fixed',
        'Percent of Climatology (%)': 'pct_clim_avg',
    }

    def __init__(self, parent=None):
        super(RainySeasonDetectionDialog, self).__init__(parent)
        self.setupUi(self)

        self.setModal(True)

        self.pctAvgWidgetGroup.setHidden(True)

        self.sosDetectionMethodComboBox.addItems(list(self.sos_detection_methods.keys()))
        self.sosDetectionMethodComboBox.currentTextChanged.connect(self.set_sos_method)

    def set_sos_method(self, text):
        """Set the detection method for the dialog."""
        method = self.sos_detection_methods[text]

        if method == 'fixed':
            self.sos1stThresholdSpinBox.setValue(25)
            self.sos2ndThresholdSpinBox.setValue(20)
            self.pctAvgWidgetGroup.setHidden(True)
        elif method == 'pct_clim_avg':
            self.sos1stThresholdSpinBox.setValue(70)
            self.sos2ndThresholdSpinBox.setValue(50)
            self.sosFixed1stThresholdSpinBox.setValue(20)
            self.sosFixed2ndThresholdSpinBox.setValue(50)
            self.pctAvgWidgetGroup.setHidden(False)


    def showEvent(self, a0):
        """Function to run when the dialog is oppened."""
        method_cb_element = get_key_by_value(self.sos_detection_methods, 
                                             (self.sosDetectionMethod))
        self.sosGroupBox.setChecked(self.sosEnabled)
        self.sosDetectionMethodComboBox.setCurrentText(method_cb_element)
        self.sos1stThresholdSpinBox.setValue(self.sosFirstThreshold)
        self.sos2ndThresholdSpinBox.setValue(self.sosSecondThreshold)
        return super().showEvent(a0)
    
    def accept(self) -> None:
        """Saves the SOS parameters when the dialog box is accepted."""
        self.sosEnabled = self.sosGroupBox.isChecked()
        self.sosDetectionMethod = self.sos_detection_methods[self.sosDetectionMethodComboBox.currentText()]
        self.sosFirstThreshold = self.sos1stThresholdSpinBox.value()
        self.sosSecondThreshold = self.sos2ndThresholdSpinBox.value()
        self.sosFixedFirstThreshold = self.sosFixed1stThresholdSpinBox.value()
        self.sosFixedSecondThreshold = self.sosFixed2ndThresholdSpinBox.value()
        super(RainySeasonDetectionDialog, self).accept()

    def reject(self) -> None:
        """
        Reverts the state of the dialog when the dialog box is 
        rejected.
        """
        super(RainySeasonDetectionDialog, self).reject()
