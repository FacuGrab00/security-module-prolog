<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
    <div
      v-for="card in cards"
      :key="card.label"
      class="bg-slate-800/50 border rounded-xl p-3 sm:p-4 flex flex-col gap-2 sm:gap-3"
      :class="card.borderColor"
    >
      <div class="flex items-center justify-between">
        <span class="text-slate-400 text-xs font-medium uppercase tracking-wide leading-tight">{{ card.label }}</span>
        <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0" :class="card.iconBg">
          <component :is="card.icon" class="w-3.5 h-3.5 sm:w-4 sm:h-4" :class="card.iconColor" />
        </div>
      </div>
      <div>
        <p class="text-xl sm:text-2xl font-bold" :class="card.valueColor">{{ card.value }}</p>
        <p class="text-xs text-slate-500 mt-0.5">{{ card.sub }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ScrollText, AlertTriangle, ShieldOff, Activity, CheckCircle } from '@lucide/vue'
import { useAppStore } from '../../stores/app'

const store = useAppStore()

const cards = computed(() => [
  {
    label: 'Logs Procesados',
    value: store.stats.totalLogs,
    sub:   'Eventos analizados',
    icon:  ScrollText,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    borderColor: 'border-slate-700',
    valueColor: 'text-white',
  },
  {
    label: 'Alertas Críticas',
    value: store.stats.criticalAlerts,
    sub:   'Requieren acción inmediata',
    icon:  AlertTriangle,
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400',
    borderColor: store.stats.criticalAlerts > 0 ? 'border-red-500/40' : 'border-slate-700',
    valueColor: store.stats.criticalAlerts > 0 ? 'text-red-400' : 'text-white',
  },
  {
    label: 'IPs Bloqueadas',
    value: store.stats.blockedIPs,
    sub:   'En lista de bloqueo',
    icon:  ShieldOff,
    iconBg: 'bg-orange-500/20',
    iconColor: 'text-orange-400',
    borderColor: 'border-slate-700',
    valueColor: 'text-orange-400',
  },
  {
    label: 'Amenazas Activas',
    value: store.stats.activeThreats,
    sub:   'Sin resolver aún',
    icon:  Activity,
    iconBg: 'bg-yellow-500/20',
    iconColor: 'text-yellow-400',
    borderColor: store.stats.activeThreats > 0 ? 'border-yellow-500/30' : 'border-slate-700',
    valueColor: store.stats.activeThreats > 0 ? 'text-yellow-400' : 'text-white',
  },
  {
    label: 'Tasa de Éxito',
    value: store.stats.successRate + '%',
    sub:   'Accesos legítimos',
    icon:  CheckCircle,
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    borderColor: 'border-slate-700',
    valueColor: 'text-emerald-400',
  },
])
</script>
