<template>
  <div class="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 flex flex-col gap-3">
    <div
        class="flex items-center gap-2 bg-slate-900 border border-slate-600 rounded-lg px-3 focus-within:border-cyan-500 transition-colors">
      <Filter class="w-4 h-4 text-slate-400 flex-shrink-0"/>
      <input
          :value="search"
          @input="emit('update:search', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="Buscar por usuario, IP o acción..."
          class="flex-1 bg-transparent text-white text-sm py-2 focus:outline-none placeholder-slate-500 min-w-0"
      />
    </div>
    <div class="flex items-center gap-2 flex-wrap">
      <AppSelect
          :model-value="resultFilter"
          @update:model-value="emit('update:resultFilter', $event)"
          :options="[
          { value: 'all',     label: 'Todos los resultados' },
          { value: 'success', label: 'Exitosos' },
          { value: 'failure', label: 'Fallidos' },
        ]"
      />
      <AppSelect
          :model-value="roleFilter"
          @update:model-value="emit('update:roleFilter', $event)"
          :options="[
          { value: 'all',      label: 'Todos los roles' },
          { value: 'admin',    label: 'Admin' },
          { value: 'operator', label: 'Operador' },
          { value: 'user',     label: 'Usuario' },
          { value: 'guest',    label: 'Invitado' },
        ]"
      />
      <span class="text-xs text-slate-500 whitespace-nowrap ml-auto">{{ count }} registros</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {Filter} from '@lucide/vue'
import AppSelect from '../shared/AppSelect.vue'

defineProps<{
  search: string
  resultFilter: string
  roleFilter: string
  count: number
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:resultFilter': [value: string]
  'update:roleFilter': [value: string]
}>()
</script>
