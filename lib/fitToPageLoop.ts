/**
 * Fit-to-page loop for PDF export
 * Renders HTML, measures pages, iteratively adjusts layout
 */

import type { ResumeV1 } from './resumeSchemaV1';
import { compressBullet, compressSummary } from './compressResume';

export interface LayoutState {
  fontSize: number;
  lineHeight: number;
  sectionGap: number;
  paragraphSpacing: number;
  bulletSpacing: number;
}

export interface FitResult {
  resume: ResumeV1;
  layout: LayoutState;
  pageCount: number;
  overflow: boolean;
  iterations: number;
  warnings: string[];
}

/**
 * Measure page count by rendering HTML
 * This is a simplified measurement - in production you'd use a headless browser
 */
function measurePageCount(resume: ResumeV1, layout: LayoutState): number {
  // Estimate page count based on content length and layout
  // This is a heuristic - for accurate measurement, use headless browser
  
  let estimatedHeight = 0;
  const pageHeight = 792; // Letter size in points
  const margins = 72 * 2; // Top and bottom margins
  
  // Header
  estimatedHeight += layout.fontSize * 2 + layout.sectionGap;
  
  // Summary
  if (resume.summary.enabled && resume.summary.text.value) {
    const summaryLines = Math.ceil(resume.summary.text.value.length / 80);
    estimatedHeight += summaryLines * layout.fontSize * layout.lineHeight + layout.paragraphSpacing;
  }
  
  // Skills
  for (const group of resume.skills.groups) {
    const groupText = `${group.label}: ${group.items.map(i => i.value).join(', ')}`;
    const lines = Math.ceil(groupText.length / 80);
    estimatedHeight += lines * layout.fontSize * layout.lineHeight + layout.bulletSpacing;
  }
  estimatedHeight += layout.sectionGap;
  
  // Projects
  for (const project of resume.projects.items) {
    estimatedHeight += layout.fontSize * 1.2 + layout.paragraphSpacing; // Name
    if (project.stackLine) {
      estimatedHeight += layout.fontSize * layout.lineHeight;
    }
    for (const bullet of project.bullets) {
      const lines = Math.ceil(bullet.text.length / 80);
      estimatedHeight += lines * layout.fontSize * layout.lineHeight + layout.bulletSpacing;
    }
    estimatedHeight += layout.paragraphSpacing;
  }
  estimatedHeight += layout.sectionGap;
  
  // Experience
  for (const exp of resume.experience.items) {
    estimatedHeight += layout.fontSize * 1.2 * 2 + layout.paragraphSpacing; // Title + company + location
    for (const bullet of exp.bullets) {
      const lines = Math.ceil(bullet.text.length / 80);
      estimatedHeight += lines * layout.fontSize * layout.lineHeight + layout.bulletSpacing;
    }
    estimatedHeight += layout.paragraphSpacing;
  }
  estimatedHeight += layout.sectionGap;
  
  // Education
  for (const edu of resume.education.items) {
    estimatedHeight += layout.fontSize * 1.2 * 2 + layout.paragraphSpacing; // Degree + school
    for (const detail of edu.details) {
      const lines = Math.ceil(detail.text.length / 80);
      estimatedHeight += lines * layout.fontSize * layout.lineHeight + layout.bulletSpacing;
    }
    estimatedHeight += layout.paragraphSpacing;
  }
  
  const usableHeight = pageHeight - margins;
  const pageCount = Math.ceil(estimatedHeight / usableHeight);
  
  return Math.max(1, pageCount);
}

/**
 * Fit resume to target pages using iterative adjustments
 * CRITICAL: Never removes entire entries - only compresses bullets/lines
 * For 1-page targets: Aggressively compresses but keeps all entries
 * For 2+ page targets: Compresses with priority-based approach
 */
