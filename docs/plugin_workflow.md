# [Workflow of the plugin](#workflow-of-the-plugin)

The workflow of the plugin can be divided into 4 steps:

- ## Initialization:

    The plugin interfaces with QGIS, and then initializes and show the main user interface at `.smpg.SMPG.run`.

    files:
    - `/__init__.py`
    - `/smpg.py`

- ## Data Input and Parameter Settings:

    Once the user opens the plugin GUI, the user can select the dataset to be processed by clicking on the 'Load Rainfall Dataset (.csv)'(`.smpg_dialog.SMPGDialog.loadFileButton`), which will trigger the `.smpg_dialog.SMPGDialog.load_file_btn_event` function, this function opens a file selection dialog to select the rainfall dataset file, and then the data is parsed with the `.smpgCore.utils.parse_timestamps` function to extract the data properties and store them into a `.smpgCore.utils.Properties` object, and to unlock all other fields in the dialog and set default values from a `.smpgCore.utils.Parameters` object.

    After a valid dataset is open it is possible to set parameters for the data processing manually, or by using a parameter file, this happen in `.smpg_dialog.SMPGDialog.import_parameters_btn_event` when the user clicks on the 'Import Parameters' button (`.smpg_dialog.SMPGDialog.importParametersButton`), this function reads the parameters file and stores them into a `Parameters` object, and then the states of the fields are set from the `Parameters` object at `.smpg_dialog.SMPGDialog.update_fields`.

    Optionally, a vector layer can be selected either from the project or from a shapefile by selecting 'Current Project'(`.smpg_dialog.SMPGDialog.useProjectLayerRadioButton`) or 'Shapefile'(`.smpg_dialog.SMPGDialog.useShapefileRadioButton`), this enables the proper fields to select a vector layer, after selecting a vector layer it is stored in `.smpg_dialog.SMPGDialog.selected_layer` and then it is possible to set the ID field that will be used to associate each polygon with a dataset entry with 'Target Field'(`.smpg_dialog.SMPGDialog.targetFieldComboBox`).

    Finally, when the user clicks on 'Process'(`.smpg_dialog.SMPGDialog.processButton`), the input data will be processed according to the selected parameters, this happens in `.smpg_dialog.SMPGDialog.process_btn_event`, the `.smpg_dialog.SMPGDialog.set_dataset` is called and the input dataset and parameters are passed to create a `.smpgCore.structures.Dataset` object.

    files:
    - `/smpg_dialog.py`
    - `/smpgCore/utils.py`
    - `/smpgCore/pyqgis_utils.py`

- ## Data Structuring and Derived Statistics Calculation:

    In the `Dataset` constructor, various auxiliary values needed for constructing all the objects of the Dataset are calculated and stored as variables in the `Dataset` object, including a shift needed for cross years, that do not start in January, but in July. Then `.smpgCore.structures.Place` objects are created and stored in the `Dataset` object.

    When constructing a `Place` object, the parameter `parent` is the `Dataset` where the place belongs, and several variables fron it will be used during the construction of the `Place`. The `timeseries` variable is passed to it, which is the sequential data for the place, then the `timeseries` is reshaped to create a `pandas.Dataframe` for each year and its values.

    If `parent.parameters.is_forecast`  is set to true, the last value of the `Place.current_season` will be excluded from all calculations. Selected season will be either gathered from user selection, or by comparing all `Place.past_seasons` to the `Place.current_season`.

    Then sub `Dataframes` are created for needed value windows, which include climatology window, monitoring window, monitoring with selected seasons and monitoring with climatology. Then derived `Dataframes` are created from them to finally calculate all the statistics and probabilities. There are 2 types statistics that are created, the long term statistics, which contain calculations for each value in the season, and general statistics, which contain the final values of the statistics.

    files:
    - `/smpgCore/structures.py`
    - `/smpgCore/utils.py`

- ## Output Generation:

    Once the statistics are calculated, all the data is ready to be exported. 
    
    The `.smpgCore.exporters` are responsible for creating the output files, which can be in CSV format, a local web page, within the opened QGIS project, and the parameters used for the computation in JSON format.

    Before starting the export, the functions responsible for each export type are assigned to a task, which will be executed asynchronously to avoid blocking the user interface. The task object (`.smpg_dialog.TaskHandler`) will receive the function and its parameters, once created, a task after it can be set to be executed, and it will receive the result as a parameter.

    After all tasks are created, they will be executed and a infinite progress bar will be displayed to show when the tasks are running.

    files:
    - `/smpg_dialog.py`

    Here is an explanation of each type of export:

    ### CSV Exporter:

    The CSV exporter is responsible for creating CSV files with all the relevant statistics and probabilities generated. where each row is a place in the dataset, and each column is a statistic or probability.

    files:
    - `/smpgCore/exporters/CSVExporter.py`

    ### Web Exporter:

    The web exporter is responsible for creating a local web page with a template located in `/smpgCore/res/web_template`. The generated data is first converted to csv strings, then stored in a JSON string, then compressed and encoded in base64 to reduce the size and make it readable by the browser, then its saved as javascript files and are put in a copy of the template.

    The web template has all the files and code to decode and decompress the data, to then show the data in different charts without the need of external resources.

    files:
    - `/smpgCore/exporters/WebExporter.py`

    ### QGIS Exporter:

    The QGIS exporter is responsible for creating vector layers inside QGIS, CSV statistics, a source vector layer and a target field are required for this.

    files:
    - `/smpgCore/exporters/QGISExporter.py`
    - `/smpgCore/pyqgis_utils.py`

    ### Parameters Exporter:

    The parameter exporter is responsible for saving the state of all the widgets in the plugin dialog in JSON format for later use.

    files:
    - `/smpgCore/exporters/ParameterExporter.py`