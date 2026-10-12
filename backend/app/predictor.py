"""Loads the trained model and turns text into a structured prediction."""
import re
import threading
import time
from typing import Any, Dict, List, Optional

import joblib
import numpy as np

from . import config
from .preprocess import clean_text

_WORD = re.compile(r"[a-z0-9']+")
# Function words are never highlighted (they are still used by the model).
_SKIP = {"a", "an", "the", "and", "or", "but", "is", "are", "was", "were", "be", "been", "it", "its", "this", "that",
         "of", "to", "in", "on", "at", "for", "with", "as", "by", "i", "me", "my", "we", "you", "he", "she", "they",
         "so", "if", "then", "than", "from", "has", "have", "had", "do", "does", "did", "just", "url", "user"}


class ModelNotAvailable(RuntimeError):
    """Raised when the trained model file is missing or unreadable."""


class SentimentPredictor:
    def __init__(self, bundle: Dict[str, Any]):
        self.vectorizer = bundle["vectorizer"]
        self.classifier = bundle["classifier"]
        self.labels: List[str] = list(bundle["labels"])
        self.meta: Dict[str, Any] = bundle.get("meta", {})
        self._weights = self._class_weights()
        self._vocab = self.vectorizer.vocabulary_

    # -- model internals -------------------------------------------------
    def _class_weights(self) -> np.ndarray:
        clf = self.classifier
        if hasattr(clf, "coef_"):
            w = np.asarray(clf.coef_)
        else:  # Naive Bayes family
            w = np.asarray(clf.feature_log_prob_)
        return w - w.mean(axis=0, keepdims=True)

    def _keywords(self, cleaned: str, x, limit: int = 8) -> List[Dict[str, Any]]:
        """Words that pushed the prediction, with the class each leans towards."""
        row = x.tocsr()
        scores = {}
        for word in set(_WORD.findall(cleaned)):
            idx = self._vocab.get(word)
            if idx is None or word in _SKIP:
                continue
            value = row[0, idx]
            if value == 0:
                continue
            col = self._weights[:, idx]
            cls = int(col.argmax())
            scores[word] = (self.labels[cls], float(col[cls] * value))
        ranked = sorted(scores.items(), key=lambda kv: kv[1][1], reverse=True)[:limit]
        top = ranked[0][1][1] if ranked and ranked[0][1][1] > 0 else 1.0
        return [
            {"word": w, "sentiment": s, "strength": round(max(v, 0.0) / top, 3)}
            for w, (s, v) in ranked
            if v > 0 and v / top >= 0.2
        ]

    # -- public API ------------------------------------------------------
    def predict(self, text: str) -> Dict[str, Any]:
        started = time.perf_counter()
        cleaned = clean_text(text)
        x = self.vectorizer.transform([cleaned])
        proba = self.classifier.predict_proba(x)[0]
        best = int(np.argmax(proba))
        return {
            "sentiment": self.labels[best],
            "confidence": round(float(proba[best]), 4),
            "scores": {lab: round(float(p), 4) for lab, p in zip(self.labels, proba)},
            "keywords": self._keywords(cleaned, x),
            "processing_ms": round((time.perf_counter() - started) * 1000, 2),
        }

    def info(self) -> Dict[str, Any]:
        return {"labels": self.labels, **self.meta}


_lock = threading.Lock()
_cached: Optional[SentimentPredictor] = None


def get_predictor() -> SentimentPredictor:
    """Load the model once per process (important for serverless cold starts)."""
    global _cached
    if _cached is None:
        with _lock:
            if _cached is None:
                if not config.MODEL_PATH.exists():
                    raise ModelNotAvailable(
                        "Model file not found. Run `python ml/train.py` first."
                    )
                try:
                    _cached = SentimentPredictor(joblib.load(config.MODEL_PATH))
                except Exception as exc:  # corrupt / incompatible file
                    raise ModelNotAvailable(f"Model could not be loaded: {exc}") from exc
    return _cached


def reset_cache() -> None:
    global _cached
    _cached = None
