/**
 * PDF renderer service — jsPDF-based.
 * Renders resolved template text into downloadable PDF files with Cyrillic support.
 */

import jsPDF from 'jspdf';

interface PdfRenderOptions {
  title: string;
  fileName: string;
}

/**
 * Render resolved document text to a PDF and trigger download.
 */
export function renderDocumentToPdf(resolvedText: string, options: PdfRenderOptions): void {
  const doc = new jsPDF();

  doc.addFont('/fonts/NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.setFont('NotoSans');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const usableWidth = pageWidth - margin * 2;
  const bottomMargin = 20;
  let y = 20;

  const lines = resolvedText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Heading detection (markdown-style)
    if (trimmed.startsWith('# ')) {
      y += 4;
      checkPageBreak();
      doc.setFontSize(14);
      const headingLines = doc.splitTextToSize(trimmed.slice(2), usableWidth);
      doc.text(headingLines, pageWidth / 2, y, { align: 'center' });
      y += headingLines.length * 7;
      doc.setFontSize(10);
      continue;
    }

    if (trimmed.startsWith('## ')) {
      y += 4;
      checkPageBreak();
      doc.setFontSize(11);
      const sectionLines = doc.splitTextToSize(trimmed.slice(3), usableWidth);
      doc.text(sectionLines, margin, y);
      y += sectionLines.length * 5.5 + 2;
      doc.setFontSize(10);
      continue;
    }

    if (trimmed === '---') {
      y += 4;
      checkPageBreak();
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
      continue;
    }

    // Empty line
    if (trimmed === '') {
      y += 3;
      checkPageBreak();
      continue;
    }

    // Regular text (strip markdown bold markers for PDF)
    const cleanText = trimmed.replace(/\*\*/g, '');
    doc.setFontSize(10);
    const wrappedLines = doc.splitTextToSize(cleanText, usableWidth);
    
    // Check if we need a page break for this block
    const blockHeight = wrappedLines.length * 5;
    if (y + blockHeight > pageHeight - bottomMargin) {
      doc.addPage();
      y = 20;
    }

    doc.text(wrappedLines, margin, y);
    y += wrappedLines.length * 5;
  }

  doc.save(options.fileName);

  function checkPageBreak(): void {
    if (y > pageHeight - bottomMargin) {
      doc.addPage();
      y = 20;
    }
  }
}
