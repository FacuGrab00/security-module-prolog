<template>
  <div class="bg-slate-800/50 border border-slate-700 rounded-xl flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-slate-700">
      <div class="flex items-center gap-2">
        <AlertTriangle class="w-4 h-4 text-red-400" />
        <h2 class="text-white font-semibold text-sm">Alertas de Seguridad</h2>
        <span class="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
          {{ store.activeAlerts.length }} activas
        </span>
      </div>
      <select v-model="filter" class="text-xs bg-slate-700 border border-slate-600 text-slate-300 rounded-lg px-2 py-1">
        <option value="all">Todas</option>
        <option value="critical">Críticas</option>
        <option value="high">Altas</option>
        <option value="active">Activas</option>
      </select>
    </div>

    <!-- Lista -->
    <div class="flex-1 overflow-y-auto divide-y divide-slate-700/50 max-h-[520px]">
      <div
        v-for="alert in filteredAlerts"
        :key="alert.id"
        class="px-5 py-4 hover:bg-slate-700/30 transition-colors"
      >
        <!-- Top row -->
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-slate-700 border border-slate-600 text-slate-400">{{ alert.id }}</span>
            <SeverityBadge :severity="alert.severity" />
            <StatusBadge :status="alert.status" />
          </div>
          <span class="text-xs text-slate-500 whitespace-nowrap">{{ alert.timestamp }}</span>
        </div>

        <!-- Tipo y descripción -->
        <p class="text-sm font-medium text-white mb-1">{{ alert.type }}</p>
        <p class="text-xs text-slate-400 mb-3 leading-relaxed">{{ alert.description }}</p>

        <!-- Acciones -->
        <div class="flex items-center gap-2">
          <button
            @click="emit('block-ip', alert.ip)"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-xs rounded-lg transition-colors"
          >
            <Ban class="w-3 h-3" />Bloquear IP
          </button>
          <button
            @click="store.dismissAlert(alert.id)"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/60 hover:bg-slate-700 border border-slate-600 text-slate-400 hover:text-slate-300 text-xs rounded-lg transition-colors"
          >
            <X class="w-3 h-3" />Descartar
          </button>
          <button
            @click="selected = alert"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/60 hover:bg-slate-700 border border-slate-600 text-slate-400 hover:text-slate-300 text-xs rounded-lg transition-colors ml-auto"
          >
            <Info class="w-3 h-3" />Detalles
          </button>
        </div>
      </div>

      <div v-if="filteredAlerts.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-500">
        <CheckCircle class="w-8 h-8 mb-2 text-emerald-500/40" />
        <p class="text-sm">Sin alertas para este filtro</p>
      </div>
    </div>
  </div>

  <!-- Dialog de detalles -->
  <Teleport to="body">
    <div v-if="selected" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="selected = null" />
      <div class="relative w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Info class="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 class="text-white font-semibold">Detalles de la alerta</h3>
              <p class="text-slate-400 text-xs font-mono">{{ selected.id }}</p>
            </div>
          </div>
          <button @click="selected = null" class="text-slate-400 hover:text-white transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 space-y-4">

          <!-- Chips de estado -->
          <div class="flex items-center gap-2 flex-wrap">
            <SeverityBadge :severity="selected.severity" />
            <StatusBadge :status="selected.status" />
          </div>

          <!-- Campos dinámicos según tipo de alerta -->
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
              <p class="text-xs text-slate-500 mb-1 flex items-center gap-1.5"><Clock class="w-3 h-3" />Detectada</p>
              <p class="text-sm text-white">{{ selected.timestamp }}</p>
            </div>
            <div class="bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
              <p class="text-xs text-slate-500 mb-1 flex items-center gap-1.5"><Tag class="w-3 h-3" />Tipo</p>
              <p class="text-sm text-white">{{ selected.type }}</p>
            </div>

            <template v-for="field in alertFields(selected)" :key="field.label">
              <div class="bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
                <p class="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                  <component :is="field.icon" class="w-3 h-3" />{{ field.label }}
                </p>
                <p class="text-sm text-white" :class="field.mono ? 'font-mono' : ''">{{ field.value }}</p>
              </div>
            </template>

            <div v-if="selected.count" class="bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
              <p class="text-xs text-slate-500 mb-1 flex items-center gap-1.5"><Hash class="w-3 h-3" />Eventos</p>
              <p class="text-sm text-white">{{ selected.count }}</p>
            </div>
          </div>

          <!-- Descripción -->
          <div class="bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
            <p class="text-xs text-slate-500 mb-1.5">Descripción</p>
            <p class="text-sm text-slate-300 leading-relaxed">{{ selected.description }}</p>
          </div>

        </div>

        <!-- Footer -->
        <div class="flex justify-end px-6 py-4 border-t border-slate-700">
          <button
            @click="selected = null"
            class="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
          >Cerrar</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, type Component } from 'vue'
