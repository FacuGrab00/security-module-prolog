# engine/rules.pl — Las 13 reglas de detección

Este es el corazón del motor. Contiene las reglas que detectan comportamiento
anómalo analizando los logs (`log_entrada/5`) junto con la base de conocimiento.

---

## Cómo leer una regla

Una regla en Prolog tiene la forma:
```
nombre_regla(Arg1, Arg2) :-
    condicion1,
    condicion2,
    condicion3.
```

Prolog evalúa de izquierda a derecha y de arriba a abajo. Si alguna condición
falla, la regla completa falla. Si todas tienen éxito, la regla tiene éxito.

---

## Regla 1 — Ataque de fuerza bruta

```prolog
ataque_fuerza_bruta(Usuario, IP) :-
    setof(T, log_entrada(T, Usuario, IP, login, fallo), Tiempos),
    length(Tiempos, N),
    N >= 5,
    \+ ip_confiable(IP).
```

**Detecta:** 5 o más intentos fallidos de login desde la misma IP al mismo usuario.

**Paso a paso:**
1. `setof(T, log_entrada(T, Usuario, IP, login, fallo), Tiempos)` → recolecta todos los timestamps `T` de logins fallidos del par (Usuario, IP). `setof` falla si no hay ninguno, lo que hace fallar la regla completa (correcto: si no hay intentos, no hay ataque).
2. `length(Tiempos, N)` → cuenta cuántos timestamps hay.
3. `N >= 5` → verifica que sean 5 o más.
4. `\+ ip_confiable(IP)` → verifica que la IP no sea de confianza (las IPs internas no deben generar esta alerta).

**Ejemplo que la activa:**
```
1748185392, jgonzalez, 45.33.32.156, login, fallo   ← 1
1748185452, jgonzalez, 45.33.32.156, login, fallo   ← 2
1748185512, jgonzalez, 45.33.32.156, login, fallo   ← 3
1748185572, jgonzalez, 45.33.32.156, login, fallo   ← 4
1748185632, jgonzalez, 45.33.32.156, login, fallo   ← 5  ✓ se activa
```

**Severidad:** crítica

---

## Regla 2 — Ataque distribuido de fuerza bruta

```prolog
ataque_masivo_ip(IP) :-
    setof(U, T^log_entrada(T, U, IP, login, fallo), Usuarios),
    length(Usuarios, N),
    N >= 3,
    \+ ip_confiable(IP).
```

**Detecta:** una misma IP que intenta login con 3 o más usuarios distintos.

**Diferencia con la Regla 1:** la 1 ataca a un usuario con muchos intentos;
esta ataca a muchos usuarios (password spraying o enumeración de cuentas).

**El operador `^` (existencial):**
```prolog
setof(U, T^log_entrada(T, U, IP, login, fallo), Usuarios)
```
Sin el `T^`, Prolog usaría `T` como parte de la clave de agrupación y generaría
un conjunto diferente por cada timestamp. Con `T^`, le decimos "la variable T
es interna a la condición, no la uses para agrupar". Resultado: un solo conjunto
con todos los usuarios únicos que fallaron desde esa IP.

**Severidad:** crítica

---

## Regla 3 — Acceso fuera del horario laboral por administrador

```prolog
acceso_horario_irregular(Usuario, Timestamp) :-
    rol_usuario(Usuario, administrador),
    log_entrada(Timestamp, Usuario, _, login, exito),
    extraer_hora_dia(Timestamp, Hora),
    horario_permitido(Inicio, Fin),
    (Hora < Inicio ; Hora >= Fin).
```

**Detecta:** un administrador que hace login exitoso fuera de su horario permitido (8–20h).

**Paso a paso:**
1. Verifica que el usuario sea administrador.
2. Busca un login exitoso y obtiene su timestamp.
3. `extraer_hora_dia(Timestamp, Hora)` → convierte el timestamp Unix a hora del día (0–23).
4. Obtiene el rango horario permitido.
5. `(Hora < Inicio ; Hora >= Fin)` → alerta si está fuera del rango (el `;` es "o").

