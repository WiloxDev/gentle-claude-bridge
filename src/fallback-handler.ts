import { loadConfig } from "./config.js";

export async function checkCliProxyApiAvailability(url?: string): Promise<boolean> {
  const config = loadConfig();
  const targetUrl = url || config.cliproxyapiFallbackUrl || "http://127.0.0.1:8317";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500); // 1.5s timeout no bloqueante
    const res = await fetch(`${targetUrl.replace(/\/$/, "")}/v1/models`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export async function generateRateLimitMessage(resetAtTimestamp?: number): Promise<string> {
  const resetTimeStr = resetAtTimestamp ? new Date(resetAtTimestamp).toLocaleTimeString() : "en unos minutos";
  const isCpaUp = await checkCliProxyApiAvailability();

  let msg = `⚠️ Límite de cuota alcanzado en Claude Pro/Max (Rate Limit 429).\nSe reiniciará aproximadamente a las ${resetTimeStr}.`;

  if (isCpaUp) {
    msg += `\n\n💡 Detectamos CLIProxyAPI activo en tu máquina local (http://127.0.0.1:8317). Puedes continuar tu tarea cambiando a un modelo local en /model.`;
  }

  return msg;
}
