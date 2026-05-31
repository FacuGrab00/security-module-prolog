<template>
  <div class="space-y-6">
    <AppHeader
      title="Generación de Reporte"
      subtitle="Informe de hallazgos críticos del análisis Prolog — exportable como PDF o texto plano"
    />

    <div class="px-3 sm:px-6 pb-6 space-y-6">
      <div class="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-4 border-b border-slate-700">
          <div class="flex items-center gap-2">
            <FileText class="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <h2 class="text-white font-semibold text-sm">Reporte de Auditoría de Seguridad</h2>
          </div>

          <div class="flex gap-2 flex-wrap">
            <button
              @click="loadReport"
              :disabled="isGenerating"
              class="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-sm rounded-lg transition-colors"
            >
              <RefreshCw class="w-4 h-4" :class="isGenerating ? 'animate-spin' : ''" />
              Regenerar
            </button>

            <button
              @click="downloadReport"
              :disabled="!hasContent"
              class="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-300 text-sm rounded-lg transition-colors"
            >
              <Download class="w-4 h-4" />
              .txt
            </button>

            <button
              @click="downloadPDF"
              :disabled="!hasContent || isExportingPDF"
              class="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-sm rounded-lg transition-colors font-medium"
            >
              <div v-if="isExportingPDF" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <FileDown v-else class="w-4 h-4" />
              {{ isExportingPDF ? 'Generando...' : 'Descargar PDF' }}
            </button>
          </div>
        </div>

        <div class="p-5">
          <pre class="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap bg-slate-900/60 border border-slate-700 rounded-xl p-5 overflow-x-auto max-h-[600px]">{{ reportContent }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { jsPDF } from 'jspdf'
import { FileText, Download, RefreshCw, FileDown } from '@lucide/vue'
import AppHeader from '../components/layout/AppHeader.vue'
import { useAppStore } from '../stores/app'

const store          = useAppStore()
const reportContent  = ref('Cargando reporte desde el motor Prolog...')
const isGenerating   = ref(false)
const isExportingPDF = ref(false)

const hasContent = computed(() =>
  reportContent.value.length > 0 &&
  !reportContent.value.startsWith('(') &&
  !reportContent.value.startsWith('⚠') &&
  !reportContent.value.startsWith('Cargando')
)

// ─── Cargar desde Prolog ──────────────────────────────────────────────────────

async function loadReport() {
  isGenerating.value = true
  try {
    const content = await store.generateReport()
    if (content) {
      reportContent.value = content
    } else if (store.stats.totalLogs === 0) {
      reportContent.value = '(Sin datos — cargá un CSV desde el Dashboard para generar el reporte)'
    } else {
      reportContent.value = '⚠ El motor Prolog devolvió una respuesta vacía.\nReintentá con el botón "Regenerar".'
    }
  } catch {
    reportContent.value = '⚠ Motor Prolog no disponible.\nIniciá el servidor con:\n\n  swipl security_engine.pl\n\nLuego recargá esta página.'
  } finally {
    isGenerating.value = false
  }
}

onMounted(loadReport)

// ─── Descarga TXT ─────────────────────────────────────────────────────────────

function downloadReport() {
  const blob = new Blob([reportContent.value], { type: 'text/plain;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `reporte_auditoria_${today()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Descarga PDF — diseño institucional B/N ─────────────────────────────────

interface AlertEntry { header: string; details: string[] }
interface AlertSections { critical: AlertEntry[]; high: AlertEntry[]; lowmed: AlertEntry[] }

function parseAlertSections(text: string): AlertSections {
  const out: AlertSections = { critical: [], high: [], lowmed: [] }
  let section: keyof AlertSections | null = null
  let entry:   AlertEntry | null          = null

  for (const raw of text.split('\n')) {
    const t = raw.trim()

    if (t.includes('ALERTAS CRÍTICAS'))                          { section = 'critical'; entry = null; continue }
    if (t.includes('ALERTAS ALTA'))                              { section = 'high';     entry = null; continue }
    if (t.includes('ALERTAS MEDIA') || t.includes('ALERTAS BAJA')) { section = 'lowmed';  entry = null; continue }
    if (!section) continue

    if (t.match(/^\[(CRITICO|ALTO|BAJO)\]/)) {
      const header = t.replace(/^\[(?:CRITICO|ALTO|BAJO)\]\s*/, '').replace(/:$/, '')
      entry = { header, details: [] }
      out[section].push(entry)
    } else if (entry && raw.startsWith('  ') && t) {
      entry.details.push(t)
    }
  }
  return out
}

async function downloadPDF() {
  if (!hasContent.value) return
  isExportingPDF.value = true

  try {
    const doc  = new jsPDF({ unit: 'mm', format: 'a4' })
    const PW   = doc.internal.pageSize.getWidth()
    const PH   = doc.internal.pageSize.getHeight()
    const ML   = 20
    const MR   = 20
    const MB   = 20
    const CW   = PW - ML - MR

    let y = 0

    // ── Helpers ──────────────────────────────────────────────────────────────

    function col(r: number, g: number, b: number) {
      return { text: () => doc.setTextColor(r, g, b), draw: () => doc.setDrawColor(r, g, b), fill: () => doc.setFillColor(r, g, b) }
    }
    const BLACK      = col(0,   0,   0)
    const DARK       = col(30,  30,  30)
    const MIDGRAY    = col(90,  90,  90)
    const LIGHTGRAY  = col(150, 150, 150)
    const PALE       = col(210, 210, 210)

    function checkY(needed = 10) {
      if (y + needed > PH - MB) addPage()
    }

    function addPage() {
      doc.addPage()
      y = 10
      LIGHTGRAY.text()
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text('REPORTE DE AUDITORÍA DE SEGURIDAD  ·  UNCAUS  ·  Inteligencia Artificial 2026', ML, y)
      y += 2
      PALE.draw()
      doc.setLineWidth(0.2)
      doc.line(ML, y, PW - MR, y)
      y += 8
    }

    // ── ENCABEZADO ───────────────────────────────────────────────────────────

    // Borde superior grueso
    BLACK.draw()
    doc.setLineWidth(1.5)
    doc.line(ML, 14, PW - MR, 14)

    y = 21

    // Institución
    BLACK.text()
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('UNIVERSIDAD NACIONAL DEL CHACO AUSTRAL', ML, y)

    y += 5.5
    MIDGRAY.text()
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.text('Inteligencia Artificial 2026  ·  Seguridad Informática', ML, y)

    y += 9
    BLACK.text()
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('REPORTE DE AUDITORÍA DE SEGURIDAD', ML, y)

    y += 5.5
    MIDGRAY.text()
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.text('Motor de Análisis Prolog  ·  Evaluación automática de reglas de detección', ML, y)

    y += 9

    // Borde inferior del encabezado
    BLACK.draw()
    doc.setLineWidth(1.5)
    doc.line(ML, y, PW - MR, y)

    y += 6

    // Fila de metadatos
    const dateMatch = reportContent.value.match(/Generado:\s*(.+)/)
    const genDate   = dateMatch ? dateMatch[1].trim() : new Date().toLocaleString('es-AR')

    MIDGRAY.text()
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`Fecha de emisión: ${genDate}`, ML, y)
    doc.text('Clasificación: Documento Técnico Interno', PW - MR, y, { align: 'right' })

    y += 4
    PALE.draw()
    doc.setLineWidth(0.3)
    doc.line(ML, y, PW - MR, y)

    y += 12

    // ── SECCIÓN 1 — RESUMEN EJECUTIVO ────────────────────────────────────────

    const evMatch   = reportContent.value.match(/Eventos procesados\s*:\s*(\d+)/)
    const okMatch   = reportContent.value.match(/Accesos exitosos\s*:\s*(\d+)/)
    const failMatch = reportContent.value.match(/Accesos fallidos\s*:\s*(\d+)/)
    const totalEvs  = evMatch   ? parseInt(evMatch[1])   : 0
    const totalOk   = okMatch   ? parseInt(okMatch[1])   : 0
    const totalFail = failMatch ? parseInt(failMatch[1]) : 0
    const rate      = totalEvs > 0 ? Math.round(totalOk / totalEvs * 100) : 0
    const uniqUsers = store.prologStats?.unique_users ?? 0

    BLACK.text()
    doc.setFontSize(10.5)
    doc.setFont('helvetica', 'bold')
    doc.text('1.  RESUMEN EJECUTIVO', ML, y)
    y += 3

    BLACK.draw()
    doc.setLineWidth(0.5)
    doc.line(ML, y, ML + 65, y)
    y += 7

    // Caja de estadísticas
    PALE.draw()
    doc.setLineWidth(0.5)
    doc.rect(ML, y - 4, CW, 22)

    const c1 = ML + 5
    const c2 = ML + CW / 2 + 5

    const stat = (label: string, value: string | number, x: number, yy: number) => {
      MIDGRAY.text()
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(label, x, yy)
      DARK.text()
      doc.setFont('helvetica', 'bold')
      doc.text(String(value), x + 40, yy)
    }

    stat('Eventos analizados:',  totalEvs,   c1, y + 2)
    stat('Usuarios únicos:',     uniqUsers,  c2, y + 2)
    stat('Accesos exitosos:',    totalOk,    c1, y + 8)
    stat('Tasa de éxito:',       `${rate}%`, c2, y + 8)
    stat('Accesos fallidos:',    totalFail,  c1, y + 14)

    y += 28

    // ── SECCIONES DE ALERTAS ─────────────────────────────────────────────────

    const alertSections = parseAlertSections(reportContent.value)

    const defs = [
      { key: 'critical' as const, num: 2, title: 'HALLAZGOS DE MÁXIMA SEVERIDAD'  },
      { key: 'high'     as const, num: 3, title: 'HALLAZGOS DE ALTA SEVERIDAD'    },
      { key: 'lowmed'   as const, num: 4, title: 'HALLAZGOS DE MEDIA / BAJA SEVERIDAD' },
    ]

    for (const { key, num, title } of defs) {
      const entries = alertSections[key]

      checkY(20)

      // Título de sección
      BLACK.text()
      doc.setFontSize(10.5)
      doc.setFont('helvetica', 'bold')
      doc.text(`${num}.  ${title}`, ML, y)
      y += 3

      BLACK.draw()
      doc.setLineWidth(0.5)
      doc.line(ML, y, ML + 90, y)
      y += 5

      if (entries.length === 0) {
        LIGHTGRAY.text()
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'italic')
        doc.text('Sin hallazgos en esta categoría.', ML + 4, y)
        y += 10
        continue
      }

      // Subsecciones numeradas: 2.1, 2.2 …
      entries.forEach((entry, idx) => {
        checkY(14)

        // Número de subsección + título
        DARK.text()
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        const subTitle = `${num}.${idx + 1}  ${entry.header.toUpperCase()}`
        const wrapped  = doc.splitTextToSize(subTitle, CW - 4)
        doc.text(wrapped, ML + 4, y)
        y += wrapped.length * 5.5

        // Detalles con viñeta
        for (const detail of entry.details) {
          checkY(7)
          MIDGRAY.text()
          doc.setFontSize(8.5)
          doc.setFont('helvetica', 'normal')
          // Bullet con fuente normal, detalle con fuente normal
          const dWrapped = doc.splitTextToSize(detail, CW - 16)
          doc.text('•', ML + 8, y)
          doc.text(dWrapped, ML + 12, y)
          y += dWrapped.length * 5 + 0.5
        }
        y += 4
      })

      y += 4
    }

    // ── PIE DE FIRMA ─────────────────────────────────────────────────────────

    checkY(22)
    y += 6
    BLACK.draw()
    doc.setLineWidth(0.5)
    doc.line(ML, y, PW - MR, y)
    y += 5

    BLACK.text()
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('GENERADO AUTOMÁTICAMENTE POR EL MOTOR DE ANÁLISIS PROLOG', ML, y)
    y += 4

    MIDGRAY.text()
    doc.setFont('helvetica', 'normal')
    doc.text('Este documento es de carácter técnico. Su contenido refleja el estado del sistema al momento de la generación.', ML, y)

    // ── PIE DE PÁGINA en todas las páginas ───────────────────────────────────

    const total = (doc.internal as unknown as { getNumberOfPages(): number }).getNumberOfPages()
    for (let p = 1; p <= total; p++) {
      doc.setPage(p)
      PALE.draw()
      doc.setLineWidth(0.4)
      doc.line(ML, PH - 14, PW - MR, PH - 14)
      LIGHTGRAY.text()
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.text('UNCAUS  ·  Inteligencia Artificial 2026  ·  Sistema de Auditoría de Seguridad', ML, PH - 10)
      DARK.text()
      doc.setFont('helvetica', 'bold')
      doc.text(`Página ${p} de ${total}`, PW - MR, PH - 10, { align: 'right' })
    }

    doc.save(`reporte_auditoria_${today()}.pdf`)
  } finally {
    isExportingPDF.value = false
  }
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10)
}
</script>
