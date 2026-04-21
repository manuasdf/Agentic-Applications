import { useState, useCallback } from 'react';
import { 
  AIProvider, 
  JobAnalysis, 
  JobAnalysisResponse,
  FullGenerationRequest,
  FullGenerationResult
} from '@/types';
import { 
  scrapeJobPosting,
  analyzeJobPosting,
  generateCV,
  generateCoverLetter,
  generateEmail,
  compileLatex,
  fullGeneration,
  healthCheck,
} from '@/services/api';

// Step states for generation progress
export type GenerationStep = 
  | 'idle'
  | 'scraping'
  | 'analyzing'
  | 'generating_cv'
  | 'generating_cover_letter'
  | 'generating_email'
  | 'compiling_cv'
  | 'compiling_cover_letter'
  | 'complete'
  | 'failed';

export interface AIState {
  // Scraping
  isScraping: boolean;
  scrapeError?: string;
  
  // Analysis
  isAnalyzing: boolean;
  analysis?: JobAnalysis;
  analysisRaw?: string;
  analysisError?: string;
  
  // Generation
  isGenerating: boolean;
  currentStep: GenerationStep;
  progress: number; // 0-100
  
  // Documents
  cvLatex?: string;
  coverLetterLatex?: string;
  emailContent?: string;
  cvPdfBase64?: string;
  coverLetterPdfBase64?: string;
  
  // Errors
  generationErrors: string[];
  compileError?: string;
  
  // Job info
  jobUrl?: string;
  jobText?: string;
}

interface UseAIResult extends AIState {
  // Actions
  scrape: (url: string) => Promise<void>;
  analyze: (jobText: string, provider?: AIProvider, apiKey?: string) => Promise<JobAnalysisResponse | undefined>;
  generateCV: (analysis: JobAnalysis, profile: string, options?: { provider?: AIProvider; apiKey?: string; template?: string; babelLanguage?: string; toneGuide?: string }) => Promise<string | undefined>;
  generateCoverLetter: (analysis: JobAnalysis, profile: string, options?: { provider?: AIProvider; apiKey?: string; template?: string; babelLanguage?: string; toneGuide?: string }) => Promise<string | undefined>;
  generateEmail: (analysis: JobAnalysis, profile: string, options?: { provider?: AIProvider; apiKey?: string; babelLanguage?: string; toneGuide?: string }) => Promise<string | undefined>;
  compileDocument: (latex: string) => Promise<string | undefined>;
  fullGenerate: (request: FullGenerationRequest) => Promise<FullGenerationResult>;
  checkHealth: () => Promise<boolean>;
  reset: () => void;
}

