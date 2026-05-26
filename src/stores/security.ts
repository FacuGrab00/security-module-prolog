import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LogEntry, SecurityAlert, BlockedIP, AlertStatus } from '../types'

// ─── Tipos que devuelve el motor Prolog ──────────────────────────────────────

interface PrologAlert {
  severity: string
  type:     string
  entity:   string | number
  detail:   string | number
}

interface PrologStats {
  total_events:       number
  failed_logins:      number
  successful_logins:  number
  unique_users:       number
}

interface PrologLog {
  timestamp: number
  usuario:   string
  ip:        string
  accion:    string
  resultado: string
}

// ─── Helpers de mapeo Prolog → UI ─────────────────────────────────────────────

function mapSeverity(s: string): SecurityAlert['severity'] {
  if (s === 'critica') return 'critical'
  if (s === 'alta')    return 'high'
  if (s === 'media')   return 'medium'
  return 'low'
}

// Fragmentos de código Prolog correspondientes a cada tipo de alerta.
// Coinciden exactamente con los predicados de audit_engine.pl.
const RULE_CODE: Record<string, string> = {
  ataque_fuerza_bruta:
    'ataque_fuerza_bruta(Usuario, IP) :-\n' +
    '    \\+ ip_confiable(IP),\n' +
    '    setof(T, log_entrada(T, Usuario, IP, login, fallo), Tiempos),\n' +
    '    length(Tiempos, N), N >= 5.',

  ataque_masivo_ip:
    'ataque_masivo_ip(IP) :-\n' +
    '    \\+ ip_confiable(IP),\n' +
    '    setof(U, T^log_entrada(T, U, IP, login, fallo), Usuarios),\n' +
    '    length(Usuarios, N), N >= 3.',

  acceso_ip_prohibida:
    'acceso_ip_prohibida(IP, Motivo) :-\n' +
    '    ip_prohibida(IP, Motivo),\n' +
    '    \\+ ip_confiable(IP),\n' +
    '    once(log_entrada(_, _, IP, _, _)).',

  sesion_simultanea:
    'sesion_simultanea(Usuario) :-\n' +
    '    log_entrada(T1, Usuario, IP1, login, exito),\n' +
    '    log_entrada(T2, Usuario, IP2, login, exito),\n' +
    '    IP1 \\= IP2,\n' +
    '    \\+ ip_confiable(IP1), \\+ ip_confiable(IP2),\n' +
    '    Diferencia is abs(T2 - T1), Diferencia =< 300.',

  acceso_horario_irregular:
    'acceso_horario_irregular(Usuario, Timestamp) :-\n' +
    '    rol_usuario(Usuario, administrador),\n' +
    '    log_entrada(Timestamp, Usuario, _, login, exito),\n' +
    '    extraer_hora_dia(Timestamp, Hora),\n' +
    '    horario_permitido(Inicio, Fin),\n' +
    '    (Hora < Inicio ; Hora >= Fin).',

  acceso_tras_intentos:
    'acceso_tras_intentos(Usuario, IP) :-\n' +
    '    setof(T, log_entrada(T, Usuario, IP, login, fallo), TsFallos),\n' +
    '    length(TsFallos, N), N >= 3,\n' +
    '    findall(Te, log_entrada(Te, Usuario, IP, login, exito), TsExito),\n' +
    '    TsExito \\= [],\n' +
    '    last(TsFallos, UltimoFallo), last(TsExito, UltimoExito),\n' +
    '    UltimoExito > UltimoFallo.',

  login_cuenta_servicio:
    'login_cuenta_servicio(Usuario) :-\n' +
    '    rol_usuario(Usuario, servicio),\n' +
    '    log_entrada(_, Usuario, _, login, exito).',

  intento_escalada:
    'intento_escalada(Usuario) :-\n' +
    '    rol_usuario(Usuario, usuario_normal),\n' +
    '    log_entrada(_, Usuario, _, accion_admin, _).',

  usuario_desconocido:
    'usuario_desconocido(Usuario, IP) :-\n' +
    '    \\+ rol_usuario(Usuario, _),\n' +
    '    setof(_, T^log_entrada(T, Usuario, IP, login, fallo), _).',
}

// Etiquetas legibles para mostrar en la UI
const TYPE_LABEL: Record<string, string> = {
  ataque_fuerza_bruta:      'Fuerza Bruta',
  ataque_masivo_ip:         'Ataque Distribuido',
  acceso_ip_prohibida:      'IP Prohibida',
  sesion_simultanea:        'Sesión Simultánea',
  acceso_horario_irregular: 'Acceso Fuera de Horario',
  acceso_tras_intentos:     'Bypass Fuerza Bruta',
  login_cuenta_servicio:    'Login Cuenta de Servicio',
  intento_escalada:         'Intento de Escalada',
  usuario_desconocido:      'Usuario No Registrado',
}

