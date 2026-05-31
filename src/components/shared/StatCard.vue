<template>
  <div
    class="bg-slate-800/50 border rounded-xl p-3 sm:p-4 flex flex-col gap-2 sm:gap-3"
    :class="borderColor"
  >
    <div class="flex items-center justify-between gap-1">
      <span class="text-slate-400 text-xs font-medium uppercase tracking-wide leading-tight min-w-0">{{ label }}</span>
      <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0" :class="iconBg">
        <component :is="icon" class="w-3.5 h-3.5 sm:w-4 sm:h-4" :class="iconColor" />
      </div>
    </div>
    <div>
      <p class="text-xl sm:text-2xl font-bold" :class="valueColor">{{ value }}</p>
      <p class="text-xs text-slate-500 mt-0.5">{{ sub }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  label:       string
  value:       string | number
  sub:         string
  icon:        Component
  iconBg:      string
  iconColor:   string
  borderColor: string
  valueColor:  string
}>()
</script>
