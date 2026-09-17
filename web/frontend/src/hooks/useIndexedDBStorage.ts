import { useState, useEffect, useCallback } from 'react';
import { AppSettings, CandidateProfile, JobPosting, GenerationJob } from '@/types';
import {
  loadFromIndexedDB,
  saveToIndexedDB,
  isIndexedDBAvailable,
  type StorageKey
} from '@/services/indexedDB';
import { loadFromStorage, saveToStorage, STORAGE_KEYS, DEFAULT_SETTINGS } from './useLocalStorage';

// Helper to get the IndexedDB storage key from our STORAGE_KEYS
function getStorageKey(key: typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]): StorageKey {
  return key as StorageKey;
}

// Custom hook for settings with IndexedDB support
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load settings on mount
  useEffect(() => {
    async function load() {
      try {
        if (isIndexedDBAvailable()) {
          const data = await loadFromIndexedDB(
            getStorageKey(STORAGE_KEYS.SETTINGS),
            DEFAULT_SETTINGS
          );
          setSettings(data);
        } else {
          // Fallback to localStorage
          const data = loadFromStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
          setSettings(data);
        }
        setIsLoaded(true);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        // Fallback to localStorage
        const data = loadFromStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
        setSettings(data);
        setIsLoaded(true);
      }
    }
    load();
  }, []);

  const updateSettings = useCallback((updater: (prev: AppSettings) => AppSettings) => {
    setSettings(prev => {
      const newSettings = updater(prev);
      
      // Save to both IndexedDB and localStorage for compatibility
      if (isIndexedDBAvailable()) {
        saveToIndexedDB(getStorageKey(STORAGE_KEYS.SETTINGS), newSettings)
          .catch(e => console.error('Failed to save to IndexedDB:', e));
      }
      
      // Also save to localStorage as fallback
      saveToStorage(STORAGE_KEYS.SETTINGS, newSettings);
      
      return newSettings;
    });
  }, []);

  return { settings, updateSettings, isLoaded, error };
}

