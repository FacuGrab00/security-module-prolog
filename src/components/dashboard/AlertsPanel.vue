<template>
  <div class="bg-slate-800/50 border border-slate-700 rounded-xl flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-slate-700">
      <div class="flex items-center gap-2">
        <AlertTriangle class="w-4 h-4 text-red-400" />
        <h2 class="text-white font-semibold text-sm">Alertas de Seguridad</h2>
        <span class="text-xs px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30">
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
    <div class="flex-1 overflow-y-auto max-h-[520px] p-3 space-y-2">
      <div
        v-for="alert in filteredAlerts"
        :key="alert.id"
        class="rounded-lg border bg-slate-900/50 overflow-hidden"
        :class="borderColor[alert.severity]"
      >
        <!-- Franja izquierda + contenido -->
        <div class="flex">
          <!-- Acento lateral -->
          <div class="w-1 flex-shrink-0 rounded-l-lg" :class="accentColor[alert.severity]" />

          <div class="flex-1 px-4 py-3 min-w-0">
            <!-- Título con etiqueta de severidad inline -->
            <div class="flex items-baseline justify-between gap-2 mb-1">
              <p class="text-sm font-semibold text-white leading-snug">
                <span class="text-xs font-bold uppercase tracking-wide mr-1.5" :class="severityTextColor[alert.severity]">{{ severityLabel[alert.severity] }}</span>{{ alert.label }}
              </p>
              <span class="text-xs text-slate-500 whitespace-nowrap flex-shrink-0">{{ alert.timestamp }}</span>
            </div>

            <!-- Descripción -->
            <p class="text-xs text-slate-400 leading-relaxed mb-3">{{ alert.description }}</p>

            <!-- Acciones -->
            <div class="flex items-center gap-2">
              <button
                v-if="alertIP(alert)"
                @click="emit('block-ip', alertIP(alert)!, alert)"
                class="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs rounded-md transition-colors"
              >
                <Ban class="w-3 h-3" />Bloquear IP
              </button>
              <button
                @click="store.dismissAlert(alert.id)"
                class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-slate-400 hover:text-slate-300 text-xs rounded-md transition-colors"
              >
                <X class="w-3 h-3" />Descartar
              </button>
              <button
                @click="selected = alert"
                class="flex items-center gap-1.5 px-2.5 py-1 text-slate-500 hover:text-cyan-400 text-xs rounded-md transition-colors ml-auto"
              >
                <Info class="w-3 h-3" />Ver detalles
              </button>
            </div>
          </div>
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
              <p class="text-sm text-white">{{ selected.label }}</p>
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
import { useAlertsStore } from '../../stores/alerts'
import type { SecurityAlert } from '../../types'
import { alertIP } from '../../utils/prologMapper'
import SeverityBadge from '../shared/SeverityBadge.vue'
import StatusBadge from '../shared/StatusBadge.vue'

const emit  = defineEmits<{ 'block-ip': [ip: string, alert: SecurityAlert] }>()
const store = useAlertsStore()
const filter   = ref<string>('all')
const selected = ref<SecurityAlert | null>(null)

const borderColor: Record<string, string> = {
  critical: 'border-red-500/30',
  high:     'border-orange-500/30',
  medium:   'border-yellow-500/30',
  low:      'border-blue-500/30',
}
const accentColor: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
  low:      'bg-blue-500',
}
const severityTextColor: Record<string, string> = {
  critical: 'text-red-400',
  high:     'text-orange-400',
  medium:   'text-yellow-400',
  low:      'text-blue-400',
}
const severityLabel: Record<string, string> = {
  critical: 'Crítica',
  high:     'Alta',
  medium:   'Media',
  low:      'Baja',
}

type Field = { label: string; value: string; icon: Component; mono?: boolean }

function alertFields(a: SecurityAlert): Field[] {
  switch (a.type) {
    case 'ataque_fuerza_bruta':
      return [
        { label: 'Usuario',   value: a.payload.user, icon: User,   mono: true },
        { label: 'IP origen', value: a.payload.ip,   icon: Globe,  mono: true },
      ]
    case 'ataque_masivo_ip':
      return [
        { label: 'IP origen', value: a.payload.ip, icon: Globe, mono: true },
      ]
    case 'acceso_ip_prohibida':
      return [
        { label: 'IP',     value: a.payload.ip,     icon: Globe,  mono: true  },
        { label: 'Motivo', value: a.payload.motivo,  icon: Shield, mono: false },
      ]
    case 'sesion_simultanea':
      return [
        { label: 'Usuario', value: a.payload.user, icon: User, mono: true },
      ]
    case 'acceso_horario_irregular':
      return [
        { label: 'Usuario',        value: a.payload.user, icon: User,     mono: true  },
        { label: 'Hora de acceso', value: new Date(a.payload.access_time * 1000).toLocaleString('es-AR'), icon: Calendar, mono: false },
      ]
    case 'acceso_tras_intentos':
      return [
        { label: 'Usuario',   value: a.payload.user, icon: User,  mono: true },
        { label: 'IP origen', value: a.payload.ip,   icon: Globe, mono: true },
      ]
    case 'login_cuenta_servicio':
      return [
        { label: 'Cuenta de servicio', value: a.payload.user, icon: User, mono: true },
      ]
    case 'intento_escalada':
      return [
        { label: 'Usuario', value: a.payload.user, icon: User, mono: true },
      ]
    case 'usuario_desconocido':
      return [
        { label: 'Usuario', value: a.payload.user, icon: User,  mono: true },
        { label: 'IP',      value: a.payload.ip,   icon: Globe, mono: true },
      ]
    case 'actividad_red_dispersa':
      return [
        { label: 'Usuario',   value: a.payload.user,                     icon: User, mono: true  },
        { label: 'Subredes',  value: String(a.payload.subnet_count),      icon: Globe, mono: false },
      ]
    case 'descarga_masiva':
      return [
        { label: 'Usuario', value: a.payload.user, icon: User, mono: true },
      ]
    case 'origen_sospechoso':
      return [
        { label: 'Usuario',   value: a.payload.user, icon: User,  mono: true },
        { label: 'IP origen', value: a.payload.ip,   icon: Globe, mono: true },
      ]
    case 'horario_atipico':
      return [
        { label: 'Usuario',        value: a.payload.user, icon: User, mono: true },
        { label: 'Hora de acceso', value: new Date(a.payload.access_time * 1000).toLocaleString('es-AR'), icon: Calendar, mono: false },
      ]
  }
}

const filteredAlerts = computed(() => {
  return store.alerts.filter(a => {
    if (filter.value === 'all')      return a.status !== 'resolved'
    if (filter.value === 'critical') return a.severity === 'critical' && a.status !== 'resolved'
    if (filter.value === 'high')     return a.severity === 'high'     && a.status !== 'resolved'
    if (filter.value === 'active')   return a.status === 'active'
    return true
  })
})
</script>
