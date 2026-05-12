import os
import json
import uuid
import base64
from datetime import datetime, timedelta
from io import BytesIO

import requests
import numpy as np
from PIL import Image
from flask import Blueprint, request, jsonify, current_app as app
from geopy.geocoders import Nominatim

from change_detection import detect_building_changes
from landcover import (
    ort_session,
    preprocess,
    run_inference,
    prediction_to_color_image,
    pil_to_base64,
    CLASS_NAMES,
    CLASS_COLORS,
)
from road_extract import run_road_extraction_on_path

sentinel_bp = Blueprint("sentinel", __name__)

SENTINEL_CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sentinel_cache")
if not os.path.exists(SENTINEL_CACHE_DIR):
    os.makedirs(SENTINEL_CACHE_DIR)

_geolocator = Nominatim(user_agent="omniview-sentinel")


def parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError as exc:
        raise ValueError("Invalid date format. Use YYYY-MM-DD.") from exc


def get_default_dates():
    recent = datetime.utcnow().date()
    historical = recent - timedelta(days=180)
    return datetime.combine(historical, datetime.min.time()), datetime.combine(recent, datetime.min.time())


def get_sentinel_token():
    client_id = os.getenv("SENTINEL_CLIENT_ID")
    client_secret = os.getenv("SENTINEL_CLIENT_SECRET")
    if not client_id or not client_secret:
        return None, "Missing SENTINEL_CLIENT_ID or SENTINEL_CLIENT_SECRET"

    token_url = "https://services.sentinel-hub.com/oauth/token"
    token_data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
    }
    try:
        token_response = requests.post(token_url, data=token_data, timeout=20)
        if token_response.status_code != 200:
            return None, f"Token request failed ({token_response.status_code})"
        token = token_response.json().get("access_token")
        if not token:
            return None, "Token response missing access_token"
        return token, None
    except Exception as exc:
        return None, str(exc)


def build_bbox(lat, lon, bbox_km):
    half_box_deg = (bbox_km / 2.0) / 111.0
    return [
        lon - half_box_deg,
        lat - half_box_deg,
        lon + half_box_deg,
        lat + half_box_deg,
    ]


def is_cloudy(image_array, threshold=0.3):
    if image_array.ndim < 3:
        return False
    white_mask = np.all(image_array >= 240, axis=-1)
    return float(np.mean(white_mask)) > threshold


def fetch_sentinel_image(lat, lon, date, token, bbox_km, width, height):
    bbox = build_bbox(lat, lon, bbox_km)

    evalscript = """
//VERSION=3
function setup() {
  return {
    input: ["B02", "B03", "B04"],
    output: { bands: 3 }
  };
}
function evaluatePixel(sample) {
  return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02];
}
"""

    request_json = {
        "input": {
            "bounds": {"bbox": bbox},
            "data": [
                {
                    "type": "sentinel-2-l2a",
                    "dataFilter": {
                        "timeRange": {
                            "from": (date - timedelta(days=15)).strftime("%Y-%m-%dT00:00:00Z"),
                            "to": (date + timedelta(days=15)).strftime("%Y-%m-%dT23:59:59Z"),
                        },
                        "maxCloudCoverage": 20,
                    },
                    "processing": {"upsampling": "BICUBIC"},
                }
            ],
        },
        "output": {
            "width": width,
            "height": height,
            "responses": [{"identifier": "default", "format": {"type": "image/png"}}],
        },
        "evalscript": evalscript,
    }

    process_url = "https://services.sentinel-hub.com/api/v1/process"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    response = requests.post(process_url, json=request_json, headers=headers, timeout=45)
    if response.status_code != 200:
        raise RuntimeError(f"Sentinel request failed ({response.status_code})")

    return Image.open(BytesIO(response.content)).convert("RGB")


