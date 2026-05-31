<template>
  <header class="h-14 bg-dark-900 border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-20">
    <div>
      <h1 class="text-white font-semibold text-base">{{ title }}</h1>
    </div>

    <div class="flex items-center gap-4">
      <!-- Estado del motor Prolog (real) -->
      <div
        class="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
        :class="appStore.prologOnline
          ? 'bg-slate-800 border-slate-700'
          : 'bg-red-500/10 border-red-500/30'"
      >
        <span
          class="w-2 h-2 rounded-full"
          :class="appStore.prologOnline ? 'bg-emerald-400 animate-pulse-slow' : 'bg-red-400'"
        />
        <span class="text-xs text-slate-300">Motor Prolog</span>
        <span
          class="text-xs font-medium"
          :class="appStore.prologOnline ? 'text-emerald-400' : 'text-red-400'"
        >{{ appStore.prologOnline ? 'Activo' : 'Desconectado' }}</span>
      </div>

    </div>
  </header>
</template>

<script setup lang="ts">
import { useAppStore } from '../../stores/app'

defineProps<{ title: string; subtitle?: string }>()
const appStore = useAppStore()
</script>
