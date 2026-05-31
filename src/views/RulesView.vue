<template>
  <div class="space-y-6">
    <AppHeader
      title="Base de Conocimiento"
      subtitle="13 reglas lógicas Prolog para identificación de comportamientos anómalos — audit_engine.pl"
    />

    <div class="px-3 sm:px-6 pb-6 space-y-4">
      <!-- Info -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard v-for="card in statCards" :key="card.label" v-bind="card" />
      </div>

      <!-- Filtro por categoría -->
      <!-- Mobile: select -->
      <AppSelect
        class="sm:hidden"
        :model-value="filterCat ?? 'Todas'"
        :options="[{ value: 'Todas', label: 'Todas las categorías' }, ...categories.map(c => ({ value: c, label: c }))]"
        @update:model-value="v => filterCat = v === 'Todas' ? null : v"
      />
      <!-- Desktop: botones -->
      <div class="hidden sm:flex flex-wrap gap-2">
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
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="rule in filteredRules"
          :key="rule.id"
          class="bg-slate-800/50 border rounded-xl overflow-hidden transition-all"
          :class="rule.triggered > 0 ? 'border-yellow-500/30' : 'border-slate-700'"
        >
          <!-- Header -->
          <div class="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-slate-700 bg-slate-800/80">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-xs font-mono text-slate-500 flex-shrink-0">{{ rule.id }}</span>
              <span class="text-sm font-mono font-semibold text-white truncate">{{ rule.name }}</span>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span class="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">{{ rule.category }}</span>
              <span
                v-if="rule.triggered > 0"
                class="text-xs px-2 py-0.5 bg-slate-700/60 text-slate-400 rounded-full"
              >
                {{ rule.triggered }}
              </span>
            </div>
          </div>

          <!-- Body -->
          <div class="px-4 sm:px-5 py-4">
            <p class="text-xs text-slate-400 mb-3 leading-relaxed">{{ rule.description }}</p>
            <PrologCode :code="rule.code" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { BookOpen, Tag, Zap } from '@lucide/vue'
import AppHeader from '../components/layout/AppHeader.vue'
import PrologCode from '../components/shared/PrologCode.vue'
import StatCard from '../components/shared/StatCard.vue'
import AppSelect from '../components/shared/AppSelect.vue'
import { prologRulesDefinitions } from '../mock/data'
import { useAlertsStore } from '../stores/alerts'
import type { PrologRule } from '../types'

const store     = useAlertsStore()
const filterCat = ref<string | null>(null)

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

const triggeredByRule = computed(() => {
  const counts: Record<string, number> = {}
  for (const alert of store.alerts) {
    const predicado = alert.prologRule?.split('(')[0]?.trim() ?? ''
    const ruleId = ALERT_TYPE_TO_RULE[predicado]
    if (ruleId) counts[ruleId] = (counts[ruleId] ?? 0) + 1
  }
  return counts
})

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

const statCards = computed(() => [
  {
    label: 'Reglas definidas',
    value: rules.value.length,
    sub:   'En el motor Prolog',
    icon:  BookOpen,
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
    borderColor: 'border-slate-700',
    valueColor: 'text-white',
  },
  {
    label: 'Categorías',
    value: categories.value.length,
    sub:   'Tipos de amenaza',
    icon:  Tag,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    borderColor: 'border-slate-700',
    valueColor: 'text-blue-400',
  },
  {
    label: 'Veces activadas',
    value: totalTriggered.value,
    sub:   'Total de disparos',
    icon:  Zap,
    iconBg: 'bg-yellow-500/20',
    iconColor: 'text-yellow-400',
    borderColor: totalTriggered.value > 0 ? 'border-yellow-500/30' : 'border-slate-700',
    valueColor: totalTriggered.value > 0 ? 'text-yellow-400' : 'text-white',
  },
])
</script>
