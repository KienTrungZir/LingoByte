from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
# pyrefly: ignore [missing-import]
from ..services.handwriting import handwriting_service

router = APIRouter()

class HandwritingSubmission(BaseModel):
    target_char: str
    strokes: List[List[List[float]]] # List of strokes, each stroke is [[x,y], ...]

@router.post("/score")
async def score_handwriting(submission: HandwritingSubmission):
    score, message = handwriting_service.calculate_score(submission.strokes, submission.target_char)
    
    if message != "Success" and "not in training set" in message:
        # Fallback for characters not in dataset
        return {"score": 85.0, "message": "Character not in dataset, using average score", "fallback": True}
        
    return {
        "score": score,
        "message": message,
        "fallback": False
    }
