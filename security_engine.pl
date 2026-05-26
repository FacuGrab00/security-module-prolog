:- module(audit_engine, []).

:- use_module(library(http/thread_httpd)).
:- use_module(library(http/http_dispatch)).
:- use_module(library(http/http_json)).
:- use_module(library(http/http_parameters)).
:- use_module(library(http/http_cors)).
:- use_module(library(csv)).
:- use_module(library(lists)).
:- use_module(library(aggregate)).

% =============================================================================
%  SECCIÓN 1 — BASE DE CONOCIMIENTO
% =============================================================================

% Eventos de acceso registrados
% log_entrada(Timestamp, Usuario, IP, Accion, Resultado)
:- dynamic log_entrada/5.

% IPs en lista de bloqueo
% ip_prohibida(IP, Motivo)
:- dynamic ip_prohibida/2.

% Roles de usuarios del sistema
% rol_usuario(Usuario, Rol)
:- dynamic rol_usuario/2.

% Ventana del horario laboral permitido
% horario_permitido(HoraInicio, HoraFin) en horas (0–23)
:- dynamic horario_permitido/2.

% --- IPs PROHIBIDAS (lista negra inicial) ------------------------------------
ip_prohibida('45.33.32.156',   'Escaneo masivo de puertos detectado').
ip_prohibida('23.129.64.200',  'IP de origen anonimo no rastreable').
ip_prohibida('185.107.47.215', 'Equipo comprometido usado para ataques').
ip_prohibida('91.108.56.179',  'Ataque dirigido de origen desconocido').
ip_prohibida('104.244.79.6',   'Conexion via proxy anonimo').
ip_prohibida('0.0.0.0',        'Direccion IP no valida').

% --- IPs DE CONFIANZA (lista blanca) --------------------
% Las reglas que verifican IPs excluyen explícitamente estas direcciones.
ip_confiable('192.168.0.1').
ip_confiable('192.168.0.254').
ip_confiable('10.10.0.1').
ip_confiable('10.10.0.2').
ip_confiable('127.0.0.1').

% --- ROLES DE USUARIOS -------------------------------------------------------
rol_usuario(admin_ti,       administrador).
rol_usuario(director_sis,   administrador).
rol_usuario(root,           administrador).
rol_usuario(respaldo_bd,    servicio).
rol_usuario(monitor_red,    servicio).

% --- HORARIO LABORAL ---------------------------------------------------------
horario_permitido(8, 20).

% =============================================================================
%  SECCIÓN 2 — REGLAS DE DETECCIÓN
%  Cada regla identifica un patrón de comportamiento anómalo.
% =============================================================================

% REGLA 1 — Ataque de fuerza bruta
% Condición: 5 o más intentos fallidos de login desde la misma IP al mismo usuario
% La IP no debe pertenecer a la lista de confianza.
ataque_fuerza_bruta(Usuario, IP) :-
    \+ ip_confiable(IP),
    setof(T, log_entrada(T, Usuario, IP, login, fallo), Tiempos),
    length(Tiempos, N),
    N >= 5.

% REGLA 2 — Ataque distribuido de fuerza bruta
% Condición: misma IP intenta login con 3 o más usuarios distintos.
% El operador ^ en setof declara T como variable existencial (no se incluye
% en la clave de agrupación).
ataque_masivo_ip(IP) :-
    \+ ip_confiable(IP),
    setof(U, T^log_entrada(T, U, IP, login, fallo), Usuarios),
    length(Usuarios, N),
    N >= 3.

% REGLA 3 — Acceso fuera del horario laboral por administrador
% Condición: usuario con rol administrador realiza login exitoso fuera de
% la ventana definida en horario_permitido/2.
acceso_horario_irregular(Usuario, Timestamp) :-
    rol_usuario(Usuario, administrador),
    log_entrada(Timestamp, Usuario, _, login, exito),
    extraer_hora_dia(Timestamp, Hora),
    horario_permitido(Inicio, Fin),
    (Hora < Inicio ; Hora >= Fin).

