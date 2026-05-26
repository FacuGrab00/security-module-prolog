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
            <span class="text-xs font-mono text-slate-500">{{ alert.id }}</span>
            <SeverityBadge :severity="alert.severity" />
            <StatusBadge :status="alert.status" />
          </div>
          <span class="text-xs text-slate-500 whitespace-nowrap">{{ alert.timestamp }}</span>
        </div>

        <!-- Tipo y descripción -->
        <p class="text-sm font-medium text-white mb-1">{{ alert.type }}</p>
        <p class="text-xs text-slate-400 mb-3 leading-relaxed">{{ alert.description }}</p>

        <!-- Meta -->
        <div class="flex items-center gap-4 text-xs text-slate-500 mb-3">
          <span class="flex items-center gap-1"><User class="w-3 h-3" />{{ alert.user }}</span>
          <span class="flex items-center gap-1"><Globe class="w-3 h-3" />{{ alert.ip }}</span>
          <span v-if="alert.count" class="flex items-center gap-1">
            <Hash class="w-3 h-3" />{{ alert.count }} evento{{ alert.count > 1 ? 's' : '' }}
          </span>
        </div>

        <!-- Regla Prolog -->
        <div class="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 mb-3">
          <p class="text-xs text-cyan-400 font-mono leading-relaxed">{{ alert.prologRule }}</p>
        </div>

        <!-- Acciones -->
        <div class="flex items-center gap-2">
          <button
            v-if="alert.status === 'active'"
            @click="emit('block-ip', alert.ip)"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-xs rounded-lg transition-colors"
          >
            <Ban class="w-3 h-3" />Bloquear IP
          </button>
          <button
            v-if="alert.status === 'active'"
            @click="emit('notify-user', alert.user)"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-400 text-xs rounded-lg transition-colors"
          >
            <Bell class="w-3 h-3" />Notificar
          </button>
          <button
            v-if="alert.status === 'active'"
            @click="store.updateAlertStatus(alert.id, 'investigating')"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 text-xs rounded-lg transition-colors"
          >
            <Search class="w-3 h-3" />Investigar
          </button>
          <button
            v-if="alert.status !== 'resolved'"
            @click="store.updateAlertStatus(alert.id, 'resolved')"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-xs rounded-lg transition-colors"
          >
            <CheckCircle class="w-3 h-3" />Resolver
          </button>
        </div>
      </div>

      <div v-if="filteredAlerts.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-500">
        <CheckCircle class="w-8 h-8 mb-2 text-emerald-500/40" />
        <p class="text-sm">Sin alertas para este filtro</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { AlertTriangle, User, Globe, Hash, Ban, Bell, Search, CheckCircle } from '@lucide/vue'
import { useSecurityStore } from '../../stores/security'
import SeverityBadge from '../shared/SeverityBadge.vue'
import StatusBadge from '../shared/StatusBadge.vue'

const emit  = defineEmits<{ 'block-ip': [ip: string]; 'notify-user': [user: string] }>()
const store = useSecurityStore()
const filter = ref<string>('all')

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
