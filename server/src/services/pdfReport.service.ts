import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import type { Intervention, TimelineEvent, InterventionPhoto } from '@oblifield/shared';

// ── Color palette (inspired by sample report) ───────────────────────────────
const NAVY = '#2D3561';
const ACCENT_LINE = '#AEEA00';
const ACCENT_DARK = '#6B8F00';
const SECTION_BG = '#3B4578';
const SECTION_TEXT = '#FFFFFF';
const LABEL_COLOR = '#555555';
const VALUE_COLOR = '#1A1A1A';
const FOOTER_COLOR = '#999999';
const BORDER_COLOR = '#CCCCCC';

const UPLOAD_DIR = path.resolve(__dirname, '../../../uploads/photos');

interface ReportData {
  intervention: Intervention;
  timeline: TimelineEvent[];
  photos: InterventionPhoto[];
  companyName: string;
  supervisorName?: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
}

export function generateInterventionPdf(data: ReportData): PDFKit.PDFDocument {
  const { intervention, timeline, photos, companyName, supervisorName } = data;

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 60, left: 50, right: 50 },
    bufferPages: true,
  });

  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - 100; // margins
  const leftMargin = 50;
  const rightEdge = pageWidth - 50;

  // ── Helper: draw accent line ────────────────────────────────────────────
  function drawAccentLine(y: number, thickness = 3) {
    doc
      .moveTo(leftMargin, y)
      .lineTo(rightEdge, y)
      .lineWidth(thickness)
      .strokeColor(ACCENT_LINE)
      .stroke();
  }

  // ── Helper: draw section header ─────────────────────────────────────────
  function drawSectionHeader(label: string, y: number): number {
    const h = 24;
    doc
      .save()
      .rect(leftMargin, y, contentWidth, h)
      .fill(SECTION_BG);
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(SECTION_TEXT)
      .text(label, leftMargin + 10, y + 6, { width: contentWidth - 20 })
      .restore();
    return y + h + 8;
  }

  // ── Helper: info row ────────────────────────────────────────────────────
  function drawInfoRow(label: string, value: string, y: number): number {
    const rowH = 22;
    // Light border bottom
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
      .text(label, leftMargin + 5, y + 5, { width: 120 });
    doc
      .font('Helvetica')
      .fillColor(VALUE_COLOR)
      .text(value, leftMargin + 130, y + 5, { width: contentWidth - 140 });
    return y + rowH;
  }

  // ── Helper: check if we need a page break ───────────────────────────────
  function ensureSpace(needed: number) {
    if (doc.y + needed > doc.page.height - 80) {
      doc.addPage();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Header
  // ═══════════════════════════════════════════════════════════════════════════

  // Company name (top left)
  doc
    .fontSize(18)
    .font('Helvetica-Bold')
    .fillColor(NAVY)
    .text(companyName, leftMargin, 40, { width: 200 });

  // Title block (top right)
  doc
    .fontSize(22)
    .font('Helvetica-Bold')
    .fillColor(NAVY)
    .text("RAPPORT D'INTERVENTION", 250, 40, { width: contentWidth - 200, align: 'right' });

  // Subtitle (intervention type + title)
  const subtitle = [intervention.title].filter(Boolean).join(' — ');
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor(ACCENT_DARK)
    .text(subtitle, 250, 66, { width: contentWidth - 200, align: 'right' });

  // Accent line
  drawAccentLine(88);

  // ── Info table ──────────────────────────────────────────────────────────
  let y = 100;
  y = drawInfoRow('Client :', intervention.clientName ?? '—', y);
  y = drawInfoRow('Site :', intervention.siteName ?? '—', y);
  y = drawInfoRow('Date :', formatDate(intervention.startedAt ?? intervention.scheduledAt ?? intervention.createdAt), y);

  const startTime = formatTime(intervention.startedAt);
  const endTime = formatTime(intervention.completedAt);
  const timeRange = intervention.startedAt ? `${startTime} → ${endTime}` : '—';
  y = drawInfoRow('Début / Fin :', timeRange, y);

  y = drawInfoRow('Technicien :', intervention.assignedTechnicianName ?? '—', y);

  if (supervisorName) {
    y = drawInfoRow('Superviseur :', supervisorName, y);
  }

  y = drawInfoRow('Statut :', intervention.status.toUpperCase().replace('_', ' '), y);
  y = drawInfoRow('Priorité :', intervention.priority.toUpperCase(), y);

  if (intervention.ticketReference) {
    y = drawInfoRow('Ticket :', intervention.ticketReference, y);
  }

  if (intervention.address) {
    y = drawInfoRow('Adresse :', intervention.address, y);
  }

  y += 15;

  // ── Commentaires ────────────────────────────────────────────────────────
  // Gather all notes from timeline
  const notes = timeline
    .filter((e) => e.type === 'note' || e.type === 'check_in' || e.type === 'check_out')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const commentParts: string[] = [];
  if (intervention.technicianObservations) {
    commentParts.push(`Observations technicien : ${intervention.technicianObservations}`);
  }
  if (intervention.supervisorObservations) {
    commentParts.push(`Observations superviseur : ${intervention.supervisorObservations}`);
  }
  for (const note of notes) {
    if (note.message) {
      const prefix = note.type === 'check_in'
        ? `[Arrivée ${formatTime(note.createdAt)}] `
        : note.type === 'check_out'
          ? `[Départ ${formatTime(note.createdAt)}] `
          : '';
      commentParts.push(`${prefix}${note.message}`);
    }
  }

  if (commentParts.length > 0) {
    ensureSpace(80);
    y = drawSectionHeader('Commentaires', doc.y);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(VALUE_COLOR);

    for (const part of commentParts) {
      ensureSpace(30);
      doc.text(part, leftMargin + 10, doc.y, {
        width: contentWidth - 20,
        lineGap: 4,
      });
      doc.moveDown(0.5);
    }

    y = doc.y + 10;
  }

  // ── Photos ──────────────────────────────────────────────────────────────
  if (photos.length > 0) {
    ensureSpace(60);
    doc.y = Math.max(doc.y, y);
    drawSectionHeader('Photos', doc.y);

    const photoWidth = (contentWidth - 20) / 2; // 2 columns with gap
    const photoHeight = 200;
    let col = 0;
    let rowY = doc.y;

    for (const photo of photos) {
      const filePath = path.join(UPLOAD_DIR, photo.filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) continue;

      // Check if we need a new page
      if (rowY + photoHeight + 20 > doc.page.height - 80) {
        doc.addPage();
        rowY = doc.y;
        col = 0;
      }

      const x = leftMargin + 5 + col * (photoWidth + 10);

      try {
        doc.image(filePath, x, rowY, {
          fit: [photoWidth, photoHeight],
          align: 'center',
          valign: 'center',
        });
      } catch {
        // If image can't be loaded, draw a placeholder
        doc
          .rect(x, rowY, photoWidth, photoHeight)
          .strokeColor(BORDER_COLOR)
          .stroke();
        doc
          .fontSize(8)
          .fillColor(FOOTER_COLOR)
          .text(photo.originalName, x + 5, rowY + photoHeight / 2 - 5, {
            width: photoWidth - 10,
            align: 'center',
          });
      }

      col++;
      if (col >= 2) {
        col = 0;
        rowY += photoHeight + 15;
      }
    }

    // Move doc.y past the photos
    if (col > 0) rowY += photoHeight + 15;
    doc.y = rowY;
  }

  // ── Footer on every page ────────────────────────────────────────────────
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);

    const footerY = doc.page.height - 45;

    // Accent line
    doc
      .moveTo(leftMargin, footerY)
      .lineTo(rightEdge, footerY)
      .lineWidth(2)
      .strokeColor(ACCENT_LINE)
      .stroke();

    // Footer text
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(FOOTER_COLOR)
      .text(
        `${companyName} — Document confidentiel`,
        leftMargin,
        footerY + 8,
        { width: contentWidth, align: 'center' },
      );
  }

  return doc;
}
