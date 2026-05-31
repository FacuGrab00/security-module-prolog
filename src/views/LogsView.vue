<template>
  <div class="space-y-6">
    <AppHeader
      title="Logs de Acceso"
      subtitle="Visualización de eventos procesados desde CSV y transformados a hechos Prolog"
    />

    <div class="px-3 sm:px-6 pb-6 space-y-4">
      <!-- Filtros -->
      <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3">
        <div class="flex items-center gap-2">
          <Filter class="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            v-model="search"
            type="text"
            placeholder="Buscar por usuario, IP o acción..."
            class="flex-1 sm:min-w-48 bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        <div class="flex items-center gap-2">
          <select v-model="resultFilter" class="flex-1 sm:flex-none bg-slate-700 border border-slate-600 text-slate-300 rounded-lg px-2 py-1.5 text-xs">
            <option value="all">Todos</option>
            <option value="success">Exitosos</option>
            <option value="failure">Fallidos</option>
          </select>
          <select v-model="roleFilter" class="flex-1 sm:flex-none bg-slate-700 border border-slate-600 text-slate-300 rounded-lg px-2 py-1.5 text-xs">
            <option value="all">Todos los roles</option>
            <option value="admin">Admin</option>
            <option value="operator">Operador</option>
            <option value="user">Usuario</option>
            <option value="guest">Invitado</option>
          </select>
          <span class="text-xs text-slate-500 whitespace-nowrap ml-auto sm:ml-0">{{ filtered.length }} registros</span>
        </div>
      </div>

      <!-- Tabla -->
      <div class="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-700 bg-slate-800/80">
                <th class="text-left text-xs text-slate-400 font-medium px-3 sm:px-4 py-3">Fecha</th>
                <th class="text-left text-xs text-slate-400 font-medium px-3 sm:px-4 py-3">Usuario</th>
                <th class="text-left text-xs text-slate-400 font-medium px-3 sm:px-4 py-3">IP</th>
                <th class="hidden sm:table-cell text-left text-xs text-slate-400 font-medium px-4 py-3">Rol</th>
                <th class="hidden md:table-cell text-left text-xs text-slate-400 font-medium px-4 py-3">Acción</th>
                <th class="hidden lg:table-cell text-left text-xs text-slate-400 font-medium px-4 py-3">País</th>
                <th class="text-left text-xs text-slate-400 font-medium px-3 sm:px-4 py-3">Resultado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700/50">
              <tr
                v-for="log in paginated"
                :key="log.id"
                class="hover:bg-slate-700/30 transition-colors"
                :class="log.result === 'failure' ? 'bg-red-500/5' : ''"
              >
                <td class="px-3 sm:px-4 py-2.5 whitespace-nowrap">
                  <span class="text-xs text-slate-300">{{ formatTs(log.timestamp) }}</span>
                </td>
                <td class="px-3 sm:px-4 py-2.5">
                  <span class="text-white font-medium text-xs">{{ log.user }}</span>
                </td>
                <td class="px-3 sm:px-4 py-2.5">
                  <span
                    class="font-mono text-xs break-all"
                    :class="isBlocked(log.ip) ? 'text-red-400' : 'text-slate-300'"
                  >{{ log.ip }}</span>
                  <span v-if="isBlocked(log.ip)" class="ml-1 text-xs text-red-400">🚫</span>
                </td>
                <td class="hidden sm:table-cell px-4 py-2.5">
                  <RoleBadge :role="log.role" />
                </td>
                <td class="hidden md:table-cell px-4 py-2.5 text-xs text-slate-300 font-mono">{{ log.action }}</td>
                <td class="hidden lg:table-cell px-4 py-2.5 text-xs text-slate-400">
                  <span class="flex items-center gap-1">
                    <span>{{ flags[log.country] ?? '🌐' }}</span>
                    {{ log.country }}
                  </span>
                </td>
                <td class="px-3 sm:px-4 py-2.5">
                  <span
                    class="text-xs px-2 py-0.5 rounded-full font-medium"
                    :class="log.result === 'success'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'"
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
