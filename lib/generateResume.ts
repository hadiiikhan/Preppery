import OpenAI from 'openai';
import type { TailoredResume } from './tailoredResumeSchema';

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables.');
  }
  return new OpenAI({
    apiKey: apiKey,
  });
}

/**
 * Generate a tailored resume using structured JSON schema
 * This approach prevents hallucinations and ensures high quality output
 */
export async function generateTailoredResumeJSON(params: {
  roleTitle: string;
  companyName: string;
  seniority: string;
  template: 'standard_single_column' | 'modern_single_column';
  jobDescription: string;
  resumeText: string;
  originalPageCount: number;
}): Promise<TailoredResume> {
  const openai = getOpenAIClient();
  
  // Truncate inputs if too long
  const maxResumeLength = 8000;
  const maxJobDescLength = 4000;
  
  const truncatedResume = params.resumeText.length > maxResumeLength
    ? params.resumeText.substring(0, maxResumeLength) + '... [truncated]'
    : params.resumeText;
  
  const truncatedJobDesc = params.jobDescription.length > maxJobDescLength
    ? params.jobDescription.substring(0, maxJobDescLength) + '... [truncated]'
    : params.jobDescription;

  const systemPrompt = `You are an expert resume editor for students and early-career roles.

Goal:
Create a tailored resume that matches the target job description while staying truthful to the candidate's existing resume.

CRITICAL RULES (must follow):
1. ROLE ALIGNMENT: The summary MUST match the actual skills, projects, and experience in the resume. If the resume shows software/AI/web projects, the summary should target software roles, NOT hardware/FPGA/other unrelated fields. Never claim a role type that isn't supported by the resume content.

2. NO INVENTIONS: Do NOT invent experience, projects, companies, degrees, certifications, tools, or metrics that are not supported by the original resume text.

3. BULLET IMPACT: Every bullet should follow: Action + What + Why/Impact. Add context about why it mattered or what outcome it supported. Example: "Processed orders accurately" → "Processed orders with high accuracy, supporting on-time fulfillment during peak hours."

4. SKILLS GROUPING: Group skills by category (Languages, Backend & APIs, Data & AI, DevOps & Tools) for better ATS performance. Do NOT just list them.

5. SECTION PRIORITY: For software/tech roles, prioritize PROJECTS over retail/work experience. Put the most relevant sections first based on the job description.

6. EDUCATION ENHANCEMENT: Include relevant coursework that matches the job description. Only include courses that are actually mentioned in the original resume.

7. CONSISTENCY: Use correct grammar (e.g., "Bachelor" not "Bachelors"). Use present tense for current roles, past tense for past roles.

8. ATS-FRIENDLY: Keep everything single-column. No tables, no columns, no icons, no fancy characters. Use plain bullets.

CRITICAL: You MUST return valid JSON with this exact structure:
{
  "meta": {
    "target_role": "string",
    "target_company": "string",
    "seniority": "string",
    "template": "standard_single_column"
  },
  "header": {
    "name": "string",
    "contact_lines": ["string", "string"]
  },
  "summary": "string (40-420 characters)",
  "skills": {
    "groups": [
      {
        "label": "string",
        "items": ["string", "string"]
      }
    ]
  },
  "experience": [
    {
      "company": "string",
      "title": "string",
      "location": "string",
      "start": "string",
      "end": "string",
      "bullets": [
        {
          "text": "string",
          "priority": "high" | "medium" | "low"
        }
      ]
    }
  ],
  "projects": [
    {
      "name": "string",
      "link": "string",
      "stack": ["string"],
      "bullets": [
        {
          "text": "string",
          "priority": "high" | "medium" | "low"
        }
      ]
    }
  ],
  "education": [
    {
      "school": "string",
      "program": "string",
      "location": "string",
      "start": "string",
      "end": "string",
      "highlights": ["string"]
    }
  ],
  "ats_checks": {
    "no_tables": true,
    "no_columns": true,
    "no_icons": true,
    "plain_bullets": true,
    "no_fake_claims": true,
    "notes": []
  }
}

Return ONLY this JSON structure. No markdown, no code blocks, no extra text.`;

  const userPrompt = `TARGET:
- Role: ${params.roleTitle}
- Company: ${params.companyName}
- Seniority: ${params.seniority}
- Template: ${params.template}

JOB DESCRIPTION:
${truncatedJobDesc}

ORIGINAL RESUME TEXT (source of truth):
${truncatedResume}

CRITICAL INSTRUCTIONS:
1. PAGE COUNT CONSTRAINT: The original resume is ${params.originalPageCount} page(s). The tailored resume MUST fit into the same number of pages when rendered in a standard single-column resume layout.

${params.originalPageCount === 1 ? `
CRITICAL FOR 1-PAGE RESUME:
- Keep ALL bullets to 80-100 characters maximum
- Limit to 2 bullets per project/experience entry
- Limit to 4 most relevant projects
- Limit to 3 most relevant experience entries
- Keep summary to 150-200 characters
- Be extremely concise - every word counts
- Prioritize impact and relevance over detail
` : ''}

2. COMPRESSION OVER REMOVAL: When targeting a ${params.originalPageCount}-page resume, prioritize COMPRESSION over removal:
   - Shorten bullets by removing filler words ("highly", "successfully", "very", "that was", "which was")
   - Remove unnecessary connectors ("and also", "as well as")
   - Use concise, impactful language
   - Keep bullets to ${params.originalPageCount === 1 ? '80-100' : '110-130'} characters when possible
   - Only remove bullets as a last resort, and only low-priority ones

3. BULLET PRIORITIES: Assign priorities to each bullet:
   - "high": Project bullets, tech experience, core achievements, quantifiable results
   - "medium": Relevant work experience, transferable skills, supporting details
   - "low": Retail/sales experience, unrelated work, generic tasks, repetitive content
   - For 1-page resumes: Only include high and medium priority bullets
   - Projects should have ${params.originalPageCount === 1 ? '2' : '2-3'} bullets maximum for 1-page, ${params.originalPageCount === 1 ? '' : 'preferably 3-4 for multi-page'}

4. DO NOT remove:
   - Entire sections
   - Primary project bullets (first bullet of each project)
   - Core skills
   - All bullets from an experience entry

2. SUMMARY ALIGNMENT: Analyze the resume content (projects, skills, experience). The summary MUST target a role type that matches what's actually in the resume. If the resume shows software/AI/web projects, the summary should target software engineering roles, NOT unrelated fields like hardware/FPGA.

3. BULLET IMPROVEMENT: Rewrite bullets to include impact/outcome. Format: Action + What + Why/Impact. Add context about why it mattered without inventing metrics. Make bullets more impactful while staying truthful. Keep bullets concise to fit page constraints.

4. SKILLS GROUPING: Group skills into categories like:
   - Languages: [programming languages]
   - Backend & APIs: [backend frameworks, APIs]
   - Data & AI: [data science, ML libraries]
   - DevOps & Tools: [version control, deployment tools]
   This improves ATS performance significantly.

5. SECTION ORDER: For software/tech roles, prioritize PROJECTS over retail/work experience. Order sections by relevance to the job: Summary → Skills → Projects → Experience → Education.

6. EDUCATION: Include relevant coursework that matches the job description. Only include courses mentioned in the original resume.

7. BULLET QUALITY: Each bullet should be specific, action-oriented, and show impact. Avoid generic descriptions. Add context about outcomes when possible.

8. Ensure ats_checks booleans reflect compliance and list any potential issues in ats_checks.notes.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2, // Low temperature for stable, factual output
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.error('OpenAI response structure:', JSON.stringify(completion, null, 2));
      throw new Error('No content in OpenAI response');
    }

    // Parse JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('JSON parse error:', e);
      console.error('Response content:', content.substring(0, 500));
      throw new Error(`Invalid JSON in OpenAI response: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    // Log the actual response structure for debugging
    console.log('OpenAI response keys:', Object.keys(parsed));
    console.log('OpenAI response structure:', JSON.stringify(parsed, null, 2).substring(0, 2000));

    // Build response with defaults for missing fields
    const result: TailoredResume = {
      meta: parsed.meta || {
        target_role: params.roleTitle,
        target_company: params.companyName,
        seniority: params.seniority,
        template: params.template,
      },
      header: parsed.header || {
        name: 'Your Name',
        contact_lines: [],
      },
      summary: parsed.summary || 'Professional summary will be generated here.',
      skills: parsed.skills || { groups: [] },
      experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      education: Array.isArray(parsed.education) ? parsed.education : [],
      ats_checks: parsed.ats_checks || {
        no_tables: true,
        no_columns: true,
        no_icons: true,
        plain_bullets: true,
        no_fake_claims: true,
        notes: [],
      },
    };

    // Ensure nested structures exist
    if (!result.skills.groups || !Array.isArray(result.skills.groups)) {
      result.skills.groups = [];
    }
    if (!result.header.contact_lines || !Array.isArray(result.header.contact_lines)) {
      result.header.contact_lines = [];
    }
    if (!result.ats_checks.notes || !Array.isArray(result.ats_checks.notes)) {
      result.ats_checks.notes = [];
    }

    // Validate that we have at least some content
    if (!result.header.name || result.header.name === 'Your Name') {
      // Try to extract name from resume text
      const nameMatch = params.resumeText.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/m);
      if (nameMatch) {
        result.header.name = nameMatch[1];
      }
    }

    // Validate summary alignment with resume content
    const resumeLower = params.resumeText.toLowerCase();
    const summaryLower = result.summary.toLowerCase();
    
    // Check for role mismatch (e.g., claiming FPGA when resume is software-focused)
    const hardwareKeywords = ['fpga', 'hardware', 'verification', 'circuit', 'embedded systems'];
    const softwareKeywords = ['software', 'web', 'application', 'api', 'backend', 'frontend', 'mobile', 'ai', 'machine learning', 'python', 'javascript', 'java'];
    
    const hasHardwareInResume = hardwareKeywords.some(kw => resumeLower.includes(kw));
    const hasSoftwareInResume = softwareKeywords.some(kw => resumeLower.includes(kw));
    const claimsHardwareInSummary = hardwareKeywords.some(kw => summaryLower.includes(kw));
    const claimsSoftwareInSummary = softwareKeywords.some(kw => summaryLower.includes(kw));
    
    if (claimsHardwareInSummary && !hasHardwareInResume && hasSoftwareInResume) {
      console.warn('Warning: Summary claims hardware role but resume is software-focused. Consider adjusting summary.');
      // Add note to ATS checks
      if (!result.ats_checks.notes) result.ats_checks.notes = [];
      result.ats_checks.notes.push('Summary may need adjustment to match resume content');
    }

    if (result.experience.length === 0 && result.education.length === 0) {
      console.warn('Warning: Resume has no experience or education entries');
    }

    // Ensure skills are properly grouped
    if (result.skills.groups.length === 0 && result.experience.length > 0) {
      // Try to extract skills from experience and projects
      const allText = params.resumeText.toLowerCase();
      const commonSkills: string[] = [];
      const skillKeywords = ['python', 'java', 'javascript', 'react', 'node', 'sql', 'git', 'docker', 'aws', 'spring', 'pandas', 'numpy'];
      
      skillKeywords.forEach(skill => {
        if (allText.includes(skill.toLowerCase())) {
          commonSkills.push(skill);
        }
      });
      
      if (commonSkills.length > 0) {
        result.skills.groups = [{
          label: 'Technical Skills',
          items: commonSkills,
        }];
      }
    }

    return result;
  } catch (error) {
    console.error('Error generating tailored resume:', error);
    
    // Handle OpenAI API errors specifically
    if (error && typeof error === 'object' && 'status' in error) {
      const apiError = error as any;
      if (apiError.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.');
      } else if (apiError.status === 401) {
        throw new Error('OpenAI API authentication failed. Please check your API key.');
      } else if (apiError.status === 500) {
        throw new Error('OpenAI API server error. Please try again.');
      } else if (apiError.message) {
        throw new Error(`OpenAI API error: ${apiError.message}`);
      }
    }
    
    throw new Error(
      `Failed to generate tailored resume: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

