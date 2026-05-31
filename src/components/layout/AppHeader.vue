<template>
  <header
      class="h-14 bg-dark-900 border-b border-slate-800 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-20">
    <div class="flex items-center gap-3">
      <!-- Hamburger (mobile only) -->
      <button
          class="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          @click="sidebar.toggle"
          aria-label="Menú"
      >
        <Menu class="w-5 h-5"/>
      </button>
      <h1 class="text-white font-semibold text-sm sm:text-base">{{ title }}</h1>
    </div>

    <div class="flex items-center gap-2 sm:gap-4">
      <!-- Estado del motor Prolog -->
      <div
          class="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg border"
          :class="appStore.prologOnline
          ? 'bg-slate-800 border-slate-700'
          : 'bg-red-500/10 border-red-500/30'"
      >
        <span
            class="w-2 h-2 rounded-full flex-shrink-0"
            :class="appStore.prologOnline ? 'bg-emerald-400 animate-pulse-slow' : 'bg-red-400'"
        />
        <span class="hidden sm:inline text-xs text-slate-300">Motor Prolog</span>
        <span
            class="text-xs font-medium"
            :class="appStore.prologOnline ? 'text-emerald-400' : 'text-red-400'"
        >{{ appStore.prologOnline ? 'Activo' : 'Desconectado' }}</span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import {Menu} from '@lucide/vue'
import {useAppStore} from '../../stores/app'
import {useSidebar} from '../../composables/useSidebar'

defineProps<{ title: string }>()
const appStore = useAppStore()
const sidebar = useSidebar()
</script>
