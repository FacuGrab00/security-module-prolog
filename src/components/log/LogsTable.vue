<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-slate-700 bg-slate-800/80">
          <th class="text-left text-xs text-slate-400 font-medium px-4 py-3">Fecha</th>
          <th class="text-left text-xs text-slate-400 font-medium px-4 py-3">Usuario</th>
          <th class="text-left text-xs text-slate-400 font-medium px-4 py-3">IP</th>
          <th class="text-left text-xs text-slate-400 font-medium px-4 py-3">Rol</th>
          <th class="hidden lg:table-cell text-left text-xs text-slate-400 font-medium px-4 py-3">Acción</th>
          <th class="hidden lg:table-cell text-left text-xs text-slate-400 font-medium px-4 py-3">País</th>
          <th class="text-left text-xs text-slate-400 font-medium px-4 py-3">Resultado</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-700/50">
        <tr
          v-for="log in logs"
          :key="log.id"
          class="hover:bg-slate-700/30 transition-colors"
          :class="log.result === 'failure' ? 'bg-red-500/5' : ''"
        >
          <td class="px-4 py-2.5 whitespace-nowrap text-xs text-slate-300">{{ formatTs(log.timestamp) }}</td>
          <td class="px-4 py-2.5 text-xs text-white font-medium">{{ log.user }}</td>
          <td class="px-4 py-2.5">
            <span class="font-mono text-xs" :class="isBlocked(log.ip) ? 'text-red-400' : 'text-slate-300'">{{ log.ip }}</span>
            <span v-if="isBlocked(log.ip)" class="ml-1 text-xs">🚫</span>
          </td>
          <td class="px-4 py-2.5"><RoleBadge :role="log.role" /></td>
          <td class="hidden lg:table-cell px-4 py-2.5 text-xs text-slate-300 font-mono">{{ log.action }}</td>
          <td class="hidden lg:table-cell px-4 py-2.5 text-xs text-slate-400">
            <span class="flex items-center gap-1">
              <span>{{ flags[log.country] ?? '🌐' }}</span>
              {{ log.country }}
            </span>
          </td>
          <td class="px-4 py-2.5">
            <span
              class="text-xs px-2 py-0.5 rounded-full font-medium"
              :class="log.result === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'"
            >{{ log.result === 'success' ? 'Éxito' : 'Fallo' }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import RoleBadge from '../shared/RoleBadge.vue'
import type { LogEntry } from '../../types'

defineProps<{ logs: LogEntry[]; isBlocked: (ip: string) => boolean }>()

const flags: Record<string, string> = { AR: '🇦🇷', RU: '🇷🇺', US: '🇺🇸', BR: '🇧🇷', CN: '🇨🇳' }

function formatTs(ts: string): string {
  const n = Number(ts)
  if (!n) return ts
  return new Date(n * 1000).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>
