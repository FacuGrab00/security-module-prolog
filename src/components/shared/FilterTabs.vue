<template>
  <!-- Mobile: select -->
  <AppSelect
      class="sm:hidden"
      :model-value="modelValue ?? label"
      :options="selectOptions"
      @update:model-value="onSelect"
  />
  <!-- Desktop: botones -->
  <div class="hidden sm:flex flex-wrap gap-2">
    <button
        v-for="opt in allOptions"
        :key="opt"
        @click="onSelect(opt)"
        class="text-xs px-3 py-1.5 rounded-lg border transition-colors"
        :class="optClass(opt)"
    >{{ opt }}
    </button>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import AppSelect from './AppSelect.vue';

const props = defineProps<{
  modelValue: string | null;
  options: string[];
  allLabel?: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>();

const label = computed<string>(() => props.allLabel ?? 'Todas');
const allOptions = computed<string[]>(() => [label.value, ...props.options]);
const selectOptions = computed(() => allOptions.value.map(o => ({value: o, label: o})));

function onSelect(opt: string) {
  emit('update:modelValue', opt === label.value ? null : opt);
}

function isActive(opt: string): boolean {
  return (opt === label.value && !props.modelValue) || props.modelValue === opt;
}

function optClass(opt: string): string {
  return isActive(opt)
    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600';
}
</script>
