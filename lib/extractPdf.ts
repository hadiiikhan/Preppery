/**
 * Extract text, page count, and formatting metadata from PDF file
 * Uses pdf2json which is designed for Node.js and doesn't require DOM APIs
 */

export interface PdfFormatting {
  // Font information
  fonts: {
    header?: { family: string; size: number; bold: boolean };
    sectionHeader?: { family: string; size: number; bold: boolean };
    body?: { family: string; size: number; bold: boolean };
    contact?: { family: string; size: number; bold: boolean };
  };
  // Spacing
  spacing: {
    lineHeight: number; // Multiplier (e.g., 1.2 means 20% extra spacing)
    sectionSpacing: number; // Space between sections in points
    bulletSpacing: number; // Space between bullets in points
    paragraphSpacing: number; // Space between paragraphs in points
  };
  // Margins
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  // Colors (RGB values 0-1)
  colors: {
    text: { r: number; g: number; b: number };
    sectionHeader: { r: number; g: number; b: number };
    contact: { r: number; g: number; b: number };
  };
  // Page dimensions
  pageSize: {
    width: number;
    height: number;
  };
}

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  formatting?: PdfFormatting;
}

export async function extractPdfText(file: File): Promise<string> {
  const result = await extractPdfTextAndPageCount(file);
  return result.text;
}

export async function extractPdfTextAndPageCount(file: File): Promise<PdfExtractionResult> {
  if (file.type !== 'application/pdf') {
    throw new Error('File must be a PDF');
  }
  
  try {
    // Use pdf2json which is a pure Node.js library
    const PDFParser = (await import('pdf2json')).default;
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser(null, true);
      
      pdfParser.on('pdfParser_dataError', (err: Error) => {
        reject(new Error(`PDF parsing error: ${err.message}`));
      });
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Get page count
          const pageCount = pdfData.Pages ? pdfData.Pages.length : 0;
          
          // Extract text and formatting from all pages
          let fullText = '';
          const textElements: Array<{
            text: string;
            x: number;
            y: number;
            font: string;
            size: number;
            color?: { r: number; g: number; b: number };
            bold?: boolean;
          }> = [];
          
          // Get page dimensions (pdf2json can report in points or inches depending on source)
          // We normalize to PDF points (1 inch = 72 points).
          let pageWidth = 612; // Default letter width (points)
          let pageHeight = 792; // Default letter height (points)
          let coordScale = 1; // scale factor to convert coordinates into points
          
          if (pdfData.Pages && pdfData.Pages.length > 0) {
            const firstPage = pdfData.Pages[0];
            if (firstPage.Width && firstPage.Height) {
              pageWidth = firstPage.Width;
              pageHeight = firstPage.Height;
              // Heuristic: if values look like inches (e.g. 8.5 x 11), scale up.
              if (pageWidth > 0 && pageWidth < 50 && pageHeight > 0 && pageHeight < 50) {
                coordScale = 72;
                pageWidth = pageWidth * coordScale;
                pageHeight = pageHeight * coordScale;
              }
            }
            
            for (const page of pdfData.Pages) {
              if (page.Texts && page.Texts.length > 0) {
                for (const text of page.Texts) {
                  if (text.R && text.R.length > 0) {
                    for (const run of text.R) {
                      if (run.T) {
                        // Decode URI-encoded text, with error handling
                        let decoded: string;
                        try {
                          decoded = decodeURIComponent(run.T);
                        } catch (e) {
                          decoded = run.T;
                        }
                        fullText += decoded + ' ';
                        
                        // Extract formatting information from pdf2json structure
                        // pdf2json TS array: [fontSize, fontName, ...] or [fontSize, ...]
                        // Position is in text.x and text.y
                        const rawX = typeof text.x === 'number' ? text.x : 0;
                        const rawY = typeof text.y === 'number' ? text.y : 0;
                        const x = rawX * coordScale;
                        const y = rawY * coordScale;
                        
                        // Extract font size and name from TS array or text properties
                        let fontSize = 10;
                        let fontName = 'Helvetica';
                        
                        if (run.TS && Array.isArray(run.TS) && run.TS.length > 0) {
                          // TS[0] is usually fontSize
                          fontSize = typeof run.TS[0] === 'number' ? run.TS[0] : 10;
                          // TS[1] might be fontName if present
                          if (run.TS.length > 1 && typeof run.TS[1] === 'string') {
                            fontName = run.TS[1];
                          }
                        }
                        
                        // Fallback to text-level properties if available
                        if (text.size && typeof text.size === 'number') {
                          fontSize = text.size;
                        }
                        if (text.font && typeof text.font === 'string') {
                          fontName = text.font;
                        }
                        
                        // Extract color if available
                        // pdf2json may have color in text.clr or text.sw (stroke width/color)
                        let color: { r: number; g: number; b: number } | undefined;
                        if (text.clr && Array.isArray(text.clr) && text.clr.length >= 3) {
                          // Color values in pdf2json are typically 0-1 range
                          const r = typeof text.clr[0] === 'number' ? Math.max(0, Math.min(1, text.clr[0])) : 0;
                          const g = typeof text.clr[1] === 'number' ? Math.max(0, Math.min(1, text.clr[1])) : 0;
                          const b = typeof text.clr[2] === 'number' ? Math.max(0, Math.min(1, text.clr[2])) : 0;
                          if (r > 0 || g > 0 || b > 0) {
                            color = { r, g, b };
                          }
                        }
                        
                        // Detect bold (font name usually contains "Bold", "bold", "Black", etc.)
                        const fontNameLower = fontName.toLowerCase();
                        const isBold = fontNameLower.includes('bold') || 
                                      fontNameLower.includes('black') ||
                                      fontNameLower.includes('heavy') ||
                                      fontNameLower.includes('semibold') ||
                                      fontNameLower.includes('demibold');
                        
                        textElements.push({
                          text: decoded,
                          x,
                          y,
                          font: fontName,
                          size: fontSize,
                          color,
                          bold: isBold,
                        });
                      }
                    }
                  }
                }
                fullText += '\n';
              }
            }
          }
          
          const trimmedText = fullText.trim();
          if (!trimmedText || trimmedText.length === 0) {
            reject(new Error('No text found in PDF'));
            return;
          }
          
          // Analyze formatting from text elements
          const formatting = analyzeFormatting(textElements, pageWidth, pageHeight);
          
          resolve({ text: trimmedText, pageCount, formatting });
        } catch (error) {
          reject(new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      });
      
      pdfParser.parseBuffer(buffer);
    });
  } catch (error) {
    console.error('PDF extraction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract PDF text: ${errorMessage}`);
  }
}

