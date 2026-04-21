import { 
  ScrapeRequest, 
  ScrapeResponse,
  AIRequest, 
  AIResponse,
  CompileRequest, 
  CompileResponse,
  JobAnalysisRequest,
  JobAnalysisResponse,
  GenerateDocumentRequest,
  GenerateDocumentResponse,
  DocumentType,
  AIProvider
} from '@/types';

// Base API URL - will be proxied in development, relative in production
const API_BASE = '/api';

// Helper function to handle API errors
async function handleApiError(response: Response): Promise<void> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || 
      errorData.message || 
      `HTTP ${response.status}: ${response.statusText}`
    );
  }
}

// Scrape API

export async function scrapeJobPosting(url: string): Promise<ScrapeResponse> {
  const response = await fetch(`${API_BASE}/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url } as ScrapeRequest),
  });
  
  await handleApiError(response);
  return response.json();
}

// AI API

export async function generateAIResponse(request: AIRequest): Promise<AIResponse> {
  const response = await fetch(`${API_BASE}/ai/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  
  await handleApiError(response);
  return response.json();
}

export async function analyzeJobPosting(request: JobAnalysisRequest): Promise<JobAnalysisResponse> {
  const response = await fetch(`${API_BASE}/ai/analyze-job`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  
  await handleApiError(response);
  return response.json();
}

export async function generateCV(request: GenerateDocumentRequest): Promise<GenerateDocumentResponse> {
  const response = await fetch(`${API_BASE}/ai/generate-cv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  
  await handleApiError(response);
  return response.json();
}

export async function generateCoverLetter(request: GenerateDocumentRequest): Promise<GenerateDocumentResponse> {
  const response = await fetch(`${API_BASE}/ai/generate-cover-letter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  
  await handleApiError(response);
  return response.json();
}

export async function generateEmail(request: GenerateDocumentRequest): Promise<GenerateDocumentResponse> {
  const response = await fetch(`${API_BASE}/ai/generate-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  
  await handleApiError(response);
  return response.json();
}

// Compile API

export async function compileLatex(request: CompileRequest): Promise<CompileResponse> {
  const response = await fetch(`${API_BASE}/compile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  
  await handleApiError(response);
  return response.json();
}

// Get raw PDF response (for direct download)
export async function compileLatexRaw(request: CompileRequest): Promise<Blob> {
  const response = await fetch(`${API_BASE}/compile-raw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  
  await handleApiError(response);
  return response.blob();
}

// Full generation pipeline
export interface FullGenerationRequest {
  job_text: string;
  candidate_profile: string;
  provider: AIProvider;
  model?: string;
  api_key?: string;
  babel_language?: string;
  tone_guide?: string;
  generate_cv?: boolean;
  generate_cover_letter?: boolean;
  generate_email?: boolean;
  cv_template?: string;
  cl_template?: string;
}

export interface FullGenerationResult {
  job_analysis?: JobAnalysisResponse;
  cv?: GenerateDocumentResponse;
  cover_letter?: GenerateDocumentResponse;
  email?: GenerateDocumentResponse;
  errors: string[];
}

export async function fullGeneration(request: FullGenerationRequest): Promise<FullGenerationResult> {
  const result: FullGenerationResult = {
    errors: [],
  };

  try {
    // Step 1: Analyze job
    const analysisRequest: JobAnalysisRequest = {
      job_text: request.job_text,
      provider: request.provider,
      model: request.model,
      api_key: request.api_key,
    };
    result.job_analysis = await analyzeJobPosting(analysisRequest);

    // Only continue if we have analysis
    if (!result.job_analysis?.analysis) {
      throw new Error('No job analysis returned');
    }

    // Step 2: Generate CV (if requested)
    if (request.generate_cv !== false) {
      try {
        const cvRequest: GenerateDocumentRequest = {
          document_type: 'cv',
          job_analysis: result.job_analysis.analysis,
          candidate_profile: request.candidate_profile,
          template: request.cv_template,
          provider: request.provider,
          model: request.model,
          api_key: request.api_key,
          babel_language: request.babel_language || 'english',
          tone_guide: request.tone_guide,
        };
        result.cv = await generateCV(cvRequest);
      } catch (e) {
        result.errors.push(`CV generation failed: ${e}`);
      }
    }

    // Step 3: Generate Cover Letter (if requested)
    if (request.generate_cover_letter !== false) {
      try {
        const clRequest: GenerateDocumentRequest = {
          document_type: 'cover_letter',
          job_analysis: result.job_analysis.analysis,
          candidate_profile: request.candidate_profile,
          template: request.cl_template,
          provider: request.provider,
          model: request.model,
          api_key: request.api_key,
          babel_language: request.babel_language || 'english',
          tone_guide: request.tone_guide,
        };
        result.cover_letter = await generateCoverLetter(clRequest);
      } catch (e) {
        result.errors.push(`Cover letter generation failed: ${e}`);
      }
    }

    // Step 4: Generate Email (if requested)
    if (request.generate_email !== false) {
      try {
        const emailRequest: GenerateDocumentRequest = {
          document_type: 'email',
          job_analysis: result.job_analysis.analysis,
          candidate_profile: request.candidate_profile,
          provider: request.provider,
          model: request.model,
          api_key: request.api_key,
          babel_language: request.babel_language,
          tone_guide: request.tone_guide,
        };
        result.email = await generateEmail(emailRequest);
      } catch (e) {
        result.errors.push(`Email generation failed: ${e}`);
      }
    }

  } catch (e) {
    result.errors.push(`Error in generation pipeline: ${e}`);
  }

  return result;
}

// Health check
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
