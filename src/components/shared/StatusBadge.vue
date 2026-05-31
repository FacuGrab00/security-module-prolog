<template>
  <span class="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium border" :class="styles[status]">
    {{ labels[status] }}
  </span>
</template>

<script setup lang="ts">
import type { AlertStatus } from '../../types'
defineProps<{ status: AlertStatus }>()

const labels: Record<AlertStatus, string> = {
  active:        'Activa',
  investigating: 'Investigando',
  resolved:      'Resuelta',
  dismissed:     'Descartada',
};

const styles: Record<AlertStatus, string> = {
  active:        'bg-slate-500/20 text-slate-300 border-slate-500/30',
  investigating: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  resolved:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  dismissed:     'bg-slate-700/40 text-slate-500 border-slate-600/30',
};
</script>
