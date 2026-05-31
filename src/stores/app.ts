import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { postJson } from '../utils/api'
import { useAlertsStore } from './alerts'
import { useIpListsStore } from './ipLists'
import { useLogsStore } from './logs'
import type { PrologStats } from '../utils/prologMapper'

interface LoadedFile {
  name:           string
  loadedAt:       string
  recordsAdded:   number
  recordsSkipped: number
}

export const useAppStore = defineStore('app', () => {
  const isLoading    = ref(false)
  const prologOnline = ref(false)
  const prologStats  = ref<PrologStats | null>(null)

  const _savedFiles = sessionStorage.getItem('loadedFiles')
  const loadedFiles = ref<LoadedFile[]>(_savedFiles ? JSON.parse(_savedFiles) : [])
  watch(loadedFiles, val => sessionStorage.setItem('loadedFiles', JSON.stringify(val)), { deep: true })

  const stats = computed(() => {
    const alertsStore = useAlertsStore()
    const ipStore     = useIpListsStore()
    const logsStore   = useLogsStore()
    return {
      totalLogs:      prologStats.value?.total_events ?? logsStore.logs.length,
      criticalAlerts: alertsStore.alerts.filter(a => a.severity === 'critical' && a.status === 'active').length,
      blockedIPs:     ipStore.blockedIPs.length,
      activeThreats:  alertsStore.alerts.filter(a => a.status === 'active').length,
      successRate:    prologStats.value
        ? Math.round((prologStats.value.successful_logins / Math.max(prologStats.value.total_events, 1)) * 100)
        : 0,
      lastUpdate: new Date().toLocaleTimeString('es-AR'),
    }
  })

  async function fetchStats() {
    const res = await fetch('/api/stats')
    prologStats.value = await res.json()
  }

  async function fetchAll() {
    isLoading.value = true
    const alertsStore = useAlertsStore()
    const ipStore     = useIpListsStore()
    const logsStore   = useLogsStore()
    try {
      await Promise.all([fetchStats(), alertsStore.fetchAlerts(), ipStore.fetchBlacklist(), logsStore.fetchLogs()])
      alertsStore.syncResolved(ipStore.allBlockedIPSet)
      prologOnline.value = true
    } catch {
      prologOnline.value = false
    } finally {
      isLoading.value = false
    }
  }

  async function importCSV(content: string, filename: string) {
    isLoading.value = true
    try {
      const body = await postJson('/api/load_csv_data', { data: content })
      if (body.ok) {
        await fetchAll()
        loadedFiles.value.push({
          name:           filename,
          loadedAt:       new Date().toLocaleTimeString('es-AR'),
          recordsAdded:   (body.records_added   as number) ?? (body.records_loaded as number) ?? 0,
          recordsSkipped: (body.records_skipped as number) ?? 0,
        })
      }
      return body
    } finally {
      isLoading.value = false
    }
  }

  async function clearData() {
    isLoading.value = true
    try {
      await fetch('/api/clear_data', { method: 'POST' })
      await fetchAll()
      loadedFiles.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function generateReport(): Promise<string> {
    const body = await postJson('/api/report', { output: 'reports/reporte_auditoria.txt' })
    return (body.content as string) ?? ''
  }

  async function runQuery(type: string, params: Record<string, string> = {}): Promise<string> {
    const qs   = new URLSearchParams({ type, ...params }).toString()
    const res  = await fetch(`/api/query?${qs}`)
    const body = await res.json()
    return String(body.result ?? body.error ?? '')
  }

  return {
    isLoading, prologOnline, prologStats, loadedFiles, stats,
    fetchAll, fetchStats, importCSV, clearData, generateReport, runQuery,
  }
})
