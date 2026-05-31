<template>
  <div class="space-y-6">
    <AppHeader title="Base de Conocimiento"/>

    <div class="px-3 sm:px-6 pb-6 space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard v-for="card in statCards" :key="card.label" v-bind="card"/>
      </div>

      <FilterTabs v-model="filterCat" :options="categories" all-label="Todas"/>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RuleCard v-for="rule in filteredRules" :key="rule.id" :rule="rule"/>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, computed} from 'vue'
import {BookOpen, Tag, Zap} from '@lucide/vue'
import AppHeader from '../components/layout/AppHeader.vue'
import RuleCard from '../components/prolog/RuleCard.vue'
import StatCard from '../components/shared/StatCard.vue'
import FilterTabs from '../components/shared/FilterTabs.vue'
import {prologRulesDefinitions} from '../data/prologRules'
import {useAlertsStore} from '../stores/alerts'
import type {PrologRule} from '../types'

const store = useAlertsStore()
const filterCat = ref<string | null>(null)

const ALERT_TYPE_TO_RULE: Record<string, string> = {
  ataque_fuerza_bruta: 'R01',
  ataque_masivo_ip: 'R02',
  acceso_horario_irregular: 'R03',
  acceso_ip_prohibida: 'R04',
  login_cuenta_servicio: 'R05',
  actividad_red_dispersa: 'R06',
  intento_escalada: 'R07',
  descarga_masiva: 'R08',
  acceso_tras_intentos: 'R09',
  usuario_desconocido: 'R10',
  horario_atipico: 'R11',
  origen_sospechoso: 'R12',
  sesion_simultanea: 'R13',
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

const categories = computed(() => [...new Set(rules.value.map(r => r.category))])
const totalTriggered = computed(() => rules.value.reduce((s, r) => s + r.triggered, 0))
const filteredRules = computed(() =>
    filterCat.value ? rules.value.filter(r => r.category === filterCat.value) : rules.value
)

const statCards = computed(() => [
  {
    label: 'Reglas definidas',
    value: rules.value.length,
    sub: 'En el motor Prolog',
    icon: BookOpen,
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
    borderColor: 'border-slate-700',
    valueColor: 'text-white',
  },
  {
    label: 'Categorías',
    value: categories.value.length,
    sub: 'Tipos de amenaza',
    icon: Tag,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    borderColor: 'border-slate-700',
    valueColor: 'text-white',
  },
  {
    label: 'Veces activadas',
    value: totalTriggered.value,
    sub: 'Total de disparos',
    icon: Zap,
    iconBg: 'bg-yellow-500/20',
    iconColor: 'text-yellow-400',
    borderColor: totalTriggered.value > 0 ? 'border-yellow-500/30' : 'border-slate-700',
    valueColor: 'text-white',
  },
])
</script>
