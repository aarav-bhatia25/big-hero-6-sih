# Prahari ML Anomaly Microservice

FastAPI-based microservice for Tourist Safety Anomaly Detection using Isolation Forest classifier.

## Quick Start

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the ML API server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

3. Health check:
   - GET `http://localhost:8000/health`

4. Safety Prediction Endpoint:
   - POST `http://localhost:8000/api/predict`
   - Body:
     ```json
     {
       "device_id": "TOUR-7890",
       "trek_id": "TREK-001",
       "lat": 30.3165,
       "lon": 78.0322,
       "altitude": 2500,
       "hour": 14,
       "bad_weather": 0
     }
     ```

## Retraining the Model

Generate synthetic dataset:
```bash
python dataset_gen.py
```

Train Isolation Forest model:
```bash
python train_isolation_forest.py
```
