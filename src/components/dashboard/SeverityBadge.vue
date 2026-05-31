<template>
  <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border"
        :class="styles[severity]">
    <span class="w-1.5 h-1.5 rounded-full" :class="dot[severity]"/>
    {{ labels[severity] }}
  </span>
</template>

<script setup lang="ts">
import type {AlertSeverity} from '../../types'

defineProps<{ severity: AlertSeverity }>()

const labels: Record<AlertSeverity, string> = {
  critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja',
}
const styles: Record<AlertSeverity, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}
const dot: Record<AlertSeverity, string> = {
  critical: 'bg-red-400',
  high: 'bg-orange-400',
  medium: 'bg-yellow-400',
  low: 'bg-blue-400',
}
</script>
