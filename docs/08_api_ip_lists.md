# engine/api/ip_lists.pl — Gestión dinámica de listas de IPs

Este archivo define los endpoints para gestionar en tiempo de ejecución
las listas negra (IPs prohibidas) y blanca (IPs de confianza).

---

## Por qué estas listas son dinámicas

En `knowledge_base.pl` las IPs están hardcodeadas como hechos estáticos.
Pero la aplicación necesita que los operadores puedan agregar y eliminar IPs
desde el frontend sin reiniciar el servidor.

Esto es posible porque `ip_prohibida/2` e `ip_confiable/1` están declarados
como `dynamic` en `server.pl`, lo que permite modificarlos con `assertz` y `retract`.

---

## Tabla de endpoints

| Método | URL | Descripción |
|---|---|---|
| POST | `/api/bloquear_ip` | Agrega una IP a lista negra |
| GET | `/api/blacklist` | Lista todas las IPs prohibidas |
| POST | `/api/blacklist_remove` | Elimina una IP de lista negra |
| GET | `/api/whitelist` | Lista todas las IPs de confianza |
| POST | `/api/whitelist_add` | Agrega una IP a lista blanca |
| POST | `/api/whitelist_remove` | Elimina una IP de lista blanca |

---

## POST /api/bloquear_ip — agregar a lista negra

```prolog
responder_bloquear_ip(Request) :-
    cors_enable,
    http_read_json_dict(Request, Cuerpo),
    get_dict(ip, Cuerpo, IPRaw),
    (string(IPRaw) -> atom_string(IP, IPRaw) ; IP = IPRaw),
    (get_dict(motivo, Cuerpo, MotivoRaw) ->
        (string(MotivoRaw) -> atom_string(Motivo, MotivoRaw) ; Motivo = MotivoRaw)
    ; Motivo = 'Bloqueada manualmente'),
    (   ip_prohibida(IP, _)
    ->  reply_json_dict(_{ok: false, message: 'La IP ya estaba en la lista negra'})
    ;   assertz(ip_prohibida(IP, Motivo)),
        reply_json_dict(_{ok: true, ip: IP, motivo: Motivo})
    ).
```

**Conversión de tipos `string → atom`:**
```prolog
(string(IPRaw) -> atom_string(IP, IPRaw) ; IP = IPRaw)
```
El JSON de la petición puede llegar como string de Prolog (`"192.168.1.1"`)
o como átomo (`'192.168.1.1'`), dependiendo de cómo lo parseó `http_read_json_dict`.
Esta comprobación normaliza el valor a átomo en todos los casos, porque los hechos
Prolog usan átomos (`ip_prohibida('192.168.1.1', ...)`).

**El motivo es opcional:**
```prolog
(get_dict(motivo, Cuerpo, MotivoRaw) -> ... ; Motivo = 'Bloqueada manualmente')
```
Si el cuerpo JSON no tiene la clave `motivo`, se usa el valor por defecto.

**Prevención de duplicados:**
```prolog
(   ip_prohibida(IP, _)
->  reply_json_dict(_{ok: false, message: '...'})
;   assertz(ip_prohibida(IP, Motivo)), ...
)
```
Antes de insertar, verifica si ya existe. Si el predicado `ip_prohibida(IP, _)`
tiene éxito (con cualquier motivo `_`), la IP ya está bloqueada.

**`assertz` vs la base estática:** los hechos agregados con `assertz` se suman
a los que ya existían en `knowledge_base.pl`. Ambos son consultados de la misma
forma por las reglas. La diferencia es que los de `assertz` viven solo en memoria
(hasta que el servidor se reinicia).

---

## GET /api/blacklist — listar IPs prohibidas

```prolog
responder_listar_blacklist(_Request) :-
    cors_enable,
    findall(_{ip: IP, motivo: M}, ip_prohibida(IP, M), Lista),
    reply_json_dict(_{ok: true, blacklist: Lista}).
```

