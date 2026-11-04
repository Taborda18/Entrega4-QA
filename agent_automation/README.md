# Entrega 4 · Modalidad C — Automation Exercises generados por agente de IA

Proyecto de automatización **independiente** del proyecto Katalon (modalidad A) y del
flujo MCP (modalidad B). Fue generado y ejecutado por un agente de IA (Claude, dentro
de un entorno de ejecución en la nube) contra la aplicación real `NovaCommerce QA Lab`
del equipo, corriendo en `http://localhost:5173` (frontend) y `http://localhost:3001`
(API), levantada con `npm run dev` a partir del repositorio entregado por el equipo
(`Entrega4-QA-main.zip`), sin modificar su código fuente.

## Diferenciación frente a la modalidad A (Katalon)

- Lenguaje y framework distintos: Python + Playwright (síncrono), en vez de Groovy +
  Katalon Studio.
- Cada ejercicio verifica el comportamiento en dos capas: interfaz web (acciones y
  textos visibles) **y** API REST subyacente (código HTTP y payload JSON), algo que los
  scripts Groovy de la modalidad A no hacen.
- Artefactos propios: script Python (`tests/agent_exercises.py`), capturas de pantalla
  en `evidence/`, y reporte de ejecución en `evidence/resultado_ejecucion.json`.
  

## Ejecución

```bash
pip install playwright requests
python -m playwright install chromium   # si el ejecutable no está preinstalado
python tests/agent_exercises.py
```

## Resultado de la última ejecución real

Ver `evidence/resultado_ejecucion.json` y las capturas en `evidence/`.
