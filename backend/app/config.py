"""Central configuration, read from environment variables."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

MODEL_PATH = Path(os.getenv("MODEL_PATH", ROOT / "models" / "sentiment_model.joblib"))
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
MAX_TEXT_LENGTH = int(os.getenv("MAX_TEXT_LENGTH", "1000"))
MIN_TEXT_LENGTH = 3
FRONTEND_DIR = ROOT / "frontend"
LABELS = ["Negative", "Neutral", "Positive"]
