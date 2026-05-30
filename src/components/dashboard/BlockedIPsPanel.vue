<template>
  <div class="bg-slate-800/50 border border-slate-700 rounded-xl">
    <div class="flex items-center gap-2 px-5 py-4 border-b border-slate-700">
      <ShieldOff class="w-4 h-4 text-orange-400" />
      <h2 class="text-white font-semibold text-sm">IPs Bloqueadas</h2>
      <span class="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
        {{ store.blockedIPs.length }}
      </span>
    </div>

    <div class="divide-y divide-slate-700/50">
      <div v-for="b in store.blockedIPs" :key="b.ip" class="px-5 py-3 flex items-center justify-between gap-3">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-mono text-orange-300">{{ b.ip }}</p>
          <p class="text-xs text-slate-400 truncate">{{ b.reason }}</p>
          <p class="text-xs text-slate-500">Por: {{ b.blockedBy }} · {{ b.blockedAt }}</p>
        </div>
        <div class="text-right flex-shrink-0">
          <p class="text-xs text-slate-500">Expira:</p>
          <p class="text-xs" :class="b.expiresAt === 'Permanente' ? 'text-red-400' : 'text-slate-300'">
            {{ b.expiresAt ?? '—' }}
          </p>
        </div>
      </div>

      <div v-if="store.blockedIPs.length === 0" class="flex items-center justify-center py-8 text-slate-500 text-sm">
        Sin IPs bloqueadas
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShieldOff } from '@lucide/vue'
import { useIpListsStore } from '../../stores/ipLists'
const store = useIpListsStore()
</script>
