<template>
  <div class="bg-slate-800/50 border border-slate-700 rounded-xl">
    <div class="flex items-center gap-2 px-5 py-4 border-b border-slate-700">
      <Upload class="w-4 h-4 text-cyan-400" />
      <h2 class="text-white font-semibold text-sm">Ingesta de Datos CSV</h2>
    </div>

    <div class="px-5 py-4 space-y-4">
      <!-- Zona de drop -->
      <div
        class="border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer"
        :class="isDragging
          ? 'border-cyan-500 bg-cyan-500/10'
          : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/30'"
        @dragover.prevent="isDragging = true"
        @dragleave="isDragging = false"
        @drop.prevent="handleDrop"
        @click="fileInput?.click()"
      >
        <Upload class="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p class="text-sm text-slate-300">Arrastrá tu CSV aquí o <span class="text-cyan-400 font-medium">hacé click</span></p>
        <p class="text-xs text-slate-500 mt-1">Formato: timestamp, usuario, ip, exito_fallo, accion</p>
        <input ref="fileInput" type="file" accept=".csv" class="hidden" @change="handleFileChange" />
      </div>

      <!-- Formato esperado -->
      <div class="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
        <p class="text-xs text-slate-400 mb-2 font-medium">Ejemplo de formato CSV:</p>
        <pre class="text-xs text-cyan-300 font-mono leading-relaxed">timestamp,usuario,ip,exito_fallo,accion
2026-05-25 08:03:12,admin,192.168.1.45,fallo,LOGIN
2026-05-25 09:15:00,jperez,10.0.0.88,exito,DB_ACCESS</pre>
      </div>

      <!-- Botón cargar demo -->
      <button
        @click="loadDemo"
        :disabled="store.isLoading"
        class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-400 text-sm rounded-lg transition-colors disabled:opacity-50"
      >
        <FlaskConical class="w-4 h-4" />
        Cargar CSV de ejemplo (demo)
      </button>

      <!-- Estado de carga -->
      <div v-if="store.isLoading" class="flex items-center gap-3 px-3 py-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
        <div class="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        <div>
          <p class="text-xs text-cyan-300 font-medium">Analizando con motor Prolog...</p>
          <p class="text-xs text-slate-500">Convirtiendo CSV a hechos y evaluando reglas</p>
        </div>
      </div>

      <!-- Resultado -->
      <div v-if="lastImport" class="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5">
        <CheckCircle class="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
        <div>
          <p class="text-xs text-emerald-300 font-medium">Importación completada</p>
          <p class="text-xs text-slate-400">{{ lastImport }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Upload, FlaskConical, CheckCircle } from '@lucide/vue'
import { useSecurityStore } from '../../stores/security'

const store     = useSecurityStore()
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const lastImport = ref('')

const DEMO_CSV = `timestamp,usuario,ip,exito_fallo,accion
2026-05-25 14:00:01,hacker01,91.108.4.200,fallo,LOGIN
2026-05-25 14:00:03,hacker01,91.108.4.200,fallo,LOGIN
2026-05-25 14:00:05,hacker01,91.108.4.200,fallo,LOGIN
2026-05-25 14:00:07,hacker01,91.108.4.200,fallo,LOGIN
2026-05-25 14:00:09,hacker01,91.108.4.200,fallo,LOGIN
2026-05-25 14:01:00,cgomez,10.0.0.55,exito,FILE_VIEW
2026-05-25 01:30:00,sysadmin,172.16.0.10,exito,DB_ACCESS`

function processContent(content: string, filename: string) {
  const lines = content.trim().split('\n').slice(1).filter(Boolean)
  store.importCSV(content)
  setTimeout(() => {
    lastImport.value = `${filename} — ${lines.length} registros procesados. Se evaluaron las 10 reglas Prolog.`
  }, 900)
}

function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => processContent(ev.target?.result as string, file.name)
  reader.readAsText(file)
}

function handleDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => processContent(ev.target?.result as string, file.name)
  reader.readAsText(file)
}

function loadDemo() {
  processContent(DEMO_CSV, 'demo_logs.csv')
}
</script>
