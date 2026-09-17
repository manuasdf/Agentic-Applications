import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAI } from '@/hooks/useAI';
import { useAppState } from '@/hooks/useIndexedDBStorage';
import { compileLatexRaw } from '@/services/api';
import DocumentCard from '@/components/DocumentCard';
import { loadDocumentsByJob, isIndexedDBAvailable, StoredDocument } from '@/services/indexedDB';

export default function ReviewPage() {
  const navigate = useNavigate();
  const { jobs } = useAppState();
  const {
    analysis,
    cvLatex,
    coverLetterLatex,
    emailContent,
    cvPdfBase64,
    coverLetterPdfBase64,
    jobUrl,
    reset,
  } = useAI();

  const [pdfBlobUrls, setPdfBlobUrls] = useState({
    cv: null as string | null,
    cover_letter: null as string | null,
  });
  
  // Documents loaded from IndexedDB
  const [storedDocuments, setStoredDocuments] = useState<StoredDocument[]>([]);
  const [isCompiling, setIsCompiling] = useState({
    cv: false,
    cover_letter: false,
  });
  const [compileErrors, setCompileErrors] = useState({
    cv: null as string | null,
    cover_letter: null as string | null,
  });

  // Load documents from IndexedDB on mount
  useEffect(() => {
    if (!isIndexedDBAvailable() || jobs.length === 0) return;
    
    // Get the most recent job
    const mostRecentJob = jobs[jobs.length - 1];
    if (!mostRecentJob) return;
    
    loadDocumentsByJob(mostRecentJob.id)
      .then(docs => setStoredDocuments(docs))
      .catch(e => console.error('Failed to load documents in Review:', e));
  }, [jobs]);

  // Convert base64 PDFs to blob URLs on mount
  // Combine from useAI state and IndexedDB stored documents
  useEffect(() => {
    const urls: any = {};
    
    // Check useAI state first
    if (cvPdfBase64) {
      try {
        const binaryString = atob(cvPdfBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        urls.cv = URL.createObjectURL(blob);
      } catch (e) {
        console.error('Error converting CV PDF:', e);
      }
    }
    
    // Also check stored documents from IndexedDB
    if (!urls.cv) {
      const cvDoc = storedDocuments.find(d => d.documentType === 'cv' && d.pdfBase64);
      if (cvDoc?.pdfBase64) {
        try {
          const binaryString = atob(cvDoc.pdfBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          urls.cv = URL.createObjectURL(blob);
        } catch (e) {
          console.error('Error converting CV PDF from IndexedDB:', e);
        }
      }
    }

    if (coverLetterPdfBase64) {
      try {
        const binaryString = atob(coverLetterPdfBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        urls.cover_letter = URL.createObjectURL(blob);
      } catch (e) {
        console.error('Error converting Cover Letter PDF:', e);
      }
    }
    
    // Also check stored documents from IndexedDB
    if (!urls.cover_letter) {
      const clDoc = storedDocuments.find(d => d.documentType === 'cover_letter' && d.pdfBase64);
      if (clDoc?.pdfBase64) {
        try {
          const binaryString = atob(clDoc.pdfBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          urls.cover_letter = URL.createObjectURL(blob);
        } catch (e) {
          console.error('Error converting Cover Letter PDF from IndexedDB:', e);
        }
      }
    }

    setPdfBlobUrls(urls);

    return () => {
      if (urls.cv) URL.revokeObjectURL(urls.cv);
      if (urls.cover_letter) URL.revokeObjectURL(urls.cover_letter);
    };
  }, [cvPdfBase64, coverLetterPdfBase64, storedDocuments]);



  // Compile a document
  const handleCompile = useCallback(async (docType: 'cv' | 'cover_letter') => {
    const latex = docType === 'cv' 
      ? cvLatex || storedDocuments.find(d => d.documentType === 'cv')?.latex
      : coverLetterLatex || storedDocuments.find(d => d.documentType === 'cover_letter')?.latex;
    if (!latex) return;

    setIsCompiling(prev => ({ ...prev, [docType]: true }));
    setCompileErrors(prev => ({ ...prev, [docType]: null }));

    try {
      const blob = await compileLatexRaw({ latex });
      const url = URL.createObjectURL(blob);
      setPdfBlobUrls(prev => ({ ...prev, [docType]: url }));
    } catch (e) {
      setCompileErrors(prev => ({
        ...prev,
        [docType]: e instanceof Error ? e.message : 'Failed to compile PDF'
      }));
    } finally {
      setIsCompiling(prev => ({ ...prev, [docType]: false }));
    }
  }, [cvLatex, coverLetterLatex]);

  // Navigate to home if no documents (check both useAI state and IndexedDB)
  const hasDocuments = cvLatex || coverLetterLatex || emailContent || 
                      cvPdfBase64 || coverLetterPdfBase64 || 
                      storedDocuments.length > 0;
  
  if (!hasDocuments) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Documents to Review</h2>
        <p className="text-gray-600 mb-6">Generate documents first by analyzing a job posting.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Document Review</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              reset();
              navigate('/');
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            New Analysis
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Job Info */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Job Information</h3>
            
            {jobUrl && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">URL</p>
                <a
                  href={jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm break-all"
                >
                  {jobUrl}
                </a>
              </div>
            )}
            
            {analysis?.job_title && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-500">Position</p>
                <p className="font-medium">{analysis.job_title}</p>
              </div>
            )}
            
            {analysis?.company && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-500">Company</p>
                <p className="font-medium">{analysis.company}</p>
              </div>
            )}
          </div>

          {/* Document Status */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Generated Documents</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-gray-700">CV</span>
                </div>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  cvLatex || cvPdfBase64 || pdfBlobUrls.cv || storedDocuments.some(d => d.documentType === 'cv' && (d.latex || d.pdfBase64))
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {cvLatex || cvPdfBase64 || pdfBlobUrls.cv || storedDocuments.some(d => d.documentType === 'cv' && (d.latex || d.pdfBase64)) ? 'Ready' : 'Not generated'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12h.01M11 12h.01M15 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-700">Cover Letter</span>
                </div>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  coverLetterLatex || coverLetterPdfBase64 || pdfBlobUrls.cover_letter || storedDocuments.some(d => d.documentType === 'cover_letter' && (d.latex || d.pdfBase64))
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {coverLetterLatex || coverLetterPdfBase64 || pdfBlobUrls.cover_letter || storedDocuments.some(d => d.documentType === 'cover_letter' && (d.latex || d.pdfBase64)) ? 'Ready' : 'Not generated'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-700">Email</span>
                </div>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  emailContent || storedDocuments.some(d => d.documentType === 'email' && d.content)
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {emailContent || storedDocuments.some(d => d.documentType === 'email' && d.content) ? 'Ready' : 'Not generated'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CV Document */}
      {(cvLatex || cvPdfBase64 || pdfBlobUrls.cv || storedDocuments.some(d => d.documentType === 'cv' && (d.latex || d.pdfBase64))) && (
        <DocumentCard
          title="CV"
          latex={cvLatex || storedDocuments.find(d => d.documentType === 'cv')?.latex}
          pdfBase64={cvPdfBase64 || storedDocuments.find(d => d.documentType === 'cv')?.pdfBase64}
          isLoading={isCompiling.cv}
          error={compileErrors.cv || undefined}
          onCompile={() => handleCompile('cv')}
        />
      )}

      {/* Cover Letter Document */}
      {(coverLetterLatex || coverLetterPdfBase64 || pdfBlobUrls.cover_letter || storedDocuments.some(d => d.documentType === 'cover_letter' && (d.latex || d.pdfBase64))) && (
        <DocumentCard
          title="Cover Letter"
          latex={coverLetterLatex || storedDocuments.find(d => d.documentType === 'cover_letter')?.latex}
          pdfBase64={coverLetterPdfBase64 || storedDocuments.find(d => d.documentType === 'cover_letter')?.pdfBase64}
          isLoading={isCompiling.cover_letter}
          error={compileErrors.cover_letter || undefined}
          onCompile={() => handleCompile('cover_letter')}
        />
      )}

      {/* Email Content */}
      {emailContent || storedDocuments.some(d => d.documentType === 'email' && d.content) && (
        <DocumentCard
          title="Email Draft"
          content={emailContent || storedDocuments.find(d => d.documentType === 'email')?.content}
        />
      )}

      {/* Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/analyze')}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit & Regenerate
          </button>

          <button
            onClick={() => {
              reset();
              navigate('/');
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1V10a1 1 0 011-1h2a1 1 0 011 1v3a1 1 0 001 1m-6 0h6" />
            </svg>
            Start New Analysis
          </button>

          {(cvLatex || coverLetterLatex || pdfBlobUrls.cv || pdfBlobUrls.cover_letter) && (
            <button
              onClick={() => {
                // Download all as zip or individually
                window.print();
              }}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download All
            </button>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">Tips</h3>
        <ul className="space-y-2 text-blue-700 text-sm">
          <li>Review each document carefully before using it.</li>
          <li>You can edit the LaTeX source directly if needed.</li>
          <li>Click "Compile to PDF" to generate a PDF version if it hasn't been compiled yet.</li>
          <li>All documents are stored in your browser's local storage for this session.</li>
        </ul>
      </div>
    </div>
  );
}
