% =============================================================================
%  API HTTP — Gestión de listas blanca y negra de IPs
% =============================================================================

:- http_handler('/api/bloquear_ip',      responder_bloquear_ip,      [method(post)]).
:- http_handler('/api/blacklist',        responder_listar_blacklist,  [method(get)]).
:- http_handler('/api/blacklist_remove', responder_remover_blacklist, [method(post)]).
:- http_handler('/api/whitelist',        responder_listar_whitelist,  [method(get)]).
:- http_handler('/api/whitelist_add',    responder_agregar_whitelist, [method(post)]).
:- http_handler('/api/whitelist_remove', responder_remover_whitelist, [method(post)]).

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

% GET /api/blacklist — devuelve todas las IPs prohibidas
responder_listar_blacklist(_Request) :-
    cors_enable,
    findall(_{ip: IP, motivo: M}, ip_prohibida(IP, M), Lista),
    reply_json_dict(_{ok: true, blacklist: Lista}).

% POST /api/blacklist_remove  { "ip": "x.x.x.x" }
responder_remover_blacklist(Request) :-
    cors_enable,
    http_read_json_dict(Request, Cuerpo),
    get_dict(ip, Cuerpo, IP),
    (   ip_prohibida(IP, _)
    ->  retractall(ip_prohibida(IP, _)),
        reply_json_dict(_{ok: true, ip: IP, message: 'IP eliminada de la lista negra'})
    ;   reply_json_dict(_{ok: false, message: 'La IP no estaba en la lista negra'})
    ).

% GET /api/whitelist — devuelve todas las IPs de confianza
responder_listar_whitelist(_Request) :-
    cors_enable,
    findall(IP, ip_confiable(IP), Lista),
    reply_json_dict(_{ok: true, whitelist: Lista}).

% POST /api/whitelist_add  { "ip": "x.x.x.x" }
responder_agregar_whitelist(Request) :-
    cors_enable,
    http_read_json_dict(Request, Cuerpo),
    get_dict(ip, Cuerpo, IP),
    (   ip_confiable(IP)
    ->  reply_json_dict(_{ok: false, message: 'La IP ya estaba en la lista blanca'})
    ;   assertz(ip_confiable(IP)),
        reply_json_dict(_{ok: true, ip: IP, message: 'IP agregada a la lista blanca'})
    ).

% POST /api/whitelist_remove  { "ip": "x.x.x.x" }
responder_remover_whitelist(Request) :-
    cors_enable,
    http_read_json_dict(Request, Cuerpo),
    get_dict(ip, Cuerpo, IP),
    (   ip_confiable(IP)
    ->  retract(ip_confiable(IP)),
        reply_json_dict(_{ok: true, ip: IP, message: 'IP eliminada de la lista blanca'})
    ;   reply_json_dict(_{ok: false, message: 'La IP no estaba en la lista blanca'})
    ).
