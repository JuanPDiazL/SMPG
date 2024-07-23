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

PROGRESS_DIALOG_CLASS,_ = uic.loadUiType(os.path.join(
    os.path.dirname(__file__), 'progress_dialog.ui'))

class ProgressDialog(QDialog, PROGRESS_DIALOG_CLASS):
    def __init__(self, parent=None):
        super(ProgressDialog, self).__init__(parent)
        self.setupUi(self)
        
        self.setModal(True)

    def finish_wait(self, task_manager: QgsTaskManager, tasks: list[QgsTask]):
        task_manager.allTasksFinished.disconnect()
        total_time = round(time.perf_counter() - self.parentWidget().renderTime, 1)
        # total_time = round(round(sum([t.time for t in tasks])), 1)
        self.close()
        
        for task in tasks:
            if task.exception is not None:
                exception = task.exception
                try: raise exception
                except Exception as e:
                    QMessageBox.critical(self, "Error", f'{task.title} raised an exception\n{str(e)}\n\n{traceback.format_exc()}', QMessageBox.Ok)
        QMessageBox.information(self, 'NeoSMPG: Task Completed', f'Task completed.\nTime elapsed: {total_time}\nThe outputs were saved at {self.parentWidget().destination_path}', QMessageBox.Ok)
        return