def fetch_with_fallback(lat, lon, target_date, token, bbox_km, width, height, max_attempts=6):
    current_date = target_date
    last_error = None

    for attempt in range(max_attempts):
        try:
            image = fetch_sentinel_image(lat, lon, current_date, token, bbox_km, width, height)
            image_array = np.array(image)
            mean_value = float(np.mean(image_array))
            if mean_value < 5:
                last_error = "Image too dark"
            elif mean_value > 250:
                last_error = "Image too bright"
            elif is_cloudy(image_array, threshold=0.3):
                last_error = "Image appears cloudy"
            else:
                if attempt > 0:
                    app.logger.info("Sentinel image fallback used for %s", current_date.strftime("%Y-%m-%d"))
                return image, current_date, None
        except Exception as exc:
            last_error = str(exc)

        current_date = current_date - timedelta(days=7)

    return None, None, last_error


def image_to_base64(image, fmt="PNG"):
    buffer = BytesIO()
    image.save(buffer, format=fmt)
    data = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/{fmt.lower()};base64,{data}"


@sentinel_bp.route("/api/sentinel/fetch", methods=["POST"])
def sentinel_fetch():
    try:
        data = request.get_json(force=True) or {}
        place_name = (data.get("place_name") or "").strip()
        lat = data.get("lat")
        lon = data.get("lon")

        if place_name and (lat is None or lon is None):
            location = _geolocator.geocode(place_name, timeout=15)
            if not location:
                return jsonify({"error": "Place not found"}), 404
            lat = location.latitude
            lon = location.longitude
            resolved_name = location.address
        else:
            resolved_name = place_name if place_name else None

        if lat is None or lon is None:
            return jsonify({"error": "Provide place_name or lat/lon"}), 400

        try:
            lat = float(lat)
            lon = float(lon)
        except ValueError:
            return jsonify({"error": "Invalid lat/lon"}), 400

        try:
            historical_date = parse_date(data.get("historical_date"))
            recent_date = parse_date(data.get("recent_date"))
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        if historical_date is None or recent_date is None:
            default_hist, default_recent = get_default_dates()
            historical_date = historical_date or default_hist
            recent_date = recent_date or default_recent

        if historical_date > recent_date:
            return jsonify({"error": "historical_date must be before recent_date"}), 400

        bbox_km = data.get("bbox_km", 2.0)
        try:
            bbox_km = float(bbox_km)
        except ValueError:
            return jsonify({"error": "Invalid bbox_km"}), 400

        token, token_error = get_sentinel_token()
        if not token:
            return jsonify({"error": token_error}), 400

        width = int(data.get("width", 1024))
        height = int(data.get("height", 1024))

        hist_image, hist_date_used, hist_error = fetch_with_fallback(
            lat, lon, historical_date, token, bbox_km, width, height
        )
        if hist_image is None:
            return jsonify({"error": f"Historical image fetch failed: {hist_error}"}), 502

        recent_image, recent_date_used, recent_error = fetch_with_fallback(
            lat, lon, recent_date, token, bbox_km, width, height
        )
        if recent_image is None:
            return jsonify({"error": f"Recent image fetch failed: {recent_error}"}), 502

        job_id = uuid.uuid4().hex
        job_dir = os.path.join(SENTINEL_CACHE_DIR, job_id)
        os.makedirs(job_dir, exist_ok=True)

        hist_path = os.path.join(job_dir, "historical.png")
        recent_path = os.path.join(job_dir, "recent.png")
        hist_image.save(hist_path, format="PNG")
        recent_image.save(recent_path, format="PNG")

        meta = {
            "job_id": job_id,
            "lat": lat,
            "lon": lon,
            "bbox_km": bbox_km,
            "place_name": resolved_name,
            "historical_date": hist_date_used.strftime("%Y-%m-%d"),
            "recent_date": recent_date_used.strftime("%Y-%m-%d"),
            "historical_path": hist_path,
            "recent_path": recent_path,
            "created_at": datetime.utcnow().isoformat() + "Z",
        }
        meta_path = os.path.join(job_dir, "meta.json")
        with open(meta_path, "w", encoding="utf-8") as meta_file:
            json.dump(meta, meta_file)

        return jsonify(
            {
                "status": "success",
                "job_id": job_id,
                "location": {
                    "lat": lat,
                    "lon": lon,
                    "place_name": resolved_name,
                },
                "historical_date": meta["historical_date"],
                "recent_date": meta["recent_date"],
                "bbox_km": bbox_km,
                "images": {
                    "historical": image_to_base64(hist_image),
                    "recent": image_to_base64(recent_image),
                },
            }
        )

    except Exception as exc:
        app.logger.error("Sentinel fetch failed: %s", exc)
        return jsonify({"error": str(exc)}), 500


