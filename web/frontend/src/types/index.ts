// API Types

export interface ScrapeRequest {
  url: string;
}

export interface ScrapeResponse {
  text: string;
  url: string;
}

export type AIProvider = 
  | 'mistral'
  | 'openai' 
  | 'anthropic'
  | 'xai'
  | 'deepseek'
  | 'huggingface'
  | 'local';

export interface AIRequest {
  system_prompt: string;
  user_prompt: string;
  provider: AIProvider;
  model?: string;
  api_key?: string;
  api_base?: string;
}

export interface AIResponse {
  content: string;
  provider: string;
  model?: string;
}

export interface CompileRequest {
  latex: string;
}

export interface CompileResponse {
  pdf_base64: string;
  success: boolean;
  error?: string;
}

export interface JobAnalysisRequest {
  job_text: string;
  provider: AIProvider;
  model?: string;
  api_key?: string;
}

export interface JobAnalysis {
  job_title?: string;
  company?: string;
  location?: string;
  requirements?: string[];
  nice_to_haves?: string[];
  responsibilities?: string[];
  language?: string;
  fit_percentage?: number;
  recommendation?: 'strong_yes' | 'yes' | 'neutral' | 'no' | 'discourage';
  fit_assessment?: string;
  skills?: string[];
  experience?: string;
  [key: string]: any;
}

export interface JobAnalysisResponse {
  analysis: JobAnalysis;
  raw_response: string;
}

export type DocumentType = 'cv' | 'cover_letter' | 'email';

export interface GenerateDocumentRequest {
  document_type: DocumentType;
  job_analysis: JobAnalysis;
  candidate_profile: string;
  template?: string;
  provider: AIProvider;
  model?: string;
  api_key?: string;
  babel_language?: string;
  tone_guide?: string;
}

export interface GenerateDocumentResponse {
  latex?: string;
  content?: string;
  document_type: DocumentType;
  success: boolean;
  error?: string;
}

// Application Types

export interface CandidateProfile {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface JobPosting {
  id: string;
  url: string;
  title: string;
  text: string;
  analysis?: JobAnalysis;
  created_at: string;
}

export interface GeneratedDocument {
  id: string;
  job_id: string;
  document_type: DocumentType;
  latex?: string;
  content?: string;
  pdf_base64?: string;
  created_at: string;
}

export interface AppSettings {
  default_provider: AIProvider;
  default_model?: string;
  api_keys: Record<AIProvider, string>;
  output_dir: string;
  generate_cv: boolean;
  generate_cover_letter: boolean;
  generate_email: boolean;
  babel_language: string;
  tone_guide?: string;
}

export interface GenerationJob {
  id: string;
  job_id: string;
  status: 'pending' | 'analyzing' | 'generating_cv' | 'generating_cl' | 'generating_email' | 'compiling' | 'complete' | 'failed';
  progress: number;
  documents: {
    cv?: GeneratedDocument;
    cover_letter?: GeneratedDocument;
    email?: GeneratedDocument;
  };
  created_at: string;
  completed_at?: string;
  error?: string;
}

// UI State Types

export interface AppState {
  current_job?: JobPosting;
  current_job_id?: string;
  candidate_profiles: CandidateProfile[];
  jobs: JobPosting[];
  generations: GenerationJob[];
  settings: AppSettings;
  is_loading: boolean;
  error?: string;
}

export interface AnalysisState {
  job_analysis?: JobAnalysis;
  fit_percentage?: number;
  recommendation?: string;
  is_analyzing: boolean;
  error?: string;
}

export interface GenerationState {
  cv_latex?: string;
  cover_letter_latex?: string;
  email_content?: string;
  cv_pdf?: string; // base64
  cover_letter_pdf?: string; // base64
  is_generating: boolean;
  current_step?: string;
  error?: string;
}
