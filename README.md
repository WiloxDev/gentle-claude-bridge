<p align="center">
  <img src="assets/logo.png" width="220" alt="Gentle Claude Bridge">
</p>

# Gentle Claude Bridge

[![Gentle Hub](https://img.shields.io/badge/Gentle%20Hub-Extension-F095C8?style=for-the-badge)](https://gentlemanprogramming.com/gentle-hub/)
[![Discord](https://img.shields.io/badge/Discord-Apoyo%20y%20Soporte-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://bit.ly/48zTJUo)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Pi native](https://img.shields.io/badge/Pi-native-orange?style=for-the-badge)](https://pi.dev)

Puente nativo para **Gentle Shell** y **Pi** que conecta con **Claude Code** (usando el Agent SDK y la CLI oficial de Anthropic). Te permite usar tus modelos favoritos de Claude con la **suscripción Pro o Max que ya pagas**, sin costos por token de API.

> 💬 **Comunidad y Soporte:** `wilox2` · [Servidor de Discord Oficial](https://bit.ly/48zTJUo)

Incluye de serie telemetría de cuotas para la barra de Gentle Shell, soporte de reglas locales (`.claude/rules`, `AGENTS.md`), diagnósticos con `/claude doctor` y tolerancia a fallos.

---

## 🌟 Características Destacadas

- **Sin API Keys por token:** Utiliza tu suscripción activa de Claude Pro o Max iniciada mediante `claude /login`.
- **Telemetría para Gentle Shell:** Reporta el porcentaje consumido de tu ventana móvil de 5 horas a la barra inferior de Gentle Shell y al panel `/gentle:usage`.
- **Diagnóstico instantáneo (`/claude doctor`):** Verifica en 1 segundo que tu entorno Node, ejecutable de Claude, credenciales y variables de entorno estén sanos.
- **Carga de Reglas Locales:** Respeta automáticamente los archivos `.claude/rules/*.md`, `AGENTS.md` y `CLAUDE.md` de tu proyecto.
- **Herramientas de Pi integradas:** El modelo puede leer, editar, ejecutar comandos y delegar con las herramientas nativas de Pi.
- **Empaquetado ultra rápido:** Pre-compilado con `esbuild` para arranque en cero milisegundos.

---

## 📦 Instalación

> 🤖 **Para Instalación Asistida por AI (Claude, Pi, Cursor):** Consulta estrictamente [AI_INSTALL.md](AI_INSTALL.md). Este paquete es un **Proveedor Headless**, NO debe generar widgets en chat.

### En Gentle Shell
```bash
# Vía npm (cuando esté publicado):
gentle-shell install npm:gentle-claude-bridge

# O desde una ruta local / git:
gentle-shell install /ruta/a/gentle-claude-bridge
```

### En Pi Puro
```bash
pi install npm:gentle-claude-bridge
# o local:
pi install /ruta/a/gentle-claude-bridge
```

---

## 🚀 Uso Rápido

1. **Asegúrate de haber iniciado sesión en Claude Code una vez:**
   ```bash
   claude
   # Dentro de la CLI de Claude escribe:
   /login
   ```

2. **Verifica la salud de la conexión en Gentle Shell / Pi:**
   ```text
   /claude doctor
   ```

3. **Selecciona el modelo en la terminal:**
   Escribe `/model` y escoge cualquiera de los modelos bajo el namespace `gentle-claude/`:
   - `gentle-claude/claude-opus-5` (Razonamiento profundo, 1M de contexto)
   - `gentle-claude/claude-sonnet-5-5` (Velocidad y calidad equilibrada, 1M de contexto)
   - `gentle-claude/claude-haiku-4-5` (Ultra rápido y bajo consumo de cuota)

---

## 🩺 Comandos Integrados

- `/claude doctor` — Ejecuta un chequeo completo del entorno (Node.js, credenciales, PATH y variables en conflicto).
- `/claude quota` — Muestra el porcentaje usado de la ventana de 5 horas y la hora estimada del reinicio de cuota.
- `/claude rules` — Lista las reglas locales cargadas desde `.claude/rules/` y `AGENTS.md`.

---

## ⚙️ Tolerancia a Fallos y CLIProxyAPI

Si alcanzas el límite temporal de mensajes de Claude Pro (Error 429), la extensión no se cuelga: te indica la hora exacta de restablecimiento y, si detecta **CLIProxyAPI** corriendo en `http://127.0.0.1:8317`, te ofrece conmutar sin esfuerzo.

---

## 🏷️ Temas de GitHub para Gentle Hub

Para que el robot de **Gentle Hub** catalogue esta extensión automáticamente, el repositorio de GitHub incluye los topics:
- `gentle-shell-package`
- `gentle-shell-extension`
- `pi-extension`
- `pi-package`

---

## 📄 Licencia

MIT © Wilox. Basado e inspirado en el trabajo de código abierto de `@vanillagreen/pi-claude-bridge`, `@elidickinson/pi-claude-bridge` y la comunidad de Gentle Shell.