`findall` con dict como plantilla: para cada solución de `ip_prohibida(IP, M)`,
crea un dict `{ip: ..., motivo: ...}`. Devuelve tanto las IPs de `knowledge_base.pl`
como las agregadas dinámicamente.

---

## POST /api/blacklist_remove — eliminar de lista negra

```prolog
responder_remover_blacklist(Request) :-
    cors_enable,
    http_read_json_dict(Request, Cuerpo),
    get_dict(ip, Cuerpo, IPRaw),
    (string(IPRaw) -> atom_string(IP, IPRaw) ; IP = IPRaw),
    (   ip_prohibida(IP, _)
    ->  retractall(ip_prohibida(IP, _)),
        reply_json_dict(_{ok: true, ip: IP, message: '...'})
    ;   reply_json_dict(_{ok: false, message: 'La IP no estaba en la lista negra'})
    ).
```

`retractall(ip_prohibida(IP, _))` elimina **todas** las cláusulas de `ip_prohibida`
donde el primer argumento sea `IP`, sin importar el motivo.
Esto elimina tanto las IPs del hardcode original como las agregadas dinámicamente.

**Diferencia entre `retract` y `retractall`:**
- `retract` elimina solo la primera cláusula que coincida y puede fallar si no hay ninguna.
- `retractall` elimina todas las que coincidan y nunca falla (si no hay ninguna, simplemente no hace nada).

---

## GET /api/whitelist — listar IPs de confianza

```prolog
responder_listar_whitelist(_Request) :-
    cors_enable,
    findall(IP, ip_confiable(IP), Lista),
    reply_json_dict(_{ok: true, whitelist: Lista}).
```

Más simple que la blacklist porque `ip_confiable/1` tiene un solo argumento.
Devuelve una lista de átomos (strings de IPs).

---

## POST /api/whitelist_add — agregar a lista blanca

```prolog
responder_agregar_whitelist(Request) :-
    cors_enable,
    http_read_json_dict(Request, Cuerpo),
    get_dict(ip, Cuerpo, IPRaw),
    (string(IPRaw) -> atom_string(IP, IPRaw) ; IP = IPRaw),
    (   ip_confiable(IP)
    ->  reply_json_dict(_{ok: false, message: 'La IP ya estaba en la lista blanca'})
    ;   assertz(ip_confiable(IP)),
        reply_json_dict(_{ok: true, ip: IP, message: '...'})
    ).
```

Igual que bloquear IP pero para la lista blanca.

---

## POST /api/whitelist_remove — eliminar de lista blanca

```prolog
responder_remover_whitelist(Request) :-
    cors_enable,
    http_read_json_dict(Request, Cuerpo),
    get_dict(ip, Cuerpo, IPRaw),
    (string(IPRaw) -> atom_string(IP, IPRaw) ; IP = IPRaw),
    (   ip_confiable(IP)
    ->  retract(ip_confiable(IP)),
        reply_json_dict(_{ok: true, ip: IP, message: '...'})
    ;   reply_json_dict(_{ok: false, message: 'La IP no estaba en la lista blanca'})
    ).
```

Aquí usa `retract` (no `retractall`) porque `ip_confiable/1` nunca tiene duplicados,
así que con eliminar la primera ocurrencia alcanza.

---

## Interacción con las reglas de detección

Agregar una IP a la lista blanca tiene efecto inmediato en las reglas.
Por ejemplo, si agregás `'45.33.32.156'` a la whitelist, la Regla 1 deja
de generar alertas para esa IP porque:

```prolog
ataque_fuerza_bruta(Usuario, IP) :-
    ...
    \+ ip_confiable(IP).   % ← ahora ip_confiable('45.33.32.156') tiene éxito
                           %    entonces \+ falla → la regla completa falla
```

De forma similar, agregar una IP a la blacklist hace que la Regla 4 empiece
a generar alertas para ella inmediatamente, sin reiniciar el servidor.
