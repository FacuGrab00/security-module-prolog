<template>
  <div
      class="px-4 py-3 flex flex-col gap-2"
      :class="log.result === 'failure' ? 'bg-red-500/5' : ''"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="text-white font-medium text-sm">{{ log.user }}</span>
      <span
          class="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
          :class="log.result === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'"
      >{{ log.result === 'success' ? 'Éxito' : 'Fallo' }}</span>
    </div>
    <div class="flex items-center gap-3">
      <span class="font-mono text-xs" :class="blocked ? 'text-red-400' : 'text-slate-300'">
        {{ log.ip }}<span v-if="blocked"> 🚫</span>
      </span>
      <RoleBadge :role="log.role"/>
    </div>
    <div class="flex items-center justify-between gap-2 text-xs text-slate-500">
      <span class="font-mono">{{ log.action }}</span>
      <span>{{ formatTs(log.timestamp) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import RoleBadge from '../shared/RoleBadge.vue'
import type {LogEntry} from '../../types'

defineProps<{ log: LogEntry; blocked: boolean }>()

function formatTs(ts: string): string {
  const n = Number(ts)
  if (!n) return ts
  return new Date(n * 1000).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
