<template>
  <div class="app-card">
    <div class="flex items-center gap-2 px-4 sm:px-5 py-4 border-b border-slate-700">
      <Upload class="w-4 h-4 text-cyan-400 flex-shrink-0"/>
      <h2 class="app-section-title">Ingesta de Datos CSV</h2>
    </div>

    <div class="px-4 sm:px-5 py-4 space-y-4">
      <CSVDropZone @file-selected="processContent"/>

      <CSVFormatExample/>

      <div class="flex gap-2">
        <AppButton variant="cyan" class="flex-1 justify-center" :loading="store.isLoading" @click="loadDemo">
          <template #icon>
            <FlaskConical class="w-4 h-4"/>
          </template>
          Cargar demo
        </AppButton>
        <AppButton v-if="store.loadedFiles.length > 0" variant="red" :disabled="store.isLoading" @click="confirmClear">
          <template #icon>
            <Trash2 class="w-4 h-4"/>
          </template>
          Limpiar todo
        </AppButton>
      </div>

      <div v-if="store.isLoading" class="loading-banner">
        <div class="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin flex-shrink-0"/>
        <div>
          <p class="text-xs text-cyan-300 font-medium">Analizando con motor Prolog...</p>
          <p class="text-xs text-slate-500">Convirtiendo CSV a hechos y evaluando reglas</p>
        </div>
      </div>

      <CSVFileHistory v-if="store.loadedFiles.length > 0" :files="store.loadedFiles"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import {Upload, FlaskConical, Trash2} from '@lucide/vue';
import {toast} from 'vue-sonner';
import {useAppStore} from '../../stores/app';
import {DEMO_CSV} from '../../data/demoCSV';
import AppButton from '../shared/AppButton.vue';
import CSVDropZone from './CSVDropZone.vue';
import CSVFormatExample from './CSVFormatExample.vue';
import CSVFileHistory from './CSVFileHistory.vue';

const store = useAppStore();

const REQUIRED_HEADERS = ['timestamp', 'usuario', 'ip', 'accion', 'resultado'];
const VALID_RESULTS = new Set(['exito', 'fallo']);

interface ValidationResult {
  ok: boolean;
  errors: string[];
  rows: number;
}

function validateCSV(content: string): ValidationResult {
  const errors: string[] = [];
  const lines = content.trim().split('\n').filter(Boolean);

  if (lines.length === 0) return {ok: false, errors: ['El archivo está vacío.'], rows: 0};

  const headers = lines[0].trim().toLowerCase().split(',').map(h => h.trim());

  if (headers.length !== REQUIRED_HEADERS.length) {
    errors.push(`La cabecera tiene ${headers.length} columna(s) pero se esperan ${REQUIRED_HEADERS.length}. Esperado: ${REQUIRED_HEADERS.join(', ')}`);
    return {ok: false, errors, rows: 0};
  }

  const wrongCols = REQUIRED_HEADERS
      .map((h, i) => headers[i] !== h ? `columna ${i + 1}: se esperaba "${h}", se encontró "${headers[i]}"` : null)
      .filter(Boolean) as string[];

  if (wrongCols.length > 0) {
    errors.push(`Cabecera incorrecta — ${wrongCols.join('; ')}`);
    return {ok: false, errors, rows: 0};
  }

  const dataLines = lines.slice(1);
  if (dataLines.length === 0) {
    errors.push('El CSV sólo tiene cabecera, no hay filas de datos.');
    return {ok: false, errors, rows: 0};
  }

  const rowErrors: string[] = [];
  dataLines.forEach((line, idx) => {
    const row = line.trim();
    if (!row) return;
    const fields = row.split(',').map(f => f.trim());
    const lineNum = idx + 2;

    if (fields.length !== 5) {
      rowErrors.push(`Línea ${lineNum}: se esperan 5 columnas, se encontraron ${fields.length}`);
      return;
    }

    const [ts, usuario, ip, , resultado] = fields;
    if (!/^\d+$/.test(ts)) rowErrors.push(`Línea ${lineNum}: el timestamp "${ts}" no es un número entero`);
    if (!usuario) rowErrors.push(`Línea ${lineNum}: el campo "usuario" está vacío`);
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) rowErrors.push(`Línea ${lineNum}: la IP "${ip}" no tiene un formato válido`);
    if (!VALID_RESULTS.has(resultado.toLowerCase())) rowErrors.push(`Línea ${lineNum}: el resultado "${resultado}" no es válido (debe ser "exito" o "fallo")`);
  });

  if (rowErrors.length > 0) {
    const shown = rowErrors.slice(0, 5);
    if (rowErrors.length > 5) shown.push(`… y ${rowErrors.length - 5} error(es) más`);
    return {ok: false, errors: shown, rows: 0};
  }

  return {ok: true, errors: [], rows: dataLines.filter(l => l.trim()).length};
}

async function processContent(content: string, filename: string) {
  const validation = validateCSV(content);

  if (!validation.ok) {
    toast.error('CSV inválido — no se importó', {description: validation.errors[0], duration: 8000});
    validation.errors.slice(1).forEach(err => toast.warning(err, {duration: 8000}));
    return;
  }

  try {
    const body = await store.importCSV(content, filename);
    if (body?.ok) {
      const added = body.records_added ?? body.records_loaded ?? validation.rows;
      const skipped = body.records_skipped ?? 0;
      const total = body.total_in_db ?? body.records_loaded ?? added;

      if (skipped > 0) {
        toast.success(`${added} registros nuevos cargados`, {
          description: `${skipped} duplicado(s) omitido(s) · ${total} registros en memoria`,
          duration: 6000
        });
      } else {
        toast.success(`${added} registros cargados desde "${filename}"`, {
          description: `Total en memoria: ${total} registros`,
          duration: 5000
        });
      }
    } else {
      toast.error('Error en el motor Prolog', {
        description: body?.error ?? 'El servidor rechazó el archivo.',
        duration: 8000
      });
    }
  } catch {
    toast.error('Sin conexión al motor Prolog', {
      description: 'Verificá que el servidor Prolog esté corriendo en el puerto configurado.',
      duration: 8000
    });
  }
}

async function confirmClear() {
  if (!window.confirm('¿Eliminar todos los registros cargados en memoria?')) return;
  try {
    await store.clearData();
    toast.success('Datos limpiados', {
      description: 'Todos los registros fueron eliminados del motor Prolog.',
      duration: 4000
    });
  } catch {
    toast.error('No se pudo limpiar', {description: 'Verificá la conexión con el servidor Prolog.', duration: 6000});
  }
}

function loadDemo() {
  processContent(DEMO_CSV, 'demo_logs.csv');
}
</script>

<style scoped>
.loading-banner {
  @apply flex items-center gap-3 px-3 py-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg;
}
</style>
