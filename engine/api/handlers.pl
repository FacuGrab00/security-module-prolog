% =============================================================================
%  API HTTP — Handlers principales
%  Stats, logs, alertas, consultas, reporte, CSV y archivos estáticos.
% =============================================================================

:- http_handler('/api/load_csv',         responder_cargar_csv,       [method(post)]).
:- http_handler('/api/load_csv_data',    responder_cargar_datos_csv, [method(post)]).
:- http_handler('/api/clear_data',       responder_limpiar_datos,    [method(post)]).
:- http_handler('/api/alerts',           responder_alertas,          [method(get)]).
:- http_handler('/api/stats',            responder_estadisticas,     [method(get)]).
:- http_handler('/api/query',            responder_consulta,         [method(get)]).
:- http_handler('/api/free_query',       responder_consulta_libre,   [method(post)]).
:- http_handler('/api/report',           responder_reporte,          [method(post)]).
:- http_handler('/api/timeline',         responder_linea_temporal,   [method(get)]).
:- http_handler('/api/logs',             responder_logs,             [method(get)]).
:- http_handler('/',                     servir_archivos,            [prefix]).

% Archivos estáticos del frontend
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
    catch(
        (obtener_alertas_activas(Alertas),
         maplist(alerta_como_json, Alertas, AlertasJSON),
         reply_json_dict(_{alerts: AlertasJSON})),
        Error,
        (term_to_atom(Error, ErrAtom),
         reply_json_dict(_{ok: false, error: ErrAtom}))
    ).

obtener_alertas_activas(Alertas) :-
    findall(a(critica, ataque_fuerza_bruta,      U,  IP),  ataque_fuerza_bruta(U, IP),       A1),
    findall(a(critica, ataque_masivo_ip,         IP, ''),  ataque_masivo_ip(IP),              A2),
    findall(a(critica, acceso_ip_prohibida,      IP, M),   acceso_ip_prohibida(IP, M),        A3),
    findall(a(critica, sesion_simultanea,        U,  ''),  sesion_simultanea(U),              A4),
    findall(a(alta,    acceso_horario_irregular, U,  Ts),  acceso_horario_irregular(U, Ts),   A5),
    findall(a(alta,    acceso_tras_intentos,     U,  IP),  acceso_tras_intentos(U, IP),       A6),
    findall(a(alta,    login_cuenta_servicio,    U,  ''),  login_cuenta_servicio(U),          A7),
    findall(a(alta,    intento_escalada,         U,  ''),  intento_escalada(U),               A8),
    findall(a(media,   usuario_desconocido,      U,  IP),  usuario_desconocido(U, IP),        A9),
    findall(a(alta,    actividad_red_dispersa,   U,  C),   actividad_red_dispersa(U, C),      A10),
    findall(a(alta,    descarga_masiva,          U,  ''),  descarga_masiva(U),                A11),
    findall(a(media,   origen_sospechoso,        U,  IP),  origen_sospechoso(U, IP),          A12),
    findall(a(media,   horario_atipico,          U,  Ts),  horario_atipico(U, Ts),            A13),
    append([A1,A2,A3,A4,A5,A6,A7,A8,A9,A10,A11,A12,A13], Todas),
    list_to_set(Todas, Alertas).

alerta_como_json(a(Sev, ataque_fuerza_bruta,      U,  IP), JSON) :-
    JSON = _{severity: Sev, type: ataque_fuerza_bruta,      payload: _{user: U, ip: IP}}.
alerta_como_json(a(Sev, ataque_masivo_ip,          IP, _),  JSON) :-
    JSON = _{severity: Sev, type: ataque_masivo_ip,          payload: _{ip: IP}}.
alerta_como_json(a(Sev, acceso_ip_prohibida,       IP, M),  JSON) :-
    JSON = _{severity: Sev, type: acceso_ip_prohibida,       payload: _{ip: IP, motivo: M}}.
alerta_como_json(a(Sev, sesion_simultanea,         U,  _),  JSON) :-
    JSON = _{severity: Sev, type: sesion_simultanea,         payload: _{user: U}}.
alerta_como_json(a(Sev, acceso_horario_irregular,  U,  Ts), JSON) :-
    JSON = _{severity: Sev, type: acceso_horario_irregular,  payload: _{user: U, access_time: Ts}}.
alerta_como_json(a(Sev, acceso_tras_intentos,      U,  IP), JSON) :-
    JSON = _{severity: Sev, type: acceso_tras_intentos,      payload: _{user: U, ip: IP}}.
alerta_como_json(a(Sev, login_cuenta_servicio,     U,  _),  JSON) :-
    JSON = _{severity: Sev, type: login_cuenta_servicio,     payload: _{user: U}}.
alerta_como_json(a(Sev, intento_escalada,          U,  _),  JSON) :-
    JSON = _{severity: Sev, type: intento_escalada,          payload: _{user: U}}.
