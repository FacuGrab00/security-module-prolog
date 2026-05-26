<template>
  <div class="space-y-6">
    <AppHeader
      title="Base de Conocimiento"
      subtitle="13 reglas lógicas Prolog para identificación de comportamientos anómalos — audit_engine.pl"
    />

    <div class="px-6 pb-6 space-y-4">
      <!-- Info -->
      <div class="grid grid-cols-3 gap-4 text-center">
        <div class="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p class="text-2xl font-bold text-white">{{ rules.length }}</p>
          <p class="text-xs text-slate-400 mt-1">Reglas definidas</p>
        </div>
        <div class="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p class="text-2xl font-bold text-cyan-400">{{ categories.length }}</p>
          <p class="text-xs text-slate-400 mt-1">Categorías</p>
        </div>
        <div class="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p class="text-2xl font-bold text-yellow-400">{{ totalTriggered }}</p>
          <p class="text-xs text-slate-400 mt-1">Veces activadas</p>
        </div>
      </div>

      <!-- Filtro por categoría -->
      <div class="flex flex-wrap gap-2">
        <button
          v-for="cat in ['Todas', ...categories]"
          :key="cat"
          @click="filterCat = cat === 'Todas' ? null : cat"
          class="text-xs px-3 py-1.5 rounded-lg border transition-colors"
          :class="(cat === 'Todas' && !filterCat) || filterCat === cat
            ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'"
        >{{ cat }}</button>
      </div>

      <!-- Reglas -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          v-for="rule in filteredRules"
          :key="rule.id"
          class="bg-slate-800/50 border rounded-xl overflow-hidden transition-all"
          :class="rule.triggered > 0 ? 'border-yellow-500/30' : 'border-slate-700'"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-3 border-b border-slate-700 bg-slate-800/80">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono text-slate-500">{{ rule.id }}</span>
              <span class="text-sm font-mono font-semibold text-white">{{ rule.name }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">{{ rule.category }}</span>
              <span
                v-if="rule.triggered > 0"
                class="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full"
              >
                🔥 {{ rule.triggered }}×
              </span>
              <span v-else class="text-xs text-slate-600">0 triggers</span>
            </div>
          </div>

          <!-- Body -->
          <div class="px-5 py-4">
            <p class="text-xs text-slate-400 mb-3 leading-relaxed">{{ rule.description }}</p>
            <pre class="text-xs text-cyan-300 font-mono bg-slate-900/60 border border-slate-700/50 rounded-lg p-3 leading-relaxed overflow-x-auto whitespace-pre-wrap">{{ rule.code }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppHeader from '../components/layout/AppHeader.vue'
import { prologRulesDefinitions } from '../mock/data'
import { useSecurityStore } from '../stores/security'
import type { PrologRule } from '../types'

const store     = useSecurityStore()
const filterCat = ref<string | null>(null)

// Mapeo: tipo de alerta Prolog (campo "type" del JSON) → id de regla estática
const ALERT_TYPE_TO_RULE: Record<string, string> = {
  ataque_fuerza_bruta:      'R01',
  ataque_masivo_ip:         'R02',
  acceso_horario_irregular: 'R03',
  acceso_ip_prohibida:      'R04',
  login_cuenta_servicio:    'R05',
  actividad_red_dispersa:   'R06',
  intento_escalada:         'R07',
  descarga_masiva:          'R08',
  acceso_tras_intentos:     'R09',
  usuario_desconocido:      'R10',
  horario_atipico:          'R11',
  origen_sospechoso:        'R12',
  sesion_simultanea:        'R13',
}

// Cuenta cuántas alertas disparó cada regla usando el campo "prologRule" que
// ya contiene el nombre del predicado (ej. "ataque_fuerza_bruta(admin, 1.2.3.4).")
const triggeredByRule = computed(() => {
  const counts: Record<string, number> = {}
  for (const alert of store.alerts) {
    // Extraer el nombre del predicado del fragmento de código Prolog almacenado
    const predicado = alert.prologRule?.split('(')[0]?.trim() ?? ''
    const ruleId = ALERT_TYPE_TO_RULE[predicado]
    if (ruleId) counts[ruleId] = (counts[ruleId] ?? 0) + 1
  }
  return counts
})

// Combina definiciones estáticas con triggered count dinámico
const rules = computed((): PrologRule[] =>
  prologRulesDefinitions.map(r => ({
    ...r,
    triggered: triggeredByRule.value[r.id] ?? 0,
  }))
)

const categories     = computed(() => [...new Set(rules.value.map(r => r.category))])
const totalTriggered = computed(() => rules.value.reduce((s, r) => s + r.triggered, 0))
const filteredRules  = computed(() =>
  filterCat.value ? rules.value.filter(r => r.category === filterCat.value) : rules.value
)
</script>
