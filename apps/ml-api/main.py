import os
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd
import numpy as np
import joblib
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Tourist Safety ML Anomaly API",
    description="Isolation Forest Safety Classifier microservice for Prahari tourist tracking",
    version="1.0.0"
)

# Enable CORS for Next.js frontend / external services
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. SUPABASE CONNECTION CONFIGURATION
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client, Client
        supabase: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Successfully connected to Supabase database.")
    except Exception as e:
        print(f"Supabase connection warning: {e}")
        supabase = None
else:
    print("Notice: Supabase environment variables not set. API will operate in fallback mode.")

# 2. DYNAMIC MODEL AND SCALER LOADING
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_MODEL_PATH = os.path.join(BASE_DIR, "models", "isolation_forest_v1.pkl")
DEFAULT_SCALER_PATH = os.path.join(BASE_DIR, "models", "feature_scaler_v1.pkl")

MODEL_PATH = os.getenv("MODEL_PATH", DEFAULT_MODEL_PATH)
SCALER_PATH = os.getenv("SCALER_PATH", DEFAULT_SCALER_PATH)

# Configurable reference fallbacks (zero hardcoding)
DEFAULT_BASE_LAT = float(os.getenv("DEFAULT_BASE_LAT", "30.3165"))
DEFAULT_BASE_LON = float(os.getenv("DEFAULT_BASE_LON", "78.0322"))
DEFAULT_DIFFICULTY_SCORE = float(os.getenv("DEFAULT_DIFFICULTY_SCORE", "2.0"))

model = None
scaler = None

try:
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        print(f"ML Models loaded successfully from:\n  - Model: {MODEL_PATH}\n  - Scaler: {SCALER_PATH}")
    else:
        print(f"Warning: Model files not found at specified paths: {MODEL_PATH}, {SCALER_PATH}")
except Exception as e:
    print(f"Error loading ML models: {e}")
    model = None
    scaler = None

# 3. REQUEST SCHEMA
class GPSPing(BaseModel):
    device_id: str = Field(..., description="Device or Tourist ID")
    trek_id: Optional[str] = Field("default_trek", description="Trek identifier")
    lat: float = Field(..., description="Latitude (-90 to 90)")
    lon: float = Field(..., description="Longitude (-180 to 180)")
    altitude: float = Field(2500.0, description="Altitude in meters")
    hour: int = Field(12, description="Hour of day (0-23)")
    bad_weather: Optional[int] = Field(0, description="Bad weather flag (0 or 1)")

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in kilometers between two coordinates."""
    R = 6371.0
    dlat, dlon = np.radians(lat2 - lat1), np.radians(lon2 - lon1)
    a = np.sin(dlat / 2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2)**2
    return R * (2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a)))

# 4. HEALTH CHECK ENDPOINT
@app.get("/health")
def health_check():
    return {
        "status": "online",
        "model_loaded": model is not None and scaler is not None,
        "supabase_connected": supabase is not None,
        "config": {
            "model_path": MODEL_PATH,
            "scaler_path": SCALER_PATH,
            "default_base_lat": DEFAULT_BASE_LAT,
            "default_base_lon": DEFAULT_BASE_LON,
        }
    }

# 5. ML PREDICTION ENDPOINT
@app.post("/api/predict")
async def analyze_safety(ping: GPSPing):
    base_lat = DEFAULT_BASE_LAT
    base_lon = DEFAULT_BASE_LON
    difficulty_score = DEFAULT_DIFFICULTY_SCORE

    # --- A. Fetch Context from Supabase or Fallbacks ---
    if supabase is not None and ping.trek_id:
        try:
            response = supabase.table('trek_ml_config').select('*').eq('trek_id', ping.trek_id).execute()
            if response.data and len(response.data) > 0:
                trek_data = response.data[0]
                base_lat = float(trek_data.get('base_lat', base_lat))
                base_lon = float(trek_data.get('base_lon', base_lon))
                difficulty_score = float(trek_data.get('difficulty_score', difficulty_score))
            else:
                # Fallback check geofences table
                geo_resp = supabase.table('geofences').select('*').limit(1).execute()
                if geo_resp.data and len(geo_resp.data) > 0:
                    coords = geo_resp.data[0].get('coordinates') or geo_resp.data[0].get('geometry', {}).get('coordinates')
                    if coords and len(coords) > 0:
                        first_pt = coords[0][0] if isinstance(coords[0][0], list) else coords[0]
                        if isinstance(first_pt, (list, tuple)) and len(first_pt) >= 2:
                            base_lat = float(first_pt[1] if abs(first_pt[1]) <= 90 else first_pt[0])
                            base_lon = float(first_pt[0] if abs(first_pt[1]) <= 90 else first_pt[1])
        except Exception as e:
            print(f"Supabase read fallback: {e}")

    # --- B. Feature Engineering ---
    distance_km = calculate_distance(ping.lat, ping.lon, base_lat, base_lon)

    # --- C. ML Prediction ---
    if model is not None and scaler is not None:
        try:
            features = pd.DataFrame([{
                'Difficulty_Score': difficulty_score,
                'Max_Altitude_m': ping.altitude,
                'Hour_of_Day': ping.hour,
                'Distance_From_Trail_km': distance_km,
                'Bad_Weather_Flag': ping.bad_weather or 0
            }])

            scaled_features = scaler.transform(features)
            raw_prediction = model.predict(scaled_features)[0]
            # IsolationForest decision function gives score (< 0 means anomaly)
            decision_score = float(model.decision_function(scaled_features)[0])

            status = "SAFE" if raw_prediction == 1 else "DANGER"
        except Exception as e:
            print(f"Prediction computation fallback: {e}")
            status = "DANGER" if distance_km > 10.0 or (ping.hour >= 20 or ping.hour <= 4) else "SAFE"
            decision_score = 0.0
    else:
        # Rule-based fallback if model is not loaded
        status = "DANGER" if distance_km > 10.0 or (ping.hour >= 20 or ping.hour <= 4) else "SAFE"
        decision_score = 0.0

    # --- D. Database Sync (Upsert active_devices) ---
    if supabase is not None:
        try:
            upsert_data = {
                "device_id": ping.device_id,
                "current_lat": ping.lat,
                "current_lon": ping.lon,
                "safety_status": status
            }
            supabase.table('active_devices').upsert(upsert_data).execute()
        except Exception as e:
            print(f"Supabase write error (non-fatal): {e}")

    return {
        "device_id": ping.device_id,
        "status": status,
        "distance_calculated_km": round(distance_km, 2),
        "decision_score": round(decision_score, 4),
        "base_camp_ref": {
            "lat": base_lat,
            "lon": base_lon
        }
    }
