<template>
  <!-- Mobile: select -->
  <AppSelect
      class="sm:hidden"
      :model-value="modelValue ?? allLabel"
      :options="[{ value: allLabel, label: allLabel }, ...options.map(o => ({ value: o, label: o }))]"
      @update:model-value="v => emit('update:modelValue', v === allLabel ? null : v)"
  />
  <!-- Desktop: botones -->
  <div class="hidden sm:flex flex-wrap gap-2">
    <button
        v-for="opt in [allLabel, ...options]"
        :key="opt"
        @click="emit('update:modelValue', opt === allLabel ? null : opt)"
        class="text-xs px-3 py-1.5 rounded-lg border transition-colors"
        :class="(opt === allLabel && !modelValue) || modelValue === opt
        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'"
    >{{ opt }}
    </button>
  </div>
</template>

<script setup lang="ts">
import AppSelect from './AppSelect.vue'

const props = withDefaults(defineProps<{
  modelValue: string | null
  options: string[]
  allLabel?: string
}>(), {allLabel: 'Todas'})

const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()
</script>
