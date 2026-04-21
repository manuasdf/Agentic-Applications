import { useState, useCallback } from 'react';
import { compileLatexRaw } from '@/services/api';

export interface DocumentCardProps {
  title: string;
  latex?: string;
  pdfBase64?: string;
  content?: string; // For email content
  isLoading?: boolean;
  error?: string;
  onCompile?: () => void;
}

export default function DocumentCard({ 
  title, 
  latex, 
  pdfBase64, 
  content, 
  isLoading = false, 
  error,
  onCompile 
}: DocumentCardProps) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);

  // Convert base64 to blob URL
  useState(() => {
    if (pdfBase64) {
      const binaryString = atob(pdfBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    return () => {};
  }, [pdfBase64]);

  // Compile LaTeX to PDF
  const handleCompile = useCallback(async () => {
    if (!latex) return;
    
    setIsCompiling(true);
    setCompileError(null);
    
    try {
      const blob = await compileLatexRaw({ latex });
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      onCompile?.();
    } catch (e) {
      setCompileError(e instanceof Error ? e.message : 'Failed to compile PDF');
    } finally {
      setIsCompiling(false);
    }
  }, [latex, onCompile]);

  // Download PDF
  const handleDownload = useCallback(() => {
    if (pdfBlobUrl) {
      const link = document.createElement('a');
      link.href = pdfBlobUrl;
      link.download = `${title.toLowerCase().replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [pdfBlobUrl, title]);

  // Download LaTeX
  const handleDownloadLatex = useCallback(() => {
    if (latex) {
      const blob = new Blob([latex], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.toLowerCase().replace(/\s+/g, '_')}.tex`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, [latex, title]);

  // Display email content
  if (content && !latex && !pdfBase64) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex space-x-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Download
            </button>
          </div>
        </div>
        
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}
        
        <div className="prose max-w-none">
          <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
            {content}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex space-x-2">
          {latex && !pdfBase64 && !pdfBlobUrl && (
            <button
              onClick={handleCompile}
              disabled={isCompiling}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCompiling ? 'Compiling...' : 'Compile to PDF'}
            </button>
          )}
          {latex && (
            <button
              onClick={handleDownloadLatex}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Download .tex
            </button>
          )}
          {(pdfBase64 || pdfBlobUrl) && (
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Download PDF
            </button>
          )}
        </div>
      </div>

      {/* Error display */}
      {(error || compileError) && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-4">
          {error || compileError}
        </div>
      )}

      {/* Loading state */}
      {isLoading || isCompiling ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">
            {isCompiling ? 'Compiling LaTeX...' : 'Loading...'}
          </span>
        </div>
      ) : null}

      {/* LaTeX source (collapsed by default) */}
      {latex && !pdfBase64 && !pdfBlobUrl ? (
        <div className="mb-4">
          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium cursor-pointer text-gray-700 hover:text-gray-900">
              View LaTeX Source
            </summary>
            <pre className="mt-4 text-xs text-gray-600 overflow-x-auto bg-gray-50 p-3 rounded">
              {latex}
            </pre>
          </details>
        </div>
      ) : null}

      {/* PDF Preview */}
      {(pdfBase64 || pdfBlobUrl) && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <iframe
            src={pdfBlobUrl || `data:application/pdf;base64,${pdfBase64}`}
            className="w-full h-[600px] bg-white"
            title={`${title} PDF Preview`}
          />
        </div>
      )}

      {/* Object fallback for browsers that don't support iframe PDF */}
      {(pdfBase64 || pdfBlobUrl) && (
        <div className="mt-4 text-center">
          <object
            data={pdfBlobUrl || `data:application/pdf;base64,${pdfBase64}`}
            type="application/pdf"
            className="w-full h-[600px]"
          >
            <p className="text-gray-500">
              PDF preview not available. Please {' '}
              <button
                onClick={handleDownload}
                className="text-blue-600 underline"
              >
                download the PDF
              </button>
              {' '} to view it.
            </p>
          </object>
        </div>
      )}
    </div>
  );
}
