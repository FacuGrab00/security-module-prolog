<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')"/>
      <div
          class="relative w-full sm:max-w-md bg-slate-800 border border-slate-700 sm:rounded-2xl rounded-t-2xl shadow-2xl animate-slide-up">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-700">
          <div class="flex items-center gap-3">
            <div
                class="w-9 h-9 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
              <Ban class="w-5 h-5 text-red-400"/>
            </div>
            <div class="min-w-0">
              <h3 class="text-white font-semibold">Bloquear IP</h3>
              <p class="text-slate-400 text-xs">Esta acción bloqueará el acceso desde la IP indicada</p>
            </div>
          </div>
          <button @click="$emit('close')" class="text-slate-400 hover:text-white transition-colors flex-shrink-0">
            <X class="w-5 h-5"/>
          </button>
        </div>

        <!-- Body -->
        <div class="px-4 sm:px-6 py-5 space-y-4">

          <!-- Contexto de la alerta -->
          <div v-if="props.alert" class="bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3 space-y-1">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <span class="text-xs font-bold uppercase tracking-wide" :class="severityColor[props.alert.severity]">
                {{ severityLabel[props.alert.severity] }}
              </span>
              <span class="text-xs text-slate-500 font-mono">{{ props.alert.id }}</span>
            </div>
            <p class="text-sm font-semibold text-white">{{ props.alert.label }}</p>
            <p class="text-xs text-slate-400 leading-relaxed">{{ props.alert.description }}</p>
          </div>

          <div>
            <label class="block text-xs text-slate-400 mb-1.5 font-medium">Dirección IP</label>
            <input
                v-model="form.ip"
                type="text"
                placeholder="ej. 192.168.1.45"
                class="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
            />
          </div>

          <div>
            <label class="block text-xs text-slate-400 mb-1.5 font-medium">Motivo del bloqueo</label>
            <select
                v-model="form.reason"
                class="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="">Seleccionar motivo...</option>
              <option value="Fuerza bruta detectada por Prolog">Fuerza bruta detectada por Prolog</option>
              <option value="IP en lista negra">IP en lista negra</option>
              <option value="Acceso no autorizado">Acceso no autorizado</option>
              <option value="Escaneo de puertos">Escaneo de puertos</option>
              <option value="Actividad sospechosa">Actividad sospechosa</option>
            </select>
          </div>

          <div>
            <label class="block text-xs text-slate-400 mb-1.5 font-medium">Duración</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                  v-for="opt in durationOptions"
                  :key="opt.value"
                  @click="form.duration = opt.value"
                  class="py-2 text-xs rounded-lg border transition-colors"
                  :class="form.duration === opt.value
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                  : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500'"
              >{{ opt.label }}
              </button>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-slate-700">
          <button
              @click="$emit('close')"
              class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >Cancelar
          </button>
          <button
              @click="confirm"
              :disabled="!form.ip || !form.reason"
              class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors font-medium"
          >
            <Ban class="w-4 h-4"/>
            Confirmar Bloqueo
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {reactive} from 'vue'
import {Ban, X} from '@lucide/vue'
import {useIpListsStore} from '../../stores/ipLists'
import type {SecurityAlert} from '../../types'

const props = defineProps<{ ip?: string; alert?: SecurityAlert | null }>()
const emit = defineEmits<{ close: []; confirmed: [ip: string] }>()

const severityColor: Record<string, string> = {
  critical: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-blue-400',
}
const severityLabel: Record<string, string> = {
  critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja',
}
const store = useIpListsStore()

const form = reactive({ip: props.ip ?? '', reason: '', duration: 'permanent'})

const durationOptions = [
  {label: '24 horas', value: '24h'},
  {label: '7 días', value: '7d'},
  {label: 'Permanente', value: 'permanent'},
]

function confirm() {
  if (!form.ip || !form.reason) return
  store.blockIP(form.ip, form.reason, 'Administrador', form.duration)
  emit('confirmed', form.ip)
  emit('close')
}
</script>
