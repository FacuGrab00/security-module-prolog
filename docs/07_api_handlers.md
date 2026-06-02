# engine/api/handlers.pl — Endpoints HTTP principales

Este archivo define todos los endpoints de la API REST que el frontend Vue
consume, exceptuando los de gestión de IPs (que están en `ip_lists.pl`).

---

## Cómo funciona el enrutamiento en SWI-Prolog

```prolog
:- http_handler('/api/stats', responder_estadisticas, [method(get)]).
```

`http_handler/3` registra una ruta:
- Primer argumento: URL path.
- Segundo argumento: predicado que maneja la petición.
- Tercer argumento: opciones (método HTTP permitido).

Cuando llega una petición a `/api/stats`, `http_dispatch` la redirige al predicado
`responder_estadisticas/1`, que recibe el objeto `Request` con toda la información
de la petición HTTP.

---

## Tabla de endpoints

| Método | URL | Predicado | Descripción |
|---|---|---|---|
| GET | `/api/stats` | `responder_estadisticas` | Estadísticas globales |
| GET | `/api/logs` | `responder_logs` | Todos los logs cargados |
| GET | `/api/alerts` | `responder_alertas` | Alertas activas |
| GET | `/api/query` | `responder_consulta` | Consultas de auditoría |
| GET | `/api/timeline` | `responder_linea_temporal` | Historial de un usuario |
| POST | `/api/load_csv` | `responder_cargar_csv` | Cargar CSV por ruta |
| POST | `/api/load_csv_data` | `responder_cargar_datos_csv` | Cargar CSV por contenido |
| POST | `/api/clear_data` | `responder_limpiar_datos` | Borrar todos los logs |
| POST | `/api/free_query` | `responder_consulta_libre` | Consulta Prolog arbitraria |
| POST | `/api/report` | `responder_reporte` | Generar reporte de texto |
| GET/POST | `/*` | `servir_archivos` | Archivos estáticos del frontend |

---

## Archivos estáticos

```prolog
servir_archivos(Request) :-
    memberchk(path(Path), Request),
    (   Path = '/'
    ->  http_reply_file('frontend/index.html', [], Request)
    ;   atom_concat('frontend', Path, Ruta),
        http_reply_file(Ruta, [], Request)
    ).
```

`memberchk(path(Path), Request)` extrae el path de la URL de la petición.
- Si el path es `/` → sirve `frontend/index.html`.
- Si no → concatena `'frontend'` + path y sirve ese archivo.
  Por ejemplo `/assets/app.js` → `frontend/assets/app.js`.

`http_reply_file/3` sirve el archivo con el Content-Type correcto.

---

## GET /api/logs

```prolog
responder_logs(_Request) :-
    cors_enable,
    findall(_{timestamp:T, usuario:U, ip:IP, accion:A, resultado:R},
        log_entrada(T, U, IP, A, R),
        Registros),
    reply_json_dict(_{logs: Registros}).
```

- `cors_enable` agrega los headers CORS a la respuesta.
- El `findall` usa como plantilla un **dict** `_{campo:Var, ...}`. Cada solución
  crea un dict con los valores de esa fila de log.
- `reply_json_dict/1` serializa el dict Prolog a JSON y lo envía como respuesta.

**Respuesta JSON:**
```json
{
  "logs": [
    {"timestamp": 1748185392, "usuario": "jgonzalez", "ip": "192.168.1.45", "accion": "login", "resultado": "fallo"}
  ]
}
```

---

## GET /api/stats

```prolog
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
```

El cuarto `findall` recolecta usuarios únicos: primero busca todos los usuarios
en los logs, filtra los vacíos con `U \= ''`, y luego `sort` elimina duplicados.

---

## GET /api/alerts

```prolog
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
```

Usa `catch/3` para manejar errores: si cualquier regla lanza una excepción
(por ejemplo, por datos malformados), la captura y la devuelve como JSON de error.

### `obtener_alertas_activas/1`

```prolog
obtener_alertas_activas(Alertas) :-
    findall(a(critica, ataque_fuerza_bruta, U, IP), ataque_fuerza_bruta(U, IP), A1),
    findall(a(critica, ataque_masivo_ip,    IP, ''), ataque_masivo_ip(IP),      A2),
    ...
    append([A1,A2,A3,A4,A5,A6,A7,A8,A9,A10,A11,A12,A13], Todas),
    list_to_set(Todas, Alertas).
```

Ejecuta las 13 reglas de detección y recolecta los resultados.
Cada alerta se representa como el término `a(Severidad, Tipo, Param1, Param2)`.

- `append/2` con lista de listas aplana todas las listas en una sola: `[A1, A2, ...]` → lista única `Todas`.
- `list_to_set/2` elimina duplicados (puede haber si la misma alerta se activa por múltiples razones).

### `alerta_como_json/3`

```prolog
alerta_como_json(a(Sev, ataque_fuerza_bruta, U, IP), JSON) :-
    JSON = _{severity: Sev, type: ataque_fuerza_bruta, payload: _{user: U, ip: IP}}.
```

Convierte cada término `a(...)` a un dict JSON. Hay una cláusula por cada tipo de
alerta porque cada una tiene un `payload` con campos distintos.

---

## GET /api/timeline?user=XXX

```prolog
responder_linea_temporal(Request) :-
    cors_enable,
    http_parameters(Request, [user(Usuario, [atom])]),
    historial_usuario(Usuario, Timeline),
    maplist(evento_como_json, Timeline, Eventos),
    reply_json_dict(_{user: Usuario, events: Eventos}).
```

`http_parameters/2` extrae parámetros del query string de la URL.
`[user(Usuario, [atom])]` significa: extraé el parámetro `user` y guardalo como átomo en `Usuario`.

---

