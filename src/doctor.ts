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
      versionStr = execSync(`"${claudeBin}" --version`, { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
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
      details: "No encontrado en PATH ni en ubicaciones estándar (Windows/Mac/Linux)",
      suggestion: "Instala Claude Code globalmente con 'npm install -g @anthropic-ai/claude-code' o define pathToClaudeExecutable en configuración."
    });
  }

  // 3. Verificación de sesión OAuth activa (~/.claude.json)
  const claudeConfigPath = join(homedir(), ".claude.json");
  if (existsSync(claudeConfigPath)) {
    try {
      const raw = readFileSync(claudeConfigPath, "utf-8");
      const parsed = JSON.parse(raw);
      const hasAuth = !!(parsed.oauthToken || parsed.primaryApiKey || parsed.token || parsed.userID);
      checks.push({
        title: "Sesión OAuth / Credenciales de Claude Code",
        ok: hasAuth,
        details: hasAuth ? "Credenciales locales activas encontradas" : "Archivo .claude.json sin tokens activos",
        suggestion: hasAuth ? undefined : "Ejecuta 'claude login' en tu terminal para autenticar tu cuenta Pro/Max."
      });
    } catch {
      checks.push({
        title: "Sesión OAuth de Claude Code",
        ok: false,
        details: "Archivo .claude.json corrupto o ilegible",
        suggestion: "Ejecuta 'claude login' para restaurar tu sesión."
      });
    }
  } else {
    checks.push({
      title: "Sesión OAuth de Claude Code",
      ok: false,
      details: "No se encontró ~/.claude.json",
      suggestion: "Ejecuta 'claude login' en tu terminal para iniciar sesión con tu cuenta de Anthropic."
    });
  }

  // 4. Verificación de Fallback CPAMC (Opcional)
  const fallbackUrl = config.cliproxyapiFallbackUrl;
  checks.push({
    title: "Fallback de Seguridad (CPAMC)",
    ok: true,
    details: `Configurado hacia ${fallbackUrl}`
  });

  // 5. Estado de Cuota (Ventana 5 Horas)
  const quota = loadQuotaMetrics();
  const resetAt = quota.primaryWindow5h.resetAt || (Date.now() + 5 * 3600 * 1000);
  const resetsInHours = Math.max(0, (resetAt - Date.now()) / (1000 * 3600));
  const tokensUsed = quota.primaryWindow5h.tokensUsed || 0;
  checks.push({
    title: "Monitor de Cuota de 5 Horas",
    ok: true,
    details: `${tokensUsed.toLocaleString()} tokens consumidos (${quota.primaryWindow5h.usedPercent.toFixed(1)}% de cuota, restablece en ~${resetsInHours.toFixed(1)}h)`
  });

  const allPassed = checks.filter(c => c.title !== "Fallback de Seguridad (CPAMC)").every(c => c.ok);

  return {
    timestamp: Date.now(),
    checks,
    allPassed
  };
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines: string[] = [];
  lines.push("\n🩺 DIAGNÓSTICO GENTLE CLAUDE BRIDGE");
  lines.push("========================================");

  for (const c of report.checks) {
    const icon = c.ok ? "✓" : "✗";
    lines.push(`${icon} ${c.title}: ${c.details}`);
    if (c.suggestion) {
      lines.push(`   💡 Sugerencia: ${c.suggestion}`);
    }
  }

  lines.push("========================================");
  lines.push(report.allPassed 
    ? "🎉 Todo en orden. Tu puente a Claude Code está listo para operar." 
    : "⚠️ Se detectaron advertencias. Revisa las sugerencias arriba para solucionarlas."
  );

  return lines.join("\n");
}
