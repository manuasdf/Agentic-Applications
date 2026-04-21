import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/hooks/useLocalStorage';
import { useAI } from '@/hooks/useAI';
import LoadingOverlay from '@/components/LoadingOverlay';
import { JobAnalysis, AIProvider } from '@/types';

export default function AnalysisPage() {
  const navigate = useNavigate();
  const { settings, profiles, getJobById } = useAppState();
  const { 
    analysis, 
    jobText, 
    jobUrl,
    isAnalyzing,
    analysisError,
    generateCV,
    generateCoverLetter,
    generateEmail,
    fullGenerate,
    compileDocument,
    isGenerating,
    currentStep,
    cvLatex,
    coverLetterLatex,
    emailContent,
    generationErrors,
  } = useAI();

  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [provider, setProvider] = useState<AIProvider>(settings.default_provider);
  const [apiKey, setApiKey] = useState('');
  const [babelLanguage, setBabelLanguage] = useState(settings.babel_language || 'english');
  const [toneGuide, setToneGuide] = useState('');
  const [generateOptions, setGenerateOptions] = useState({
    cv: true,
    cover_letter: true,
    email: false,
  });
  const [isCompilingAll, setIsCompilingAll] = useState(false);
  const [compiledPdfs, setCompiledPdfs] = useState({
    cv: null,
    cover_letter: null,
  });

  // Load tone guide if exists
  useEffect(() => {
    // Try to load tone guide from data directory
    fetch('/data/tone.md')
      .then(res => res.text())
      .catch(() => '');
  }, []);

  // Load API key from settings
  useEffect(() => {
    if (provider && settings.api_keys?.[provider]) {
      setApiKey(settings.api_keys[provider]);
    }
  }, [provider, settings.api_keys]);

  // Auto-select first profile
  useEffect(() => {
    if (profiles.length > 0) {
      setSelectedProfile(profiles[0].id);
    }
  }, [profiles]);

  // Update provider from settings
  useEffect(() => {
    setProvider(settings.default_provider);
  }, [settings.default_provider]);

  // No analysis - redirect to home
  useEffect(() => {
    if (!analysis && !isAnalyzing && !jobText) {
      navigate('/');
    }
  }, [analysis, isAnalyzing, jobText, navigate]);

  // Get fit percentage and recommendation
  const fitPercentage = analysis?.fit_percentage || 0;
  const recommendation = analysis?.recommendation || 'neutral';
  const fits = analysis?.fit_assessment || '';

  // Get recommendation color and message
  const getRecommendationConfig = useCallback((rec: string) => {
    switch (rec) {
      case 'strong_yes':
      case 'yes':
        return { 
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '✓',
          message: 'Strong fit! You should definitely apply.'
        };
      case 'discourage':
      case 'no':
        return { 
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: '✗',
          message: 'Not a good fit. Consider applying elsewhere.'
        };
      default:
        return { 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '~',
          message: 'Moderate fit. Review carefully.'
        };
    }
  }, []);

  const recConfig = getRecommendationConfig(recommendation);

  // Handle generate documents
  const handleGenerate = useCallback(async () => {
    if (!analysis || !selectedProfile) return;

    const profile = profiles.find(p => p.id === selectedProfile);
    if (!profile) return;

    setIsCompilingAll(true);

    try {
      // Generate documents
      const apiKeyToUse = apiKey || settings.api_keys?.[provider];

      if (generateOptions.cv) {
        await generateCV(
          analysis,
          profile.content,
          { provider, apiKey: apiKeyToUse, babelLanguage, toneGuide }
        );
      }

      if (generateOptions.cover_letter) {
        await generateCoverLetter(
          analysis,
          profile.content,
          { provider, apiKey: apiKeyToUse, babelLanguage, toneGuide }
        );
      }

      if (generateOptions.email) {
        await generateEmail(
          analysis,
          profile.content,
          { provider, apiKey: apiKeyToUse, babelLanguage, toneGuide }
        );
      }

      // Compile PDFs if we have LaTeX
      if (cvLatex) {
        const cvPdf = await compileDocument(cvLatex);
        if (cvPdf) setCompiledPdfs(prev => ({ ...prev, cv: cvPdf }));
      }

      if (coverLetterLatex) {
        const clPdf = await compileDocument(coverLetterLatex);
        if (clPdf) setCompiledPdfs(prev => ({ ...prev, cover_letter: clPdf }));
      }

      // Navigate to review page after a short delay
      setTimeout(() => {
        navigate('/review');
      }, 500);

    } catch (e) {
      console.error('Generation error:', e);
    } finally {
      setIsCompilingAll(false);
    }
  }, [
    analysis,
    selectedProfile,
    profiles,
    apiKey,
    settings.api_keys,
    provider,
    babelLanguage,
    toneGuide,
    generateOptions,
    generateCV,
    generateCoverLetter,
    generateEmail,
    compileDocument,
    cvLatex,
    coverLetterLatex,
    navigate
  ]);

  // Handle quick compile for a single document
  const handleQuickCompile = useCallback(async (docType: 'cv' | 'cover_letter') => {
    const latex = docType === 'cv' ? cvLatex : coverLetterLatex;
    if (!latex) return;

    try {
      const pdf = await compileDocument(latex);
      if (pdf) {
        setCompiledPdfs(prev => ({ ...prev, [docType]: pdf }));
      }
    } catch (e) {
      console.error('Compile error:', e);
    }
  }, [cvLatex, coverLetterLatex, compileDocument]);

  if (!analysis && !isAnalyzing) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No analysis available. Please submit a job URL.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LoadingOverlay />

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Job Analysis</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            New Analysis
          </button>
        </div>
      </div>

      {/* Job Info */}
      {jobUrl && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Job Posting URL</p>
              <p className="font-medium text-gray-900 break-all">
                <a href={jobUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {jobUrl}
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Fit Analysis Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 mb-4">
            <span className="text-4xl font-bold text-blue-700">{Math.round(fitPercentage)}%</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Fit Score</h2>
        </div>

        {/* Recommendation */}
        <div className={`inline-flex items-center px-4 py-2 rounded-full border ${recConfig.color} mb-6`}>
          <span className="mr-2 text-xl">{recConfig.icon}</span>
          <span className="font-semibold mr-2">
            {recommendation === 'strong_yes' ? 'Strong Fit' :
             recommendation === 'yes' ? 'Good Fit' :
             recommendation === 'discourage' ? 'Not a Fit' :
             recommendation === 'no' ? 'Poor Fit' : 'Moderate Fit'}
          </span>
          <span className="text-sm opacity-80">{recConfig.message}</span>
        </div>

        {/* Assessment */}
        {fits && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Assessment</h3>
            <div className="prose max-w-none bg-gray-50 p-4 rounded-lg border">
              <p className="whitespace-pre-wrap">{fits}</p>
            </div>
          </div>
        )}
      </div>

      {/* Job Details Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Job info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Information</h3>
          
          {analysis.job_title && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Title</span>
                <span className="font-medium">{analysis.job_title}</span>
              </div>
              <hr className="border-gray-200" />
            </div>
          )}
          
          {analysis.company && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Company</span>
                <span className="font-medium">{analysis.company}</span>
              </div>
              <hr className="border-gray-200" />
            </div>
          )}
          
          {analysis.location && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Location</span>
                <span className="font-medium">{analysis.location}</span>
              </div>
              <hr className="border-gray-200" />
            </div>
          )}
          
          {analysis.language && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Language</span>
                <span className="font-medium">{analysis.language}</span>
              </div>
            </div>
          )}
        </div>

        {/* Requirements */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Requirements</h3>
          
          {analysis.requirements && analysis.requirements.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Required:</p>
              <ul className="space-y-2 ml-4">
                {analysis.requirements.map((req, i) => (
                  <li key={i} className="text-sm flex items-center">
                    <svg className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {analysis.nice_to_haves && analysis.nice_to_haves.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
              <p className="text-sm text-gray-500">Nice to have:</p>
              <ul className="space-y-2 ml-4">
                {analysis.nice_to_haves.map((nice, i) => (
                  <li key={i} className="text-sm flex items-center">
                    <svg className="w-4 h-4 text-gray-300 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                    {nice}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {analysis.skills && analysis.skills.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
              <p className="text-sm text-gray-500">Skills:</p>
              <div className="flex flex-wrap gap-2">
                {analysis.skills.map((skill, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generation Options */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Documents</h3>
        
        {!selectedProfile && (
          <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg text-sm mb-4">
            Please select a profile to generate documents.
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Profile selection */}
          {profiles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Candidate Profile
              </label>
              <select
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Provider selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AIProvider)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="mistral">Mistral</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="xai">xAI (Grok)</option>
              <option value="deepseek">DeepSeek</option>
              <option value="local">Local (Ollama)</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key (optional - if not saved in settings)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Your ${provider} API key`}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Babel Language
            </label>
            <select
              value={babelLanguage}
              onChange={(e) => setBabelLanguage(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            >
              <option value="english">English</option>
              <option value="ngerman">German (ngerman)</option>
              <option value="french">French</option>
              <option value="spanish">Spanish</option>
            </select>
          </div>
        </div>

        {/* Document options */}
        <div className="space-y-3 mb-6">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={generateOptions.cv}
              onChange={(e) => setGenerateOptions({ ...generateOptions, cv: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-gray-700">CV</span>
          </label>
          
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={generateOptions.cover_letter}
              onChange={(e) => setGenerateOptions({ ...generateOptions, cover_letter: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-gray-700">Cover Letter</span>
          </label>
          
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={generateOptions.email}
              onChange={(e) => setGenerateOptions({ ...generateOptions, email: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-gray-700">Email Draft</span>
          </label>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!selectedProfile || isGenerating || isCompilingAll}
          className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating || isCompilingAll ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Documents...
            </span>
          ) : (
            'Generate Documents'
          )}
        </button>
      </div>

      {/* Quick actions for already generated documents */}
      {(cvLatex || coverLetterLatex || emailContent) && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-4">Documents Generated</h3>
          
          <div className="flex flex-wrap gap-3">
            {cvLatex && !compiledPdfs.cv && (
              <button
                onClick={() => handleQuickCompile('cv')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Compile CV
              </button>
            )}
            
            {coverLetterLatex && !compiledPdfs.cover_letter && (
              <button
                onClick={() => handleQuickCompile('cover_letter')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Compile Cover Letter
              </button>
            )}
            
            {compiledPdfs.cv || compiledPdfs.cover_letter && (
              <button
                onClick={() => navigate('/review')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Review Page
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
