/**
 * Resume JSON Schema v1.0
 * Single source of truth for content with priorities, maxLines, and compressRules
 * Layout tokens are separate from content
 */

import { z } from 'zod';

// Priority: 0-100 (integers)
// 100-90: Must remain unless impossible (Header, Experience core, key skills)
// 89-75: Keep if possible (Summary, Projects)
// 74-55: First to compress (extra skills, coursework, extra bullets)
// 54 and below: First to drop (low-value bullets, redundant lines)

const PrioritySchema = z.number().int().min(0).max(100);

const ContactLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
  priority: PrioritySchema,
});

const HeaderSchema = z.object({
  priority: PrioritySchema.default(100),
  name: z.string().min(1),
  contact: z.object({
    phone: z.string().nullable(),
    // Some resumes contain malformed email-like text in the contact section (e.g. "email: john @ gmail").
    // We allow null so resume generation doesn't fail when email isn't parseable.
    email: z.string().email().nullable(),
    links: z.array(ContactLinkSchema).default([]),
  }),
});

const SummarySchema = z.object({
  enabled: z.boolean().default(true),
  priority: PrioritySchema.default(85),
  style: z.enum(['2-3-lines']).default('2-3-lines'),
  text: z.object({
    value: z.string().min(1),
    shortenable: z.boolean().default(true),
    minChars: z.number().int().min(0).default(140),
    maxChars: z.number().int().min(0).default(300),
  }),
});

const SkillItemSchema = z.object({
  value: z.string().min(1),
  priority: PrioritySchema,
  mustKeep: z.boolean().default(false),
});

const SkillGroupSchema = z.object({
  label: z.string().min(1),
  priority: PrioritySchema,
  items: z.array(SkillItemSchema).min(1),
});

const SkillsSchema = z.object({
  priority: PrioritySchema.default(90),
  groups: z.array(SkillGroupSchema).min(1),
  constraints: z.object({
    maxItemsTotal: z.number().int().min(0).default(28),
    minItemsTotal: z.number().int().min(0).default(12),
  }).default({ maxItemsTotal: 28, minItemsTotal: 12 }),
});

const BulletSchema = z.object({
  priority: PrioritySchema,
  mustKeep: z.boolean().default(false),
  shortenable: z.boolean().default(true),
  maxLinesPreferred: z.number().int().min(1).max(3).default(2),
  text: z.string().min(1),
  compressRules: z.object({
    maxChars: z.number().int().min(0).optional(),
    aggressive: z.boolean().default(false),
  }).optional(),
});

const ExperienceItemSchema = z.object({
  priority: PrioritySchema,
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().nullable(),
  dateRange: z.string().min(1),
  bullets: z.array(BulletSchema).min(1),
  constraints: z.object({
    maxBullets: z.number().int().min(1).default(4),
    minBullets: z.number().int().min(1).default(2),
  }).default({ maxBullets: 4, minBullets: 2 }),
});

const ExperienceSchema = z.object({
  priority: PrioritySchema.default(95),
  items: z.array(ExperienceItemSchema).min(0),
});

const ProjectItemSchema = z.object({
  priority: PrioritySchema,
  name: z.string().min(1),
  link: z.string().nullable(),
  stackLine: z.object({
    value: z.string(),
    shortenable: z.boolean().default(true),
    priority: PrioritySchema.default(75),
  }).optional(),
  bullets: z.array(BulletSchema).min(1),
  constraints: z.object({
    maxBullets: z.number().int().min(1).default(3),
    minBullets: z.number().int().min(1).default(2),
  }).default({ maxBullets: 3, minBullets: 2 }),
});

const ProjectsSchema = z.object({
  priority: PrioritySchema.default(92),
  items: z.array(ProjectItemSchema).min(0),
  constraints: z.object({
    maxProjects: z.number().int().min(0).default(3),
    minProjects: z.number().int().min(0).default(2),
  }).default({ maxProjects: 3, minProjects: 2 }),
});

const EducationDetailSchema = z.object({
  priority: PrioritySchema,
  shortenable: z.boolean().default(true),
  text: z.string().min(1),
});

