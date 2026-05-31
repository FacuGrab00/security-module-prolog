<template>
  <div class="space-y-6">
    <AppHeader title="Consultas de Auditoría"/>
    <div class="px-3 sm:px-6 pb-6 space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QueryCardQ1/>
        <QueryCardQ2/>
        <QueryCardQ3/>
        <QueryCardQ4/>
      </div>
      <FreeQueryPanel/>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '../components/layout/AppHeader.vue'
import QueryCardQ1 from '../components/queries/QueryCardQ1.vue'
import QueryCardQ2 from '../components/queries/QueryCardQ2.vue'
import QueryCardQ3 from '../components/queries/QueryCardQ3.vue'
import QueryCardQ4 from '../components/queries/QueryCardQ4.vue'
import FreeQueryPanel from '../components/prolog/FreeQueryPanel.vue'
</script>