@sentinel_bp.route("/api/sentinel/run-models", methods=["POST"])
def sentinel_run_models():
    data = request.get_json(force=True) or {}
    job_id = data.get("job_id")
    if not job_id:
        return jsonify({"error": "job_id is required"}), 400

    meta_path = os.path.join(SENTINEL_CACHE_DIR, job_id, "meta.json")
    if not os.path.exists(meta_path):
        return jsonify({"error": "job_id not found"}), 404

    with open(meta_path, "r", encoding="utf-8") as meta_file:
        meta = json.load(meta_file)

    hist_path = meta.get("historical_path")
    recent_path = meta.get("recent_path")
    if not hist_path or not recent_path:
        return jsonify({"error": "Image paths missing in job metadata"}), 500

    results = {}
    errors = []

    try:
        with open(hist_path, "rb") as pre_file:
            pre_bytes = pre_file.read()
        with open(recent_path, "rb") as post_file:
            post_bytes = post_file.read()
        change_result = detect_building_changes(pre_bytes, post_bytes)
        if change_result.get("error"):
            raise RuntimeError(change_result["error"])
        results["change_detection"] = change_result
    except Exception as exc:
        errors.append(f"Change detection failed: {exc}")
        results["change_detection"] = {"error": str(exc)}

    try:
        if ort_session is None:
            raise RuntimeError("Landcover model not loaded")
        orig_img = Image.open(recent_path).convert("RGB")
        tensor = preprocess(orig_img)
        prediction = run_inference(ort_session, tensor)
        mask_img = prediction_to_color_image(prediction)
        unique, counts = np.unique(prediction, return_counts=True)
        total = int(prediction.size)
        class_stats = []
        for i, name in enumerate(CLASS_NAMES):
            cnt = int(counts[unique == i][0]) if i in unique else 0
            class_stats.append(
                {
                    "name": name,
                    "count": cnt,
                    "percentage": round(cnt / total * 100, 2),
                    "color": f"rgb({CLASS_COLORS[i][0]},{CLASS_COLORS[i][1]},{CLASS_COLORS[i][2]})",
                }
            )
        results["landcover"] = {
            "original": pil_to_base64(orig_img),
            "mask": pil_to_base64(mask_img),
            "classes": class_stats,
            "total_pixels": total,
        }
    except Exception as exc:
        errors.append(f"Landcover failed: {exc}")
        results["landcover"] = {"error": str(exc)}

    try:
        road_result = run_road_extraction_on_path(
            recent_path, output_prefix=f"sentinel_{job_id}"
        )
        results["road_extraction"] = {
            "original": road_result.get("orig_base64"),
            "mask": road_result.get("mask_base64"),
            "overlay": road_result.get("overlay_base64"),
        }
    except Exception as exc:
        errors.append(f"Road extraction failed: {exc}")
        results["road_extraction"] = {"error": str(exc)}

    status = "success" if len(errors) < 3 else "error"

    return jsonify(
        {
            "status": status,
            "job_id": job_id,
            "location": {
                "lat": meta.get("lat"),
                "lon": meta.get("lon"),
                "place_name": meta.get("place_name"),
            },
            "historical_date": meta.get("historical_date"),
            "recent_date": meta.get("recent_date"),
            "results": results,
            "errors": errors,
        }
    )
