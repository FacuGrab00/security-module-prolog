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

      <!-- Arquitectura de integración -->
      <div class="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h3 class="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <Network class="w-4 h-4 text-cyan-400" />
          Integración del Módulo Prolog en Arquitectura Mayor (Punto a)
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-5 gap-3 items-center text-xs">
          <div class="bg-slate-900/60 border border-slate-700 rounded-lg p-3 text-center">
            <p class="text-slate-400 mb-1">📋 Sistema Principal</p>
            <p class="text-slate-500">App Web / API REST</p>
          </div>
          <div class="flex items-center justify-center text-cyan-500">→</div>
          <div class="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 text-center">
            <p class="text-cyan-400 font-medium mb-1">🔍 Módulo Prolog</p>
            <p class="text-cyan-300/70">Motor de Inferencia</p>
            <p class="text-cyan-300/50 text-xs">SWI-Prolog + REST API</p>
          </div>
          <div class="flex items-center justify-center text-cyan-500">→</div>
          <div class="bg-slate-900/60 border border-slate-700 rounded-lg p-3 text-center">
            <p class="text-slate-400 mb-1">🚨 Acciones</p>
            <p class="text-slate-500">Alertas / Bloqueos / Reportes</p>
          </div>
        </div>
        <div class="mt-4 bg-slate-900/60 border border-slate-700 rounded-lg p-4">
          <p class="text-xs text-slate-400 leading-relaxed">
            <span class="text-cyan-400 font-medium">Propuesta de integración:</span>
            El motor de inferencia SWI-Prolog se expone como un microservicio REST independiente.
            El sistema principal (ej. aplicación web) envía eventos de seguridad vía POST y el módulo
            responde con las alertas generadas. La base de conocimiento se actualiza dinámicamente
            mediante los hechos CSV. La interfaz Vue 3 consume esta API y visualiza los resultados
            en tiempo real, permitiendo al administrador ejecutar queries y tomar acciones (bloquear IPs,
            notificar usuarios, generar reportes).
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FileText, Download, Network, RefreshCw } from '@lucide/vue'
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
