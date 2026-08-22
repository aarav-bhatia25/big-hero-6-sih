import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Prahari Risk Service", version="0.1.0")

# The citizen page calls /risk-score directly from the browser, so the service
# must send CORS headers or every request is blocked and the UI silently falls
# back to the local scoring engine. Allow the web app origin(s).
_default_origins = "http://localhost:3000,http://127.0.0.1:3000"
_allowed_origins = [
    o.strip()
    for o in os.environ.get("ALLOWED_ORIGINS", _default_origins).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RiskFeatures(BaseModel):
    route_deviation_m: float = Field(ge=0, default=0)
    inactivity_minutes: float = Field(ge=0, default=0)
    zone_risk: float = Field(ge=0, le=100, default=0)
    hour_of_day: int = Field(ge=0, le=23, default=12)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/risk-score")
def risk_score(features: RiskFeatures):
    # Replace this explainable baseline with a versioned, evaluated sklearn pipeline.
    score = min(100, round(features.zone_risk * .45 + min(features.route_deviation_m / 20, 30) + min(features.inactivity_minutes * 1.2, 20) + (10 if features.hour_of_day < 6 or features.hour_of_day > 22 else 0)))
    level = "critical" if score >= 85 else "high" if score >= 70 else "medium" if score >= 40 else "low"
    return {"score": score, "level": level, "requires_human_review": score >= 70}
