<template>
  <span class="text-xs px-2 py-0.5 rounded-full font-medium border" :class="styles[role]">
    {{ labels[role] }}
  </span>
</template>

<script setup lang="ts">
import type { UserRole } from '../../types'
defineProps<{ role: UserRole }>()

const labels: Record<UserRole, string> = { admin: 'Admin', operator: 'Operador', user: 'Usuario', guest: 'Invitado' }
const styles: Record<UserRole, string> = {
  admin:    'bg-purple-500/20 text-purple-400 border-purple-500/30',
  operator: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  user:     'bg-slate-600/50 text-slate-300 border-slate-500/30',
  guest:    'bg-slate-700/50 text-slate-400 border-slate-600/30',
}
</script>
