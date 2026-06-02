# engine/csv_import.pl — Importación y validación de logs CSV

Este archivo maneja la carga de datos desde archivos CSV al motor Prolog.
Valida cada fila, reporta errores detallados, y evita duplicados.

---

## Formato CSV esperado

```
timestamp,usuario,ip,accion,resultado
1748185392,jgonzalez,192.168.1.45,login,fallo
1748185452,jgonzalez,192.168.1.45,login,exito
```

Cinco columnas obligatorias: timestamp (Unix), usuario, IP, acción y resultado.
La primera fila puede ser la cabecera (se detecta y descarta automáticamente).

---

## Valores válidos

```prolog
accion_valida(login).
accion_valida(descarga).
accion_valida(accion_admin).

resultado_valido(exito).
resultado_valido(fallo).
```

Son hechos simples que definen el vocabulario permitido.
La validación usa `\+ accion_valida(Accion)` para detectar valores no reconocidos.

---

## `importar_csv/5` — predicado principal

```prolog
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
```

**Cómo se usa:**
```prolog
?- importar_csv('logs.csv', Nuevos, Omitidos, Invalidos, Errores).
```

**Paso a paso:**

1. **Medir el estado inicial:**
   ```prolog
   findall(_, log_entrada(_,_,_,_,_), Antes), length(Antes, NAntes)
   ```
   Cuenta cuántos `log_entrada` hay *antes* de importar. Esto sirve para
   calcular cuántos registros nuevos se agregaron al final.

2. **Leer el archivo CSV:**
   ```prolog
   csv_read_file(Archivo, FilasTodas, [functor(fila), arity(5)])
   ```
   `csv_read_file` es de la biblioteca estándar `library(csv)`.
   - `functor(fila)` → cada fila se convierte en el término `fila(a, b, c, d, e)`.
   - `arity(5)` → solo acepta filas de exactamente 5 columnas.
   
   Por ejemplo, la línea `1748185392,jgonzalez,192.168.1.45,login,fallo` se convierte en:
   ```prolog
   fila('1748185392', jgonzalez, '192.168.1.45', login, fallo)
   ```

3. **Excluir cabecera y contar filas de datos:**
   ```prolog
   excluir_cabecera(FilasTodas, Filas),
   length(Filas, TotalDataFilas)
   ```

4. **Procesar fila a fila:**
   ```prolog
   procesar_filas(Filas, 2, [], ErrsRev)
   ```
   El `2` es el número de fila inicial (1 fue la cabecera). Los errores se acumulan
   en orden inverso (es más eficiente agregar al principio de la lista que al final),
   por eso luego se usa `reverse/2`.

5. **Calcular estadísticas:**
   - `Invalidos` = cantidad de errores encontrados.
   - `Nuevos` = filas en DB después - filas antes (solo cuenta lo que realmente se insertó).
   - `Omitidos` = filas de datos - nuevos - inválidos = duplicados exactos que se saltaron.

---

## `excluir_cabecera/2` — detección automática de cabecera

```prolog
excluir_cabecera([fila(TsAtom,_,_,_,_)|Resto], Resto) :-
    atom(TsAtom), \+ atom_number(TsAtom, _), !.
excluir_cabecera(Filas, Filas).
```

**Lógica:**
- Si el primer campo de la primera fila es un átomo y *no* se puede convertir a número,
  es texto (como `"timestamp"`) → es cabecera, se descarta.
- El `!` (cut) evita que Prolog pruebe la segunda cláusula si la primera tiene éxito.
- Si la primera fila empieza con un número, no hay cabecera → se devuelven todas las filas.

---

## `procesar_filas/4` — recursividad sobre la lista de filas

```prolog
procesar_filas([], _, Errores, Errores).
procesar_filas([Fila|Resto], N, AccErr, Errores) :-
    N1 is N + 1,
    (   error_en_fila(N, Fila, Error)
    ->  procesar_filas(Resto, N1, [Error|AccErr], Errores)
    ;   insertar_fila(Fila),
        procesar_filas(Resto, N1, AccErr, Errores)
    ).
```

**Este es el patrón clásico de recursividad en Prolog:**

La primera cláusula es el caso base: lista vacía → devuelve los errores acumulados.
La segunda cláusula procesa una fila y llama recursivamente con el resto.

- Si `error_en_fila` tiene éxito → la fila es inválida → agrega el error al acumulador.
- Si no → la fila es válida → llama `insertar_fila` e itera sin agregar error.