export function useAI(): UseAIResult {
  const [state, setState] = useState<AIState>({
    isScraping: false,
    isAnalyzing: false,
    isGenerating: false,
    currentStep: 'idle',
    progress: 0,
    generationErrors: [],
  });

  const reset = useCallback(() => {
    setState({
      isScraping: false,
      isAnalyzing: false,
      isGenerating: false,
      currentStep: 'idle',
      progress: 0,
      generationErrors: [],
    });
  }, []);

  const updateStep = useCallback((step: GenerationStep, progress?: number) => {
    setState(prev => ({
      ...prev,
      currentStep: step,
      progress: progress ?? prev.progress,
    }));
  }, []);

  // Scrape a job posting URL
  const scrape = useCallback(async (url: string) => {
    setState(prev => ({ ...prev, isScraping: true, scrapeError: undefined, jobUrl: url }));
    
    try {
      const response = await scrapeJobPosting(url);
      setState(prev => ({
        ...prev,
        isScraping: false,
        jobText: response.text,
        jobUrl: url,
      }));
    } catch (e) {
      setState(prev => ({
        ...prev,
        isScraping: false,
        scrapeError: e instanceof Error ? e.message : 'Failed to scrape job posting',
        jobText: undefined,
      }));
    }
  }, []);

  // Analyze job posting
  const analyze = useCallback(async (jobText: string, provider?: AIProvider, apiKey?: string) => {
    setState(prev => ({ 
      ...prev, 
      isAnalyzing: true, 
      analysisError: undefined,
      analysis: undefined,
      analysisRaw: undefined
    }));
    
    try {
      const response = await analyzeJobPosting({
        job_text: jobText,
        provider: provider || 'mistral',
        api_key: apiKey,
      });
      
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        analysis: response.analysis,
        analysisRaw: response.raw_response,
      }));
      
      return response;
    } catch (e) {
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        analysisError: e instanceof Error ? e.message : 'Failed to analyze job posting',
      }));
      return undefined;
    }
  }, []);

  // Generate CV
  const generateCV = useCallback(async (
    analysis: JobAnalysis,
    profile: string,
    options?: { provider?: AIProvider; apiKey?: string; template?: string; babelLanguage?: string; toneGuide?: string }
  ) => {
    try {
      const response = await generateCV({
        document_type: 'cv',
        job_analysis: analysis,
        candidate_profile: profile,
        provider: options?.provider || 'mistral',
        api_key: options?.apiKey,
        template: options?.template,
        babel_language: options?.babelLanguage || 'english',
        tone_guide: options?.toneGuide,
      });
      
      if (response.success && response.latex) {
        setState(prev => ({ ...prev, cvLatex: response.latex }));
        return response.latex;
      }
      return undefined;
    } catch (e) {
      setState(prev => ({
        ...prev,
        generationErrors: [...prev.generationErrors, `CV generation: ${e}`],
      }));
      return undefined;
    }
  }, []);

  // Generate Cover Letter
  const generateCoverLetter = useCallback(async (
    analysis: JobAnalysis,
    profile: string,
    options?: { provider?: AIProvider; apiKey?: string; template?: string; babelLanguage?: string; toneGuide?: string }
  ) => {
    try {
      const response = await generateCoverLetter({
        document_type: 'cover_letter',
        job_analysis: analysis,
        candidate_profile: profile,
        provider: options?.provider || 'mistral',
        api_key: options?.apiKey,
        template: options?.template,
        babel_language: options?.babelLanguage || 'english',
        tone_guide: options?.toneGuide,
      });
      
      if (response.success && response.latex) {
        setState(prev => ({ ...prev, coverLetterLatex: response.latex }));
        return response.latex;
      }
      return undefined;
    } catch (e) {
      setState(prev => ({
        ...prev,
        generationErrors: [...prev.generationErrors, `Cover letter generation: ${e}`],
      }));
      return undefined;
    }
  }, []);

  // Generate Email
  const generateEmail = useCallback(async (
    analysis: JobAnalysis,
    profile: string,
    options?: { provider?: AIProvider; apiKey?: string; babelLanguage?: string; toneGuide?: string }
  ) => {
    try {
      const response = await generateEmail({
        document_type: 'email',
        job_analysis: analysis,
        candidate_profile: profile,
        provider: options?.provider || 'mistral',
        api_key: options?.apiKey,
        babel_language: options?.babelLanguage || 'english',
        tone_guide: options?.toneGuide,
      });
      
      if (response.success && response.content) {
        setState(prev => ({ ...prev, emailContent: response.content }));
        return response.content;
      }
      return undefined;
    } catch (e) {
      setState(prev => ({
        ...prev,
        generationErrors: [...prev.generationErrors, `Email generation: ${e}`],
      }));
      return undefined;
    }
  }, []);

  // Compile LaTeX to PDF (base64)
  const compileDocument = useCallback(async (latex: string) => {
    setState(prev => ({ ...prev, isGenerating: true, compileError: undefined }));
    
    try {
      const response = await compileLatex({ latex });
      
      if (response.success && response.pdf_base64) {
        setState(prev => ({ 
          ...prev, 
          isGenerating: false,
          compileError: undefined
        }));
        return response.pdf_base64;
      }
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        compileError: response.error || 'Failed to compile PDF',
      }));
      return undefined;
    } catch (e) {
      setState(prev => ({
        ...prev,
        isGenerating: false,
        compileError: e instanceof Error ? e.message : 'Compilation error',
      }));
      return undefined;
    }
  }, []);

  // Full generation pipeline
  const fullGenerate = useCallback(async (request: FullGenerationRequest): Promise<FullGenerationResult> => {
    setState(prev => ({
      ...prev,
      isGenerating: true,
      currentStep: 'analyzing',
      progress: 0,
      generationErrors: [],
      cvLatex: undefined,
      coverLetterLatex: undefined,
      emailContent: undefined,
      cvPdfBase64: undefined,
      coverLetterPdfBase64: undefined,
    }));
    
    const result = await fullGeneration(request);
    
    // Update state with results
    setState(prev => {
      const newState = { ...prev, isGenerating: false };
      
      if (result.job_analysis) {
        newState.analysis = result.job_analysis.analysis;
        newState.analysisRaw = result.job_analysis.raw_response;
      }
      
      if (result.cv?.latex) {
        newState.cvLatex = result.cv.latex;
      }
      
      if (result.cover_letter?.latex) {
        newState.coverLetterLatex = result.cover_letter.latex;
      }
      
      if (result.email?.content) {
        newState.emailContent = result.email.content;
      }
      
      if (result.errors.length > 0) {
        newState.generationErrors = result.errors;
        newState.currentStep = 'failed';
      } else {
        newState.currentStep = 'complete';
      }
      
      return newState;
    });
    
    return result;
  }, []);

  // Health check
  const checkHealth = useCallback(async () => {
    return healthCheck();
  }, []);

  return {
    // State
    ...state,
    // Actions
    scrape,
    analyze,
    generateCV,
    generateCoverLetter,
    generateEmail,
    compileDocument,
    fullGenerate,
    checkHealth,
    reset,
  };
}
