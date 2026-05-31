// ─────────────────────────────────────────────────────────────────────────────
//  Datos estáticos de documentación — NO son datos de negocio
//  Reflejan exactamente los predicados definidos en audit_engine.pl
//  Los datos reales (logs, alertas, stats) vienen del motor Prolog vía API
// ─────────────────────────────────────────────────────────────────────────────
import type {AuditQuery, PrologRule} from '../types'

// ─── Templates de consultas de auditoría (documentación del audit_engine.pl) ──
// El código Prolog mostrado aquí corresponde a los predicados del archivo .pl.
// La ejecución real se realiza vía GET /api/query al motor SWI-Prolog.
export const auditQueries: AuditQuery[] = [
    {
        id: 'Q1',
        title: 'Usuarios con actividad en múltiples subredes',
        description: 'Muestra qué usuarios estuvieron activos en más de N subredes distintas, permitiendo detectar movimiento lateral o reconocimiento de red.',
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
        title: 'IPs que atacaron múltiples usuarios y lograron acceso',
        description: 'Identifica IPs que intentaron acceder con 3 o más cuentas distintas y además consiguieron al menos un login exitoso, indicando un ataque distribuido con resultado.',
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
        title: 'Informe completo de actividad por usuario',
        description: 'Genera un resumen de la actividad de un usuario: total de eventos registrados, intentos fallidos, accesos exitosos y alertas de seguridad asociadas.',
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
        title: 'Historial cronológico de eventos por usuario',
        description: 'Reconstruye la secuencia completa de acciones de un usuario ordenadas en el tiempo, útil para análisis forense o investigación de incidentes.',
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
        description: 'Detecta cuando se realizan 5 o más intentos fallidos de login sobre el mismo usuario desde una misma IP, lo que indica un ataque de fuerza bruta.',
        category: 'Fuerza Bruta',
        code: `ataque_fuerza_bruta(Usuario, IP) :-
    setof(T, log_entrada(T, Usuario, IP, login, fallo), Tiempos),
    length(Tiempos, N),
    N >= 5,
    \\+ ip_confiable(IP).`,
    },
    {
        id: 'R02', name: 'ataque_masivo_ip/1',
        description: 'Identifica una IP que intenta acceder con 3 o más cuentas de usuario distintas, señal de un escaneo masivo o ataque distribuido de credenciales.',
        category: 'Fuerza Bruta',
        code: `ataque_masivo_ip(IP) :-
    setof(U, T^log_entrada(T, U, IP, login, fallo), Usuarios),
    length(Usuarios, N),
    N >= 3,
    \\+ ip_confiable(IP).`,
    },
    {
        id: 'R03', name: 'acceso_horario_irregular/2',
        description: 'Detecta cuando un administrador inicia sesión fuera del horario laboral permitido (08:00–20:00), lo que puede indicar acceso no autorizado o uso indebido de credenciales.',
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
        description: 'Alerta cuando se detecta actividad desde una IP que se encuentra en la lista negra del sistema, independientemente del tipo de acción realizada.',
        category: 'Lista Negra',
        code: `acceso_ip_prohibida(IP, Motivo) :-
    ip_prohibida(IP, Motivo),
    \\+ ip_confiable(IP),
    once(log_entrada(_, _, IP, _, _)).`,
    },
    {
        id: 'R05', name: 'login_cuenta_servicio/1',
        description: 'Detecta cuando una cuenta de servicio, como las usadas para backups o monitoreo, realiza un login interactivo. Estas cuentas no deberían autenticarse manualmente.',
        category: 'Privilegios',
        code: `login_cuenta_servicio(Usuario) :-
    rol_usuario(Usuario, servicio),
    log_entrada(_, Usuario, _, login, exito).`,
    },
    {
        id: 'R06', name: 'actividad_red_dispersa/2',
        description: 'Identifica usuarios que han tenido actividad en más de 3 subredes distintas dentro de la última hora, comportamiento típico de reconocimiento o movimiento lateral.',
        category: 'Reconocimiento',
        code: `actividad_red_dispersa(Usuario, CantSubredes) :-
    aggregate_all(max(T0), log_entrada(T0, _, _, _, _), TsReciente),
    VentanaDesde is TsReciente - 3600,
    setof(U, T1^IP1^A1^R1^(log_entrada(T1, U, IP1, A1, R1), T1 >= VentanaDesde), Candidatos),
    member(Usuario, Candidatos),
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
        description: 'Detecta cuando un usuario sin privilegios de administrador intenta ejecutar acciones reservadas exclusivamente para roles administrativos.',
        category: 'Privilegios',
        code: `intento_escalada(Usuario) :-
    rol_usuario(Usuario, usuario_normal),
    log_entrada(_, Usuario, _, accion_admin, _).`,
    },
    {
        id: 'R08', name: 'descarga_masiva/1',
        description: 'Alerta cuando un usuario realiza 10 o más descargas exitosas, lo que puede indicar un intento de exfiltración masiva de información.',
        category: 'Exfiltración',
        code: `descarga_masiva(Usuario) :-
    setof(T, IP^log_entrada(T, Usuario, IP, descarga, exito), Ts),
    length(Ts, N),
    N >= 10.`,
    },
    {
        id: 'R09', name: 'acceso_tras_intentos/2',
        description: 'Detecta cuando un login exitoso ocurre después de 3 o más intentos fallidos desde la misma IP, indicando que un ataque de fuerza bruta logró ingresar.',
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
        description: 'Alerta sobre intentos de acceso realizados por usuarios que no existen en el sistema, lo que puede indicar reconocimiento de cuentas o uso de credenciales falsas.',
        category: 'Reconocimiento',
        code: `usuario_desconocido(Usuario, IP) :-
    setof(_, T^log_entrada(T, Usuario, IP, login, fallo), _),
    \\+ rol_usuario(Usuario, _).`,
    },
    {
        id: 'R11', name: 'horario_atipico/2',
        description: 'Identifica cuando un usuario inicia sesión a una hora del día en la que nunca ha accedido previamente, lo que puede señalar un compromiso de cuenta.',
        category: 'Anomalía',
        code: `horario_atipico(Usuario, Timestamp) :-
    log_entrada(Timestamp, Usuario, _, login, exito),
    extraer_hora_dia(Timestamp, HoraActual),
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
        description: 'Detecta logins exitosos desde IPs con origen geográfico sospechoso o restringido, basándose en listas de ubicaciones bloqueadas.',
        category: 'Geolocalización',
        code: `origen_sospechoso(Usuario, IP) :-
    log_entrada(_, Usuario, IP, login, exito),
    ip_prohibida(IP, _).`,
    },
    {
        id: 'R13', name: 'sesion_simultanea/1',
        description: 'Alerta cuando el mismo usuario registra logins exitosos desde dos IPs distintas con menos de 5 minutos de diferencia, lo que sugiere uso compartido o robo de credenciales.',
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
