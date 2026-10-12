"""Run the whole app locally: API + frontend on http://localhost:5000"""
from backend.app.main import create_app

if __name__ == "__main__":
    create_app(serve_frontend=True).run(host="127.0.0.1", port=5000, debug=True)
