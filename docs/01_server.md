# server.pl — Punto de entrada del sistema

`server.pl` es el archivo raíz del proyecto. Define el módulo principal, carga todas
las bibliotecas externas, incluye todos los archivos del engine, y arranca el servidor HTTP.

---

## Estructura del archivo

### 1. Declaración de módulo

```prolog
:- module(audit_engine, []).
```

Declara que este archivo define un **módulo** llamado `audit_engine`.
El segundo argumento `[]` significa que no exporta ningún predicado públicamente
(todos los predicados son accesibles internamente via `include`).

---

### 2. Bibliotecas externas

```prolog
:- use_module(library(http/thread_httpd)).
:- use_module(library(http/http_dispatch)).
:- use_module(library(http/http_json)).
:- use_module(library(http/http_parameters)).
:- use_module(library(http/http_cors)).
:- use_module(library(csv)).
:- use_module(library(lists)).
:- use_module(library(aggregate)).
:- use_module(library(optparse)).
```

`use_module` importa una biblioteca estándar de SWI-Prolog. Cada una aporta:

| Biblioteca | Qué provee |
|---|---|
| `http/thread_httpd` | Servidor HTTP multihilo (`http_server/2`) |
| `http/http_dispatch` | Enrutador de URLs (`http_handler/3`, `http_dispatch/1`) |
| `http/http_json` | Leer/escribir JSON (`reply_json_dict/1`, `http_read_json_dict/2`) |
| `http/http_parameters` | Leer parámetros de query string (`http_parameters/3`) |
| `http/http_cors` | Habilitar CORS (`cors_enable/0`) |
| `csv` | Leer archivos CSV (`csv_read_file/3`) |
| `lists` | Predicados de listas (`member`, `last`, `append`, etc.) |
| `aggregate` | Agregaciones eficientes (`aggregate_all/3`) |
| `optparse` | Parsear argumentos de línea de comandos (`opt_parse/4`) |

---

### 3. Predicados dinámicos

```prolog
:- dynamic log_entrada/5.
:- dynamic ip_prohibida/2.
:- dynamic ip_confiable/1.
:- dynamic rol_usuario/2.
:- dynamic horario_permitido/2.
```

`dynamic` le dice a Prolog: "estos predicados pueden ser modificados en tiempo de
ejecución con `assertz`, `retract` o `retractall`". Sin esta declaración, intentar
agregar hechos nuevos con `assertz` daría un error.

El número después de `/` es la **aridad** (cantidad de argumentos):
- `log_entrada/5` → 5 argumentos: timestamp, usuario, ip, accion, resultado
- `ip_prohibida/2` → 2 argumentos: ip, motivo
- `ip_confiable/1` → 1 argumento: ip

---

### 4. Configuración de CORS

```prolog
:- set_setting(http:cors, [*]).
```

Permite que cualquier origen (el `*` lo indica) haga peticiones HTTP a este servidor.
Necesario para que el frontend Vue (que corre en otro puerto) pueda comunicarse.

---

### 5. Inclusión de los archivos del engine

```prolog
:- include('engine/knowledge_base').
:- include('engine/rules').
:- include('engine/queries').
:- include('engine/csv_import').
:- include('engine/report').
:- include('engine/api/handlers').
:- include('engine/api/ip_lists').
```

`include` es como copiar y pegar el contenido de cada archivo aquí.
A diferencia de `use_module`, no crea módulos separados: todo queda en el mismo
espacio de nombres, lo que permite que las reglas de `rules.pl` accedan directamente
a los hechos de `knowledge_base.pl` sin ninguna importación adicional.

El **orden importa**: se incluye primero la base de conocimiento, luego las reglas
que la usan, luego las consultas que usan las reglas, y finalmente la API.

---

### 6. Función `iniciar_servidor/1`

```prolog
iniciar_servidor(Puerto) :-
    http_server(http_dispatch, [port(Puerto)]),
    format(user_error, "~n  ╔═══...═╗~n", []),
    ...
```

- `http_server/2` arranca el servidor HTTP en el puerto indicado.
  Recibe `http_dispatch` como el predicado que se encargará de enrutar
  cada petición entrante a su handler correspondiente.
- Los `format(user_error, ...)` imprimen el banner de bienvenida en la terminal
  (`user_error` es el stream de stderr).

---

### 7. Definición de opciones de línea de comandos

```prolog
opts_spec([
    [ opt(port),   type(integer), default(9090),
      shortflags([p]), longflags([port]),
      help('Puerto en el que escucha el servidor (default: 9090)') ],
    [ opt(help),   type(boolean), default(false),
      shortflags([h]), longflags([help]),
      help('Muestra esta ayuda') ]
]).
```

Define la especificación de opciones de CLI:
- `--port 8080` o `-p 8080` cambia el puerto.
- `--help` o `-h` muestra la ayuda y termina.

---

### 8. Función `main/0` — el arranque real

```prolog
main :-
    opts_spec(Spec),
    current_prolog_flag(argv, Args),
    opt_parse(Spec, Args, Opts, _),
    ( option(help(true), Opts)
    ->  opt_help(Spec, HelpText),
        format("~w~n", [HelpText]),
        halt(0)
    ;   option(port(Puerto), Opts),
        iniciar_servidor(Puerto),
        thread_get_message(stop)
    ).
```

- `current_prolog_flag(argv, Args)` obtiene los argumentos con los que se ejecutó
  el servidor (ej: `["--port", "8080"]`).
- `opt_parse/4` parsea esos argumentos según la especificación y los guarda en `Opts`.
- Si se pidió ayuda, la imprime y llama `halt(0)` (termina el proceso con código 0).
- Si no, extrae el puerto de las opciones e inicia el servidor.
- `thread_get_message(stop)` bloquea el hilo principal indefinidamente, esperando
  un mensaje `stop` que nunca llega → el servidor se queda corriendo hasta que lo
  matás con Ctrl+C.

---

### 9. `:- initialization(main, main).`

```prolog
:- initialization(main, main).
```

Le dice a SWI-Prolog: "cuando este archivo se ejecute como script principal
(no como módulo importado), llamá a `main/0` automáticamente".
El segundo `main` especifica el hook `main` (al arrancar desde línea de comandos).

---

## Cómo se ejecuta el sistema

```bash
swipl server.pl --port 9090
```

Secuencia de arranque:
1. SWI-Prolog carga `server.pl`.
2. Las directivas `:- include(...)` se ejecutan de inmediato, cargando todos los archivos.
3. Las directivas `:- dynamic ...` declaran los predicados modificables.
4. `:- initialization(main, main)` registra que hay que llamar `main` al final.
5. Prolog termina de cargar y llama `main/0`.
6. `main` parsea los argumentos CLI y llama `iniciar_servidor(9090)`.
7. El servidor queda escuchando en el puerto 9090.
