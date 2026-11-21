import pandas as pd


def parse_csv(filename:str):
    """Parse a CSV file into a pandas DataFrame and metadata.

    Parameters:
        filename (str): The path to the CSV file to be parsed.

    Returns:
        df (pd.DataFrame): A DataFrame containing the parsed data.
        timestamps (list[str]): A list of column names representing time stamps.
        has_duplicates (bool): Whether the resulting DataFrame contains duplicate rows.
    """
    df = pd.read_csv(filename, header=0, index_col=0)
    
    # detect invalid cells: a column with any non-numeric cell isn't read as numbers
    if not all(pd.api.types.is_numeric_dtype(dtype) for dtype in df.dtypes):
        raise ValueError('The CSV file contains invalid data.')
    if df.isna().any(axis=None):
        raise ValueError('The CSV file has missing data.')

    has_duplicates = not df.index.is_unique
    df = df.groupby(level=0).first() # Remove duplicate rows
    timestamps = df.columns.to_list()
    return df, timestamps, has_duplicates
