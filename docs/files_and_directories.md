# [Explanation of the Files and Directories](#explanation-of-the-files-and-directories)
    
Here is a brief explanation of the files and directories in the SMPG plugin:

- ### Root Directory:

    Contains essential files and subdirectories. 
    
    Relevant files:
    - `metadata.txt`: Contains metadata about the plugin, such as its name, version, author, and description.
    - `__init__.py` and `smpg.py`: They are responsible for the initialization of the plugin.
    - `smpg_dialog.py`: Contains code for the main dialog of the plugin.
    - `*_dialog.py`: They are used to initialize the dialogs and their functions and behaviors.
    
    Subdirectories:
    - #### ui:

        Contains UI files, which are used in the plugin's user interface.

    - #### libraries:

        Contains external Python packages that are not built-in Python or the QGIS environment, and are required for the plugin's functionality.

    - #### smpgCore:

        Contains core functions of the plugin.

        Relevant files:
        - `structures.py`: It defines classes that conveniently structure data contained in the datasets, and calculates derived statistics from them.
        - `utils.py`: It contains various utility functions used by other modules in the plugin. It is focused on processing, data manipulation and auxiliar data structures.
        - `pyqgis_utils.py`: It contains a collection of useful functions for working with QGIS objects such as layers.

        Subdirectories:

        - #### parsers:

            Contains parsers that are used to read the input datasets and convert them into data structures.

        - #### exporters:

            Contains exporters that are used to write the output statistics in a format suitable for further processing or analysis.

        - #### res:

            It contains resources needed for the functionality of the plugin, such as map styles and web templates.

    - #### docs:

        Contains extra documentation files.
