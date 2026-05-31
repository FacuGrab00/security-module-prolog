<template>
  <div class="grid gap-2" :class="`grid-cols-${options.length}`">
    <button
      v-for="opt in options"
      :key="opt.value"
      @click="emit('update:modelValue', opt.value)"
      class="py-2 text-xs rounded-lg border transition-colors"
      :class="optClass(opt.value)"
    >{{ opt.label }}</button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string;
  options:    { value: string; label: string }[];
}>();

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

function optClass(value: string): string {
  return props.modelValue === value
    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
    : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500';
}
</script>
