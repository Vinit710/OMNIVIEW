from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/api/status")
def status():
    return jsonify({"status": "OMNIVU backend running"})

if __name__ == "__main__":
    app.run(port=5000)
