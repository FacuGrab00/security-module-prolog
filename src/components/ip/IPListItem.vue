<template>
  <div class="ip-list-item group">
    <div class="flex items-center gap-2 min-w-0">
      <div class="w-1.5 h-1.5 rounded-full flex-shrink-0" :class="dotClass"/>
      <div class="min-w-0">
        <p class="text-sm font-mono text-white">{{ ip }}</p>
        <p v-if="motivo" class="text-xs text-slate-500 truncate">{{ motivo }}</p>
      </div>
    </div>
    <button
        @click="emit('remove')"
        :disabled="removing"
        class="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-slate-500 rounded transition-all flex-shrink-0"
        :class="removeHoverClass"
        :title="removeTitle"
    >
      <div v-if="removing" class="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin"/>
      <component v-else :is="removeIcon" class="w-3 h-3"/>
    </button>
  </div>
</template>

<script setup lang="ts">
import {computed, type Component} from 'vue';
import {Trash2, ShieldOff} from '@lucide/vue';

const props = withDefaults(defineProps<{
  ip: string;
  motivo?: string;
  removing: boolean;
  variant?: 'emerald' | 'red';
}>(), {variant: 'emerald'});

const emit = defineEmits<{ remove: [] }>();

const dotClass = computed(() => props.variant === 'emerald' ? 'bg-emerald-400' : 'bg-red-400');
const removeIcon = computed((): Component => props.variant === 'emerald' ? Trash2 : ShieldOff);
const removeTitle = computed(() => props.variant === 'emerald' ? 'Eliminar de lista blanca' : 'Quitar de lista negra');
const removeHoverClass = computed(() => props.variant === 'emerald'
    ? 'hover:text-red-400 hover:bg-red-500/10'
    : 'hover:text-emerald-400 hover:bg-emerald-500/10'
);
</script>
