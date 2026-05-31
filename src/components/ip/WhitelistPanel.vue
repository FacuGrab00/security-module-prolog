<template>
  <div class="app-card flex flex-col max-h-[80vh]">

    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
      <div class="flex items-center gap-2">
        <ShieldCheck class="w-4 h-4 text-emerald-400"/>
        <h2 class="app-section-title">Lista Blanca</h2>
        <span class="status-badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {{ store.whitelist.length }} IPs
        </span>
      </div>
      <button @click="load" :disabled="loading"
              class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Recargar">
        <RefreshCw class="w-3.5 h-3.5" :class="reloadIconClass"/>
      </button>
    </div>

    <div class="p-5 flex flex-col flex-1 min-h-0 gap-4 overflow-hidden">
      <p class="text-xs text-slate-400 leading-relaxed shrink-0">
        Las IPs en esta lista son consideradas <span class="text-emerald-400 font-medium">seguras</span>.
        Las reglas de detección las excluyen explícitamente.
      </p>

      <!-- Formulario -->
      <div class="flex flex-col gap-1.5 shrink-0">
        <div class="flex gap-2">
          <div class="flex-1 flex items-center bg-slate-900 border rounded-lg px-3 transition-colors"
               :class="inputBorder">
            <span class="text-slate-500 text-xs mr-2 font-mono">IP:</span>
            <input v-model="ip" type="text" placeholder="ej: 192.168.1.100"
                   class="mono-input" @keydown.enter="add"/>
          </div>
          <AppButton variant="emerald" size="sm" :loading="adding" :disabled="!ip.trim() || !isValidIP(ip)"
                     @click="add">
            <template #icon>
              <Plus class="w-3 h-3"/>
            </template>
            Agregar
          </AppButton>
        </div>
        <p v-if="inBlacklist" class="text-xs text-orange-400">
          Esta IP está en la lista negra, eliminala primero antes de agregarla como confiable.
        </p>
      </div>

      <!-- Lista -->
      <div class="space-y-1.5 overflow-y-auto flex-1 min-h-0 pr-1">
        <EmptyState v-if="store.whitelist.length === 0" title="No hay IPs en la lista blanca">
          <template #icon>
            <ShieldCheck class="w-8 h-8 opacity-20 mb-1"/>
          </template>
        </EmptyState>
        <IPListItem
            v-for="entry in store.whitelist"
            :key="entry.ip"
            :ip="entry.ip"
            :removing="removing === entry.ip"
            variant="emerald"
            @remove="remove(entry.ip)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, computed, onMounted} from 'vue';
import {ShieldCheck, RefreshCw, Plus} from '@lucide/vue';
import AppButton from '../shared/AppButton.vue';
import EmptyState from '../shared/EmptyState.vue';
import IPListItem from './IPListItem.vue';
import {toast} from 'vue-sonner';
import {useIpListsStore} from '../../stores/ipLists';

const store = useIpListsStore();
onMounted(load);

const ip = ref('');
const adding = ref(false);
const removing = ref<string | null>(null);
const loading = ref(false);

const reloadIconClass = computed(() => loading.value ? 'animate-spin' : '');

const inBlacklist = computed(() =>
    isValidIP(ip.value) && store.blacklist.some(e => e.ip === ip.value.trim())
);

const inputBorder = computed(() => {
  if (ip.value && !isValidIP(ip.value)) return 'border-red-500/60';
  if (inBlacklist.value) return 'border-orange-500/60';
  return 'border-slate-600 focus-within:border-emerald-500';
});

function isValidIP(val: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(val.trim()) &&
      val.trim().split('.').every(o => parseInt(o) <= 255);
}

async function load() {
  loading.value = true;
  try {
    await store.fetchWhitelist();
  } catch {
    toast.error('No se pudo recargar la lista blanca', {duration: 5000});
  } finally {
    loading.value = false;
  }
}

async function add() {
  const val = ip.value.trim();
  if (!val || !isValidIP(val)) return;
  if (store.blacklist.some(e => e.ip === val)) {
    toast.error(`${val} ya está en la lista negra`, {
      description: 'Eliminala de la lista negra antes de agregarla como confiable.',
      duration: 6000,
    });
    return;
  }
  adding.value = true;
  try {
    const body = await store.addToWhitelist(val);
    if (body.ok) {
      toast.success(`${val} agregada a la lista blanca`, {duration: 4000});
      ip.value = '';
    } else if (body.error) {
      toast.error('Motor Prolog no disponible', {
        description: 'Reiniciá el servidor con: swipl server.pl',
        duration: 7000
      });
    } else {
      toast.warning(String(body.message ?? 'La IP ya está en la lista'), {duration: 5000});
    }
  } catch {
    toast.error('Error al contactar el motor Prolog', {duration: 5000});
  } finally {
    adding.value = false;
  }
}

async function remove(val: string) {
  removing.value = val;
  try {
    const body = await store.removeFromWhitelist(val);
    if (body.ok) {
      toast.success(`${val} eliminada de la lista blanca`, {duration: 4000});
    } else {
      toast.warning(String(body.message ?? 'No se pudo eliminar'), {duration: 5000});
    }
  } catch {
    toast.error('Error al contactar el motor Prolog', {duration: 5000});
  } finally {
    removing.value = null;
  }
}
</script>