% REGLA 4 — Acceso desde IP prohibida
% Condición: la IP está en la lista negra Y hay al menos un evento registrado
% desde esa IP. Se excluyen IPs de confianza con \+.
% once/1 corta tras el primer match (evita duplicados por múltiples eventos).
acceso_ip_prohibida(IP, Motivo) :-
    ip_prohibida(IP, Motivo),
    \+ ip_confiable(IP),
    once(log_entrada(_, _, IP, _, _)).

% REGLA 5 — Login interactivo de cuenta de servicio
% Las cuentas de servicio (respaldo_bd, monitor_red) nunca deberían
% realizar logins interactivos. Si lo hacen, es sospechoso.
login_cuenta_servicio(Usuario) :-
    rol_usuario(Usuario, servicio),
    log_entrada(_, Usuario, _, login, exito).

% REGLA 6 — Actividad en múltiples subredes en la última hora
% Usa aggregate_all para encontrar el timestamp más reciente y calcular
% una ventana relativa de 3600 segundos hacia atrás.
actividad_red_dispersa(Usuario, CantSubredes) :-
    aggregate_all(max(T0), log_entrada(T0, _, _, _, _), TsReciente),
    VentanaDesde is TsReciente - 3600,
    findall(Subred,
        (log_entrada(T, Usuario, IP, _, _),
         T >= VentanaDesde,
         extraer_subred(IP, Subred)),
        Subredes),
    sort(Subredes, SubredesUnicas),
    length(SubredesUnicas, CantSubredes),
    CantSubredes > 3.

% REGLA 7 — Intento de escalada de privilegios
% Usuario con rol usuario_normal que ejecuta una acción reservada para admins.
intento_escalada(Usuario) :-
    rol_usuario(Usuario, usuario_normal),
    log_entrada(_, Usuario, _, accion_admin, _).

% REGLA 8 — Posible exfiltración de datos
% 10 o más descargas exitosas del mismo usuario pueden indicar extracción
% masiva de información.
descarga_masiva(Usuario) :-
    findall(T, log_entrada(T, Usuario, _, descarga, exito), Ts),
    length(Ts, N),
    N >= 10.

% REGLA 9 — Login exitoso tras múltiples fallos (posible bypass)
% Detecta el patrón: fallo × N → éxito posterior desde la misma IP.
% Indica que el ataque de fuerza bruta tuvo resultado.
acceso_tras_intentos(Usuario, IP) :-
    setof(T, log_entrada(T, Usuario, IP, login, fallo), TsFallos),
    length(TsFallos, N), N >= 3,
    findall(Te, log_entrada(Te, Usuario, IP, login, exito), TsExito),
    TsExito \= [],
    last(TsFallos, UltimoFallo),
    last(TsExito, UltimoExito),
    UltimoExito > UltimoFallo.

% REGLA 10 — Origen geográfico sospechoso
% Simplificación: asume que una IP en lista negra implica origen de riesgo.
% En producción se integraría con una base de datos GeoIP.
origen_sospechoso(Usuario, IP) :-
    log_entrada(_, Usuario, IP, login, exito),
    ip_prohibida(IP, _).

% REGLA 11 — Acceso en horario atípico para ese usuario
% El motor infiere que la hora es inusual si el usuario NO tiene historial
% de accesos previos en esa franja horaria. Usa negación por falla (\+).
horario_atipico(Usuario, Timestamp) :-
    extraer_hora_dia(Timestamp, HoraActual),
    log_entrada(Timestamp, Usuario, _, login, exito),
    findall(H,
        (log_entrada(T2, Usuario, _, login, exito),
         T2 \= Timestamp,
         extraer_hora_dia(T2, H)),
        HistorialHoras),
    HistorialHoras \= [],
    \+ member(HoraActual, HistorialHoras).

% REGLA 12 — Usuario no registrado en el sistema
% Detecta accesos de usuarios que no tienen rol definido en la base de hechos.
% La negación por falla (\+ rol_usuario(U, _)) es el núcleo de esta regla.
usuario_desconocido(Usuario, IP) :-
    \+ rol_usuario(Usuario, _),
    setof(_, T^log_entrada(T, Usuario, IP, login, fallo), _).

