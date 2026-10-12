"""Train and evaluate the Sentra sentiment model.

Examples
--------
Real dataset (downloads TweetEval/sentiment from Hugging Face, needs internet):
    python ml/train.py

Your own CSV with columns `text,label`  (label: negative/neutral/positive, 0/1/2,
or 1-5 star ratings together with --stars):
    python ml/train.py --source csv --csv path/to/reviews.csv [--stars]

Outputs
-------
models/sentiment_model.joblib        model used by the API
ml/artifacts/metrics.json            accuracy, precision, recall, F1 (test set)
ml/artifacts/classification_report.txt
ml/artifacts/confusion_matrix.png
ml/artifacts/model_comparison.csv    every candidate scored on the validation set
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, classification_report, confusion_matrix,
                             precision_recall_fscore_support)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import ComplementNB

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.app.preprocess import clean_text  # noqa: E402

LABELS = ["Negative", "Neutral", "Positive"]
SEED = 42


# --------------------------------------------------------------------- data
def _normalise_labels(series: pd.Series, stars: bool) -> pd.Series:
    if stars:
        def from_star(v):
            v = float(v)
            return "Negative" if v <= 2 else "Neutral" if v == 3 else "Positive"
        return series.map(from_star)
    text_map = {"negative": "Negative", "neutral": "Neutral", "positive": "Positive",
                "neg": "Negative", "neu": "Neutral", "pos": "Positive",
                "0": "Negative", "1": "Neutral", "2": "Positive"}
    return series.astype(str).str.strip().str.lower().map(text_map)


def load_hf():
    from datasets import load_dataset  # imported lazily: only needed for training
    ds = load_dataset("cardiffnlp/tweet_eval", "sentiment")
    frames = {}
    for split in ("train", "validation", "test"):
        df = ds[split].to_pandas()[["text", "label"]]
        df["label"] = _normalise_labels(df["label"], stars=False)
        frames[split] = df
    source = {
        "name": "TweetEval - Sentiment (SemEval-2017 Task 4)",
        "url": "https://huggingface.co/datasets/cardiffnlp/tweet_eval",
        "classes": "Negative / Neutral / Positive",
    }
    return frames["train"], frames["validation"], frames["test"], source


def load_csv(path: str, stars: bool):
    df = pd.read_csv(path)
    if not {"text", "label"} <= set(df.columns):
        raise SystemExit("CSV must contain the columns: text,label")
    df = df[["text", "label"]].dropna()
    df["label"] = _normalise_labels(df["label"], stars)
    df = df.dropna()
    train, rest = train_test_split(df, test_size=0.3, stratify=df["label"], random_state=SEED)
    val, test = train_test_split(rest, test_size=0.5, stratify=rest["label"], random_state=SEED)
    source = {"name": Path(path).name, "url": "local CSV file", "classes": "Negative / Neutral / Positive"}
    return train, val, test, source


# ------------------------------------------------------------------ training
def _prepare(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["clean"] = df["text"].map(clean_text)
    return df[df["clean"].str.len() > 0].reset_index(drop=True)


def _scores(y_true, y_pred) -> dict:
    p, r, f, _ = precision_recall_fscore_support(y_true, y_pred, labels=LABELS, average="macro", zero_division=0)
    return {"accuracy": accuracy_score(y_true, y_pred), "precision_macro": p, "recall_macro": r, "f1_macro": f}


def train_and_evaluate(train, val, test, source: dict | None = None):
    """Fit candidates, pick the best on validation, score once on the test set."""
    train, val, test = _prepare(train), _prepare(val), _prepare(test)
    small = len(train) < 1000
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1 if small else 2,
                                 max_features=200_000, sublinear_tf=True)
    X_train = vectorizer.fit_transform(train["clean"])
    X_val, X_test = vectorizer.transform(val["clean"]), vectorizer.transform(test["clean"])

    candidates = {}
    for c in (0.5, 1, 2, 4, 8):
        candidates[f"LogisticRegression(C={c})"] = LogisticRegression(
            C=c, max_iter=2000, class_weight="balanced")
    for a in (0.3, 1.0):
        candidates[f"ComplementNB(alpha={a})"] = ComplementNB(alpha=a)

    rows, fitted = [], {}
    for name, model in candidates.items():
        model.fit(X_train, train["label"])
        s = _scores(val["label"], model.predict(X_val))
        rows.append({"model": name, **s})
        fitted[name] = model
    comparison = pd.DataFrame(rows).sort_values("f1_macro", ascending=False).reset_index(drop=True)
    best_name = comparison.loc[0, "model"]
    best = fitted[best_name]

    pred = best.predict(X_test)
    report = classification_report(test["label"], pred, labels=LABELS, output_dict=True, zero_division=0)
    cm = confusion_matrix(test["label"], pred, labels=LABELS)
    metrics = {
        "model": best_name,
        "test": _scores(test["label"], pred),
        "per_class": {k: {m: report[k][m] for m in ("precision", "recall", "f1-score", "support")} for k in LABELS},
        "confusion_matrix": {"labels": LABELS, "matrix": cm.tolist()},
        "sizes": {"train": len(train), "validation": len(val), "test": len(test)},
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    bundle = {
        "vectorizer": vectorizer,
        "classifier": best,
        "labels": list(best.classes_),
        "meta": {
            "model": best_name,
            "dataset": source or {"name": "in-memory"},
            "sizes": metrics["sizes"],
            "trained_at": metrics["trained_at"],
            "metrics": {**metrics["test"], "per_class": metrics["per_class"]},
        },
    }
    return bundle, metrics, comparison, report


def save_outputs(bundle, metrics, comparison, report, model_path: Path, art_dir: Path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import seaborn as sns

    model_path.parent.mkdir(parents=True, exist_ok=True)
    art_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, model_path, compress=3)
    (art_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))
    comparison.to_csv(art_dir / "model_comparison.csv", index=False)
    lines = [f"Model: {metrics['model']}", f"Dataset: {bundle['meta']['dataset'].get('name')}", ""]
    lines.append(f"{'':12}{'precision':>10}{'recall':>10}{'f1-score':>10}{'support':>10}")
    for k in LABELS:
        r = report[k]
        lines.append(f"{k:12}{r['precision']:>10.3f}{r['recall']:>10.3f}{r['f1-score']:>10.3f}{int(r['support']):>10}")
    t = metrics["test"]
    lines += ["", f"accuracy {t['accuracy']:.3f} | macro precision {t['precision_macro']:.3f} | "
              f"macro recall {t['recall_macro']:.3f} | macro F1 {t['f1_macro']:.3f}"]
    (art_dir / "classification_report.txt").write_text("\n".join(lines))

    fig, ax = plt.subplots(figsize=(5.2, 4.4), dpi=160)
    sns.heatmap(np.array(metrics["confusion_matrix"]["matrix"]), annot=True, fmt="d", cmap="Purples",
                xticklabels=LABELS, yticklabels=LABELS, cbar=False, ax=ax)
    ax.set_xlabel("Predicted"); ax.set_ylabel("Actual"); ax.set_title("Confusion matrix (test set)")
    fig.tight_layout(); fig.savefig(art_dir / "confusion_matrix.png"); plt.close(fig)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", choices=["hf", "csv"], default="hf")
    ap.add_argument("--csv", help="path to CSV when --source csv")
    ap.add_argument("--stars", action="store_true", help="CSV labels are 1-5 star ratings")
    ap.add_argument("--model-path", default=str(ROOT / "models" / "sentiment_model.joblib"))
    ap.add_argument("--artifacts", default=str(ROOT / "ml" / "artifacts"))
    args = ap.parse_args()

    if args.source == "csv":
        if not args.csv:
            raise SystemExit("--csv is required with --source csv")
        train, val, test, source = load_csv(args.csv, args.stars)
    else:
        train, val, test, source = load_hf()

    print(f"Dataset: {source['name']} | train {len(train)}, val {len(val)}, test {len(test)}")
    bundle, metrics, comparison, report = train_and_evaluate(train, val, test, source)
    save_outputs(bundle, metrics, comparison, report, Path(args.model_path), Path(args.artifacts))
    print(comparison.to_string(index=False))
    t = metrics["test"]
    print(f"\nBest: {metrics['model']}\nTEST  accuracy={t['accuracy']:.4f}  precision={t['precision_macro']:.4f}  "
          f"recall={t['recall_macro']:.4f}  f1={t['f1_macro']:.4f}")
    print(f"Model saved to {args.model_path}")


if __name__ == "__main__":
    main()