El `AccErr` es el **acumulador de errores**: empieza en `[]` y en cada paso se
le agrega un error al principio (con `[Error|AccErr]`). Al final se invierte con `reverse`.

---

## `error_en_fila/3` — validación ordenada por campo

```prolog
error_en_fila(N, fila(TsAtom,_,_,_,_),
        _{fila:N, campo:timestamp, valor:TsAtom,
          razon:'No es un entero positivo'}) :-
    \+ validar_timestamp(TsAtom), !.

error_en_fila(N, fila(_,_,IP,_,_),
        _{fila:N, campo:ip, valor:IP,
          razon:'Formato IPv4 invalido ...'}) :-
    \+ validar_ip(IP), !.

error_en_fila(N, fila(_,_,_,Accion,_), ...) :-
    \+ accion_valida(Accion), !.

error_en_fila(N, fila(_,_,_,_,Resultado), ...) :-
    \+ resultado_valido(Resultado), !.
```

**Diseño en cascada con corte (`!`):**

Las cláusulas se evalúan en orden. Cada una chequea un campo específico.
Si algún campo es inválido, tiene éxito y el `!` impide que Prolog pruebe
el resto de las cláusulas → se reporta solo el primer error encontrado.

Si ninguna cláusula tiene éxito → `error_en_fila` falla → la fila es válida.

**El formato `_{campo:valor, ...}` es un dict de SWI-Prolog:**
Una estructura de datos clave-valor nativa de SWI-Prolog, equivalente a un
objeto JSON. Se serializa directamente a JSON en las respuestas de la API.

---

## `insertar_fila/1` — conversión de tipos e inserción sin duplicados

```prolog
insertar_fila(fila(TsAtom, Usuario, IP, AccionAtom, ResultAtom)) :-
    (atom(TsAtom)    -> atom_number(TsAtom, Ts)         ; Ts       = TsAtom),
    (atom(AccionAtom)-> Accion    = AccionAtom           ; term_to_atom(Accion,    AccionAtom)),
    (atom(ResultAtom)-> Resultado = ResultAtom           ; term_to_atom(Resultado, ResultAtom)),
    (   \+ log_entrada(Ts, Usuario, IP, Accion, Resultado)
    ->  assertz(log_entrada(Ts, Usuario, IP, Accion, Resultado))
    ;   true
    ).
```

**Dos responsabilidades:**

1. **Conversión de tipos:** `csv_read_file` puede leer los campos como átomos o como
   términos Prolog dependiendo del contenido. Por eso se verifica con `atom/1` si
   es un átomo y se convierte según corresponde:
   - El timestamp viene como átomo `'1748185392'` → se convierte a entero con `atom_number`.
   - Acción y resultado ya son átomos (`login`, `fallo`) → se usan directamente.

2. **Deduplicación:** antes de insertar, verifica que el registro exacto no exista ya:
   ```prolog
   \+ log_entrada(Ts, Usuario, IP, Accion, Resultado)
   ```
   Si ya existe, ejecuta `true` (no hace nada). Si no existe, usa `assertz` para
   agregarlo al final de la base de hechos.

---

## Predicados de validación

### `validar_timestamp/1`

```prolog
validar_timestamp(Ts) :-
    integer(Ts), !, Ts > 0.
validar_timestamp(TsAtom) :-
    atom_number(TsAtom, Ts),
    integer(Ts),
    Ts > 0.
```

Acepta tanto enteros directos como átomos que representen enteros positivos.
El `!` en la primera cláusula: si ya es entero, no intenta la segunda.

### `validar_ip/1`

```prolog
validar_ip(IP) :-
    atomic_list_concat(Partes, '.', IP),
    length(Partes, 4),
    maplist(es_octeto, Partes).

es_octeto(Parte) :-
    atom_number(Parte, N),
    integer(N),
    N >= 0,
    N =< 255.
```

- Divide la IP por `.` y verifica que haya exactamente 4 partes.
- `maplist(es_octeto, Partes)` aplica `es_octeto` a cada parte.
  Si *alguna* parte falla `es_octeto`, `maplist` falla → IP inválida.
- `es_octeto` verifica que cada parte sea un entero entre 0 y 255.

---

## Wrappers de compatibilidad

```prolog
importar_csv(Archivo, Nuevos, Omitidos) :-
    importar_csv(Archivo, Nuevos, Omitidos, _, _).

importar_csv(Archivo) :-
    importar_csv(Archivo, _, _, _, _).
```

Versiones con menos argumentos que llaman al predicado principal.
Permiten usar `importar_csv('archivo.csv')` desde la consola sin tener que
capturar todos los valores de retorno.
