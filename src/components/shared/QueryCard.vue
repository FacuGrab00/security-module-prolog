<template>
  <div class="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-all">
    <QueryHeader
      :id="query.id"
      :category="query.category"
      :title="query.title"
      :description="query.description"
    />
    <div class="px-4 sm:px-5 py-4">
      <p class="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Código Prolog</p>
      <PrologCode :code="query.prolog" />
      <slot name="actions" />
      <slot name="result" />
    </div>
  </div>
</template>

<script setup lang="ts">
import QueryHeader from './QueryHeader.vue'
import PrologCode  from './PrologCode.vue'
import type { AuditQuery } from '../../types'

defineProps<{ query: AuditQuery }>()
</script>
