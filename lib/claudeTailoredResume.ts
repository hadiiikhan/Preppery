import Anthropic from "@anthropic-ai/sdk";

export type TailoredResumeInput = {
  baseResume: string;
  jobDescription: string;
  /** Optional extra constraints (tone, length, must-include keywords) */
  instructions?: string;
};

export type TailoredResumeResult = {
  /** Raw model output: JSON text (strip fences with `parseResumePdfJsonFromClaude` if needed). */
  content: string;
  model: string;
};

const JSON_RESUME_SYSTEM = `You are an expert resume writer. Given a base resume and a job description, produce a tailored resume: align wording with the job description, emphasize relevant impact, keep facts truthful, no fabrication.

You MUST respond with ONLY a valid JSON object. No markdown code fences, no prose before or after the JSON.

Use this exact shape (all keys required; use "" or [] when something does not apply):
{
  "name": "",
  "location": "",
  "email": "",
  "phone": "",
  "linkedin": "",
  "github": "",
  "summary": "",
  "skills": [{ "category": "", "items": [] }],
  "projects": [{ "name": "", "location": "", "date": "", "bullets": [] }],
  "experience": [{ "title": "", "company": "", "location": "", "dates": "", "bullets": [] }],
  "education": { "degree": "", "school": "", "dates": "", "coursework": "" },
  "certifications": [],
  "extracurriculars": []
}

Rules:
- Populate fields from the base resume only; infer contact and headings when clearly present.
- Bullets: action + impact, ATS-friendly plain text.
- Skills: Collect every distinct skill mentioned in the base resume (skills section and implied elsewhere). Include each exactly once—do not add skills not present in the base resume. Regroup into categories as needed. Reorder so items and category order prioritize skills most relevant to the job description, without dropping any original skill.
- Education.coursework: If the base resume lists coursework, copy the COMPLETE list verbatim—same wording, punctuation, separators, and order. Do not summarize, merge, shorten, or rephrase.
- linkedin and github: Extract profile/repo URLs from the base resume when present. Use full URLs or paths the candidate used. If a value is missing, use "".`;

/**
 * Calls Claude to produce job-tailored resume data as JSON text.
 * Requires ANTHROPIC_API_KEY in the environment (server-side only).
 */
export async function generateTailoredResumeWithClaude(
  input: TailoredResumeInput
): Promise<TailoredResumeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const client = new Anthropic({ apiKey });
  const model =
    process.env.ANTHROPIC_RESUME_MODEL?.trim() || "claude-sonnet-4-20250514";

  const userContent = [
    "### Job description\n\n",
    input.jobDescription.trim(),
    "\n\n### Base resume\n\n",
    input.baseResume.trim(),
    input.instructions?.trim()
      ? `\n\n### Extra instructions\n\n${input.instructions.trim()}`
      : "",
    "\n\nReturn ONLY the JSON object as specified in your instructions.",
  ].join("");

  const msg = await client.messages.create({
    model,
    max_tokens: 8192,
    system: JSON_RESUME_SYSTEM,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlocks = msg.content.filter(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  const content = textBlocks.map((b) => b.text).join("\n").trim();

  if (!content) {
    throw new Error("Claude returned no text for tailored resume");
  }

  return { content, model };
}
