export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low'
export type AlertStatus   = 'active' | 'resolved' | 'investigating'
export type LogResult     = 'success' | 'failure'
export type UserRole      = 'admin' | 'operator' | 'user' | 'guest'

export interface LogEntry {
  id:        string
  timestamp: string
  user:      string
  ip:        string
  result:    LogResult
  role:      UserRole
  action:    string
  country:   string
}

// ─── Payloads por tipo de alerta ─────────────────────────────────────────────

interface PayloadFuerzaBruta        { user: string; ip: string }
interface PayloadAtaqueMasivoIp     { ip: string }
interface PayloadIpProhibida        { ip: string; motivo: string }
interface PayloadSesionSimultanea   { user: string }
interface PayloadHorarioIrregular   { user: string; access_time: number }
interface PayloadAccesoTrasIntentos { user: string; ip: string }
interface PayloadLoginServicio      { user: string }
interface PayloadEscalada           { user: string }
interface PayloadUsuarioDesconocido { user: string; ip: string }

interface BaseAlert {
  id:          string
  label:       string
  description: string
  severity:    AlertSeverity
  status:      AlertStatus
  timestamp:   string
  prologRule:  string
  count?:      number
}

export type SecurityAlert =
  | BaseAlert & { type: 'ataque_fuerza_bruta';     payload: PayloadFuerzaBruta }
  | BaseAlert & { type: 'ataque_masivo_ip';         payload: PayloadAtaqueMasivoIp }
  | BaseAlert & { type: 'acceso_ip_prohibida';      payload: PayloadIpProhibida }
  | BaseAlert & { type: 'sesion_simultanea';        payload: PayloadSesionSimultanea }
  | BaseAlert & { type: 'acceso_horario_irregular'; payload: PayloadHorarioIrregular }
  | BaseAlert & { type: 'acceso_tras_intentos';     payload: PayloadAccesoTrasIntentos }
  | BaseAlert & { type: 'login_cuenta_servicio';    payload: PayloadLoginServicio }
  | BaseAlert & { type: 'intento_escalada';         payload: PayloadEscalada }
  | BaseAlert & { type: 'usuario_desconocido';      payload: PayloadUsuarioDesconocido }

export interface BlockedIP {
  ip:         string
  reason:     string
  blockedAt:  string
  blockedBy:  string
  expiresAt?: string
}

export interface NotifiedUser {
  user:         string
  reason:       string
  notifiedAt:   string
  channel:      string
}

export interface AuditQuery {
  id:          string
  title:       string
  description: string
  prolog:      string
  result?:     string[]
  category:    string
}

export interface DashboardStats {
  totalLogs:        number
  criticalAlerts:   number
  blockedIPs:       number
  activeThreats:    number
  successRate:      number
  lastUpdate:       string
}

export interface PrologRule {
  id:          string
  name:        string
  description: string
  code:        string
  category:    string
  triggered:   number
}
