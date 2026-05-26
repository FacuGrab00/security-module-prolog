// ─────────────────────────────────────────────────────────────────────────────
//  Datos estáticos de documentación — NO son datos de negocio
//  Reflejan exactamente los predicados definidos en audit_engine.pl
//  Los datos reales (logs, alertas, stats) vienen del motor Prolog vía API
// ─────────────────────────────────────────────────────────────────────────────
import type { AuditQuery, PrologRule } from '../types'

// ─── Templates de consultas de auditoría (documentación del audit_engine.pl) ──
// El código Prolog mostrado aquí corresponde a los predicados del archivo .pl.
// La ejecución real se realiza vía GET /api/query al motor SWI-Prolog.
export const auditQueries: AuditQuery[] = [
  {
    id: 'Q1',
    title: 'Usuarios activos en más de N subredes distintas',
    description: 'Lista todos los usuarios que generaron eventos en más de N subredes distintas.',
    category: 'Análisis de Red',
    prolog: `consulta_usuarios_red_dispersa(MinSubredes, Resultados) :-
    findall(U, log_entrada(_, U, _, _, _), UsuariosBrutos),
    sort(UsuariosBrutos, Usuarios),
    findall(U-N,
        (member(U, Usuarios),
         actividad_red_dispersa(U, N),
         N >= MinSubredes),
        Resultados).`,
  },
  {
    id: 'Q2',
    title: 'IPs que realizaron ataque distribuido y lograron acceso',
    description: 'Detecta IPs que atacaron ≥3 usuarios distintos (ataque_masivo_ip) y además lograron al menos un login exitoso.',
    category: 'Fuerza Bruta',
    prolog: `consulta_ataques_exitosos(Resultados) :-
    findall(IP-Afectados-Comprometidos,
        (ataque_masivo_ip(IP),
         findall(U,  log_entrada(_, U, IP, login, fallo), UF),
         sort(UF, Afectados),
         findall(Ue, log_entrada(_, Ue, IP, login, exito), UE),
         sort(UE, Comprometidos),
         Comprometidos \\= []),
        Resultados).`,
  },
  {
    id: 'Q3',
    title: 'Informe completo de un usuario (estadísticas + alertas)',
    description: 'Devuelve total de eventos, fallos, éxitos y lista de alertas activas para un usuario.',
    category: 'Auditoría',
    prolog: `informe_usuario(Usuario,
             informe(Usuario, Total, Fallos, Exitos, Alertas)) :-
    findall(_, log_entrada(_, Usuario, _, _, _), Todos),
    length(Todos, Total),
    findall(_, log_entrada(_, Usuario, _, _, fallo), LF),
    length(LF, Fallos),
    findall(_, log_entrada(_, Usuario, _, _, exito), LE),
    length(LE, Exitos),
    findall(A, alertas_de_usuario(Usuario, A), Alertas).`,
  },
  {
    id: 'Q4',
    title: 'Línea de tiempo cronológica de un usuario',
    description: 'Reconstruye la secuencia de todos los eventos de un usuario ordenados por tiempo.',
    category: 'Forense',
    prolog: `historial_usuario(Usuario, Timeline) :-
    findall(T-IP-Accion-Resultado,
        log_entrada(T, Usuario, IP, Accion, Resultado),
        Pares),
    msort(Pares, Timeline).`,
  },
]

