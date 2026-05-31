<template>
  <div class="bg-slate-800/50 border border-slate-700 rounded-xl flex flex-col">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-700">
      <div class="flex items-center gap-2">
        <AlertTriangle class="w-4 h-4 text-red-400 flex-shrink-0" />
        <h2 class="text-white font-semibold text-sm">Alertas de Seguridad</h2>
        <span class="text-xs px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30">
          {{ store.activeAlerts.length }} activas
        </span>
      </div>
      <AppSelect v-model="filter" :options="[
        { value: 'all',       label: 'Todas' },
        { value: 'critical',  label: 'Críticas' },
        { value: 'high',      label: 'Altas' },
        { value: 'medium',    label: 'Medias' },
        { value: 'active',    label: 'Activas' },
        { value: 'dismissed', label: 'Descartadas' },
      ]" />
    </div>

    <!-- Lista -->
    <div class="flex-1 overflow-y-auto max-h-[400px] sm:max-h-[520px] p-3 space-y-2">
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

          <div class="flex-1 px-3 sm:px-4 py-3 min-w-0">
            <!-- Título y timestamp: apilados en mobile, en línea en desktop -->
            <div class="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-2 mb-1">
              <p class="text-sm font-semibold text-white leading-snug min-w-0">
                <span class="text-xs font-bold uppercase tracking-wide mr-1.5" :class="severityTextColor[alert.severity]">{{ severityLabel[alert.severity] }}</span>{{ alert.label }}
              </p>
              <span class="text-xs text-slate-500 flex-shrink-0">{{ alert.timestamp }}</span>
            </div>

            <!-- Descripción -->
            <p class="text-xs text-slate-400 leading-relaxed mb-3">{{ alert.description }}</p>

            <!-- Acciones -->
            <div class="flex flex-wrap items-center gap-2">
              <template v-if="alert.status !== 'dismissed'">
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
              </template>
              <button
                v-if="alert.status === 'dismissed'"
                @click="store.restoreAlert(alert.id)"
                class="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs rounded-md transition-colors"
              >
                <RotateCcw class="w-3 h-3" />Restaurar
              </button>
              <button
                @click="selected = alert"
                class="flex items-center gap-1.5 px-2.5 py-1 text-slate-500 hover:text-cyan-400 text-xs rounded-md transition-colors sm:ml-auto"
              >
                <Info class="w-3 h-3" />Ver detalles
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredAlerts.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-500 text-center px-4">
        <template v-if="!hasLogs">
          <ScrollText class="w-8 h-8 mb-2 opacity-20" />
          <p class="text-sm font-medium text-slate-400">Sin registros cargados</p>
          <p class="text-xs mt-1">Importá un archivo CSV para que el motor pueda detectar amenazas</p>
        </template>
        <template v-else>
          <CheckCircle class="w-8 h-8 mb-2 text-emerald-500/40" />
          <p class="text-sm">Sin alertas para este filtro</p>
        </template>
      </div>
    </div>
  </div>

  <!-- Dialog de detalles -->
  <Teleport to="body">
    <Transition name="dialog">
    <div v-if="selected" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="selected = null" />
      <div class="dialog-panel relative w-full sm:max-w-lg bg-slate-800 border border-slate-700 sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh]">

        <!-- Drag handle (mobile) -->
        <div class="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        <!-- Header -->
        <div class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-700 flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
              <Info class="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            </div>
            <div class="min-w-0">
              <h3 class="text-white font-semibold text-sm sm:text-base">Detalles de la alerta</h3>
              <p class="text-slate-400 text-xs font-mono">{{ selected.id }}</p>
            </div>
          </div>
          <button @click="selected = null" class="text-slate-400 hover:text-white transition-colors flex-shrink-0 p-1">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Body (scrolleable) -->
        <div class="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">

          <!-- Chips de estado -->
          <div class="flex items-center gap-2 flex-wrap">
            <SeverityBadge :severity="selected.severity" />
            <StatusBadge :status="selected.status" />
          </div>

          <!-- Campos dinámicos -->
          <div class="grid grid-cols-2 gap-2 sm:gap-3">
            <div class="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5">
              <p class="text-xs text-slate-500 mb-1 flex items-center gap-1.5"><Clock class="w-3 h-3" />Detectada</p>
              <p class="text-xs sm:text-sm text-white">{{ selected.timestamp }}</p>
            </div>
            <div class="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5">
              <p class="text-xs text-slate-500 mb-1 flex items-center gap-1.5"><Tag class="w-3 h-3" />Tipo</p>
              <p class="text-xs sm:text-sm text-white break-words">{{ selected.label }}</p>
            </div>

            <template v-for="field in alertFields(selected)" :key="field.label">
              <div class="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5">
                <p class="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                  <component :is="field.icon" class="w-3 h-3" />{{ field.label }}
                </p>
                <p class="text-xs sm:text-sm text-white break-all" :class="field.mono ? 'font-mono' : ''">{{ field.value }}</p>
              </div>
            </template>

            <div v-if="selected.count" class="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5">
              <p class="text-xs text-slate-500 mb-1 flex items-center gap-1.5"><Hash class="w-3 h-3" />Eventos</p>
              <p class="text-xs sm:text-sm text-white">{{ selected.count }}</p>
            </div>
          </div>

          <!-- Descripción -->
          <div class="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5">
            <p class="text-xs text-slate-500 mb-1.5">Descripción</p>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">{{ selected.description }}</p>
          </div>

        </div>

        <!-- Footer -->
        <div class="flex justify-end px-4 sm:px-6 py-3 border-t border-slate-700 flex-shrink-0">
          <button
            @click="selected = null"
            class="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
          >Cerrar</button>
        </div>
      </div>
    </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, type Component } from 'vue'
