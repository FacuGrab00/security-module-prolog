<template>
  <QueryCard :query="query">
    <template #actions>
      <div class="mt-3 flex justify-end">
        <AppButton variant="cyan" size="sm" :loading="loading" @click="run">
          <template #icon>
            <Play class="w-3 h-3"/>
          </template>
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
import QueryCard from '../prolog/QueryCard.vue'
import QueryResult from '../prolog/QueryResult.vue'
import {auditQueries} from '../../data/auditQueries'
import {useAppStore} from '../../stores/app'

const query = auditQueries.find(q => q.id === 'Q2')!
const store = useAppStore()
const loading = ref(false)
const result = ref<string | null>(null)

async function run() {
  loading.value = true
  try {
    result.value = await store.runQuery('ips_comprometidas') || 'false.'
  } catch {
    result.value = 'Error: motor Prolog no disponible'
  } finally {
    loading.value = false
  }
}
</script>
