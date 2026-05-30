<template>
  <aside class="fixed left-0 top-0 h-full w-64 bg-dark-900 border-r border-slate-800 flex flex-col z-30">
    <!-- Logo -->
    <div class="px-6 py-5 border-b border-slate-800">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
          <Shield class="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <p class="text-white font-semibold text-sm leading-tight">SecureAudit</p>
          <p class="text-slate-500 text-xs">Módulo Prolog</p>
        </div>
      </div>
    </div>

    <!-- Nav -->
    <nav class="flex-1 px-3 py-4 space-y-1">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group"
        :class="isActive(item.to)
          ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
          : 'text-slate-400 hover:text-white hover:bg-slate-800'"
      >
        <component :is="item.icon" class="w-4 h-4 flex-shrink-0" />
        <span>{{ item.label }}</span>
        <span
          v-if="item.badge"
          class="ml-auto text-xs px-1.5 py-0.5 rounded-full"
          :class="item.badgeColor ?? 'bg-slate-700 text-slate-300'"
        >{{ item.badge }}</span>
      </RouterLink>
    </nav>

  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Shield, LayoutDashboard, ScrollText, Search, BookOpen, FileText, ShieldHalf } from '@lucide/vue'
import { useAlertsStore } from '../../stores/alerts'

const route  = useRoute()
const store  = useAlertsStore()
const active = computed(() => store.activeAlerts.length)

const navItems = computed(() => [
  { to: '/',        label: 'Dashboard',     icon: LayoutDashboard, badge: active.value > 0 ? active.value : null, badgeColor: 'bg-red-500/20 text-red-400' },
  { to: '/logs',    label: 'Logs de Acceso', icon: ScrollText },
  { to: '/queries', label: 'Consultas Prolog',icon: Search },
  { to: '/rules',   label: 'Base de Reglas', icon: BookOpen },
  { to: '/listas',  label: 'Listas de IPs',  icon: ShieldHalf },
  { to: '/report',  label: 'Reporte',        icon: FileText },
])

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>
