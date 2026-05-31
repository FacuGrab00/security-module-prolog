<template>
  <div class="space-y-6">
    <AppHeader
      title="Panel de Control"
      subtitle="Monitoreo en tiempo real del módulo lógico de ciberseguridad"
    />

    <div class="px-3 sm:px-6 pb-6 space-y-4 sm:space-y-6">
      <!-- Stats -->
      <StatsCards />

      <!-- Grid principal -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <!-- Alertas (2/3) -->
        <div class="xl:col-span-2">
          <AlertsPanel @block-ip="openBlockModal" />
        </div>

        <!-- Columna lateral (1/3) -->
        <div class="space-y-6">
          <CSVUploader />
          <BlockedIPsPanel />
        </div>
      </div>
    </div>

    <!-- Modales -->
    <BlockIPModal
      v-if="blockModal.open"
      :ip="blockModal.ip"
      :alert="blockModal.alert"
      @close="blockModal.open = false"
      @confirmed="onBlocked"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import AppHeader       from '../components/layout/AppHeader.vue'
import StatsCards      from '../components/dashboard/StatsCards.vue'
import AlertsPanel     from '../components/dashboard/AlertsPanel.vue'
import BlockedIPsPanel from '../components/dashboard/BlockedIPsPanel.vue'
import CSVUploader     from '../components/dashboard/CSVUploader.vue'
import BlockIPModal    from '../components/actions/BlockIPModal.vue'
import { useAppStore } from '../stores/app'
import type { SecurityAlert } from '../types'

const store      = useAppStore()
const blockModal = reactive<{ open: boolean; ip: string; alert: SecurityAlert | null }>({
  open: false, ip: '', alert: null,
})

onMounted(() => store.fetchAll())

function openBlockModal(ip: string, alert: SecurityAlert) {
  blockModal.ip = ip; blockModal.alert = alert; blockModal.open = true
}
function onBlocked(_ip: string) { blockModal.open = false }
</script>
