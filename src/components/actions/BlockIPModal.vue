<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')"/>
      <div class="modal-panel">

        <!-- Header -->
        <div class="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-700">
          <div class="flex items-center gap-3">
            <div
                class="w-9 h-9 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
              <Ban class="w-5 h-5 text-red-400"/>
            </div>
            <div class="min-w-0">
              <h3 class="app-section-title">Bloquear IP</h3>
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
          <div v-if="props.alert" class="field-box space-y-1">
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
            <label class="form-label">Dirección IP</label>
            <input v-model="form.ip" type="text" placeholder="ej. 192.168.1.45" class="form-input"/>
          </div>

          <div>
            <label class="form-label">Motivo del bloqueo</label>
            <AppSelect v-model="form.reason" class="w-full" size="md" :options="reasonOptions"/>
          </div>

          <div>
            <label class="form-label">Duración</label>
            <ToggleTabs v-model="form.duration" :options="durationOptions"/>
          </div>

        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-slate-700">
          <AppButton variant="ghost" @click="$emit('close')">Cancelar</AppButton>
          <AppButton variant="red" :disabled="!form.ip" @click="confirm">
            <template #icon>
              <Ban class="w-4 h-4"/>
            </template>
            Confirmar Bloqueo
          </AppButton>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {reactive} from 'vue';
import {Ban, X} from '@lucide/vue';
import AppSelect from '../shared/AppSelect.vue';
import AppButton from '../shared/AppButton.vue';
import ToggleTabs from '../shared/ToggleTabs.vue';
import {useIpListsStore} from '../../stores/ipLists';
import type {SecurityAlert} from '../../types';

const props = defineProps<{ ip?: string; alert?: SecurityAlert | null }>();
const emit = defineEmits<{ close: []; confirmed: [ip: string] }>();

const store = useIpListsStore();

const severityColor: Record<string, string> = {
  critical: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-blue-400',
};

const severityLabel: Record<string, string> = {
  critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja',
};

const reasonOptions = [
  {value: 'Fuerza bruta detectada por Prolog', label: 'Fuerza bruta detectada por Prolog'},
  {value: 'IP en lista negra', label: 'IP en lista negra'},
  {value: 'Acceso no autorizado', label: 'Acceso no autorizado'},
  {value: 'Escaneo de puertos', label: 'Escaneo de puertos'},
  {value: 'Actividad sospechosa', label: 'Actividad sospechosa'},
];

const durationOptions = [
  {label: '24 horas', value: '24h'},
  {label: '7 días', value: '7d'},
  {label: 'Permanente', value: 'permanent'},
];

const form = reactive({ip: props.ip ?? '', reason: reasonOptions[0].value, duration: 'permanent'});

function confirm() {
  if (!form.ip) return;
  store.blockIP(form.ip, form.reason, 'Administrador', form.duration);
  emit('confirmed', form.ip);
  emit('close');
}
</script>

<style scoped>
.modal-panel {
  @apply relative w-full sm:max-w-md bg-slate-800 border border-slate-700 sm:rounded-2xl rounded-t-2xl shadow-2xl animate-slide-up;
}

.form-label {
  @apply block text-xs text-slate-400 mb-1.5 font-medium;
}

.form-input {
  @apply w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono;
}
</style>
