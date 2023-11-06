from numpy import ndarray

class Season:
    season_unit: str
    def __init__(self, season_id: str, data: ndarray) -> None:
        self.id = season_id
        self.data = data