function buildDescription(a: PrologAlert): string {
  const e = String(a.entity), d = String(a.detail)
  switch (String(a.type)) {
    case 'ataque_fuerza_bruta':
      return `Usuario "${e}" registró 5+ intentos fallidos de login desde IP ${d}.`
    case 'ataque_masivo_ip':
      return `IP ${e} intentó acceder con múltiples usuarios distintos (ataque distribuido).`
    case 'acceso_ip_prohibida':
      return `Acceso registrado desde IP ${e} en lista negra. Motivo: ${d}.`
    case 'sesion_simultanea':
      return `Usuario "${e}" tiene sesiones activas simultáneas desde dos IPs distintas (posible robo de sesión).`
    case 'acceso_horario_irregular':
      return `Administrador "${e}" accedió fuera del horario laboral (ts: ${d}).`
    case 'acceso_tras_intentos':
      return `Usuario "${e}" logró acceso exitoso tras múltiples intentos fallidos desde IP ${d}.`
    case 'login_cuenta_servicio':
      return `Cuenta de servicio "${e}" realizó un login interactivo no autorizado.`
    case 'intento_escalada':
      return `Usuario normal "${e}" ejecutó una acción reservada para administradores.`
    case 'usuario_desconocido':
      return `Usuario no registrado "${e}" intentó acceder desde IP ${d}.`
    default:
      return `Anomalía detectada — tipo: ${a.type}, entidad: ${e}, detalle: ${d}`
  }
}

// Tipos donde entity = IP (no usuario)
const ENTITY_IS_IP = new Set(['ataque_masivo_ip', 'acceso_ip_prohibida'])

// Tipos donde detail = IP
const DETAIL_IS_IP = new Set(['ataque_fuerza_bruta', 'acceso_tras_intentos', 'usuario_desconocido'])

function resolveFields(a: PrologAlert): { user: string; ip: string } {
  const t = String(a.type)
  if (ENTITY_IS_IP.has(t))  return { user: '—',              ip: String(a.entity || '—') }
  if (DETAIL_IS_IP.has(t))  return { user: String(a.entity || '—'), ip: String(a.detail || '—') }
  return                           { user: String(a.entity || '—'), ip: '—' }
}

function prologAlertToUI(a: PrologAlert, index: number): SecurityAlert {
  const typeKey = String(a.type)
  const { user, ip } = resolveFields(a)
  return {
    id:          `ALT-${String(index + 1).padStart(3, '0')}`,
    type:        TYPE_LABEL[typeKey] ?? typeKey,
    description: buildDescription(a),
    severity:    mapSeverity(a.severity),
    status:      'active',
    ip,
    user,
    timestamp:   new Date().toLocaleString('es-AR'),
    prologRule:  RULE_CODE[typeKey] ?? `${typeKey}(${a.entity}, ${a.detail}).`,
    alertType:   typeKey,
    rawEntity:   String(a.entity ?? '—'),
    rawDetail:   String(a.detail ?? '—'),
  }
}

// ─── Tipos del historial de importaciones ────────────────────────────────────

interface LoadedFile {
  name:            string
  loadedAt:        string
  recordsAdded:    number
  recordsSkipped:  number
}

// ─── Tipos de listas de IPs ───────────────────────────────────────────────────

