from pydantic import BaseModel, Field
from typing import List, Optional


class JobDescriptionInput(BaseModel):
    cv_id: str
    job_description: str
    target_role: Optional[str] = None


class DimensionScore(BaseModel):
    score: int = Field(default=0, ge=0, le=100)
    justification: str = ""


class DetailedBreakdown(BaseModel):
    technical_depth: DimensionScore = Field(default_factory=lambda: DimensionScore(score=0, justification=""))
    business_impact: DimensionScore = Field(default_factory=lambda: DimensionScore(score=0, justification=""))
    experience_relevance: DimensionScore = Field(default_factory=lambda: DimensionScore(score=0, justification=""))
    career_trajectory: DimensionScore = Field(default_factory=lambda: DimensionScore(score=0, justification=""))
    portfolio_diversity: DimensionScore = Field(default_factory=lambda: DimensionScore(score=0, justification=""))


class ATSScoreResult(BaseModel):
    overall_score: int = Field(default=0, ge=0, le=100)
    detailed_breakdown: Optional[DetailedBreakdown] = None
    
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    
    strengths: str = ""
    weaknesses: str = ""
    
    evidence_quotes: List[str] = Field(default_factory=list)
    red_flags: List[str] = Field(default_factory=list)
    interview_questions: List[str] = Field(default_factory=list)
    competitive_positioning: str = ""
    
    actionable_suggestions: List[str] = Field(default_factory=list)