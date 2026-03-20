import { z } from "zod";

const skillGroupSchema = z.object({
  category: z.string(),
  items: z.array(z.string()),
});

const projectSchema = z.object({
  name: z.string(),
  location: z.string().optional().default(""),
  date: z.string().optional().default(""),
  bullets: z.array(z.string()).default([]),
});

const experienceSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional().default(""),
  dates: z.string().optional().default(""),
  bullets: z.array(z.string()).default([]),
});

const educationSchema = z.object({
  degree: z.string().optional().default(""),
  school: z.string().optional().default(""),
  dates: z.string().optional().default(""),
  coursework: z.string().optional().default(""),
});

export const resumePdfDataSchema = z.object({
  name: z.string().default(""),
  location: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  linkedin: z.string().default(""),
  /** Profile or repo URL; shown in Links section with LinkedIn */
  github: z.string().default(""),
  summary: z.string().optional().default(""),
  skills: z.array(skillGroupSchema).default([]),
  projects: z.array(projectSchema).default([]),
  experience: z.array(experienceSchema).default([]),
  education: educationSchema.default({
    degree: "",
    school: "",
    dates: "",
    coursework: "",
  }),
  certifications: z.array(z.string()).optional().default([]),
  extracurriculars: z.array(z.string()).optional().default([]),
});

export type ResumePdfData = z.infer<typeof resumePdfDataSchema>;

export function stripResumeJsonFences(raw: string): string {
  let s = raw.trim();
  const fenced = /^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```\s*$/im.exec(s);
  if (fenced) return fenced[1].trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*\r?\n?/, "").replace(/\r?\n?```\s*$/, "");
  }
  return s.trim();
}

export function parseResumePdfJsonFromClaude(raw: string): ResumePdfData {
  const json = stripResumeJsonFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Claude did not return valid JSON for the resume.");
  }
  const out = resumePdfDataSchema.safeParse(parsed);
  if (!out.success) {
    throw new Error(`Resume JSON validation failed: ${out.error.message}`);
  }
  return out.data;
}
