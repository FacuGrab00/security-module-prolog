<template>
  <div class="bg-slate-800/50 border border-slate-700 rounded-xl">
    <div class="flex items-center gap-2 px-4 sm:px-5 py-4 border-b border-slate-700">
      <Upload class="w-4 h-4 text-cyan-400 flex-shrink-0"/>
      <h2 class="app-section-title">Ingesta de Datos CSV</h2>
    </div>

    <div class="px-4 sm:px-5 py-4 space-y-4">
      <!-- Zona de drop -->
      <div
          class="border-2 border-dashed rounded-xl p-4 sm:p-6 text-center transition-all cursor-pointer"
          :class="isDragging
          ? 'border-cyan-500 bg-cyan-500/10'
          : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/30'"
          @dragover.prevent="isDragging = true"
          @dragleave="isDragging = false"
          @drop.prevent="handleDrop"
          @click="fileInput?.click()"
      >
        <Upload class="w-8 h-8 text-slate-400 mx-auto mb-2"/>
        <p class="text-sm text-slate-300">Arrastrá tu CSV aquí o <span
            class="text-cyan-400 font-medium">hacé click</span></p>
        <p class="text-xs text-slate-500 mt-1">Formato: timestamp, usuario, ip, accion, resultado</p>
        <input ref="fileInput" type="file" accept=".csv" class="hidden" @change="handleFileChange"/>
      </div>

      <!-- Formato esperado -->
      <div class="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
        <p class="text-xs text-slate-400 mb-2 font-medium">Ejemplo de formato CSV:</p>
        <pre class="text-xs text-cyan-300 font-mono leading-relaxed">timestamp,usuario,ip,accion,resultado
