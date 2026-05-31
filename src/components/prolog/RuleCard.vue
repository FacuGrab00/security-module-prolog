<template>
  <div class="bg-slate-800/50 border rounded-xl overflow-hidden transition-all" :class="borderClass">
    <div
        class="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-slate-700 bg-slate-800/80">
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-xs font-mono text-slate-500 flex-shrink-0">{{ rule.id }}</span>
        <span class="text-sm font-mono font-semibold text-white truncate">{{ rule.name }}</span>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <span class="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">{{ rule.category }}</span>
        <span v-if="rule.triggered > 0" class="text-xs px-2 py-0.5 bg-slate-700/60 text-slate-400 rounded-full">
          {{ rule.triggered }}
        </span>
      </div>
    </div>
    <div class="px-4 sm:px-5 py-4">
      <p class="text-xs text-slate-400 mb-3 leading-relaxed">{{ rule.description }}</p>
      <PrologCode :code="rule.code"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import PrologCode from './PrologCode.vue';
import type {PrologRule} from '../../types';

const props = defineProps<{ rule: PrologRule }>();

const borderClass = computed(() => props.rule.triggered > 0 ? 'border-yellow-500/30' : 'border-slate-700');
</script>
