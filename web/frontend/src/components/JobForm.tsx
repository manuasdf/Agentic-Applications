import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/hooks/useLocalStorage';
import { useAI } from '@/hooks/useAI';
import { AIProvider, JobAnalysis } from '@/types';
import { loadFromStorage, STORAGE_KEYS, DEFAULT_SETTINGS } from '@/hooks/useLocalStorage';

export interface JobFormProps {
  onSubmit?: (job: { url: string; profile: string }) => void;
  onAnalysisComplete?: (analysis: JobAnalysis) => void;
}

export default function JobForm({ onSubmit, onAnalysisComplete }: JobFormProps) {
  const navigate = useNavigate();
  const { profiles, addProfile, settings } = useAppState();
  const { scrape, analyze, isScraping, isAnalyzing, analysis, scrapeError, analysisError, jobText, jobUrl } = useAI();
  
  const [url, setUrl] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileContent, setNewProfileContent] = useState('');
  const [showNewProfileForm, setShowNewProfileForm] = useState(false);
  const [provider, setProvider] = useState<AIProvider>(settings.default_provider);
  const [apiKey, setApiKey] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  // Update provider and API key when settings change
  useEffect(() => {
    setProvider(settings.default_provider);
  }, [settings.default_provider]);

  // Load default profile if available
  useEffect(() => {
    if (profiles.length > 0) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [profiles]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    // Validate URL
    if (!url.trim()) {
      setErrors(['Please enter a job URL']);
      return;
    }

    // Validate profile
    let profileContent = '';
    if (selectedProfileId) {
      const selectedProfile = profiles.find(p => p.id === selectedProfileId);
      profileContent = selectedProfile?.content || '';
    } else if (newProfileContent.trim()) {
      // Create new profile
      if (!newProfileName.trim()) {
        setErrors(['Please enter a name for the new profile']);
        return;
      }
      addProfile({
        name: newProfileName.trim(),
        content: newProfileContent.trim(),
      });
      profileContent = newProfileContent.trim();
      // Reset new profile form
      setNewProfileName('');
      setNewProfileContent('');
      setShowNewProfileForm(false);
    } else {
      setErrors(['Please select or create a candidate profile']);
      return;
    }

    // Notify parent of submission
    onSubmit?.({ url, profile: profileContent });

    // Start scraping
    try {
      await scrape(url);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : 'Failed to scrape job posting']);
      return;
    }
  }, [url, selectedProfileId, newProfileName, newProfileContent, profiles, addProfile, onSubmit, scrape]);

  // Handle analysis after scraping
  useEffect(() => {
    if (jobText && jobUrl) {
      // Auto-analyze if we have job text
      const apiKeyToUse = apiKey || settings.api_keys?.[provider];
      analyze(jobText, provider, apiKeyToUse || undefined);
    }
  }, [jobText, jobUrl, analyze, provider, apiKey, settings]);

  // Handle analysis completion
  useEffect(() => {
    if (analysis && onAnalysisComplete) {
      onAnalysisComplete(analysis);
      // Navigate to analysis page
      navigate('/analyze');
    }
  }, [analysis, onAnalysisComplete, navigate]);

  // Load API key from settings
  useEffect(() => {
    if (provider && settings.api_keys?.[provider]) {
      setApiKey(settings.api_keys[provider]);
    }
  }, [provider, settings.api_keys]);

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* URL Input */}
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
          Job Posting URL
        </label>
        <input
          type="url"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/job-posting"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          required
        />
        <p className="mt-1 text-sm text-gray-500">
          Enter the URL of the job posting you want to apply for
        </p>
      </div>

      {/* Profile Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Candidate Profile
        </label>
        
        {profiles.length > 0 ? (
          <div className="space-y-2">
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {profiles.map(profile => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
            
            {selectedProfile && (
              <details className="text-sm">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700 mt-1">
                  Preview profile
                </summary>
                <pre className="mt-2 p-3 bg-gray-50 rounded border text-xs text-gray-600 overflow-x-auto">
                  {selectedProfile.content}
                </pre>
              </details>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No profiles yet. Create one below.</p>
        )}

        {/* New Profile Form */}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowNewProfileForm(!showNewProfileForm)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
          >
            {showNewProfileForm ? 'Cancel' : '+ Create New Profile'}
          </button>
          
          {showNewProfileForm && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <input
                type="text"
                placeholder="Profile Name"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <textarea
                placeholder="Enter your candidate profile (markdown supported)..."
                value={newProfileContent}
                onChange={(e) => setNewProfileContent(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-vertical"
              />
            </div>
          )}
        </div>
      </div>

      {/* AI Provider Settings */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AI Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AIProvider)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="mistral">Mistral</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="xai">xAI (Grok)</option>
              <option value="deepseek">DeepSeek</option>
              <option value="huggingface">HuggingFace</option>
              <option value="local">Local (Ollama)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key (for selected provider)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Enter your ${provider} API key`}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              This will be sent to the backend and not stored in the browser
            </p>
          </div>
        </div>
      </div>

      {/* Errors */}
      {(errors.length > 0 || scrapeError || analysisError) && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
            {scrapeError && <li>{scrapeError}</li>}
            {analysisError && <li>{analysisError}</li>}
          </ul>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isScraping || isAnalyzing}
        className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isScraping || isAnalyzing ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          'Analyze Job & Generate Documents'
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        All data is stored locally in your browser. No data is sent to third-party servers except for AI processing.
      </p>
    </form>
  );
}
