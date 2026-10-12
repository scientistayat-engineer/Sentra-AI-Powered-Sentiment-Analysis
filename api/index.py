"""Vercel serverless entry point. Vercel looks for a WSGI object named `app`."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.app.main import app  # noqa: E402,F401
