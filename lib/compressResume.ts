/**
 * Compression utilities for resume content
 * Compresses content without removing meaning to fit page constraints
 */

export interface OptimizationLog {
  compressedBullets: number;
  removedBullets: number;
  shortenedSummary: boolean;
  compressedSkills: boolean;
}

/**
 * Compress a bullet point by removing filler words and tightening language
 */
export function compressBullet(bullet: string, maxLength: number = 130, aggressive: boolean = false): string {
  let compressed = bullet;
  
  // Remove common filler words/phrases
  const fillerPatterns = [
    /\b(highly|very|extremely|quite|rather|somewhat|fairly|pretty|really|quite)\s+/gi,
    /\b(successfully|effectively|efficiently)\s+/gi,
    /\b(in order to|so as to|for the purpose of)\s+/gi,
    /\b(a lot of|a number of|a variety of)\s+/gi,
    /\b(utilized|utilize)\s+/gi, // Replace with "used"
    /\b(utilization)\s+/gi, // Replace with "use"
  ];
  
  // More aggressive patterns for 1-page resumes
  if (aggressive) {
    fillerPatterns.push(
      /\b(that|which|who)\s+(was|were|is|are)\s+/gi,
      /\b(and|or)\s+(also|as well|too)\s+/gi,
      /\b(due to the fact that|because of the fact that)\s+/gi,
      /\b(at this point in time|at the present time)\s+/gi,
      /\b(in the event that|in case)\s+/gi
    );
  }
  
  for (const pattern of fillerPatterns) {
    compressed = compressed.replace(pattern, '');
  }
  
  // Replace verbose phrases with concise alternatives
  const replacements: [RegExp, string][] = [
    [/in order to/gi, 'to'],
    [/so as to/gi, 'to'],
    [/for the purpose of/gi, 'to'],
    [/utilized/gi, 'used'],
    [/utilization/gi, 'use'],
    [/a lot of/gi, 'many'],
    [/a number of/gi, 'many'],
    [/a variety of/gi, 'various'],
    [/in the process of/gi, ''],
    [/with the goal of/gi, 'to'],
    [/due to the fact that/gi, 'because'],
    [/at this point in time/gi, 'now'],
    [/in the event that/gi, 'if'],
  ];
  
  // More aggressive replacements
  if (aggressive) {
    replacements.push(
      [/that was/gi, ''],
      [/which was/gi, ''],
      [/and also/gi, 'and'],
      [/as well as/gi, 'and'],
      [/in addition to/gi, 'and'],
      [/with the use of/gi, 'using'],
      [/by means of/gi, 'using'],
    );
  }
  
  for (const [pattern, replacement] of replacements) {
    compressed = compressed.replace(pattern, replacement);
  }
  
  // Remove extra spaces
  compressed = compressed.replace(/\s+/g, ' ').trim();
  
  // If still too long, truncate intelligently (at sentence boundary if possible)
  if (compressed.length > maxLength) {
    const truncated = compressed.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastComma = truncated.lastIndexOf(',');
    const lastSpace = truncated.lastIndexOf(' ');
    
    // Prefer cutting at sentence boundary, then comma, then word boundary
    if (lastPeriod > maxLength * 0.7) {
      compressed = truncated.substring(0, lastPeriod + 1);
    } else if (lastComma > maxLength * 0.7) {
      compressed = truncated.substring(0, lastComma);
    } else if (lastSpace > maxLength * 0.7) {
      compressed = truncated.substring(0, lastSpace) + '...';
    } else {
      compressed = truncated + '...';
    }
  }
  
  return compressed;
}

/**
 * Compress summary text
 */
export function compressSummary(summary: string, maxLength: number = 300): string {
  if (summary.length <= maxLength) return summary;
  
  let compressed = summary;
  
  // Remove filler words
  compressed = compressed.replace(/\b(highly|very|extremely|quite|rather|somewhat|fairly|pretty|really)\s+/gi, '');
  
  // Remove extra spaces
  compressed = compressed.replace(/\s+/g, ' ').trim();
  
  // If still too long, truncate at sentence boundary
  if (compressed.length > maxLength) {
    const truncated = compressed.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    if (lastPeriod > maxLength * 0.7) {
      compressed = truncated.substring(0, lastPeriod + 1);
    } else {
      compressed = truncated + '...';
    }
  }
  
  return compressed;
}

/**
 * Compress skills by inlining stack items
 */
export function compressSkillsStack(stack: string[]): string {
  if (stack.length <= 3) {
    return stack.join(' • ');
  }
  // For longer stacks, show first 3 + count
  return stack.slice(0, 3).join(' • ') + ` (+${stack.length - 3} more)`;
}

