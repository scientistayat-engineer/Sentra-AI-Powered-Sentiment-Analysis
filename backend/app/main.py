"""Flask application factory: REST API for sentiment prediction."""
import logging

from flask import Flask, jsonify, request, send_from_directory

from . import config
from .predictor import ModelNotAvailable, get_predictor

log = logging.getLogger("sentra")


def error(code: str, message: str, status: int):
    return jsonify({"error": {"code": code, "message": message}}), status


def validate_text(payload):
    """Return (clean_text, None) or (None, (code, message))."""
    if not isinstance(payload, dict) or "text" not in payload:
        return None, ("invalid_input", 'Send JSON like {"text": "your review"}.')
    text = payload["text"]
    if not isinstance(text, str):
        return None, ("invalid_input", "The text field must be a string.")
    text = text.strip()
    if len(text) < config.MIN_TEXT_LENGTH:
        return None, ("text_too_short", f"Please enter at least {config.MIN_TEXT_LENGTH} characters.")
    if len(text) > config.MAX_TEXT_LENGTH:
        return None, ("text_too_long", f"Text is limited to {config.MAX_TEXT_LENGTH} characters.")
    if not any(ch.isalpha() for ch in text):
        return None, ("invalid_input", "The text must contain some letters.")
    return text, None


def create_app(serve_frontend: bool = False) -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config["JSON_SORT_KEYS"] = False
    app.config["MAX_CONTENT_LENGTH"] = 32 * 1024  # reject huge bodies early

    @app.after_request
    def add_headers(resp):
        origin = request.headers.get("Origin")
        allowed = config.ALLOWED_ORIGINS
        if "*" in allowed:
            resp.headers["Access-Control-Allow-Origin"] = "*"
        elif origin and origin in allowed:
            resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        resp.headers["X-Content-Type-Options"] = "nosniff"
        return resp

    @app.route("/api/health", methods=["GET"])
    def health():
        try:
            get_predictor()
            loaded = True
        except ModelNotAvailable:
            loaded = False
        return jsonify({"status": "ok", "model_loaded": loaded})

    @app.route("/api/model-info", methods=["GET"])
    def model_info():
        try:
            return jsonify(get_predictor().info())
        except ModelNotAvailable as exc:
            return error("model_unavailable", str(exc), 503)

    @app.route("/api/predict", methods=["POST", "OPTIONS"])
    def predict():
        if request.method == "OPTIONS":
            return ("", 204)
        payload = request.get_json(silent=True)
        if payload is None:
            return error("invalid_json", "Request body must be valid JSON.", 400)
        text, problem = validate_text(payload)
        if problem:
            return error(problem[0], problem[1], 400)
        try:
            result = get_predictor().predict(text)
        except ModelNotAvailable as exc:
            return error("model_unavailable", str(exc), 503)
        return jsonify(result)

    @app.errorhandler(404)
    def not_found(_):
        return error("not_found", "This endpoint does not exist.", 404)

    @app.errorhandler(405)
    def bad_method(_):
        return error("method_not_allowed", "This method is not allowed here.", 405)

    @app.errorhandler(413)
    def too_large(_):
        return error("payload_too_large", "Request body is too large.", 413)

    @app.errorhandler(Exception)
    def unexpected(exc):
        log.exception("Unhandled error: %s", exc)
        return error("server_error", "Something went wrong on our side. Please try again.", 500)

    if serve_frontend:  # local development only; Vercel serves /frontend itself
        @app.route("/")
        def index():
            return send_from_directory(config.FRONTEND_DIR, "index.html")

        @app.route("/<path:path>")
        def static_files(path):
            return send_from_directory(config.FRONTEND_DIR, path)

    return app


app = create_app()
