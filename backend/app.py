from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import base64
import tempfile
from gradio_client import Client, handle_file
import os
import traceback
import json
import google.generativeai as genai
from dotenv import load_dotenv
import imghdr
from io import BytesIO

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

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
    articles = get_news(query)
    return jsonify({"articles": articles})

@app.route("/api/images", methods=["POST"])
def images():
    data = request.json
    query = data.get("query", "")
    image_urls = get_images(query)
    return jsonify({"image_urls": image_urls})

@app.route("/api/generate_report", methods=["POST"])
def generate_report():
    try:
        data = request.json
        query = data.get("query", "")
        if not query:
            return jsonify({"error": "No query provided"}), 400

        # Fetch news and images
        articles = get_news(query)
        top_3_news = articles[:3] if len(articles) >= 3 else articles
        image_urls = get_images(query)[:5]  # Limit to top 5 images

        # Download and validate images to base64
        image_b64s = []
        valid_image_types = {'jpeg', 'png', 'webp'}  # Supported by Gemini
        for url in image_urls:
            try:
                resp = requests.get(url, timeout=5)
                if resp.status_code == 200:
                    # Validate image type
                    img_data = resp.content
                    img_type = imghdr.what(None, h=img_data)
                    if img_type in valid_image_types:
                        b64 = base64.b64encode(img_data).decode('utf-8')
                        image_b64s.append((b64, img_type, url))  # Include URL for reference
                    else:
                        app.logger.warning(f"Unsupported image type {img_type} for URL {url}")
            except Exception as e:
                app.logger.error(f"Failed to download image {url}: {e}")

        # News Agent: Analyze top 3 news with Gemini
        news_articles = [
            f"Article {i+1}: Title: {article['title']} - Snippet: {article['snippet']} - Link: {article['link']}"
            for i, article in enumerate(top_3_news)
        ]
        news_articles_text = "\n".join(news_articles)
        news_prompt = f"""Analyze these top 3 news articles about the disaster '{query}' and extract detailed information:

{news_articles_text}

Extract the following in JSON format:
- exact_location: string (e.g., city, country, coordinates if available)
- disaster_type: string
- date_time: string
- destruction_details: string
- loss_of_life: integer or string (e.g., number of deaths)
- injuries: integer or string
- affected_areas: list of strings
- response_actions: string
- other_details: string
"""
        model = genai.GenerativeModel('gemini-1.5-flash')
        news_response = model.generate_content(news_prompt)
        news_analysis = news_response.text.strip('```json').strip('```').strip()
        try:
            news_data = json.loads(news_analysis)
        except json.JSONDecodeError:
            news_data = {"error": "Failed to parse news analysis", "raw": news_analysis}

        # Image Agent: Analyze images with Gemini
        image_prompt = f"Analyze these images of the disaster '{query}' and extract details such as visible destruction, location clues, severity, estimated impact, and any other relevant observations. For each image, provide a description and insights in a detailed paragraph, including if it appears to be a video screenshot."
        image_contents = [image_prompt]
        for b64, img_type, url in image_b64s:
            try:
                image_contents.append({
                    "inline_data": {
                        "mime_type": f"image/{img_type}",
                        "data": b64
                    }
                })
            except Exception as e:
                app.logger.error(f"Failed to prepare image for Gemini: {e}")
        if len(image_contents) > 1:  # Only generate if there are images
            try:
                image_response = model.generate_content(image_contents)
                image_analysis = image_response.text
            except Exception as e:
                app.logger.error(f"Image analysis failed: {e}")
                image_analysis = f"Image analysis unavailable due to error: {str(e)}"
        else:
            image_analysis = "No valid images available for analysis."

        # Final Report Agent: Generate full report with Gemini
        final_prompt = f"""Generate a full detailed report for authorities on the disaster '{query}' for post-disaster actions. Follow this exact structure in Markdown format, filling in all details based on the provided data. Make the report comprehensive, including specific details on location, destruction, casualties, and recommendations. Use ASCII art for graphs where possible.

Based on news analysis (JSON): {json.dumps(news_data)}

Based on image analysis: {image_analysis}

Include sections exactly as follows:
- **Executive Summary**: Brief overview of the disaster, including key facts from news and images.
- **Exact Location and Coordinates**: Include precise coordinates (e.g., latitude and longitude) extracted or inferred from news, with a map image if available.
- **Disaster Type and Timeline**: Type of disaster and a chronological timeline of events.
- **Destruction Assessment**: Detailed description of damage to infrastructure, environment, and economy.
- **Casualties and Injuries**: Number of deaths, injuries, and missing persons.
- **Affected Areas**: List of regions, cities, or areas impacted.
- **Image Descriptions and Insights**: Describe each image or video, embed with ![Description](URL) if image, or [Watch Video](URL) if video, followed by insights.
- **Graphs and Visualizations**: Include an ASCII timeline, text descriptions of pie/bar charts for destruction types, casualties, etc.
- **Response and Recovery Recommendations**: Numbered list of actionable steps for authorities.
- **Sources**: Bullet list of news links and image/video URLs.

End with a note: "Note: This report is based on available data as of [current date]. Update continuously with new information."

Ensure the report is objective, actionable, and detailed. If data is missing, note "Unknown" and recommend further investigation.
"""
        final_response = model.generate_content(final_prompt)
        report_md = final_response.text

        return jsonify({"report": report_md}), 200

    except Exception as e:
        tb = traceback.format_exc()
        app.logger.exception("Error in /api/generate_report: %s", e)
        return jsonify({"error": str(e), "traceback": tb}), 500

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

# Helper functions
def get_news(query):
    API_KEY = os.getenv("GOOGLE_API_KEY", "AIzaSyBGn6O2VQ6MXfvvJj9FDeBN5v-eiVOk5dM")
    CX = os.getenv("GOOGLE_CX", "01cbdb853aa8a4948")
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
    return articles

def get_images(query):
    API_KEY = os.getenv("GOOGLE_API_KEY", "AIzaSyBGn6O2VQ6MXfvvJj9FDeBN5v-eiVOk5dM")
    CX = os.getenv("GOOGLE_CX", "01cbdb853aa8a4948")
    url = 'https://www.googleapis.com/customsearch/v1'
    params = {
        'key': API_KEY,
        'cx': CX,
        'q': query,
        'num': 10,
        'gl': 'in',
        'lr': 'lang_en',
        'dateRestrict': 'd1',
        'searchType': 'image'
    }
    response = requests.get(url, params=params)
    image_urls = []
    if response.status_code == 200:
        for item in response.json().get('items', []):
            image_urls.append(item.get('link'))
    return image_urls

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)