import { AlertTriangle, User, Globe, Hash, Ban, X, Info, Clock, CheckCircle, Tag, Shield, Calendar } from '@lucide/vue'
import { useSecurityStore } from '../../stores/security'
import type { SecurityAlert } from '../../types'
import SeverityBadge from '../shared/SeverityBadge.vue'
import StatusBadge from '../shared/StatusBadge.vue'

const emit  = defineEmits<{ 'block-ip': [ip: string] }>()
const store = useSecurityStore()
const filter   = ref<string>('all')
const selected = ref<SecurityAlert | null>(null)

type Field = { label: string; value: string; icon: Component; mono?: boolean }

function alertFields(a: SecurityAlert): Field[] {
  const e = a.rawEntity
  const d = a.rawDetail

  switch (a.alertType) {
    case 'ataque_fuerza_bruta':
      return [
        { label: 'Usuario',   value: e, icon: User,   mono: true },
        { label: 'IP origen', value: d, icon: Globe,  mono: true },
      ]
    case 'ataque_masivo_ip':
      return [
        { label: 'IP origen', value: e, icon: Globe,  mono: true },
      ]
    case 'acceso_ip_prohibida':
      return [
        { label: 'IP',        value: e, icon: Globe,  mono: true },
        { label: 'Motivo',    value: d, icon: Shield, mono: false },
      ]
    case 'sesion_simultanea':
      return [
        { label: 'Usuario',   value: e, icon: User,   mono: true },
      ]
    case 'acceso_horario_irregular':
      return [
        { label: 'Usuario',         value: e,                                                   icon: User,     mono: true  },
        { label: 'Hora de acceso',  value: new Date(Number(d) * 1000).toLocaleString('es-AR'),  icon: Calendar, mono: false },
      ]
    case 'acceso_tras_intentos':
      return [
        { label: 'Usuario',   value: e, icon: User,  mono: true },
        { label: 'IP origen', value: d, icon: Globe, mono: true },
      ]
    case 'login_cuenta_servicio':
      return [
        { label: 'Cuenta de servicio', value: e, icon: User, mono: true },
      ]
    case 'intento_escalada':
      return [
        { label: 'Usuario', value: e, icon: User, mono: true },
      ]
    case 'usuario_desconocido':
      return [
        { label: 'Usuario', value: e, icon: User,  mono: true },
        { label: 'IP',      value: d, icon: Globe, mono: true },
      ]
    default:
      return [
        { label: 'Entidad', value: e, icon: User  },
        { label: 'Detalle', value: d, icon: Globe },
      ]
  }
}

const filteredAlerts = computed(() => {
  return store.alerts.filter(a => {
    if (filter.value === 'all')      return true
    if (filter.value === 'critical') return a.severity === 'critical'
    if (filter.value === 'high')     return a.severity === 'high'
    if (filter.value === 'active')   return a.status === 'active'
    return true
  })
})
</script>
