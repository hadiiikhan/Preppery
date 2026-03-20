#!/usr/bin/env node
/**
 * @deprecated Resume tailoring via Resume Optimizer Pro is no longer used.
 *
 * Use Claude instead:
 * - `lib/claudeTailoredResume.ts` — `generateTailoredResumeWithClaude()`
 * - `POST /api/generate-resume` — JSON body `{ baseResume, jobDescription, instructions? }`
 * - Env: `ANTHROPIC_API_KEY` (optional `ANTHROPIC_RESUME_MODEL`)
 *
 * DOCX/PDF export should run on the tailored text returned by that API (existing converters in `lib/`).
 */

console.error(`
[DEPRECATED] scripts/optimize-resume-docx.mjs

This script previously called resumeoptimizerpro.com. Tailoring now uses Anthropic Claude.

POST /api/generate-resume with { "baseResume": "...", "jobDescription": "..." }
Set ANTHROPIC_API_KEY in your environment (e.g. .env.local).

This script exits without calling any external optimizer.
`);
process.exit(1);
