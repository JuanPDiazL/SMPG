
import os
import time

from qgis.PyQt import uic
from qgis.PyQt.QtWidgets import *

PROGRESS_DIALOG_CLASS,_ = uic.loadUiType(os.path.join(
    os.path.dirname(__file__), 'progress_dialog.ui'))

class ProgressDialog(QDialog, PROGRESS_DIALOG_CLASS):
    def __init__(self, parent=None):
        super(ProgressDialog, self).__init__(parent)
        self.setupUi(self)
        
        self.setModal(True)

    def update(self):
        self.parentWidget().pending_tasks -= 1
        if self.parentWidget().pending_tasks == 0:
            renderFinishTime = round(time.perf_counter() - self.parentWidget().renderTime, 1)
            self.close()
            QMessageBox(text=f'Task completed.\nProcessing time: {renderFinishTime}\nThe reports were saved at {self.parentWidget().destination_path}').exec()
            return