import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getAgentConfigDir } from "./config.js";
import { PROVIDER_ID, type QuotaMetrics } from "./types.js";

const QUOTA_FILE = "gentle-claude-quota.json";
const WINDOW_5H_SECONDS = 5 * 3600;

function getQuotaFilePath(): string {
  return join(getAgentConfigDir(), QUOTA_FILE);
}

export function loadQuotaMetrics(): QuotaMetrics {
  const filePath = getQuotaFilePath();
  const now = Date.now();

  const fallback: QuotaMetrics = {
    primaryWindow5h: {
      label: "Ventana 5h Claude Pro/Max",
      usedPercent: 0,
      windowSeconds: WINDOW_5H_SECONDS,
      resetAt: now + (WINDOW_5H_SECONDS * 1000),
      tokensUsed: 0,
      tokensLimit: 200_000
    },
    limitReached: false,
    lastUpdated: now
  };

  if (!existsSync(filePath)) {
    return fallback;
  }

  try {
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    
    // Si la ventana ya expiró, reseteamos el porcentaje consumido
    if (data.primaryWindow5h?.resetAt && now > data.primaryWindow5h.resetAt) {
      data.primaryWindow5h.usedPercent = 0;
      data.primaryWindow5h.tokensUsed = 0;
      data.primaryWindow5h.resetAt = now + (WINDOW_5H_SECONDS * 1000);
      data.limitReached = false;
    }
    return data;
  } catch {
    return fallback;
  }
}

export function saveQuotaMetrics(metrics: QuotaMetrics): void {
  const dir = getAgentConfigDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(getQuotaFilePath(), JSON.stringify(metrics, null, 2), "utf-8");
}

export function recordUsageTurn(inputTokens: number, outputTokens: number): QuotaMetrics {
  const current = loadQuotaMetrics();
  const totalTurn = inputTokens + outputTokens;
  const currentUsed = (current.primaryWindow5h.tokensUsed || 0) + totalTurn;
  const limit = current.primaryWindow5h.tokensLimit || 200_000;
  const usedPercent = Math.min(100, Math.round((currentUsed / limit) * 100));

  current.primaryWindow5h.tokensUsed = currentUsed;
  current.primaryWindow5h.usedPercent = usedPercent;
  current.limitReached = usedPercent >= 100;
  current.lastUpdated = Date.now();

  saveQuotaMetrics(current);
  return current;
}

/**
 * Formatea la cuota en el contrato nativo ProviderUsage de Gentle Shell
 * para ser dibujado en la barra de estado y en el panel /gentle:usage
 */
export function getGentleShellUsageModel(): any {
  const q = loadQuotaMetrics();
  return {
    provider: PROVIDER_ID,
    plan: "Claude Pro/Max (Bridge)",
    limits: [
      {
        name: "Claude Rate Limit",
        limitReached: q.limitReached,
        windows: [
          {
            label: "Ventana 5h",
            usedPercent: q.primaryWindow5h.usedPercent,
            windowSeconds: q.primaryWindow5h.windowSeconds,
            resetAt: q.primaryWindow5h.resetAt,
            used: q.primaryWindow5h.tokensUsed,
            budget: q.primaryWindow5h.tokensLimit
          }
        ]
      }
    ],
    fetchedAt: q.lastUpdated
  };
}
