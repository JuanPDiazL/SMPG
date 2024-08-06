
import os

from qgis.PyQt import uic
from qgis.PyQt.QtWidgets import (
    QDialog,
    QCheckBox,
    QFrame,
    QGridLayout
)


YEAR_SELECTION_DIALOG_CLASS, _ = uic.loadUiType(os.path.join(
    os.path.dirname(__file__), 'year_selection_dialog.ui'))

class YearSelectionDialog(QDialog, YEAR_SELECTION_DIALOG_CLASS):
    """A dialog box for selecting years.

    Attributes:
        select_all_state (bool): The state of the "select all" checkbox.
        year_combo_boxes (list[QCheckBox]): A list of checkboxes for each year.
        selected_years (list[str]): A list of selected years.
    """
    def __init__(self, parent=None):
        """Constructor."""
        super(YearSelectionDialog, self).__init__(parent)
        self.setupUi(self)

        self.setModal(True)

        self.yearsFrame: QFrame
        self.yearsLayout: QGridLayout
        self.selectAllCheckBox: QCheckBox
        self.select_all_state = False
        self.year_combo_boxes: list[QCheckBox] = []
        self.selected_years: list[str] = []

        self.selectAllCheckBox.clicked.connect(self.select_all_cb_event)

    def updateYearsList(self, year_list):
        """Updates the list of years in the dialog box.

        Args:
            year_list (list): A list of years to display.
        """
        self.clear_years_layout()
        self.selectAllCheckBox.setChecked(False)
        cb_list = []
        col_n = 0
        row_n = 0
        for year in year_list:
            check_box = QCheckBox(year)
            check_box.clicked.connect(self.year_combo_boxes_changed)
            self.yearsLayout.addWidget(check_box, row_n, col_n)
            cb_list.append(check_box)
            col_n += 1
            if col_n == 10:
                row_n += 1
                col_n = 0
        self.year_combo_boxes = cb_list
    
    def select_all_cb_event(self):
        """
        Toggles the state of all year selection boxes when the "select all" 
        checkbox is clicked.
        """
        for cb in self.year_combo_boxes:
            cb.setChecked(self.selectAllCheckBox.isChecked())

    def update_selection(self):
        """
        Updates the state of the year selection boxes based on the selected 
        years attribute.
        """
        are_all_checked = True
        for cb in self.year_combo_boxes:
            if self.selected_years is None or cb.text() in self.selected_years:
                cb.setChecked(True)
            else:
                cb.setChecked(False)
                are_all_checked &= False
        self.selectAllCheckBox.setChecked(are_all_checked)

    def accept(self) -> None:
        """Saves the selected years when the dialog box is accepted."""
        self.selected_years = []
        for cb in self.year_combo_boxes:
            if cb.isChecked():
                self.selected_years.append(cb.text())
        self.select_all_state = self.selectAllCheckBox.isChecked()
        super(YearSelectionDialog, self).accept()

    def reject(self) -> None:
        """
        Reverts the state of the year selection boxes when the dialog box is 
        rejected.
        """
        self.update_selection()
        super(YearSelectionDialog, self).reject()

    def year_combo_boxes_changed(self):
        """
        Toggles the state of the "select all" checkbox when any year selection 
        box is changed.
        """
        for cb in self.year_combo_boxes:
            if cb.isChecked() == False:
                self.selectAllCheckBox.setChecked(False)
                return
        self.selectAllCheckBox.setChecked(True)

    def clear_years_layout(self):
        """Clears the layout of year selection boxes."""
        while self.yearsLayout.count():
            child = self.yearsLayout.takeAt(0)
            if child.widget():
                child.widget().deleteLater()