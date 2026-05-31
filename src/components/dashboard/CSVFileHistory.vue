<template>
  <div class="space-y-1">
    <p class="text-xs text-slate-400 font-medium mb-2">Archivos en memoria</p>
    <div v-for="(file, i) in files" :key="i" class="file-history-row">
      <div class="flex items-center gap-2 min-w-0">
        <FileText class="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>
        <span class="text-xs text-slate-300 truncate font-mono">{{ file.name }}</span>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0 text-xs">
        <span class="text-emerald-400 font-medium">+{{ file.recordsAdded }}</span>
        <span v-if="file.recordsSkipped > 0" class="text-amber-400">{{ file.recordsSkipped }} dup.</span>
        <span class="text-slate-500">{{ file.loadedAt }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {FileText} from '@lucide/vue';

defineProps<{
  files: { name: string; recordsAdded: number; recordsSkipped: number; loadedAt: string }[];
}>();
</script>

<style scoped>
.file-history-row {
  @apply flex items-center justify-between gap-3 px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg;
}
</style>
