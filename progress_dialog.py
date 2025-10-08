import os
import time
import traceback

from qgis.PyQt import uic
from qgis.PyQt.QtWidgets import (
    QWidget,
    QDialog,
    QMessageBox,
    QLabel,
)

from qgis.core import (
    QgsTask, 
    QgsTaskManager,
)

PROGRESS_DIALOG_CLASS,_ = uic.loadUiType(os.path.join(
    os.path.dirname(__file__), 'ui/progress_dialog.ui'))

class ProgressDialog(QDialog, PROGRESS_DIALOG_CLASS):
    """
    A dialog window to display progress information while tasks are being 
    executed.
    """
    waitWidget: QWidget
    finishWidget: QWidget
    finishLabel: QLabel

    def __init__(self, parent=None):
        super(ProgressDialog, self).__init__(parent)
        self.setupUi(self)
        
        self.setModal(True)

        self.finishWidget.setHidden(True)

    def showEvent(self, a0):
        """Function to run when the dialog is oppened."""
        self.waitWidget.setHidden(False)
        self.finishWidget.setHidden(True)
        self.finishLabel.setText('')
        self.waitWidget.resize(0, 0)
        self.finishWidget.resize(0, 0)
        self.resize(0, 0)
        return super().showEvent(a0)
    
    def accept(self) -> None:
        """Function to run when the dialog is accepted."""
        super().accept()

    def finish_wait(self, callback=None):
        """
        Finishes the wait state and displays a message box with the total time 
        elapsed.

        Args:
            task_manager (QgsTaskManager): The task manager.
            tasks (list[QgsTask]): A list of tasks executed by the task 
                manager.
        """
        self.waitWidget.setHidden(True)
        self.finishWidget.setHidden(False)

        self.total_time = round(time.perf_counter() - self.parentWidget().renderTime, 1)
        self.finishLabel.setText(f'Task completed.\nTime elapsed: {self.total_time}\nThe outputs were saved at {self.parentWidget().destination_path}')
        if callback is not None:
            callback()