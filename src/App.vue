<template>
  <div class="min-h-screen bg-slate-900 flex flex-col">
    <AppSidebar />
    <main class="flex-1 md:ml-64 pb-10 overflow-auto">
      <RouterView />
    </main>
    <footer class="fixed bottom-0 left-0 md:left-64 right-0 border-t border-slate-800 bg-slate-900/90 backdrop-blur-sm px-6 py-2 flex justify-end z-10">
      <span class="text-xs text-slate-500">
        Última actualización: <span class="text-slate-400 font-medium tabular-nums">{{ store.stats.lastUpdate }}</span>
      </span>
    </footer>

    <!-- Toast notifications (vue-sonner) -->
    <Toaster
      position="bottom-right"
      :expand="true"
      :rich-colors="true"
      :close-button="true"
      theme="dark"
    />
  </div>
</template>

<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'
import AppSidebar from './components/layout/AppSidebar.vue'
import { useAppStore } from './stores/app'

const store = useAppStore()
</script>
