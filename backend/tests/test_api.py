"""API tests. A small model is trained on the smoke-test CSV so no download is needed."""
import unittest
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split

from backend.app import predictor
from backend.app.main import create_app
from ml.train import SEED, train_and_evaluate

SMOKE = Path(__file__).resolve().parents[2] / "ml" / "sample_data" / "smoke_test.csv"


def _build_predictor():
    df = pd.read_csv(SMOKE)
    df["label"] = df["label"].str.capitalize()
    train, rest = train_test_split(df, test_size=0.3, stratify=df["label"], random_state=SEED)
    val, test = train_test_split(rest, test_size=0.5, stratify=rest["label"], random_state=SEED)
    bundle, *_ = train_and_evaluate(train, val, test, {"name": "smoke-test"})
    return predictor.SentimentPredictor(bundle)


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        predictor._cached = _build_predictor()
        cls.client = create_app().test_client()

    @classmethod
    def tearDownClass(cls):
        predictor.reset_cache()

    def post(self, body):
        return self.client.post("/api/predict", json=body)

    def test_health(self):
        r = self.client.get("/api/health")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.get_json()["model_loaded"])

    def test_positive_negative_neutral(self):
        cases = {
            "I love this phone, it works great": "Positive",
            "Terrible laptop! Complete waste of money": "Negative",
            "The chair arrived on Tuesday in a brown box": "Neutral",
        }
        for text, expected in cases.items():
            r = self.post({"text": text})
            self.assertEqual(r.status_code, 200)
            self.assertEqual(r.get_json()["sentiment"], expected, text)

    def test_response_shape(self):
        data = self.post({"text": "Amazing speaker, highly recommend"}).get_json()
        self.assertEqual(set(data), {"sentiment", "confidence", "scores", "keywords", "processing_ms"})
        self.assertAlmostEqual(sum(data["scores"].values()), 1.0, places=2)
        self.assertTrue(0 <= data["confidence"] <= 1)

    def test_empty_text(self):
        r = self.post({"text": "   "})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.get_json()["error"]["code"], "text_too_short")

    def test_missing_field(self):
        self.assertEqual(self.post({"msg": "hi"}).status_code, 400)

    def test_wrong_type(self):
        self.assertEqual(self.post({"text": 123}).status_code, 400)

    def test_numbers_only(self):
        self.assertEqual(self.post({"text": "12345 6789"}).status_code, 400)

    def test_too_long(self):
        r = self.post({"text": "good " * 400})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.get_json()["error"]["code"], "text_too_long")

    def test_invalid_json(self):
        r = self.client.post("/api/predict", data="not json", content_type="application/json")
        self.assertEqual(r.status_code, 400)

    def test_unknown_route_and_method(self):
        self.assertEqual(self.client.get("/api/nope").status_code, 404)
        self.assertEqual(self.client.get("/api/predict").status_code, 405)

    def test_model_info(self):
        r = self.client.get("/api/model-info")
        self.assertEqual(r.status_code, 200)
        self.assertIn("accuracy", r.get_json()["metrics"])


class MissingModelTests(unittest.TestCase):
    def test_503_when_model_missing(self):
        predictor.reset_cache()
        from backend.app import config
        old = config.MODEL_PATH
        config.MODEL_PATH = Path("/nonexistent/model.joblib")
        try:
            client = create_app().test_client()
            r = client.post("/api/predict", json={"text": "hello there"})
            self.assertEqual(r.status_code, 503)
            self.assertEqual(r.get_json()["error"]["code"], "model_unavailable")
        finally:
            config.MODEL_PATH = old


if __name__ == "__main__":
    unittest.main()
