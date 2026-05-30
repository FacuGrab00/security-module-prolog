import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SecurityAlert, AlertStatus } from '../types'
import { prologAlertToUI, alertIP } from '../utils/prologMapper'
import type { PrologAlert } from '../utils/prologMapper'

export const useAlertsStore = defineStore('alerts', () => {
  const alerts = ref<SecurityAlert[]>([])

  const activeAlerts   = computed(() => alerts.value.filter(a => a.status === 'active'))
  const criticalAlerts = computed(() => alerts.value.filter(a => a.severity === 'critical'))

  async function fetchAlerts() {
    const res  = await fetch('/api/alerts')
    const body = await res.json() as { alerts: PrologAlert[] }
    alerts.value = body.alerts.map(prologAlertToUI)
  }

  function syncResolved(blockedSet: Set<string>) {
    alerts.value.forEach(a => {
      const ip = alertIP(a)
      if (ip && blockedSet.has(ip)) a.status = 'resolved'
    })
  }

  function markIPResolved(ip: string) {
    alerts.value
      .filter(a => alertIP(a) === ip)
      .forEach(a => (a.status = 'resolved'))
  }

  function updateAlertStatus(id: string, status: AlertStatus) {
    const alert = alerts.value.find(a => a.id === id)
    if (alert) alert.status = status
  }

  function dismissAlert(id: string) {
    const idx = alerts.value.findIndex(a => a.id === id)
    if (idx !== -1) alerts.value.splice(idx, 1)
  }

  return {
    alerts, activeAlerts, criticalAlerts,
    fetchAlerts, syncResolved, markIPResolved, updateAlertStatus, dismissAlert,
  }
})
