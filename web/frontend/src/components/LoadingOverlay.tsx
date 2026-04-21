import { useAI } from '@/hooks/useAI';

export default function LoadingOverlay() {
  const { isGenerating, currentStep, progress, isScraping, isAnalyzing } = useAI();

  const isLoading = isGenerating || isScraping || isAnalyzing;

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 shadow-xl max-w-md w-full mx-4">
        <div className="space-y-4">
          {/* Spinner */}
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>

          {/* Status */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              {isScraping && 'Fetching Job Posting...'}
              {isAnalyzing && 'Analyzing Job Requirements...'}
              {isGenerating && `Generating ${currentStep.replace('_', ' ')}...`}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              This may take a moment
            </p>
          </div>

          {/* Progress bar */}
          {isGenerating && (
            <div className="pt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Progress: {Math.round(progress)}%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