% REGLA 13 — Sesión simultánea desde dos IPs distintas
% Detecta cuando el mismo usuario tiene logins exitosos desde dos IPs
% diferentes dentro de una ventana de 5 minutos (300 segundos).
% Esto puede indicar robo de sesión o cuenta comprometida.
sesion_simultanea(Usuario) :-
    log_entrada(T1, Usuario, IP1, login, exito),
    log_entrada(T2, Usuario, IP2, login, exito),
    IP1 \= IP2,
    \+ ip_confiable(IP1),
    \+ ip_confiable(IP2),
    Diferencia is abs(T2 - T1),
    Diferencia =< 300.

% =============================================================================
%  SECCIÓN 3 — PREDICADOS AUXILIARES
% =============================================================================

% Extrae la hora del día (0–23) a partir de un timestamp Unix
extraer_hora_dia(Timestamp, Hora) :-
    Hora is (Timestamp // 3600) mod 24.

% Extrae los primeros dos octetos de una IP (identifica la subred /16)
extraer_subred(IP, Subred) :-
    atomic_list_concat(Partes, '.', IP),
    Partes = [A, B | _],
    atomic_list_concat([A, B], '.', Subred).

% Tabla de severidad por tipo de anomalía
severidad_alerta(ataque_fuerza_bruta,    critica).
severidad_alerta(ataque_masivo_ip,       critica).
severidad_alerta(acceso_ip_prohibida,    critica).
severidad_alerta(sesion_simultanea,      critica).
severidad_alerta(acceso_tras_intentos,   alta).
severidad_alerta(acceso_horario_irregular, alta).
severidad_alerta(login_cuenta_servicio,  alta).
severidad_alerta(intento_escalada,       alta).
severidad_alerta(descarga_masiva,        alta).
severidad_alerta(actividad_red_dispersa, alta).
severidad_alerta(origen_sospechoso,      media).
severidad_alerta(horario_atipico,        media).
severidad_alerta(usuario_desconocido,    baja).

% =============================================================================
%  SECCIÓN 4 — CONSULTAS DE AUDITORÍA NO TRIVIALES
%  Predicados complejos con variables, recursividad y negación por falla.
% =============================================================================

% CONSULTA 1 — Usuarios activos en más de N subredes distintas
%   ?- consulta_usuarios_red_dispersa(3, Resultados).
consulta_usuarios_red_dispersa(MinSubredes, Resultados) :-
    findall(U, log_entrada(_, U, _, _, _), UsuariosBrutos),
    sort(UsuariosBrutos, Usuarios),
    findall(U-N,
        (member(U, Usuarios),
         actividad_red_dispersa(U, N),
         N >= MinSubredes),
        Resultados).

% CONSULTA 2 — IPs con ataque distribuido que además lograron al menos un acceso exitoso
%   ?- consulta_ataques_exitosos(Resultados).
consulta_ataques_exitosos(Resultados) :-
    findall(IP-Afectados-Comprometidos,
        (ataque_masivo_ip(IP),
         findall(U,  log_entrada(_, U, IP, login, fallo), UF),
         sort(UF, Afectados),
         findall(Ue, log_entrada(_, Ue, IP, login, exito), UE),
         sort(UE, Comprometidos),
         Comprometidos \= []),
        Resultados).

% CONSULTA 3 — Línea de tiempo cronológica de eventos de un usuario
%   ?- historial_usuario(admin_ti, Timeline).
historial_usuario(Usuario, Timeline) :-
    findall(T-IP-Accion-Resultado,
        log_entrada(T, Usuario, IP, Accion, Resultado),
        Pares),
    msort(Pares, Timeline).

% CONSULTA 4 — Informe completo de un usuario (estadísticas + alertas activas)
%   ?- informe_usuario(jgonzalez, Informe).
informe_usuario(Usuario, informe(Usuario, Total, Fallos, Exitos, Alertas)) :-
    findall(_, log_entrada(_, Usuario, _, _, _), Todos),
    length(Todos, Total),
    findall(_, log_entrada(_, Usuario, _, _, fallo), LF),
    length(LF, Fallos),
    findall(_, log_entrada(_, Usuario, _, _, exito), LE),
    length(LE, Exitos),
    findall(A, alertas_de_usuario(Usuario, A), Alertas).

% Recolector de alertas individuales por usuario
alertas_de_usuario(Usuario, alerta(ataque_fuerza_bruta, IP)) :-
    ataque_fuerza_bruta(Usuario, IP).
alertas_de_usuario(Usuario, alerta(acceso_horario_irregular, Ts)) :-
    acceso_horario_irregular(Usuario, Ts).
alertas_de_usuario(Usuario, alerta(login_cuenta_servicio, Usuario)) :-
    login_cuenta_servicio(Usuario).
alertas_de_usuario(Usuario, alerta(intento_escalada, Usuario)) :-
    intento_escalada(Usuario).
alertas_de_usuario(Usuario, alerta(descarga_masiva, Usuario)) :-
    descarga_masiva(Usuario).
alertas_de_usuario(Usuario, alerta(acceso_tras_intentos, IP)) :-
    acceso_tras_intentos(Usuario, IP).
alertas_de_usuario(Usuario, alerta(sesion_simultanea, Usuario)) :-
    sesion_simultanea(Usuario).

% =============================================================================
%  SECCIÓN 5 — IMPORTACIÓN DE DATOS DESDE CSV
%  Formato: timestamp,usuario,ip,accion,resultado
%  Ejemplo:  1748185392,jgonzalez,192.168.1.45,login,fallo
% =============================================================================

importar_csv(Archivo) :-
    retractall(log_entrada(_, _, _, _, _)),
    csv_read_file(Archivo, Filas, [functor(fila), arity(5)]),
    maplist(registrar_fila_log, Filas),
    length(Filas, N),
    format(user_error, "~n  [CSV] ~w registros importados.~n", [N]).

% Ignora la fila de cabecera (timestamp no es numérico)
registrar_fila_log(fila(TsAtom, _, _, _, _)) :-
    atom(TsAtom), \+ atom_number(TsAtom, _), !.
registrar_fila_log(fila(TsAtom, Usuario, IP, AccionAtom, ResultAtom)) :-
    (atom(TsAtom) -> atom_number(TsAtom, Ts) ; Ts = TsAtom),
    (atom(AccionAtom) -> Accion = AccionAtom ; term_to_atom(Accion, AccionAtom)),
    (atom(ResultAtom) -> Resultado = ResultAtom ; term_to_atom(Resultado, ResultAtom)),
    assertz(log_entrada(Ts, Usuario, IP, Accion, Resultado)).

% =============================================================================
%  SECCIÓN 6 — GENERACIÓN DE REPORTE DE TEXTO
% =============================================================================

exportar_reporte(ArchivoSalida) :-
    open(ArchivoSalida, write, Stream),
    get_time(Ahora),
    format_time(atom(Fecha), '%Y-%m-%d %H:%M:%S', Ahora),

    format(Stream, "================================================================~n"),
    format(Stream, "  REPORTE DE AUDITORÍA DE SEGURIDAD — MOTOR PROLOG~n"),
    format(Stream, "  UNCAUS — Inteligencia Artificial 2026~n"),
    format(Stream, "  Generado: ~w~n", [Fecha]),
    format(Stream, "================================================================~n~n"),

    findall(_, log_entrada(_, _, _, _, _),    Todos),   length(Todos,    Total),
    findall(_, log_entrada(_, _, _, _, fallo), ListaF), length(ListaF,   Fallos),
    findall(_, log_entrada(_, _, _, _, exito), ListaE), length(ListaE,   Exitos),

    format(Stream, "--- RESUMEN ---~n"),
    format(Stream, "  Eventos procesados : ~w~n", [Total]),
    format(Stream, "  Accesos exitosos   : ~w~n", [Exitos]),
    format(Stream, "  Accesos fallidos   : ~w~n", [Fallos]),
    format(Stream, "~n"),

    % --- Alertas críticas
    format(Stream, "--- ALERTAS CRÍTICAS ---~n"),

    findall(U-IP, ataque_fuerza_bruta(U, IP), FB),
    (FB \= [] ->
        (format(Stream, "[CRITICO] Ataques de fuerza bruta:~n"),
         forall(member(U-IP, FB),
                format(Stream, "  Usuario: ~w   IP: ~w~n", [U, IP])))
    ; true),

    findall(IP-M, acceso_ip_prohibida(IP, M), BL),
    (BL \= [] ->
        (format(Stream, "[CRITICO] Accesos desde IPs prohibidas:~n"),
         forall(member(IP-M, BL),
                format(Stream, "  IP: ~w   Motivo: ~w~n", [IP, M])))
    ; true),

    findall(IP, ataque_masivo_ip(IP), ATM),
    (ATM \= [] ->
        (format(Stream, "[CRITICO] Ataques masivos distribuidos:~n"),
         forall(member(IP, ATM),
                format(Stream, "  IP origen: ~w~n", [IP])))
    ; true),

    findall(U, sesion_simultanea(U), SS),
    (SS \= [] ->
        (format(Stream, "[CRITICO] Sesiones simultáneas detectadas:~n"),
         forall(member(U, SS),
                format(Stream, "  Usuario: ~w~n", [U])))
    ; true),

    % --- Alertas altas
    format(Stream, "~n--- ALERTAS ALTA SEVERIDAD ---~n"),

    findall(U-T, acceso_horario_irregular(U, T), AIH),
    (AIH \= [] ->
        (format(Stream, "[ALTO] Accesos administrativos fuera de horario:~n"),
         forall(member(U-T, AIH),
                format(Stream, "  Usuario: ~w   Timestamp: ~w~n", [U, T])))
    ; true),

    findall(U-IP, acceso_tras_intentos(U, IP), ATI),
    (ATI \= [] ->
        (format(Stream, "[ALTO] Acceso exitoso tras intentos fallidos:~n"),
         forall(member(U-IP, ATI),
                format(Stream, "  Usuario: ~w   IP: ~w~n", [U, IP])))
    ; true),

    % --- Alertas medias/bajas
    format(Stream, "~n--- ALERTAS MEDIA/BAJA SEVERIDAD ---~n"),

    findall(U-IP, usuario_desconocido(U, IP), UD),
    (UD \= [] ->
        (format(Stream, "[BAJO] Usuarios no registrados:~n"),
         forall(member(U-IP, UD),
                format(Stream, "  Usuario: ~w   IP: ~w~n", [U, IP])))
    ; true),

    format(Stream, "~n================================================================~n"),
    format(Stream, "  FIN DEL REPORTE~n"),
    format(Stream, "================================================================~n"),
    close(Stream),
    format(user_error, "  [Reporte] Guardado en: ~w~n", [ArchivoSalida]).

% =============================================================================
%  SECCIÓN 7 — API HTTP/JSON
%  Rutas registradas al iniciar el servidor.
% =============================================================================

:- set_setting(http:cors, [*]).

:- http_handler('/api/load_csv',      responder_cargar_csv,       [method(post)]).
:- http_handler('/api/load_csv_data', responder_cargar_datos_csv, [method(post)]).
:- http_handler('/api/alerts',        responder_alertas,           [method(get)]).
:- http_handler('/api/stats',         responder_estadisticas,      [method(get)]).
:- http_handler('/api/query',         responder_consulta,          [method(get)]).
:- http_handler('/api/report',        responder_reporte,           [method(post)]).
:- http_handler('/api/timeline',      responder_linea_temporal,    [method(get)]).
:- http_handler('/api/logs',          responder_logs,              [method(get)]).
:- http_handler('/api/bloquear_ip',   responder_bloquear_ip,       [method(post)]).
:- http_handler('/',                  servir_archivos,             [prefix]).

servir_archivos(Request) :-
    memberchk(path(Path), Request),
    (   Path = '/'
    ->  http_reply_file('frontend/index.html', [], Request)
    ;   atom_concat('frontend', Path, Ruta),
        http_reply_file(Ruta, [], Request)
    ).

% GET /api/logs
responder_logs(_Request) :-
    cors_enable,
    findall(_{timestamp:T, usuario:U, ip:IP, accion:A, resultado:R},
        log_entrada(T, U, IP, A, R),
        Registros),
    reply_json_dict(_{logs: Registros}).

% GET /api/stats
responder_estadisticas(_Request) :-
    cors_enable,
    findall(_, log_entrada(_, _, _, _, _),    All), length(All, Total),
    findall(_, log_entrada(_, _, _, _, fallo), F),  length(F,   Fallos),
    findall(_, log_entrada(_, _, _, _, exito), E),  length(E,   Exitos),
    findall(U, (log_entrada(_, U, _, _, _), U \= ''), Us),
    sort(Us, UniqueUs), length(UniqueUs, TotalUsuarios),
    reply_json_dict(_{
        total_events:       Total,
        failed_logins:      Fallos,
        successful_logins:  Exitos,
        unique_users:       TotalUsuarios
    }).

% GET /api/alerts
responder_alertas(_Request) :-
    cors_enable,
    obtener_alertas_activas(Alertas),
    maplist(alerta_como_json, Alertas, AlertasJSON),
    reply_json_dict(_{alerts: AlertasJSON}).

obtener_alertas_activas(Alertas) :-
    findall(a(critica, ataque_fuerza_bruta,    U,  IP),  ataque_fuerza_bruta(U, IP),       A1),
    findall(a(critica, ataque_masivo_ip,       IP, ''),  ataque_masivo_ip(IP),              A2),
    findall(a(critica, acceso_ip_prohibida,    IP, M),   acceso_ip_prohibida(IP, M),        A3),
    findall(a(critica, sesion_simultanea,      U,  ''),  sesion_simultanea(U),              A4),
    findall(a(alta,    acceso_horario_irregular, U, Ts), acceso_horario_irregular(U, Ts),   A5),
    findall(a(alta,    acceso_tras_intentos,   U,  IP),  acceso_tras_intentos(U, IP),       A6),
    findall(a(alta,    login_cuenta_servicio,  U,  ''),  login_cuenta_servicio(U),          A7),
    findall(a(alta,    intento_escalada,       U,  ''),  intento_escalada(U),               A8),
    findall(a(media,   usuario_desconocido,    U,  IP),  usuario_desconocido(U, IP),        A9),
    append([A1,A2,A3,A4,A5,A6,A7,A8,A9], Todas),
    list_to_set(Todas, Alertas).

alerta_como_json(a(Severidad, Tipo, Entidad, Detalle), JSON) :-
    JSON = _{severity: Severidad, type: Tipo, entity: Entidad, detail: Detalle}.

% GET /api/timeline?user=XXX
responder_linea_temporal(Request) :-
    cors_enable,
    http_parameters(Request, [user(Usuario, [atom])]),
    historial_usuario(Usuario, Timeline),
    maplist(evento_como_json, Timeline, Eventos),
    reply_json_dict(_{user: Usuario, events: Eventos}).

evento_como_json(T-IP-Accion-Resultado,
                 _{timestamp: T, ip: IP, action: Accion, result: Resultado}).

% GET /api/query?type=...
responder_consulta(Request) :-
    cors_enable,
    http_parameters(Request, [type(Tipo, [atom])]),
    (   Tipo = multiples_subredes
    ->  http_parameters(Request, [min(MinAtom, [default('3')])]),
        atom_number(MinAtom, Min),
        consulta_usuarios_red_dispersa(Min, Res),
        term_to_atom(Res, R),
        reply_json_dict(_{query: Tipo, result: R})

    ;   Tipo = ips_comprometidas
    ->  consulta_ataques_exitosos(Res),
        term_to_atom(Res, R),
        reply_json_dict(_{query: Tipo, result: R})

    ;   Tipo = resumen
    ->  http_parameters(Request, [user(Usuario, [atom])]),
        informe_usuario(Usuario, Informe),
        term_to_atom(Informe, R),
        reply_json_dict(_{query: Tipo, user: Usuario, result: R})

    ;   reply_json_dict(_{error: 'Tipo desconocido. Opciones: multiples_subredes, ips_comprometidas, resumen'})
    ).

% POST /api/load_csv  { "file": "/ruta/al/archivo.csv" }
responder_cargar_csv(Request) :-
    cors_enable,
    http_read_json_dict(Request, Cuerpo),
    (   get_dict(file, Cuerpo, Archivo)
    ->  catch(
            (importar_csv(Archivo),
             findall(_, log_entrada(_,_,_,_,_), All), length(All, N),
             reply_json_dict(_{ok: true, records_loaded: N})),
            Error,
            (term_to_atom(Error, ErrAtom),
             reply_json_dict(_{ok: false, error: ErrAtom}))
        )
    ;   reply_json_dict(_{ok: false, error: 'Parametro requerido: file'})
    ).

% POST /api/load_csv_data  { "data": "<contenido csv como string>" }
responder_cargar_datos_csv(Request) :-
    cors_enable,
    http_read_json_dict(Request, Cuerpo),
    get_dict(data, Cuerpo, Data),
    atom_string(DataAtom, Data),
    tmp_file_stream(text, ArchivoTemp, StreamTemp),
    write(StreamTemp, DataAtom),
    close(StreamTemp),
    setup_call_cleanup(
        true,
        catch(
            (importar_csv(ArchivoTemp),
             findall(_, log_entrada(_,_,_,_,_), All), length(All, N),
             reply_json_dict(_{ok: true, records_loaded: N})),
            Error,
            (term_to_atom(Error, ErrAtom),
             reply_json_dict(_{ok: false, error: ErrAtom}))
        ),
        catch(delete_file(ArchivoTemp), _, true)
    ).

% POST /api/report  { "output": "ruta/opcional.txt" }
responder_reporte(Request) :-
    cors_enable,
    http_read_json_dict(Request, Cuerpo),
    (get_dict(output, Cuerpo, Salida) -> true ; Salida = 'reports/reporte_auditoria.txt'),
    catch(
        (exportar_reporte(Salida),
         read_file_to_string(Salida, Contenido, [encoding(utf8)]),
         reply_json_dict(_{ok: true, file: Salida, content: Contenido})),
        Error,
        (term_to_atom(Error, Err),
         reply_json_dict(_{ok: false, error: Err}))
    ).

% POST /api/bloquear_ip  { "ip": "x.x.x.x", "motivo": "razón" }
% Agrega una IP a la lista negra dinámicamente usando assertz/1.
% La IP queda en memoria hasta que el servidor se reinicie.
responder_bloquear_ip(Request) :-
    cors_enable,
    http_read_json_dict(Request, Cuerpo),
    get_dict(ip, Cuerpo, IP),
    (get_dict(motivo, Cuerpo, Motivo) -> true ; Motivo = 'Bloqueada manualmente'),
    (   ip_prohibida(IP, _)
    ->  reply_json_dict(_{ok: false, message: 'La IP ya estaba en la lista negra'})
    ;   assertz(ip_prohibida(IP, Motivo)),
        reply_json_dict(_{ok: true, ip: IP, motivo: Motivo})
    ).

% =============================================================================
%  SECCIÓN 8 — PUNTO DE ENTRADA
% =============================================================================

iniciar_servidor(Puerto) :-
    http_server(http_dispatch, [port(Puerto)]),
    format(user_error, "~n  ╔════════════════════════════════════════╗~n", []),
    format(user_error, "  ║   MOTOR DE AUDITORÍA PROLOG — ACTIVO   ║~n", []),
    format(user_error, "  ║   http://localhost:~w               ║~n",    [Puerto]),
    format(user_error, "  ╚════════════════════════════════════════╝~n~n", []).

:- initialization(main, main).

main :-
    iniciar_servidor(9090),
    thread_get_message(stop).
