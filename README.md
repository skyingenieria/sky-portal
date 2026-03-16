# SKY Ingeniería — Portal IA

Portal interno de automatización para ingeniería estructural.

## Estructura del proyecto

```
sky-portal/
├── index.html                  # Shell HTML (~26KB) — layout + panels
├── css/
│   └── portal.css              # Todos los estilos (~20KB)
└── js/
    ├── core.js                 # Auth Google, openAgent(), estado global (~4KB)
    ├── agent-cype.js           # Agente CYPE → GSheets (~13KB)
    ├── agent-onboarding.js     # Agente Onboarding de Proyecto (~24KB)
    └── agent-presupuestos.js   # Agente Presupuestos + Honorarios (~14KB)
```

## Por qué esta estructura

Cada archivo tiene una responsabilidad única. Cuando necesitás modificar un agente,
solo tocás su archivo — Claude procesa ~14KB en vez de ~100KB, consumiendo ~7x menos tokens.

| Archivo | Cuándo editarlo |
|---|---|
| `index.html` | Agregar paneles HTML, cambiar el layout, nueva tarjeta de agente |
| `css/portal.css` | Cambios visuales, nuevo tema, ajustes de componentes |
| `js/core.js` | Auth Google, agregar scope, router openAgent() |
| `js/agent-cype.js` | Lógica CYPE → GSheets |
| `js/agent-onboarding.js` | Lógica Onboarding (Drive, Clockify, Asana, Slack) |
| `js/agent-presupuestos.js` | Cálculo de honorarios, generador de presupuestos |

## Agentes disponibles

| Agente | Estado | Descripción |
|---|---|---|
| CYPE → GSheets | Live | Lee PDF de CYPECAD, vuelca metraje a Sheets |
| Onboarding | Live | Crea carpeta Drive, proyecto Clockify/Asana, canal Slack |
| Presupuestos | Live | Calcula honorarios por pack, genera Doc desde template |
| Control de Avance | Pronto | — |
| Revisión de Docs | Pronto | — |
| Resumen Reuniones | Pronto | — |

## Setup

1. Configurar OAuth 2.0 en Google Cloud Console
   - Habilitar: Drive API, Sheets API, Docs API
   - Tipo: Aplicación web
   - Origen autorizado: https://skyingenieria.github.io
2. Reemplazar YOUR_GOOGLE_CLIENT_ID en js/core.js
3. Las API keys (Clockify, Asana, Slack) se ingresan en el panel y quedan en localStorage

## Deploy

GitHub Pages → rama main → directorio raíz /
URL: https://skyingenieria.github.io/sky-portal