1779696720,admin,192.168.1.45,login,fallo
1779700500,jperez,10.0.0.88,login,exito</pre>
      </div>

      <!-- Botones -->
      <div class="flex gap-2">
        <button
            @click="loadDemo"
            :disabled="store.isLoading"
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-400 text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          <FlaskConical class="w-4 h-4"/>
          Cargar demo
        </button>

        <button
            v-if="store.loadedFiles.length > 0"
            @click="confirmClear"
            :disabled="store.isLoading"
            class="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          <Trash2 class="w-4 h-4"/>
          Limpiar todo
        </button>
      </div>

      <!-- Estado de carga -->
      <div v-if="store.isLoading"
           class="flex items-center gap-3 px-3 py-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
        <div class="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin flex-shrink-0"/>
        <div>
          <p class="text-xs text-cyan-300 font-medium">Analizando con motor Prolog...</p>
          <p class="text-xs text-slate-500">Convirtiendo CSV a hechos y evaluando reglas</p>
        </div>
      </div>

      <!-- Historial de archivos cargados -->
      <div v-if="store.loadedFiles.length > 0" class="space-y-1">
        <p class="text-xs text-slate-400 font-medium mb-2">Archivos en memoria</p>
        <div
            v-for="(file, i) in store.loadedFiles"
            :key="i"
            class="flex items-center justify-between gap-3 px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg"
        >
          <div class="flex items-center gap-2 min-w-0">
            <FileText class="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>
            <span class="text-xs text-slate-300 truncate font-mono">{{ file.name }}</span>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0 text-xs">
            <span class="text-emerald-400 font-medium">+{{ file.recordsAdded }}</span>
            <span
                v-if="file.recordsSkipped > 0"
                class="text-amber-400"
            >{{ file.recordsSkipped }} dup.</span>
            <span class="text-slate-500">{{ file.loadedAt }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import {Upload, FlaskConical, Trash2, FileText} from '@lucide/vue'
import {toast} from 'vue-sonner'
import {useAppStore} from '../../stores/app'

const store = useAppStore()
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

// ─── Columnas requeridas (en orden) ──────────────────────────────────────────
const REQUIRED_HEADERS = ['timestamp', 'usuario', 'ip', 'accion', 'resultado']
const VALID_RESULTS = new Set(['exito', 'fallo'])

// ─── Validación del CSV ───────────────────────────────────────────────────────

interface ValidationResult {
  ok: boolean
  errors: string[]
  rows: number
}

function validateCSV(content: string): ValidationResult {
  const errors: string[] = []
  const lines = content.trim().split('\n').filter(Boolean)

  if (lines.length === 0) {
    return {ok: false, errors: ['El archivo está vacío.'], rows: 0}
  }

  // 1. Validar cabecera
  const rawHeader = lines[0].trim().toLowerCase()
  const headers = rawHeader.split(',').map(h => h.trim())

  if (headers.length !== REQUIRED_HEADERS.length) {
    errors.push(
        `La cabecera tiene ${headers.length} columna(s) pero se esperan ${REQUIRED_HEADERS.length}. ` +
        `Esperado: ${REQUIRED_HEADERS.join(', ')}`
    )
    return {ok: false, errors, rows: 0}
  }

  const wrongCols = REQUIRED_HEADERS
      .map((h, i) => headers[i] !== h ? `columna ${i + 1}: se esperaba "${h}", se encontró "${headers[i]}"` : null)
      .filter(Boolean) as string[]

  if (wrongCols.length > 0) {
    errors.push(`Cabecera incorrecta — ${wrongCols.join('; ')}`)
    return {ok: false, errors, rows: 0}
  }

  // 2. Validar filas de datos
  const dataLines = lines.slice(1)

  if (dataLines.length === 0) {
    errors.push('El CSV sólo tiene cabecera, no hay filas de datos.')
    return {ok: false, errors, rows: 0}
  }

  const rowErrors: string[] = []

  dataLines.forEach((line, idx) => {
    const row = line.trim()
    if (!row) return
    const fields = row.split(',').map(f => f.trim())
    const lineNum = idx + 2   // +1 cabecera, +1 base-1

    if (fields.length !== 5) {
      rowErrors.push(`Línea ${lineNum}: se esperan 5 columnas, se encontraron ${fields.length}`)
      return
    }

    const [ts, usuario, ip, , resultado] = fields

    if (!/^\d+$/.test(ts)) {
      rowErrors.push(`Línea ${lineNum}: el timestamp "${ts}" no es un número entero`)
    }

    if (!usuario) {
      rowErrors.push(`Línea ${lineNum}: el campo "usuario" está vacío`)
    }

    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
      rowErrors.push(`Línea ${lineNum}: la IP "${ip}" no tiene un formato válido`)
    }

    if (!VALID_RESULTS.has(resultado.toLowerCase())) {
      rowErrors.push(
          `Línea ${lineNum}: el resultado "${resultado}" no es válido (debe ser "exito" o "fallo")`
      )
    }
  })

  if (rowErrors.length > 0) {
    const shown = rowErrors.slice(0, 5)
    if (rowErrors.length > 5) shown.push(`… y ${rowErrors.length - 5} error(es) más`)
    errors.push(...shown)
    return {ok: false, errors, rows: 0}
  }

  return {ok: true, errors: [], rows: dataLines.filter(l => l.trim()).length}
}

// ─── Procesamiento ────────────────────────────────────────────────────────────

async function processContent(content: string, filename: string) {
  const validation = validateCSV(content)

  if (!validation.ok) {
    toast.error('CSV inválido — no se importó', {
      description: validation.errors[0],
      duration: 8000,
    })
    validation.errors.slice(1).forEach(err => {
      toast.warning(err, {duration: 8000})
    })
    return
  }

  try {
    const body = await store.importCSV(content, filename)

    if (body?.ok) {
      // records_added: servidor nuevo (acumulativo)
      // records_loaded: servidor viejo (fallback de compatibilidad)
      // validation.rows: último recurso si el servidor no devuelve nada
      const added = body.records_added ?? body.records_loaded ?? validation.rows
      const skipped = body.records_skipped ?? 0
      const total = body.total_in_db ?? body.records_loaded ?? added

      if (skipped > 0) {
        toast.success(`${added} registros nuevos cargados`, {
          description: `${skipped} duplicado(s) omitido(s) · ${total} registros en memoria`,
          duration: 6000,
        })
      } else {
        toast.success(`${added} registros cargados desde "${filename}"`, {
          description: `Total en memoria: ${total} registros`,
          duration: 5000,
        })
      }
    } else {
      toast.error('Error en el motor Prolog', {
        description: body?.error ?? 'El servidor rechazó el archivo.',
        duration: 8000,
      })
    }
  } catch {
    toast.error('Sin conexión al motor Prolog', {
      description: 'Verificá que el servidor Prolog esté corriendo en el puerto configurado.',
      duration: 8000,
    })
  }
}

