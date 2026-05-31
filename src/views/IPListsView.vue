<template>
  <div class="space-y-6">
    <AppHeader title="Gestión de Listas de IPs"/>
    <div class="px-3 sm:px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <WhitelistPanel/>
      <BlacklistPanel/>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '../components/layout/AppHeader.vue'
import WhitelistPanel from '../components/ip/WhitelistPanel.vue'
import BlacklistPanel from '../components/ip/BlacklistPanel.vue'
</script>
