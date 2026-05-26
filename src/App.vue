<template>
  <div class="min-h-screen bg-slate-900 flex">
    <AppSidebar />
    <main class="flex-1 ml-64 min-h-screen overflow-auto">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import AppSidebar from './components/layout/AppSidebar.vue'
</script>