// ─── Limpiar todos los datos ──────────────────────────────────────────────────

async function confirmClear() {
  const ok = window.confirm('¿Eliminar todos los registros cargados en memoria?')
  if (!ok) return

  try {
    await store.clearData()
    toast.success('Datos limpiados', {
      description: 'Todos los registros fueron eliminados del motor Prolog.',
      duration: 4000,
    })
  } catch {
    toast.error('No se pudo limpiar', {
      description: 'Verificá la conexión con el servidor Prolog.',
      duration: 6000,
    })
  }
}

// ─── Handlers de input ────────────────────────────────────────────────────────

function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
      ;
  (e.target as HTMLInputElement).value = ''

  if (!file.name.toLowerCase().endsWith('.csv')) {
    toast.error('Tipo de archivo no válido', {
      description: `"${file.name}" no es un archivo CSV.`,
      duration: 5000,
    })
    return
  }

  const reader = new FileReader()
  reader.onload = ev => processContent(ev.target?.result as string, file.name)
  reader.readAsText(file)
}

function handleDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (!file) return

  if (!file.name.toLowerCase().endsWith('.csv')) {
    toast.error('Tipo de archivo no válido', {
      description: `"${file.name}" no es un archivo CSV.`,
      duration: 5000,
    })
    return
  }

  const reader = new FileReader()
  reader.onload = ev => processContent(ev.target?.result as string, file.name)
  reader.readAsText(file)
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

// Timestamps clave (UTC):
//   1779678000 → hora 3  (fuera de horario laboral 8-20) → regla 3
//   1779660000 → hora 22 (fuera del historial de lrodriguez) → regla 11
//   1779700xxx → hora 9  (ventana principal de eventos)
const DEMO_CSV = `timestamp,usuario,ip,accion,resultado
1779700100,hacker01,203.0.113.45,login,fallo
1779700110,hacker01,203.0.113.45,login,fallo
1779700120,hacker01,203.0.113.45,login,fallo
1779700130,hacker01,203.0.113.45,login,fallo
1779700140,hacker01,203.0.113.45,login,fallo
1779700200,user_a,198.51.100.7,login,fallo
1779700210,user_b,198.51.100.7,login,fallo
1779700220,user_c,198.51.100.7,login,fallo
1779678000,admin_ti,192.168.1.10,login,exito
1779700300,scanner,45.33.32.156,login,fallo
1779700400,respaldo_bd,192.168.1.20,login,exito
1779700500,jgonzalez,10.0.0.50,login,exito
1779700600,jgonzalez,172.16.0.5,login,exito
1779700700,jgonzalez,203.0.113.10,login,exito
1779700800,jgonzalez,198.51.100.20,login,exito
1779700900,jperez,192.168.2.50,accion_admin,exito
1779701000,mlopez,10.20.30.40,descarga,exito
1779701010,mlopez,10.20.30.40,descarga,exito
1779701020,mlopez,10.20.30.40,descarga,exito
1779701030,mlopez,10.20.30.40,descarga,exito
1779701040,mlopez,10.20.30.40,descarga,exito
1779701050,mlopez,10.20.30.40,descarga,exito
1779701060,mlopez,10.20.30.40,descarga,exito
1779701070,mlopez,10.20.30.40,descarga,exito
1779701080,mlopez,10.20.30.40,descarga,exito
1779701090,mlopez,10.20.30.40,descarga,exito
1779701200,mperez,198.51.100.30,login,fallo
1779701210,mperez,198.51.100.30,login,fallo
1779701220,mperez,198.51.100.30,login,fallo
1779701300,mperez,198.51.100.30,login,exito
1779701400,attacker,45.33.32.156,login,exito
1779660000,lrodriguez,10.30.40.50,login,exito
1779703200,lrodriguez,192.168.4.10,login,exito
1779703600,lrodriguez,192.168.4.11,login,exito
1779701500,intruso99,203.0.113.77,login,fallo
1779701510,intruso99,203.0.113.77,login,fallo`

function loadDemo() {
  processContent(DEMO_CSV, 'demo_logs.csv')
}
</script>
