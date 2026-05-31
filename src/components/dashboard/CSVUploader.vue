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

  <ConfirmDialog
      v-model="showConfirm"
      title="Limpiar registros"
      message="Se eliminarán todos los registros cargados en memoria del motor Prolog. Esta acción no se puede deshacer."
      confirm-label="Limpiar todo"
      @confirm="doClear"
  />
</template>

<script setup lang="ts">
import {ref} from 'vue';
import {Upload, FlaskConical, Trash2} from '@lucide/vue';
import {toast} from 'vue-sonner';
import {useAppStore} from '../../stores/app';
import {DEMO_CSV} from '../../data/demoCSV';
import {useCSVValidation} from '../../composables/useCSVValidation';
import ConfirmDialog from '../shared/ConfirmDialog.vue';
import AppButton from '../shared/AppButton.vue';
import CSVDropZone from './CSVDropZone.vue';
import CSVFormatExample from './CSVFormatExample.vue';
import CSVFileHistory from './CSVFileHistory.vue';

const store = useAppStore();
const {validateCSV} = useCSVValidation();
const showConfirm = ref(false);

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
      const added = Number(body.records_added ?? body.records_loaded ?? validation.rows);
      const skipped = Number(body.records_skipped ?? 0);
      const total = Number(body.total_in_db ?? body.records_loaded ?? added);

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

function confirmClear() {
  showConfirm.value = true;
}

async function doClear() {
  try {
    await store.clearData();
    toast.success('Datos limpiados', {
      description: 'Todos los registros fueron eliminados del motor Prolog.',
      duration: 4000,
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
