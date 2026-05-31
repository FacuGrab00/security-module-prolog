<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
    <StatCard v-for="card in cards" :key="card.label" v-bind="card" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ScrollText, AlertTriangle, ShieldOff, Activity, CheckCircle } from '@lucide/vue'
import { useAppStore } from '../../stores/app'
import StatCard from '../shared/StatCard.vue'

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
    valueColor: 'text-white',
  },
  {
    label: 'IPs Bloqueadas',
    value: store.stats.blockedIPs,
    sub:   'En lista de bloqueo',
    icon:  ShieldOff,
    iconBg: 'bg-orange-500/20',
    iconColor: 'text-orange-400',
    borderColor: 'border-slate-700',
    valueColor: 'text-white',
  },
  {
    label: 'Amenazas Activas',
    value: store.stats.activeThreats,
    sub:   'Sin resolver aún',
    icon:  Activity,
    iconBg: 'bg-yellow-500/20',
    iconColor: 'text-yellow-400',
    borderColor: store.stats.activeThreats > 0 ? 'border-yellow-500/30' : 'border-slate-700',
    valueColor: 'text-white',
  },
  {
    label: 'Tasa de Éxito',
    value: store.stats.successRate + '%',
    sub:   'Accesos legítimos',
    icon:  CheckCircle,
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    borderColor: 'border-slate-700',
    valueColor: 'text-white',
  },
])
</script>