export function fitToPageLoop(
  resume: ResumeV1,
  targetPages: number,
  initialLayout: LayoutState
): FitResult {
  const fitPolicy = resume.meta.fitPolicy;
  let currentLayout: LayoutState = { ...initialLayout };
  let currentResume: ResumeV1 = JSON.parse(JSON.stringify(resume)); // Deep clone
  const warnings: string[] = [];
  let iterations = 0;
  const maxIterations = 20;
  
  // Log target pages for debugging
  console.log(`[FIT-TO-PAGE] Target pages: ${targetPages}, Initial entries: ${currentResume.experience.items.length} experience, ${currentResume.projects.items.length} projects`);
  
  // Ensure we never remove entire entries - validate initial state
  const initialExpCount = currentResume.experience.items.length;
  const initialProjCount = currentResume.projects.items.length;
  
  // Clamp initial layout to fit policy bounds
  currentLayout.fontSize = Math.max(
    fitPolicy.minFontPt,
    Math.min(fitPolicy.maxFontPt, currentLayout.fontSize)
  );
  currentLayout.lineHeight = Math.max(
    fitPolicy.minLineHeight,
    Math.min(fitPolicy.maxLineHeight, currentLayout.lineHeight)
  );
  currentLayout.sectionGap = Math.max(
    fitPolicy.minSectionGapPt,
    Math.min(fitPolicy.maxSectionGapPt, currentLayout.sectionGap)
  );
  
  while (iterations < maxIterations) {
    iterations++;
    
    // Measure current page count
    const pageCount = measurePageCount(currentResume, currentLayout);
    
    if (pageCount <= targetPages) {
      // Success! Fits within target
      return {
        resume: currentResume,
        layout: currentLayout,
        pageCount,
        overflow: false,
        iterations,
        warnings,
      };
    }
    
    // Still overflow - apply adjustments in priority order
    
    // Step 1: Tighten spacing/lineHeight/fontSize within bounds
    let adjusted = false;
    
    // Reduce section gap
    if (currentLayout.sectionGap > fitPolicy.minSectionGapPt) {
      currentLayout.sectionGap = Math.max(
        fitPolicy.minSectionGapPt,
        currentLayout.sectionGap - 1
      );
      adjusted = true;
    }
    
    // Reduce paragraph spacing
    if (currentLayout.paragraphSpacing > 2) {
      currentLayout.paragraphSpacing = Math.max(2, currentLayout.paragraphSpacing - 1);
      adjusted = true;
    }
    
    // Reduce bullet spacing
    if (currentLayout.bulletSpacing > 2) {
      currentLayout.bulletSpacing = Math.max(2, currentLayout.bulletSpacing - 1);
      adjusted = true;
    }
    
    // Reduce line height
    if (currentLayout.lineHeight > fitPolicy.minLineHeight) {
      currentLayout.lineHeight = Math.max(
        fitPolicy.minLineHeight,
        currentLayout.lineHeight - 0.02
      );
      adjusted = true;
    }
    
    // Reduce font size (last resort for typography)
    if (currentLayout.fontSize > fitPolicy.minFontPt) {
      currentLayout.fontSize = Math.max(
        fitPolicy.minFontPt,
        currentLayout.fontSize - 0.25
      );
      adjusted = true;
    }
    
    if (adjusted) {
      continue; // Re-measure with new layout
    }
    
    // Step 2: Reduce maxLines of low-priority bullets
    let reducedMaxLines = false;
    
    for (const exp of currentResume.experience.items) {
      for (const bullet of exp.bullets) {
        if (bullet.priority < 75 && bullet.maxLinesPreferred > 1 && !bullet.mustKeep) {
          bullet.maxLinesPreferred = Math.max(1, bullet.maxLinesPreferred - 1);
          // Compress bullet to fit fewer lines
          const maxChars = bullet.maxLinesPreferred * 80;
          if (bullet.text.length > maxChars) {
            bullet.text = compressBullet(
              bullet.text,
              maxChars,
              bullet.compressRules?.aggressive || false
            );
          }
          reducedMaxLines = true;
        }
      }
    }
    
    for (const project of currentResume.projects.items) {
      for (const bullet of project.bullets) {
        if (bullet.priority < 75 && bullet.maxLinesPreferred > 1 && !bullet.mustKeep) {
          bullet.maxLinesPreferred = Math.max(1, bullet.maxLinesPreferred - 1);
          // Compress bullet to fit fewer lines
          const maxChars = bullet.maxLinesPreferred * 80;
          if (bullet.text.length > maxChars) {
            bullet.text = compressBullet(
              bullet.text,
              maxChars,
              bullet.compressRules?.aggressive || false
            );
          }
          reducedMaxLines = true;
        }
      }
    }
    
    if (reducedMaxLines) {
      continue; // Re-measure
    }
    
    // Step 3: Compress bullets more aggressively (NEVER remove entire entries)
    // For 1-page targets, we compress bullets but never remove them below minBullets
    // For 2+ page targets, we can reduce bullets but still respect minBullets
    let compressedBullets = false;
    
    // Compress experience bullets more aggressively (priority-based)
    for (const exp of currentResume.experience.items) {
      // NEVER remove entire entry - always keep at least minBullets
      const minBulletsToKeep = exp.constraints.minBullets;
      
      // Sort bullets by priority (lowest first for compression)
      const sortedBullets = [...exp.bullets].sort((a, b) => a.priority - b.priority);
      
      for (let i = 0; i < sortedBullets.length; i++) {
        const bullet = sortedBullets[i];
        const originalIndex = exp.bullets.indexOf(bullet);
        
        // Only compress bullets that are not mustKeep and are shortenable
        // For 1-page: compress all bullets more aggressively
        // For 2+ pages: compress low-priority bullets more
        if (bullet.shortenable && !bullet.mustKeep) {
          const original = bullet.text;
          // More aggressive compression for lower priority bullets
          const compressionFactor = targetPages === 1 ? 0.7 : bullet.priority < 75 ? 0.8 : 0.9;
          const maxChars = Math.max(60, Math.floor(original.length * compressionFactor));
          
          const compressedText = compressBullet(original, maxChars, true);
          if (compressedText.length < original.length) {
            exp.bullets[originalIndex].text = compressedText;
            compressedBullets = true;
          }
        }
      }
      
      // If still too many bullets and we're not at minBullets, compress all bullets more
      if (exp.bullets.length > minBulletsToKeep && targetPages === 1) {
        for (const bullet of exp.bullets) {
          if (bullet.shortenable && !bullet.mustKeep) {
            const original = bullet.text;
            const maxChars = Math.max(50, Math.floor(original.length * 0.6));
            const compressedText = compressBullet(original, maxChars, true);
            if (compressedText.length < original.length) {
              bullet.text = compressedText;
              compressedBullets = true;
            }
          }
        }
      }
    }
    
    // Compress project bullets more aggressively (priority-based)
    for (const project of currentResume.projects.items) {
      // NEVER remove entire entry - always keep at least minBullets
      const minBulletsToKeep = project.constraints.minBullets;
      
      // Sort bullets by priority (lowest first for compression)
      const sortedBullets = [...project.bullets].sort((a, b) => a.priority - b.priority);
      
      for (let i = 0; i < sortedBullets.length; i++) {
        const bullet = sortedBullets[i];
        const originalIndex = project.bullets.indexOf(bullet);
        
        // Only compress bullets that are not mustKeep and are shortenable
        if (bullet.shortenable && !bullet.mustKeep) {
          const original = bullet.text;
          // More aggressive compression for lower priority bullets
          const compressionFactor = targetPages === 1 ? 0.7 : bullet.priority < 75 ? 0.8 : 0.9;
          const maxChars = Math.max(60, Math.floor(original.length * compressionFactor));
          
          const compressedText = compressBullet(original, maxChars, true);
          if (compressedText.length < original.length) {
            project.bullets[originalIndex].text = compressedText;
            compressedBullets = true;
          }
        }
      }
      
      // If still too many bullets and we're not at minBullets, compress all bullets more
      if (project.bullets.length > minBulletsToKeep && targetPages === 1) {
        for (const bullet of project.bullets) {
          if (bullet.shortenable && !bullet.mustKeep) {
            const original = bullet.text;
            const maxChars = Math.max(50, Math.floor(original.length * 0.6));
            const compressedText = compressBullet(original, maxChars, true);
            if (compressedText.length < original.length) {
              bullet.text = compressedText;
              compressedBullets = true;
            }
          }
        }
      }
    }
    
    if (compressedBullets) {
      continue; // Re-measure
    }
    
    // Step 4: Compress remaining content more aggressively
    let compressed = false;
    
    // Compress summary
    if (currentResume.summary.enabled && currentResume.summary.text.shortenable) {
      const original = currentResume.summary.text.value;
      const targetChars = Math.max(
        currentResume.summary.text.minChars,
        currentResume.summary.text.maxChars - 50
      );
      if (original.length > targetChars) {
        currentResume.summary.text.value = compressSummary(original, targetChars);
        compressed = true;
      }
    }
    
    // Compress low-priority bullets more aggressively
    for (const exp of currentResume.experience.items) {
      for (const bullet of exp.bullets) {
        if (bullet.priority < 75 && bullet.shortenable && !bullet.mustKeep) {
          const original = bullet.text;
          const maxChars = Math.max(60, original.length - 20);
          const compressedText = compressBullet(original, maxChars, true);
          if (compressedText.length < original.length) {
            bullet.text = compressedText;
            compressed = true;
          }
        }
      }
    }
    
    for (const project of currentResume.projects.items) {
      for (const bullet of project.bullets) {
        if (bullet.priority < 75 && bullet.shortenable && !bullet.mustKeep) {
          const original = bullet.text;
          const maxChars = Math.max(60, original.length - 20);
          const compressedText = compressBullet(original, maxChars, true);
          if (compressedText.length < original.length) {
            bullet.text = compressedText;
            compressed = true;
          }
        }
      }
    }
    
    if (compressed) {
      continue; // Re-measure
    }
    
    // No more adjustments possible
    break;
  }
  
  // Final measurement
  const finalPageCount = measurePageCount(currentResume, currentLayout);
  const overflow = finalPageCount > targetPages;
  
  // Verify we didn't remove any entire entries
  const finalExpCount = currentResume.experience.items.length;
  const finalProjCount = currentResume.projects.items.length;
  
  if (finalExpCount < initialExpCount) {
    warnings.push(`WARNING: Experience entries reduced from ${initialExpCount} to ${finalExpCount} (should not happen)`);
    console.error(`[FIT-TO-PAGE] ERROR: Experience entries were removed! ${initialExpCount} → ${finalExpCount}`);
  }
  
  if (finalProjCount < initialProjCount) {
    warnings.push(`WARNING: Project entries reduced from ${initialProjCount} to ${finalProjCount} (should not happen)`);
    console.error(`[FIT-TO-PAGE] ERROR: Project entries were removed! ${initialProjCount} → ${finalProjCount}`);
  }
  
  // Verify all entries have at least minBullets
  for (const exp of currentResume.experience.items) {
    if (exp.bullets.length < exp.constraints.minBullets) {
      warnings.push(`WARNING: Experience entry "${exp.company}" has ${exp.bullets.length} bullets, minimum is ${exp.constraints.minBullets}`);
      console.error(`[FIT-TO-PAGE] ERROR: Entry "${exp.company}" has fewer bullets than minimum!`);
    }
  }
  
  for (const project of currentResume.projects.items) {
    if (project.bullets.length < project.constraints.minBullets) {
      warnings.push(`WARNING: Project "${project.name}" has ${project.bullets.length} bullets, minimum is ${project.constraints.minBullets}`);
      console.error(`[FIT-TO-PAGE] ERROR: Project "${project.name}" has fewer bullets than minimum!`);
    }
  }
  
  if (overflow) {
    warnings.push(
      `Resume still overflows target (${finalPageCount} pages vs ${targetPages} target). ` +
      `Applied ${iterations} iterations of compression. All entries preserved.`
    );
  }
  
  console.log(`[FIT-TO-PAGE] Final: ${finalPageCount} pages, ${finalExpCount} experience entries, ${finalProjCount} projects, ${iterations} iterations`);
  
  return {
    resume: currentResume,
    layout: currentLayout,
    pageCount: finalPageCount,
    overflow,
    iterations,
    warnings,
  };
}

