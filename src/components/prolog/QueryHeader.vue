<template>
  <div class="px-4 sm:px-5 py-4 border-b border-slate-700">
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs font-mono text-cyan-500 font-medium">{{ id }}</span>
      <span class="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full border border-slate-600">
        {{ category }}
      </span>
    </div>
    <h3 class="text-white font-semibold text-sm mb-1">{{ title }}</h3>
    <p class="text-slate-400 text-xs leading-relaxed">{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ id: string; category: string; title: string; description: string }>()
</script>
