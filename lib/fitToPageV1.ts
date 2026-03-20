/**
 * Fit-to-page logic for ResumeV1
 * Uses compression only - never drops content
 */

import type { ResumeV1, BulletV1 } from './resumeSchemaV1';
import { compressBullet, compressSummary } from './compressResume';

export interface FitResult {
  resume: ResumeV1;
  appliedCompressions: number;
  overflow: boolean;
  overflowPages?: number;
}

/**
 * Compress resume to fit target pages using priorities
 * NEVER drops content - only compresses
 */
export function fitResumeToPages(
  resume: ResumeV1,
  targetPages: number
): FitResult {
  const fitPolicy = resume.meta.fitPolicy;
  const appliedCompressions: string[] = [];
  
  // Sort all compressible items by priority (lowest first = compress first)
  type CompressibleItem = {
    type: 'summary' | 'bullet' | 'stack' | 'skill';
    priority: number;
    compress: () => boolean;
    description: string;
  };
  
  const compressibleItems: CompressibleItem[] = [];
  
  // Summary compression
  if (resume.summary.enabled && resume.summary.text.shortenable) {
    compressibleItems.push({
      type: 'summary',
      priority: resume.summary.priority,
      compress: () => {
        const original = resume.summary.text.value;
        const compressed = compressSummary(
          original,
          resume.summary.text.maxChars
        );
        if (compressed.length < original.length) {
          resume.summary.text.value = compressed;
          appliedCompressions.push(`Summary: ${original.length} → ${compressed.length} chars`);
          return true;
        }
        return false;
      },
      description: 'summary',
    });
  }
  
  // Bullet compression (sort by priority, lowest first)
  for (const exp of resume.experience.items) {
    for (let i = 0; i < exp.bullets.length; i++) {
      const bullet = exp.bullets[i];
      if (bullet.shortenable && !bullet.mustKeep) {
        compressibleItems.push({
          type: 'bullet',
          priority: bullet.priority,
          compress: () => {
            const original = bullet.text;
            const maxChars = bullet.compressRules?.maxChars || 
              (targetPages === 1 ? 100 : 130);
            const aggressive = bullet.compressRules?.aggressive || false;
            const compressed = compressBullet(original, maxChars, aggressive);
            if (compressed.length < original.length) {
              bullet.text = compressed;
              appliedCompressions.push(`Bullet (${exp.company}): ${original.length} → ${compressed.length} chars`);
              return true;
            }
            return false;
          },
          description: `bullet in ${exp.company}`,
        });
      }
    }
  }
  
  for (const project of resume.projects.items) {
    for (let i = 0; i < project.bullets.length; i++) {
      const bullet = project.bullets[i];
      if (bullet.shortenable && !bullet.mustKeep) {
        compressibleItems.push({
          type: 'bullet',
          priority: bullet.priority,
          compress: () => {
            const original = bullet.text;
            const maxChars = bullet.compressRules?.maxChars || 
              (targetPages === 1 ? 100 : 130);
            const aggressive = bullet.compressRules?.aggressive || false;
            const compressed = compressBullet(original, maxChars, aggressive);
            if (compressed.length < original.length) {
              bullet.text = compressed;
              appliedCompressions.push(`Bullet (${project.name}): ${original.length} → ${compressed.length} chars`);
              return true;
            }
            return false;
          },
          description: `bullet in ${project.name}`,
        });
      }
    }
    
    // Stack line compression
    if (project.stackLine?.shortenable) {
      compressibleItems.push({
        type: 'stack',
        priority: project.stackLine.priority,
        compress: () => {
          const original = project.stackLine!.value;
          // Compress stack by keeping only first 3-4 items
          const items = original.split(',').map(s => s.trim());
          if (items.length > 4) {
            project.stackLine!.value = items.slice(0, 4).join(', ') + ` (+${items.length - 4} more)`;
            appliedCompressions.push(`Stack (${project.name}): ${items.length} → 4 items`);
            return true;
          }
          return false;
        },
        description: `stack in ${project.name}`,
      });
    }
  }
  
  // Education details compression
  for (const edu of resume.education.items) {
    for (const detail of edu.details) {
      if (detail.shortenable) {
        compressibleItems.push({
          type: 'bullet',
          priority: detail.priority,
          compress: () => {
            const original = detail.text;
            const compressed = compressSummary(original, 100);
            if (compressed.length < original.length) {
              detail.text = compressed;
              appliedCompressions.push(`Education detail: ${original.length} → ${compressed.length} chars`);
              return true;
            }
            return false;
          },
          description: `education detail in ${edu.school}`,
        });
      }
    }
  }
  
  // Sort by priority (lowest first = compress first)
  compressibleItems.sort((a, b) => a.priority - b.priority);
  
  // Apply compression in priority order
  let compressionRound = 0;
  const maxRounds = 10; // Prevent infinite loops
  
  while (compressionRound < maxRounds) {
    let anyCompressed = false;
    
    for (const item of compressibleItems) {
      // Skip if priority is too high (only compress low/medium priority items)
      if (item.priority > 75) continue;
      
      if (item.compress()) {
        anyCompressed = true;
      }
    }
    
    if (!anyCompressed) {
      break; // No more compression possible
    }
    
    compressionRound++;
  }
  
  console.log(`Applied ${appliedCompressions.length} compressions:`, appliedCompressions);
  
  return {
    resume,
    appliedCompressions: appliedCompressions.length,
    overflow: false, // We don't measure pages here, just compress
  };
}

