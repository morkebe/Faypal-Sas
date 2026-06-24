"""
Racine conftest.py — permet à pytest de résoudre le module 'app'
depuis le répertoire du projet.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
