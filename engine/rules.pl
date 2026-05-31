% =============================================================================
%  REGLAS DE DETECCIÓN — 13 patrones de comportamiento anómalo
% =============================================================================

% REGLA 1 — Ataque de fuerza bruta
% Condición: 5 o más intentos fallidos de login desde la misma IP al mismo usuario.
% La IP no debe pertenecer a la lista de confianza.
ataque_fuerza_bruta(Usuario, IP) :-
    setof(T, log_entrada(T, Usuario, IP, login, fallo), Tiempos),
    length(Tiempos, N),
    N >= 5,
    \+ ip_confiable(IP).

% REGLA 2 — Ataque distribuido de fuerza bruta
% Condición: misma IP intenta login con 3 o más usuarios distintos.
% El operador ^ en setof declara T como variable existencial (no se incluye
% en la clave de agrupación).
ataque_masivo_ip(IP) :-
    setof(U, T^log_entrada(T, U, IP, login, fallo), Usuarios),
    length(Usuarios, N),
    N >= 3,
    \+ ip_confiable(IP).

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
    setof(U, T1^IP1^A1^R1^(log_entrada(T1, U, IP1, A1, R1), T1 >= VentanaDesde), Candidatos),
    member(Usuario, Candidatos),
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
    setof(T, IP^log_entrada(T, Usuario, IP, descarga, exito), Ts),
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
    log_entrada(Timestamp, Usuario, _, login, exito),
    extraer_hora_dia(Timestamp, HoraActual),
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
    setof(_, T^log_entrada(T, Usuario, IP, login, fallo), _),
    \+ rol_usuario(Usuario, _).

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
%  PREDICADOS AUXILIARES
% =============================================================================

% Extrae la hora del día (0–23) a partir de un timestamp Unix.
extraer_hora_dia(Timestamp, Hora) :-
    Hora is (Timestamp // 3600) mod 24.

% Extrae los primeros dos octetos de una IP (identifica la subred /16).
extraer_subred(IP, Subred) :-
    atomic_list_concat(Partes, '.', IP),
    Partes = [A, B | _],
    atomic_list_concat([A, B], '.', Subred).

% Tabla de severidad por tipo de anomalía.
severidad_alerta(ataque_fuerza_bruta,      critica).
severidad_alerta(ataque_masivo_ip,         critica).
severidad_alerta(acceso_ip_prohibida,      critica).
severidad_alerta(sesion_simultanea,        critica).
severidad_alerta(acceso_tras_intentos,     alta).
severidad_alerta(acceso_horario_irregular, alta).
severidad_alerta(login_cuenta_servicio,    alta).
severidad_alerta(intento_escalada,         alta).
severidad_alerta(descarga_masiva,          alta).
severidad_alerta(actividad_red_dispersa,   alta).
severidad_alerta(origen_sospechoso,        media).
severidad_alerta(horario_atipico,          media).
severidad_alerta(usuario_desconocido,      baja).
