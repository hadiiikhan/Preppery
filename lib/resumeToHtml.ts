/**
 * Convert ResumeV1 to HTML for debugging and safe mode export
 */

import type { ResumeV1 } from './resumeSchemaV1';

export interface HtmlRenderOptions {
  safeMode?: boolean;
  minimalCss?: boolean;
  useBuiltInFonts?: boolean;
}

/**
 * Generate HTML from ResumeV1
 */
export function resumeToHtml(resume: ResumeV1, options: HtmlRenderOptions = {}): string {
  const { safeMode = false, minimalCss = false, useBuiltInFonts = true } = options;
  
  const css = safeMode || minimalCss
    ? getMinimalCss(useBuiltInFonts)
    : getFullCss(useBuiltInFonts);
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${resume.header.name} - Resume</title>
  <style>
    ${css}
  </style>
</head>
<body>
  ${renderHeader(resume)}
  ${renderSummary(resume)}
  ${renderSkills(resume)}
  ${renderProjects(resume)}
  ${renderExperience(resume)}
  ${renderEducation(resume)}
</body>
</html>`;
  
  return html;
}

function getMinimalCss(useBuiltInFonts: boolean): string {
  const fontFamily = useBuiltInFonts 
    ? 'Arial, Helvetica, sans-serif'
    : 'system-ui, -apple-system, sans-serif';
  
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: ${fontFamily};
      font-size: 10pt;
      line-height: 1.2;
      color: #000;
      background: #fff;
      padding: 72pt;
      max-width: 8.5in;
      margin: 0 auto;
    }
    h1 {
      font-size: 24pt;
      font-weight: bold;
      margin-bottom: 8pt;
    }
    h2 {
      font-size: 14pt;
      font-weight: bold;
      margin-top: 20pt;
      margin-bottom: 8pt;
      border-bottom: 1px solid #ccc;
      padding-bottom: 4pt;
    }
    p {
      margin-bottom: 8pt;
    }
    ul {
      list-style: none;
      padding-left: 0;
    }
    li {
      margin-bottom: 4pt;
      padding-left: 12pt;
      position: relative;
    }
    li:before {
      content: "•";
      position: absolute;
      left: 0;
    }
    .contact {
      font-size: 10pt;
      color: #333;
      margin-bottom: 16pt;
    }
    .section {
      margin-bottom: 16pt;
    }
    .entry {
      margin-bottom: 12pt;
    }
    .entry-title {
      font-weight: bold;
      font-size: 12pt;
    }
    .entry-meta {
      font-size: 10pt;
      color: #666;
      margin-bottom: 4pt;
    }
  `;
}

