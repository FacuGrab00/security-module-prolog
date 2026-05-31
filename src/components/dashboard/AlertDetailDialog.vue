<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="alert" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')"/>
        <div class="dialog-panel">

          <!-- Drag handle (mobile) -->
          <div class="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
            <div class="w-10 h-1 rounded-full bg-slate-600"/>
          </div>

          <!-- Header -->
          <div class="dialog-header">
            <div class="flex items-center gap-3">
              <div class="dialog-icon">
                <Info class="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400"/>
              </div>
              <div class="min-w-0">
                <h3 class="app-section-title sm:text-base">Detalles de la alerta</h3>
                <p class="text-slate-400 text-xs font-mono">{{ alert.id }}</p>
              </div>
            </div>
            <AppButton variant="ghost" class="flex-shrink-0" @click="emit('close')">
              <template #icon><X class="w-5 h-5"/></template>
            </AppButton>
          </div>

          <!-- Body -->
          <div class="dialog-body">

            <div class="flex items-center gap-2 flex-wrap">
              <SeverityBadge :severity="alert.severity"/>
              <StatusBadge :status="alert.status"/>
            </div>

            <div class="grid grid-cols-2 gap-2 sm:gap-3">
              <div class="field-box">
                <p class="field-label"><Clock class="w-3 h-3"/>Detectada</p>
                <p class="text-xs sm:text-sm text-white">{{ alert.timestamp }}</p>
              </div>
              <div class="field-box">
                <p class="field-label"><Tag class="w-3 h-3"/>Tipo</p>
                <p class="text-xs sm:text-sm text-white break-words">{{ alert.label }}</p>
              </div>

              <template v-for="field in alertFields(alert)" :key="field.label">
                <div class="field-box">
                  <p class="field-label">
                    <component :is="field.icon" class="w-3 h-3"/>{{ field.label }}
                  </p>
                  <p class="text-xs sm:text-sm text-white break-all" :class="fieldTextClass(field.mono)">
                    {{ field.value }}</p>
                </div>
              </template>

              <div v-if="alert.count" class="field-box">
                <p class="field-label"><Hash class="w-3 h-3"/>Eventos</p>
                <p class="text-xs sm:text-sm text-white">{{ alert.count }}</p>
              </div>
            </div>

            <div class="field-box">
              <p class="text-xs text-slate-500 mb-1.5">Descripción</p>
              <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">{{ alert.description }}</p>
            </div>

          </div>

          <!-- Footer -->
          <div class="dialog-footer">
            <AppButton @click="emit('close')">Cerrar</AppButton>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {type Component} from 'vue';
import {Info, X, Clock, Tag, Hash, User, Globe, Shield, Calendar} from '@lucide/vue';
import AppButton from '../shared/AppButton.vue';
import SeverityBadge from './SeverityBadge.vue';
import StatusBadge from './StatusBadge.vue';
import type {SecurityAlert} from '../../types';

defineProps<{ alert: SecurityAlert | null }>();
const emit = defineEmits<{ close: [] }>();

type Field = { label: string; value: string; icon: Component; mono?: boolean };

function fieldTextClass(mono?: boolean): string {
  return mono ? 'font-mono' : '';
}

function alertFields(a: SecurityAlert): Field[] {
  switch (a.type) {
    case 'ataque_fuerza_bruta':
      return [
        {label: 'Usuario', value: a.payload.user, icon: User, mono: true},
        {label: 'IP origen', value: a.payload.ip, icon: Globe, mono: true},
      ];
    case 'ataque_masivo_ip':
      return [
        {label: 'IP origen', value: a.payload.ip, icon: Globe, mono: true},
      ];
    case 'acceso_ip_prohibida':
      return [
        {label: 'IP', value: a.payload.ip, icon: Globe, mono: true},
        {label: 'Motivo', value: a.payload.motivo, icon: Shield, mono: false},
      ];
    case 'sesion_simultanea':
      return [
        {label: 'Usuario', value: a.payload.user, icon: User, mono: true},
      ];
    case 'acceso_horario_irregular':
      return [
        {label: 'Usuario', value: a.payload.user, icon: User, mono: true},
        {
          label: 'Hora de acceso',
          value: new Date(a.payload.access_time * 1000).toLocaleString('es-AR'),
          icon: Calendar,
          mono: false
        },
      ];
    case 'acceso_tras_intentos':
      return [
        {label: 'Usuario', value: a.payload.user, icon: User, mono: true},
        {label: 'IP origen', value: a.payload.ip, icon: Globe, mono: true},
      ];
    case 'login_cuenta_servicio':
      return [
        {label: 'Cuenta de servicio', value: a.payload.user, icon: User, mono: true},
      ];
    case 'intento_escalada':
      return [
        {label: 'Usuario', value: a.payload.user, icon: User, mono: true},
      ];
    case 'usuario_desconocido':
      return [
        {label: 'Usuario', value: a.payload.user, icon: User, mono: true},
        {label: 'IP', value: a.payload.ip, icon: Globe, mono: true},
      ];
    case 'actividad_red_dispersa':
      return [
        {label: 'Usuario', value: a.payload.user, icon: User, mono: true},
        {label: 'Subredes', value: String(a.payload.subnet_count), icon: Globe, mono: false},
      ];
    case 'descarga_masiva':
      return [
        {label: 'Usuario', value: a.payload.user, icon: User, mono: true},
      ];
    case 'origen_sospechoso':
      return [
        {label: 'Usuario', value: a.payload.user, icon: User, mono: true},
        {label: 'IP origen', value: a.payload.ip, icon: Globe, mono: true},
      ];
    case 'horario_atipico':
      return [
        {label: 'Usuario', value: a.payload.user, icon: User, mono: true},
        {
          label: 'Hora de acceso',
          value: new Date(a.payload.access_time * 1000).toLocaleString('es-AR'),
          icon: Calendar,
          mono: false
        },
      ];
  }
}
</script>

<style scoped>
.dialog-panel {
  @apply relative w-full sm:max-w-lg bg-slate-800 border border-slate-700 sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh];
}

.dialog-header {
  @apply flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-700 flex-shrink-0;
}

.dialog-icon {
  @apply w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0;
}

.dialog-body {
  @apply flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3;
}

.dialog-footer {
  @apply flex justify-end px-4 sm:px-6 py-3 border-t border-slate-700 flex-shrink-0;
}

.field-label {
  @apply text-xs text-slate-500 mb-1 flex items-center gap-1.5;
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.25s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

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
