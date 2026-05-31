import { ref } from 'vue';
import { jsPDF } from 'jspdf';
import type { Ref } from 'vue';
import type { PrologStats } from '../utils/prologMapper';

interface AlertEntry {
  header: string;
  details: string[];
}

interface AlertSections {
  critical: AlertEntry[];
  high:     AlertEntry[];
  lowmed:   AlertEntry[];
}

function parseAlertSections(text: string): AlertSections {
  const out: AlertSections = { critical: [], high: [], lowmed: [] };
  let section: keyof AlertSections | null = null;
  let entry: AlertEntry | null = null;

  for (const raw of text.split('\n')) {
    const t = raw.trim();

    if (t.includes('ALERTAS CRÍTICAS')) { section = 'critical'; entry = null; continue; }
    if (t.includes('ALERTAS ALTA'))     { section = 'high';     entry = null; continue; }
    if (t.includes('ALERTAS MEDIA') || t.includes('ALERTAS BAJA')) { section = 'lowmed'; entry = null; continue; }
    if (!section) continue;

    if (t.match(/^\[(CRITICO|ALTO|BAJO)\]/)) {
      const header = t.replace(/^\[(?:CRITICO|ALTO|BAJO)\]\s*/, '').replace(/:$/, '');
      entry = { header, details: [] };
      out[section].push(entry);
    } else if (entry && raw.startsWith('  ') && t) {
      entry.details.push(t);
    }
  }
  return out;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useReportPDF(reportContent: Ref<string>, prologStats: Ref<PrologStats | null>) {
  const isExporting = ref(false);

  async function downloadPDF() {
    isExporting.value = true;

    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const PW = doc.internal.pageSize.getWidth();
      const PH = doc.internal.pageSize.getHeight();
      const ML = 20;
      const MR = 20;
      const MB = 20;
      const CW = PW - ML - MR;

      let y = 0;

      // ── Helpers ────────────────────────────────────────────────────────────

      function col(r: number, g: number, b: number) {
        return {
          text: () => doc.setTextColor(r, g, b),
          draw: () => doc.setDrawColor(r, g, b),
          fill: () => doc.setFillColor(r, g, b),
        };
      }

      const BLACK    = col(0,   0,   0);
      const DARK     = col(30,  30,  30);
      const MIDGRAY  = col(90,  90,  90);
      const LIGHTGRAY = col(150, 150, 150);
      const PALE     = col(210, 210, 210);

      function checkY(needed = 10) {
        if (y + needed > PH - MB) addPage();
      }

      function addPage() {
        doc.addPage();
        y = 10;
        LIGHTGRAY.text();
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('REPORTE DE AUDITORÍA DE SEGURIDAD  ·  UNCAUS  ·  Inteligencia Artificial 2026', ML, y);
        y += 2;
        PALE.draw();
        doc.setLineWidth(0.2);
        doc.line(ML, y, PW - MR, y);
        y += 8;
      }

      // ── ENCABEZADO ─────────────────────────────────────────────────────────

      BLACK.draw();
      doc.setLineWidth(1.5);
      doc.line(ML, 14, PW - MR, 14);

      y = 21;

      BLACK.text();
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('UNIVERSIDAD NACIONAL DEL CHACO AUSTRAL', ML, y);

      y += 5.5;
      MIDGRAY.text();
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Inteligencia Artificial 2026  ·  Seguridad Informática', ML, y);

      y += 9;
      BLACK.text();
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE DE AUDITORÍA DE SEGURIDAD', ML, y);

      y += 5.5;
      MIDGRAY.text();
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Motor de Análisis Prolog  ·  Evaluación automática de reglas de detección', ML, y);

      y += 9;

      BLACK.draw();
      doc.setLineWidth(1.5);
      doc.line(ML, y, PW - MR, y);

      y += 6;

      const dateMatch = reportContent.value.match(/Generado:\s*(.+)/);
      const genDate = dateMatch ? dateMatch[1].trim() : new Date().toLocaleString('es-AR');

      MIDGRAY.text();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha de emisión: ${genDate}`, ML, y);
      doc.text('Clasificación: Documento Técnico Interno', PW - MR, y, { align: 'right' });

      y += 4;
      PALE.draw();
      doc.setLineWidth(0.3);
      doc.line(ML, y, PW - MR, y);

      y += 12;

      // ── SECCIÓN 1 — RESUMEN EJECUTIVO ──────────────────────────────────────

      const evMatch   = reportContent.value.match(/Eventos procesados\s*:\s*(\d+)/);
      const okMatch   = reportContent.value.match(/Accesos exitosos\s*:\s*(\d+)/);
      const failMatch = reportContent.value.match(/Accesos fallidos\s*:\s*(\d+)/);
      const totalEvs  = evMatch   ? parseInt(evMatch[1])   : 0;
      const totalOk   = okMatch   ? parseInt(okMatch[1])   : 0;
      const totalFail = failMatch ? parseInt(failMatch[1]) : 0;
      const rate      = totalEvs > 0 ? Math.round(totalOk / totalEvs * 100) : 0;
      const uniqUsers = prologStats.value?.unique_users ?? 0;

      BLACK.text();
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.text('1.  RESUMEN EJECUTIVO', ML, y);
      y += 3;

      BLACK.draw();
      doc.setLineWidth(0.5);
      doc.line(ML, y, ML + 65, y);
      y += 7;

      PALE.draw();
      doc.setLineWidth(0.5);
      doc.rect(ML, y - 4, CW, 22);

      const c1 = ML + 5;
      const c2 = ML + CW / 2 + 5;

      const stat = (label: string, value: string | number, x: number, yy: number) => {
        MIDGRAY.text();
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(label, x, yy);
        DARK.text();
        doc.setFont('helvetica', 'bold');
        doc.text(String(value), x + 40, yy);
      };

      stat('Eventos analizados:', totalEvs,    c1, y + 2);
      stat('Usuarios únicos:',   uniqUsers,    c2, y + 2);
      stat('Accesos exitosos:',  totalOk,      c1, y + 8);
      stat('Tasa de éxito:',     `${rate}%`,   c2, y + 8);
      stat('Accesos fallidos:',  totalFail,    c1, y + 14);

      y += 28;

      // ── SECCIONES DE ALERTAS ───────────────────────────────────────────────

      const alertSections = parseAlertSections(reportContent.value);

      const defs = [
        { key: 'critical' as const, num: 2, title: 'HALLAZGOS DE MÁXIMA SEVERIDAD' },
        { key: 'high'     as const, num: 3, title: 'HALLAZGOS DE ALTA SEVERIDAD' },
        { key: 'lowmed'   as const, num: 4, title: 'HALLAZGOS DE MEDIA / BAJA SEVERIDAD' },
      ];

      for (const { key, num, title } of defs) {
        const entries = alertSections[key];

        checkY(20);

        BLACK.text();
        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`${num}.  ${title}`, ML, y);
        y += 3;

        BLACK.draw();
        doc.setLineWidth(0.5);
        doc.line(ML, y, ML + 90, y);
        y += 5;

        if (entries.length === 0) {
          LIGHTGRAY.text();
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'italic');
          doc.text('Sin hallazgos en esta categoría.', ML + 4, y);
          y += 10;
          continue;
        }

        entries.forEach((entry, idx) => {
          checkY(14);

          DARK.text();
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          const subTitle = `${num}.${idx + 1}  ${entry.header.toUpperCase()}`;
          const wrapped = doc.splitTextToSize(subTitle, CW - 4);
          doc.text(wrapped, ML + 4, y);
          y += wrapped.length * 5.5;

          for (const detail of entry.details) {
            checkY(7);
            MIDGRAY.text();
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            const dWrapped = doc.splitTextToSize(detail, CW - 16);
            doc.text('•', ML + 8, y);
            doc.text(dWrapped, ML + 12, y);
            y += dWrapped.length * 5 + 0.5;
          }
          y += 4;
        });

        y += 4;
      }

      // ── PIE DE FIRMA ───────────────────────────────────────────────────────

      checkY(22);
      y += 6;
      BLACK.draw();
      doc.setLineWidth(0.5);
      doc.line(ML, y, PW - MR, y);
      y += 5;

      BLACK.text();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('GENERADO AUTOMÁTICAMENTE POR EL MOTOR DE ANÁLISIS PROLOG', ML, y);
      y += 4;

      MIDGRAY.text();
      doc.setFont('helvetica', 'normal');
      doc.text('Este documento es de carácter técnico. Su contenido refleja el estado del sistema al momento de la generación.', ML, y);

      // ── PIE DE PÁGINA en todas las páginas ─────────────────────────────────

      const total = (doc.internal as unknown as { getNumberOfPages(): number }).getNumberOfPages();
      for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        PALE.draw();
        doc.setLineWidth(0.4);
        doc.line(ML, PH - 14, PW - MR, PH - 14);
        LIGHTGRAY.text();
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text('UNCAUS  ·  Inteligencia Artificial 2026  ·  Sistema de Auditoría de Seguridad', ML, PH - 10);
        DARK.text();
        doc.setFont('helvetica', 'bold');
        doc.text(`Página ${p} de ${total}`, PW - MR, PH - 10, { align: 'right' });
      }

      doc.save(`reporte_auditoria_${today()}.pdf`);
    } finally {
      isExporting.value = false;
    }
  }

  return { isExporting, downloadPDF };
}