/**
 * Analyze text elements to extract formatting patterns
 */
function analyzeFormatting(
  textElements: Array<{
    text: string;
    x: number;
    y: number;
    font: string;
    size: number;
    color?: { r: number; g: number; b: number };
    bold?: boolean;
  }>,
  pageWidth: number,
  pageHeight: number
): PdfFormatting {
  if (textElements.length === 0) {
    // Return default formatting
    return getDefaultFormatting(pageWidth, pageHeight);
  }
  
  // Filter out invalid elements
  const validElements = textElements.filter(e => 
    e.text && 
    typeof e.x === 'number' && 
    typeof e.y === 'number' && 
    typeof e.size === 'number' && 
    e.size > 0
  );
  
  if (validElements.length === 0) {
    return getDefaultFormatting(pageWidth, pageHeight);
  }
  
  // Sort by Y position (top to bottom - higher Y is top)
  const sortedElements = [...validElements].sort((a, b) => b.y - a.y);
  
  // Analyze header (usually first few elements, largest font, bold)
  const headerElements = sortedElements.slice(0, Math.min(5, sortedElements.length));
  const headerFontSize = Math.max(...headerElements.map(e => e.size));
  const headerElement = headerElements.find(e => e.size === headerFontSize) || headerElements[0];
  
  // Analyze section headers (usually all caps, bold, medium size)
  const sectionHeaders = sortedElements.filter(e => {
    const text = e.text.trim();
    return text === text.toUpperCase() && 
           text.length < 50 && 
           text.length > 3 &&
           e.size >= 10 &&
           e.size <= 18;
  });
  const sectionHeaderElement = sectionHeaders.length > 0 ? sectionHeaders[0] : 
    (headerElement.size >= 12 && headerElement.size <= 16 ? headerElement : sortedElements[0]);
  
  // Analyze body text (most common size, excluding headers)
  const bodyTextElements = sortedElements.filter(e => 
    e.size >= 8 && 
    e.size <= 12 &&
    !sectionHeaders.includes(e)
  );
  const fontSizeCounts = new Map<number, number>();
  (bodyTextElements.length > 0 ? bodyTextElements : sortedElements).forEach(e => {
    fontSizeCounts.set(e.size, (fontSizeCounts.get(e.size) || 0) + 1);
  });
  const mostCommonSize = Array.from(fontSizeCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 10;
  const bodyElement = sortedElements.find(e => e.size === mostCommonSize) || sortedElements[0];
  
  // Analyze contact info (usually smaller, gray, in first 10 elements)
  const contactElements = sortedElements.slice(0, 10).filter(e => 
    e.size < 12 && 
    (e.text.includes('@') || e.text.match(/[\d\-\(\)\s]{10,}/) || e.text.includes('linkedin') || e.text.includes('github'))
  );
  const contactElement = contactElements.length > 0 ? contactElements[0] : bodyElement;
  
  // Calculate margins (find leftmost and rightmost positions)
  const xPositions = sortedElements.map(e => e.x).filter(x => x >= 0);
  const yPositions = sortedElements.map(e => e.y).filter(y => y >= 0);
  
  if (xPositions.length === 0 || yPositions.length === 0) {
    return getDefaultFormatting(pageWidth, pageHeight);
  }
  
  const leftmostX = Math.min(...xPositions);
  const rightmostX = Math.max(...xPositions);
  const topmostY = Math.max(...yPositions);
  const bottommostY = Math.min(...yPositions);
  
  // Calculate margins with reasonable defaults
  const leftMargin = Math.max(36, Math.min(144, leftmostX - 5)); // Clamp between 0.5" and 2"
  const rightMargin = Math.max(36, Math.min(144, pageWidth - rightmostX - 5));
  const topMargin = Math.max(36, Math.min(144, pageHeight - topmostY - 5));
  const bottomMargin = Math.max(36, Math.min(144, bottommostY - 5));
  
  // Calculate line spacing (analyze Y differences between consecutive lines)
  const uniqueYPositions = [...new Set(yPositions)].sort((a, b) => b - a);
  const lineSpacings: number[] = [];
  for (let i = 1; i < uniqueYPositions.length; i++) {
    const spacing = uniqueYPositions[i - 1] - uniqueYPositions[i];
    if (spacing > 3 && spacing < 50) { // Reasonable line spacing
      lineSpacings.push(spacing);
    }
  }
  const avgLineSpacing = lineSpacings.length > 0
    ? lineSpacings.reduce((a, b) => a + b, 0) / lineSpacings.length
    : mostCommonSize * 1.2;
  const lineHeightMultiplier = Math.max(1.0, Math.min(2.0, avgLineSpacing / mostCommonSize));
  
  // Extract colors
  const getColor = (element: typeof sortedElements[0]): { r: number; g: number; b: number } => {
    if (element.color && element.color.r !== undefined) {
      return element.color;
    }
    // Default to black if no color found
    return { r: 0, g: 0, b: 0 };
  };
  
  // Normalize font names to standard PDF fonts
  const normalizeFont = (fontName: string): string => {
    const lower = fontName.toLowerCase();
    if (lower.includes('times') || lower.includes('roman')) return 'Times-Roman';
    if (lower.includes('courier')) return 'Courier';
    if (lower.includes('arial') || lower.includes('helvetica')) return 'Helvetica';
    return 'Helvetica'; // Default
  };
  
  // Determine if font is bold
  const isBold = (fontName: string, element?: typeof sortedElements[0]): boolean => {
    if (element?.bold === true) return true;
    const lower = fontName.toLowerCase();
    return lower.includes('bold') || lower.includes('black') || lower.includes('heavy') ||
           lower.includes('semibold') || lower.includes('demibold');
  };
  
  return {
    fonts: {
      header: {
        family: normalizeFont(headerElement.font),
        size: Math.max(18, Math.min(32, headerElement.size)), // Clamp between 18-32
        bold: isBold(headerElement.font, headerElement),
      },
      sectionHeader: {
        family: normalizeFont(sectionHeaderElement.font),
        size: Math.max(12, Math.min(18, sectionHeaderElement.size)), // Clamp between 12-18
        bold: isBold(sectionHeaderElement.font, sectionHeaderElement),
      },
      body: {
        family: normalizeFont(bodyElement.font),
        size: Math.max(8, Math.min(12, mostCommonSize)), // Clamp between 8-12
        bold: false,
      },
      contact: {
        family: normalizeFont(contactElement.font),
        size: Math.max(8, Math.min(11, contactElement.size)), // Clamp between 8-11
        bold: false,
      },
    },
    spacing: {
      lineHeight: Math.max(1.0, Math.min(2.0, lineHeightMultiplier)), // Clamp between 1.0 and 2.0
      sectionSpacing: 20, // Default, will be refined
      bulletSpacing: 4,
      paragraphSpacing: 8,
    },
    margins: {
      top: Math.round(topMargin),
      bottom: Math.round(bottomMargin),
      left: Math.round(leftMargin),
      right: Math.round(rightMargin),
    },
    colors: {
      text: getColor(bodyElement),
      sectionHeader: getColor(sectionHeaderElement),
      contact: contactElement.color || { r: 0.3, g: 0.3, b: 0.3 },
    },
    pageSize: {
      width: pageWidth,
      height: pageHeight,
    },
  };
}

/**
 * Get default formatting when extraction fails
 */
function getDefaultFormatting(pageWidth: number, pageHeight: number): PdfFormatting {
  return {
    fonts: {
      header: { family: 'Helvetica', size: 24, bold: true },
      sectionHeader: { family: 'Helvetica', size: 14, bold: true },
      body: { family: 'Helvetica', size: 10, bold: false },
      contact: { family: 'Helvetica', size: 10, bold: false },
    },
    spacing: {
      lineHeight: 1.2,
      sectionSpacing: 20,
      bulletSpacing: 4,
      paragraphSpacing: 8,
    },
    margins: {
      top: 72,
      bottom: 72,
      left: 72,
      right: 72,
    },
    colors: {
      text: { r: 0, g: 0, b: 0 },
      sectionHeader: { r: 0, g: 0, b: 0 },
      contact: { r: 0.3, g: 0.3, b: 0.3 },
    },
    pageSize: {
      width: pageWidth,
      height: pageHeight,
    },
  };
}

