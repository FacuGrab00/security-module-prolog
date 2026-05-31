<template>
  <div class="space-y-6">
    <AppHeader
      title="Logs de Acceso"
      subtitle="Visualización de eventos procesados desde CSV y transformados a hechos Prolog"
    />

    <div class="px-3 sm:px-6 pb-6 space-y-4">
      <!-- Filtros -->
      <div class="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 flex flex-col gap-3">
        <!-- Fila 1: buscador -->
        <div class="flex items-center gap-2 bg-slate-900 border border-slate-600 rounded-lg px-3 focus-within:border-cyan-500 transition-colors">
          <Filter class="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            v-model="search"
            type="text"
            placeholder="Buscar por usuario, IP o acción..."
            class="flex-1 bg-transparent text-white text-sm py-2 focus:outline-none placeholder-slate-500 min-w-0"
          />
        </div>
        <!-- Fila 2: selects + contador -->
        <div class="flex items-center gap-2 flex-wrap">
          <AppSelect v-model="resultFilter" :options="[
            { value: 'all',     label: 'Todos los resultados' },
            { value: 'success', label: 'Exitosos' },
            { value: 'failure', label: 'Fallidos' },
          ]" />
          <AppSelect v-model="roleFilter" :options="[
            { value: 'all',      label: 'Todos los roles' },
            { value: 'admin',    label: 'Admin' },
            { value: 'operator', label: 'Operador' },
            { value: 'user',     label: 'Usuario' },
            { value: 'guest',    label: 'Invitado' },
          ]" />
          <span class="text-xs text-slate-500 whitespace-nowrap ml-auto">{{ filtered.length }} registros</span>
        </div>
      </div>

      <!-- Contenedor principal -->
      <div class="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">

        <!-- Empty state (compartido) -->
        <div v-if="paginated.length === 0" class="px-4 py-16 text-center">
          <div class="flex flex-col items-center gap-2 text-slate-500">
            <template v-if="logsStore.logs.length === 0">
              <svg class="w-10 h-10 opacity-20 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p class="text-sm font-medium text-slate-400">No hay registros cargados</p>
              <p class="text-xs">Importá un archivo CSV desde la sección de configuración para comenzar el análisis</p>
            </template>
            <template v-else>
              <svg class="w-10 h-10 opacity-20 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <p class="text-sm font-medium text-slate-400">Sin resultados</p>
              <p class="text-xs">Ningún registro coincide con los filtros aplicados</p>
            </template>
          </div>
        </div>

        <!-- Vista cards — mobile -->
        <div v-else class="md:hidden divide-y divide-slate-700/50">
          <div
            v-for="log in paginated"
            :key="log.id"
            class="px-4 py-3 flex flex-col gap-2"
            :class="log.result === 'failure' ? 'bg-red-500/5' : ''"
          >
            <!-- Fila 1: usuario + resultado -->
            <div class="flex items-center justify-between gap-2">
              <span class="text-white font-medium text-sm">{{ log.user }}</span>
              <span
                class="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                :class="log.result === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'"
              >{{ log.result === 'success' ? 'Éxito' : 'Fallo' }}</span>
            </div>
            <!-- Fila 2: IP + rol -->
            <div class="flex items-center gap-3">
              <span
                class="font-mono text-xs"
                :class="isBlocked(log.ip) ? 'text-red-400' : 'text-slate-300'"
              >{{ log.ip }}<span v-if="isBlocked(log.ip)"> 🚫</span></span>
              <RoleBadge :role="log.role" />
            </div>
            <!-- Fila 3: acción + fecha -->
            <div class="flex items-center justify-between gap-2 text-xs text-slate-500">
              <span class="font-mono">{{ log.action }}</span>
              <span>{{ formatTs(log.timestamp) }}</span>
            </div>
          </div>
        </div>

        <!-- Vista tabla — desktop -->
        <div v-if="paginated.length > 0" class="hidden md:block overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-700 bg-slate-800/80">
                <th class="text-left text-xs text-slate-400 font-medium px-4 py-3">Fecha</th>
                <th class="text-left text-xs text-slate-400 font-medium px-4 py-3">Usuario</th>
                <th class="text-left text-xs text-slate-400 font-medium px-4 py-3">IP</th>
                <th class="text-left text-xs text-slate-400 font-medium px-4 py-3">Rol</th>
                <th class="hidden lg:table-cell text-left text-xs text-slate-400 font-medium px-4 py-3">Acción</th>
                <th class="hidden lg:table-cell text-left text-xs text-slate-400 font-medium px-4 py-3">País</th>
                <th class="text-left text-xs text-slate-400 font-medium px-4 py-3">Resultado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700/50">
              <tr
                v-for="log in paginated"
                :key="log.id"
                class="hover:bg-slate-700/30 transition-colors"
                :class="log.result === 'failure' ? 'bg-red-500/5' : ''"
              >
                <td class="px-4 py-2.5 whitespace-nowrap text-xs text-slate-300">{{ formatTs(log.timestamp) }}</td>
                <td class="px-4 py-2.5 text-xs text-white font-medium">{{ log.user }}</td>
                <td class="px-4 py-2.5">
                  <span class="font-mono text-xs" :class="isBlocked(log.ip) ? 'text-red-400' : 'text-slate-300'">{{ log.ip }}</span>
                  <span v-if="isBlocked(log.ip)" class="ml-1 text-xs">🚫</span>
                </td>
                <td class="px-4 py-2.5"><RoleBadge :role="log.role" /></td>
                <td class="hidden lg:table-cell px-4 py-2.5 text-xs text-slate-300 font-mono">{{ log.action }}</td>
                <td class="hidden lg:table-cell px-4 py-2.5 text-xs text-slate-400">
                  <span class="flex items-center gap-1">
                    <span>{{ flags[log.country] ?? '🌐' }}</span>
                    {{ log.country }}
                  </span>
                </td>
                <td class="px-4 py-2.5">
                  <span
                    class="text-xs px-2 py-0.5 rounded-full font-medium"
                    :class="log.result === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'"
                  >{{ log.result === 'success' ? 'Éxito' : 'Fallo' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div class="flex items-center justify-between px-4 py-3 border-t border-slate-700">
          <p class="text-xs text-slate-500">Página {{ page }} de {{ totalPages }}</p>
          <div class="flex gap-2">
            <button
              @click="page--"
              :disabled="page === 1"
              class="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-300 rounded-lg transition-colors"
            >Anterior</button>
            <button
              @click="page++"
              :disabled="page >= totalPages"
              class="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-300 rounded-lg transition-colors"
            >Siguiente</button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Filter } from '@lucide/vue'
import AppSelect from '../components/shared/AppSelect.vue'
import AppHeader from '../components/layout/AppHeader.vue'
import RoleBadge from '../components/shared/RoleBadge.vue'
import { useLogsStore }    from '../stores/logs'
import { useIpListsStore } from '../stores/ipLists'

const logsStore    = useLogsStore()
const ipListsStore = useIpListsStore()
const search       = ref('')
const resultFilter = ref('all')
const roleFilter   = ref('all')
const page         = ref(1)
const perPage      = 10

const flags: Record<string, string> = { AR: '🇦🇷', RU: '🇷🇺', US: '🇺🇸', BR: '🇧🇷', CN: '🇨🇳' }

function formatTs(ts: string): string {
  const n = Number(ts)
  if (!n) return ts
  return new Date(n * 1000).toLocaleString('es-AR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

const blocked = computed(() => new Set(ipListsStore.blockedIPs.map(b => b.ip)))
function isBlocked(ip: string) { return blocked.value.has(ip) }

const filtered = computed(() => {
  let logs = logsStore.logs
  if (search.value)              logs = logs.filter(l => [l.user, l.ip, l.action].some(s => s.toLowerCase().includes(search.value.toLowerCase())))
  if (resultFilter.value !== 'all') logs = logs.filter(l => l.result === resultFilter.value)
  if (roleFilter.value !== 'all')   logs = logs.filter(l => l.role === roleFilter.value)
  return logs
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage)))
const paginated  = computed(() => filtered.value.slice((page.value - 1) * perPage, page.value * perPage))
</script>