const EducationItemSchema = z.object({
  priority: PrioritySchema.default(70),
  school: z.string().min(1),
  degree: z.string().min(1),
  location: z.string().nullable(),
  dateRange: z.string().min(1),
  details: z.array(EducationDetailSchema).default([]),
});

const EducationSchema = z.object({
  priority: PrioritySchema.default(70),
  items: z.array(EducationItemSchema).min(0),
});

const IntegritySchema = z.object({
  noFabrication: z.boolean().default(true),
  disallowNewClaims: z.boolean().default(true),
  requireEvidenceForMetrics: z.boolean().default(true),
  metricsPolicy: z.object({
    allowIfProvided: z.boolean().default(true),
    allowEstimates: z.boolean().default(false),
  }).default({ allowIfProvided: true, allowEstimates: false }),
});

const FitPolicySchema = z.object({
  targetPages: z.number().int().min(1).max(5).default(1),
  hardPageLimit: z.number().int().min(1).max(5).default(1),
  minFontPt: z.number().min(8).max(12).default(10.0),
  maxFontPt: z.number().min(10).max(14).default(11.5),
  minLineHeight: z.number().min(1.0).max(1.5).default(1.10),
  maxLineHeight: z.number().min(1.1).max(2.0).default(1.25),
  minSectionGapPt: z.number().int().min(0).max(20).default(6),
  maxSectionGapPt: z.number().int().min(5).max(30).default(10),
});

const SourceResumeSchema = z.object({
  pageCount: z.number().int().min(1).max(5),
  templateHint: z.enum(['standard', 'modern']).default('standard'),
  sectionsOrder: z.array(z.enum(['SUMMARY', 'SKILLS', 'EXPERIENCE', 'PROJECTS', 'EDUCATION'])).default([]),
});

const TargetRoleSchema = z.object({
  jobTitle: z.string().min(1),
  company: z.string().nullable(),
  location: z.string().nullable(),
});

const MetaSchema = z.object({
  schemaVersion: z.literal('1.0'),
  targetRole: TargetRoleSchema,
  sourceResume: SourceResumeSchema,
  fitPolicy: FitPolicySchema.default({
    targetPages: 1,
    hardPageLimit: 1,
    minFontPt: 10.0,
    maxFontPt: 11.5,
    minLineHeight: 1.10,
    maxLineHeight: 1.25,
    minSectionGapPt: 6,
    maxSectionGapPt: 10,
  }),
});

export const ResumeSchemaV1 = z.object({
  meta: MetaSchema,
  header: HeaderSchema,
  summary: SummarySchema,
  skills: SkillsSchema,
  experience: ExperienceSchema,
  projects: ProjectsSchema,
  education: EducationSchema,
  integrity: IntegritySchema.default({
    noFabrication: true,
    disallowNewClaims: true,
    requireEvidenceForMetrics: true,
    metricsPolicy: { allowIfProvided: true, allowEstimates: false },
  }),
});

export type ResumeV1 = z.infer<typeof ResumeSchemaV1>;
export type HeaderV1 = z.infer<typeof HeaderSchema>;
export type SummaryV1 = z.infer<typeof SummarySchema>;
export type SkillsV1 = z.infer<typeof SkillsSchema>;
export type ExperienceV1 = z.infer<typeof ExperienceSchema>;
export type ProjectsV1 = z.infer<typeof ProjectsSchema>;
export type EducationV1 = z.infer<typeof EducationSchema>;
export type BulletV1 = z.infer<typeof BulletSchema>;
export type ExperienceItemV1 = z.infer<typeof ExperienceItemSchema>;
export type ProjectItemV1 = z.infer<typeof ProjectItemSchema>;
export type EducationItemV1 = z.infer<typeof EducationItemSchema>;

/**
 * Validate a resume object against schema v1.0
 */
export function validateResumeV1(data: unknown): ResumeV1 {
  return ResumeSchemaV1.parse(data);
}

/**
 * Safely validate with error details
 */
export function safeValidateResumeV1(data: unknown): { success: true; data: ResumeV1 } | { success: false; error: z.ZodError } {
  const result = ResumeSchemaV1.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

