<template>
  <footer
      class="fixed bottom-0 left-0 md:left-64 right-0 border-t border-slate-800 bg-slate-900/90 backdrop-blur-sm px-6 py-2 flex justify-end z-10">
    <span class="text-xs text-slate-500">
      Última actualización: <span class="text-slate-400 font-medium tabular-nums">{{ store.stats.lastUpdate }}</span>
    </span>
  </footer>
</template>

<script setup lang="ts">
import {useAppStore} from '../../stores/app'

const store = useAppStore()
</script>
