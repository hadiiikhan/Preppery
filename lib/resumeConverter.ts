/**
 * Converter utilities for resume schemas
 * Converts between old TailoredResume format and new ResumeV1 format
 */

import type { TailoredResume } from './tailoredResumeSchema';
import type { ResumeV1, BulletV1 } from './resumeSchemaV1';

/**
 * Convert priority string to integer (0-100)
 */
function priorityToInt(priority: 'high' | 'medium' | 'low'): number {
  switch (priority) {
    case 'high': return 95;
    case 'medium': return 75;
    case 'low': return 55;
    default: return 75;
  }
}

/**
 * Convert old TailoredResume to new ResumeV1 format
 */
export function convertToResumeV1(
  oldResume: TailoredResume,
  originalPageCount: number,
  roleTitle: string,
  companyName: string
): ResumeV1 {
  // Convert header
  const contactLines = oldResume.header.contact_lines;
  const emailCandidate = contactLines.find(line => line.includes('@')) ?? null;
  const normalizedEmailCandidate =
    typeof emailCandidate === 'string' ? emailCandidate.trim() : null;

  // Only keep a syntactically valid email address. The resume parser sometimes
  // captures "email-like" fragments that contain '@' but aren't valid addresses.
  const email =
    normalizedEmailCandidate &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmailCandidate)
      ? normalizedEmailCandidate
      : null;

  const phone = contactLines.find(line => /[\d\-\(\)\s]{10,}/.test(line)) || null;
  const links = contactLines
    .filter(line => line.includes('linkedin.com') || line.includes('github.com') || line.includes('http'))
    .map(line => {
      const url = line.includes('http') ? line : `https://${line}`;
      const label = line.includes('linkedin') ? 'LinkedIn' : line.includes('github') ? 'GitHub' : 'Portfolio';
      return {
        label,
        url,
        priority: label === 'GitHub' ? 90 : label === 'LinkedIn' ? 60 : 50,
      };
    });

  // Convert summary
  const summary = {
    enabled: true,
    priority: 85,
    style: '2-3-lines' as const,
    text: {
      value: oldResume.summary,
      shortenable: true,
      minChars: 140,
      maxChars: 300,
    },
  };

  // Convert skills
  const skillItems = oldResume.skills.groups.flatMap(group => 
    group.items.map(item => ({
      value: item,
      priority: 90, // Default high priority for skills
      mustKeep: false,
    }))
  );

  const skills = {
    priority: 90,
    groups: oldResume.skills.groups.map(group => ({
      label: group.label,
      priority: 90,
      items: group.items.map(item => ({
        value: item,
        priority: 90,
        mustKeep: false,
      })),
    })),
    constraints: {
      maxItemsTotal: 28,
      minItemsTotal: 12,
    },
  };

  // Convert experience
  const experience = {
    priority: 95,
    items: oldResume.experience.map(exp => ({
      priority: 95,
      company: exp.company,
      title: exp.title,
      location: exp.location || null,
      dateRange: `${exp.start} - ${exp.end}`,
      bullets: exp.bullets.map(bullet => ({
        priority: priorityToInt(bullet.priority),
        mustKeep: bullet.priority === 'high',
        shortenable: bullet.priority !== 'high',
        maxLinesPreferred: bullet.priority === 'high' ? 2 : 1,
        text: bullet.text,
        compressRules: bullet.priority === 'low' ? {
          maxChars: 100,
          aggressive: true,
        } : undefined,
      })),
      constraints: {
        maxBullets: 4,
        minBullets: 2,
      },
    })),
  };

  // Convert projects
  const projects = {
    priority: 92,
    items: oldResume.projects.map(project => ({
      priority: 92,
      name: project.name,
      link: project.link || null,
      stackLine: project.stack.length > 0 ? {
        value: project.stack.join(', '),
        shortenable: true,
        priority: 75,
      } : undefined,
      bullets: project.bullets.map(bullet => ({
        priority: priorityToInt(bullet.priority),
        mustKeep: bullet.priority === 'high',
        shortenable: bullet.priority !== 'high',
        maxLinesPreferred: bullet.priority === 'high' ? 2 : 1,
        text: bullet.text,
        compressRules: bullet.priority === 'low' ? {
          maxChars: 100,
          aggressive: true,
        } : undefined,
      })),
      constraints: {
        maxBullets: 3,
        minBullets: 2,
      },
    })),
    constraints: {
      maxProjects: 3,
      minProjects: 2,
    },
  };

  // Convert education
  const education = {
    priority: 70,
    items: oldResume.education.map(edu => ({
      priority: 70,
      school: edu.school,
      degree: edu.program,
      location: edu.location || null,
      dateRange: `${edu.start} - ${edu.end}`,
      details: edu.highlights.map((highlight, index) => ({
        priority: index === 0 ? 60 : 55,
        shortenable: index > 0,
        text: highlight,
      })),
    })),
  };

  return {
    meta: {
      schemaVersion: '1.0',
      targetRole: {
        jobTitle: roleTitle,
        company: companyName || null,
        location: null,
      },
      sourceResume: {
        pageCount: originalPageCount,
        templateHint: 'standard',
        sectionsOrder: ['SUMMARY', 'SKILLS', 'EXPERIENCE', 'PROJECTS', 'EDUCATION'],
      },
      fitPolicy: {
        targetPages: originalPageCount,
        hardPageLimit: originalPageCount,
        minFontPt: 10.0,
        maxFontPt: 11.5,
        minLineHeight: 1.10,
        maxLineHeight: 1.25,
        minSectionGapPt: 6,
        maxSectionGapPt: 10,
      },
    },
    header: {
      priority: 100,
      name: oldResume.header.name,
      contact: {
        phone,
        email,
        links,
      },
    },
    summary,
    skills,
    experience,
    projects,
    education,
    integrity: {
      noFabrication: oldResume.ats_checks.no_fake_claims,
      disallowNewClaims: true,
      requireEvidenceForMetrics: true,
      metricsPolicy: {
        allowIfProvided: true,
        allowEstimates: false,
      },
    },
  };
}

