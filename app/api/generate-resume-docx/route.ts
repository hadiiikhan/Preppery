import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60; // seconds

function getFirstNonWhitespaceChar(buf: Buffer): string | null {
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    if (c === 0x20 || c === 0x0a || c === 0x0d || c === 0x09) continue; // space, \n, \r, \t
    return String.fromCharCode(c);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const resumeFile = formData.get('resume') as File | null;
    const jobDescription = formData.get('jobDescription') as string | null;

    if (!resumeFile) {
      return NextResponse.json({ error: 'Resume file is required' }, { status: 400 });
    }
    if (!jobDescription || jobDescription.trim().length === 0) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    const apiKey = process.env.RESUME_OPTIMIZER_PRO_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'RESUME_OPTIMIZER_PRO_API_KEY is not configured in env' },
        { status: 500 }
      );
    }

    const resumeBuffer = Buffer.from(await resumeFile.arrayBuffer());
    const resumeBase64 = resumeBuffer.toString('base64');

    const optimizerRes = await fetch('https://resumeoptimizerpro.com/api/v1/optimize', {
      method: 'POST',
      headers: {
        ApiKey: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ResumeAsBase64String: resumeBase64,
        JobText: jobDescription,
        AutoOptimize: true,
      }),
    });

    const resBuf = Buffer.from(await optimizerRes.arrayBuffer());
    const firstChar = getFirstNonWhitespaceChar(resBuf);

    // If the API returns JSON error payload, surface it clearly
    if (firstChar === '{' || firstChar === '[') {
      let payload: any = null;
      try {
        payload = JSON.parse(resBuf.toString('utf8'));
      } catch {
        // ignore
      }
      const message = payload?.Message || payload?.message || payload?.error || 'Resume optimization failed';
      return NextResponse.json(
        { error: message, details: payload },
        { status: optimizerRes.status || 500 }
      );
    }

    if (!optimizerRes.ok) {
      return NextResponse.json(
        {
          error: 'Resume optimization failed',
          status: optimizerRes.status,
        },
        { status: optimizerRes.status || 500 }
      );
    }

    // Assuming successful response is a DOCX binary
    return new NextResponse(resBuf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="tailored-resume.docx"`,
        'Content-Length': resBuf.length.toString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

