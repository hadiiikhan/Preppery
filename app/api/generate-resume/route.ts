import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import { ResumePDF } from "@/components/ResumePDF";
import { generateTailoredResumeWithClaude } from "@/lib/claudeTailoredResume";
import { extractPdfText } from "@/lib/extractPdf";
import { parseResumePdfJsonFromClaude } from "@/lib/resumePdfData";

export const runtime = "nodejs";
export const maxDuration = 120;

function isMultipartRequest(req: NextRequest): boolean {
  const ct = req.headers.get("content-type") || "";
  return ct.includes("multipart/form-data");
}

function shouldTreatAsPdf(resumeName: string): boolean {
  return /\.pdf$/i.test(resumeName);
}

/**
 * Next.js / undici may yield a File or Blob for file fields; MIME is often missing.
 */
async function normalizeResumeFile(entry: FormDataEntryValue | null): Promise<File | null> {
  if (entry == null) return null;
  if (typeof entry === "string") return null;

  const name =
    entry instanceof File ? entry.name : "resume.pdf";
  const buf = await entry.arrayBuffer();

  const rawType = entry instanceof File ? entry.type : "";
  const pdfType = "application/pdf";
  if (rawType === pdfType) {
    return new File([buf], name || "resume.pdf", { type: pdfType });
  }
  if (!rawType || rawType === "application/octet-stream") {
    return new File([buf], name || "resume.pdf", { type: pdfType });
  }
  if (shouldTreatAsPdf(name) && rawType !== pdfType) {
    return new File([buf], name || "resume.pdf", { type: pdfType });
  }
  return new File([buf], name || "resume.pdf", { type: rawType });
}

export async function POST(req: NextRequest) {
  try {
    if (isMultipartRequest(req)) {
      const formData = await req.formData();
      const resumeFile = await normalizeResumeFile(formData.get("resume"));
      const jobRaw = formData.get("jobDescription");

      if (!resumeFile) {
        return NextResponse.json({ error: "resume file is required" }, { status: 400 });
      }
      const jobDescription =
        typeof jobRaw === "string" ? jobRaw : jobRaw != null ? String(jobRaw) : "";
      if (!jobDescription.trim()) {
        return NextResponse.json(
          { error: "jobDescription is required" },
          { status: 400 }
        );
      }

      let baseResume: string;
      try {
        baseResume = await extractPdfText(resumeFile);
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json(
          { error: "Failed to extract text from PDF", details: detail },
          { status: 400 }
        );
      }

      const { content } = await generateTailoredResumeWithClaude({
        baseResume,
        jobDescription: jobDescription.trim(),
      });

      let data;
      try {
        data = parseResumePdfJsonFromClaude(content);
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Invalid JSON";
        return NextResponse.json(
          { error: "Failed to parse tailored resume from model", details: detail },
          { status: 502 }
        );
      }

      const pdfBuffer = await renderToBuffer(
        createElement(ResumePDF, { data }) as Parameters<
          typeof renderToBuffer
        >[0]
      );
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="tailored-resume.pdf"',
        },
      });
    }

    const body = await req.json();
    const baseResume = body.baseResume ?? body.resume ?? "";
    const jobDescription = body.jobDescription ?? body.jd ?? "";

    if (typeof baseResume !== "string" || !baseResume.trim()) {
      return NextResponse.json(
        { error: "baseResume is required" },
        { status: 400 }
      );
    }
    if (typeof jobDescription !== "string" || !jobDescription.trim()) {
      return NextResponse.json(
        { error: "jobDescription is required" },
        { status: 400 }
      );
    }

    const instructions =
      typeof body.instructions === "string" ? body.instructions : undefined;

    const { content, model } = await generateTailoredResumeWithClaude({
      baseResume,
      jobDescription,
      instructions,
    });

    let tailoredResume;
    try {
      tailoredResume = parseResumePdfJsonFromClaude(content);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Invalid JSON";
      return NextResponse.json(
        { error: "Failed to parse tailored resume from model", details: detail },
        { status: 502 }
      );
    }

    return NextResponse.json({
      tailoredResume,
      model,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Resume generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
