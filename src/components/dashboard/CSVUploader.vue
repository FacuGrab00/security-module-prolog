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
        <pre class="text-xs text-cyan-300 font-mono leading-relaxed">timestamp,usuario,ip,accion,resultado
1779696720,admin,192.168.1.45,login,fallo
1779700500,jperez,10.0.0.88,login,exito</pre>
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

const DEMO_CSV = `timestamp,usuario,ip,accion,resultado
1779703200,hacker01,203.0.113.45,login,fallo
1779703210,hacker01,203.0.113.45,login,fallo
1779703220,hacker01,203.0.113.45,login,fallo
1779703230,hacker01,203.0.113.45,login,fallo
1779703240,hacker01,203.0.113.45,login,fallo
1779703300,admin_ti,198.51.100.7,login,fallo
1779703310,jgonzalez,198.51.100.7,login,fallo
1779703320,mperez,198.51.100.7,login,fallo
1779703330,lrodriguez,198.51.100.7,login,fallo
1779703400,scanner,45.33.32.156,login,fallo
1779703500,jgonzalez,203.0.113.10,login,exito
1779703620,jgonzalez,198.51.100.20,login,exito
1779672600,admin_ti,192.168.0.10,login,exito
1779703700,mperez,198.51.100.30,login,fallo
1779703710,mperez,198.51.100.30,login,fallo
1779703720,mperez,198.51.100.30,login,fallo
1779703730,mperez,198.51.100.30,login,exito
1779703800,respaldo_bd,192.168.1.20,login,exito
1779703900,intruso1,203.0.113.77,login,fallo
1779703910,intruso1,203.0.113.77,login,fallo`

function processContent(content: string, filename: string) {
  const lines = content.trim().split('\n').slice(1).filter(Boolean)
  store.importCSV(content)
  setTimeout(() => {
    lastImport.value = `${filename} — ${lines.length} registros procesados. Se evaluaron las 13 reglas Prolog.`
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
