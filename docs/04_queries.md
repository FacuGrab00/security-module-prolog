# engine/queries.pl — Consultas de auditoría complejas

Este archivo contiene predicados de consulta de alto nivel que combinan
múltiples reglas y hechos para producir informes detallados.

---

## Consulta 1 — Usuarios activos en más de N subredes

```prolog
consulta_usuarios_red_dispersa(MinSubredes, Resultados) :-
    findall(U, log_entrada(_, U, _, _, _), UsuariosBrutos),
    sort(UsuariosBrutos, Usuarios),
    findall(U-N,
        (member(U, Usuarios),
         actividad_red_dispersa(U, N),
         N >= MinSubredes),
        Resultados).
```

**Propósito:** encontrar todos los usuarios que operaron en más de `MinSubredes`
subredes distintas en la última hora.

**Cómo se usa:**
```prolog
?- consulta_usuarios_red_dispersa(3, Resultados).
% Resultados = [jgonzalez-5, attacker-4]
```

**Paso a paso:**
1. `findall(U, log_entrada(_, U, _, _, _), UsuariosBrutos)` → recolecta todos los usuarios que aparecen en algún log (con duplicados).
2. `sort(UsuariosBrutos, Usuarios)` → elimina duplicados y ordena. Ahora `Usuarios` es la lista única de todos los usuarios que tienen actividad.
3. El segundo `findall` itera sobre cada usuario y verifica si `actividad_red_dispersa/2` (Regla 6) se activa con cantidad mayor o igual a `MinSubredes`.
4. El resultado es una lista de pares `U-N` (usuario guión cantidad de subredes).

**¿Por qué no usar directamente `findall(U-N, actividad_red_dispersa(U, N), R)`?**
Porque `actividad_red_dispersa` itera internamente sobre todos los usuarios de la base.
Al hacer el `findall` de usuarios primero y luego filtrar con `member`, el flujo
es más predecible y evita que Prolog genere infinitas combinaciones.

---

## Consulta 2 — IPs con ataque distribuido que lograron acceso

```prolog
consulta_ataques_exitosos(Resultados) :-
    findall(IP-Afectados-Comprometidos,
        (ataque_masivo_ip(IP),
         findall(U,  log_entrada(_, U, IP, login, fallo), UF),
         sort(UF, Afectados),
         findall(Ue, log_entrada(_, Ue, IP, login, exito), UE),
         sort(UE, Comprometidos),
         Comprometidos \= []),
        Resultados).
```

**Propósito:** IPs que no solo intentaron el ataque distribuido (Regla 2)
sino que también lograron al menos un login exitoso.

**Cómo se usa:**
```prolog
?- consulta_ataques_exitosos(Resultados).
% Resultados = ['45.33.32.156'-[jperez,mlopez,jgonzalez]-[admin_ti]]
```

**Estructura del resultado:** cada elemento es un triple `IP-Afectados-Comprometidos`
donde:
- `IP` es la IP atacante.
- `Afectados` = lista de usuarios que recibieron intentos fallidos desde esa IP.
- `Comprometidos` = lista de usuarios con login exitoso desde esa IP.

**La condición `Comprometidos \= []`** filtra para incluir solo las IPs que
realmente comprometieron algo (no solo las que intentaron).

**findall anidado:** el `findall` exterior itera sobre todas las IPs que pasan
la regla `ataque_masivo_ip`. Para cada una, los `findall` interiores construyen
las listas de afectados y comprometidos. Esto es válido en Prolog: un `findall`
puede contener otros `findall` en su condición.

---

## Consulta 3 — Línea de tiempo cronológica de un usuario

```prolog
historial_usuario(Usuario, Timeline) :-
    findall(T-IP-Accion-Resultado,
        log_entrada(T, Usuario, IP, Accion, Resultado),
        Pares),
    msort(Pares, Timeline).
```

**Propósito:** obtener todos los eventos de un usuario ordenados cronológicamente.

**Cómo se usa:**
```prolog
?- historial_usuario(jgonzalez, Timeline).
% Timeline = [
%   1748185392-'192.168.1.45'-login-fallo,
%   1748185452-'192.168.1.45'-login-fallo,
%   1748185512-'192.168.1.45'-login-exito
% ]
```

**Por qué `msort` y no `sort`:** `msort` ordena **manteniendo duplicados**.
Si el mismo usuario hizo dos eventos con el mismo timestamp exacto (raro pero posible),
`sort` eliminaría uno. `msort` los preserva ambos.

Los pares `T-IP-Accion-Resultado` se ordenan por el primer elemento (el timestamp `T`),
que es lo que queremos: orden cronológico.

---

## Consulta 4 — Informe completo de un usuario

```prolog
informe_usuario(Usuario, informe(Usuario, Total, Fallos, Exitos, Alertas)) :-
    findall(_, log_entrada(_, Usuario, _, _, _), Todos),
    length(Todos, Total),
    findall(_, log_entrada(_, Usuario, _, _, fallo), LF),
    length(LF, Fallos),
    findall(_, log_entrada(_, Usuario, _, _, exito), LE),
    length(LE, Exitos),
    findall(A, alertas_de_usuario(Usuario, A), Alertas).
```

**Propósito:** genera un resumen completo de un usuario: estadísticas + alertas activas.

**Cómo se usa:**
```prolog
?- informe_usuario(jgonzalez, Informe).
% Informe = informe(jgonzalez, 8, 5, 3, [alerta(ataque_fuerza_bruta, '45.33.32.156')])
```

**El término `informe(...)`:** en Prolog, un término como `informe(a, b, c)` es
una estructura de datos. El nombre `informe` es el **functor** y los argumentos
son los datos. No es una llamada a función; es solo un contenedor nombrado,
equivalente a un objeto o struct en otros lenguajes.

**El `findall(_, ..., Lista)` con `_`:** cuando solo queremos *contar* y no importa
el valor, usamos `_` como plantilla. El resultado es una lista del mismo largo
que las soluciones, pero con `_` en cada posición. Luego `length` cuenta los elementos.

---

## `alertas_de_usuario/2` — recolector de alertas individuales

```prolog
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
```

**Propósito:** un predicado con múltiples cláusulas que, por backtracking, genera
todas las alertas activas para un usuario dado.

**Cómo funciona el backtracking aquí:**
Cuando Prolog evalúa `findall(A, alertas_de_usuario(Usuario, A), Alertas)`,
primero intenta la primera cláusula (`ataque_fuerza_bruta`). Si tiene éxito, guarda
el resultado. Luego hace backtracking y prueba la segunda cláusula. Y así sucesivamente
con las 7 cláusulas. El resultado es una lista con todas las alertas que se activaron.

**La estructura `alerta(Tipo, Detalle)`** es un término Prolog: un contenedor que
agrupa el tipo de alerta con su dato relevante (IP, timestamp, etc.).

**Nota:** este predicado no cubre *todas* las 13 reglas, solo las que tienen sentido
filtrar "por usuario" (las que reciben `Usuario` como argumento). Las que detectan
por IP (como `acceso_ip_prohibida`) o las globales (como `ataque_masivo_ip`) se
consultan por separado en `handlers.pl`.
