<template>
  <div class="app-card flex flex-col">

    <!-- Header -->
    <div class="alert-panel-header">
      <div class="flex items-center gap-2">
        <AlertTriangle class="w-4 h-4 text-red-400 flex-shrink-0"/>
        <h2 class="app-section-title">Alertas de Seguridad</h2>
        <span class="status-badge bg-slate-500/20 text-slate-300 border border-slate-500/30">
          {{ store.activeAlerts.length }} activas
        </span>
      </div>
      <AppSelect v-model="filter" :options="filterOptions"/>
    </div>

    <!-- Lista -->
    <div class="flex-1 overflow-y-auto max-h-[400px] sm:max-h-[520px] p-3 space-y-2">
      <AlertItem
          v-for="alert in filteredAlerts"
          :key="alert.id"
          :alert="alert"
          @block-ip="(ip, a) => emit('block-ip', ip, a)"
          @dismiss="store.dismissAlert"
          @restore="store.restoreAlert"
          @details="selected = $event"
      />

      <template v-if="filteredAlerts.length === 0">
        <EmptyState
            v-if="!hasLogs"
            title="Sin registros cargados"
            description="Importá un archivo CSV para que el motor pueda detectar amenazas"
        >
          <template #icon>
            <ScrollText class="w-8 h-8 mb-2 opacity-20"/>
          </template>
        </EmptyState>
        <EmptyState v-else title="Sin alertas para este filtro">
          <template #icon>
            <CheckCircle class="w-8 h-8 mb-2 text-emerald-500/40"/>
          </template>
        </EmptyState>
      </template>
    </div>
  </div>

  <AlertDetailDialog :alert="selected" @close="selected = null"/>
</template>

<script setup lang="ts">
import {ref, computed} from 'vue';
import {AlertTriangle, CheckCircle, ScrollText} from '@lucide/vue';
import AppSelect from '../shared/AppSelect.vue';
import AlertItem from './AlertItem.vue';
import AlertDetailDialog from './AlertDetailDialog.vue';
import EmptyState from '../shared/EmptyState.vue';
import {useAppStore} from '../../stores/app';
import {useAlertsStore} from '../../stores/alerts';
import type {SecurityAlert} from '../../types';

const emit = defineEmits<{ 'block-ip': [ip: string, alert: SecurityAlert] }>();
const store = useAlertsStore();
const appStore = useAppStore();
const hasLogs = computed(() => (appStore.prologStats?.total_events ?? 0) > 0);
const filter = ref<string>('all');
const selected = ref<SecurityAlert | null>(null);

const filterOptions = [
  {value: 'all', label: 'Todas'},
  {value: 'critical', label: 'Críticas'},
  {value: 'high', label: 'Altas'},
  {value: 'medium', label: 'Medias'},
  {value: 'active', label: 'Activas'},
  {value: 'dismissed', label: 'Descartadas'},
];

const filteredAlerts = computed(() => {
  return store.alerts.filter(a => {
    if (filter.value === 'dismissed') return a.status === 'dismissed';
    if (filter.value === 'all') return a.status !== 'resolved' && a.status !== 'dismissed';
    if (filter.value === 'critical') return a.severity === 'critical' && a.status !== 'resolved' && a.status !== 'dismissed';
    if (filter.value === 'high') return a.severity === 'high' && a.status !== 'resolved' && a.status !== 'dismissed';
    if (filter.value === 'medium') return a.severity === 'medium' && a.status !== 'resolved' && a.status !== 'dismissed';
    if (filter.value === 'active') return a.status === 'active';
    return true;
  });
});
</script>

<style scoped>
.alert-panel-header {
  @apply flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-700;
}
</style>
