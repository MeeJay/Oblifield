import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import imageSize from 'image-size';
import type { Intervention, TimelineEvent, InterventionPhoto } from '@oblifield/shared';

// ── Default color palette ────────────────────────────────────────────────────
const DEFAULTS = {
  primary:     '#2D3561',
  accentLine:  '#C62828',
  sectionBg:   '#3B4578',
  sectionText: '#FFFFFF',
  label:       '#555555',
  value:       '#1A1A1A',
  footer:      '#AAAAAA',
  border:      '#CCCCCC',
};

const UPLOAD_DIR = path.resolve('/app/uploads/photos');

export interface PdfColors {
  primary: string;
  accentLine: string;
  sectionBg: string;
  sectionText: string;
  label: string;
  value: string;
  footer: string;
  border: string;
}

interface ReportData {
  intervention: Intervention;
  timeline: TimelineEvent[];
  photos: InterventionPhoto[];
  companyName: string;
  supervisorName?: string;
  logoPath?: string | null;
  colors?: Partial<PdfColors>;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
}

export function generateInterventionPdf(data: ReportData): PDFKit.PDFDocument {
  const { intervention, timeline, photos, companyName, supervisorName, logoPath, colors: c } = data;

  const NAVY = c?.primary ?? DEFAULTS.primary;
  const RED_LINE = c?.accentLine ?? DEFAULTS.accentLine;
  const SECTION_BG = c?.sectionBg ?? DEFAULTS.sectionBg;
  const SECTION_TEXT = c?.sectionText ?? DEFAULTS.sectionText;
  const LABEL_COLOR = c?.label ?? DEFAULTS.label;
  const VALUE_COLOR = c?.value ?? DEFAULTS.value;
  const FOOTER_COLOR = c?.footer ?? DEFAULTS.footer;
  const BORDER_COLOR = c?.border ?? DEFAULTS.border;

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 0, left: 50, right: 50 },
    bufferPages: true,
  });

  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - 100;
  const leftMargin = 50;
  const rightEdge = pageWidth - 50;

  // ── Helper: red accent line ────────────────────────────────────────────
  function drawRedLine(y: number, thickness = 3) {
    doc
      .moveTo(leftMargin, y)
      .lineTo(rightEdge, y)
      .lineWidth(thickness)
      .strokeColor(RED_LINE)
      .stroke();
  }

  // ── Helper: section header (navy blue bar) ─────────────────────────────
  function drawSectionHeader(label: string, y: number): number {
    const h = 24;
    doc.save();
    doc.rect(leftMargin, y, contentWidth, h).fill(SECTION_BG);
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(SECTION_TEXT)
      .text(label, leftMargin + 10, y + 6, { width: contentWidth - 20, lineBreak: false });
    doc.restore();
    return y + h + 8;
  }

  // ── Helper: info table row ─────────────────────────────────────────────
  function drawInfoRow(label: string, value: string, y: number): number {
    const rowH = 22;
    doc
      .moveTo(leftMargin, y + rowH)
      .lineTo(rightEdge, y + rowH)
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .stroke();
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(LABEL_COLOR)
      .text(label, leftMargin + 5, y + 5, { width: 120, lineBreak: false });
    doc
      .font('Helvetica')
      .fillColor(VALUE_COLOR)
      .text(value || '\u2014', leftMargin + 130, y + 5, { width: contentWidth - 140, lineBreak: false });
    return y + rowH;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Main report
  // ═══════════════════════════════════════════════════════════════════════════

  // Company logo or name (top left)
  if (logoPath && fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, leftMargin, 30, { fit: [150, 50] });
    } catch {
      doc.fontSize(22).font('Helvetica-Bold').fillColor(NAVY)
        .text(companyName, leftMargin, 40, { width: 200 });
    }
  } else {
    doc.fontSize(22).font('Helvetica-Bold').fillColor(NAVY)
      .text(companyName, leftMargin, 40, { width: 200 });
  }

  // "RAPPORT D'INTERVENTION" (top right, large)
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .fillColor(NAVY)
    .text("RAPPORT D'INTERVENTION", 250, 35, {
      width: contentWidth - 200,
      align: 'right',
      lineBreak: false,
    });

  // Subtitle: intervention title (smaller, under the main title)
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor(LABEL_COLOR)
    .text(intervention.title, 250, 58, {
      width: contentWidth - 200,
      align: 'right',
      lineBreak: false,
    });

  // Red accent line under header
  drawRedLine(78);

  // ── Info table (only essential fields like the examples) ───────────────
  let y = 92;
  y = drawInfoRow('Client :', intervention.clientName ?? '', y);
  y = drawInfoRow('Site :', intervention.siteName ?? '', y);

  const dateStr = formatDate(intervention.startedAt ?? intervention.scheduledAt ?? intervention.createdAt);
  y = drawInfoRow('Date :', dateStr, y);

  const startTime = formatTime(intervention.startedAt);
  const endTime = formatTime(intervention.completedAt);
  const timeRange = startTime ? `${startTime} - ${endTime || '\u2014'}` : '\u2014';
  y = drawInfoRow('D\u00e9but / Fin :', timeRange, y);

  y = drawInfoRow('Technicien :', intervention.assignedTechnicianName ?? '', y);

  const supName = supervisorName ?? intervention.supervisorName ?? '';
  if (supName) {
    y = drawInfoRow('Superviseur :', supName, y);
  }

  y += 20;

  const pageBottom = doc.page.height - 60; // bottom margin

  // ── Helper: draw a block of text, handling page breaks manually ────────
  function drawTextBlock(text: string, startY: number): number {
    const textOpts = { width: contentWidth - 20, lineGap: 5 };
    doc.fontSize(10).font('Helvetica').fillColor(VALUE_COLOR);
    const textH = doc.heightOfString(text, textOpts);
    if (startY + textH > pageBottom) {
      doc.addPage();
      startY = 40;
    }
    doc.text(text, leftMargin + 10, startY, textOpts);
    return doc.y + 15;
  }

  // ── Observations Technicien section ─────────────────────────────────────
  if (intervention.technicianObservations) {
    y = drawSectionHeader('Observations Technicien', y);
    y = drawTextBlock(intervention.technicianObservations, y);
  }

  // ── Commentaires section (supervisor observations + timeline notes) ────
  const commentParts: string[] = [];

  if (intervention.supervisorObservations) {
    commentParts.push(intervention.supervisorObservations);
  }

  // Also include timeline notes
  const notes = timeline
    .filter((e) => e.type === 'note' && e.message)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const note of notes) {
    if (note.message) commentParts.push(note.message);
  }

  if (commentParts.length > 0) {
    y = drawSectionHeader('Commentaires', y);
    y = drawTextBlock(commentParts.join('\n'), y);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHOTO ANNEXE PAGES — Grid 3x2 per page (matching examples)
  // ═══════════════════════════════════════════════════════════════════════════
  // ── Helper: detect if image is landscape ────────────────────────────────
  function getImageDims(filePath: string): { width: number; height: number } | null {
    try {
      const buf = fs.readFileSync(filePath);
      const dims = imageSize(buf);
      if (dims.width && dims.height) return { width: dims.width, height: dims.height };
      return null;
    } catch { return null; }
  }

  const validPhotos = photos.filter((p) => {
    const filePath = path.join(UPLOAD_DIR, p.filename);
    return fs.existsSync(filePath);
  });

  if (validPhotos.length > 0) {
    const PHOTOS_PER_PAGE = 6; // 3 columns × 2 rows
    const totalPhotoPages = Math.ceil(validPhotos.length / PHOTOS_PER_PAGE);
    const colCount = 3;
    const gap = 8;
    const photoWidth = (contentWidth - gap * (colCount - 1)) / colCount;
    const photoHeight = 280; // tall enough for portrait photos
    const startY = 60;

    for (let page = 0; page < totalPhotoPages; page++) {
      doc.addPage();

      // Page title
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(NAVY)
        .text(
          `Annexe photos - page ${page + 1}/${totalPhotoPages}`,
          leftMargin,
          35,
          { width: contentWidth, lineBreak: false },
        );

      // Thin line under title
      doc
        .moveTo(leftMargin, 52)
        .lineTo(rightEdge, 52)
        .lineWidth(1)
        .strokeColor(NAVY)
        .stroke();

      // Draw photo grid
      const pagePhotos = validPhotos.slice(page * PHOTOS_PER_PAGE, (page + 1) * PHOTOS_PER_PAGE);
      let col = 0;
      let rowY = startY;

      for (const photo of pagePhotos) {
        const filePath = path.join(UPLOAD_DIR, photo.filename);
        const x = leftMargin + col * (photoWidth + gap);
        const cellW = photoWidth;
        const cellH = photoHeight;
        const innerW = cellW - 4;
        const innerH = cellH - 4;

        // Draw border
        doc
          .rect(x, rowY, cellW, cellH)
          .lineWidth(0.5)
          .strokeColor(BORDER_COLOR)
          .stroke();

        try {
          const dims = getImageDims(filePath);
          const landscape = dims ? dims.width > dims.height : false;

          if (landscape && dims) {
            // Rotate landscape photo to portrait:
            // After 90° rotation, the image's width becomes its height and vice versa.
            // We fit the rotated image (swapped dims) into the portrait cell.
            const origW = dims.width;
            const origH = dims.height;
            // After rotation: effective dimensions = origH × origW
            const scale = Math.min(innerW / origH, innerH / origW);
            const drawW = origW * scale; // rendered height (pre-rotation width)
            const drawH = origH * scale; // rendered width (pre-rotation height)

            // Center in cell
            const cx = x + 2 + innerW / 2;
            const cy = rowY + 2 + innerH / 2;

            doc.save();
            // Translate to cell center, rotate -90°, then draw centered
            doc.translate(cx, cy);
            doc.rotate(-90);
            // After rotation, draw the image centered at origin
            doc.image(filePath, -drawW / 2, -drawH / 2, {
              width: drawW,
              height: drawH,
            });
            doc.restore();
          } else {
            doc.image(filePath, x + 2, rowY + 2, {
              fit: [innerW, innerH],
              align: 'center',
              valign: 'center',
            });
          }
        } catch {
          doc
            .fontSize(7)
            .fillColor(FOOTER_COLOR)
            .text(photo.originalName, x + 4, rowY + cellH / 2 - 5, {
              width: cellW - 8,
              align: 'center',
              lineBreak: false,
            });
        }

        col++;
        if (col >= colCount) {
          col = 0;
          rowY += photoHeight + gap;
        }
      }
    }
  }

  // ── Footer on every page ────────────────────────────────────────────────
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);

    const footerY = doc.page.height - 45;

    // Red line
    doc
      .moveTo(leftMargin, footerY)
      .lineTo(rightEdge, footerY)
      .lineWidth(1.5)
      .strokeColor(RED_LINE)
      .stroke();

    // Footer text
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(FOOTER_COLOR)
      .text(
        `${companyName.toUpperCase()} \u2014 Document confidentiel`,
        leftMargin,
        footerY + 8,
        { width: contentWidth, align: 'center', lineBreak: false },
      );
  }

  return doc;
}