## GET /api/query?type=...

```prolog
responder_consulta(Request) :-
    cors_enable,
    http_parameters(Request, [type(Tipo, [atom])]),
    (   Tipo = multiples_subredes
    ->  http_parameters(Request, [min(MinAtom, [default('3')])]),
        atom_number(MinAtom, Min),
        consulta_usuarios_red_dispersa(Min, Res), ...
    ;   Tipo = ips_comprometidas
    ->  consulta_ataques_exitosos(Res), ...
    ;   Tipo = resumen
    ->  http_parameters(Request, [user(Usuario, [atom])]),
        informe_usuario(Usuario, Informe), ...
    ;   ...
    ).
```

Un gran if/then/else encadenado con `->` y `;`. Despacha a la consulta
correspondiente según el parámetro `type`.

Para `multiples_subredes` también lee el parámetro opcional `min` (con default `'3'`).
Como `http_parameters` devuelve átomos, se necesita `atom_number` para convertir `'3'` al entero `3`.

---

## POST /api/load_csv — cargar CSV por ruta de archivo

```prolog
responder_cargar_csv(Request) :-
    cors_enable,
    http_read_json_dict(Request, Cuerpo),
    (   get_dict(file, Cuerpo, Archivo)
    ->  catch(
            (importar_csv(Archivo, Nuevos, Omitidos, Invalidos, Errores),
             ...
             reply_json_dict(_{ok: true, records_added: Nuevos, ...})),
            Error,
            (term_to_atom(Error, ErrAtom),
             reply_json_dict(_{ok: false, error: ErrAtom}))
        )
    ;   reply_json_dict(_{ok: false, error: 'Parametro requerido: file'})
    ).
```

`http_read_json_dict/2` lee el cuerpo JSON del POST y lo convierte en un dict Prolog.
`get_dict(file, Cuerpo, Archivo)` extrae la clave `"file"` del dict.
Si la clave no existe, la condición falla y se responde con error de parámetro faltante.

---

## POST /api/load_csv_data — cargar CSV por contenido

```prolog
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
        catch(importar_csv(ArchivoTemp, ...), ...),
        catch(delete_file(ArchivoTemp), _, true)
    ).
```

El frontend puede enviar el contenido CSV directamente como string en el JSON.
Para poder usar `csv_read_file` (que necesita un archivo), se escribe el contenido
en un archivo temporal con `tmp_file_stream`.

`setup_call_cleanup/3` garantiza que el archivo temporal se elimine aunque el
procesamiento lance una excepción: siempre ejecuta el tercer argumento al finalizar.

---

## POST /api/clear_data — borrar todos los logs

```prolog
responder_limpiar_datos(_Request) :-
    cors_enable,
    retractall(log_entrada(_, _, _, _, _)),
    reply_json_dict(_{ok: true, message: 'Todos los registros fueron eliminados'}).
```

`retractall/1` elimina *todos* los hechos que coincidan con el patrón.
El patrón `log_entrada(_, _, _, _, _)` con todos `_` elimina absolutamente todos
los registros de log. Las IPs y roles de la base de conocimiento no se tocan.

---

## POST /api/free_query — consulta Prolog arbitraria

```prolog
responder_consulta_libre(Request) :-
    cors_enable,
    http_read_json_dict(Request, Cuerpo),
    get_dict(query, Cuerpo, QueryRaw),
    (string(QueryRaw) -> atom_string(QueryAtom, QueryRaw) ; QueryAtom = QueryRaw),
    (atom_concat(Base, '.', QueryAtom) -> true ; Base = QueryAtom),
    catch(
        (term_to_atom(Goal, Base),
         findall(Goal, call(Goal), Soluciones),
         ...),
        Error, ...
    ).
```

Permite ejecutar cualquier consulta Prolog desde el frontend.

**Cómo funciona:**
1. Lee la consulta como string, por ejemplo: `"ataque_fuerza_bruta(U, IP)"`.
2. Si el usuario incluyó un `.` al final (como en la consola Prolog), lo elimina.
3. `term_to_atom(Goal, Base)` parsea el texto como un término Prolog. Para el ejemplo,
   `Goal` queda unificado con el término `ataque_fuerza_bruta(U, IP)` donde `U` e `IP`
   son variables libres.
4. `findall(Goal, call(Goal), Soluciones)` — el truco clave:
   - `call(Goal)` ejecuta el término como si fuera una consulta.
   - El `Goal` en la plantilla captura el estado de las variables en cada solución.
   - El resultado es la lista de todas las soluciones con las variables instanciadas.
5. `term_to_atom(Soluciones, ResultAtom)` convierte el resultado de vuelta a texto.

---

## POST /api/report — generar reporte

```prolog
responder_reporte(Request) :-
    cors_enable,
    http_read_json_dict(Request, Cuerpo),
    tmp_file_stream(text, Temp, TmpStream), close(TmpStream),
    catch(
        (exportar_reporte(Temp),
         read_file_to_string(Temp, Contenido, [encoding(utf8)]),
         catch(delete_file(Temp), _, true),
         (get_dict(output, Cuerpo, Salida) ->
             catch((open(Salida, write, WStream), write(WStream, Contenido), close(WStream)), _, true)
         ; true),
         reply_json_dict(_{ok: true, content: Contenido})),
        Error, ...
    ).
```

1. Crea un archivo temporal vacío (solo para obtener un nombre de archivo único).
2. Llama `exportar_reporte(Temp)` que escribe el reporte en ese archivo.
3. `read_file_to_string/3` lee el contenido del archivo como string.
4. Opcionalmente, si el cuerpo JSON tiene la clave `output`, también copia el
   reporte a esa ruta (para que el usuario lo descargue en su sistema).
5. Devuelve el contenido del reporte en el JSON.
