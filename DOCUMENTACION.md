# SecureAudit — Documentación del Proyecto

> **Taller 2 — Representación del Conocimiento**  
> Ingeniería en Sistemas de Información · Inteligencia Artificial 2026  
> Universidad Nacional del Chaco Austral (UNCAUS)

---

## ¿Qué es este proyecto?

**SecureAudit** es un sistema de auditoría de seguridad basado en **lógica de primer orden**. Analiza logs de acceso de un sistema para detectar comportamientos anómalos o maliciosos.

El proyecto tiene dos partes que trabajan juntas:

| Parte | Tecnología | Rol |
|---|---|---|
| Motor de inferencia | SWI-Prolog (`security_engine.pl`) | Analiza los datos con reglas lógicas y expone una API HTTP |
| Interfaz visual | Vue 3 + TypeScript + Tailwind CSS | Muestra los resultados y permite al usuario interactuar |

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────────┐
│  Usuario sube un CSV con logs de acceso                     │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND — Vue 3 (http://localhost:5173)                   │
│  • Dashboard, Logs, Reglas, Consultas, Reporte              │
│  • Pinia store (security.ts) llama a /api/*                 │
└───────────────────┬─────────────────────────────────────────┘
                    │ proxy /api → puerto 8080
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  MOTOR PROLOG — SWI-Prolog (http://localhost:8080)          │
│  • Carga el CSV como hechos dinámicos (log_entrada/5)       │
│  • Evalúa 13 reglas de detección                            │
│  • Responde en JSON                                         │
└─────────────────────────────────────────────────────────────┘
```

> El proxy de Vite redirige automáticamente todas las llamadas a `/api/*` desde el frontend al servidor Prolog. El puerto se configura en el archivo `.env` con la variable `PROLOG_PORT` (por defecto `8080`).

---

## Requisitos

| Herramienta | Versión mínima |
|---|---|
| [SWI-Prolog](https://www.swi-prolog.org/Download.html) | 8.x |
| [Node.js](https://nodejs.org/) | 18.x |
| npm | 9.x |

---

## Instalación y arranque

### 1. Instalar dependencias del frontend
```bash
npm install
```

### 2. Configurar el puerto (opcional)
El archivo `.env` define el puerto del motor Prolog. Por defecto es `8080`:
```env
PROLOG_PORT=8080
```
> Cambiar este valor actualiza tanto el servidor Prolog como el proxy de Vite.

### 3. Levantar el motor Prolog (Terminal 1)
```bash
swipl server.pl
```
Cuando inicia correctamente muestra:
```
╔════════════════════════════════════════╗
║   MOTOR DE AUDITORÍA PROLOG — ACTIVO   ║
║   http://localhost:8080               ║
╚════════════════════════════════════════╝
```
Para detenerlo: `Ctrl + C`

### 4. Levantar el frontend (Terminal 2)
```bash
npm run dev
```
Abrí el navegador en **http://localhost:5173**

---

## Flujo de uso paso a paso

```
1. Abrir la app  →  2. Cargar CSV  →  3. Ver alertas  →  4. Tomar acciones  →  5. Generar reporte
```

### Paso 1 — El Dashboard se conecta al motor
Al cargar el Dashboard, el frontend llama automáticamente a `/api/stats`, `/api/alerts` y `/api/logs`. Si el motor Prolog no está corriendo, el indicador de estado aparece en rojo.

### Paso 2 — Subir un archivo CSV
En el panel lateral del Dashboard hay un componente **CSVUploader**. Se arrastra o selecciona un archivo CSV con los logs de acceso. El frontend envía el contenido vía `POST /api/load_csv_data` y el motor Prolog lo procesa.

**Formato del CSV:**
```csv
timestamp,usuario,ip,accion,resultado
1748185392,jgonzalez,192.168.1.45,login,fallo
1748185450,admin_ti,10.0.0.5,login,exito
1748185900,jgonzalez,192.168.1.45,login,fallo
```

Cada fila se convierte en un hecho Prolog de la forma:
```prolog
log_entrada(1748185392, jgonzalez, '192.168.1.45', login, fallo).
```

### Paso 3 — Visualizar alertas y logs
Una vez cargado el CSV, el motor evalúa sus 13 reglas. Los resultados se muestran en:
- **Panel de Alertas** — tarjetas con severidad (Crítica / Alta / Media / Baja) y el fragmento de código Prolog que la disparó.
- **Vista Logs** — tabla paginada con todos los eventos, filtrable por usuario, IP, resultado o rol. Muestra el hecho Prolog equivalente de cada fila.

### Paso 4 — Tomar acciones
Desde el panel de alertas se pueden realizar acciones:
- **Bloquear IP** — abre un modal, el sistema hace `POST /api/bloquear_ip` y la IP se agrega a la lista negra dinámicamente en Prolog con `assertz/1`. Las alertas de esa IP pasan a estado "resuelto".
- **Notificar usuario** — abre un modal de notificación (acción registrada localmente en el store).

### Paso 5 — Ejecutar consultas y generar reportes
- **Vista Consultas** — ejecuta las 4 consultas de auditoría complejas contra el motor o escribe una consulta libre.
- **Vista Reporte** — genera un reporte de texto completo vía `POST /api/report` y permite descargarlo como `.txt`.

---

## Estructura de archivos

```
security-module-prolog/
│
├── security_engine.pl        ← Motor Prolog (toda la lógica + API HTTP)
├── .env                      ← PROLOG_PORT=8080
├── .env.example
│
├── src/
│   ├── main.ts               ← Punto de entrada Vue, monta la app
│   ├── App.vue               ← Componente raíz, incluye el sidebar
│   ├── style.css             ← Estilos globales + Tailwind
│   │
│   ├── router/
│   │   └── index.ts          ← 5 rutas: /, /logs, /queries, /rules, /report
│   │
│   ├── stores/
│   │   └── security.ts       ← Store Pinia: toda la comunicación con la API Prolog
│   │
│   ├── types/
│   │   └── index.ts          ← Interfaces TypeScript: LogEntry, SecurityAlert, etc.
│   │
│   ├── mock/
│   │   └── data.ts           ← Definiciones estáticas de reglas y queries (NO son datos de negocio)
│   │
│   ├── views/
│   │   ├── DashboardView.vue ← Panel principal con stats, alertas y carga de CSV
│   │   ├── LogsView.vue      ← Tabla paginada de todos los eventos
│   │   ├── QueriesView.vue   ← 4 queries de auditoría + terminal libre
│   │   ├── RulesView.vue     ← Visualización de las 13 reglas con contador de activaciones
│   │   └── ReportView.vue    ← Generación y descarga del reporte
│   │
│   └── components/
│       ├── layout/
│       │   ├── AppHeader.vue      ← Encabezado de cada vista
│       │   └── AppSidebar.vue     ← Menú lateral de navegación + indicador de estado Prolog
│       ├── dashboard/
│       │   ├── StatsCards.vue     ← 4 tarjetas con métricas clave
│       │   ├── AlertsPanel.vue    ← Lista de alertas activas
│       │   ├── BlockedIPsPanel.vue← Lista de IPs bloqueadas
│       │   └── CSVUploader.vue    ← Drag & drop para subir CSV
│       ├── actions/
│       │   ├── BlockIPModal.vue   ← Modal para bloquear una IP
│       │   └── NotifyUserModal.vue← Modal para notificar a un usuario
│       └── shared/
│           ├── RoleBadge.vue      ← Badge de rol de usuario
│           ├── SeverityBadge.vue  ← Badge de severidad de alerta
│           └── StatusBadge.vue    ← Badge de estado de alerta
│
├── vite.config.ts            ← Proxy /api → motor Prolog
├── tailwind.config.js
├── package.json
└── tsconfig.json
```

---

## El motor Prolog (`security_engine.pl`)

El archivo está organizado en 8 secciones:

### Sección 1 — Base de conocimiento
Define los hechos iniciales del sistema:
- **IPs prohibidas** (lista negra): 6 IPs con motivo (scanners, nodos Tor, botnets, APTs, proxies).
- **IPs de confianza** (lista blanca): 5 IPs internas que son excluidas de las reglas.
- **Roles de usuario**: `admin_ti`, `director_sis`, `root` (administrador); `respaldo_bd`, `monitor_red` (servicio).
- **Horario laboral**: 08:00 a 20:00 hs.
- **Logs de acceso**: dinámicos, se cargan desde CSV con `log_entrada/5`.

### Sección 2 — Reglas de detección (13 reglas)

| ID | Predicado | Descripción | Severidad |
|---|---|---|---|
| R01 | `ataque_fuerza_bruta/2` | 5+ intentos fallidos de login desde la misma IP al mismo usuario | 🔴 Crítica |
| R02 | `ataque_masivo_ip/1` | Una IP intenta login con 3+ usuarios distintos | 🔴 Crítica |
| R03 | `acceso_horario_irregular/2` | Admin hace login exitoso fuera del horario laboral | 🟠 Alta |
| R04 | `acceso_ip_prohibida/2` | Acceso registrado desde una IP en lista negra | 🔴 Crítica |
| R05 | `login_cuenta_servicio/1` | Cuenta de servicio realiza login interactivo | 🟠 Alta |
| R06 | `actividad_red_dispersa/2` | Usuario activo en más de 3 subredes en la última hora | 🟠 Alta |
| R07 | `intento_escalada/1` | Usuario normal ejecuta una acción reservada para admins | 🟠 Alta |
| R08 | `descarga_masiva/1` | 10+ descargas exitosas del mismo usuario (posible exfiltración) | 🟠 Alta |
| R09 | `acceso_tras_intentos/2` | Login exitoso DESPUÉS de 3+ fallos desde la misma IP | 🟠 Alta |
| R10 | `origen_sospechoso/2` | Login exitoso desde una IP en lista negra | 🟡 Media |
| R11 | `horario_atipico/2` | Login en una hora en la que el usuario nunca había accedido | 🟡 Media |
| R12 | `usuario_desconocido/2` | Usuario sin rol definido en el sistema intentó acceder | 🔵 Baja |
| R13 | `sesion_simultanea/1` | Mismo usuario con logins desde dos IPs distintas en menos de 300 segundos | 🔴 Crítica |

### Sección 3 — Predicados auxiliares
- `extraer_hora_dia/2` — convierte timestamp Unix a hora del día (0–23).
- `extraer_subred/2` — extrae los primeros dos octetos de una IP (`192.168` de `192.168.1.45`).
- `severidad_alerta/2` — tabla que mapea cada tipo de anomalía a su severidad.

### Sección 4 — Consultas de auditoría complejas

| ID | Consulta | Qué hace |
|---|---|---|
| Q1 | `consulta_usuarios_red_dispersa/2` | Lista usuarios activos en más de N subredes distintas |
| Q2 | `consulta_ataques_exitosos/1` | IPs con ataque distribuido que además lograron al menos un acceso exitoso |
| Q3 | `informe_usuario/2` | Informe completo de un usuario: totales, fallos, éxitos y alertas activas |
| Q4 | `historial_usuario/2` | Línea de tiempo cronológica de todos los eventos de un usuario |

### Sección 5 — Importación de CSV
- `importar_csv/1` — lee el archivo, limpia la base de hechos anterior con `retractall`, y carga cada fila con `assertz`.
- Ignora automáticamente la fila de cabecera.

### Sección 6 — Generación de reporte de texto
`exportar_reporte/1` escribe un archivo `.txt` con:
- Resumen de eventos (total, exitosos, fallidos).
- Alertas críticas: fuerza bruta, IPs prohibidas, ataques masivos, sesiones simultáneas.
- Alertas de alta severidad: acceso fuera de horario, bypass de fuerza bruta.
- Alertas de media/baja severidad: usuarios no registrados.

### Sección 7 — API HTTP/JSON

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/load_csv_data` | Carga logs desde el contenido de un CSV (string en JSON) |
| `POST` | `/api/load_csv` | Carga logs desde una ruta de archivo en el servidor |
| `GET` | `/api/stats` | Estadísticas: total de eventos, fallos, éxitos, usuarios únicos |
| `GET` | `/api/alerts` | Lista de todas las alertas activas con severidad y tipo |
| `GET` | `/api/logs` | Todos los `log_entrada/5` cargados en memoria |
| `GET` | `/api/timeline?user=X` | Línea de tiempo cronológica de un usuario |
| `GET` | `/api/query?type=X` | Ejecuta una consulta compleja (`multiples_subredes`, `ips_comprometidas`, `resumen`) |
| `POST` | `/api/report` | Genera el reporte de auditoría en texto y lo devuelve en el body |
| `POST` | `/api/bloquear_ip` | Agrega una IP a la lista negra dinámicamente con `assertz/1` |

### Sección 8 — Punto de entrada
El servidor arranca en el puerto `9090` (en el código) o el definido en `.env` como `PROLOG_PORT`. Al iniciar ejecuta `iniciar_servidor/1` y luego espera con `thread_get_message(stop)` para mantener el proceso vivo.

---

## Store Pinia (`security.ts`)

Es el único punto de comunicación entre el frontend y el motor Prolog.

**Estado:**
- `logs` — array de `LogEntry` (transformados desde el formato Prolog a formato UI)
- `alerts` — array de `SecurityAlert` (mapeados de español a inglés, con descripciones en español)
- `blockedIPs` — array de `BlockedIP` (manejado localmente + enviado al motor)
- `prologOnline` — booleano que indica si el motor responde
- `prologStats` — estadísticas crudas devueltas por `/api/stats`

**Acciones principales:**
- `fetchAll()` — trae stats, alertas y logs en paralelo.
- `importCSV(content)` — envía el CSV al motor y refresca todo.
- `generateReport()` — solicita el reporte al motor y retorna el texto.
- `runQuery(type, params)` — ejecuta una consulta de auditoría.
- `blockIP(ip, reason, blockedBy)` — bloquea una IP y resuelve sus alertas.

**Mapeo de datos Prolog → UI:**
```
severidad "critica"  →  'critical'
severidad "alta"     →  'high'
severidad "media"    →  'medium'
severidad "baja"     →  'low'

resultado "exito"    →  'success'
resultado "fallo"    →  'failure'
```

---

## Vistas del frontend

### `/` — Dashboard
Vista principal. Al montarse llama a `fetchAll()`. Contiene:
- **StatsCards** — 4 métricas: total de eventos, alertas críticas, IPs bloqueadas, tasa de éxito.
- **AlertsPanel** — lista de alertas activas con botones "Bloquear IP" y "Notificar usuario".
- **CSVUploader** — uploader drag & drop.
- **BlockedIPsPanel** — lista de IPs bloqueadas.

### `/logs` — Logs de Acceso
Tabla paginada (10 por página) con todos los eventos. Permite filtrar por texto libre, resultado (éxito/fallo) y rol. Cada fila muestra el hecho Prolog equivalente en formato `log('ts', user, 'ip', resultado, accion).`.

### `/queries` — Consultas de Auditoría
Muestra las 4 consultas complejas definidas en `mock/data.ts` con su código Prolog. Cada una tiene un botón **Ejecutar** que llama al motor real vía `/api/query`. También incluye una **Terminal libre** para escribir consultas ad-hoc.

### `/rules` — Base de Conocimiento
Muestra las 13 reglas con su código Prolog. Calcula dinámicamente cuántas veces fue activada cada regla cruzando el nombre del predicado con las alertas del store. Las reglas activas se resaltan con un badge amarillo.

### `/report` — Generación de Reporte
Al montarse llama automáticamente a `POST /api/report`. Muestra el reporte en pantalla y permite descargarlo como archivo `.txt` con el nombre `reporte_seguridad_YYYY-MM-DD.txt`.

---

## Consideraciones de la implementación

- **Las IPs bloqueadas con `/api/bloquear_ip` son temporales** — se pierden al reiniciar el motor Prolog porque `assertz/1` solo escribe en memoria. Para persistirlas habría que escribirlas en el archivo `.pl`.
- **El campo `country` en los logs es estático** — el motor Prolog no tiene GeoIP real; todos los logs llegan como `AR` desde el mapeo del store.
- **La "consulta libre" en el frontend es simulada** — no es un intérprete Prolog real; detecta palabras clave y las redirige a los endpoints conocidos.
- **Los datos de `mock/data.ts` son solo documentación** — las definiciones de reglas y queries son estáticas para mostrarse en la UI; los datos reales (logs, alertas, stats) siempre vienen del motor Prolog vía API.
