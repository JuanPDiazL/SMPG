import json
import os

from ..structures import Dataset

def export_parameters(destination_path, dataset: Dataset, subFolderName='.'):
    """Exports the parameters of the computation to a JSON file.

    Args:
        destination_path (str): The path to the folder where the parameters 
            will be saved.
        dataset (Dataset): The dataset whose parameters will be exported.
        subFolderName (str, optional): The name of the subfolder where the 
            parameters will be saved. Defaults to '.'.
    """
    parameters_subfolder_path = os.path.join(destination_path, subFolderName)
    os.makedirs(parameters_subfolder_path, exist_ok=True)
    json_data = json.dumps(dataset.parameters.__dict__)
    os.makedirs(destination_path, exist_ok=True)
    with open(f'{parameters_subfolder_path}/Parameters.json', 'w') as js_data_wrapper:
        js_data_wrapper.write(json_data)