function getFullCss(useBuiltInFonts: boolean): string {
  const fontFamily = useBuiltInFonts 
    ? 'Arial, Helvetica, sans-serif'
    : 'system-ui, -apple-system, sans-serif';
  
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    @page {
      size: letter;
      margin: 1in;
    }
    body {
      font-family: ${fontFamily};
      font-size: 10pt;
      line-height: 1.25;
      color: #000;
      background: #fff;
      padding: 72pt;
      max-width: 8.5in;
      margin: 0 auto;
    }
    h1 {
      font-size: 24pt;
      font-weight: bold;
      margin-bottom: 8pt;
      color: #000;
    }
    h2 {
      font-size: 14pt;
      font-weight: bold;
      margin-top: 20pt;
      margin-bottom: 12pt;
      border-bottom: 0.5pt solid #666;
      padding-bottom: 4pt;
      color: #000;
    }
    p {
      margin-bottom: 8pt;
    }
    ul {
      list-style: none;
      padding-left: 0;
    }
    li {
      margin-bottom: 4pt;
      padding-left: 12pt;
      position: relative;
    }
    li:before {
      content: "•";
      position: absolute;
      left: 0;
      font-weight: bold;
    }
    .contact {
      font-size: 10pt;
      color: #333;
      margin-bottom: 16pt;
    }
    .section {
      margin-bottom: 16pt;
    }
    .entry {
      margin-bottom: 12pt;
    }
    .entry-title {
      font-weight: bold;
      font-size: 12pt;
      margin-bottom: 2pt;
    }
    .entry-meta {
      font-size: 10pt;
      color: #666;
      margin-bottom: 4pt;
    }
    .stack {
      font-size: 10pt;
      color: #666;
      margin-bottom: 4pt;
    }
  `;
}

function renderHeader(resume: ResumeV1): string {
  const contactParts: string[] = [];
  if (resume.header.contact.phone) contactParts.push(resume.header.contact.phone);
  if (resume.header.contact.email) contactParts.push(resume.header.contact.email);
  resume.header.contact.links.forEach(link => contactParts.push(link.url));
  
  return `
    <header>
      <h1>${escapeHtml(resume.header.name)}</h1>
      <div class="contact">${contactParts.map(p => escapeHtml(p)).join(' • ')}</div>
    </header>
  `;
}

function renderSummary(resume: ResumeV1): string {
  if (!resume.summary.enabled || !resume.summary.text.value) return '';
  
  return `
    <section class="section">
      <p>${escapeHtml(resume.summary.text.value)}</p>
    </section>
  `;
}

function renderSkills(resume: ResumeV1): string {
  if (resume.skills.groups.length === 0) return '';
  
  const groupsHtml = resume.skills.groups.map(group => {
    const items = group.items.map(item => escapeHtml(item.value)).join(', ');
    return `<p><strong>${escapeHtml(group.label)}:</strong> ${items}</p>`;
  }).join('\n');
  
  return `
    <section class="section">
      <h2>SKILLS</h2>
      ${groupsHtml}
    </section>
  `;
}

function renderProjects(resume: ResumeV1): string {
  if (resume.projects.items.length === 0) return '';
  
  const projectsHtml = resume.projects.items.map(project => {
    const linkHtml = project.link 
      ? ` (<a href="${escapeHtml(project.link)}">${escapeHtml(project.link)}</a>)`
      : '';
    const stackHtml = project.stackLine 
      ? `<div class="stack">Stack: ${escapeHtml(project.stackLine.value)}</div>`
      : '';
    const bulletsHtml = project.bullets.map(bullet => 
      `<li>${escapeHtml(bullet.text)}</li>`
    ).join('\n');
    
    return `
      <div class="entry">
        <div class="entry-title">${escapeHtml(project.name)}${linkHtml}</div>
        ${stackHtml}
        <ul>${bulletsHtml}</ul>
      </div>
    `;
  }).join('\n');
  
  return `
    <section class="section">
      <h2>PROJECTS</h2>
      ${projectsHtml}
    </section>
  `;
}

function renderExperience(resume: ResumeV1): string {
  if (resume.experience.items.length === 0) return '';
  
  const experienceHtml = resume.experience.items.map(exp => {
    const locationHtml = exp.location ? ` • ${escapeHtml(exp.location)}` : '';
    const metaHtml = `${escapeHtml(exp.company)}${locationHtml} • ${escapeHtml(exp.dateRange)}`;
    const bulletsHtml = exp.bullets.map(bullet => 
      `<li>${escapeHtml(bullet.text)}</li>`
    ).join('\n');
    
    return `
      <div class="entry">
        <div class="entry-title">${escapeHtml(exp.title)}</div>
        <div class="entry-meta">${metaHtml}</div>
        <ul>${bulletsHtml}</ul>
      </div>
    `;
  }).join('\n');
  
  return `
    <section class="section">
      <h2>PROFESSIONAL EXPERIENCE</h2>
      ${experienceHtml}
    </section>
  `;
}

function renderEducation(resume: ResumeV1): string {
  if (resume.education.items.length === 0) return '';
  
  const educationHtml = resume.education.items.map(edu => {
    const locationHtml = edu.location ? ` • ${escapeHtml(edu.location)}` : '';
    const metaHtml = `${escapeHtml(edu.school)}${locationHtml} • ${escapeHtml(edu.dateRange)}`;
    const detailsHtml = edu.details.length > 0
      ? `<ul>${edu.details.map(d => `<li>${escapeHtml(d.text)}</li>`).join('\n')}</ul>`
      : '';
    
    return `
      <div class="entry">
        <div class="entry-title">${escapeHtml(edu.degree)}</div>
        <div class="entry-meta">${metaHtml}</div>
        ${detailsHtml}
      </div>
    `;
  }).join('\n');
  
  return `
    <section class="section">
      <h2>EDUCATION</h2>
      ${educationHtml}
    </section>
  `;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