// ─── Definición de las reglas Prolog (documentación de audit_engine.pl) ──────
// El campo `triggered` NO está hardcodeado — RulesView lo calcula
// a partir de las alertas reales devueltas por el motor Prolog.
export const prologRulesDefinitions: Omit<PrologRule, 'triggered'>[] = [
  {
    id: 'R01', name: 'ataque_fuerza_bruta/2',
    description: '5+ intentos fallidos de login desde la misma IP al mismo usuario. Excluye IPs de confianza (\\+ ip_confiable). setof/3 garantiza unicidad de timestamps.',
    category: 'Fuerza Bruta',
    code: `ataque_fuerza_bruta(Usuario, IP) :-
    \\+ ip_confiable(IP),
    setof(T, log_entrada(T, Usuario, IP, login, fallo), Tiempos),
    length(Tiempos, N), N >= 5.`,
  },
  {
    id: 'R02', name: 'ataque_masivo_ip/1',
    description: 'Una sola IP que intenta login con 3+ usuarios distintos. T^ declara T como variable existencial en setof para agrupar por IP–Usuario.',
    category: 'Fuerza Bruta',
    code: `ataque_masivo_ip(IP) :-
    \\+ ip_confiable(IP),
    setof(U, T^log_entrada(T, U, IP, login, fallo), Usuarios),
    length(Usuarios, N), N >= 3.`,
  },
  {
    id: 'R03', name: 'acceso_horario_irregular/2',
    description: 'Login exitoso de un administrador fuera del horario laboral (08:00–20:00). extraer_hora_dia/2 convierte timestamps Unix a hora del día.',
    category: 'Horario Laboral',
    code: `acceso_horario_irregular(Usuario, Timestamp) :-
    rol_usuario(Usuario, administrador),
    log_entrada(Timestamp, Usuario, _, login, exito),
    extraer_hora_dia(Timestamp, Hora),
    horario_permitido(Inicio, Fin),
    (Hora < Inicio ; Hora >= Fin).`,
  },
  {
    id: 'R04', name: 'acceso_ip_prohibida/2',
    description: 'IP en lista negra (ip_prohibida/2) que registró al menos un evento. once/1 corta tras el primer match para evitar duplicados.',
    category: 'Lista Negra',
    code: `acceso_ip_prohibida(IP, Motivo) :-
    ip_prohibida(IP, Motivo),
    \\+ ip_confiable(IP),
    once(log_entrada(_, _, IP, _, _)).`,
  },
  {
    id: 'R05', name: 'login_cuenta_servicio/1',
    description: 'Cuenta de servicio (respaldo_bd, monitor_red) realizó un login interactivo — estas cuentas nunca deberían autenticarse de forma interactiva.',
    category: 'Privilegios',
    code: `login_cuenta_servicio(Usuario) :-
    rol_usuario(Usuario, servicio),
    log_entrada(_, Usuario, _, login, exito).`,
  },
  {
    id: 'R06', name: 'actividad_red_dispersa/2',
    description: 'Usuario activo en más de 3 subredes distintas en la última hora. aggregate_all/3 localiza el evento más reciente y define la ventana temporal.',
    category: 'Reconocimiento',
    code: `actividad_red_dispersa(Usuario, CantSubredes) :-
    aggregate_all(max(T0), log_entrada(T0, _, _, _, _), TsReciente),
    VentanaDesde is TsReciente - 3600,
    findall(Subred,
        (log_entrada(T, Usuario, IP, _, _),
         T >= VentanaDesde,
         extraer_subred(IP, Subred)),
        Subredes),
    sort(Subredes, SubredesUnicas),
    length(SubredesUnicas, CantSubredes),
    CantSubredes > 3.`,
  },
  {
    id: 'R07', name: 'intento_escalada/1',
    description: 'Usuario con rol usuario_normal que ejecutó una acción reservada para administradores (accion_admin).',
    category: 'Privilegios',
    code: `intento_escalada(Usuario) :-
    rol_usuario(Usuario, usuario_normal),
    log_entrada(_, Usuario, _, accion_admin, _).`,
  },
  {
    id: 'R08', name: 'descarga_masiva/1',
    description: '10 o más descargas exitosas del mismo usuario — posible exfiltración de datos. findall acumula todos los timestamps de descarga.',
    category: 'Exfiltración',
    code: `descarga_masiva(Usuario) :-
    findall(T, log_entrada(T, Usuario, _, descarga, exito), Ts),
    length(Ts, N), N >= 10.`,
  },
  {
    id: 'R09', name: 'acceso_tras_intentos/2',
    description: 'Login exitoso que ocurre DESPUÉS de 3+ fallos desde la misma IP — el ataque de fuerza bruta tuvo resultado.',
    category: 'Intrusión',
    code: `acceso_tras_intentos(Usuario, IP) :-
    setof(T, log_entrada(T, Usuario, IP, login, fallo), TsFallos),
    length(TsFallos, N), N >= 3,
    findall(Te, log_entrada(Te, Usuario, IP, login, exito), TsExito),
    TsExito \\= [],
    last(TsFallos, UltimoFallo),
    last(TsExito,  UltimoExito),
    UltimoExito > UltimoFallo.`,
  },
  {
    id: 'R10', name: 'usuario_desconocido/2',
    description: 'Usuario sin rol definido en la base de hechos que intentó acceder. El núcleo es la negación por falla: \\+ rol_usuario(U, _).',
    category: 'Reconocimiento',
    code: `usuario_desconocido(Usuario, IP) :-
    \\+ rol_usuario(Usuario, _),
    setof(_, T^log_entrada(T, Usuario, IP, login, fallo), _).`,
  },
  {
    id: 'R11', name: 'horario_atipico/2',
    description: 'Login en una hora en la que el usuario NUNCA ha accedido antes. \\+ member/2 sobre el historial es un caso clásico de negación por falla.',
    category: 'Anomalía',
    code: `horario_atipico(Usuario, Timestamp) :-
    extraer_hora_dia(Timestamp, HoraActual),
    log_entrada(Timestamp, Usuario, _, login, exito),
    findall(H,
        (log_entrada(T2, Usuario, _, login, exito),
         T2 \\= Timestamp,
         extraer_hora_dia(T2, H)),
        HistorialHoras),
    HistorialHoras \\= [],
    \\+ member(HoraActual, HistorialHoras).`,
  },
  {
    id: 'R12', name: 'origen_sospechoso/2',
    description: 'Login exitoso desde una IP listada como prohibida — simplificación de detección por origen geográfico (GeoIP).',
    category: 'Geolocalización',
    code: `origen_sospechoso(Usuario, IP) :-
    log_entrada(_, Usuario, IP, login, exito),
    ip_prohibida(IP, _).`,
  },
  {
    id: 'R13', name: 'sesion_simultanea/1',
    description: 'Mismo usuario con logins exitosos desde dos IPs distintas en menos de 300 segundos. Ambas IPs se verifican contra la lista blanca con \\+ ip_confiable/1.',
    category: 'Sesiones',
    code: `sesion_simultanea(Usuario) :-
    log_entrada(T1, Usuario, IP1, login, exito),
    log_entrada(T2, Usuario, IP2, login, exito),
    IP1 \\= IP2,
    \\+ ip_confiable(IP1),
    \\+ ip_confiable(IP2),
    Diferencia is abs(T2 - T1),
    Diferencia =< 300.`,
  },
]
