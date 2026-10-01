"""
Pydantic Validation Schemas for WebSocket Payloads & Real-Time Telemetry
AI-Based Sitting Posture Detection and Postural Health Monitoring System
"""

from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field, field_validator


class LandmarkPoint(BaseModel):
    x: float = Field(..., ge=-2.0, le=3.0, description="Normalized X coordinate")
    y: float = Field(..., ge=-2.0, le=3.0, description="Normalized Y coordinate")
    z: Optional[float] = Field(0.0, description="Estimated depth coordinate")
    visibility: Optional[float] = Field(1.0, ge=0.0, le=1.0, description="Landmark confidence score")


class LandmarksPayload(BaseModel):
    type: str = Field("landmarks", description="Payload type identifier")
    camera_id: str = Field(..., description="Target camera ('front', 'left', or 'right')")
    landmarks: Optional[Dict[str, Any]] = Field(None, description="Dictionary of 33 pose landmarks")
    timestamp: Optional[float] = Field(None, description="Client timestamp in seconds")

    @field_validator('camera_id')
    @classmethod
    def validate_camera_id(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if v_clean not in ('front', 'left', 'right'):
            raise ValueError(f"Invalid camera_id '{v}'. Must be 'front', 'left', or 'right'.")
        return v_clean


class FeedbackPayload(BaseModel):
    alert_level: str = "INFO"
    message: str = "Analyzing video feeds for ergonomic alignment..."


class PostureInferenceResponse(BaseModel):
    overall_quality: str
    front_quality: str
    side_quality: str
    front_label: str
    side_label: str
    posture_label: str
    quality_confidence: float
    front_confidence: float
    side_confidence: float
    decided_by: str = "ML_ENSEMBLE"
    active_cameras: List[str]
    feedback: FeedbackPayload
    features_used: Dict[str, Any]
    timestamp: float
