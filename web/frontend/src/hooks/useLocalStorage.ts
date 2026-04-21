import { useState, useEffect, useCallback } from 'react';
import { AppSettings, CandidateProfile, JobPosting, GenerationJob } from '@/types';

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  default_provider: 'mistral',
  default_model: 'mistral-large-latest',
  api_keys: {},
  output_dir: 'output',
  generate_cv: true,
  generate_cover_letter: true,
  generate_email: false,
  babel_language: 'english',
};

// Storage keys
export const STORAGE_KEYS = {
  SETTINGS: 'autocv_settings',
  PROFILES: 'autocv_profiles',
  JOBS: 'autocv_jobs',
  GENERATIONS: 'autocv_generations',
} as const;

// Load from localStorage with type safety
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  const stored = localStorage.getItem(key);
  if (!stored) return defaultValue;
  try {
    return JSON.parse(stored) as T;
  } catch {
    return defaultValue;
  }
}

// Save to localStorage
export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save to localStorage: ${e}`);
  }
}

// Custom hook for settings
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadFromStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
  );

  const updateSettings = useCallback((updater: (prev: AppSettings) => AppSettings) => {
    setSettings(prev => {
      const newSettings = updater(prev);
      saveToStorage(STORAGE_KEYS.SETTINGS, newSettings);
      return newSettings;
    });
  }, []);

  return { settings, updateSettings };
}

// Custom hook for candidate profiles
export function useCandidateProfiles() {
  const [profiles, setProfiles] = useState<CandidateProfile[]>(() =>
    loadFromStorage(STORAGE_KEYS.PROFILES, [])
  );

  const addProfile = useCallback((profile: Omit<CandidateProfile, 'id' | 'created_at' | 'updated_at'>) => {
    setProfiles(prev => {
      const newProfile: CandidateProfile = {
        ...profile,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const newProfiles = [...prev, newProfile];
      saveToStorage(STORAGE_KEYS.PROFILES, newProfiles);
      return newProfiles;
    });
  }, []);

  const updateProfile = useCallback((id: string, updates: Partial<CandidateProfile>) => {
    setProfiles(prev => {
      const newProfiles = prev.map(p =>
        p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
      );
      saveToStorage(STORAGE_KEYS.PROFILES, newProfiles);
      return newProfiles;
    });
  }, []);

  const deleteProfile = useCallback((id: string) => {
    setProfiles(prev => {
      const newProfiles = prev.filter(p => p.id !== id);
      saveToStorage(STORAGE_KEYS.PROFILES, newProfiles);
      return newProfiles;
    });
  }, []);

  return { profiles, addProfile, updateProfile, deleteProfile };
}

// Custom hook for jobs
export function useJobs() {
  const [jobs, setJobs] = useState<JobPosting[]>(() =>
    loadFromStorage(STORAGE_KEYS.JOBS, [])
  );

  const addJob = useCallback((job: Omit<JobPosting, 'id' | 'created_at'>) => {
    setJobs(prev => {
      const newJob: JobPosting = {
        ...job,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
      };
      const newJobs = [...prev, newJob];
      saveToStorage(STORAGE_KEYS.JOBS, newJobs);
      return newJobs;
    });
    return Date.now().toString(); // Return the new job ID
  }, []);

  const updateJob = useCallback((id: string, updates: Partial<JobPosting>) => {
    setJobs(prev => {
      const newJobs = prev.map(j =>
        j.id === id ? { ...j, ...updates } : j
      );
      saveToStorage(STORAGE_KEYS.JOBS, newJobs);
      return newJobs;
    });
  }, []);

  const deleteJob = useCallback((id: string) => {
    setJobs(prev => {
      const newJobs = prev.filter(j => j.id !== id);
      saveToStorage(STORAGE_KEYS.JOBS, newJobs);
      return newJobs;
    });
  }, []);

  const getJobById = useCallback((id: string) => {
    return jobs.find(j => j.id === id);
  }, [jobs]);

  return { jobs, addJob, updateJob, deleteJob, getJobById };
}

// Custom hook for generations
export function useGenerations() {
  const [generations, setGenerations] = useState<GenerationJob[]>(() =>
    loadFromStorage(STORAGE_KEYS.GENERATIONS, [])
  );

  const addGeneration = useCallback((generation: Omit<GenerationJob, 'id' | 'created_at'>) => {
    setGenerations(prev => {
      const newGeneration: GenerationJob = {
        ...generation,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
      };
      const newGenerations = [...prev, newGeneration];
      saveToStorage(STORAGE_KEYS.GENERATIONS, newGenerations);
      return newGenerations;
    });
    return Date.now().toString();
  }, []);

  const updateGeneration = useCallback((id: string, updates: Partial<GenerationJob>) => {
    setGenerations(prev => {
      const newGenerations = prev.map(g =>
        g.id === id ? { ...g, ...updates } : g
      );
      saveToStorage(STORAGE_KEYS.GENERATIONS, newGenerations);
      return newGenerations;
    });
  }, []);

  const deleteGeneration = useCallback((id: string) => {
    setGenerations(prev => {
      const newGenerations = prev.filter(g => g.id !== id);
      saveToStorage(STORAGE_KEYS.GENERATIONS, newGenerations);
      return newGenerations;
    });
  }, []);

  const getGenerationById = useCallback((id: string) => {
    return generations.find(g => g.id === id);
  }, [generations]);

  return { generations, addGeneration, updateGeneration, deleteGeneration, getGenerationById };
}

// Combined hook for all app state
export function useAppState() {
  const { settings, updateSettings } = useSettings();
  const { profiles, addProfile, updateProfile, deleteProfile } = useCandidateProfiles();
  const { jobs, addJob, updateJob, deleteJob, getJobById } = useJobs();
  const { generations, addGeneration, updateGeneration, deleteGeneration, getGenerationById } = useGenerations();

  return {
    settings,
    updateSettings,
    profiles,
    addProfile,
    updateProfile,
    deleteProfile,
    jobs,
    addJob,
    updateJob,
    deleteJob,
    getJobById,
    generations,
    addGeneration,
    updateGeneration,
    deleteGeneration,
    getGenerationById,
  };
}
