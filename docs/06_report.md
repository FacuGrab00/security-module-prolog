# engine/report.pl — Generación de reporte de texto

Este archivo genera un reporte en texto plano con todas las alertas activas
y estadísticas generales, y lo escribe en un archivo de salida.

---

## `exportar_reporte/1` — predicado principal

```prolog
exportar_reporte(ArchivoSalida) :-
    open(ArchivoSalida, write, Stream),
    get_time(Ahora),
    format_time(atom(Fecha), '%Y-%m-%d %H:%M:%S', Ahora),
    ...
    close(Stream),
    format(user_error, "  [Reporte] generado en: ~w~n", [ArchivoSalida]).
```

**Cómo se usa:**
```prolog
?- exportar_reporte('reporte.txt').
```

**Apertura del archivo:**
```prolog
open(ArchivoSalida, write, Stream)
```
`open/3` abre un archivo en modo `write` (crear/sobrescribir) y devuelve un
`Stream` (handle de archivo). Todos los `format(Stream, ...)` escriben en ese stream.
Al final `close(Stream)` lo cierra y guarda los cambios.

**Fecha actual:**
```prolog
get_time(Ahora),
format_time(atom(Fecha), '%Y-%m-%d %H:%M:%S', Ahora)
```
`get_time` obtiene el timestamp Unix actual.
`format_time` lo formatea como string legible. El `atom(Fecha)` significa
"guardá el resultado como átomo en la variable Fecha".

---

## Sección de resumen estadístico

```prolog
findall(_, log_entrada(_, _, _, _, _),    Todos),   length(Todos,    Total),
findall(_, log_entrada(_, _, _, _, fallo), ListaF), length(ListaF,   Fallos),
findall(_, log_entrada(_, _, _, _, exito), ListaE), length(ListaE,   Exitos),
```

Tres `findall` independientes que cuentan:
- `Total` = todos los eventos.
- `Fallos` = eventos con resultado `fallo`.
- `Exitos` = eventos con resultado `exito`.

Luego se imprimen con `format(Stream, "texto", [variables])`.

---

## Patrón de impresión de alertas

Cada sección de alertas sigue el mismo patrón:

```prolog
findall(U-IP, ataque_fuerza_bruta(U, IP), FB),
(FB \= [] ->
    (format(Stream, "[CRITICO] Ataques de fuerza bruta:~n", []),
     forall(member(U-IP, FB),
            format(Stream, "  Usuario: ~w   IP: ~w~n", [U, IP])))
; true),
```

1. **Recolectar resultados:** `findall` ejecuta la regla de detección y recolecta
   todos los pares (usuario, IP) que la activaron.

2. **Verificar si hay algo para mostrar:** `FB \= []` es verdad si la lista no está vacía.
   Si está vacía, el `; true` hace que la condición if/then/else tenga éxito sin imprimir nada.

3. **Imprimir cada resultado:** `forall(member(U-IP, FB), format(...))` itera sobre
   cada elemento de la lista e imprime una línea por cada uno.

**El operador `-` en `U-IP`:** en Prolog, `U-IP` es el término `-(U, IP)`, una forma
conveniente de agrupar dos valores como un par. `findall(U-IP, ..., Lista)` crea
una lista de estos pares. `member(U-IP, Lista)` desestructura cada par en sus componentes.

---

## Secciones del reporte

El reporte tiene tres secciones de severidad:

**ALERTAS CRÍTICAS:**
- `ataque_fuerza_bruta(U, IP)` → pares usuario+IP
- `acceso_ip_prohibida(IP, M)` → pares IP+motivo
- `ataque_masivo_ip(IP)` → solo IP
- `sesion_simultanea(U)` → solo usuario

**ALERTAS ALTA SEVERIDAD:**
- `acceso_horario_irregular(U, T)` → usuario+timestamp
- `acceso_tras_intentos(U, IP)` → usuario+IP

**ALERTAS MEDIA/BAJA SEVERIDAD:**
- `usuario_desconocido(U, IP)` → usuario+IP

**Nota:** el reporte de texto no incluye *todas* las reglas, solo las más relevantes
para una vista ejecutiva. La API `/api/alerts` devuelve las 13.

---

## Cómo lo usa la API

En `handlers.pl`, el endpoint `POST /api/report` llama `exportar_reporte` sobre un
archivo temporal, lee su contenido como string, y lo devuelve en el JSON de respuesta:

```prolog
tmp_file_stream(text, Temp, TmpStream), close(TmpStream),
exportar_reporte(Temp),
read_file_to_string(Temp, Contenido, [encoding(utf8)]),
delete_file(Temp),
reply_json_dict(_{ok: true, content: Contenido})
```

El frontend recibe el texto del reporte y permite descargarlo o mostrarlo en pantalla.
