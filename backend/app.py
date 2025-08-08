from flask import Flask, jsonify, request
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

@app.route("/api/status")
def status():
    return jsonify({"status": "OMNIVU backend running"})

@app.route("/api/area", methods=["POST"])
def area():
    data = request.json
    bounds = data.get("bounds")
    # You can store or process bounds here
    return jsonify({"message": "Area received", "bounds": bounds})

@app.route("/api/satellite-image", methods=["POST"])
def satellite_image():
    data = request.json
    bounds = data.get("bounds")
    # Here you would call Sentinel Hub API with bounds
    # For demo, return a placeholder image URL
    image_url = "https://via.placeholder.com/300x300?text=Satellite+Image"
    return jsonify({"url": image_url})

@app.route("/api/extract-roads", methods=["POST"])
def extract_roads():
    data = request.json
    bounds = data.get("bounds")
    # Here you would run road extraction logic
    # For demo, return a dummy summary
    return jsonify({"summary": "Roads extracted for selected area."})

@app.route("/api/news", methods=["POST"])
def news():
    data = request.json
    query = data.get("query", "")
    API_KEY = 'AIzaSyBGn6O2VQ6MXfvvJj9FDeBN5v-eiVOk5dM'
    CX = '01cbdb853aa8a4948'
    url = 'https://www.googleapis.com/customsearch/v1'
    params = {
        'key': API_KEY,
        'cx': CX,
        'q': query,
        'num': 10,
        'gl': 'in',
        'lr': 'lang_en',
        'dateRestrict': 'd1'
    }
    response = requests.get(url, params=params)
    articles = []
    if response.status_code == 200:
        for item in response.json().get('items', []):
            articles.append({
                "title": item.get("title"),
                "snippet": item.get("snippet"),
                "link": item.get("link")
            })
    return jsonify({"articles": articles})

if __name__ == "__main__":
    app.run(port=5000)