import pandas as pd

def parse_csv(filename:str):
    df = pd.read_csv(filename, header=0, index_col=0)

    dataset_context = dict_of_nparrays(df)
    return dataset_context, df.columns.to_list()

def dict_of_nparrays(df:pd.DataFrame):
    dataset = {}
    dft = df.T
    for col_index in dft.columns:
        dataset[str(col_index)] = dft[col_index].to_numpy()

    # print(dataset)
    return dataset

if __name__ == '__main__':
    DEBUG = False
    if DEBUG:
        import cProfile
        import pstats
        with cProfile.Profile() as profile:
            parse_csv(r'D:\Programming projects\Python\SMPG_Dev\Seasonal_Monitoring_Probability_Generator\data\IRE_lev3_dekadal202307.csv')
            stats = pstats.Stats(profile)
            stats.sort_stats(pstats.SortKey.TIME)
            stats.dump_stats('stats.prof')
            stats.print_stats()
        exit()
    else:
        parse_csv(r'D:\Programming projects\Python\SMPG_Dev\Seasonal_Monitoring_Probability_Generator\data\ejemplo3.csv')
