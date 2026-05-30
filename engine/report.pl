% =============================================================================
%  GENERACIÓN DE REPORTE DE TEXTO
% =============================================================================

exportar_reporte(ArchivoSalida) :-
    open(ArchivoSalida, write, Stream),
    get_time(Ahora),
    format_time(atom(Fecha), '%Y-%m-%d %H:%M:%S', Ahora),

    format(Stream, "================================================================~n", []),
    format(Stream, "  REPORTE DE AUDITORÍA DE SEGURIDAD — MOTOR PROLOG~n",             []),
    format(Stream, "  UNCAUS — Inteligencia Artificial 2026~n",                         []),
    format(Stream, "  Generado: ~w~n",                                                  [Fecha]),
    format(Stream, "================================================================~n~n", []),

    findall(_, log_entrada(_, _, _, _, _),    Todos),   length(Todos,    Total),
    findall(_, log_entrada(_, _, _, _, fallo), ListaF), length(ListaF,   Fallos),
    findall(_, log_entrada(_, _, _, _, exito), ListaE), length(ListaE,   Exitos),

    format(Stream, "--- RESUMEN ---~n",                    []),
    format(Stream, "  Eventos procesados : ~w~n",          [Total]),
    format(Stream, "  Accesos exitosos   : ~w~n",          [Exitos]),
    format(Stream, "  Accesos fallidos   : ~w~n",          [Fallos]),
    format(Stream, "~n",                                   []),

    % --- Alertas críticas
    format(Stream, "--- ALERTAS CRÍTICAS ---~n",           []),

    findall(U-IP, ataque_fuerza_bruta(U, IP), FB),
    (FB \= [] ->
        (format(Stream, "[CRITICO] Ataques de fuerza bruta:~n", []),
         forall(member(U-IP, FB),
                format(Stream, "  Usuario: ~w   IP: ~w~n", [U, IP])))
    ; true),

    findall(IP-M, acceso_ip_prohibida(IP, M), BL),
    (BL \= [] ->
        (format(Stream, "[CRITICO] Accesos desde IPs prohibidas:~n", []),
         forall(member(IP-M, BL),
                format(Stream, "  IP: ~w   Motivo: ~w~n", [IP, M])))
    ; true),

    findall(IP, ataque_masivo_ip(IP), ATM),
    (ATM \= [] ->
        (format(Stream, "[CRITICO] Ataques masivos distribuidos:~n", []),
         forall(member(IP, ATM),
                format(Stream, "  IP origen: ~w~n", [IP])))
    ; true),

    findall(U, sesion_simultanea(U), SS),
    (SS \= [] ->
        (format(Stream, "[CRITICO] Sesiones simultáneas detectadas:~n", []),
         forall(member(U, SS),
                format(Stream, "  Usuario: ~w~n", [U])))
    ; true),

    % --- Alertas altas
    format(Stream, "~n--- ALERTAS ALTA SEVERIDAD ---~n",   []),

    findall(U-T, acceso_horario_irregular(U, T), AIH),
    (AIH \= [] ->
        (format(Stream, "[ALTO] Accesos administrativos fuera de horario:~n", []),
         forall(member(U-T, AIH),
                format(Stream, "  Usuario: ~w   Timestamp: ~w~n", [U, T])))
    ; true),

    findall(U-IP, acceso_tras_intentos(U, IP), ATI),
    (ATI \= [] ->
        (format(Stream, "[ALTO] Acceso exitoso tras intentos fallidos:~n", []),
         forall(member(U-IP, ATI),
                format(Stream, "  Usuario: ~w   IP: ~w~n", [U, IP])))
    ; true),

    % --- Alertas medias/bajas
    format(Stream, "~n--- ALERTAS MEDIA/BAJA SEVERIDAD ---~n", []),

    findall(U-IP, usuario_desconocido(U, IP), UD),
    (UD \= [] ->
        (format(Stream, "[BAJO] Usuarios no registrados:~n", []),
         forall(member(U-IP, UD),
                format(Stream, "  Usuario: ~w   IP: ~w~n", [U, IP])))
    ; true),

    format(Stream, "~n================================================================~n", []),
    format(Stream, "  FIN DEL REPORTE~n",                                                []),
    format(Stream, "================================================================~n",  []),
    close(Stream),
    format(user_error, "  [Reporte] generado en: ~w~n", [ArchivoSalida]).
