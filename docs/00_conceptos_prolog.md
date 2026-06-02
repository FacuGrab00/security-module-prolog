# Conceptos de Prolog usados en el proyecto

Este archivo explica los conceptos y predicados de Prolog que aparecen repetidamente
en el código. Sirve como glosario de referencia rápida.

---

## 1. Hechos, reglas y consultas

En Prolog hay tres tipos de cosas:

**Hecho**: algo que es verdad siempre.
```prolog
ip_confiable('192.168.0.1').
rol_usuario(admin_ti, administrador).
```

**Regla**: algo que es verdad *si* se cumplen ciertas condiciones.
```prolog
login_cuenta_servicio(Usuario) :-
    rol_usuario(Usuario, servicio),
    log_entrada(_, Usuario, _, login, exito).
```
El `:-` se lee como "si". La coma `,` entre condiciones se lee como "y".

**Consulta**: una pregunta al motor.
```prolog
?- login_cuenta_servicio(respaldo_bd).
```

---

## 2. Variables vs átomos

- Palabras que empiezan con **mayúscula** son **variables**: `Usuario`, `IP`, `T`.
- Palabras que empiezan con **minúscula** o están entre comillas son **átomos**: `admin_ti`, `'192.168.0.1'`, `login`.
- El guión bajo `_` es la variable anónima: "no me importa el valor".

---

## 3. `findall/3` — colectar todos los resultados

```prolog
findall(Plantilla, Condicion, Lista)
```

Busca **todas** las soluciones de `Condicion` y construye una `Lista` con
el valor de `Plantilla` en cada solución.