**¿Por qué `_` en la IP?** La regla no necesita la IP, así que usa `_` (variable anónima).

**Severidad:** alta

---

## Regla 4 — Acceso desde IP prohibida

```prolog
acceso_ip_prohibida(IP, Motivo) :-
    ip_prohibida(IP, Motivo),
    \+ ip_confiable(IP),
    once(log_entrada(_, _, IP, _, _)).
```

**Detecta:** actividad (cualquier evento) desde una IP en lista negra.

**Por qué `once/1`:** sin `once`, si hay 5 eventos desde esa IP, la regla generaría
5 alertas idénticas. `once` corta después del primer match: confirma que hubo
actividad sin duplicar la alerta.

**¿Por qué verificar `\+ ip_confiable(IP)` si la IP está en lista negra?**
Protección ante inconsistencias: si alguien agrega la misma IP a ambas listas,
la lista blanca tiene precedencia.

**Severidad:** crítica

---

## Regla 5 — Login interactivo de cuenta de servicio

```prolog
login_cuenta_servicio(Usuario) :-
    rol_usuario(Usuario, servicio),
    log_entrada(_, Usuario, _, login, exito).
```

**Detecta:** cuentas de tipo `servicio` (respaldo_bd, monitor_red, scanner) que
realizan logins exitosos. Estas cuentas son automáticas y nunca deberían tener
sesiones interactivas. Si lo hacen, puede indicar que sus credenciales fueron
robadas y usadas por un atacante.

**La regla es simple:** solo necesita dos condiciones. No hay umbrales numéricos
porque *cualquier* login exitoso de una cuenta de servicio es sospechoso.

**Severidad:** alta

---

## Regla 6 — Actividad en múltiples subredes en la última hora

```prolog
actividad_red_dispersa(Usuario, CantSubredes) :-
    aggregate_all(max(T0), log_entrada(T0, _, _, _, _), TsReciente),
    VentanaDesde is TsReciente - 3600,
    setof(U, T1^IP1^A1^R1^(log_entrada(T1, U, IP1, A1, R1), T1 >= VentanaDesde), Candidatos),
    member(Usuario, Candidatos),
    findall(Subred,
        (log_entrada(T, Usuario, IP, _, _),
         T >= VentanaDesde,
         extraer_subred(IP, Subred)),
        Subredes),
    sort(Subredes, SubredesUnicas),
    length(SubredesUnicas, CantSubredes),
    CantSubredes > 3.
```

**Detecta:** un usuario que en la última hora tuvo actividad desde más de 3 subredes distintas.
Indica movimiento lateral en la red (un atacante que se mueve de máquina en máquina).

**Paso a paso:**
1. `aggregate_all(max(T0), ..., TsReciente)` → obtiene el timestamp más reciente de todos los logs. Esto define el "ahora" relativo.
2. `VentanaDesde is TsReciente - 3600` → calcula el inicio de la ventana de 1 hora.
3. El `setof` con múltiples `^` recolecta todos los usuarios que tuvieron actividad en esa ventana.
4. `member(Usuario, Candidatos)` → itera sobre cada usuario candidato.
5. `findall(Subred, ...)` → recolecta todas las subredes desde las que el usuario operó.
6. `extraer_subred(IP, Subred)` → extrae los primeros dos octetos de la IP (ej: `192.168` de `192.168.1.45`).
7. `sort(Subredes, SubredesUnicas)` → elimina duplicados.
8. Verifica que el total sea mayor a 3.

**Severidad:** alta

---

## Regla 7 — Intento de escalada de privilegios

```prolog
intento_escalada(Usuario) :-
    rol_usuario(Usuario, usuario_normal),
    log_entrada(_, Usuario, _, accion_admin, _).
```

**Detecta:** un usuario con rol `usuario_normal` que ejecuta `accion_admin`.
Esta acción está reservada para administradores. Si un usuario normal la intenta,
puede ser que encontró una vulnerabilidad o está probando sus límites.

