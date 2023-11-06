yearly_periods = {
    'year': 1,
    'month': 12,
    'dekad': 36,
    'pentad': 72,
    'day': 365,
}

def define_seasonal_dict(start=0, period_lenght='dekad', return_key_list=True):
    """A fuction to spawn a standard dictionary of dekads
    as dekad:number.

    :return: a standard dictionary of dekads
    """
    period_lenght = yearly_periods[period_lenght] // 12
    if period_lenght < 1: return ['']
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    months = months[start:]+months[:start]
    if period_lenght == 1: return months
    dekad_strings = [f'{month}-{i+1}' for month in months for i in range(period_lenght)]
    dekads = {dekad : i for i, dekad in enumerate(dekad_strings)}
    if return_key_list:
        return list(dekads.keys())
    return dekads
