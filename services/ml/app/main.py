from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="Prahari Risk Service", version="0.1.0")

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
