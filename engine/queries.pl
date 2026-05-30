% =============================================================================
%  CONSULTAS DE AUDITORÍA — Predicados complejos con variables,
%  recursividad y negación por falla.
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
