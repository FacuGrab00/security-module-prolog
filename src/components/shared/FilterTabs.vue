<template>
  <!-- Mobile: select -->
  <AppSelect
    class="sm:hidden"
    :model-value="modelValue ?? allLabel"
    :options="selectOptions"
    @update:model-value="(v) => { emit('update:modelValue', v === allLabel ? null : v); }"
  />
  <!-- Desktop: botones -->
  <div class="hidden sm:flex flex-wrap gap-2">
    <button
      v-for="opt in allOptions"
      :key="opt"
      @click="emit('update:modelValue', opt === allLabel ? null : opt)"
      class="text-xs px-3 py-1.5 rounded-lg border transition-colors"
      :class="isActive(opt) ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'"
    >{{ opt }}</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppSelect from './AppSelect.vue';

const props = withDefaults(defineProps<{
  modelValue: string | null;
  options:    string[];
  allLabel?:  string;
}>(), { allLabel: 'Todas' });

const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>();

const allOptions    = computed(() => [props.allLabel, ...props.options]);
const selectOptions = computed(() => allOptions.value.map(o => ({ value: o, label: o })));

function isActive(opt: string): boolean {
  return (opt === props.allLabel && !props.modelValue) || props.modelValue === opt;
}
</script>
