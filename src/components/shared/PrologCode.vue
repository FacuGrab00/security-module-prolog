<template>
  <div class="rounded-lg overflow-hidden border border-slate-700 text-xs font-mono">
    <!-- Barra superior estilo IDE -->
    <div class="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700">
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-red-500/60"/>
        <span class="w-3 h-3 rounded-full bg-yellow-500/60"/>
        <span class="w-3 h-3 rounded-full bg-emerald-500/60"/>
      </div>
      <span class="text-slate-500 text-xs">prolog</span>
    </div>

    <!-- Código con highlight -->
    <div class="flex bg-slate-950 overflow-x-auto">
      <!-- Números de línea -->
      <div
          class="select-none px-3 py-3 text-right text-slate-600 border-r border-slate-800 leading-relaxed min-w-[2.5rem]">
        <div v-for="n in lineCount" :key="n">{{ n }}</div>
      </div>
      <!-- Contenido -->
      <pre
          class="flex-1 px-4 py-3 leading-relaxed whitespace-pre-wrap break-all"
          v-html="highlighted"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import hljs from 'highlight.js/lib/core'
import prologLang from 'highlight.js/lib/languages/prolog'
import 'highlight.js/styles/github-dark-dimmed.css'

hljs.registerLanguage('prolog', prologLang)

const props = defineProps<{ code: string }>()

const highlighted = computed(() =>
    hljs.highlight(props.code, {language: 'prolog'}).value
)

const lineCount = computed(() => props.code.split('\n').length)
</script>
