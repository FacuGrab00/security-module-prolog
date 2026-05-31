% =============================================================================
%  IMPORTACIÓN DE DATOS DESDE CSV
%  Formato: timestamp,usuario,ip,accion,resultado
%  Ejemplo:  1748185392,jgonzalez,192.168.1.45,login,fallo
% =============================================================================

% --- Valores permitidos ------------------------------------------------------

accion_valida(login).
accion_valida(descarga).
accion_valida(accion_admin).

resultado_valido(exito).
resultado_valido(fallo).

% --- Predicado principal -----------------------------------------------------

% importar_csv/5 — acumula sin borrar datos previos.
% Nuevos    : filas insertadas
% Omitidos  : filas válidas pero duplicadas
% Invalidos : filas que fallaron validación
% Errores   : lista de dicts con detalle de cada error
importar_csv(Archivo, Nuevos, Omitidos, Invalidos, Errores) :-
    findall(_, log_entrada(_,_,_,_,_), Antes), length(Antes, NAntes),
    csv_read_file(Archivo, FilasTodas, [functor(fila), arity(5)]),
    excluir_cabecera(FilasTodas, Filas),
    length(Filas, TotalDataFilas),
    procesar_filas(Filas, 2, [], ErrsRev),
    reverse(ErrsRev, Errores),
    length(Errores, Invalidos),
    findall(_, log_entrada(_,_,_,_,_), Despues), length(Despues, NDespues),
    Nuevos   is NDespues - NAntes,
    Omitidos is max(0, TotalDataFilas - Nuevos - Invalidos),
    format(user_error, "~n  [CSV] ~w nuevos, ~w duplicados, ~w inválidos.~n",
           [Nuevos, Omitidos, Invalidos]).

% Wrapper aridad 3 — compatibilidad con llamadas sin errores (ej: reporte).
importar_csv(Archivo, Nuevos, Omitidos) :-
    importar_csv(Archivo, Nuevos, Omitidos, _, _).

% Wrapper aridad 1 — compatibilidad con carga directa desde consola.
importar_csv(Archivo) :-
    importar_csv(Archivo, _, _, _, _).

% --- Detección de cabecera ---------------------------------------------------

% Si la primera fila tiene un campo no numérico en timestamp, es cabecera y se descarta.
excluir_cabecera([fila(TsAtom,_,_,_,_)|Resto], Resto) :-
    atom(TsAtom), \+ atom_number(TsAtom, _), !.
excluir_cabecera(Filas, Filas).

% --- Procesamiento fila a fila -----------------------------------------------

% procesar_filas(+Filas, +NumFila, +AccErr, -Errores)
% Itera cada fila: si es inválida acumula el error, si es válida la inserta.
procesar_filas([], _, Errores, Errores).
procesar_filas([Fila|Resto], N, AccErr, Errores) :-
    N1 is N + 1,
    (   error_en_fila(N, Fila, Error)
    ->  procesar_filas(Resto, N1, [Error|AccErr], Errores)
    ;   insertar_fila(Fila),
        procesar_filas(Resto, N1, AccErr, Errores)
    ).

% --- Detección de errores de validación --------------------------------------

% error_en_fila(+N, +Fila, -Error)
% Tiene éxito si la fila tiene algún campo inválido, devolviendo el detalle.
% Las cláusulas se evalúan en orden: se reporta el primer campo que falle.

error_en_fila(N, fila(TsAtom,_,_,_,_),
        _{fila:N, campo:timestamp, valor:TsAtom,
          razon:'No es un entero positivo'}) :-
    \+ validar_timestamp(TsAtom), !.

error_en_fila(N, fila(_,_,IP,_,_),
        _{fila:N, campo:ip, valor:IP,
          razon:'Formato IPv4 invalido (esperado: 0-255.0-255.0-255.0-255)'}) :-
    \+ validar_ip(IP), !.

error_en_fila(N, fila(_,_,_,Accion,_),
        _{fila:N, campo:accion, valor:Accion,
          razon:'Accion no reconocida. Validas: login, descarga, accion_admin'}) :-
    \+ accion_valida(Accion), !.

error_en_fila(N, fila(_,_,_,_,Resultado),
        _{fila:N, campo:resultado, valor:Resultado,
          razon:'Debe ser exito o fallo'}) :-
    \+ resultado_valido(Resultado), !.

% --- Inserción ---------------------------------------------------------------

% insertar_fila/1 — convierte tipos e inserta solo si no existe (deduplicación).
insertar_fila(fila(TsAtom, Usuario, IP, AccionAtom, ResultAtom)) :-
    (atom(TsAtom)    -> atom_number(TsAtom, Ts)         ; Ts       = TsAtom),
    (atom(AccionAtom)-> Accion    = AccionAtom           ; term_to_atom(Accion,    AccionAtom)),
    (atom(ResultAtom)-> Resultado = ResultAtom           ; term_to_atom(Resultado, ResultAtom)),
    (   \+ log_entrada(Ts, Usuario, IP, Accion, Resultado)
    ->  assertz(log_entrada(Ts, Usuario, IP, Accion, Resultado))
    ;   true
    ).

% --- Predicados de validación ------------------------------------------------

validar_timestamp(Ts) :-
    integer(Ts), !, Ts > 0.
validar_timestamp(TsAtom) :-
    atom_number(TsAtom, Ts),
    integer(Ts),
    Ts > 0.

validar_ip(IP) :-
    atomic_list_concat(Partes, '.', IP),
    length(Partes, 4),
    maplist(es_octeto, Partes).

es_octeto(Parte) :-
    atom_number(Parte, N),
    integer(N),
    N >= 0,
    N =< 255.