// Custom hook for candidate profiles with IndexedDB support
export function useCandidateProfiles() {
  const [profiles, setProfiles] = useState<CandidateProfile[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load profiles on mount
  useEffect(() => {
    async function load() {
      try {
        if (isIndexedDBAvailable()) {
          const data = await loadFromIndexedDB<CandidateProfile[]>(
            getStorageKey(STORAGE_KEYS.PROFILES),
            []
          );
          setProfiles(data);
        } else {
          const data = loadFromStorage(STORAGE_KEYS.PROFILES, []);
          setProfiles(data);
        }
        setIsLoaded(true);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        const data = loadFromStorage(STORAGE_KEYS.PROFILES, []);
        setProfiles(data);
        setIsLoaded(true);
      }
    }
    load();
  }, []);

  const addProfile = useCallback((profile: Omit<CandidateProfile, 'id' | 'created_at' | 'updated_at'>) => {
    setProfiles(prev => {
      const newProfile: CandidateProfile = {
        ...profile,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const newProfiles = [...prev, newProfile];
      
      if (isIndexedDBAvailable()) {
        saveToIndexedDB(getStorageKey(STORAGE_KEYS.PROFILES), newProfiles)
          .catch(e => console.error('Failed to save to IndexedDB:', e));
      }
      
      saveToStorage(STORAGE_KEYS.PROFILES, newProfiles);
      return newProfiles;
    });
  }, []);

  const updateProfile = useCallback((id: string, updates: Partial<CandidateProfile>) => {
    setProfiles(prev => {
      const newProfiles = prev.map(p =>
        p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
      );
      
      if (isIndexedDBAvailable()) {
        saveToIndexedDB(getStorageKey(STORAGE_KEYS.PROFILES), newProfiles)
          .catch(e => console.error('Failed to save to IndexedDB:', e));
      }
      
      saveToStorage(STORAGE_KEYS.PROFILES, newProfiles);
      return newProfiles;
    });
  }, []);

  const deleteProfile = useCallback((id: string) => {
    setProfiles(prev => {
      const newProfiles = prev.filter(p => p.id !== id);
      
      if (isIndexedDBAvailable()) {
        saveToIndexedDB(getStorageKey(STORAGE_KEYS.PROFILES), newProfiles)
          .catch(e => console.error('Failed to save to IndexedDB:', e));
      }
      
      saveToStorage(STORAGE_KEYS.PROFILES, newProfiles);
      return newProfiles;
    });
  }, []);

  return { profiles, addProfile, updateProfile, deleteProfile, isLoaded, error };
}

// Custom hook for jobs with IndexedDB support
export function useJobs() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load jobs on mount
  useEffect(() => {
    async function load() {
      try {
        if (isIndexedDBAvailable()) {
          const data = await loadFromIndexedDB<JobPosting[]>(
            getStorageKey(STORAGE_KEYS.JOBS),
            []
          );
          setJobs(data);
        } else {
          const data = loadFromStorage(STORAGE_KEYS.JOBS, []);
          setJobs(data);
        }
        setIsLoaded(true);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        const data = loadFromStorage(STORAGE_KEYS.JOBS, []);
        setJobs(data);
        setIsLoaded(true);
      }
    }
    load();
  }, []);

  const addJob = useCallback((job: Omit<JobPosting, 'id' | 'created_at'>) => {
    const newJobId = Date.now().toString();
    setJobs(prev => {
      const newJob: JobPosting = {
        ...job,
        id: newJobId,
        created_at: new Date().toISOString(),
      };
      const newJobs = [...prev, newJob];
      
      if (isIndexedDBAvailable()) {
        saveToIndexedDB(getStorageKey(STORAGE_KEYS.JOBS), newJobs)
          .catch(e => console.error('Failed to save to IndexedDB:', e));
      }
      
      saveToStorage(STORAGE_KEYS.JOBS, newJobs);
      return newJobs;
    });
    return newJobId;
  }, []);

  const updateJob = useCallback((id: string, updates: Partial<JobPosting>) => {
    setJobs(prev => {
      const newJobs = prev.map(j =>
        j.id === id ? { ...j, ...updates } : j
      );
      
      if (isIndexedDBAvailable()) {
        saveToIndexedDB(getStorageKey(STORAGE_KEYS.JOBS), newJobs)
          .catch(e => console.error('Failed to save to IndexedDB:', e));
      }
      
      saveToStorage(STORAGE_KEYS.JOBS, newJobs);
      return newJobs;
    });
  }, []);

  const deleteJob = useCallback((id: string) => {
    setJobs(prev => {
      const newJobs = prev.filter(j => j.id !== id);
      
      if (isIndexedDBAvailable()) {
        saveToIndexedDB(getStorageKey(STORAGE_KEYS.JOBS), newJobs)
          .catch(e => console.error('Failed to save to IndexedDB:', e));
      }
      
      saveToStorage(STORAGE_KEYS.JOBS, newJobs);
      return newJobs;
    });
  }, []);

  const getJobById = useCallback((id: string) => {
    return jobs.find(j => j.id === id);
  }, [jobs]);

  return { jobs, addJob, updateJob, deleteJob, getJobById, isLoaded, error };
}

// Custom hook for generations with IndexedDB support
export function useGenerations() {
  const [generations, setGenerations] = useState<GenerationJob[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load generations on mount
  useEffect(() => {
    async function load() {
      try {
        if (isIndexedDBAvailable()) {
          const data = await loadFromIndexedDB<GenerationJob[]>(
            getStorageKey(STORAGE_KEYS.GENERATIONS),
            []
          );
          setGenerations(data);
        } else {
          const data = loadFromStorage(STORAGE_KEYS.GENERATIONS, []);
          setGenerations(data);
        }
        setIsLoaded(true);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        const data = loadFromStorage(STORAGE_KEYS.GENERATIONS, []);
        setGenerations(data);
        setIsLoaded(true);
      }
    }
    load();
  }, []);

  const addGeneration = useCallback((generation: Omit<GenerationJob, 'id' | 'created_at'>) => {
    const newGenerationId = Date.now().toString();
    setGenerations(prev => {
      const newGeneration: GenerationJob = {
        ...generation,
        id: newGenerationId,
        created_at: new Date().toISOString(),
      };
      const newGenerations = [...prev, newGeneration];
      
      if (isIndexedDBAvailable()) {
        saveToIndexedDB(getStorageKey(STORAGE_KEYS.GENERATIONS), newGenerations)
          .catch(e => console.error('Failed to save to IndexedDB:', e));
      }
      
      saveToStorage(STORAGE_KEYS.GENERATIONS, newGenerations);
      return newGenerations;
    });
    return newGenerationId;
  }, []);

  const updateGeneration = useCallback((id: string, updates: Partial<GenerationJob>) => {
    setGenerations(prev => {
      const newGenerations = prev.map(g =>
        g.id === id ? { ...g, ...updates } : g
      );
      
      if (isIndexedDBAvailable()) {
        saveToIndexedDB(getStorageKey(STORAGE_KEYS.GENERATIONS), newGenerations)
          .catch(e => console.error('Failed to save to IndexedDB:', e));
      }
      
      saveToStorage(STORAGE_KEYS.GENERATIONS, newGenerations);
      return newGenerations;
    });
  }, []);

  const deleteGeneration = useCallback((id: string) => {
    setGenerations(prev => {
      const newGenerations = prev.filter(g => g.id !== id);
      
      if (isIndexedDBAvailable()) {
        saveToIndexedDB(getStorageKey(STORAGE_KEYS.GENERATIONS), newGenerations)
          .catch(e => console.error('Failed to save to IndexedDB:', e));
      }
      
      saveToStorage(STORAGE_KEYS.GENERATIONS, newGenerations);
      return newGenerations;
    });
  }, []);

  const getGenerationById = useCallback((id: string) => {
    return generations.find(g => g.id === id);
  }, [generations]);

  return { generations, addGeneration, updateGeneration, deleteGeneration, getGenerationById, isLoaded, error };
}

// Combined hook for all app state with IndexedDB support
export function useAppState() {
  const { settings, updateSettings, isLoaded: settingsLoaded, error: settingsError } = useSettings();
  const { profiles, addProfile, updateProfile, deleteProfile, isLoaded: profilesLoaded, error: profilesError } = useCandidateProfiles();
  const { jobs, addJob, updateJob, deleteJob, getJobById, isLoaded: jobsLoaded, error: jobsError } = useJobs();
  const { generations, addGeneration, updateGeneration, deleteGeneration, getGenerationById, isLoaded: generationsLoaded, error: generationsError } = useGenerations();

  // Overall loading state - all hooks must be loaded
  const isLoaded = settingsLoaded && profilesLoaded && jobsLoaded && generationsLoaded;
  
  // Collect any errors
  const error = settingsError || profilesError || jobsError || generationsError;

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
    isLoaded,
    error,
  };
}

// Re-export types and constants for compatibility
export { DEFAULT_SETTINGS, STORAGE_KEYS } from './useLocalStorage';
export type { AppSettings, CandidateProfile, JobPosting, GenerationJob };

// Initialize IndexedDB and migrate from localStorage
export { initializeStorage, isIndexedDBAvailable } from '@/services/indexedDB';