**Ejemplo real:**
```prolog
findall(_, log_entrada(_, _, _, _, fallo), ListaF),
length(ListaF, Fallos).
```
Recolecta todos los eventos con resultado `fallo` (el `_` significa "no importa
qué valor tenga cada elemento, solo queremos contar"). Luego `length` cuenta cuántos hay.

**Diferencia clave**: si no hay soluciones, `findall` devuelve lista vacía `[]`.
Nunca falla.

---

## 4. `setof/3` — como findall pero sin duplicados y ordenado

```prolog
setof(Plantilla, Condicion, Conjunto)
```

Igual que `findall` pero:
- Elimina duplicados automáticamente.
- Ordena el resultado.
- **Falla** si no hay soluciones (diferencia importante con `findall`).

**El operador `^` (existencial):**
```prolog
setof(U, T^log_entrada(T, U, IP, login, fallo), Usuarios)
```
El `T^` antes de la condición le dice a Prolog: "la variable `T` es existencial,
no la uses como clave de agrupación". En criollo: buscá todos los usuarios distintos
que hayan fallado desde esta IP, sin importar en qué timestamp.
Sin el `^`, Prolog agruparía por `T` también, generando un `setof` por cada timestamp.

---

## 5. `\+` — negación por falla

```prolog
\+ ip_confiable(IP)
```

Se lee: "es verdad que NO se puede probar `ip_confiable(IP)`".
Prolog no tiene negación lógica real. En cambio, intenta probar la condición:
si **falla**, `\+` tiene **éxito**; si **tiene éxito**, `\+` **falla**.

**Ejemplo:**
```prolog
\+ rol_usuario(Usuario, _)
```
Esto es verdad si el usuario NO tiene ningún rol en la base de hechos.

---

## 6. `assertz/1` y `retractall/1` — modificar la base en tiempo de ejecución

```prolog
assertz(log_entrada(1748185392, jgonzalez, '192.168.1.45', login, fallo)).
```
`assertz` **agrega** un hecho nuevo al final de la base de conocimiento.
`asserta` lo agrega al principio.

```prolog
retractall(log_entrada(_, _, _, _, _)).
```
`retractall` **elimina** todos los hechos que coincidan con el patrón.
Para que un predicado sea modificable en runtime, debe declararse como `dynamic`.

```prolog
:- dynamic log_entrada/5.
```

---

## 7. `length/2` — obtener o verificar el largo de una lista

```prolog
length(Lista, N)
```
Si `Lista` ya tiene elementos, `N` toma ese valor.
También puede usarse al revés: si le das `N`, genera una lista de `N` variables.

---

## 8. `member/2` — verificar o iterar membresía

```prolog
member(Elemento, Lista)
```
Tiene éxito si `Elemento` pertenece a `Lista`.
En modo iteración, genera cada elemento de la lista como solución.

---

## 9. `sort/2` y `msort/2`

```prolog
sort(ListaConDuplicados, ListaSinDuplicados)
```
`sort` elimina duplicados y ordena. `msort` ordena pero **mantiene** duplicados.

---

## 10. `aggregate_all/3` — agregaciones

```prolog
aggregate_all(max(T), log_entrada(T, _, _, _, _), TsReciente)
```
Calcula el máximo de todos los valores de `T` que satisfacen la condición.
Es más eficiente que `findall` + ordenar cuando solo necesitás un valor agregado.
También soporta `min`, `count`, `sum`, `bag` (lista), `set` (conjunto sin duplicados).

---

## 11. `once/1` — solo el primer resultado

```prolog
once(log_entrada(_, _, IP, _, _))
```
Ejecuta la condición y corta después del primer éxito. Evita duplicados cuando
hay múltiples hechos que coinciden pero solo querés verificar que al menos uno exista.

---

## 12. `atomic_list_concat/3` — unir/dividir átomos

```prolog
atomic_list_concat(Partes, '.', IP)
```
Divide el átomo `IP` usando `'.'` como separador y guarda las partes en una lista.
También funciona al revés: une una lista de partes con el separador dado.

**Ejemplo:**
```prolog
atomic_list_concat(Partes, '.', '192.168.1.45')
% Partes = ['192', '168', '1', '45']
```

---

## 13. `atom_number/2` — convertir entre átomo y número

```prolog
atom_number('1748185392', N)
% N = 1748185392  (integer)
```
Convierte un átomo que representa un número en el número real, o viceversa.

---

## 14. `format/2` y `format/3` — imprimir texto formateado

```prolog
format(Stream, "Texto ~w y ~w~n", [Valor1, Valor2])
```
`~w` es el placeholder para cualquier valor.
`~n` es salto de línea.
`user_error` es el stream de stderr (la terminal), útil para logs del servidor.

---

## 15. `catch/3` — manejo de errores

```prolog
catch(GoalPrincipal, Error, GoalDeRecuperacion)
```
Intenta ejecutar `GoalPrincipal`. Si lanza una excepción, la atrapa en `Error`
y ejecuta `GoalDeRecuperacion`. Equivalente al try/catch de otros lenguajes.

---

## 16. `->` y `;` — if/then/else

```prolog
(Condicion -> EntoncesEsto ; SiNoEsto)
```
Si `Condicion` tiene éxito, ejecuta `EntoncesEsto`. Si falla, ejecuta `SiNoEsto`.
Es el if/then/else de Prolog.

---

## 17. `maplist/3` — aplicar un predicado a toda una lista

```prolog
maplist(alerta_como_json, Alertas, AlertasJSON)
```
Aplica `alerta_como_json` a cada elemento de `Alertas` y construye `AlertasJSON`
con los resultados. Equivalente a un `.map()` funcional.

---

## 18. `forall/2` — verificar para todos los elementos

```prolog
forall(member(X, Lista), hacer_algo(X))
```
Tiene éxito si `hacer_algo(X)` es verdad para **todos** los `X` de la lista.
En el reporte se usa para imprimir cada alerta.

---

## 19. `last/2` — último elemento de una lista

```prolog
last(Lista, UltimoElemento)
```
Unifica `UltimoElemento` con el último elemento de `Lista`.

---

## 20. `abs/1` — valor absoluto

```prolog
Diferencia is abs(T2 - T1)
```
En Prolog, las expresiones aritméticas se evalúan con el operador `is`.
`abs` calcula el valor absoluto del resultado.
