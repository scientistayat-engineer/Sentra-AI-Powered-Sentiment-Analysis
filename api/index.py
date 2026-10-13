
"""Vercel entry point for the Sentra Flask application."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from backend.app.main import create_app

app = create_app(serve_frontend=True)
