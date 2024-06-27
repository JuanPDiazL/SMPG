import pandas as pd

#reads csv file and returns a dictionary of numpy arrays of the timeseries, and the column names
def parse_csv(filename:str):
    df = pd.read_csv(filename, header=0, index_col=0)

    has_duplicates = not df.index.is_unique
    timestamps = df.columns.to_list()
    dataset_context = dict_of_nparrays(df)
    return dataset_context, timestamps, has_duplicates

# converts a pandas dataframe to a dictionary of numpy arrays
def dict_of_nparrays(df:pd.DataFrame):
    dataset = {}
    df = df.groupby(level=0).first() # removes duplicates
    dft = df.T
    for col_index in dft.columns:
        dataset[str(col_index)] = dft[col_index].to_numpy()

    return dataset
