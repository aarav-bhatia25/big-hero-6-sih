#MAIN LOGIC
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
import pandas as pd
import numpy as np
import joblib
import os
from dotenv import load_dotenv

load_dotenv()
app = FastAPI(title="Tourist Safety ML API")

# 1. SUPABASE CONNECTION
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("CRITICAL: Supabase environment variables are missing!")
    supabase = None
else:
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print(" Successfully connected to Supabase.")
    except Exception as e:
        print(f" Supabase connection failed: {e}")
        supabase = None

# 2. LOAD MODELS SAFELY (looking only in base_dir)
try:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    model = joblib.load(os.path.join(BASE_DIR,  'isolation_forest_v1.pkl'))
    scaler = joblib.load(os.path.join(BASE_DIR,  'feature_scaler_v1.pkl'))
    print(" ML Models loaded successfully.")
except Exception as e:
    print(f" CRITICAL ERROR Loading Models: {e}")
    model = None
    scaler = None

# 3. REQUEST SCHEMA
class GPSPing(BaseModel):
    device_id: str
    trek_id: str
    lat: float
    lon: float
    altitude: float
    hour: int

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371.0 
    dlat, dlon = np.radians(lat2 - lat1), np.radians(lon2 - lon1)
    a = np.sin(dlat / 2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2)**2
    return R * (2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a)))

# 4. THE API ENDPOINT
@app.post("/api/predict")
async def analyze_safety(ping: GPSPing):
    if supabase is None:
        raise HTTPException(status_code=500, detail="Database connection is currently down.")
    if model is None or scaler is None:
        raise HTTPException(status_code=500, detail="ML Model failed to load on the server.")

    # --- A. Fetch Context from Supabase ---
    try:
        # SELECT * FROM geofences WHERE trek_id = '...'
        response = supabase.table('trek_ml_config').select('*').eq('trek_id', ping.trek_id).execute()
        trek_data = response.data
    except Exception as e:
        print(f"Supabase Read Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to query database.")
        
    if not trek_data:
        raise HTTPException(status_code=404, detail=f"Trek ID '{ping.trek_id}' not found in database.")
    
    geofence = trek_data[0] # Get the first (and only) matched row

    if 'base_lat' not in geofence or 'base_lon' not in geofence:
        raise HTTPException(status_code=500, detail="Geofence data is missing base camp coordinates.")

    # --- B. Feature Engineering ---
    distance_km = calculate_distance(
        ping.lat, ping.lon, 
        geofence['base_lat'], geofence['base_lon']
    )
    
    features = pd.DataFrame([{
        'Difficulty_Score': geofence.get('difficulty_score', 2.0),
        'Max_Altitude_m': ping.altitude,
        'Hour_of_Day': ping.hour,
        'Distance_From_Trail_km': distance_km,
        'Bad_Weather_Flag': 0 
    }])
    
    # --- C. ML Prediction ---
    scaled_features = scaler.transform(features)
    prediction = model.predict(scaled_features)[0] 
    
    status = "SAFE" if prediction == 1 else "DANGER"
    
    # --- D. Safely Update Database (Upsert) ---
    try:
        # Upsert relies on the primary key (device_id) to update existing or insert new
        upsert_data = {
            "device_id": ping.device_id,
            "current_lat": ping.lat,
            "current_lon": ping.lon,
            "safety_status": status
        }
        supabase.table('active_devices').upsert(upsert_data).execute()
    except Exception as e:
        print(f"Supabase Write Error: {e}")
        pass # Ignore db write errors so the SOS status still returns to frontend
        
    return {
        "device_id": ping.device_id,
        "status": status,
        "distance_calculated_km": round(distance_km, 2)
    }