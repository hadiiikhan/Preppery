import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // In Next.js 15+, params is always a Promise
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid report ID' },
        { status: 400 }
      );
    }

    console.log('Fetching analysis with ID:', id);
    
    const analysis = await db.analysis.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    console.log('Analysis found:', analysis ? 'Yes' : 'No');
    if (analysis) {
      console.log('Analysis has reportData:', !!analysis.reportData);
    }

    if (!analysis) {
      return NextResponse.json(
        { error: 'Report not found', id: id },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      report: {
        id: analysis.id,
        reportData: analysis.reportData,
        createdAt: analysis.createdAt,
      },
    });
  } catch (error) {
    console.error('Report fetch error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

