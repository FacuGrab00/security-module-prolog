# Documentación del Motor de Auditoría de Seguridad

Esta carpeta explica el funcionamiento completo del motor Prolog del proyecto.
Está escrita para alguien con conocimiento básico de Prolog.

## Índice de archivos

| Archivo | Qué explica |
|---|---|
| [00_conceptos_prolog.md](00_conceptos_prolog.md) | Conceptos clave de Prolog usados en el proyecto |
| [01_server.md](01_server.md) | `server.pl` — punto de entrada, arranque del servidor HTTP |
| [02_knowledge_base.md](02_knowledge_base.md) | `engine/knowledge_base.pl` — hechos estáticos del sistema |
| [03_rules.md](03_rules.md) | `engine/rules.pl` — las 13 reglas de detección de amenazas |
| [04_queries.md](04_queries.md) | `engine/queries.pl` — consultas complejas de auditoría |
| [05_csv_import.md](05_csv_import.md) | `engine/csv_import.pl` — importación y validación de logs CSV |
| [06_report.md](06_report.md) | `engine/report.pl` — generación de reporte de texto |
| [07_api_handlers.md](07_api_handlers.md) | `engine/api/handlers.pl` — endpoints HTTP principales |
| [08_api_ip_lists.md](08_api_ip_lists.md) | `engine/api/ip_lists.pl` — endpoints para gestionar listas de IPs |

## Flujo general del sistema

```
CSV de logs
    │
    ▼
csv_import.pl ──► assertz(log_entrada(...))
                          │
                          ▼
              knowledge_base.pl (IPs, roles, horario)
                          │
                          ▼
                    rules.pl (13 reglas)
                          │
                          ▼
               queries.pl (consultas)   report.pl (reporte)
                          │
                          ▼
            api/handlers.pl + api/ip_lists.pl
                          │
                          ▼
                   Respuestas JSON al frontend Vue
```

## Cómo leer esta documentación

Empieza por `00_conceptos_prolog.md` si hay funciones de Prolog que no reconocés.
Después seguí el orden numérico: la base de conocimiento antes que las reglas,
las reglas antes que las consultas, y la API al final.
