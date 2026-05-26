<template>
  <div class="space-y-6">
    <AppHeader
      title="Consultas de Auditoría"
      subtitle="Queries no triviales para el administrador del sistema — usan variables, recursividad y negación por falla"
    />

    <div class="px-6 pb-6 space-y-4">
      <!-- Queries -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          v-for="query in mockAuditQueries"
          :key="query.id"
          class="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-all"
        >
          <!-- Header de query -->
          <div class="px-5 py-4 border-b border-slate-700">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-mono text-cyan-500 font-medium">{{ query.id }}</span>
              <span class="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full border border-slate-600">
                {{ query.category }}
              </span>
            </div>
            <h3 class="text-white font-semibold text-sm mb-1">{{ query.title }}</h3>
            <p class="text-slate-400 text-xs leading-relaxed">{{ query.description }}</p>
          </div>

          <!-- Código Prolog -->
          <div class="px-5 py-4">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs text-slate-500 font-medium uppercase tracking-wide">Código Prolog</p>
              <button
                @click="runQuery(query.id)"
                :disabled="loading[query.id]"
                class="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-400 rounded-lg transition-colors disabled:opacity-50"
              >
                <div v-if="loading[query.id]" class="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <Play v-else class="w-3 h-3" />
                {{ loading[query.id] ? 'Consultando...' : 'Ejecutar' }}
              </button>
            </div>
            <PrologCode :code="query.prolog" />

            <!-- Resultado real del motor Prolog -->
            <div v-if="results[query.id] != null" class="mt-3">
              <p class="text-xs text-slate-500 font-medium mb-1.5">Resultado (motor Prolog):</p>
              <div
                class="flex items-start gap-2 text-xs rounded-lg px-3 py-2.5"
                :class="results[query.id] === 'false.' || results[query.id]?.startsWith('Error')
                  ? 'bg-slate-700/50 border border-slate-600'
                  : 'bg-emerald-500/10 border border-emerald-500/20'"
              >
                <CheckCircle v-if="results[query.id] !== 'false.' && !results[query.id]?.startsWith('Error')" class="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                <XCircle v-else class="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                <pre class="font-mono whitespace-pre-wrap break-all"
                  :class="results[query.id] !== 'false.' && !results[query.id]?.startsWith('Error') ? 'text-emerald-300' : 'text-slate-400'"
                >{{ results[query.id] }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Query libre -->
      <div class="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div class="flex items-center gap-2 px-5 py-4 border-b border-slate-700">
          <Terminal class="w-4 h-4 text-cyan-400" />
          <h3 class="text-white font-semibold text-sm">Consulta Libre</h3>
          <span class="text-xs text-slate-500">(modo simulado)</span>
        </div>
        <div class="px-5 py-4 space-y-3">
          <div class="flex gap-3">
            <div class="flex-1 flex items-center bg-slate-900 border border-slate-600 rounded-lg px-3 focus-within:border-cyan-500 transition-colors">
              <span class="text-cyan-400 font-mono text-sm mr-2">?-</span>
              <input
                v-model="freeQuery"
                type="text"
                placeholder="Escribe tu consulta Prolog aquí..."
                class="flex-1 bg-transparent text-white text-sm py-2 focus:outline-none font-mono placeholder-slate-600"
                @keydown.enter="runFreeQuery"
              />
            </div>
            <button
              @click="runFreeQuery"
              :disabled="freeLoading"
              class="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              <div v-if="freeLoading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <Play v-else class="w-4 h-4" />
              {{ freeLoading ? '...' : 'Ejecutar' }}
            </button>
          </div>
          <div v-if="freeResult" class="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
            <p class="text-xs text-slate-500 mb-1">Respuesta del motor Prolog:</p>
            <p class="text-sm font-mono" :class="freeResult.ok ? 'text-emerald-400' : 'text-red-400'">
              {{ freeResult.text }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Search, Play, Terminal, CheckCircle, XCircle } from '@lucide/vue'
import AppHeader from '../components/layout/AppHeader.vue'
import PrologCode from '../components/shared/PrologCode.vue'
import { auditQueries as mockAuditQueries } from '../mock/data'
import { useSecurityStore } from '../stores/security'

const store     = useSecurityStore()
const results   = reactive<Record<string, string | null>>({})
const loading   = reactive<Record<string, boolean>>({})
const freeQuery  = ref('')
const freeResult = ref<{ ok: boolean; text: string } | null>(null)
const freeLoading = ref(false)

// Mapeo de ID de query estática → tipo de endpoint Prolog real
const QUERY_TYPE_MAP: Record<string, { type: string; params?: Record<string, string> }> = {
  Q1: { type: 'multiples_subredes', params: { min: '3' } },
  Q2: { type: 'ips_comprometidas' },
  Q3: { type: 'resumen', params: { user: 'admin' } },
  Q4: { type: 'ips_comprometidas' },
}

async function runQuery(id: string) {
  const mapping = QUERY_TYPE_MAP[id]
  if (!mapping) return
  loading[id] = true
  try {
    const raw = await store.runQuery(mapping.type, mapping.params ?? {})
    results[id] = raw || 'false.'
  } catch {
    results[id] = 'Error: motor Prolog no disponible'
  } finally {
    loading[id] = false
  }
}

async function runFreeQuery() {
  if (!freeQuery.value.trim()) return
  freeLoading.value = true
  // Detecta patrón "tipo(args)" o mapea keywords a endpoints conocidos
  const q = freeQuery.value.trim().toLowerCase()
  try {
    let result: string
    if (q.includes('multiples_subredes') || q.includes('subredes')) {
      result = await store.runQuery('multiples_subredes', { min: '2' })
    } else if (q.includes('ips_comprometidas') || q.includes('distribucion')) {
      result = await store.runQuery('ips_comprometidas')
    } else if (q.includes('resumen')) {
      const match = q.match(/resumen[_(](\w+)/)
      result = await store.runQuery('resumen', { user: match?.[1] ?? 'admin' })
    } else {
      result = 'Consulta no reconocida. Tipos disponibles: multiples_subredes, ips_comprometidas, resumen'
    }
    freeResult.value = { ok: !result.startsWith('Error') && result !== 'false.', text: result || 'false.' }
  } catch {
    freeResult.value = { ok: false, text: 'Error: motor Prolog no disponible. Iniciá el servidor con: swipl security_engine.pl' }
  } finally {
    freeLoading.value = false
  }
}
</script>