export interface BlacklistEntry { ip: string; motivo: string }
export interface WhitelistEntry { ip: string }

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSecurityStore = defineStore('security', () => {
  const logs         = ref<LogEntry[]>([])
  const alerts       = ref<SecurityAlert[]>([])
  const blockedIPs   = ref<BlockedIP[]>([])
  const loadedFiles  = ref<LoadedFile[]>([])
  const blacklist    = ref<BlacklistEntry[]>([])
  const whitelist    = ref<WhitelistEntry[]>([])
  const isLoading    = ref(false)
  const prologOnline = ref(false)
  const prologStats  = ref<PrologStats | null>(null)

  const stats = computed(() => ({
    totalLogs:      prologStats.value?.total_events      ?? logs.value.length,
    criticalAlerts: alerts.value.filter(a => a.severity === 'critical' && a.status === 'active').length,
    blockedIPs:     blockedIPs.value.length,
    activeThreats:  alerts.value.filter(a => a.status === 'active').length,
    successRate:    prologStats.value
      ? Math.round((prologStats.value.successful_logins / Math.max(prologStats.value.total_events, 1)) * 100)
      : 0,
    lastUpdate: new Date().toLocaleTimeString('es-AR'),
  }))

  const activeAlerts   = computed(() => alerts.value.filter(a => a.status === 'active'))
  const criticalAlerts = computed(() => alerts.value.filter(a => a.severity === 'critical'))

  async function fetchAll() {
    isLoading.value = true
    try {
      await Promise.all([fetchStats(), fetchAlerts(), fetchLogs()])
      prologOnline.value = true
    } catch {
      prologOnline.value = false
    } finally {
      isLoading.value = false
    }
  }

  async function fetchStats() {
    const res = await fetch('/api/stats')
    prologStats.value = await res.json()
  }

  async function fetchAlerts() {
    const res  = await fetch('/api/alerts')
    const body = await res.json() as { alerts: PrologAlert[] }
    alerts.value = body.alerts.map(prologAlertToUI)
  }

  async function fetchLogs() {
    const res  = await fetch('/api/logs')
    const body = await res.json() as { logs: PrologLog[] }
    logs.value = body.logs.map((l, i): LogEntry => ({
      id:        String(i),
      timestamp: String(l.timestamp),
      user:      String(l.usuario),
      ip:        String(l.ip),
      result:    l.resultado === 'exito' ? 'success' : 'failure',
      role:      'user' as const,
      action:    String(l.accion).toUpperCase(),
      country:   'AR',
    }))
  }

  async function importCSV(content: string, filename: string) {
    isLoading.value = true
    try {
      const res  = await fetch('/api/load_csv_data', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ data: content }),
      })
      const body = await res.json()
      if (body.ok) {
        await fetchAll()
        loadedFiles.value.push({
          name:           filename,
          loadedAt:       new Date().toLocaleTimeString('es-AR'),
          // records_added: servidor nuevo | records_loaded: servidor viejo (fallback)
          recordsAdded:   body.records_added   ?? body.records_loaded ?? 0,
          recordsSkipped: body.records_skipped ?? 0,
        })
      }
      return body
    } catch (err) {
      isLoading.value = false
      throw err            // propagar errores de red al caller
    } finally {
      isLoading.value = false
    }
  }

  async function clearData() {
    isLoading.value = true
    try {
      await fetch('/api/clear_data', { method: 'POST' })
      await fetchAll()
      loadedFiles.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function generateReport(): Promise<string> {
    const res  = await fetch('/api/report', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ output: 'reports/reporte_auditoria.txt' }),
    })
    const body = await res.json()
    return body.content ?? ''
  }

  async function runQuery(type: string, params: Record<string, string> = {}): Promise<string> {
    const qs  = new URLSearchParams({ type, ...params }).toString()
    const res = await fetch(`/api/query?${qs}`)
    const body = await res.json()
    return String(body.result ?? body.error ?? '')
  }

  function blockIP(ip: string, reason: string, blockedBy: string) {
    if (blockedIPs.value.find(b => b.ip === ip)) return
    blockedIPs.value.unshift({ ip, reason, blockedAt: new Date().toLocaleString('es-AR'), blockedBy })
    alerts.value.filter(a => a.ip === ip).forEach(a => (a.status = 'resolved'))
  }

  function updateAlertStatus(id: string, status: AlertStatus) {
    const alert = alerts.value.find(a => a.id === id)
    if (alert) alert.status = status
  }

  function dismissAlert(id: string) {
    const idx = alerts.value.findIndex(a => a.id === id)
    if (idx !== -1) alerts.value.splice(idx, 1)
  }

  // ─── Gestión de listas de IPs ────────────────────────────────────────────────

  // ── helpers para parsear respuestas con chequeo de HTTP status ──────────────

  async function safeJson(res: Response): Promise<Record<string, unknown>> {
    // Prolog devuelve errores como JSON con {code, message} (HTTP 4xx/5xx).
    // Normalizamos: si el status no es 2xx, lo convertimos a {ok: false, error}.
    const text = await res.text()
    let body: Record<string, unknown>
    try { body = JSON.parse(text) } catch { body = { raw: text } }
    if (!res.ok) {
      const msg = (body.message as string) ?? `HTTP ${res.status}`
      return { ok: false, error: msg }
    }
    return body
  }

  async function fetchBlacklist() {
    const res  = await fetch('/api/blacklist')
    const body = await safeJson(res)
    if (body.ok !== false) blacklist.value = (body.blacklist as BlacklistEntry[]) ?? []
  }

  async function fetchWhitelist() {
    const res  = await fetch('/api/whitelist')
    const body = await safeJson(res)
    if (body.ok !== false) {
      whitelist.value = ((body.whitelist as string[]) ?? []).map(ip => ({ ip }))
    }
  }

  async function addToBlacklist(ip: string, motivo: string) {
    const res  = await fetch('/api/bloquear_ip', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ip, motivo }),
    })
    const body = await safeJson(res)
    if (body.ok) await fetchBlacklist()
    return body
  }

  async function removeFromBlacklist(ip: string) {
    const res  = await fetch('/api/blacklist_remove', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ip }),
    })
    const body = await safeJson(res)
    if (body.ok) await fetchBlacklist()
    return body
  }

  async function addToWhitelist(ip: string) {
    const res  = await fetch('/api/whitelist_add', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ip }),
    })
    const body = await safeJson(res)
    if (body.ok) await fetchWhitelist()
    return body
  }

  async function removeFromWhitelist(ip: string) {
    const res  = await fetch('/api/whitelist_remove', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ip }),
    })
    const body = await safeJson(res)
    if (body.ok) await fetchWhitelist()
    return body
  }

  return {
    logs, alerts, blockedIPs, loadedFiles, blacklist, whitelist, stats, activeAlerts, criticalAlerts,
    isLoading, prologOnline, prologStats,
    fetchAll, importCSV, clearData, generateReport, runQuery,
    blockIP, updateAlertStatus, dismissAlert,
    fetchBlacklist, fetchWhitelist,
    addToBlacklist, removeFromBlacklist,
    addToWhitelist, removeFromWhitelist,
  }
})
