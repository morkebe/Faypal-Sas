import requests
from typing import Optional

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def get_weather(latitude: float, longitude: float) -> Optional[dict]:
    """
    Appelle Open-Meteo et retourne les conditions météo actuelles pour
    les coordonnées GPS fournies.

    Retourne None si l'API est inaccessible (le scoring continue sans météo).

    Exemple de retour :
        {
            "temperature": 32.1,   # °C
            "humidity": 78,        # %
            "precipitation": 4.2,  # mm
        }
    """
    try:
        response = requests.get(
            OPEN_METEO_URL,
            params={
                "latitude": latitude,
                "longitude": longitude,
                "current": "temperature_2m,relative_humidity_2m,precipitation",
                "timezone": "Africa/Dakar",
            },
            timeout=5,
        )
        response.raise_for_status()
        current = response.json().get("current", {})
        return {
            "temperature": current.get("temperature_2m"),
            "humidity": current.get("relative_humidity_2m"),
            "precipitation": current.get("precipitation"),
        }
    except Exception:
        # L'API est down ou la zone n'a pas de coordonnées valides
        return None
