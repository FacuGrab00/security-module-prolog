<template>
  <header class="h-14 bg-dark-900 border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-20">
    <div>
      <h1 class="text-white font-semibold text-base">{{ title }}</h1>
      <p class="text-slate-500 text-xs">{{ subtitle }}</p>
    </div>

    <div class="flex items-center gap-4">
      <!-- Estado del motor Prolog (real) -->
      <div
        class="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
        :class="store.prologOnline
          ? 'bg-slate-800 border-slate-700'
          : 'bg-red-500/10 border-red-500/30'"
      >
        <span
          class="w-2 h-2 rounded-full"
          :class="store.prologOnline ? 'bg-emerald-400 animate-pulse-slow' : 'bg-red-400'"
        />
        <span class="text-xs text-slate-300">Motor Prolog</span>
        <span
          class="text-xs font-medium"
          :class="store.prologOnline ? 'text-emerald-400' : 'text-red-400'"
        >{{ store.prologOnline ? 'Activo' : 'Desconectado' }}</span>
      </div>

      <!-- Última actualización -->
      <div class="text-xs text-slate-500">
        Actualizado: <span class="text-slate-300">{{ store.stats.lastUpdate }}</span>
      </div>

      <!-- Botón alerta crítica pulsante -->
      <button
        v-if="store.criticalAlerts.length > 0"
        class="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/40 rounded-lg text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors animate-pulse-slow"
      >
        <AlertTriangle class="w-3.5 h-3.5" />
        {{ store.criticalAlerts.length }} Crítica{{ store.criticalAlerts.length > 1 ? 's' : '' }}
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { AlertTriangle } from '@lucide/vue'
import { useSecurityStore } from '../../stores/security'

defineProps<{ title: string; subtitle?: string }>()
const store = useSecurityStore()
</script>
