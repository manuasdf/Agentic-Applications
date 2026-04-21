import { useState, useEffect } from 'react';
import JobForm from '@/components/JobForm';
import { useAppState } from '@/hooks/useLocalStorage';
import { useAI } from '@/hooks/useAI';
import { JobAnalysis, CandidateProfile } from '@/types';

export default function HomePage() {
  const { addJob, profiles, addProfile } = useAppState();
  const { reset } = useAI();
  const [recentJobs, setRecentJobs] = useState<{ url: string; title?: string; date: string }[]>([]);

  // Reset AI state on mount
  useEffect(() => {
    reset();
  }, [reset]);

  // Load recent jobs from storage
  useEffect(() => {
    const jobs = localStorage.getItem('autocv_jobs');
    if (jobs) {
      try {
        const parsed = JSON.parse(jobs);
        const recent = parsed
          .slice(-5)
          .reverse()
          .map((j: any) => ({
            url: j.url,
            title: j.analysis?.job_title || j.url,
            date: new Date(j.created_at).toLocaleDateString(),
          }));
        setRecentJobs(recent);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Check if we have a default profile
  const hasDefaultProfile = profiles.length > 0;

  const handleSubmit = ({ url, profile }: { url: string; profile: string }) => {
    // Store the job
    addJob({
      url,
      title: url,
      text: '',
    });
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          AutoCV
        </h1>
        <p className="text-lg text-gray-600">
          Generate tailored CVs and Cover Letters with AI
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Get Started</h2>
            <p className="text-gray-600">
              Paste a job posting URL below and select your candidate profile.
              Our AI will analyze the job and generate tailored documents for you.
            </p>
          </div>

          <JobForm onSubmit={handleSubmit} />
        </div>

        {/* Quick start tips */}
        {!hasDefaultProfile && (
          <div className="mt-6 p-6 bg-blue-50 rounded-xl border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">Quick Start</h3>
            <p className="text-blue-700 text-sm">
              Create your candidate profile above. This should include your:
            </p>
            <ul className="mt-2 text-blue-700 text-sm space-y-1 list-disc list-inside">
              <li>Name and contact information</li>
              <li>Work experience</li>
              <li>Education</li>
              <li>Skills and qualifications</li>
              <li>Any other relevant information</li>
            </ul>
            <p className="mt-2 text-blue-700 text-sm">
              The more detailed your profile, the better your generated documents will be!
            </p>
          </div>
        )}

        {/* Recent jobs */}
        {recentJobs.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Jobs</h3>
            <div className="space-y-3">
              {recentJobs.map((job, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div>
                    <p className="font-medium text-gray-900 truncate">{job.title}</p>
                    <p className="text-sm text-gray-500">{job.date}</p>
                  </div>
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                  >
                    View
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Feature overview */}
      <div className="mt-12 grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Intelligent Analysis</h3>
          <p className="text-gray-600 text-sm">
            Our AI extracts key requirements, skills, and qualifications from job postings
            and matches them against your profile.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Tailored Documents</h3>
          <p className="text-gray-600 text-sm">
            Generate custom CVs, Cover Letters, and emails specifically adapted to each
            job you apply for.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Privacy First</h3>
          <p className="text-gray-600 text-sm">
            All your data stays in your browser. We never store your information
            on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
