<template>
  <div class="space-y-6">
    <AppHeader title="Logs de Acceso"/>

    <div class="px-3 sm:px-6 pb-6 space-y-4">
      <LogsFilter
          v-model:search="search"
          v-model:result-filter="resultFilter"
          v-model:role-filter="roleFilter"
          :count="filtered.length"
      />

      <div class="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">

        <!-- Empty state -->
        <template v-if="paginated.length === 0">
          <EmptyState
              v-if="logsStore.logs.length === 0"
              title="No hay registros cargados"
              description="Importá un archivo CSV desde la sección de configuración para comenzar el análisis"
          />
          <EmptyState
              v-else
              title="Sin resultados"
              description="Ningún registro coincide con los filtros aplicados"
          >
            <template #icon>
              <Search class="w-10 h-10 opacity-20 mb-1"/>
            </template>
          </EmptyState>
        </template>

        <template v-else>
          <!-- Mobile: cards -->
          <div class="md:hidden divide-y divide-slate-700/50">
            <LogCard
                v-for="log in paginated"
                :key="log.id"
                :log="log"
                :blocked="isBlocked(log.ip)"
            />
          </div>
          <!-- Desktop: tabla -->
          <LogsTable class="hidden md:block" :logs="paginated" :is-blocked="isBlocked"/>
        </template>

        <LogsPagination v-model:page="page" :total-pages="totalPages"/>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, computed} from 'vue'
import {Search} from '@lucide/vue'
import AppHeader from '../components/layout/AppHeader.vue'
import LogsFilter from '../components/log/LogsFilter.vue'
import LogCard from '../components/log/LogCard.vue'
import LogsTable from '../components/log/LogsTable.vue'
import LogsPagination from '../components/log/LogsPagination.vue'
import EmptyState from '../components/shared/EmptyState.vue'
import {useLogsStore} from '../stores/logs'
import {useIpListsStore} from '../stores/ipLists'

const logsStore = useLogsStore()
const ipListsStore = useIpListsStore()

const search = ref('')
const resultFilter = ref('all')
const roleFilter = ref('all')
const page = ref(1)
const perPage = 10

const blocked = computed(() => new Set(ipListsStore.blockedIPs.map(b => b.ip)))
const isBlocked = (ip: string) => blocked.value.has(ip)

const filtered = computed(() => {
  let logs = logsStore.logs
  if (search.value) logs = logs.filter(l => [l.user, l.ip, l.action].some(s => s.toLowerCase().includes(search.value.toLowerCase())))
  if (resultFilter.value !== 'all') logs = logs.filter(l => l.result === resultFilter.value)
  if (roleFilter.value !== 'all') logs = logs.filter(l => l.role === roleFilter.value)
  return logs
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage)))
const paginated = computed(() => filtered.value.slice((page.value - 1) * perPage, page.value * perPage))
</script>
