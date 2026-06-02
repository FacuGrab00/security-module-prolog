# engine/knowledge_base.pl — Base de conocimiento estática

Este archivo contiene los **hechos** que el motor usa como verdades del sistema:
qué IPs son peligrosas, cuáles son de confianza, qué rol tiene cada usuario,
y en qué horario se permite trabajar.

---

## ¿Qué es un hecho en Prolog?

Un hecho es una afirmación que Prolog considera verdadera sin necesidad de prueba.
```prolog
ip_confiable('192.168.0.1').
```
Esto le dice al motor: "la IP 192.168.0.1 es confiable, punto".

---

## 1. Declaraciones `dynamic`

```prolog
:- dynamic ip_prohibida/2.
:- dynamic ip_confiable/1.
```

Aunque los hechos iniciales están hardcodeados aquí, se declaran como `dynamic`
porque la API permite agregar y eliminar IPs en tiempo de ejecución
(desde el frontend, sin reiniciar el servidor).

Sin `dynamic`, Prolog rechazaría cualquier intento de modificarlos.

---

## 2. IPs prohibidas (lista negra)

```prolog
ip_prohibida('45.33.32.156',   'Escaneo masivo de puertos detectado').
ip_prohibida('23.129.64.200',  'IP de origen anonimo no rastreable').
ip_prohibida('185.107.47.215', 'Equipo comprometido usado para ataques').
ip_prohibida('91.108.56.179',  'Ataque dirigido de origen desconocido').
ip_prohibida('104.244.79.6',   'Conexion via proxy anonimo').
ip_prohibida('0.0.0.0',        'Direccion IP no valida').
```

**Predicado:** `ip_prohibida(IP, Motivo)`

Almacena dos datos: la dirección IP y el motivo por el que está bloqueada.
Las reglas de detección consultan este predicado para saber si una IP es peligrosa.

**Cómo se consulta:**
```prolog
?- ip_prohibida('45.33.32.156', Motivo).
% Motivo = 'Escaneo masivo de puertos detectado'
```

**Cómo se agrega dinámicamente** (desde `ip_lists.pl`):
```prolog
assertz(ip_prohibida('1.2.3.4', 'Bloqueada manualmente'))
```

---

## 3. IPs de confianza (lista blanca)

```prolog
ip_confiable('192.168.0.1').
ip_confiable('192.168.0.254').
ip_confiable('10.10.0.1').
ip_confiable('10.10.0.2').
ip_confiable('127.0.0.1').
```

**Predicado:** `ip_confiable(IP)`

Las IPs en esta lista están **exentas de alertas**. Muchas reglas de detección
usan `\+ ip_confiable(IP)` para excluirlas. Esto tiene sentido porque las IPs
internas de la red corporativa (192.168.x.x, 10.x.x.x) y el loopback (127.0.0.1)
no deberían generar falsas alarmas.

**Ejemplo de uso en una regla:**
```prolog
ataque_fuerza_bruta(Usuario, IP) :-
    ...
    \+ ip_confiable(IP).   % solo alerta si NO es confiable
```

---

## 4. Roles de usuarios

```prolog
rol_usuario(admin_ti,     administrador).
rol_usuario(director_sis, administrador).
rol_usuario(root,         administrador).
rol_usuario(respaldo_bd,  servicio).
rol_usuario(monitor_red,  servicio).
rol_usuario(scanner,      servicio).
rol_usuario(jperez,       usuario_normal).
rol_usuario(mlopez,       usuario_normal).
...
```

**Predicado:** `rol_usuario(Usuario, Rol)`

Define tres categorías de rol:

| Rol | Descripción | Reglas que lo usan |
|---|---|---|
| `administrador` | Tiene acceso privilegiado, debe respetar horario | `acceso_horario_irregular` |
| `servicio` | Cuentas automáticas que nunca deberían hacer login interactivo | `login_cuenta_servicio` |
| `usuario_normal` | No debería ejecutar acciones administrativas | `intento_escalada` |

**Consulta de ejemplo:**
```prolog
?- rol_usuario(admin_ti, Rol).
% Rol = administrador
```

**Detección de usuarios sin rol** (Regla 12):
```prolog
\+ rol_usuario(Usuario, _)
% Verdadero si el usuario NO aparece en ninguna cláusula rol_usuario
```

---

## 5. Horario laboral permitido

```prolog
horario_permitido(8, 20).
```

**Predicado:** `horario_permitido(HoraInicio, HoraFin)`

Define que el horario laboral válido es de las 8:00 a las 20:00 (hora del día, formato 24h).
La Regla 3 (`acceso_horario_irregular`) usa esto para detectar administradores
que se conectan fuera de este rango.

**Cómo se usa en la regla:**
```prolog
horario_permitido(Inicio, Fin),
(Hora < Inicio ; Hora >= Fin).
```
El `;` es "o": si la hora es menor a 8 **o** mayor o igual a 20, es irregular.

---

## Relación con los logs

Los logs de actividad (`log_entrada/5`) **no** están en este archivo.
Se cargan dinámicamente desde CSVs usando `csv_import.pl`.
La estructura de un log es:

```prolog
log_entrada(Timestamp, Usuario, IP, Accion, Resultado).
% Ejemplo:
log_entrada(1748185392, jgonzalez, '192.168.1.45', login, fallo).
```

| Campo | Tipo | Valores posibles |
|---|---|---|
| Timestamp | entero Unix | cualquier entero positivo |
| Usuario | átomo | cualquier nombre |
| IP | átomo | formato x.x.x.x |
| Accion | átomo | `login`, `descarga`, `accion_admin` |
| Resultado | átomo | `exito`, `fallo` |