**Nota:** el resultado (éxito o fallo) no importa — el intento en sí ya es sospechoso.

**Severidad:** alta

---

## Regla 8 — Posible exfiltración de datos

```prolog
descarga_masiva(Usuario) :-
    setof(T, IP^log_entrada(T, Usuario, IP, descarga, exito), Ts),
    length(Ts, N),
    N >= 10.
```

**Detecta:** 10 o más descargas exitosas del mismo usuario.

El `IP^` antes de la condición hace que la IP sea variable existencial: cuenta
descargas de cualquier IP, no solo de una. Esto captura a un usuario que
descarga desde múltiples máquinas (aún más sospechoso).

**Severidad:** alta

---

## Regla 9 — Login exitoso tras múltiples fallos (bypass)

```prolog
acceso_tras_intentos(Usuario, IP) :-
    setof(T, log_entrada(T, Usuario, IP, login, fallo), TsFallos),
    length(TsFallos, N), N >= 3,
    findall(Te, log_entrada(Te, Usuario, IP, login, exito), TsExito),
    TsExito \= [],
    last(TsFallos, UltimoFallo),
    last(TsExito, UltimoExito),
    UltimoExito > UltimoFallo.
```

**Detecta:** el patrón "fallo × N → éxito posterior". Indica que el ataque
de fuerza bruta eventualmente funcionó.

**Condición temporal clave:**
```prolog
UltimoExito > UltimoFallo
```
El último éxito debe ser *posterior* al último fallo. Esto evita falsos positivos
donde primero hubo éxito y después alguien olvidó la contraseña.

**Por qué usa `findall` para los éxitos pero `setof` para los fallos:**
`setof` falla si no hay ningún fallo, lo que hace fallar la regla (correcto).
`findall` devuelve `[]` si no hay éxitos, y luego se verifica `TsExito \= []`.

**Severidad:** alta

---

## Regla 10 — Origen geográfico sospechoso

```prolog
origen_sospechoso(Usuario, IP) :-
    log_entrada(_, Usuario, IP, login, exito),
    ip_prohibida(IP, _).
```

**Detecta:** un login exitoso desde una IP que está en lista negra.

Es una simplificación: en producción real se integraría con una base de datos
GeoIP para detectar países de riesgo, pero aquí se asume que una IP prohibida
implica origen sospechoso.

**Diferencia con la Regla 4:** la 4 detecta cualquier actividad desde IP prohibida;
esta detecta específicamente un login *exitoso* (la cuenta fue comprometida).

**Severidad:** media

---

## Regla 11 — Acceso en horario atípico para ese usuario

```prolog
horario_atipico(Usuario, Timestamp) :-
    log_entrada(Timestamp, Usuario, _, login, exito),
    extraer_hora_dia(Timestamp, HoraActual),
    findall(H,
        (log_entrada(T2, Usuario, _, login, exito),
         T2 \= Timestamp,
         extraer_hora_dia(T2, H)),
        HistorialHoras),
    HistorialHoras \= [],
    \+ member(HoraActual, HistorialHoras).
```

**Detecta:** un login en una hora que ese usuario nunca usó antes.

**La lógica de negación por falla:**
1. Obtiene la hora del login actual.
2. Recolecta el historial de todas las horas en que ese usuario se logueó (excluyendo el evento actual con `T2 \= Timestamp`).
3. `HistorialHoras \= []` → necesita historial previo para comparar (sin historial no hay patrón).
4. `\+ member(HoraActual, HistorialHoras)` → la hora actual NO está en el historial.

**Limitación:** trabaja con hora exacta (0–23). Si alguien siempre entra a las 9:00 y
hoy entra a las 9:15, la hora es la misma (9) y no detecta nada.

**Severidad:** media

---

## Regla 12 — Usuario no registrado en el sistema

```prolog
usuario_desconocido(Usuario, IP) :-
    setof(_, T^log_entrada(T, Usuario, IP, login, fallo), _),
    \+ rol_usuario(Usuario, _).
```

