# Archivos CSV de ejemplo

Todos los timestamps corresponden al **26 de mayo de 2026 (UTC)**.  
El horario laboral definido en el motor es **08:00 – 20:00 UTC**.

---

## Formato del CSV

```
timestamp,usuario,ip,accion,resultado
```

| Campo | Valores posibles |
|---|---|
| `timestamp` | Unix timestamp (segundos) |
| `usuario` | cualquier string (los roles están definidos en el `.pl`) |
| `ip` | dirección IPv4 |
| `accion` | `login`, `descarga`, `accion_admin` |
| `resultado` | `exito`, `fallo` |

---

## Archivos disponibles

### `01_trafico_normal.csv`
Tráfico limpio sin anomalías. Útil para verificar que el motor **no genera alertas falsas**.  
Usuarios conocidos, IPs internas, dentro del horario laboral.

---

### `02_fuerza_bruta.csv`
**Reglas activadas: R01, R09**

- `jgonzalez` recibe 6 intentos fallidos desde `203.0.113.45` → luego logra acceso exitoso.
- `mperez` recibe 5 intentos fallidos desde `198.51.100.20` → luego logra acceso exitoso.
- Activa **R01** (ataque_fuerza_bruta) y **R09** (acceso_tras_intentos / bypass).

---

### `03_ataque_distribuido.csv`
**Regla activada: R02**

- La IP `198.51.100.7` intenta login con 6 usuarios distintos (`admin_ti`, `jgonzalez`, `mperez`, `lrodriguez`, `cgarcia`, `director_sis`), todos fallan.
- Activa **R02** (ataque_masivo_ip: misma IP, 3+ usuarios distintos).

---

### `04_admin_fuera_horario.csv`
**Regla activada: R03**

- `admin_ti` hace login exitoso a las **02:00 UTC** (fuera del horario 08–20).
- `director_sis` hace login exitoso a las **22:00 UTC**.
- `root` hace login exitoso a las **23:00 UTC**.
- También hay un login normal de `admin_ti` a las **10:00 UTC** (dentro del horario, no genera alerta).

---

### `05_ip_prohibida.csv`
**Reglas activadas: R04, R10**

Accesos desde IPs en la lista negra del motor:
| IP | Motivo |
|---|---|
| `45.33.32.156` | Scanner Nmap/Shodan |
| `23.129.64.200` | Nodo Tor |
| `91.108.56.179` | APT campaign RU — *login exitoso → también activa R10* |
| `185.107.47.215` | Botnet Mirai |
| `104.244.79.6` | Proxy anónimo — *login exitoso → también activa R10* |

---

### `06_cuenta_servicio.csv`
**Regla activada: R05**

- `respaldo_bd` y `monitor_red` realizan logins interactivos exitosos.
- Estas cuentas tienen rol `servicio` en el motor → nunca deberían hacer login interactivo.

---

### `07_exfiltracion_datos.csv`
**Regla activada: R08**

- `jgonzalez` realiza **12 descargas exitosas** en menos de 15 minutos desde la misma IP.
- Activa **R08** (descarga_masiva: 10+ descargas del mismo usuario).

---

### `08_sesion_simultanea.csv`
**Regla activada: R13**

- `jgonzalez` hace login desde `192.168.1.45` y a los **150 segundos** hace login desde `203.0.113.99` (dos IPs distintas, ambas no confiables).
- `mperez` hace lo mismo desde `198.51.100.30` y `203.0.113.50` con **60 segundos** de diferencia.
- Activa **R13** (sesion_simultanea: mismo usuario, dos IPs distintas en ≤ 300 segundos).

---

### `09_escenario_completo.csv`
**Reglas activadas: R01, R02, R03, R04, R05, R08, R09, R10, R12, R13**

Combina todos los ataques anteriores en un solo CSV. Ideal para probar el dashboard completo con múltiples alertas de distintas severidades. Incluye:

- Admin fuera de horario (02:00 UTC)
- Fuerza bruta de `jgonzalez` con bypass exitoso
- Ataque distribuido desde `198.51.100.7`
- Accesos desde IPs prohibidas (`45.33.32.156`, `91.108.56.179`)
- Login de cuentas de servicio (`respaldo_bd`, `monitor_red`)
- Sesión simultánea de `lrodriguez`
- Exfiltración masiva por `mperez` (11 descargas)
- Admins fuera de horario (22:00 y 23:00 UTC)
- Usuario desconocido `intruso1` con 3 intentos fallidos

---

## Usuarios y roles predefinidos en el motor

| Usuario | Rol |
|---|---|
| `admin_ti` | administrador |
| `director_sis` | administrador |
| `root` | administrador |
| `respaldo_bd` | servicio |
| `monitor_red` | servicio |
| cualquier otro | *(sin rol → puede activar R12 si tiene intentos fallidos)* |

## IPs en lista negra (predefinidas)

| IP | Motivo |
|---|---|
| `45.33.32.156` | Scanner Nmap/Shodan |
| `23.129.64.200` | Nodo Tor |
| `185.107.47.215` | Botnet Mirai |
| `91.108.56.179` | APT campaign RU |
| `104.244.79.6` | Proxy anónimo |
| `0.0.0.0` | Dirección reservada |

## IPs en lista blanca (nunca generan alerta)

`192.168.0.1`, `192.168.0.254`, `10.10.0.1`, `10.10.0.2`, `127.0.0.1`
