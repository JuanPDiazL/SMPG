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
    """
    A dialog window to display progress information while tasks are being 
    executed.
    """
    def __init__(self, parent=None):
        super(ProgressDialog, self).__init__(parent)
        self.setupUi(self)
        
        self.setModal(True)

    def finish_wait(self, task_manager: QgsTaskManager, tasks: list[QgsTask]):
        """
        Finishes the wait state and displays a message box with the total time 
        elapsed.

        Args:
            task_manager (QgsTaskManager): The task manager.
            tasks (list[QgsTask]): A list of tasks executed by the task 
                manager.
        """
        task_manager.allTasksFinished.disconnect() # Disconnect the signal to prevent re-execution
        total_time = round(time.perf_counter() - self.parentWidget().renderTime, 1)
        self.close()
        
        # Check if any exception occurred during task execution
        for task in tasks:
            if task.exception is not None:
                exception = task.exception
                try: raise exception
                except Exception as e:
                    QMessageBox.critical(self, "Error", f'{task.title} raised an exception\n{str(e)}\n\n{traceback.format_exc()}', QMessageBox.Ok)
        QMessageBox.information(self, 'Task Completed', f'Task completed.\nTime elapsed: {total_time}\nThe outputs were saved at {self.parentWidget().destination_path}', QMessageBox.Ok)
        return