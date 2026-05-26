<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')" />
      <div class="relative w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl animate-slide-up">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
              <Bell class="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 class="text-white font-semibold">Notificar Usuario</h3>
              <p class="text-slate-400 text-xs">Enviar alerta de seguridad al usuario</p>
            </div>
          </div>
          <button @click="$emit('close')" class="text-slate-400 hover:text-white transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 space-y-4">
          <div>
            <label class="block text-xs text-slate-400 mb-1.5 font-medium">Usuario</label>
            <input
              v-model="form.user"
              type="text"
              class="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div>
            <label class="block text-xs text-slate-400 mb-1.5 font-medium">Canal de notificación</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="ch in channels"
                :key="ch.value"
                @click="form.channel = ch.value"
                class="flex flex-col items-center gap-1.5 py-3 text-xs rounded-lg border transition-colors"
                :class="form.channel === ch.value
                  ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                  : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500'"
              >
                <component :is="ch.icon" class="w-4 h-4" />
                {{ ch.label }}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs text-slate-400 mb-1.5 font-medium">Mensaje</label>
            <textarea
              v-model="form.message"
              rows="3"
              class="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
              placeholder="Mensaje de alerta de seguridad..."
            />
          </div>

          <!-- Preview -->
          <div v-if="form.user && form.message" class="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5">
            <p class="text-xs text-slate-500 mb-1">Vista previa:</p>
            <p class="text-xs text-slate-300">
              <span class="text-yellow-400 font-medium">[ALERTA SEGURIDAD]</span>
              Usuario <span class="text-white font-mono">{{ form.user }}</span>: {{ form.message }}
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700">
          <button @click="$emit('close')" class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            @click="confirm"
            :disabled="!form.user || !form.message"
            class="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors font-medium"
          >
            <Bell class="w-4 h-4" />
            Enviar Notificación
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { Bell, X, Mail, MessageSquare, Phone } from '@lucide/vue'

const props = defineProps<{ user?: string }>()
const emit  = defineEmits<{ close: []; confirmed: [] }>()

const form = reactive({
  user:    props.user ?? '',
  channel: 'email',
  message: 'Se detectó actividad sospechosa en su cuenta. Por favor, verifique sus credenciales y contacte al administrador.',
})

const channels = [
  { value: 'email',  label: 'Email',    icon: Mail },
  { value: 'sms',    label: 'SMS',      icon: Phone },
  { value: 'system', label: 'Sistema',  icon: MessageSquare },
]

function confirm() {
  emit('confirmed')
  emit('close')
}
</script>
