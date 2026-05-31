<template>
  <QueryCard :query="query">
    <template #actions>
      <div class="mt-3 flex gap-2">
        <div
            class="flex-1 flex items-center bg-slate-900 border border-slate-600 rounded-lg px-3 focus-within:border-cyan-500 transition-colors">
          <span class="text-slate-500 text-xs mr-2 font-mono">Usuario:</span>
          <input v-model="user" type="text" placeholder="ej: admin_ti"
                 class="flex-1 bg-transparent text-white text-xs py-2 focus:outline-none font-mono placeholder-slate-600"
                 @keydown.enter="run"/>
        </div>
        <AppButton variant="cyan" size="sm" :loading="loading" :disabled="!user.trim()" @click="run">
          <template #icon><Play class="w-3 h-3" /></template>
          {{ loading ? 'Consultando...' : 'Ejecutar' }}
        </AppButton>
      </div>
    </template>
    <template #result>
      <QueryResult v-if="result != null" :result="result"/>
    </template>
  </QueryCard>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import {Play} from '@lucide/vue'
import AppButton from '../shared/AppButton.vue'
import QueryCard from '../shared/QueryCard.vue'
import QueryResult from '../shared/QueryResult.vue'
import {auditQueries} from '../../mock/data'
import {useAppStore} from '../../stores/app'

const query = auditQueries.find(q => q.id === 'Q4')!
const store = useAppStore()
const user = ref('')
const loading = ref(false)
const result = ref<string | null>(null)

async function run() {
  if (!user.value.trim()) return
  loading.value = true
  try {
    result.value = await store.runQuery('historial_usuario', {user: user.value.trim()}) || 'false.'
  } catch {
    result.value = 'Error: motor Prolog no disponible'
  } finally {
    loading.value = false
  }
}
</script>
