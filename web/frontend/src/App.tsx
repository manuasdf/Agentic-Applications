import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppState, initializeStorage } from '@/hooks/useIndexedDBStorage';

// Pages
import HomePage from '@/pages/Home';
import AnalysisPage from '@/pages/Analysis';
import ReviewPage from '@/pages/Review';
import SettingsPage from '@/pages/Settings';

// Components
import NavBar from '@/components/NavBar';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const { error } = useAppState();

  // Initialize storage (IndexedDB) and check backend
  useEffect(() => {
    async function initialize() {
      try {
        // Initialize IndexedDB and migrate from localStorage
        await initializeStorage();
        
        // For now, just set loading to false
        setTimeout(() => setIsLoading(false), 500);
      } catch {
        setIsLoading(false);
      }
    }
    initialize();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AutoCV...</p>
        </div>
      </div>
    );
  }

  // If there's an error loading storage, show a message
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-600">
          <p className="text-lg mb-4">Error loading app data: {error.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        
        <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/analyze" element={<AnalysisPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="bg-white border-t border-gray-200 py-4">
          <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
            <p>AutoCV - AI-Powered Resume Generator | All data stored locally in your browser</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
