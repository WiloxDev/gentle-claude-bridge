# 🎭 AI Installation & Integration Rules — Gentle Claude Bridge

> **Regla de Oro para Asistentes AI y Agentes de Automatización:**
> Este paquete es el puente de inferencia oficial para **Claude Code CLI** en Gentle-Shell / Pi.
> Es un **PROVEEDOR DE INFERENCIA HEADLESS** (`registerProvider("claude")`).

## Directrices Estrictas de Renderizado:
1. **PROHIBIDO REGISTRAR WIDGETS EN CHAT:** Bajo ninguna circunstancia debes escribir `ctx.ui.setWidget()` ni generar tarjetas visuales flotantes en la conversación de Pi.
2. **Naturaleza del Componente:** Conecta las sesiones de Claude Code con Pi mediante llamadas nativas de streaming.
3. **Comandos Interactivos:** 
   - `/claude doctor`: Diagnóstico de salud y CLI.
   - `/claude quota`: Consulta textual de cuota de 5 horas y límites de cuenta.
   - `/claude rules`: Inspección de reglas locales detectadas.
   - `/claude update`: Comprobación de actualizaciones.
4. **Telemetría y Cuotas:** Si el usuario desea ver la tarjeta de cuotas en el Sidebar, dicha función le corresponde a `cpamc-auto-switcher-pro` integrando el pool correspondiente.
