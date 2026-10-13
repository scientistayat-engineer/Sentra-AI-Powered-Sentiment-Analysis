<div align="center">

# 🎯 Sentra

### AI-Powered Sentiment Analysis Web Application

**Every review has a mood. Sentra finds it.**
Paste any customer comment and learn in a second whether it is **Positive**, **Negative** or **Neutral**, and which words decided it.

<br>

[![Live Demo](https://img.shields.io/badge/%F0%9F%9A%80%20Live%20Demo-Open%20the%20App-3DF0A5?style=for-the-badge&logo=vercel&logoColor=black)](https://sentra-ai-powered-sentiment-analysi.vercel.app)
[![Project Report](https://img.shields.io/badge/%F0%9F%93%84%20Project%20Report-PDF-E34F26?style=for-the-badge&logo=adobeacrobatreader&logoColor=white)](docs/sentra-report.pdf)
[![Presentation](https://img.shields.io/badge/%F0%9F%8E%A4%20Presentation-PPTX-D24726?style=for-the-badge&logo=microsoftpowerpoint&logoColor=white)](docs/sentra-presentation.pptx)

![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.1-000000?style=for-the-badge&logo=flask&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.8-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Tests](https://img.shields.io/badge/Tests-17%20passing-0B9E65?style=for-the-badge)
![Accuracy](https://img.shields.io/badge/Test%20Accuracy-58.8%25-5B4BE0?style=for-the-badge)
![F1](https://img.shields.io/badge/Macro%20F1-58.4%25-D93A57?style=for-the-badge)

</div>

---

## 📑 Table of contents

- [About the project](#-about-the-project)
- [Features](#-features)
- [Tech stack](#-tech-stack)
- [How it works](#-how-it-works)
- [Model and results](#-model-and-results)
- [Project structure](#-project-structure)
- [Getting started](#-getting-started)
- [Firebase setup](#-firebase-setup)
- [API reference](#-api-reference)
- [Deployment on Vercel](#-deployment-on-vercel)
- [Testing](#-testing)
- [Security](#-security)
- [Limitations and future work](#-limitations-and-future-work)
- [Documentation](#-documentation)
- [Author](#-author)

## 💡 About the project

Businesses collect thousands of reviews, social posts and support messages. Reading them one by one is slow and subjective.
**Sentra** turns every text into a clear sentiment label using a **real machine-learning model** (TF-IDF features and a
scikit-learn classifier). Nothing is hard-coded or random: every result comes from a model trained on labelled data and
evaluated on texts it never saw during training.

Sentra is a full-stack project built for the SMIT *AI-Powered Sentiment Analysis Web Application* assignment: HTML, CSS and
JavaScript frontend, Python (Flask) API, Firebase Authentication and Firestore, deployed on Vercel.

> 👉 **Try it now:** <https://sentra-ai-powered-sentiment-analysi.vercel.app>

## ✨ Features

| | Feature | Details |
|---|---|---|
| 🎯 | **Real predictions** | Positive, Negative and Neutral from a trained model, with confidence and per-class probabilities |
| 🔍 | **Explainable results** | Words that influenced the verdict are highlighted in your own text |
| 🔐 | **Accounts** | Email/password and Google sign-in with Firebase Authentication |
| 🗂️ | **Private history** | Every analysis is saved to Cloud Firestore; security rules let you read only your own records |
| 📊 | **Dashboard** | Totals, distribution donut, last-7-days chart, search, filter, delete and CSV export |
| 🎨 | **Modern UI** | Responsive on phone, tablet and desktop, light and dark themes, animated mood background |
| ♿ | **Accessible** | Labelled controls, visible keyboard focus, reduced-motion support |
| 🛡️ | **Robust API** | Input validation, JSON errors for every failure, size limits |

## 🧰 Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (ES modules), no framework |
| Backend | Python 3.12, Flask |
| Machine learning | scikit-learn, pandas, NumPy, joblib |
| Accounts and data | Firebase Authentication, Cloud Firestore |
| Hosting | Vercel (static frontend and Python serverless function) |
| Version control | Git and GitHub |

## ⚙️ How it works

<p align="center">
  <img src="docs/images/architecture.png" alt="System architecture: the browser calls the Flask API and Firebase" width="760">
</p>

1. The browser sends your text to `POST /api/predict`.
2. The API validates and cleans it, builds TF-IDF features and runs the classifier.
3. The response contains the label, confidence, class probabilities and influential words.
4. If you are signed in, the browser saves the result to **your** Firestore history. The Python backend needs no secret keys.

## 📈 Model and results

**Dataset:** [TweetEval – Sentiment](https://huggingface.co/datasets/cardiffnlp/tweet_eval) (SemEval-2017 Task 4), three classes with fixed splits.

| Split | Texts | Used for |
|---|---|---|
| Training | 45,615 | Fitting the vectorizer and the models |
| Validation | 2,000 | Choosing the best candidate |
| Test | 12,284 | One final, unbiased evaluation |

<p align="center">
  <img src="docs/images/pipeline.png" alt="Training pipeline" width="760">
</p>

Seven candidates were compared on the validation split (Logistic Regression with five regularisation strengths and
Complement Naive Bayes with two smoothing values). **Logistic Regression (C = 4)** scored best and was evaluated once on the test split.

### Final test results (macro average)

| Accuracy | Precision | Recall | F1-score |
|:---:|:---:|:---:|:---:|
| **58.8%** | **57.8%** | **59.3%** | **58.4%** |

<p align="center">
  <img src="docs/images/comparison.png" alt="Validation F1 of the seven candidates" width="760">
</p>

<details>
<summary><b>Validation scores of all candidates</b></summary>

| Candidate | Accuracy | Precision | Recall | F1-score |
|---|---|---|---|---|
| **Logistic Regression, C = 4 (selected)** | 67.9% | 65.0% | 66.7% | 65.6% |
| Logistic Regression, C = 2 | 67.1% | 64.1% | 66.4% | 64.9% |
| Logistic Regression, C = 8 | 67.2% | 64.2% | 65.3% | 64.6% |
| Logistic Regression, C = 1 | 65.7% | 62.8% | 65.8% | 63.5% |
| Logistic Regression, C = 0.5 | 64.7% | 62.1% | 65.4% | 62.8% |
| Complement Naive Bayes, alpha = 0.3 | 62.5% | 59.9% | 61.8% | 60.4% |
| Complement Naive Bayes, alpha = 1.0 | 64.0% | 62.5% | 58.9% | 60.0% |

</details>

> **Reading the numbers:** the test split holds different tweets from the training data, and the validation split is the one
> used to pick the model, so test scores are lower and are the honest estimate for new text.
> Per-class scores and the confusion matrix are written to `ml/artifacts/` when you run training.

## 🗂️ Project structure

```text
Sentra-AI-Powered-Sentiment-Analysis/
├── frontend/                  # static site: HTML, CSS, vanilla JS modules
│   ├── index.html  login.html  dashboard.html
│   ├── css/styles.css
│   ├── js/   config.js  api.js  firebase.js  firebase-config.js
│   │         common.js  analyzer.js  auth.js  dashboard.js
│   └── assets/
├── backend/
│   ├── app/    main.py (Flask API)  predictor.py  preprocess.py  config.py
│   └── tests/  test_api.py  test_preprocess.py
├── api/index.py               # Vercel serverless entry point
├── ml/
│   ├── train.py               # data loading, model selection, evaluation, export
│   ├── sample_data/           # tiny CSV used only to test the code
│   ├── artifacts/             # metrics.json, confusion_matrix.png, ...
│   └── requirements-train.txt
├── models/sentiment_model.joblib   # trained model loaded by the API
├── firebase/                  # firestore.rules, firestore.indexes.json, SETUP.md
├── docs/                      # report, presentation, images
├── vercel.json  requirements.txt  .env.example  run_local.py
└── README.md
```

## 🚀 Getting started

**Requirements:** Python 3.12 (3.11 also works), Git.

```bash
# 1. Clone
git clone https://github.com/scientistayat-engineer/Sentra-AI-Powered-Sentiment-Analysis.git
cd Sentra-AI-Powered-Sentiment-Analysis

# 2. Create a virtual environment
python -m venv venv
venv\Scripts\activate            # Windows (PowerShell)
# source venv/bin/activate       # macOS / Linux

# 3. Install dependencies
pip install -r ml/requirements-train.txt

# 4. Train the model (downloads the dataset, evaluates, saves models/sentiment_model.joblib)
python ml/train.py

# 5. Run the app
python run_local.py
```

Open <http://localhost:5000>. Without Firebase keys the app runs in **guest mode**: analysis works, history is switched off.

## 🔥 Firebase setup

1. Create a Firebase project and enable **Email/Password** and **Google** under *Authentication*.
2. Create a **Cloud Firestore** database.
3. Register a Web app and paste its config into `frontend/js/firebase-config.js`.
4. Publish `firebase/firestore.rules` in *Firestore → Rules*.
5. Add your Vercel domain under *Authentication → Settings → Authorised domains*.

Full step-by-step guide: [`firebase/SETUP.md`](firebase/SETUP.md).

**Data model:** `users/{uid}/predictions/{id}` with `text`, `sentiment`, `confidence`, `scores`, `createdAt`.
The browser Firebase config is public by design; access is controlled by the Firestore rules, and no service-account key is used.

## 🔌 API reference

| Method and path | Purpose |
|---|---|
| `GET /api/health` | Service status and whether the model is loaded |
| `GET /api/model-info` | Model name, dataset, split sizes and test metrics |
| `POST /api/predict` | Predict the sentiment of `{"text": "..."}` |

**Example (macOS / Linux / Git Bash):**

```bash
curl -X POST https://sentra-ai-powered-sentiment-analysi.vercel.app/api/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "The delivery was fast and the quality is amazing"}'
```

**Example (Windows PowerShell):**

```powershell
Invoke-RestMethod -Method Post -ContentType "application/json" `
  -Uri "https://sentra-ai-powered-sentiment-analysi.vercel.app/api/predict" `
  -Body '{"text": "The delivery was fast and the quality is amazing"}'
```

**Response shape** (values vary with the input):

```json
{
  "sentiment": "Positive",
  "confidence": 0.87,
  "scores": { "Negative": 0.04, "Neutral": 0.09, "Positive": 0.87 },
  "keywords": [ { "word": "amazing", "sentiment": "Positive", "strength": 1.0 } ],
  "processing_ms": 2.1
}
```

**Input rules:** a string of 3 to 1000 characters that contains letters. Errors are always JSON,
`{"error": {"code": "...", "message": "..."}}`, with status `400` (invalid input), `404`/`405` (route), `413` (body too large),
`503` (model missing) or `500` (unexpected).

## ☁️ Deployment on Vercel

<p align="center">
  <img src="docs/images/deployment.png" alt="Deployment flow" width="760">
</p>

1. Commit the trained model (`models/sentiment_model.joblib`) and push the repository to GitHub.
2. In Vercel choose **Add New Project**, import the repository, set the framework preset to **Other** and leave the build command empty.
   `vercel.json` serves `frontend/` and routes `/api/*` to the Flask function.
3. Add your Vercel domain to Firebase authorised domains.
4. Open `/api/health`: it must report `"model_loaded": true`.

`scikit-learn` is pinned in `requirements.txt`; train with the same version so the saved model loads in production.

## 🧪 Testing

```bash
python -m unittest discover -s backend/tests -t . -v
```

**17 automated tests** cover text cleaning, Positive, Negative and Neutral predictions, the JSON response shape, empty, short,
long and invalid input, malformed JSON, unknown routes and a clean `503` when the model is missing. The tests train a tiny model
from `ml/sample_data/smoke_test.csv`, so they need no download; they check the code, not the model quality.

## 🔒 Security

- No private keys in the repository; `.gitignore` excludes common credential files.
- Firestore rules: users can read, create and delete only their own records; entries are validated and cannot be edited.
- The API validates and size-limits input and never exposes stack traces.
- All user text is HTML-escaped before it is displayed.

## ⚠️ Limitations and future work

- Trained on English tweets, so long reviews, other languages and sarcasm are harder.
- Neutral overlaps with both other classes and is the hardest to separate.

**Next steps:** train on product-review data, try a transformer model, add batch CSV analysis and support Urdu and Roman Urdu.

## 📚 Documentation

| Document | Link |
|---|---|
| Detailed project report (PDF) | [`docs/sentra-report.pdf`](docs/sentra-report.pdf) |
| Presentation slides | [`docs/sentra-presentation.pptx`](docs/sentra-presentation.pptx) |
| Firebase setup guide | [`firebase/SETUP.md`](firebase/SETUP.md) |

**References:** Barbieri et al. (2020), *TweetEval: Unified Benchmark and Comparative Evaluation for Tweet Classification*;
Rosenthal et al. (2017), *SemEval-2017 Task 4: Sentiment Analysis in Twitter*; Pedregosa et al. (2011), *Scikit-learn: Machine Learning in Python*.

## 👩‍💻 Author

**Anushay Ayat**, Artificial Intelligence and Data Science, Saylani Mass IT Training (SMIT)

[![GitHub](https://img.shields.io/badge/GitHub-scientistayat--engineer-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/scientistayat-engineer)
[![Live App](https://img.shields.io/badge/Live%20App-sentra--ai--powered-3DF0A5?style=for-the-badge&logo=vercel&logoColor=black)](https://sentra-ai-powered-sentiment-analysi.vercel.app)

<div align="center">

⭐ If you like this project, give it a star on GitHub.

</div>