import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { SecurityAlert, AlertStatus } from '../types'
import { prologAlertToUI, alertIP } from '../utils/prologMapper'
import type { PrologAlert } from '../utils/prologMapper'

export const useAlertsStore = defineStore('alerts', () => {
  const alerts = ref<SecurityAlert[]>([])

  const _savedDismissed = sessionStorage.getItem('dismissedAlerts')
  const dismissedIds = ref<Set<string>>(new Set(_savedDismissed ? JSON.parse(_savedDismissed) : []))
  watch(dismissedIds, val => sessionStorage.setItem('dismissedAlerts', JSON.stringify([...val])), { deep: true })

  const activeAlerts   = computed(() => alerts.value.filter(a => a.status === 'active'))
  const criticalAlerts = computed(() => alerts.value.filter(a => a.severity === 'critical'))

  async function fetchAlerts() {
    const res  = await fetch('/api/alerts')
    const body = await res.json() as { alerts: PrologAlert[] }
    alerts.value = body.alerts.map(a => {
      const alert = prologAlertToUI(a)
      if (dismissedIds.value.has(alert.id)) alert.status = 'dismissed'
      return alert
    })
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
    dismissedIds.value = new Set([...dismissedIds.value, id])
    const alert = alerts.value.find(a => a.id === id)
    if (alert) alert.status = 'dismissed'
  }

  function restoreAlert(id: string) {
    dismissedIds.value = new Set([...dismissedIds.value].filter(i => i !== id))
    const alert = alerts.value.find(a => a.id === id)
    if (alert) alert.status = 'active'
  }

  return {
    alerts, activeAlerts, criticalAlerts,
    fetchAlerts, syncResolved, markIPResolved, updateAlertStatus, dismissAlert, restoreAlert,
  }
})
