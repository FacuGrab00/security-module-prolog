<template>
  <div class="alert-card" :class="borderColor[alert.severity]">
    <div class="flex">
      <div class="w-1 flex-shrink-0 rounded-l-lg" :class="accentColor[alert.severity]"/>
      <div class="flex-1 px-3 sm:px-4 py-3 min-w-0">

        <div class="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-2 mb-1">
          <p class="text-sm font-semibold text-white leading-snug min-w-0">
            <span class="text-xs font-bold uppercase tracking-wide mr-1.5" :class="severityTextColor[alert.severity]">
              {{ severityLabel[alert.severity] }}
            </span>{{ alert.label }}
          </p>
          <span class="text-xs text-slate-500 flex-shrink-0">{{ alert.timestamp }}</span>
        </div>

        <p class="text-xs text-slate-400 leading-relaxed mb-3">{{ alert.description }}</p>

        <div class="flex flex-wrap items-center gap-2">
          <template v-if="alert.status !== 'dismissed'">
            <AppButton v-if="alertIP(alert)" variant="red" size="sm" @click="emit('block-ip', alertIP(alert)!, alert)">
              <template #icon><Ban class="w-3 h-3"/></template>
              Bloquear IP
            </AppButton>
            <AppButton variant="secondary" size="sm" @click="emit('dismiss', alert.id)">
              <template #icon><X class="w-3 h-3"/></template>
              Descartar
            </AppButton>
          </template>
          <AppButton v-if="alert.status === 'dismissed'" variant="emerald" size="sm" @click="emit('restore', alert.id)">
            <template #icon><RotateCcw class="w-3 h-3"/></template>
            Restaurar
          </AppButton>
          <AppButton variant="ghost" size="sm" class="sm:ml-auto" @click="emit('details', alert)">
            <template #icon><Info class="w-3 h-3"/></template>
            Ver detalles
          </AppButton>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Ban, X, Info, RotateCcw } from '@lucide/vue';
import AppButton from '../shared/AppButton.vue';
import type { SecurityAlert } from '../../types';
import { alertIP } from '../../utils/prologMapper';

defineProps<{ alert: SecurityAlert }>();

const emit = defineEmits<{
  'block-ip': [ip: string, alert: SecurityAlert];
  'dismiss':  [id: string];
  'restore':  [id: string];
  'details':  [alert: SecurityAlert];
}>();

const borderColor: Record<string, string> = {
  critical: 'border-red-500/30',
  high:     'border-orange-500/30',
  medium:   'border-yellow-500/30',
  low:      'border-blue-500/30',
};

const accentColor: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
  low:      'bg-blue-500',
};

const severityTextColor: Record<string, string> = {
  critical: 'text-red-400',
  high:     'text-orange-400',
  medium:   'text-yellow-400',
  low:      'text-blue-400',
};

const severityLabel: Record<string, string> = {
  critical: 'Crítica',
  high:     'Alta',
  medium:   'Media',
  low:      'Baja',
};
</script>

<style scoped>
.alert-card {
  @apply rounded-lg border bg-slate-900/50 overflow-hidden;
}
</style>
