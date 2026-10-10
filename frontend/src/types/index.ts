export interface CVStructuredData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  skills?: unknown;
  experience?: unknown;
  education?: unknown;
  [key: string]: unknown;
}

export interface CV {
  id: string;
  file_name: string;
  raw_text?: string;
  structured_data?: CVStructuredData;
  ats_result?: ATSScoreResult | null;
  ats_score?: number | null;
  created_at: string;
}

export interface ATSScoreResult {
  overall_score: number;
  matched_skills: string[];
  missing_skills: string[];
  strengths: string;
  weaknesses: string;
  actionable_suggestions: string[];
}

export interface CoverLetterResult {
  id?: string;
  cover_letter: string;
  cv_id: string;
  job_description_snippet: string;
  message: string;
}

export interface CoverLetterListItem {
  id: string;
  cv_id: string | null;
  cv_file_name: string | null;
  company_name: string | null;
  target_role: string | null;
  letter_snippet: string;
  created_at: string;
}

export interface CoverLetterDetail {
  id: string;
  cv_id: string | null;
  cv_file_name: string | null;
  company_name: string | null;
  target_role: string | null;
  job_description: string | null;
  letter_text: string;
  created_at: string;
}

export interface DimensionScore {
  score: number;
  justification: string;
}

export interface DetailedBreakdown {
  technical_depth: DimensionScore;
  business_impact: DimensionScore;
  experience_relevance: DimensionScore;
  career_trajectory: DimensionScore;
  portfolio_diversity: DimensionScore;
}

export interface ATSScoreResult {
  overall_score: number;
  detailed_breakdown: DetailedBreakdown;
  matched_skills: string[];
  missing_skills: string[];
  strengths: string;
  weaknesses: string;
  evidence_quotes: string[];
  red_flags: string[];
  interview_questions: string[];
  competitive_positioning: string;
  actionable_suggestions: string[];
}