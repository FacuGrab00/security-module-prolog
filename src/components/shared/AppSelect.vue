<template>
  <div class="relative">
    <select
        :value="modelValue"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
        :class="size === 'md' ? 'py-2 text-sm' : 'py-1.5 text-xs'"
        class="appearance-none bg-slate-900 border border-slate-600 text-slate-300 rounded-lg pl-3 pr-7 focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer w-full"
    >
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
    <ChevronDown class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400"/>
  </div>
</template>

<script setup lang="ts">
import {ChevronDown} from '@lucide/vue'

withDefaults(defineProps<{
  modelValue: string
  options:    { value: string; label: string }[]
  size?:      'sm' | 'md'
}>(), { size: 'sm' })

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