import { AlertTriangle, User, Globe, Hash, Ban, X, Info, Clock, CheckCircle, Tag, Shield, Calendar, ScrollText, RotateCcw } from '@lucide/vue'
import AppSelect from '../shared/AppSelect.vue'
import { useAppStore } from '../../stores/app'
import { useAlertsStore } from '../../stores/alerts'
import type { SecurityAlert } from '../../types'
import { alertIP } from '../../utils/prologMapper'
import SeverityBadge from '../shared/SeverityBadge.vue'
import StatusBadge from '../shared/StatusBadge.vue'

const emit       = defineEmits<{ 'block-ip': [ip: string, alert: SecurityAlert] }>()
const store      = useAlertsStore()
const appStore   = useAppStore()
const hasLogs    = computed(() => (appStore.prologStats?.total_events ?? 0) > 0)
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
        { label: 'Usuario',   value: a.payload.user,                icon: User,  mono: true  },
        { label: 'Subredes',  value: String(a.payload.subnet_count), icon: Globe, mono: false },
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
    if (filter.value === 'dismissed') return a.status === 'dismissed'
    if (filter.value === 'all')       return a.status !== 'resolved' && a.status !== 'dismissed'
    if (filter.value === 'critical')  return a.severity === 'critical' && a.status !== 'resolved' && a.status !== 'dismissed'
    if (filter.value === 'high')      return a.severity === 'high'     && a.status !== 'resolved' && a.status !== 'dismissed'
    if (filter.value === 'medium')    return a.severity === 'medium'   && a.status !== 'resolved' && a.status !== 'dismissed'
    if (filter.value === 'active')    return a.status === 'active'
    return true
  })
})
</script>

<style scoped>
/* Backdrop: fade */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.25s ease;
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

/* Panel mobile: slide up */
.dialog-enter-active .dialog-panel {
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}
.dialog-leave-active .dialog-panel {
  transition: transform 0.25s ease-in;
}
.dialog-enter-from .dialog-panel,
.dialog-leave-to .dialog-panel {
  transform: translateY(100%);
}

/* Panel desktop: scale + fade */
@media (min-width: 640px) {
  .dialog-enter-active .dialog-panel {
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
  }
  .dialog-leave-active .dialog-panel {
    transition: transform 0.2s ease-in, opacity 0.15s ease;
  }
  .dialog-enter-from .dialog-panel,
  .dialog-leave-to .dialog-panel {
    transform: scale(0.95);
    opacity: 0;
  }
}
</style>
