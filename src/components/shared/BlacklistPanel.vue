<template>
  <div class="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden flex flex-col max-h-[80vh]">

    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
      <div class="flex items-center gap-2">
        <ShieldX class="w-4 h-4 text-red-400"/>
        <h2 class="app-section-title">Lista Negra</h2>
        <span class="text-xs px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full">
          {{ store.blacklist.length }} IPs
        </span>
      </div>
      <button @click="load" :disabled="loading"
              class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Recargar">
        <RefreshCw class="w-3.5 h-3.5" :class="loading ? 'animate-spin' : ''"/>
      </button>
    </div>

    <div class="p-5 flex flex-col flex-1 min-h-0 gap-4 overflow-hidden">
      <p class="text-xs text-slate-400 leading-relaxed shrink-0">
        Las IPs en esta lista son consideradas <span class="text-red-400 font-medium">peligrosas</span>.
        Cualquier actividad desde estas IPs genera alertas críticas de inmediato.
      </p>

      <!-- Formulario -->
      <div class="space-y-2 shrink-0">
        <div class="flex gap-2">
          <div class="flex-1 flex items-center bg-slate-900 border rounded-lg px-3 transition-colors"
               :class="inputBorder">
            <span class="text-slate-500 text-xs mr-2 font-mono">IP:</span>
            <input v-model="ip" type="text" placeholder="ej: 203.0.113.45"
                   class="mono-input"
                   @keydown.enter="add"/>
          </div>
          <AppButton variant="red" size="sm" :loading="adding"
                     :disabled="!ip.trim() || !isValidIP(ip)" @click="add">
            <template #icon>
              <Plus class="w-3 h-3"/>
            </template>
            Bloquear
          </AppButton>
        </div>
        <p v-if="inWhitelist" class="text-xs text-orange-400">
          Esta IP está en la lista blanca — eliminala primero antes de bloquearla.
        </p>
        <input v-model="motivo" type="text" placeholder="Motivo del bloqueo (opcional)"
               class="w-full bg-slate-900 border border-slate-600 focus:border-red-500 text-white text-xs px-3 py-2 rounded-lg focus:outline-none font-mono placeholder-slate-600 transition-colors"
               @keydown.enter="add"/>
      </div>

      <!-- Lista -->
      <div class="space-y-1.5 overflow-y-auto flex-1 min-h-0 pr-1">
        <div v-if="store.blacklist.length === 0" class="text-center py-8 text-slate-500 text-xs">
          <ShieldX class="w-8 h-8 mx-auto mb-2 opacity-20"/>
          <p>No hay IPs en la lista negra</p>
        </div>
        <div v-for="entry in store.blacklist" :key="entry.ip"
             class="ip-list-item group">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0"/>
            <div class="min-w-0">
              <p class="text-sm font-mono text-white">{{ entry.ip }}</p>
              <p class="text-xs text-slate-500 truncate">{{ entry.motivo }}</p>
            </div>
          </div>
          <button @click="remove(entry.ip)" :disabled="removing === entry.ip"
                  class="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-all flex-shrink-0"
                  title="Quitar de lista negra">
            <div v-if="removing === entry.ip"
                 class="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin"/>
            <ShieldOff v-else class="w-3 h-3"/>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, computed, onMounted} from 'vue'
import {ShieldX, ShieldOff, RefreshCw, Plus} from '@lucide/vue'
import AppButton from './AppButton.vue'
import {toast} from 'vue-sonner'
import {useIpListsStore} from '../../stores/ipLists'

const store = useIpListsStore()
onMounted(load)
const ip = ref('')
const motivo = ref('')
const adding = ref(false)
const removing = ref<string | null>(null)
const loading = ref(false)

const inWhitelist = computed(() =>
    isValidIP(ip.value) && store.whitelist.some(e => e.ip === ip.value.trim())
)

const inputBorder = computed(() => {
  if (ip.value && !isValidIP(ip.value)) return 'border-red-500/60'
  if (inWhitelist.value) return 'border-orange-500/60'
  return 'border-slate-600 focus-within:border-red-500'
})

function isValidIP(val: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(val.trim()) &&
      val.trim().split('.').every(o => parseInt(o) <= 255)
}

async function load() {
  loading.value = true;
  try {
    await store.fetchBlacklist();
  } catch {
    toast.error('No se pudo recargar la lista negra', {duration: 5000});
  } finally {
    loading.value = false;
  }
}

async function add() {
  const val = ip.value.trim();
  const mot = motivo.value.trim() || 'Bloqueada manualmente';
  if (!val || !isValidIP(val)) return;
  if (store.whitelist.some(e => e.ip === val)) {
    toast.error(`${val} ya está en la lista blanca`, {
      description: 'Eliminala de la lista blanca antes de bloquearla.',
      duration: 6000,
    });
    return;
  }
  adding.value = true;
  try {
    const body = await store.addToBlacklist(val, mot);
    if (body.ok) {
      toast.success(`${val} bloqueada`, {description: mot, duration: 4000});
      ip.value = '';
      motivo.value = '';
    } else if (body.error) {
      toast.error('Motor Prolog no disponible', {
        description: 'Reiniciá el servidor con: swipl server.pl',
        duration: 7000
      });
    } else {
      toast.warning(String(body.message ?? 'La IP ya está en la lista'), {duration: 5000});
    }
  } catch {
    toast.error('Error al contactar el motor Prolog', {duration: 5000});
  } finally {
    adding.value = false;
  }
}

async function remove(val: string) {
  removing.value = val;
  try {
    const body = await store.removeFromBlacklist(val);
    if (body.ok) {
      toast.success(`${val} removida de la lista negra`, {duration: 4000});
    } else {
      toast.warning(String(body.message ?? 'No se pudo remover'), {duration: 5000});
    }
  } catch {
    toast.error('Error al contactar el motor Prolog', {duration: 5000});
  } finally {
    removing.value = null;
  }
}
</script>
