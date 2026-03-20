/**
 * JSON Schema for Tailored Resume using OpenAI Structured Outputs
 * This enforces strict structure and prevents hallucinations
 */

export const TailoredResumeSchema = {
  name: "tailored_resume",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "meta",
      "header",
      "summary",
      "skills",
      "experience",
      "projects",
      "education",
      "ats_checks"
    ],
    properties: {
      meta: {
        type: "object",
        additionalProperties: false,
        required: ["target_role", "target_company", "seniority", "template"],
        properties: {
          target_role: { type: "string" },
          target_company: { type: "string" },
          seniority: { type: "string" },
          template: { type: "string", enum: ["standard_single_column", "modern_single_column"] }
        }
      },
      header: {
        type: "object",
        additionalProperties: false,
        required: ["name", "contact_lines"],
        properties: {
          name: { type: "string" },
          contact_lines: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 }
        }
      },
      summary: { type: "string", minLength: 40, maxLength: 420 },
      skills: {
        type: "object",
        additionalProperties: false,
        required: ["groups"],
        properties: {
          groups: {
            type: "array",
            minItems: 1,
            maxItems: 6,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "items"],
              properties: {
                label: { type: "string" },
                items: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 18 }
              }
            }
          }
        }
      },
      experience: {
        type: "array",
        minItems: 0,
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["company", "title", "location", "start", "end", "bullets"],
          properties: {
            company: { type: "string" },
            title: { type: "string" },
            location: { type: "string" },
            start: { type: "string" },
            end: { type: "string" },
            bullets: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["text", "priority"],
                properties: {
                  text: { type: "string" },
                  priority: { type: "string", enum: ["high", "medium", "low"] }
                }
              },
              minItems: 2,
              maxItems: 8
            }
          }
        }
      },
      projects: {
        type: "array",
        minItems: 0,
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "stack", "bullets"],
          properties: {
            name: { type: "string" },
            link: { type: "string" },
            stack: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 10 },
            bullets: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["text", "priority"],
                properties: {
                  text: { type: "string" },
                  priority: { type: "string", enum: ["high", "medium", "low"] }
                }
              },
              minItems: 2,
              maxItems: 8
            }
          }
        }
      },
      education: {
        type: "array",
        minItems: 1,
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["school", "program", "location", "start", "end", "highlights"],
          properties: {
            school: { type: "string" },
            program: { type: "string" },
            location: { type: "string" },
            start: { type: "string" },
            end: { type: "string" },
            highlights: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 6 }
          }
        }
      },
      ats_checks: {
        type: "object",
        additionalProperties: false,
        required: ["no_tables", "no_columns", "no_icons", "plain_bullets", "no_fake_claims", "notes"],
        properties: {
          no_tables: { type: "boolean" },
          no_columns: { type: "boolean" },
          no_icons: { type: "boolean" },
          plain_bullets: { type: "boolean" },
          no_fake_claims: { type: "boolean" },
          notes: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 8 }
        }
      }
    }
  }
} as const;

export type TailoredResume = {
  meta: {
    target_role: string;
    target_company: string;
    seniority: string;
    template: "standard_single_column" | "modern_single_column";
  };
  header: {
    name: string;
    contact_lines: string[];
  };
  summary: string;
  skills: {
    groups: Array<{
      label: string;
      items: string[];
    }>;
  };
  experience: Array<{
    company: string;
    title: string;
    location: string;
    start: string;
    end: string;
    bullets: Array<{
      text: string;
      priority: "high" | "medium" | "low";
    }>;
  }>;
  projects: Array<{
    name: string;
    link: string;
    stack: string[];
    bullets: Array<{
      text: string;
      priority: "high" | "medium" | "low";
    }>;
  }>;
  education: Array<{
    school: string;
    program: string;
    location: string;
    start: string;
    end: string;
    highlights: string[];
  }>;
  ats_checks: {
    no_tables: boolean;
    no_columns: boolean;
    no_icons: boolean;
    plain_bullets: boolean;
    no_fake_claims: boolean;
    notes: string[];
  };
  // Optional additional sections for preservation
  certifications?: string[];
  certificationDetails?: Array<{
    name: string;
    issuer: string;
    date: string;
  }>;
  awards?: string[];
  volunteerWork?: string[];
  publications?: string[];
};

