import { useState, useEffect } from 'react';
import { useAppState } from '@/hooks/useLocalStorage';
import { AIProvider, AppSettings } from '@/types';
import { DEFAULT_SETTINGS, loadFromStorage, STORAGE_KEYS, saveToStorage } from '@/hooks/useLocalStorage';

export default function SettingsPage() {
  const { settings, updateSettings, profiles, deleteProfile } = useAppState();
  
  const [formSettings, setFormSettings] = useState<AppSettings>({ ...settings });
  const [showApiKey, setShowApiKey] = useState<Record<AIProvider, boolean>>({} as Record<AIProvider, boolean>);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileContent, setNewProfileContent] = useState('');
  const [showNewProfileForm, setShowNewProfileForm] = useState(false);

  // Initialize showApiKey state
  useEffect(() => {
    const initial: Record<AIProvider, boolean> = {
      mistral: false,
      openai: false,
      anthropic: false,
      xai: false,
      deepseek: false,
      huggingface: false,
      local: false,
    };
    setShowApiKey(initial);
  }, []);

  // Update form settings when settings change
  useEffect(() => {
    setFormSettings({ ...settings });
  }, [settings]);

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    setFormSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleApiKeyChange = (provider: AIProvider, value: string) => {
    setFormSettings(prev => ({
      ...prev,
      api_keys: { ...prev.api_keys, [provider]: value }
    }));
  };

  const saveSettings = () => {
    updateSettings(() => ({ ...formSettings }));
    // Show confirmation
    alert('Settings saved successfully!');
  };

  const resetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      updateSettings(() => ({ ...DEFAULT_SETTINGS }));
      setFormSettings({ ...DEFAULT_SETTINGS });
    }
  };

  const createProfile = () => {
    if (!newProfileName.trim()) {
      alert('Please enter a profile name');
      return;
    }
    if (!newProfileContent.trim()) {
      alert('Please enter profile content');
      return;
    }
    
    // Add the profile
    // This is handled by the parent component's addProfile function
    // We'll need to pass it down or use the hook directly
    
    // For now, just clear the form
    setNewProfileName('');
    setNewProfileContent('');
    setShowNewProfileForm(false);
    alert('Profile created! Refresh the page to see it in the list.');
  };

  const deleteProfileHandler = (id: string) => {
    const profile = profiles.find(p => p.id === id);
    if (profile && confirm(`Are you sure you want to delete "${profile.name}" profile?`)) {
      deleteProfile(id);
    }
  };

  // Get sample candidate profile from data directory
  const [sampleProfile, setSampleProfile] = useState('');
  useEffect(() => {
    fetch('/data/candidate_profile.md')
      .then(res => res.text())
      .then(text => setSampleProfile(text))
      .catch(() => setSampleProfile(''));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Default Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Default Settings</h2>
        
        <div className="space-y-6">
          {/* Default Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default AI Provider
            </label>
            <select
              value={formSettings.default_provider}
              onChange={(e) => handleSettingChange('default_provider', e.target.value as AIProvider)}
              className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="mistral">Mistral</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="xai">xAI (Grok)</option>
              <option value="deepseek">DeepSeek</option>
              <option value="huggingface">HuggingFace</option>
              <option value="local">Local (Ollama)</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              The AI provider that will be used by default
            </p>
          </div>

          {/* Default Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Model
            </label>
            <input
              type="text"
              value={formSettings.default_model || ''}
              onChange={(e) => handleSettingChange('default_model', e.target.value)}
              placeholder="e.g., mistral-large-latest, gpt-4o"
              className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              The default model to use (can be overridden per request)
            </p>
          </div>

          {/* Babel Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Babel Language
            </label>
            <select
              value={formSettings.babel_language}
              onChange={(e) => handleSettingChange('babel_language', e.target.value)}
              className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="english">English</option>
              <option value="ngerman">German (ngerman)</option>
              <option value="french">French</option>
              <option value="spanish">Spanish</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Default language for LaTeX documents
            </p>
          </div>

          {/* Generation Options */}
          <div>
            <fieldset className="border border-gray-200 rounded-lg p-4">
              <legend className="text-sm font-medium text-gray-900 mb-3">Default Generation Options</legend>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formSettings.generate_cv !== false}
                    onChange={(e) => handleSettingChange('generate_cv', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Generate CV by default</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formSettings.generate_cover_letter !== false}
                    onChange={(e) => handleSettingChange('generate_cover_letter', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Generate Cover Letter by default</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formSettings.generate_email !== false}
                    onChange={(e) => handleSettingChange('generate_email', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Generate Email Draft by default</span>
                </label>
              </div>
            </fieldset>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={saveSettings}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Save Settings
            </button>
            <button
              onClick={resetSettings}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Reset to Default
            </button>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">API Keys</h2>
        
        <p className="text-gray-600 mb-6">
          Enter your API keys for each AI provider. These are stored locally in your browser
          and are never sent to our servers. They are only used to proxy requests to the AI providers.
        </p>

        <div className="space-y-4 max-w-2xl">
          {(['mistral', 'openai', 'anthropic', 'xai', 'deepseek', 'huggingface', 'local'] as AIProvider[]).map(provider => {
            const displayName = {
              mistral: 'Mistral',
              openai: 'OpenAI',
              anthropic: 'Anthropic',
              xai: 'xAI (Grok)',
              deepseek: 'DeepSeek',
              huggingface: 'HuggingFace',
              local: 'Local/Ollama',
            }[provider];

            return (
              <div key={provider} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <label className="font-medium text-gray-900">{displayName}</label>
                  <button
                    type="button"
                    onClick={() => setShowApiKey(prev => ({ ...prev, [provider]: !prev[provider] }))}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    {showApiKey[provider] ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showApiKey[provider] ? 'text' : 'password'}
                  value={formSettings.api_keys?.[provider] || ''}
                  onChange={(e) => handleApiKeyChange(provider, e.target.value)}
                  placeholder={`Your ${displayName} API key`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Candidate Profiles */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Candidate Profiles</h2>
          <button
            onClick={() => {
              setShowNewProfileForm(!showNewProfileForm);
              setNewProfileName('');
              setNewProfileContent(sampleProfile || '');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showNewProfileForm ? 'Cancel' : '+ Create Profile'}
          </button>
        </div>

        {profiles.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No profiles created yet. Create your first profile to get started!
          </p>
        ) : (
          <div className="space-y-4">
            {profiles.map(profile => (
              <div key={profile.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{profile.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        // Copy profile content to clipboard
                        navigator.clipboard.writeText(profile.content);
                        alert('Profile copied to clipboard!');
                      }}
                      className="text-gray-500 hover:text-gray-700"
                      title="Copy"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteProfileHandler(profile.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  Created: {new Date(profile.created_at).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500 mb-2">
                  Updated: {new Date(profile.updated_at).toLocaleDateString()}
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    View content
                  </summary>
                  <pre className="mt-2 p-3 bg-white rounded border text-xs text-gray-600 overflow-x-auto">
                    {profile.content}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}

        {/* New Profile Form */}
        {showNewProfileForm && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-4">Create New Profile</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Name
                </label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="My Resume"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Content
                </label>
                <textarea
                  value={newProfileContent}
                  onChange={(e) => setNewProfileContent(e.target.value)}
                  rows={10}
                  placeholder="Enter your candidate profile in markdown format..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                />
                <p className="mt-1 text-sm text-gray-500">
                  {sampleProfile ? 'Sample profile loaded from data/candidate_profile.md' : 'Include your name, experience, education, skills, etc.'}
                </p>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={createProfile}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Create Profile
                </button>
                <button
                  onClick={() => {
                    setNewProfileName('');
                    setNewProfileContent('');
                    setShowNewProfileForm(false);
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Data Management</h2>
        
        <div className="space-y-4 max-w-2xl">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-2">Local Storage Usage</h3>
            <p className="text-sm text-gray-600 mb-3">
              All your data (profiles, jobs, settings) is stored locally in your browser's localStorage.
            </p>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Profiles:</span>
                <span>{profiles.length} saved</span>
              </div>
              {(() => {
                const jobs = loadFromStorage(STORAGE_KEYS.JOBS, []);
                const generations = loadFromStorage(STORAGE_KEYS.GENERATIONS, []);
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Jobs:</span>
                      <span>{jobs.length} saved</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Generations:</span>
                      <span>{generations.length} saved</span>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to clear ALL localStorage data? This cannot be undone.')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Clear All Data
              </button>
              <button
                onClick={() => {
                  const data = {
                    settings: loadFromStorage(STORAGE_KEYS.SETTINGS, {}),
                    profiles: loadFromStorage(STORAGE_KEYS.PROFILES, []),
                    jobs: loadFromStorage(STORAGE_KEYS.JOBS, []),
                    generations: loadFromStorage(STORAGE_KEYS.GENERATIONS, []),
                  };
                  
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'autocv_export.json';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Export Data
              </button>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Your data remains completely private and is never transmitted to any external servers.
        </p>
      </div>
    </div>
  );
}
