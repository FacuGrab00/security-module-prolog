<template>
  <div
      class="drop-zone"
      :class="isDragging ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/30'"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="handleDrop"
      @click="fileInput?.click()"
  >
    <Upload class="w-8 h-8 text-slate-400 mx-auto mb-2"/>
    <p class="text-sm text-slate-300">
      Arrastrá tu CSV aquí o <span class="text-cyan-400 font-medium">hacé click</span>
    </p>
    <p class="text-xs text-slate-500 mt-1">Formato: timestamp, usuario, ip, accion, resultado</p>
    <input ref="fileInput" type="file" accept=".csv" class="hidden" @change="handleFileChange"/>
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue';
import {Upload} from '@lucide/vue';
import {toast} from 'vue-sonner';

const emit = defineEmits<{ 'file-selected': [content: string, filename: string] }>();

const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

function readFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    toast.error('Tipo de archivo no válido', {description: `"${file.name}" no es un archivo CSV.`, duration: 5000});
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    emit('file-selected', ev.target?.result as string, file.name);
  };
  reader.readAsText(file);
}

function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  (e.target as HTMLInputElement).value = '';
  readFile(file);
}

function handleDrop(e: DragEvent) {
  isDragging.value = false;
  const file = e.dataTransfer?.files[0];
  if (file) readFile(file);
}
</script>

<style scoped>
.drop-zone {
  @apply border-2 border-dashed rounded-xl p-4 sm:p-6 text-center transition-all cursor-pointer;
}
</style>
