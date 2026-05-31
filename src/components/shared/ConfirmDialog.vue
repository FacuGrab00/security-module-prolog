<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('update:modelValue', false)"/>
        <div class="dialog-panel">
          <div class="dialog-header">
            <component :is="icon" class="w-5 h-5 flex-shrink-0" :class="iconClass"/>
            <h3 class="app-section-title">{{ title }}</h3>
          </div>
          <div class="px-5 py-4">
            <p class="text-sm text-slate-300 leading-relaxed">{{ message }}</p>
          </div>
          <div class="dialog-footer gap-2">
            <AppButton @click="emit('update:modelValue', false)">Cancelar</AppButton>
            <AppButton :variant="confirmVariant" @click="onConfirm">{{ confirmLabel }}</AppButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {computed, type Component} from 'vue';
import {AlertTriangle, Info} from '@lucide/vue';
import AppButton from './AppButton.vue';

const props = withDefaults(defineProps<{
  modelValue: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'secondary' | 'cyan' | 'emerald' | 'red' | 'ghost';
}>(), {
  confirmLabel: 'Confirmar',
  confirmVariant: 'red',
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'confirm': [];
}>();

const icon = computed((): Component => props.confirmVariant === 'red' ? AlertTriangle : Info);
const iconClass = computed(() => props.confirmVariant === 'red' ? 'text-red-400' : 'text-cyan-400');

function onConfirm() {
  emit('confirm');
  emit('update:modelValue', false);
}
</script>

<style scoped>
.dialog-panel {
  @apply relative w-full sm:max-w-sm bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl;
}

.dialog-header {
  @apply flex items-center gap-3 px-5 py-4 border-b border-slate-700;
}

.dialog-footer {
  @apply flex justify-end px-5 py-4 border-t border-slate-700;
}

/* Animación */
.dialog-enter-active, .dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-from, .dialog-leave-to {
  opacity: 0;
}

.dialog-enter-active .dialog-panel {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
}

.dialog-leave-active .dialog-panel {
  transition: transform 0.15s ease-in, opacity 0.15s ease;
}

.dialog-enter-from .dialog-panel, .dialog-leave-to .dialog-panel {
  transform: scale(0.95);
  opacity: 0;
}
</style>
