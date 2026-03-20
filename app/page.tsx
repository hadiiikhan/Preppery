'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import PricingModal from '@/components/PricingModal';
import ChromaButton from '@/components/ChromaButton';
import type { ReportData } from '@/lib/analyze';
import '@/components/ChromaGrid.css';

export default function HomePage() {
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const formCardRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setResumeFile(file);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setResumeFile(file);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleCardMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  const handleGenerateResume = async () => {
    if (!resumeFile || !jobDescription.trim()) {
      setError('Please upload a resume and enter a job description first');
      return;
    }

    setIsGeneratingResume(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('jobDescription', jobDescription);

      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch (e) {
          // If response is not JSON, try to get text
          const text = await response.text().catch(() => 'Unknown error');
          throw new Error(`Server error (${response.status}): ${text}`);
        }
        
        const errorMessage = errorData.message || errorData.error || 'Failed to generate resume';
        console.error('Resume generation error:', {
          status: response.status,
          error: errorData,
        });
        throw new Error(errorMessage);
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tailored-resume.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Resume generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate tailored resume';
      setError(errorMessage);
    } finally {
      setIsGeneratingResume(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!resumeFile) {
      setError('Please upload a resume PDF');
      setIsLoading(false);
      return;
    }

    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      setIsLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('jobDescription', jobDescription);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      let data;
      try {
        const text = await response.text();
        if (!text) {
          setError('Server returned empty response. Please check the server logs.');
          setIsLoading(false);
          return;
        }
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error('Failed to parse JSON response:', text);
          setError(`Server returned invalid response: ${text.substring(0, 200)}. Please check the server logs.`);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.error('Failed to read response:', e);
        setError('Failed to read server response. Please check the server logs and your network connection.');
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        console.error('API Error:', data);
        if (data.requiresAuth || response.status === 403) {
          setShowPricingModal(true);
          setRemaining(data.remaining ?? 0);
        } else {
          const errorMsg = data.message || data.error || 'Something went wrong';
          setError(`${errorMsg}${data.details ? `: ${data.details}` : ''}`);
        }
        setIsLoading(false);
        return;
      }

      if (data.success && data.reportId) {
        console.log('Analysis successful, reportId:', data.reportId);
        // Fetch the report to display inline
        try {
          const reportResponse = await fetch(`/api/report/${data.reportId}`);
          const reportData = await reportResponse.json();
          
          if (reportResponse.ok && reportData.success && reportData.report && reportData.report.reportData) {
            setReport(reportData.report.reportData as ReportData);
            // Scroll to report section
            setTimeout(() => {
              const reportSection = document.getElementById('report-section');
              if (reportSection) {
                reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 100);
          } else {
            setError('Failed to load report data');
          }
        } catch (reportErr) {
          console.error('Error fetching report:', reportErr);
          setError('Analysis completed but failed to load report');
        }
        setIsLoading(false);
      } else {
        console.error('Analysis response missing reportId:', data);
        setError('Analysis completed but no report ID returned');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(`Failed to connect to server: ${errorMessage}. Please check your connection and try again.`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e8e8e8', position: 'relative', zIndex: 10 }}>
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg sticky-top" style={{ backgroundColor: '#e8e8e8', zIndex: 1050 }}>
        <div className="container-fluid px-3 px-sm-4 mx-auto" style={{ maxWidth: '56rem' }}>
          <div className="d-flex justify-content-between align-items-center w-100">
            <Link href="/" className="navbar-brand text-decoration-none mb-0">
              <span className="fs-3 fw-bold text-black">Preppery</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container py-5 px-3 px-sm-4 mx-auto" style={{ maxWidth: "56rem" }}>
        {/* Header */}
        <div className="text-center mb-5">
          <div className="mb-4">
            <span className="badge bg-light text-black px-4 py-2 rounded-pill fs-6">
              🚀 Get Your Analysis in Seconds
            </span>
          </div>
          <h1 className="display-3 fw-bold text-black mb-4">
            Analyze Your Resume
          </h1>
          <p className="lead text-black mx-auto" style={{ maxWidth: '800px' }}>
            Get an honest readiness analysis. See if you're ready to apply or if you need to make improvements first.
          </p>
        </div>

        {/* Main Form Card */}
        <div 
          ref={formCardRef}
          className="card shadow-lg border-0 rounded-4 position-relative overflow-hidden chroma-form-card"
          style={{ 
            backgroundColor: '#e8e8e8',
            border: '2px solid #3b82f6',
            background: 'linear-gradient(145deg, #e8e8e8, #d0d0d0)',
            '--mouse-x': '50%',
            '--mouse-y': '50%',
            '--spotlight-color': 'rgba(59, 130, 246, 0.3)',
            '--card-border': '#3b82f6',
            transition: 'border-color 0.3s ease'
          } as React.CSSProperties}
          onMouseMove={handleCardMove}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'transparent';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#3b82f6';
          }}
        >
          <div className="card-header bg-transparent border-0 text-center py-4 position-relative" style={{ zIndex: 2 }}>
            <h2 className="card-title h3 fw-bold text-black mb-2">Resume Analysis Form</h2>
            <p className="card-text text-black mb-0">Fill in the details below to get started</p>
          </div>
          
          <div className="card-body p-4 p-md-5 position-relative" style={{ zIndex: 2 }}>
            <form onSubmit={handleSubmit}>
              {/* Job Description Section */}
              <div className="mb-5">
                <label
                  htmlFor="jobDescription"
                  className="form-label d-flex align-items-center justify-content-center gap-2 mb-3"
                >
                  <span className="badge bg-dark text-white rounded-3 d-inline-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                    1
                  </span>
                  <span className="fs-5 fw-bold text-black">Job Description</span>
                </label>
                <textarea
                  id="jobDescription"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={14}
                  className="form-control job-description-textarea"
                  style={{ 
                    backgroundColor: '#000000', 
                    color: '#ffffff', 
                    borderRadius: '1rem',
                    border: 'none',
                    fontSize: '0.9rem',
                    lineHeight: '1.6'
                  }}
                  placeholder="Paste the complete job description here. Include requirements, responsibilities, and qualifications..."
                  required
                />
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <small className="text-black">
                    💡 The more details you include, the better the analysis will be.
                  </small>
                  <small className="text-black font-monospace">
                    {jobDescription.length.toLocaleString()} characters
                  </small>
                </div>
              </div>

              {/* Resume Upload Section */}
              <div className="mb-5">
                <label className="form-label d-flex align-items-center justify-content-center gap-2 mb-3">
                  <span className="badge bg-dark text-white rounded-3 d-inline-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                    2
                  </span>
                  <span className="fs-5 fw-bold text-black">Resume (PDF)</span>
                </label>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border rounded-4 p-5 text-center transition-all ${
                    isDragging ? 'scale-105' : ''
                  }`}
                  style={{ 
                    backgroundColor: '#dcdcdc',
                    borderStyle: 'dashed',
                    borderWidth: '2px',
                    borderColor: '#d1d5db',
                    cursor: 'pointer'
                  }}
                >
                  {resumeFile ? (
                    <div>
                      <div className="mb-3">
                        <div className="bg-dark rounded-4 d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
                          <svg className="text-white" style={{ width: '40px', height: '40px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <p className="fw-semibold text-black mb-1">
                        {resumeFile.name}
                      </p>
                      <p className="small text-black mb-3">
                        {(resumeFile.size / 1024).toFixed(1)} KB
                      </p>
                      <label className="btn btn-outline-dark btn-sm rounded-pill">
                        <svg className="me-2" style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Change file
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handleFileChange}
                          className="visually-hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div>
                      <div className="bg-dark rounded-4 d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '80px', height: '80px' }}>
                        <svg className="text-white" style={{ width: '40px', height: '40px' }} stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-4h4m-4-4v12m0 0l-4-4m4 4l4-4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                        <label
                          htmlFor="resume"
                          className="btn btn-link text-black text-decoration-none fw-bold p-0"
                          style={{ cursor: 'pointer' }}
                        >
                          Click to upload
                          <input
                            id="resume"
                            name="resume"
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileChange}
                            className="visually-hidden"
                            required
                          />
                        </label>
                        <span className="text-black">or</span>
                        <span className="text-black fw-medium">drag and drop</span>
                      </div>
                      <p className="small text-black mb-0">PDF up to 10MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="alert alert-danger d-flex align-items-start rounded-4 mb-4" role="alert">
                  <svg className="me-3 mt-1 flex-shrink-0" style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="fw-medium">{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <ChromaButton
                type="submit"
                disabled={isLoading || !resumeFile || !jobDescription.trim()}
                className="w-100 py-3 px-4 fs-5 rounded-4"
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-3" role="status" aria-hidden="true"></span>
                    <span>Analyzing your resume...</span>
                  </>
                ) : (
                  <>
                    <svg className="me-2" style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Analyze Resume
                  </>
                )}
              </ChromaButton>
              
              {/* Progress indicator when loading */}
              {isLoading && (
                <div className="d-flex align-items-center justify-content-center gap-3 mt-3">
                  <div className="d-flex gap-2">
                    <div className="bg-black rounded-circle" style={{ width: '10px', height: '10px', animation: 'bounce 1s infinite', animationDelay: '0ms' }}></div>
                    <div className="bg-black rounded-circle" style={{ width: '10px', height: '10px', animation: 'bounce 1s infinite', animationDelay: '150ms' }}></div>
                    <div className="bg-black rounded-circle" style={{ width: '10px', height: '10px', animation: 'bounce 1s infinite', animationDelay: '300ms' }}></div>
                  </div>
                  <small className="text-black fw-medium">Processing your analysis...</small>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {report && (
        <section
          id="report-section"
          className="border-top"
          style={{
            backgroundColor: "#e8e8e8",
            borderTop: "1px solid #d0d0d0",
            marginTop: "2.25rem",
            paddingBottom: "3rem",
          }}
        >
          <div className="container px-3 px-sm-4 py-4 py-md-5">
            <div className="mx-auto w-100" style={{ maxWidth: "56rem" }}>
          {(() => {
            const getStatusColor = (status: string) => {
              switch (status) {
                case 'Ready':
                  return 'bg-success text-white border-success';
                case 'Mostly Ready':
                  return 'bg-warning text-white border-warning';
                case 'Needs Prep':
                  return 'bg-danger text-white border-danger';
                default:
                  return 'bg-secondary text-white border-secondary';
              }
            };

            const getRiskColor = (level: string) => {
              switch (level) {
                case 'Low':
                  return 'bg-success bg-opacity-25 text-success border-success';
                case 'Moderate':
                  return 'bg-warning bg-opacity-25 text-warning border-warning';
                case 'High':
                  return 'bg-danger bg-opacity-25 text-danger border-danger';
                default:
                  return 'bg-secondary bg-opacity-25 text-secondary border-secondary';
              }
            };

            const getScoreColor = (score: number) => {
              if (score >= 80) return 'text-success';
              if (score >= 60) return 'text-warning';
              return 'text-danger';
            };

            const getVerdictIcon = (verdict: string) => {
              if (verdict.toLowerCase().includes('apply now')) return '✅';
              if (verdict.toLowerCase().includes('minor fixes')) return '⚠️';
              return '❌';
            };

            /* Match Resume Analysis Form: gray gradient + blue border */
            const accent = "#3b82f6";
            const formCardBg = "linear-gradient(145deg, #e8e8e8, #d0d0d0)";
            const formCardBorder = "2px solid #3b82f6";
            const panelBg = "#dcdcdc";
            const panelBorder = "#d1d5db";
            const mutedLine = "#9ca3af";

            return (
              <div>
                <div className="text-center mb-4 mb-md-5">
                  <span className="badge bg-light text-black px-4 py-2 rounded-pill fs-6 fw-semibold">
                    Readiness report
                  </span>
                </div>
                {/* Header Card */}
                <div
                  className="card rounded-4 mb-4 shadow-lg border-0"
                  style={{
                    background: formCardBg,
                    border: formCardBorder,
                  }}
                >
                  <div className="card-body p-4 p-md-5">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-4 mb-4">
                      <div className="flex-grow-1">
                        <div className="mb-3">
                          <span className={`badge px-4 py-2 rounded-pill fw-bold border ${getStatusColor(report.status)}`}>
                            {report.status}
                          </span>
                        </div>
                        <h2 className="display-5 fw-bold text-black mb-3">{report.jobTitle}</h2>
                        <div className="d-flex flex-wrap align-items-center gap-3 text-black">
                          <span className="d-flex align-items-center gap-2">
                            <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {report.roleType}
                          </span>
                          <span className="d-flex align-items-center gap-2">
                            <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {report.seniority}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Main Verdict Card — same family as upload drop zone */}
                    <div
                      className="rounded-4 p-4 p-md-5"
                      style={{
                        backgroundColor: panelBg,
                        border: `2px dashed ${panelBorder}`,
                      }}
                    >
                      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-4">
                        <div className="display-1">{getVerdictIcon(report.applyVerdict)}</div>
                        <div className="flex-grow-1">
                          <h3 className="h2 fw-bold text-black mb-4">{report.applyVerdict}</h3>
                          <div className="d-flex flex-wrap align-items-center gap-4">
                            <div className="d-flex align-items-baseline gap-2">
                              <small className="text-black fw-medium">Readiness Score</small>
                              <span className={`display-4 fw-bold ${getScoreColor(report.readinessScore)}`}>
                                {report.readinessScore}
                              </span>
                              <span className="text-black fs-5 opacity-75">/100</span>
                            </div>
                            <div
                              className="vr d-none d-sm-block"
                              style={{ opacity: 0.45, color: mutedLine }}
                            ></div>
                            <div>
                              <small className="text-black fw-medium d-block mb-2">Screening Risk</small>
                              <span className={`badge px-4 py-2 rounded-pill fw-bold border ${getRiskColor(report.screeningRisk.level)}`}>
                                {report.screeningRisk.level}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div
                  className="card rounded-4 mb-4 shadow-lg border-0"
                  style={{
                    background: formCardBg,
                    border: formCardBorder,
                  }}
                >
                  <div className="card-body p-4 p-md-5">
                    <h3 className="h2 fw-bold text-black mb-4 d-flex align-items-center gap-3">
                      <span className="badge bg-dark text-white rounded-3 d-inline-flex align-items-center justify-content-center fs-5" style={{ width: "40px", height: "40px" }}>
                        📊
                      </span>
                      Score Breakdown
                    </h3>
                    <div className="row g-4">
                      {Object.entries(report.breakdown).map(([key, score]) => (
                        <div key={key} className="col-md-6">
                          <div
                            className="p-4 rounded-4"
                            style={{
                              backgroundColor: panelBg,
                              border: `2px dashed ${panelBorder}`,
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <span className="text-black fw-semibold text-capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                              <span className={`fs-3 fw-bold ${getScoreColor(score)}`}>
                                {score}%
                              </span>
                            </div>
                            <div className="progress rounded-pill" style={{ height: '12px', backgroundColor: '#b8b8b8' }}>
                              <div
                                className={`progress-bar ${
                                  score >= 80
                                    ? 'bg-success'
                                    : score >= 60
                                    ? 'bg-warning'
                                    : 'bg-danger'
                                }`}
                                role="progressbar"
                                style={{ width: `${score}%` }}
                                aria-valuenow={score}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Critical Gaps */}
                {report.criticalGaps.length > 0 && (
                  <div
                    className="card rounded-4 mb-4 shadow-lg border-0"
                    style={{
                      background: formCardBg,
                      border: formCardBorder,
                    }}
                  >
                    <div className="card-body p-4 p-md-5">
                      <h3 className="h2 fw-bold text-black mb-4 d-flex align-items-center gap-3">
                        <span className="badge bg-danger bg-opacity-25 text-danger rounded-3 d-inline-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                          ⚠️
                        </span>
                        Critical Gaps
                      </h3>
                      <div className="d-flex flex-column gap-3">
                        {report.criticalGaps.map((gap, index) => (
                          <div key={index} className="bg-danger bg-opacity-10 border-start border-danger border-4 p-4 rounded-4">
                            <h4 className="fw-bold text-black mb-2">{gap.item}</h4>
                            <p className="text-black mb-0">{gap.why}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Boosters */}
                {report.boosters.length > 0 && (
                  <div
                    className="card rounded-4 mb-4 shadow-lg border-0"
                    style={{
                      background: formCardBg,
                      border: formCardBorder,
                    }}
                  >
                    <div className="card-body p-4 p-md-5">
                      <h3 className="h2 fw-bold text-black mb-4 d-flex align-items-center gap-3">
                        <span className="badge bg-success bg-opacity-25 text-success rounded-3 d-inline-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                          ✨
                        </span>
                        Strong Points
                      </h3>
                      <div className="d-flex flex-column gap-3">
                        {report.boosters.map((booster, index) => (
                          <div key={index} className="bg-success bg-opacity-10 border-start border-success border-4 p-4 rounded-4">
                            <h4 className="fw-bold text-black mb-2">{booster.item}</h4>
                            <p className="text-black mb-0">{booster.why}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Fix Plan */}
                <div
                  className="card rounded-4 mb-4 shadow-lg border-0"
                  style={{
                    background: formCardBg,
                    border: formCardBorder,
                  }}
                >
                  <div className="card-body p-4 p-md-5">
                    <h3 className="h2 fw-bold text-black mb-4 d-flex align-items-center gap-3">
                      <span className="badge bg-dark text-white rounded-3 d-inline-flex align-items-center justify-content-center fs-5" style={{ width: "40px", height: "40px" }}>
                        🔧
                      </span>
                      Fix Plan
                      <small className="text-black fw-normal ms-2 opacity-75">
                        (Estimated time: {report.fixPlan.eta})
                      </small>
                    </h3>
                    <div className="d-flex flex-column gap-3">
                      {report.fixPlan.fixes.map((fix, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-4"
                          style={{
                            backgroundColor: panelBg,
                            borderLeft: `4px solid ${accent}`,
                          }}
                        >
                          <div className="d-flex align-items-start gap-3">
                            <div
                              className="text-white rounded-3 d-inline-flex align-items-center justify-content-center fw-bold"
                              style={{
                                width: "32px",
                                height: "32px",
                                flexShrink: 0,
                                backgroundColor: accent,
                              }}
                            >
                              {index + 1}
                            </div>
                            <div className="flex-grow-1">
                              <h4 className="fw-bold text-black mb-2">{fix.title}</h4>
                              <p className="text-black mb-0">{fix.details}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Screening Risk Details */}
                <div
                  className="card rounded-4 mb-4 shadow-lg border-0"
                  style={{
                    background: formCardBg,
                    border: formCardBorder,
                  }}
                >
                  <div className="card-body p-4 p-md-5">
                    <h3 className="h2 fw-bold text-black mb-4 d-flex align-items-center gap-3 flex-wrap">
                      <span className="badge bg-dark text-white rounded-3 d-inline-flex align-items-center justify-content-center fs-6" style={{ width: "40px", height: "40px" }}>
                        📋
                      </span>
                      Screening risk
                    </h3>
                    <div className="mb-4">
                      <span className={`badge px-4 py-2 rounded-pill fw-bold border ${getRiskColor(report.screeningRisk.level)}`}>
                        {report.screeningRisk.level} risk
                      </span>
                    </div>
                    <div className="d-flex flex-column gap-3 mt-4">
                      {report.screeningRisk.reasons.map((reason, index) => (
                        <div
                          key={index}
                          className="d-flex align-items-start gap-3 p-3 rounded-4"
                          style={{
                            backgroundColor: panelBg,
                            border: `2px dashed ${panelBorder}`,
                          }}
                        >
                          <span className="fw-bold" style={{ color: accent }}>
                            •
                          </span>
                          <p className="text-black mb-0" style={{ lineHeight: 1.5 }}>
                            {reason}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div
                      className="mt-4 p-3 rounded-4"
                      style={{
                        backgroundColor: "#e8e8e8",
                        border: `2px solid ${accent}`,
                      }}
                    >
                      <p className="small text-black mb-0 fst-italic" style={{ lineHeight: 1.55 }}>
                        {report.screeningRisk.disclaimer}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="d-flex flex-column flex-sm-row gap-3 mb-2 pb-2">
                  <ChromaButton
                    onClick={handleGenerateResume}
                    disabled={isGeneratingResume || !resumeFile || !jobDescription.trim()}
                    borderColor="#047857"
                    gradient="#059669"
                    className="flex-grow-1 py-3 px-4 fs-5 rounded-4"
                  >
                    {isGeneratingResume ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Generating Resume...
                      </>
                    ) : (
                      <>
                        <svg className="me-2" style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Generate Tailored Resume
                      </>
                    )}
                  </ChromaButton>
                  <ChromaButton
                    onClick={() => {
                      setReport(null);
                      setJobDescription('');
                      setResumeFile(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex-grow-1 py-3 px-4 fs-5 rounded-4"
                  >
                    Analyze Another Resume
                  </ChromaButton>
                  <ChromaButton
                    onClick={() => window.print()}
                    borderColor="#475569"
                    gradient="#64748b"
                    className="flex-grow-1 py-3 px-4 fs-5 rounded-4"
                  >
                    Print Report
                  </ChromaButton>
                </div>
              </div>
            );
          })()}
            </div>
          </div>
        </section>
      )}

      {/* Pricing Modal */}
      {showPricingModal && (
        <PricingModal
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          remaining={remaining ?? 0}
        />
      )}
    </div>
  );
}
