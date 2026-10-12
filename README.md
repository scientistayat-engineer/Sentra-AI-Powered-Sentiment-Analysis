# Sentra – AI-Powered Sentiment Analysis

Sentra classifies customer reviews and comments as **Positive**, **Negative** or **Neutral** using a real machine-learning
model (TF-IDF features + a scikit-learn classifier). It is a full-stack app: HTML/CSS/JavaScript frontend, Python (Flask)
API, Firebase Authentication + Cloud Firestore for private history, deployed on Vercel.

- **Live app:** _add your Vercel URL here_
- **Dataset:** [TweetEval – Sentiment (SemEval-2017 Task 4)](https://huggingface.co/datasets/cardiffnlp/tweet_eval) (three classes, predefined train/validation/test splits)

## Features
- Landing page, analyzer with sample texts, clear button, loading state and clear error messages
- Result card with sentiment, confidence, per-class probabilities and **highlighted words that influenced the result**
- Dashboard: totals, distribution donut, last-7-days chart, search, filter, delete, CSV export
- Firebase Auth (email/password + Google) and private per-user history protected by Firestore rules
- Responsive layout (desktop / tablet / mobile), light and dark theme, keyboard-accessible
- Live model metrics (accuracy, precision, recall, F1) read from the trained model

## Project structure
```
sentra/
├── frontend/                 # static site (HTML, CSS, vanilla JS modules)
│   ├── index.html  login.html  dashboard.html
│   ├── css/styles.css
│   ├── js/  config.js  api.js  firebase.js  firebase-config.js
│   │        common.js  analyzer.js  auth.js  dashboard.js
│   └── assets/
├── backend/
│   ├── app/  main.py (Flask API)  predictor.py  preprocess.py  config.py
│   └── tests/  test_api.py  test_preprocess.py
├── api/index.py              # Vercel serverless entry point
├── ml/
│   ├── train.py              # data loading, model selection, evaluation, export
│   ├── sample_data/smoke_test.csv   # tiny file used ONLY to test the code
│   ├── artifacts/            # metrics.json, confusion_matrix.png, ... (created by training)
│   └── requirements-train.txt
├── models/sentiment_model.joblib    # created by training, committed for deployment
├── firebase/  firestore.rules  firestore.indexes.json  SETUP.md
├── docs/                     # report and presentation
├── vercel.json  requirements.txt  .env.example  .python-version
└── README.md
```

## 1. Run it locally
```bash
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r ml/requirements-train.txt
python ml/train.py                                      # downloads the dataset, trains, evaluates, saves the model
python run_local.py                                     # open http://localhost:5000
```
Without Firebase keys the app runs in **guest mode** (analysis works, history is off). Follow
[`firebase/SETUP.md`](firebase/SETUP.md) to switch accounts and history on.

## 2. Train and evaluate the model
`python ml/train.py` does the following:
1. Loads TweetEval/sentiment (about 45k train, 2k validation, 12k test texts).
2. Cleans text (lower-case, URL/mention handling, repeated-letter collapse; **stop words are kept** so negations like "not good" survive).
3. Builds TF-IDF features (1–2 grams) fitted on the training split only.
4. Trains Logistic Regression (C = 0.5 … 8) and Complement Naive Bayes candidates, **chooses the best on the validation split**.
5. Scores the chosen model **once** on the untouched test split and writes:
   `ml/artifacts/metrics.json`, `classification_report.txt`, `confusion_matrix.png`, `model_comparison.csv`
   and the model file `models/sentiment_model.joblib`.

Use your own labelled data instead: `python ml/train.py --source csv --csv reviews.csv` (columns `text,label`; add `--stars` if labels are 1–5 ratings).

### Results
Copy the numbers from `ml/artifacts/classification_report.txt` here after you train:

| Metric (test set, macro average) | Value |
|---|---|
| Accuracy | _fill in_ |
| Precision | _fill in_ |
| Recall | _fill in_ |
| F1-score | _fill in_ |

## 3. API
| Method & path | Purpose |
|---|---|
| `GET /api/health` | `{"status":"ok","model_loaded":true}` |
| `GET /api/model-info` | model name, dataset, sizes, test metrics |
| `POST /api/predict` | body `{"text": "..."}` |

Successful response:
```json
{"sentiment":"Positive","confidence":0.87,
 "scores":{"Negative":0.04,"Neutral":0.09,"Positive":0.87},
 "keywords":[{"word":"amazing","sentiment":"Positive","strength":1.0}],
 "processing_ms":2.1}
```
Errors are always JSON: `{"error":{"code":"text_too_short","message":"..."}}` with status 400 (invalid input),
404/405 (route), 413 (body too large), 503 (model missing) or 500 (unexpected).
Input rules: string, 3–1000 characters, must contain letters.

## 4. Tests
```bash
python -m unittest discover -s backend/tests -t . -v
```
Covers Positive/Negative/Neutral predictions, empty/invalid/too-long input, malformed JSON, unknown routes, missing model and
the JSON response shape. The API tests train a small model from `ml/sample_data/smoke_test.csv`, so they need no download
(those tests prove the code works; they say nothing about real model quality).

Manual checklist: Positive/Negative/Neutral samples · empty text · login, sign-up, logout · history appears in dashboard ·
another account cannot see it · delete and clear · phone-width layout · live site works without running anything locally.

## 5. Deploy on Vercel
1. Train the model locally and **commit `models/sentiment_model.joblib`** (a few MB). Push the repo to GitHub.
2. Vercel > **Add New Project** > import the repo. Framework preset **Other**, leave build command empty
   (`vercel.json` already sets the output directory to `frontend` and routes `/api/*` to the Flask function).
3. Add the environment variable `ALLOWED_ORIGINS` = your Vercel URL (optional; the default `*` also works because the
   frontend and API share one domain).
4. Deploy, then add the Vercel domain to **Firebase > Authentication > Authorised domains**.
5. Open `https://<your-app>.vercel.app/api/health` – it must show `"model_loaded": true`.

Important: `scikit-learn` is pinned in `requirements.txt`. Train with the same pinned version (installing
`ml/requirements-train.txt` does this) so the saved model loads on Vercel. If the Python function ever exceeds Vercel's size
or time limits, host the API on another platform, set `API_BASE` in `frontend/js/config.js` to its URL and list the Vercel
domain in `ALLOWED_ORIGINS`; the Vercel frontend URL stays your submitted live link.

## Security notes
- No private keys are in the repo. The browser Firebase config is public by design; access is controlled by `firebase/firestore.rules`.
- The API validates and size-limits input, returns JSON errors and never exposes stack traces.
- All user text is HTML-escaped before it is rendered.

## Limitations
The model is trained on English tweets, so accuracy on very different writing (long reviews, other languages, sarcasm) is lower.
Neutral is the hardest class because it overlaps with both others; see the confusion matrix after training.
