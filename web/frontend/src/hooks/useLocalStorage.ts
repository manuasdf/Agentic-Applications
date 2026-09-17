// LocalStorage utility functions for fallback when IndexedDB is unavailable
// This file provides the low-level storage utilities only.
// For the main storage hooks, use useIndexedDBStorage.ts

import { AppSettings, AIProvider } from '@/types';

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  default_provider: 'mistral',
  default_model: 'mistral-large-latest',
  api_keys: {} as Record<AIProvider, string>,
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

// Type-safe load from localStorage
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  const stored = localStorage.getItem(key);
  if (!stored) return defaultValue;
  try {
    return JSON.parse(stored) as T;
  } catch {
    return defaultValue;
  }
}

// Type-safe save to localStorage
export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save to localStorage: ${e}`);
  }
}
