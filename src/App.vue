<template>
  <div class="min-h-screen bg-slate-900 flex flex-col">
    <AppSidebar/>
    <main class="flex-1 md:ml-64 pb-10 overflow-auto">
      <RouterView/>
    </main>
    <AppFooter/>

    <Toaster
        position="bottom-center"
        :expand="true"
        :rich-colors="true"
        :close-button="true"
        theme="dark"
    />
  </div>
</template>

<script setup lang="ts">
import {Toaster} from 'vue-sonner'
import 'vue-sonner/style.css'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppFooter from './components/layout/AppFooter.vue'
</script>
