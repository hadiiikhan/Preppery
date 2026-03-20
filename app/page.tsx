'use client';

import Link from 'next/link';
import ChromaGrid from '@/components/ChromaGrid';
import ChromaButton from '@/components/ChromaButton';
import ChromaText from '@/components/ChromaText';

export default function Home() {
  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden">
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg sticky-top shadow-lg" style={{ 
        backgroundColor: 'rgba(212, 212, 212, 0.8)',
        minHeight: '100px',
        zIndex: 1050
      }}>
        <div className="container-fluid">
          <div className="d-flex justify-content-between align-items-center w-100 px-4">
            <Link href="/" className="navbar-brand text-decoration-none">
              <ChromaText
                as="span"
                borderColor="#3b82f6"
                gradient="linear-gradient(145deg, #3b82f6, #06b6d4)"
                className="tracking-tight"
                style={{
                  fontSize: '3rem',
                  fontWeight: '900',
                  letterSpacing: '-0.02em'
                } as React.CSSProperties}
              >
                Preppery
              </ChromaText>
            </Link>
            <div className="d-flex align-items-center">
              <Link href="/analyze" className="text-decoration-none">
                <ChromaText
                  as="span"
                  borderColor="#3b82f6"
                  gradient="linear-gradient(145deg, #3b82f6, #06b6d4)"
                  className="display-4 fw-bold tracking-tight"
                  style={{ cursor: 'pointer' }}
                >
                  Get Started
                </ChromaText>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container py-5" style={{ paddingTop: '120px', paddingBottom: '80px' }}>
        <div className="text-center mb-5 animate-fade-in">
          <h1 className="display-1 fw-bold text-white mb-5" style={{ fontSize: '5rem' }}>
            Analyze Your Resume
          </h1>
          <p className="lead text-white-50 mb-5 mx-auto fw-bold" style={{ maxWidth: '800px', fontSize: '1.25rem', lineHeight: '1.75' }}>
            Get an honest readiness analysis. See if you should apply now or fix your resume first. 
            Transform your job application strategy with AI-powered insights.
          </p>
          

          {/* Badge */}
          <div className="badge bg-dark bg-opacity-50 text-white px-4 py-3 rounded-pill d-inline-flex align-items-center gap-2 mt-5" style={{ marginTop: '120px' }}>
            <span className="bg-success rounded-circle" style={{ width: '8px', height: '8px', animation: 'pulse 2s infinite' }}></span>
            <span className="fw-bold">2 Free Analyses • No Sign-Up Required</span>
          </div>
        </div>

        {/* How it works */}
        <div id="how-it-works" className="my-5" style={{ marginTop: '100px' }}>
          <div className="text-center mb-5">
            <h2 className="display-3 fw-bold text-white mb-4">How it works</h2>
            <div className="mb-5">
              <ChromaText
                as="p"
                borderColor="#06b6d4"
                gradient="linear-gradient(145deg, #06b6d4, #3b82f6)"
                className="fs-3 fw-bold"
              >
                Simple, fast, and effective
              </ChromaText>
            </div>
          </div>
          <div style={{ height: '600px', position: 'relative' }}>
            <ChromaGrid 
              items={[
                {
                  title: "1",
                  subtitle: "Upload Resume",
                  handle: "Upload your resume PDF and paste the job description",
                  borderColor: "#1e40af",
                  gradient: "linear-gradient(145deg, #1e40af, #000)",
                },
                {
                  title: "2",
                  subtitle: "Get Analysis",
                  handle: "Receive a detailed readiness report with scores and recommendations",
                  borderColor: "#06b6d4",
                  gradient: "linear-gradient(180deg, #06b6d4, #000)",
                },
                {
                  title: "3",
                  subtitle: "Take Action",
                  handle: "Follow the fix plan to improve your resume, then apply with confidence",
                  borderColor: "#3b82f6",
                  gradient: "linear-gradient(195deg, #3b82f6, #000)",
                }
              ]}
              radius={300}
              damping={0.45}
              fadeOut={0.6}
              ease="power3.out"
              columns={3}
              rows={1}
            />
          </div>
        </div>


        {/* Final CTA */}
        <div className="row justify-content-center mt-5" style={{ marginTop: '-200px' }}>
          <div className="col-lg-10 col-xl-8">
            <div className="card border-0 shadow-lg position-relative overflow-hidden" style={{
              background: 'linear-gradient(to right, #4f46e5, #9333ea, #ec4899)',
              borderRadius: '1rem'
            }}>
              <div className="position-absolute top-0 start-0 w-100 h-100 opacity-20" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}></div>
              <div className="card-body text-center text-white p-5 position-relative" style={{ zIndex: 10 }}>
                <h2 className="display-4 fw-bold mb-4">Ready to get started?</h2>
                <div className="mt-5">
                  <ChromaButton
                    href="/analyze"
                    borderColor="#06b6d4"
                    gradient="linear-gradient(145deg, #06b6d4, #000)"
                    className="shadow-lg"
                    style={{
                      paddingTop: '24px',
                      paddingBottom: '24px',
                      paddingLeft: '48px',
                      paddingRight: '48px',
                      fontSize: '1.5rem',
                      minWidth: '300px'
                    }}
                  >
                    Start Analyzing Now
                    <svg className="ms-2" style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </ChromaButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
