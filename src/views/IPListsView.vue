<template>
  <div class="space-y-6">
    <AppHeader
      title="Gestión de Listas de IPs"
      subtitle="Administrá las IPs de confianza (lista blanca) y las IPs bloqueadas (lista negra) del motor Prolog"
    />

    <div class="px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!--  LISTA BLANCA                                                      -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <div class="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-emerald-400"></div>
            <ShieldCheck class="w-4 h-4 text-emerald-400" />
            <h2 class="text-white font-semibold text-sm">Lista Blanca</h2>
            <span class="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
              {{ store.whitelist.length }} IPs
            </span>
          </div>
          <button
            @click="loadLists"
            :disabled="loadingLists"
            class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="Recargar"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="loadingLists ? 'animate-spin' : ''" />
          </button>
        </div>

        <div class="p-5 space-y-4">
          <!-- Descripción -->
          <p class="text-xs text-slate-400 leading-relaxed">
            Las IPs en esta lista son consideradas <span class="text-emerald-400 font-medium">seguras</span>.
            Las reglas de detección las excluyen explícitamente — no generarán alertas aunque tengan actividad sospechosa.
          </p>

          <!-- Formulario agregar -->
          <div class="flex gap-2">
            <div
              class="flex-1 flex items-center bg-slate-900 border rounded-lg px-3 transition-colors"
              :class="wlInput && !isValidIP(wlInput) ? 'border-red-500/60' : 'border-slate-600 focus-within:border-emerald-500'"
            >
              <span class="text-slate-500 text-xs mr-2 font-mono">IP:</span>
              <input
                v-model="wlInput"
                type="text"
                placeholder="ej: 192.168.1.100"
                class="flex-1 bg-transparent text-white text-xs py-2.5 focus:outline-none font-mono placeholder-slate-600"
                @keydown.enter="addWhitelist"
              />
            </div>
            <button
              @click="addWhitelist"
              :disabled="wlLoading || !wlInput.trim() || !isValidIP(wlInput)"
              class="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-xs rounded-lg transition-colors disabled:opacity-40"
            >
              <div v-if="wlLoading" class="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <Plus v-else class="w-3 h-3" />
              Agregar
            </button>
          </div>

          <!-- Lista actual -->
          <div class="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            <div v-if="store.whitelist.length === 0" class="text-center py-8 text-slate-500 text-xs">
              <ShieldCheck class="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>No hay IPs en la lista blanca</p>
            </div>
            <div
              v-for="entry in store.whitelist"
              :key="entry.ip"
              class="flex items-center justify-between gap-3 px-3 py-2 bg-slate-900/60 border border-slate-700 hover:border-slate-600 rounded-lg group transition-colors"
            >
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"></div>
                <span class="text-sm font-mono text-white">{{ entry.ip }}</span>
              </div>
              <button
                @click="removeWhitelist(entry.ip)"
                :disabled="removingWL === entry.ip"
                class="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                title="Eliminar de lista blanca"
              >
                <div v-if="removingWL === entry.ip" class="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                <Trash2 v-else class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!--  LISTA NEGRA                                                       -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <div class="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-red-400"></div>
            <ShieldX class="w-4 h-4 text-red-400" />
            <h2 class="text-white font-semibold text-sm">Lista Negra</h2>
            <span class="text-xs px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full">
              {{ store.blacklist.length }} IPs
            </span>
          </div>
          <button
            @click="loadLists"
            :disabled="loadingLists"
            class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="Recargar"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="loadingLists ? 'animate-spin' : ''" />
          </button>
        </div>

        <div class="p-5 space-y-4">
          <!-- Descripción -->
          <p class="text-xs text-slate-400 leading-relaxed">
            Las IPs en esta lista son consideradas <span class="text-red-400 font-medium">peligrosas</span>.
            Cualquier actividad desde estas IPs genera alertas críticas de inmediato.
          </p>

          <!-- Formulario agregar -->
          <div class="space-y-2">
            <div class="flex gap-2">
              <div
                class="flex-1 flex items-center bg-slate-900 border rounded-lg px-3 transition-colors"
                :class="blInput && !isValidIP(blInput) ? 'border-red-500/60' : 'border-slate-600 focus-within:border-red-500'"
              >
                <span class="text-slate-500 text-xs mr-2 font-mono">IP:</span>
                <input
                  v-model="blInput"
                  type="text"
                  placeholder="ej: 203.0.113.45"
                  class="flex-1 bg-transparent text-white text-xs py-2.5 focus:outline-none font-mono placeholder-slate-600"
                  @keydown.enter="addBlacklist"
                />
              </div>
              <button
                @click="addBlacklist"
                :disabled="blLoading || !blInput.trim() || !isValidIP(blInput)"
                class="flex items-center gap-1.5 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-xs rounded-lg transition-colors disabled:opacity-40"
              >
                <div v-if="blLoading" class="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                <Plus v-else class="w-3 h-3" />
                Bloquear
              </button>
            </div>
            <input
              v-model="blMotivo"
              type="text"
              placeholder="Motivo del bloqueo (opcional)"
              class="w-full bg-slate-900 border border-slate-600 focus:border-red-500 text-white text-xs px-3 py-2 rounded-lg focus:outline-none font-mono placeholder-slate-600 transition-colors"
              @keydown.enter="addBlacklist"
            />
          </div>

          <!-- Lista actual -->
          <div class="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            <div v-if="store.blacklist.length === 0" class="text-center py-8 text-slate-500 text-xs">
              <ShieldX class="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>No hay IPs en la lista negra</p>
            </div>
            <div
              v-for="entry in store.blacklist"
              :key="entry.ip"
              class="flex items-center justify-between gap-3 px-3 py-2 bg-slate-900/60 border border-slate-700 hover:border-slate-600 rounded-lg group transition-colors"
            >
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0"></div>
                <div class="min-w-0">
                  <p class="text-sm font-mono text-white">{{ entry.ip }}</p>
                  <p class="text-xs text-slate-500 truncate">{{ entry.motivo }}</p>
                </div>
              </div>
              <button
                @click="removeBlacklist(entry.ip)"
                :disabled="removingBL === entry.ip"
                class="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-all flex-shrink-0"
                title="Quitar de lista negra"
              >
                <div v-if="removingBL === entry.ip" class="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                <ShieldOff v-else class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Nota al pie -->
    <div class="px-6 pb-6">
      <div class="flex items-start gap-2 px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <AlertTriangle class="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p class="text-xs text-amber-200/70 leading-relaxed">
          Los cambios son <span class="font-medium text-amber-300">inmediatos en el motor Prolog</span> pero se pierden si el servidor se reinicia,
          ya que las listas iniciales se definen como hechos estáticos en <code class="font-mono text-amber-300">security_engine.pl</code>.
          Para que los cambios sean permanentes, editá el archivo .pl directamente.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ShieldCheck, ShieldX, ShieldOff, RefreshCw, Plus, Trash2, AlertTriangle } from '@lucide/vue'
