import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { safeJson, postJson } from '../utils/api'
import { useAlertsStore } from './alerts'

export interface BlacklistEntry { ip: string; motivo: string }
export interface WhitelistEntry { ip: string }

export const useIpListsStore = defineStore('ipLists', () => {
  const blacklist  = ref<BlacklistEntry[]>([])
  const whitelist  = ref<WhitelistEntry[]>([])
  const blockedIPs = ref<{ ip: string; reason: string; blockedAt: string; blockedBy: string }[]>([])

  const allBlockedIPSet = computed(() => new Set([
    ...blockedIPs.value.map(b => b.ip),
    ...blacklist.value.map(b => b.ip),
  ]))

  async function fetchBlacklist() {
    const body = await safeJson(await fetch('/api/blacklist'))
    if (body.ok !== false) blacklist.value = (body.blacklist as BlacklistEntry[]) ?? []
  }

  async function fetchWhitelist() {
    const body = await safeJson(await fetch('/api/whitelist'))
    if (body.ok !== false) whitelist.value = ((body.whitelist as string[]) ?? []).map(ip => ({ ip }))
  }

  function blockIP(ip: string, reason: string, blockedBy: string) {
    if (!blockedIPs.value.find(b => b.ip === ip)) {
      blockedIPs.value.unshift({ ip, reason, blockedAt: new Date().toLocaleString('es-AR'), blockedBy })
    }
    useAlertsStore().markIPResolved(ip)
  }

  async function addToBlacklist(ip: string, motivo: string) {
    const body = await postJson('/api/bloquear_ip', { ip, motivo })
    if (body.ok) {
      await fetchBlacklist()
      useAlertsStore().markIPResolved(ip)
    }
    return body
  }

  async function removeFromBlacklist(ip: string) {
    const body = await postJson('/api/blacklist_remove', { ip })
    if (body.ok) await fetchBlacklist()
    return body
  }

  async function addToWhitelist(ip: string) {
    const body = await postJson('/api/whitelist_add', { ip })
    if (body.ok) await fetchWhitelist()
    return body
  }

  async function removeFromWhitelist(ip: string) {
    const body = await postJson('/api/whitelist_remove', { ip })
    if (body.ok) await fetchWhitelist()
    return body
  }

  return {
    blacklist, whitelist, blockedIPs, allBlockedIPSet,
    fetchBlacklist, fetchWhitelist, blockIP,
    addToBlacklist, removeFromBlacklist,
    addToWhitelist, removeFromWhitelist,
  }
})