alerta_como_json(a(Sev, usuario_desconocido,       U,  IP), JSON) :-
    JSON = _{severity: Sev, type: usuario_desconocido,       payload: _{user: U, ip: IP}}.
alerta_como_json(a(Sev, actividad_red_dispersa,   U,  C),  JSON) :-
    JSON = _{severity: Sev, type: actividad_red_dispersa,    payload: _{user: U, subnet_count: C}}.
alerta_como_json(a(Sev, descarga_masiva,          U,  _),  JSON) :-
    JSON = _{severity: Sev, type: descarga_masiva,           payload: _{user: U}}.
alerta_como_json(a(Sev, origen_sospechoso,        U,  IP), JSON) :-
    JSON = _{severity: Sev, type: origen_sospechoso,         payload: _{user: U, ip: IP}}.
alerta_como_json(a(Sev, horario_atipico,          U,  Ts), JSON) :-
    JSON = _{severity: Sev, type: horario_atipico,           payload: _{user: U, access_time: Ts}}.

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

    ;   Tipo = historial_usuario
    ->  http_parameters(Request, [user(Usuario, [atom])]),
        historial_usuario(Usuario, Timeline),
        term_to_atom(Timeline, R),
        reply_json_dict(_{query: Tipo, user: Usuario, result: R})

    ;   reply_json_dict(_{error: 'Tipo desconocido. Opciones: multiples_subredes, ips_comprometidas, resumen, historial_usuario'})
    ).

% POST /api/load_csv  { "file": "/ruta/al/archivo.csv" }
responder_cargar_csv(Request) :-
    cors_enable,
    http_read_json_dict(Request, Cuerpo),
    (   get_dict(file, Cuerpo, Archivo)
    ->  catch(
            (importar_csv(Archivo, Nuevos, Omitidos, Invalidos, Errores),
             findall(_, log_entrada(_,_,_,_,_), All), length(All, Total),
             reply_json_dict(_{ok: true, records_added: Nuevos, records_skipped: Omitidos,
                               records_invalid: Invalidos, errors: Errores, total_in_db: Total})),
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
            (importar_csv(ArchivoTemp, Nuevos, Omitidos, Invalidos, Errores),
             findall(_, log_entrada(_,_,_,_,_), All), length(All, Total),
             reply_json_dict(_{ok: true, records_added: Nuevos, records_skipped: Omitidos,
                               records_invalid: Invalidos, errors: Errores, total_in_db: Total})),
            Error,
            (term_to_atom(Error, ErrAtom),
             reply_json_dict(_{ok: false, error: ErrAtom}))
        ),
        catch(delete_file(ArchivoTemp), _, true)
    ).

% POST /api/clear_data — elimina todos los log_entrada de la memoria
responder_limpiar_datos(_Request) :-
    cors_enable,
    retractall(log_entrada(_, _, _, _, _)),
    reply_json_dict(_{ok: true, message: 'Todos los registros fueron eliminados'}).

% POST /api/free_query  { "query": "<consulta prolog>" }
% Ejecuta una consulta Prolog arbitraria y devuelve todas las soluciones.
responder_consulta_libre(Request) :-
    cors_enable,
    http_read_json_dict(Request, Cuerpo),
    get_dict(query, Cuerpo, QueryRaw),
    (string(QueryRaw) -> atom_string(QueryAtom, QueryRaw) ; QueryAtom = QueryRaw),
    % Eliminar punto final si el usuario lo incluyó
    (atom_concat(Base, '.', QueryAtom) -> true ; Base = QueryAtom),
    catch(
        (term_to_atom(Goal, Base),
         findall(Goal, call(Goal), Soluciones),
         length(Soluciones, N),
         (   Soluciones = []
         ->  reply_json_dict(_{ok: true, result: 'false.', solutions: 0})
         ;   term_to_atom(Soluciones, ResultAtom),
             reply_json_dict(_{ok: true, result: ResultAtom, solutions: N})
         )),
        Error,
        (term_to_atom(Error, ErrAtom),
         reply_json_dict(_{ok: false, error: ErrAtom}))
    ).

% POST /api/report  { "output": "ruta/opcional.txt" }
responder_reporte(Request) :-
    cors_enable,
    http_read_json_dict(Request, Cuerpo),
    tmp_file_stream(text, Temp, TmpStream), close(TmpStream),
    catch(
        (exportar_reporte(Temp),
         read_file_to_string(Temp, Contenido, [encoding(utf8)]),
         catch(delete_file(Temp), _, true),
         (get_dict(output, Cuerpo, Salida) ->
             catch(
                 (open(Salida, write, WStream), write(WStream, Contenido), close(WStream)),
                 _, true
             )
         ; true),
         reply_json_dict(_{ok: true, content: Contenido})),
        Error,
        (catch(delete_file(Temp), _, true),
         term_to_atom(Error, Err),
         reply_json_dict(_{ok: false, error: Err}))
    ).
