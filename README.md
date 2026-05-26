# SecureAudit — Módulo Lógico de Ciberseguridad

**Taller 2 — Representación del Conocimiento**  
Ingeniería en Sistemas de Información · Inteligencia Artificial 2026  
Universidad Nacional del Chaco Austral (UNCAUS)

---

## Descripción

Sistema de auditoría de seguridad basado en **lógica de primer orden**. El motor de inferencia está implementado en **SWI-Prolog** (`security_engine.pl`) y se expone como una API HTTP/JSON directamente desde Prolog, sin ningún backend adicional. La interfaz visual está construida con **Vue 3 + TypeScript + Tailwind CSS**.

## Requisitos

| Herramienta | Versión mínima | Notas |
|---|---|---|
| [SWI-Prolog](https://www.swi-prolog.org/Download.html) | 8.x o superior | Motor lógico + servidor HTTP |
| [Node.js](https://nodejs.org/) | 18.x o superior | Para la interfaz Vue |
| npm | 9.x o superior | Incluido con Node.js |

---

## Instalación

```bash
# 1. Instalar dependencias de la interfaz
npm install
```

> El motor Prolog (`security_engine.pl`) no requiere instalación adicional.

---

## Cómo levantar el proyecto

### Terminal 1 — Motor Prolog (puerto 8080)

```bash
swipl security_engine.pl
```

Para detenerlo: `Ctrl + C`

### Terminal 2 — Interfaz Vue (puerto 5173)

```bash
npm run dev
```

Abrí el navegador en **http://localhost:5173**