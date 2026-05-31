<template>
  <div class="space-y-6">
    <AppHeader
        title="Generación de Reporte"
    />

    <div class="px-3 sm:px-6 pb-6 space-y-6">
      <div class="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div class="report-toolbar">
          <div class="flex items-center gap-2">
            <FileText class="w-4 h-4 text-cyan-400 flex-shrink-0"/>
            <h2 class="text-white font-semibold text-sm">Reporte de Auditoría de Seguridad</h2>
          </div>

          <div class="flex gap-2 flex-wrap">
            <AppButton :loading="isGenerating" @click="loadReport">
              <template #icon>
                <RefreshCw class="w-4 h-4"/>
              </template>
              Regenerar
            </AppButton>
            <AppButton :disabled="!hasContent" @click="downloadReport">
              <template #icon>
                <Download class="w-4 h-4"/>
              </template>
              .txt
            </AppButton>
            <AppButton variant="primary" :loading="isExportingPDF" :disabled="!hasContent" @click="downloadPDF">
              <template #icon>
                <FileDown class="w-4 h-4"/>
              </template>
              {{ isExportingPDF ? 'Generando...' : 'Descargar PDF' }}
            </AppButton>
          </div>
        </div>

        <div class="p-5">
          <pre class="report-content">{{ reportContent }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, computed, onMounted} from 'vue';
import {FileText, Download, RefreshCw, FileDown} from '@lucide/vue';
import AppHeader from '../components/layout/AppHeader.vue';
import AppButton from '../components/shared/AppButton.vue';
import {useAppStore} from '../stores/app';
import {useReportPDF} from '../composables/useReportPDF';

const store = useAppStore();
const reportContent = ref('Cargando reporte desde el motor Prolog...');
const isGenerating = ref(false);

const hasContent = computed(() => {
  return reportContent.value.length > 0 &&
      !reportContent.value.startsWith('(') &&
      !reportContent.value.startsWith('⚠') &&
      !reportContent.value.startsWith('Cargando');
});

const {isExporting: isExportingPDF, downloadPDF} = useReportPDF(reportContent, computed(() => store.prologStats));

async function loadReport() {
  isGenerating.value = true;
  try {
    const content = await store.generateReport();
    if (content) {
      reportContent.value = content;
    } else if (store.stats.totalLogs === 0) {
      reportContent.value = '(Sin datos — cargá un CSV desde el Dashboard para generar el reporte)';
    } else {
      reportContent.value = '⚠ El motor Prolog devolvió una respuesta vacía.\nReintentá con el botón "Regenerar".';
    }
  } catch {
    reportContent.value = '⚠ Motor Prolog no disponible.\nIniciá el servidor con:\n\n  swipl security_engine.pl\n\nLuego recargá esta página.';
  } finally {
    isGenerating.value = false;
  }
}

onMounted(loadReport);

function downloadReport() {
  const blob = new Blob([reportContent.value], {type: 'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte_auditoria_${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<style scoped>
.report-toolbar {
  @apply flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-4 border-b border-slate-700;
}

.report-content {
  @apply text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap bg-slate-900/60 border border-slate-700 rounded-xl p-5 overflow-x-auto max-h-[600px];
}
</style>
