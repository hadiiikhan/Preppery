/**
 * Parse extracted resume text into a structured JSON format
 */

export interface ResumeSection {
  type: 'Summary' | 'Skills' | 'Projects' | 'Experience' | 'Education' | 'Certifications' | 'Other';
  title: string;
  items: ResumeItem[];
}

export interface ResumeItem {
  title?: string; // Job title, project name, degree, etc.
  organization?: string; // Company, school, etc.
  location?: string;
  dateRange?: string; // "2020 - 2023" or "Jan 2020 - Present"
  bullets: string[];
  description?: string; // For skills sections, this might be a list
}

export interface ResumeData {
  header: {
    name: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedIn?: string;
    website?: string;
  };
  summary?: string;
  sections: ResumeSection[];
}

export function parseResumeText(text: string): ResumeData {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  const resume: ResumeData = {
    header: { name: '' },
    sections: [],
  };

  // Extract header (first few lines before first section)
  let headerEndIndex = 0;
  if (lines.length > 0) {
    resume.header.name = lines[0];
    headerEndIndex = 1;
    
    // Collect contact info
    for (let i = 1; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      if (isSectionHeader(line)) break;
      
      // Try to extract contact info
      if (line.includes('@')) {
        resume.header.email = line;
      } else if (/[\d\-\(\)\s]{10,}/.test(line)) {
        resume.header.phone = line;
      } else if (line.toLowerCase().includes('linkedin')) {
        resume.header.linkedIn = line;
      } else if (line.includes('http') || line.includes('www.')) {
        resume.header.website = line;
      } else if (!resume.header.location && line.length < 50) {
        resume.header.location = line;
      }
      headerEndIndex = i + 1;
    }
  }

  // Extract summary if present
  let currentIndex = headerEndIndex;
  if (currentIndex < lines.length) {
    const nextLine = lines[currentIndex];
    if (isSummarySection(nextLine)) {
      currentIndex++;
      const summaryLines: string[] = [];
      while (currentIndex < lines.length && !isSectionHeader(lines[currentIndex])) {
        if (lines[currentIndex]) summaryLines.push(lines[currentIndex]);
        currentIndex++;
      }
      resume.summary = summaryLines.join(' ');
    }
  }

  // Parse sections
  let currentSection: ResumeSection | null = null;
  
  for (let i = currentIndex; i < lines.length; i++) {
    const line = lines[i];
    
    if (isSectionHeader(line)) {
      // Save previous section
      if (currentSection) {
        resume.sections.push(currentSection);
      }
      
      // Start new section
      const sectionType = detectSectionType(line);
      currentSection = {
        type: sectionType,
        title: line,
        items: [],
      };
    } else if (currentSection) {
      // Check if it's a new item (job, education, etc.)
      if (isItemHeader(line, currentSection.type)) {
        const item = parseItem(lines, i, currentSection.type);
        currentSection.items.push(item.item);
        i = item.nextIndex - 1; // -1 because loop will increment
      } else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        // Bullet point - add to last item or create a new one
        const bullet = line.substring(1).trim();
        if (currentSection.items.length > 0) {
          const lastItem = currentSection.items[currentSection.items.length - 1];
          lastItem.bullets.push(bullet);
        } else {
          // Create a new item for orphaned bullets
          currentSection.items.push({
            bullets: [bullet],
          });
        }
      } else if (line.length > 0 && !isSectionHeader(line)) {
        // Regular text - might be description or part of summary
        if (currentSection.items.length > 0) {
          const lastItem = currentSection.items[currentSection.items.length - 1];
          if (!lastItem.description) {
            lastItem.description = line;
          } else {
            lastItem.description += ' ' + line;
          }
        }
      }
    }
  }
  
  // Add last section
  if (currentSection) {
    resume.sections.push(currentSection);
  }

  return resume;
}

function isSectionHeader(line: string): boolean {
  const sectionKeywords = [
    'PROFESSIONAL SUMMARY', 'SUMMARY', 'OBJECTIVE', 'PROFILE',
    'EXPERIENCE', 'WORK EXPERIENCE', 'EMPLOYMENT', 'PROFESSIONAL EXPERIENCE',
    'EDUCATION', 'ACADEMIC',
    'SKILLS', 'TECHNICAL SKILLS', 'CORE COMPETENCIES',
    'PROJECTS', 'PERSONAL PROJECTS',
    'CERTIFICATIONS', 'CERTIFICATES', 'LICENSES',
    'AWARDS', 'ACHIEVEMENTS',
    'PUBLICATIONS', 'VOLUNTEER',
  ];
  
  const upperLine = line.toUpperCase();
  return sectionKeywords.some(keyword => upperLine.includes(keyword)) ||
    (line === line.toUpperCase() && line.length < 50 && !line.includes('•'));
}

function isSummarySection(line: string): boolean {
  const summaryKeywords = ['SUMMARY', 'PROFESSIONAL SUMMARY', 'OBJECTIVE', 'PROFILE'];
  return summaryKeywords.some(keyword => line.toUpperCase().includes(keyword));
}

function detectSectionType(header: string): ResumeSection['type'] {
  const upper = header.toUpperCase();
  if (upper.includes('EXPERIENCE') || upper.includes('EMPLOYMENT')) return 'Experience';
  if (upper.includes('EDUCATION') || upper.includes('ACADEMIC')) return 'Education';
  if (upper.includes('SKILL')) return 'Skills';
  if (upper.includes('PROJECT')) return 'Projects';
  if (upper.includes('CERTIFICAT') || upper.includes('LICENSE')) return 'Certifications';
  return 'Other';
}

function isItemHeader(line: string, sectionType: ResumeSection['type']): boolean {
  // For experience/education, look for title | company or title at company patterns
  if (sectionType === 'Experience' || sectionType === 'Education') {
    return line.includes('|') || 
           (line.length > 10 && line.length < 80 && !line.startsWith('•') && !line.startsWith('-'));
  }
  return false;
}

function parseItem(lines: string[], startIndex: number, sectionType: ResumeSection['type']): { item: ResumeItem; nextIndex: number } {
  const item: ResumeItem = { bullets: [] };
  let i = startIndex;
  const line = lines[i];
  
  // Parse title and organization
  if (line.includes('|')) {
    const parts = line.split('|').map(p => p.trim());
    item.title = parts[0];
    if (parts.length > 1) item.organization = parts[1];
  } else {
    item.title = line;
  }
  
  i++;
  
  // Next line might be date range or organization
  if (i < lines.length) {
    const nextLine = lines[i];
    if (/^\d{4}|\d{1,2}\/\d{4}|Present|Current/i.test(nextLine) || nextLine.includes('-')) {
      item.dateRange = nextLine;
      i++;
    } else if (!item.organization && nextLine.length < 60) {
      item.organization = nextLine;
      i++;
      // Date might be on next line
      if (i < lines.length && /^\d{4}|\d{1,2}\/\d{4}|Present|Current/i.test(lines[i])) {
        item.dateRange = lines[i];
        i++;
      }
    }
  }
  
  // Collect bullets until next item or section
  while (i < lines.length) {
    const currentLine = lines[i];
    if (isSectionHeader(currentLine) || isItemHeader(currentLine, sectionType)) {
      break;
    }
    if (currentLine.startsWith('•') || currentLine.startsWith('-') || currentLine.startsWith('*')) {
      item.bullets.push(currentLine.substring(1).trim());
    }
    i++;
  }
  
  return { item, nextIndex: i };
}

