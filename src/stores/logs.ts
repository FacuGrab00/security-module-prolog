import { defineStore } from 'pinia'
import { ref } from 'vue'
import { prologLogToUI } from '../utils/prologMapper'
import type { PrologLog } from '../utils/prologMapper'

export const useLogsStore = defineStore('logs', () => {
  const logs = ref<ReturnType<typeof prologLogToUI>[]>([])

  async function fetchLogs() {
    const res  = await fetch('/api/logs')
    const body = await res.json() as { logs: PrologLog[] }
    logs.value = body.logs.map(prologLogToUI)
  }

  return { logs, fetchLogs }
})
