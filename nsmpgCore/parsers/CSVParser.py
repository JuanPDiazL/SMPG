import pandas as pd

#reads csv file and returns a dictionary of numpy arrays of the timeseries, and the column names
def parse_csv(filename:str):
    df = pd.read_csv(filename, header=0, index_col=0)

    dataset_context = dict_of_nparrays(df)
    rows = df.head()
    has_duplicates = rows.duplicated().any()
    return dataset_context, df.columns.to_list(), has_duplicates

# converts a pandas dataframe to a dictionary of numpy arrays
def dict_of_nparrays(df:pd.DataFrame):
    dataset = {}
    dft = df.T
    for col_index in dft.columns:
        dataset[str(col_index)] = dft[col_index].to_numpy()

    # print(dataset)
    return dataset
