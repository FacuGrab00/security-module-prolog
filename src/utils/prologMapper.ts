import type { LogEntry, SecurityAlert } from '../types'

// ─── Tipos que devuelve el motor Prolog ──────────────────────────────────────

export interface PrologAlert {
  severity: string
  type:     string
  payload:  Record<string, unknown>
}

export interface PrologStats {
  total_events:      number
  failed_logins:     number
  successful_logins: number
  unique_users:      number
}

export interface PrologLog {
  timestamp: number
  usuario:   string
  ip:        string
  accion:    string
  resultado: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

// Fragmentos Prolog que coinciden con los predicados de audit_engine.pl
export const RULE_CODE: Record<string, string> = {
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

  actividad_red_dispersa:
    'actividad_red_dispersa(Usuario, CantSubredes) :-\n' +
    '    aggregate_all(max(T0), log_entrada(T0, _, _, _, _), TsReciente),\n' +
    '    VentanaDesde is TsReciente - 3600,\n' +
    '    findall(Subred,\n' +
    '        (log_entrada(T, Usuario, IP, _, _),\n' +
    '         T >= VentanaDesde,\n' +
    '         extraer_subred(IP, Subred)),\n' +
    '        Subredes),\n' +
    '    sort(Subredes, SubredesUnicas),\n' +
    '    length(SubredesUnicas, CantSubredes),\n' +
    '    CantSubredes > 3.',

  descarga_masiva:
    'descarga_masiva(Usuario) :-\n' +
    '    findall(T, log_entrada(T, Usuario, _, descarga, exito), Ts),\n' +
    '    length(Ts, N),\n' +
    '    N >= 10.',

  origen_sospechoso:
    'origen_sospechoso(Usuario, IP) :-\n' +
    '    log_entrada(_, Usuario, IP, login, exito),\n' +
    '    ip_prohibida(IP, _).',

  horario_atipico:
    'horario_atipico(Usuario, Timestamp) :-\n' +
    '    extraer_hora_dia(Timestamp, HoraActual),\n' +
    '    log_entrada(Timestamp, Usuario, _, login, exito),\n' +
    '    findall(H,\n' +
    '        (log_entrada(T2, Usuario, _, login, exito),\n' +
    '         T2 \\= Timestamp,\n' +
    '         extraer_hora_dia(T2, H)),\n' +
    '        HistorialHoras),\n' +
    '    HistorialHoras \\= [],\n' +
    '    \\+ member(HoraActual, HistorialHoras).',
}

export const TYPE_LABEL: Record<string, string> = {
  ataque_fuerza_bruta:      'Fuerza Bruta',
  ataque_masivo_ip:         'Ataque Distribuido',
  acceso_ip_prohibida:      'IP Prohibida',
  sesion_simultanea:        'Sesión Simultánea',
  acceso_horario_irregular: 'Acceso Fuera de Horario',
  acceso_tras_intentos:     'Bypass Fuerza Bruta',
  login_cuenta_servicio:    'Login Cuenta de Servicio',
  intento_escalada:         'Intento de Escalada',
  usuario_desconocido:      'Usuario No Registrado',
  actividad_red_dispersa:  'Actividad en Múltiples Subredes',
  descarga_masiva:          'Descarga Masiva de Datos',
  origen_sospechoso:        'Origen Geográfico Sospechoso',
  horario_atipico:          'Acceso en Horario Atípico',
}

// ─── Funciones de mapeo ───────────────────────────────────────────────────────

function mapSeverity(s: string): SecurityAlert['severity'] {
  if (s === 'critica') return 'critical'
  if (s === 'alta')    return 'high'
  if (s === 'media')   return 'medium'
  return 'low'
}

function buildDescription(type: string, p: Record<string, unknown>): string {
  const u  = p.user as string
  const ip = p.ip   as string
  switch (type) {
    case 'ataque_fuerza_bruta':
      return `Usuario "${u}" registró 5+ intentos fallidos de login desde IP ${ip}.`
    case 'ataque_masivo_ip':
      return `IP ${ip} intentó acceder con múltiples usuarios distintos (ataque distribuido).`
    case 'acceso_ip_prohibida':
      return `Acceso registrado desde IP ${ip} en lista negra. Motivo: ${p.motivo}.`
    case 'sesion_simultanea':
      return `Usuario "${u}" tiene sesiones activas simultáneas desde dos IPs distintas (posible robo de sesión).`
    case 'acceso_horario_irregular':
      return `Administrador "${u}" accedió fuera del horario laboral (${new Date(Number(p.access_time) * 1000).toLocaleString('es-AR')}).`
    case 'acceso_tras_intentos':
      return `Usuario "${u}" logró acceso exitoso tras múltiples intentos fallidos desde IP ${ip}.`
    case 'login_cuenta_servicio':
      return `Cuenta de servicio "${u}" realizó un login interactivo no autorizado.`
    case 'intento_escalada':
      return `Usuario normal "${u}" ejecutó una acción reservada para administradores.`
    case 'usuario_desconocido':
      return `Usuario no registrado "${u}" intentó acceder desde IP ${ip}.`
    case 'actividad_red_dispersa':
      return `Usuario "${u}" operó desde ${p.subnet_count} subredes distintas en la última hora (posible movimiento lateral).`
    case 'descarga_masiva':
      return `Usuario "${u}" realizó 10 o más descargas exitosas (posible exfiltración de datos).`
    case 'origen_sospechoso':
      return `Usuario "${u}" accedió exitosamente desde IP ${ip}, que figura en la lista negra.`
    case 'horario_atipico':
      return `Usuario "${u}" accedió a las ${new Date(Number(p.access_time) * 1000).toLocaleString('es-AR')}, fuera de su horario habitual.`
    default:
      return `Anomalía detectada — tipo: ${type}`
  }
}

export function alertIP(alert: SecurityAlert): string | null {
  switch (alert.type) {
    case 'ataque_fuerza_bruta':
    case 'ataque_masivo_ip':
    case 'acceso_ip_prohibida':
    case 'acceso_tras_intentos':
    case 'usuario_desconocido':
    case 'origen_sospechoso':
      return alert.payload.ip
    default:
      return null
  }
}


export function prologAlertToUI(a: PrologAlert): SecurityAlert {
  const typeKey = a.type as SecurityAlert['type']
  const payloadKey = Object.values(a.payload).join('-')
  const id = `${a.type}-${payloadKey}`
  return {
    id,
    type:        typeKey,
    label:       TYPE_LABEL[a.type] ?? a.type,
    description: buildDescription(a.type, a.payload),
    severity:    mapSeverity(a.severity),
    status:      'active',
    timestamp:   new Date().toLocaleString('es-AR'),
    prologRule:  RULE_CODE[a.type] ?? `${a.type}(...).`,
    payload:     a.payload,
  } as SecurityAlert
}

export function prologLogToUI(l: PrologLog, i: number): LogEntry {
  return {
    id:        String(i),
    timestamp: String(l.timestamp),
    user:      String(l.usuario),
    ip:        String(l.ip),
    result:    l.resultado === 'exito' ? 'success' : 'failure',
    role:      'user' as const,
    action:    String(l.accion).toUpperCase(),
    country:   'AR',
  }
}
