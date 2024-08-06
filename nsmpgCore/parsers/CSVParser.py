import pandas as pd

def parse_csv(filename:str):
    """
    Reads a CSV file and returns a dictionary of numpy arrays representing the 
    time series data.

    Args:
        filename (str): Path to the CSV file to be read.

    Returns:
        dataset (dict): Dictionary of numpy arrays representing the time series 
            data.
        timestamps (list[str]): List of column names that represent the 
            timestamps in the dataset.
        has_duplicates (bool): Whether or not there are duplicates in the 
            dataset.
    """
    df = pd.read_csv(filename, header=0, index_col=0)

    has_duplicates = not df.index.is_unique
    timestamps = df.columns.to_list()
    dataset_context = dict_of_nparrays(df)
    return dataset_context, timestamps, has_duplicates

def dict_of_nparrays(df:pd.DataFrame):
    """Converts a Pandas DataFrame to a dictionary of NumPy arrays.

    Args:
        df (pd.DataFrame): The Pandas DataFrame to be converted.

    Returns:
        dataset (dict): Dictionary of NumPy arrays representing the data in the 
            DataFrame.
    """
    dataset = {}
    df = df.groupby(level=0).first() # remove duplicates
    dft = df.T
    for col_index in dft.columns:
        dataset[str(col_index)] = dft[col_index].to_numpy()

    return dataset
