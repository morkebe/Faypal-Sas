"""
Tests du worker météo Open-Meteo.
Les appels HTTP sont mockés — aucune connexion internet requise.
"""
from unittest.mock import MagicMock, patch

from app.workers.weather_worker import get_weather


def _fake_response(temperature=30.0, humidity=80, precipitation=5.0):
    """Construit une fausse réponse HTTP Open-Meteo."""
    resp = MagicMock()
    resp.json.return_value = {
        "current": {
            "temperature_2m": temperature,
            "relative_humidity_2m": humidity,
            "precipitation": precipitation,
        }
    }
    resp.raise_for_status.return_value = None
    return resp


def test_get_weather_retourne_les_trois_champs():
    with patch("app.workers.weather_worker.requests.get") as mock_get:
        mock_get.return_value = _fake_response(32.0, 85, 7.5)
        result = get_weather(14.69, -17.44)

    assert result is not None
    assert result["temperature"] == 32.0
    assert result["humidity"] == 85
    assert result["precipitation"] == 7.5


def test_get_weather_appelle_la_bonne_url():
    with patch("app.workers.weather_worker.requests.get") as mock_get:
        mock_get.return_value = _fake_response()
        get_weather(14.69, -17.44)

    args, kwargs = mock_get.call_args
    assert "open-meteo" in args[0]
    assert kwargs["params"]["latitude"] == 14.69
    assert kwargs["params"]["longitude"] == -17.44


def test_get_weather_retourne_none_si_api_down():
    with patch("app.workers.weather_worker.requests.get", side_effect=Exception("timeout")):
        result = get_weather(14.69, -17.44)
    assert result is None


def test_get_weather_retourne_none_si_status_erreur():
    with patch("app.workers.weather_worker.requests.get") as mock_get:
        resp = MagicMock()
        resp.raise_for_status.side_effect = Exception("404")
        mock_get.return_value = resp
        result = get_weather(14.69, -17.44)
    assert result is None
