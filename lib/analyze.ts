import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const ReportSchema = z.object({
  jobTitle: z.string(),
  roleType: z.string(),
  seniority: z.string(),
  readinessScore: z.number().min(0).max(100),
  status: z.enum(["Ready", "Mostly Ready", "Needs Prep"]),
  applyVerdict: z.string(),
  breakdown: z.object({
    skillsMatch: z.number().min(0).max(100),
    experienceRelevance: z.number().min(0).max(100),
    keywordCoverage: z.number().min(0).max(100),
    seniorityFit: z.number().min(0).max(100),
  }),
  screeningRisk: z.object({
    level: z.enum(["Low", "Moderate", "High"]),
    reasons: z.array(z.string()),
    disclaimer: z.string(),
  }),
  criticalGaps: z.array(
    z.object({
      item: z.string(),
      why: z.string(),
    })
  ),
  boosters: z.array(
    z.object({
      item: z.string(),
      why: z.string(),
    })
  ),
  fixPlan: z.object({
    eta: z.string(),
    fixes: z.array(
      z.object({
        title: z.string(),
        details: z.string(),
      })
    ),
  }),
});

export type ReportData = z.infer<typeof ReportSchema>;

function stripJsonFences(raw: string): string {
  let s = raw.trim();
  const fenced = /^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```\s*$/im.exec(s);
  if (fenced) return fenced[1].trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*\r?\n?/, "").replace(/\r?\n?```\s*$/, "");
  }
  return s.trim();
}

const ANALYSIS_SYSTEM = `You are a resume analysis expert. Analyze a resume against a job description and provide a structured readiness assessment.

You MUST respond with ONLY a valid JSON object. No markdown code fences, no commentary before or after.

Use this exact shape (all keys required):
{
  "jobTitle": "extracted job title",
  "roleType": "e.g., Mobile, Web, Backend, Full-Stack",
  "seniority": "e.g., Intern, Junior, Mid, Senior",
  "readinessScore": 0-100,
  "status": "Ready" | "Mostly Ready" | "Needs Prep",
  "applyVerdict": "Apply now" | "Apply after minor fixes" | "Fix before applying",
  "breakdown": {
    "skillsMatch": 0-100,
    "experienceRelevance": 0-100,
    "keywordCoverage": 0-100,
    "seniorityFit": 0-100
  },
  "screeningRisk": {
    "level": "Low" | "Moderate" | "High",
    "reasons": ["reason 1", "reason 2"],
    "disclaimer": "Different companies screen differently. This is a best-effort estimate."
  },
  "criticalGaps": [
    {"item": "missing skill/requirement", "why": "explanation"}
  ],
  "boosters": [
    {"item": "strong point", "why": "explanation"}
  ],
  "fixPlan": {
    "eta": "10–20 min",
    "fixes": [
      {"title": "fix title", "details": "specific instructions"}
    ]
  }
}

Guidelines:
- readinessScore: 80-100 aligns with Ready, 60-79 Mostly Ready, <60 Needs Prep (map status consistently)
- Be honest and specific about gaps
- Provide actionable fix plan (about 10–20 min total)
- Focus on resume–job alignment, not generic resume advice`;

/**
 * Analyze resume against job description using Anthropic Claude.
 * Requires ANTHROPIC_API_KEY. Optional: ANTHROPIC_ANALYSIS_MODEL or ANTHROPIC_RESUME_MODEL; else default Sonnet.
 */
export async function analyzeResume(
  resumeText: string,
  jobDescription: string
): Promise<ReportData> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set in environment variables. Add it to .env.local."
    );
  }

  const maxResumeLength = 8000;
  const maxJobDescLength = 4000;

  const truncatedResume =
    resumeText.length > maxResumeLength
      ? resumeText.substring(0, maxResumeLength) + "... [truncated]"
      : resumeText;

  const truncatedJobDesc =
    jobDescription.length > maxJobDescLength
      ? jobDescription.substring(0, maxJobDescLength) + "... [truncated]"
      : jobDescription;

  const userPrompt = `Job Description:
${truncatedJobDesc}

Resume:
${truncatedResume}

Analyze this resume against the job description and return ONLY the JSON object as specified.`;

  const model =
    process.env.ANTHROPIC_ANALYSIS_MODEL?.trim() ||
    process.env.ANTHROPIC_RESUME_MODEL?.trim() ||
    "claude-sonnet-4-20250514";

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model,
      max_tokens: 4096,
      temperature: 0.3,
      system: ANALYSIS_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlocks = msg.content.filter(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    const content = textBlocks.map((b) => b.text).join("\n").trim();

    if (!content) {
      throw new Error("Claude returned no text for analysis");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripJsonFences(content));
    } catch {
      throw new Error("Invalid JSON in Claude response");
    }

    return ReportSchema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues);
      throw new Error(
        `Invalid report structure: ${error.issues.map((e) => e.message).join(", ")}`
      );
    }
    throw error;
  }
}
