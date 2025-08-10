from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import base64
import tempfile
from gradio_client import Client, handle_file
import os
import traceback
app = Flask(__name__)
CORS(app)

@app.route("/api/status")
def status():
    return jsonify({"status": "OMNIVU backend running"})

@app.route("/api/area", methods=["POST"])
def area():
    data = request.json
    bounds = data.get("bounds")
    return jsonify({"message": "Area received", "bounds": bounds})

@app.route("/api/satellite-image", methods=["POST"])
def satellite_image():
    data = request.json
    bounds = data.get("bounds")
    image_url = "https://via.placeholder.com/300x300?text=Satellite+Image"
    return jsonify({"url": image_url})

@app.route("/api/extract-roads", methods=["POST"])
def extract_roads():
    data = request.json
    bounds = data.get("bounds")
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

# New route for Hugging Face road mask prediction
@app.route("/api/road-detection", methods=["POST"])
def road_detection():
    try:
        data = request.get_json(force=True)
        image_base64 = data.get("image_base64")

        if not image_base64:
            return jsonify({"error": "No image provided"}), 400

        # decode base64 (strip data URI prefix if present)
        if "," in image_base64:
            _, b64 = image_base64.split(",", 1)
        else:
            b64 = image_base64

        image_data = base64.b64decode(b64)

        # save to a temp file
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_file:
            tmp_file.write(image_data)
            tmp_file_path = tmp_file.name

        print("[Backend] Connecting to Hugging Face Space...")
        client = Client("Vinit710/road_omniview")  

        print("[Backend] Sending file to HF Space...")
        result = client.predict(
            image=handle_file(tmp_file_path),
            api_name="/predict",
            
        )
        print("[Backend] HF Space returned result!")

        print("\n=== HF Space raw result ===")
        print(result)
        print("=== end result ===\n")

        # Expecting tuple: (probability_mask_path, binary_mask_path)
        if not isinstance(result, (list, tuple)) or len(result) < 1:
            return jsonify({"error": "Unexpected output from HF Space", "raw_result": result}), 502

        prob_mask_path = result[0]

        # Convert to base64
        with open(prob_mask_path, "rb") as f:
            prob_mask_b64 = "data:image/webp;base64," + base64.b64encode(f.read()).decode()

        # clean up temp file
        try:
            os.remove(tmp_file_path)
        except Exception:
            pass

        return jsonify({
            "probability_mask": prob_mask_b64
        }), 200

    except Exception as e:
        tb = traceback.format_exc()
        app.logger.exception("Error in /api/road-detection: %s", e)
        return jsonify({"error": str(e), "traceback": tb}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

if __name__ == "__main__":
    app.run(port=5000)
