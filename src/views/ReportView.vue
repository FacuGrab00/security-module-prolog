<template>
  <div class="space-y-6">
    <AppHeader
      title="Generación de Reporte"
      subtitle="Informe de hallazgos críticos del análisis Prolog — exportable como archivo de texto"
    />

    <div class="px-6 pb-6 space-y-6">
      <!-- Preview del reporte -->
      <div class="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div class="flex items-center gap-2">
            <FileText class="w-4 h-4 text-cyan-400" />
            <h2 class="text-white font-semibold text-sm">Reporte de Auditoría de Seguridad</h2>
          </div>
          <div class="flex gap-2">
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
            class="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg transition-colors font-medium"
          >
            <Download class="w-4 h-4" />
            Descargar .txt
          </button>
          </div>
        </div>

        <!-- Contenido del reporte (previsualización) -->
        <div class="p-5">
          <pre class="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap bg-slate-900/60 border border-slate-700 rounded-xl p-5 overflow-x-auto">{{ reportContent }}</pre>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FileText, Download, RefreshCw } from '@lucide/vue'
import AppHeader from '../components/layout/AppHeader.vue'
import { useSecurityStore } from '../stores/security'

const store         = useSecurityStore()
const reportContent = ref('Cargando reporte desde el motor Prolog...')
const isGenerating  = ref(false)

async function loadReport() {
  isGenerating.value = true
  try {
    const content = await store.generateReport()
    reportContent.value = content || '(Sin datos — cargá un CSV primero)'
  } catch {
    reportContent.value = '⚠ Motor Prolog no disponible.\nIniciá el servidor con:\n\n  swipl security_engine.pl\n\nLuego recargá esta página.'
  } finally {
    isGenerating.value = false
  }
}

onMounted(loadReport)

function downloadReport() {
  const blob = new Blob([reportContent.value], { type: 'text/plain;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `reporte_seguridad_${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
