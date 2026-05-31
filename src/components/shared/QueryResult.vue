<template>
  <div class="mt-3">
    <p class="text-xs text-slate-500 font-medium mb-1.5">Resultado (motor Prolog):</p>
    <div
        class="flex items-start gap-2 text-xs rounded-lg px-3 py-2.5"
        :class="isError ? 'bg-slate-700/50 border border-slate-600' : 'bg-emerald-500/10 border border-emerald-500/20'"
    >
      <CheckCircle v-if="!isError" class="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5"/>
      <XCircle v-else class="w-3 h-3 text-slate-400   flex-shrink-0 mt-0.5"/>
      <pre
          class="font-mono whitespace-pre-wrap break-all"
          :class="isError ? 'text-slate-400' : 'text-emerald-300'"
      >{{ result }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {CheckCircle, XCircle} from '@lucide/vue'

const props = defineProps<{ result: string }>()
const isError = computed(() => props.result === 'false.' || props.result.startsWith('Error'))
</script>
