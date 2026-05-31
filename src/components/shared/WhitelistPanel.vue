<template>
  <div class="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden flex flex-col max-h-[80vh]">

    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
      <div class="flex items-center gap-2">
        <ShieldCheck class="w-4 h-4 text-emerald-400"/>
        <h2 class="text-white font-semibold text-sm">Lista Blanca</h2>
        <span class="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
          {{ store.whitelist.length }} IPs
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
        Las IPs en esta lista son consideradas <span class="text-emerald-400 font-medium">seguras</span>.
        Las reglas de detección las excluyen explícitamente.
      </p>

      <!-- Formulario -->
      <div class="flex flex-col gap-1.5 shrink-0">
        <div class="flex gap-2">
          <div class="flex-1 flex items-center bg-slate-900 border rounded-lg px-3 transition-colors"
               :class="inputBorder">
            <span class="text-slate-500 text-xs mr-2 font-mono">IP:</span>
            <input v-model="ip" type="text" placeholder="ej: 192.168.1.100"
                   class="flex-1 bg-transparent text-white text-xs py-2.5 focus:outline-none font-mono placeholder-slate-600"
                   @keydown.enter="add"/>
          </div>
          <AppButton variant="emerald" size="sm" :loading="adding"
            :disabled="!ip.trim() || !isValidIP(ip)" @click="add">
            <template #icon><Plus class="w-3 h-3" /></template>
            Agregar
          </AppButton>
        </div>
        <p v-if="inBlacklist" class="text-xs text-orange-400">
          Esta IP está en la lista negra, eliminala primero antes de agregarla como confiable.
        </p>
      </div>

      <!-- Lista -->
      <div class="space-y-1.5 overflow-y-auto flex-1 min-h-0 pr-1">
        <div v-if="store.whitelist.length === 0" class="text-center py-8 text-slate-500 text-xs">
          <ShieldCheck class="w-8 h-8 mx-auto mb-2 opacity-20"/>
          <p>No hay IPs en la lista blanca</p>
        </div>
        <div v-for="entry in store.whitelist" :key="entry.ip"
             class="flex items-center justify-between gap-3 px-3 py-2 bg-slate-900/60 border border-slate-700 hover:border-slate-600 rounded-lg group transition-colors">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"/>
            <span class="text-sm font-mono text-white">{{ entry.ip }}</span>
          </div>
          <button @click="remove(entry.ip)" :disabled="removing === entry.ip"
                  class="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                  title="Eliminar de lista blanca">
            <div v-if="removing === entry.ip"
                 class="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin"/>
            <Trash2 v-else class="w-3 h-3"/>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, computed, onMounted} from 'vue'
import {ShieldCheck, RefreshCw, Plus, Trash2} from '@lucide/vue'
import AppButton from './AppButton.vue'
import {toast} from 'vue-sonner'
import {useIpListsStore} from '../../stores/ipLists'

const store = useIpListsStore()
onMounted(load)
const ip = ref('')
const adding = ref(false)
const removing = ref<string | null>(null)
const loading = ref(false)

const inBlacklist = computed(() =>
    isValidIP(ip.value) && store.blacklist.some(e => e.ip === ip.value.trim())
)

const inputBorder = computed(() => {
  if (ip.value && !isValidIP(ip.value)) return 'border-red-500/60'
  if (inBlacklist.value) return 'border-orange-500/60'
  return 'border-slate-600 focus-within:border-emerald-500'
})

function isValidIP(val: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(val.trim()) &&
      val.trim().split('.').every(o => parseInt(o) <= 255)
}

async function load() {
  loading.value = true
  try {
    await store.fetchWhitelist()
  } catch {
    toast.error('No se pudo recargar la lista blanca', {duration: 5000})
  } finally {
    loading.value = false
  }
}

async function add() {
  const val = ip.value.trim()
  if (!val || !isValidIP(val)) return
  if (store.blacklist.some(e => e.ip === val)) {
    toast.error(`${val} ya está en la lista negra`, {
      description: 'Eliminala de la lista negra antes de agregarla como confiable.',
      duration: 6000
    })
    return
  }
  adding.value = true
  try {
    const body = await store.addToWhitelist(val)
    if (body.ok) {
      toast.success(`${val} agregada a la lista blanca`, {duration: 4000});
      ip.value = ''
    } else if (body.error) toast.error('Motor Prolog no disponible', {
      description: 'Reiniciá el servidor con: swipl server.pl',
      duration: 7000
    })
    else toast.warning(String(body.message ?? 'La IP ya está en la lista'), {duration: 5000})
  } catch {
    toast.error('Error al contactar el motor Prolog', {duration: 5000})
  } finally {
    adding.value = false
  }
}

async function remove(val: string) {
  removing.value = val
  try {
    const body = await store.removeFromWhitelist(val)
    if (body.ok) toast.success(`${val} eliminada de la lista blanca`, {duration: 4000})
    else toast.warning(String(body.message ?? 'No se pudo eliminar'), {duration: 5000})
  } catch {
    toast.error('Error al contactar el motor Prolog', {duration: 5000})
  } finally {
    removing.value = null
  }
}
</script>
