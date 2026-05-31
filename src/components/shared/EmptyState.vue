<template>
  <div class="px-4 py-16 text-center">
    <div class="flex flex-col items-center gap-2 text-slate-500">
      <slot name="icon">
        <FileText class="w-10 h-10 opacity-20 mb-1"/>
      </slot>
      <p class="text-sm font-medium text-slate-400">{{ title }}</p>
      <p v-if="description" class="text-xs">{{ description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import {FileText} from '@lucide/vue'

defineProps<{ title: string; description?: string }>()
</script>