**Detecta:** intentos de login fallidos de usuarios que no existen en el sistema.

**La negación por falla como núcleo:**
```prolog
\+ rol_usuario(Usuario, _)
```
Si el usuario no tiene ninguna cláusula `rol_usuario` en la base de hechos,
esta negación tiene éxito → el usuario es desconocido.

**¿Por qué solo fallos?** Los éxitos de usuarios desconocidos serían imposibles
en un sistema real (no podés autenticar lo que no existe). Aquí se reportan
los intentos fallidos como señal de enumeración de usuarios.

**Severidad:** baja

---

## Regla 13 — Sesión simultánea desde dos IPs distintas

```prolog
sesion_simultanea(Usuario) :-
    log_entrada(T1, Usuario, IP1, login, exito),
    log_entrada(T2, Usuario, IP2, login, exito),
    IP1 \= IP2,
    \+ ip_confiable(IP1),
    \+ ip_confiable(IP2),
    Diferencia is abs(T2 - T1),
    Diferencia =< 300.
```

**Detecta:** el mismo usuario con logins exitosos desde dos IPs diferentes
dentro de una ventana de 5 minutos (300 segundos).

**Lógica:**
1. Busca dos eventos de login exitoso del mismo usuario.
2. Verifica que las IPs sean distintas (`IP1 \= IP2`).
3. Excluye IPs de confianza (no alarmar por logins desde la red interna + VPN).
4. `abs(T2 - T1) =< 300` → la diferencia temporal es de 5 minutos o menos.

**Truco con `abs`:** al usar valor absoluto no importa el orden en que Prolog
encuentre los dos eventos. Sin `abs`, si T1 > T2 el resultado sería negativo
y la comparación fallaría aunque fueran simultáneos.

**Severidad:** crítica

---

## Predicados auxiliares

### `extraer_hora_dia/2`

```prolog
extraer_hora_dia(Timestamp, Hora) :-
    Hora is (Timestamp // 3600) mod 24.
```

Convierte un timestamp Unix (segundos desde 1970-01-01 00:00:00 UTC) a hora del día.

- `//` es división entera: `Timestamp // 3600` da los segundos convertidos a horas totales.
- `mod 24` extrae solo la hora del día (0–23).

**Ejemplo:** timestamp `1748185392`
```
1748185392 // 3600 = 485607 horas totales
485607 mod 24 = 15   → las 15:00 hs
```

---

### `extraer_subred/2`

```prolog
extraer_subred(IP, Subred) :-
    atomic_list_concat(Partes, '.', IP),
    Partes = [A, B | _],
    atomic_list_concat([A, B], '.', Subred).
```

Extrae los primeros dos octetos de una IP (identifica la subred /16).

- `atomic_list_concat(Partes, '.', IP)` divide `'192.168.1.45'` en `['192', '168', '1', '45']`.
- `Partes = [A, B | _]` unifica `A='192'`, `B='168'`, `_=['1','45']`.
- `atomic_list_concat([A, B], '.', Subred)` construye `'192.168'`.

---

### `severidad_alerta/2`

```prolog
severidad_alerta(ataque_fuerza_bruta,      critica).
severidad_alerta(ataque_masivo_ip,         critica).
severidad_alerta(acceso_ip_prohibida,      critica).
severidad_alerta(sesion_simultanea,        critica).
severidad_alerta(acceso_tras_intentos,     alta).
...
severidad_alerta(usuario_desconocido,      baja).
```

Una tabla de hechos que asocia cada tipo de alerta con su nivel de severidad.
No es una regla con lógica, solo datos de configuración consultables con:
```prolog
?- severidad_alerta(ataque_fuerza_bruta, Sev).
% Sev = critica
```

Esta tabla es usada en el frontend para colorear las alertas, pero en el motor
Prolog la severidad está hardcodeada directamente en los handlers de la API
(ver `handlers.pl`).
