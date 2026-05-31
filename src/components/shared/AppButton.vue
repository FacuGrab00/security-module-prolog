<template>
  <button
      v-bind="$attrs"
      :disabled="disabled || loading"
      :class="[baseClass, variantClass, sizeClass]"
  >
    <div v-if="loading" :class="spinnerClass"/>
    <slot v-else name="icon"/>
    <slot/>
  </button>
</template>

<script setup lang="ts">
import {computed} from 'vue'

defineOptions({inheritAttrs: false})

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'cyan' | 'emerald' | 'red' | 'ghost'
  size?: 'sm' | 'md'
  loading?: boolean
  disabled?: boolean
}>(), {
  variant: 'secondary',
  size: 'md',
  loading: false,
  disabled: false,
})

const baseClass = 'flex items-center transition-colors disabled:opacity-40 rounded-lg'

const sizeClass = computed(() => props.size === 'sm'
    ? 'gap-1.5 text-xs px-2.5 py-1'
    : 'gap-2 text-sm px-3 py-2'
)

const variantClass = computed(() => ({
  primary: 'bg-cyan-600 hover:bg-cyan-500 text-white font-medium',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-300',
  cyan: 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-400',
  emerald: 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400',
  red: 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400',
  ghost: 'text-slate-500 hover:text-cyan-400',
}[props.variant]))

const spinnerClass = computed(() => {
  const size = props.size === 'sm' ? 'w-3 h-3 border' : 'w-4 h-4 border-2'
  const color = {
    primary: 'border-white',
    secondary: 'border-slate-300',
    cyan: 'border-cyan-400',
    emerald: 'border-emerald-400',
    red: 'border-red-400',
    ghost: 'border-slate-400',
  }[props.variant]
  return `${size} ${color} border-t-transparent rounded-full animate-spin`
})
</script>
