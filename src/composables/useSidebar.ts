import { ref } from 'vue'

const open = ref(false)

export function useSidebar() {
  function toggle() { open.value = !open.value }
  function close()  { open.value = false }
  return { open, toggle, close }
}
