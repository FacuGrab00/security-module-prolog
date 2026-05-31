<template>
  <div class="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
    <div class="flex items-center gap-2 px-4 sm:px-5 py-4 border-b border-slate-700">
      <Terminal class="w-4 h-4 text-cyan-400 flex-shrink-0"/>
      <h3 class="text-white font-semibold text-sm">Consulta Libre</h3>
    </div>
    <div class="px-4 sm:px-5 py-4 space-y-3">
      <div class="flex flex-col sm:flex-row gap-2">
        <div
            class="flex-1 flex items-center bg-slate-900 border border-slate-600 rounded-lg px-3 focus-within:border-cyan-500 transition-colors">
          <span class="text-cyan-400 font-mono text-sm mr-2 flex-shrink-0">?-</span>
          <input
              v-model="query"
              type="text"
              placeholder="Escribe tu consulta Prolog aquí..."
              class="flex-1 min-w-0 bg-transparent text-white text-sm py-2 focus:outline-none font-mono placeholder-slate-600"
              @keydown.enter="run"
          />
        </div>
        <AppButton variant="primary" :loading="loading" @click="run">
          <template #icon><Play class="w-4 h-4" /></template>
          Ejecutar
        </AppButton>
      </div>
      <div v-if="result" class="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
        <p class="text-xs text-slate-500 mb-1">Respuesta del motor Prolog:</p>
        <p class="text-sm font-mono" :class="result.ok ? 'text-emerald-400' : 'text-red-400'">
          {{ result.text }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import {Play, Terminal} from '@lucide/vue'
import AppButton from './AppButton.vue'
import {useAppStore} from '../../stores/app'

const store = useAppStore()
const query = ref('')
const loading = ref(false)
const result = ref<{ ok: boolean; text: string } | null>(null)

async function run() {
  if (!query.value.trim()) return
  loading.value = true
  try {
    const body = await store.runFreeQuery(query.value.trim())
    if (body.ok) {
      const solutions = body.solutions ?? 0
      const label = solutions === 1 ? '1 solución' : `${solutions} soluciones`
      result.value = {ok: true, text: solutions === 0 ? 'false.' : `${body.result}\n\n% ${label}`}
    } else {
      result.value = {ok: false, text: String(body.error ?? 'Error desconocido')}
    }
  } catch {
    result.value = {ok: false, text: 'Error: motor Prolog no disponible. Iniciá el servidor con: swipl server.pl'}
  } finally {
    loading.value = false
  }
}
</script>
