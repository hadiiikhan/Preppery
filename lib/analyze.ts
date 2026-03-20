import OpenAI from 'openai';
import { z } from 'zod';

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables. Please add it to your .env.local file.');
  }
  return new OpenAI({
    apiKey: apiKey,
  });
}

// Zod schema for validating OpenAI response
const ReportSchema = z.object({
  jobTitle: z.string(),
  roleType: z.string(),
  seniority: z.string(),
  readinessScore: z.number().min(0).max(100),
  status: z.enum(['Ready', 'Mostly Ready', 'Needs Prep']),
  applyVerdict: z.string(),
  breakdown: z.object({
    skillsMatch: z.number().min(0).max(100),
    experienceRelevance: z.number().min(0).max(100),
    keywordCoverage: z.number().min(0).max(100),
    seniorityFit: z.number().min(0).max(100),
  }),
  screeningRisk: z.object({
    level: z.enum(['Low', 'Moderate', 'High']),
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

/**
 * Analyze resume against job description using OpenAI
 */
export async function analyzeResume(
  resumeText: string,
  jobDescription: string
): Promise<ReportData> {
  // Truncate if too long (to avoid token limits)
  const maxResumeLength = 8000;
  const maxJobDescLength = 4000;
  
  const truncatedResume = resumeText.length > maxResumeLength
    ? resumeText.substring(0, maxResumeLength) + '... [truncated]'
    : resumeText;
  
  const truncatedJobDesc = jobDescription.length > maxJobDescLength
    ? jobDescription.substring(0, maxJobDescLength) + '... [truncated]'
    : jobDescription;

  const systemPrompt = `You are a resume analysis expert. Analyze a resume against a job description and provide a structured readiness assessment.

Return ONLY valid JSON in this exact format:
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
- readinessScore: 80-100 = Ready, 60-79 = Mostly Ready, <60 = Needs Prep
- Be honest and specific about gaps
- Provide actionable fix plan (10-20 min total)
- Focus on resume-job alignment, not general resume advice`;

  const userPrompt = `Job Description:
${truncatedJobDesc}

Resume:
${truncatedResume}

Analyze this resume against the job description and return the JSON assessment.`;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using mini for cost efficiency, can upgrade to gpt-4o if needed
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent output
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse and validate JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      throw new Error('Invalid JSON in OpenAI response');
    }

    // Validate with Zod
    const validated = ReportSchema.parse(parsed);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.issues);
      throw new Error(`Invalid report structure: ${error.issues.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

