import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { resolveClaudeBinary, loadConfig } from "./config.js";
import { loadQuotaMetrics } from "./quota-tracker.js";
import type { DoctorCheck, DoctorReport } from "./types.js";

export function runDoctorDiagnosis(): DoctorReport {
  const checks: DoctorCheck[] = [];
  const config = loadConfig();

  // 1. Verificación de Node.js
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1).split(".")[0], 10);
  if (major >= 22) {
    checks.push({
      title: "Versión de Node.js",
      ok: true,
      details: `${nodeVersion} (Cumple con Node >= 22)`
    });
  } else {
    checks.push({
      title: "Versión de Node.js",
      ok: false,
      details: `${nodeVersion} es inferior a Node 22`,
      suggestion: "Se recomienda actualizar Node a v22 o superior para compatibilidad con Agent SDK."
    });
  }

  // 2. Verificación de ejecutable de Claude Code
  const claudeBin = resolveClaudeBinary(config.pathToClaudeExecutable);
  if (claudeBin) {
    let versionStr = "Detectado";
    try {
      versionStr = execSync(`"${claudeBin}" --version 2>/dev/null`, { encoding: "utf-8" }).trim();
    } catch {
      // Ignorar si flag falla
    }
    checks.push({
      title: "Ejecutable de Claude Code",
      ok: true,
      details: `${claudeBin} (${versionStr})`
    });
  } else {
    checks.push({
      title: "Ejecutable de Claude Code",
      ok: false,
      details: "No se encontró el binario 'claude' en PATH",
      suggestion: "Instala Claude Code globalmente con 'npm install -g @anthropic-ai/claude-code'."
    });
  }

  // 3. Verificación de sesión de Claude (Login)
  const claudeConfigPath = join(homedir(), ".claude.json");
  if (existsSync(claudeConfigPath)) {
    try {
      const raw = readFileSync(claudeConfigPath, "utf-8");
      const hasAuth = raw.includes("oauthAccount") || raw.includes("sessionToken") || raw.includes("primaryApiKey");
      if (hasAuth) {
        checks.push({
          title: "Sesión de Claude Pro/Max",
          ok: true,
          details: "Credenciales activas encontradas en ~/.claude.json"
        });
      } else {
        checks.push({
          title: "Sesión de Claude Pro/Max",
          ok: false,
          details: "No se detectó sesión iniciada",
          suggestion: "Ejecuta 'claude' en tu terminal y escribe '/login' para autenticar tu suscripción."
        });
      }
    } catch {
      checks.push({
        title: "Sesión de Claude",
        ok: false,
        details: "Error al leer ~/.claude.json",
        suggestion: "Verifica permisos en tu directorio personal."
      });
    }
  } else {
    checks.push({
      title: "Sesión de Claude",
      ok: false,
      details: "No existe el archivo de configuración ~/.claude.json",
      suggestion: "Ejecuta 'claude' y luego '/login' para iniciar sesión."
    });
  }

  // 4. Verificación de colisión de variables de entorno
  const conflictingVars = ["ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN"].filter(
    v => process.env[v] !== undefined && process.env[v] !== ""
  );

  if (conflictingVars.length > 0) {
    checks.push({
      title: "Variables de entorno ANTHROPIC_*",
      ok: false,
      details: `Variables activas: ${conflictingVars.join(", ")}`,
      suggestion: "Estas variables sobreescriben tu suscripción de Claude Pro. Si experimentas errores de saldo, haz 'unset' de estas variables."
    });
  } else {
    checks.push({
      title: "Variables de entorno ANTHROPIC_*",
      ok: true,
      details: "Sin colisiones detectadas (utilizará tu suscripción Pro/Max nativa)"
    });
  }

  // 5. Estado de la Cuota
  const q = loadQuotaMetrics();
  const resetDate = q.primaryWindow5h.resetAt ? new Date(q.primaryWindow5h.resetAt).toLocaleTimeString() : "N/A";
  checks.push({
    title: "Cuota de Ventana 5h",
    ok: !q.limitReached,
    details: `${q.primaryWindow5h.usedPercent}% consumido (Se reinicia: ${resetDate})`,
    suggestion: q.limitReached ? "Has alcanzado el límite temporal de Anthropic. Espera al reinicio." : undefined
  });

  const allPassed = checks.every(c => c.ok);
  return {
    timestamp: Date.now(),
    checks,
    allPassed
  };
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines: string[] = [];
  lines.push("\n🩺 DIAGNÓSTICO DE GENTLE CLAUDE BRIDGE");
  lines.push("========================================");

  for (const c of report.checks) {
    const icon = c.ok ? "✓" : "✗";
    lines.push(`${icon} ${c.title}: ${c.details}`);
    if (c.suggestion) {
      lines.push(`   💡 Sugerencia: ${c.suggestion}`);
    }
  }

  lines.push("========================================");
  lines.push(report.allPassed ? "🎉 Todo en orden. Tu entorno está listo para usar Claude." : "⚠️ Se detectaron detalles que requieren tu atención.");
  return lines.join("\n");
}
