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

export interface SecurityAlert {
  id:          string
  type:        string
  description: string
  severity:    AlertSeverity
  status:      AlertStatus
  ip:          string
  user:        string
  timestamp:   string
  prologRule:  string
  count?:      number
  alertType:   string   // nombre del predicado Prolog (ej: ataque_fuerza_bruta)
  rawEntity:   string   // valor crudo del 3° argumento que devuelve Prolog
  rawDetail:   string   // valor crudo del 4° argumento que devuelve Prolog
}

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
