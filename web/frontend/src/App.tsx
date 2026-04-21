import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppState } from '@/hooks/useLocalStorage';

// Pages
import HomePage from '@/pages/Home';
import AnalysisPage from '@/pages/Analysis';
import ReviewPage from '@/pages/Review';
import SettingsPage from '@/pages/Settings';

// Components
import NavBar from '@/components/NavBar';
import LoadingOverlay from '@/components/LoadingOverlay';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const { settings } = useAppState();

  // Initialize app
  useEffect(() => {
    // Check if backend is available
    const checkBackend = async () => {
      try {
        // For now, just set loading to false
        // In production, you might want to check backend health
        setTimeout(() => setIsLoading(false), 500);
      } catch {
        setIsLoading(false);
      }
    };
    checkBackend();
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
