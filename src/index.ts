import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { PROVIDER_ID, PROVIDER_LABEL, PROVIDER_API } from "./types.js";
import { CLAUDE_MODELS } from "./models.js";
import { createClaudeStream } from "./provider.js";
import { runDoctorDiagnosis, formatDoctorReport } from "./doctor.js";
import { loadQuotaMetrics, getGentleShellUsageModel } from "./quota-tracker.js";
import { terminateAllActiveSessions } from "./session-lifecycle.js";
import { loadProjectRules } from "./rules-loader.js";
import { checkClaudeUpdates } from "./updater.js";

export default function activate(api: ExtensionAPI): void {
  // 1. Registro del proveedor en Pi / Gentle Shell
  api.registerProvider(PROVIDER_ID, {
    name: PROVIDER_LABEL,
    api: PROVIDER_API,
    models: CLAUDE_MODELS,
    streamSimple: createClaudeStream
  });

  // 2. Registro del comando /claude doctor
  api.registerCommand("claude", {
    description: "Comandos de diagnóstico y cuota para Gentle Claude Bridge (/claude doctor, /claude quota)",
    handler: async (args: string, ctx: ExtensionContext) => {
      const sub = args.trim().toLowerCase();

      if (sub === "doctor") {
        const report = runDoctorDiagnosis();
        const text = formatDoctorReport(report);
        ctx.ui?.notify(text, report.allPassed ? "info" : "warning");
        return;
      }

      if (sub === "quota") {
        const q = loadQuotaMetrics();
        const resetStr = q.primaryWindow5h.resetAt ? new Date(q.primaryWindow5h.resetAt).toLocaleTimeString() : "N/A";
        const info = `📊 Cuota Claude Pro/Max: ${q.primaryWindow5h.usedPercent}% consumido (Tokens: ${q.primaryWindow5h.tokensUsed || 0} / ${q.primaryWindow5h.tokensLimit || 200000})\n⏰ Reinicio de ventana 5h: ${resetStr}`;
        ctx.ui?.notify(info, "info");
        return;
      }

      if (sub === "rules") {
        const rules = loadProjectRules();
        if (rules.length === 0) {
          ctx.ui?.notify("No se encontraron reglas locales (.claude/rules, AGENTS.md, CLAUDE.md).", "info");
        } else {
          const list = rules.map(r => `• ${r.name} (${r.content.length} caracteres)`).join("\n");
          ctx.ui?.notify(`📋 Reglas locales detectadas:\n${list}`, "info");
        }
        return;
      }

      if (sub === "update" || sub === "upgrade") {
        ctx.ui?.notify("🔍 Comprobando actualizaciones de Claude Code y Bridge...", "info");
        try {
          const status = await checkClaudeUpdates("1.0.2");
          const lines: string[] = [];
          lines.push("📦 ESTADO DE ACTUALIZACIONES:");
          lines.push(`• Claude Code CLI: ${status.installedClaudeVersion || "no detectado"} ➔ Última oficial ${status.latestClaudeNpmVersion || "indisponible"}`);
          lines.push(`• Bridge Extensión: Versión 1.0.2 ${status.bridgeUpdateAvailable ? `(Disponible v${status.latestBridgeVersion})` : "(Al día)"}`);
          ctx.ui?.notify(lines.join("\n"), "info");

          if (status.claudeUpdateAvailable) {
            ctx.ui?.notify(
              `💡 Para actualizar Claude Code sin perder tu sesión OAuth, ejecuta:\n` +
              `npm install -g @anthropic-ai/claude-code@latest`,
              "info"
            );
          } else {
            ctx.ui?.notify("✓ Claude Code CLI está en su versión más reciente.", "info");
          }
        } catch (err: any) {
          ctx.ui?.notify(`✗ Error al comprobar actualizaciones: ${err?.message || err}`, "error");
        }
        return;
      }

      ctx.ui?.notify("Uso: /claude doctor | /claude quota | /claude rules | /claude update", "info");
    }
  });

  // 3. Telemetría nativa para la barra de estado de Gentle Shell
  if ((api as any).registerUsageSource) {
    try {
      (api as any).registerUsageSource(PROVIDER_ID, () => getGentleShellUsageModel());
    } catch {
      // Degrada silenciosamente si la versión del host no expone la API de uso
    }
  }

  // 4. Limpieza garantizada al cerrar la sesión de Pi
  api.on("session_shutdown", () => {
    terminateAllActiveSessions();
  });
}
