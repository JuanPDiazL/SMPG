import json
import os

from ..structures import Dataset

def export_parameters(destination_path, dataset: Dataset, subFolderName='.'):
    parameters_subfolder_path = os.path.join(destination_path, subFolderName)
    os.makedirs(parameters_subfolder_path, exist_ok=True)
    json_data = json.dumps(dataset.parameters.__dict__)
    os.makedirs(destination_path, exist_ok=True)
    with open(f'{parameters_subfolder_path}/Parameters.json', 'w') as js_data_wrapper:
        js_data_wrapper.write(json_data)