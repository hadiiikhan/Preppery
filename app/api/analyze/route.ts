import { NextRequest, NextResponse } from 'next/server';
import { checkGateStatus, recordAnalysis } from '@/lib/gating';
import { extractPdfText } from '@/lib/extractPdf';
import { analyzeResume } from '@/lib/analyze';
import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    const openaiKey = process.env.OPENAI_API_KEY?.trim();
    if (!openaiKey) {
      console.error('OPENAI_API_KEY is not set. Available env vars:', Object.keys(process.env).filter(k => k.includes('OPENAI')));
      return NextResponse.json(
        {
          error: 'Server configuration error',
          message: 'OpenAI API key is not configured. Please add OPENAI_API_KEY to your .env.local file and restart the server.',
        },
        { status: 500 }
      );
    }

    // Check gate status (2 free tries for anonymous users)
    // TEMPORARILY DISABLED FOR TESTING - Uncomment to re-enable gating
    /*
    let gateStatus;
    try {
      gateStatus = await checkGateStatus();
    } catch (error) {
      console.error('Error checking gate status:', error);
      return NextResponse.json(
        {
          error: 'Gate check failed',
          message: error instanceof Error ? error.message : 'Failed to check access. Please try again.',
        },
        { status: 500 }
      );
    }
    
    if (!gateStatus.allowed) {
      if (gateStatus.requiresAuth) {
        return NextResponse.json(
          {
            error: 'Free limit exceeded',
            message: 'You have used your 2 free analyses. Please sign up to continue.',
            requiresAuth: true,
            remaining: 0,
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: 'Access denied', remaining: gateStatus.remaining },
        { status: 403 }
      );
    }
    */
    
    // Temporary gate status for testing (always allows)
    const gateStatus = {
      allowed: true,
      remaining: Infinity,
      requiresAuth: false,
      isAuthenticated: false,
    };

    // Parse form data
    const formData = await request.formData();
    const resumeFile = formData.get('resume') as File | null;
    const jobDescription = formData.get('jobDescription') as string | null;

    // Validate inputs
    if (!resumeFile) {
      return NextResponse.json(
        { error: 'Resume file is required' },
        { status: 400 }
      );
    }

    if (!jobDescription || jobDescription.trim().length === 0) {
      return NextResponse.json(
        { error: 'Job description is required' },
        { status: 400 }
      );
    }

    // Extract PDF text
    let resumeText: string;
    try {
      resumeText = await extractPdfText(resumeFile);
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to extract PDF text', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 400 }
      );
    }

    // Get user info for recording
    const { userId: clerkId } = await auth();
    const headersList = await headers();
    const forwarded = headersList.get('x-forwarded-for');
    const anonymousId = forwarded ? forwarded.split(',')[0] : headersList.get('x-real-ip') || null;

    // Analyze resume against job description using OpenAI
    let reportData;
    try {
      reportData = await analyzeResume(resumeText, jobDescription);
    } catch (error) {
      console.error('OpenAI analysis error:', error);
      return NextResponse.json(
        {
          error: 'Analysis failed',
          message: error instanceof Error ? error.message : 'Failed to analyze resume. Please try again.',
        },
        { status: 500 }
      );
    }

    // Record the analysis with report data and get the ID
    let analysisRecord;
    try {
      analysisRecord = await recordAnalysis(clerkId, anonymousId, reportData);
    } catch (error) {
      console.error('Error recording analysis:', error);
      return NextResponse.json(
        {
          error: 'Failed to save analysis',
          message: error instanceof Error ? error.message : 'Failed to save analysis to database. Please try again.',
        },
        { status: 500 }
      );
    }

    // Return analysis results with report ID
    return NextResponse.json({
      success: true,
      reportId: analysisRecord.id,
      report: reportData,
      remaining: gateStatus.remaining, // Always shows Infinity during testing
      isAuthenticated: gateStatus.isAuthenticated,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details for debugging
    console.error('Full error details:', {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : 'Unknown',
    });
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: errorMessage,
        // Only include stack in development
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack }),
      },
      { status: 500 }
    );
  }
}

