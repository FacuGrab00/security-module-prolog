<template>
  <div class="flex items-center justify-between px-4 py-3 border-t border-slate-700">
    <p class="text-xs text-slate-500">Página {{ page }} de {{ totalPages }}</p>
    <div class="flex gap-2">
      <AppButton size="sm" :disabled="page === 1" @click="emit('update:page', page - 1)">Anterior</AppButton>
      <AppButton size="sm" :disabled="page >= totalPages" @click="emit('update:page', page + 1)">Siguiente</AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppButton from '../shared/AppButton.vue'
defineProps<{ page: number; totalPages: number }>()
const emit = defineEmits<{ 'update:page': [value: number] }>()
</script>