import { toast } from 'vue-sonner'
import AppHeader from '../components/layout/AppHeader.vue'
import { useIpListsStore } from '../stores/ipLists'

const store = useIpListsStore()

const loadingLists = ref(false)
const wlInput      = ref('')
const blInput      = ref('')
const blMotivo     = ref('')
const wlLoading    = ref(false)
const blLoading    = ref(false)
const removingWL   = ref<string | null>(null)
const removingBL   = ref<string | null>(null)

// ─── Validación de IP ─────────────────────────────────────────────────────────

function isValidIP(ip: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip.trim()) &&
    ip.trim().split('.').every(o => parseInt(o) <= 255)
}

// ─── Carga inicial ────────────────────────────────────────────────────────────

async function loadLists() {
  loadingLists.value = true
  try {
    await Promise.all([store.fetchBlacklist(), store.fetchWhitelist()])
  } catch {
    toast.error('Motor Prolog no disponible', {
      description: 'No se pudieron cargar las listas. Verificá que el servidor esté corriendo.',
      duration: 6000,
    })
  } finally {
    loadingLists.value = false
  }
}

onMounted(loadLists)

// ─── Lista Blanca ─────────────────────────────────────────────────────────────

async function addWhitelist() {
  const ip = wlInput.value.trim()
  if (!ip || !isValidIP(ip)) return
  wlLoading.value = true
  try {
    const body = await store.addToWhitelist(ip)
    if (body.ok) {
      toast.success(`${ip} agregada a la lista blanca`, { duration: 4000 })
      wlInput.value = ''
    } else if (body.error) {
      toast.error('Motor Prolog no disponible', {
        description: 'Reiniciá el servidor con: swipl security_engine.pl',
        duration: 7000,
      })
    } else {
      toast.warning(String(body.message ?? 'La IP ya está en la lista'), { duration: 5000 })
    }
  } catch {
    toast.error('Error al contactar el motor Prolog', { duration: 5000 })
  } finally {
    wlLoading.value = false
  }
}

async function removeWhitelist(ip: string) {
  removingWL.value = ip
  try {
    const body = await store.removeFromWhitelist(ip)
    if (body.ok) {
      toast.success(`${ip} eliminada de la lista blanca`, { duration: 4000 })
    } else {
      toast.warning(body.message ?? 'No se pudo eliminar', { duration: 5000 })
    }
  } catch {
    toast.error('Error al contactar el motor Prolog', { duration: 5000 })
  } finally {
    removingWL.value = null
  }
}

// ─── Lista Negra ──────────────────────────────────────────────────────────────

async function addBlacklist() {
  const ip     = blInput.value.trim()
  const motivo = blMotivo.value.trim() || 'Bloqueada manualmente'
  if (!ip || !isValidIP(ip)) return
  blLoading.value = true
  try {
    const body = await store.addToBlacklist(ip, motivo)
    if (body.ok) {
      toast.success(`${ip} bloqueada`, {
        description: motivo,
        duration: 4000,
      })
      blInput.value  = ''
      blMotivo.value = ''
    } else if (body.error) {
      toast.error('Motor Prolog no disponible', {
        description: 'Reiniciá el servidor con: swipl security_engine.pl',
        duration: 7000,
      })
    } else {
      toast.warning(String(body.message ?? 'La IP ya está en la lista'), { duration: 5000 })
    }
  } catch {
    toast.error('Error al contactar el motor Prolog', { duration: 5000 })
  } finally {
    blLoading.value = false
  }
}

async function removeBlacklist(ip: string) {
  removingBL.value = ip
  try {
    const body = await store.removeFromBlacklist(ip)
    if (body.ok) {
      toast.success(`${ip} removida de la lista negra`, { duration: 4000 })
    } else {
      toast.warning(body.message ?? 'No se pudo remover', { duration: 5000 })
    }
  } catch {
    toast.error('Error al contactar el motor Prolog', { duration: 5000 })
  } finally {
    removingBL.value = null
  }
}
</script>
