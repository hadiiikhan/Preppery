'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ReportData } from '@/lib/analyze';
import ChromaButton from '@/components/ChromaButton';

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const reportId = params.id as string;
        if (!reportId) {
          setError('Invalid report ID');
          setLoading(false);
          return;
        }

        console.log('Fetching report with ID:', reportId);
        const response = await fetch(`/api/report/${reportId}`);
        const data = await response.json();

        console.log('Report API response:', { status: response.status, data });

        if (!response.ok) {
          setError(data.error || 'Failed to load report');
          setLoading(false);
          return;
        }

        if (data.success && data.report && data.report.reportData) {
          setReport(data.report.reportData as ReportData);
        } else {
          setError('Report data not found');
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError('Failed to load report');
        setLoading(false);
      }
    };

    if (params.id) {
      fetchReport();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-lg font-medium text-gray-700">Loading your report...</p>
          <p className="text-sm text-gray-500 mt-2">This will just take a moment</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md text-center animate-fade-in">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">😕</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Report Not Found</h2>
          <p className="text-gray-600 mb-8">{error || 'This report could not be loaded.'}</p>
          <ChromaButton
            href="/analyze"
            borderColor="#3b82f6"
            gradient="linear-gradient(145deg, #3b82f6, #000)"
            className="px-6 py-3 shadow-lg"
          >
            Analyze Another Resume
          </ChromaButton>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ready':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-400';
      case 'Mostly Ready':
        return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-yellow-300';
      case 'Needs Prep':
        return 'bg-gradient-to-r from-red-500 to-rose-500 text-white border-red-400';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'High':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getVerdictIcon = (verdict: string) => {
    if (verdict.toLowerCase().includes('apply now')) return '✅';
    if (verdict.toLowerCase().includes('minor fixes')) return '⚠️';
    return '❌';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200/50 bg-white/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center group">
              <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent group-hover:from-indigo-700 group-hover:to-purple-700 transition-all">
                Preppery
              </div>
            </Link>
            <Link
              href="/analyze"
              className="text-gray-700 hover:text-indigo-600 font-medium transition-all duration-200"
            >
              Analyze Another
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 mb-8 border border-gray-100 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
            <div className="flex-1">
              <div className="inline-block mb-4">
                <span className={`px-5 py-2.5 rounded-full font-bold text-sm border-2 ${getStatusColor(report.status)} shadow-lg`}>
                  {report.status}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-3 mt-4">
                {report.jobTitle}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-gray-600">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {report.roleType}
                </span>
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {report.seniority}
                </span>
              </div>
            </div>
          </div>

          {/* Main Verdict Card */}
          <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-8 border-2 border-indigo-200 shadow-lg">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="text-6xl">{getVerdictIcon(report.applyVerdict)}</div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  {report.applyVerdict}
                </h2>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-gray-600 font-medium">Readiness Score</span>
                    <div className={`text-5xl font-extrabold ${getScoreColor(report.readinessScore)}`}>
                      {report.readinessScore}
                    </div>
                    <span className="text-gray-400 text-lg">/100</span>
                  </div>
                  <div className="h-12 w-px bg-gray-300"></div>
                  <div>
                    <span className="text-sm text-gray-600 font-medium block mb-1">Screening Risk</span>
                    <span className={`inline-block px-4 py-2 rounded-full font-bold text-sm border-2 ${getRiskColor(report.screeningRisk.level)} shadow-md`}>
                      {report.screeningRisk.level}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 mb-8 border border-gray-100 animate-fade-in">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <span className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
              📊
            </span>
            Score Breakdown
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(report.breakdown).map(([key, score], index) => (
              <div key={key} className="group p-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-700 font-semibold capitalize text-lg">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
                    {score}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-1000 ${
                      score >= 80
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : score >= 60
                        ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                        : 'bg-gradient-to-r from-red-500 to-rose-500'
                    }`}
                    style={{ width: `${score}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Gaps */}
        {report.criticalGaps.length > 0 && (
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 mb-8 border border-gray-100 animate-fade-in">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 font-bold text-xl">
                ⚠️
              </span>
              Critical Gaps
            </h2>
            <div className="space-y-4">
              {report.criticalGaps.map((gap, index) => (
                <div
                  key={index}
                  className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl hover:shadow-md transition-all group"
                >
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">{gap.item}</h3>
                  <p className="text-gray-700">{gap.why}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Boosters */}
        {report.boosters.length > 0 && (
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 mb-8 border border-gray-100 animate-fade-in">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600 font-bold text-xl">
                ✨
              </span>
              Strong Points
            </h2>
            <div className="space-y-4">
              {report.boosters.map((booster, index) => (
                <div
                  key={index}
                  className="bg-green-50 border-l-4 border-green-500 p-6 rounded-xl hover:shadow-md transition-all group"
                >
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">{booster.item}</h3>
                  <p className="text-gray-700">{booster.why}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fix Plan */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 mb-8 border border-gray-100 animate-fade-in">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-xl">
              🔧
            </span>
            Fix Plan
            <span className="text-lg font-normal text-gray-500 ml-2">
              (Estimated time: {report.fixPlan.eta})
            </span>
          </h2>
          <div className="space-y-4">
            {report.fixPlan.fixes.map((fix, index) => (
              <div
                key={index}
                className="bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500 p-6 rounded-xl hover:from-indigo-100 hover:to-purple-100 hover:shadow-lg transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold shadow-md">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-2 text-lg">
                      {fix.title}
                    </h3>
                    <p className="text-gray-700 leading-relaxed">{fix.details}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Screening Risk Details */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 mb-8 border border-gray-100 animate-fade-in">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Screening Risk Analysis</h2>
          <div className="space-y-4">
            <div className={`inline-block px-5 py-2.5 rounded-full font-bold text-sm border-2 ${getRiskColor(report.screeningRisk.level)} shadow-md`}>
              {report.screeningRisk.level} Risk
            </div>
            <div className="space-y-3 mt-6">
              {report.screeningRisk.reasons.map((reason, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <span className="text-indigo-600 font-bold mt-1">•</span>
                  <p className="text-gray-700 leading-relaxed">{reason}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-gray-600 italic">
                {report.screeningRisk.disclaimer}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <ChromaButton
            href="/analyze"
            borderColor="#3b82f6"
            gradient="linear-gradient(145deg, #3b82f6, #000)"
            className="flex-1 px-8 py-4 text-lg shadow-xl hover:shadow-2xl"
          >
            Analyze Another Resume
          </ChromaButton>
          <ChromaButton
            onClick={() => window.print()}
            borderColor="#06b6d4"
            gradient="linear-gradient(145deg, #06b6d4, #000)"
            className="flex-1 px-8 py-4 text-lg shadow-lg hover:shadow-xl"
          >
            Print Report
          </ChromaButton>
        </div>
      </div>
    </div>
  );
}
