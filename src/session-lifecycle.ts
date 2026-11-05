import type { AssistantMessage, AssistantMessageEventStream, Usage } from "@earendil-works/pi-ai";
import { PROVIDER_ID } from "./types.js";

const EMPTY_USAGE: Usage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    total: 0
  }
};

interface ActiveSessionRecord {
  sessionId: string;
  stream: AssistantMessageEventStream | null;
  childProcessPid?: number;
  completed: boolean;
  modelId: string;
}

const activeSessions = new Map<string, ActiveSessionRecord>();

export function registerSession(sessionId: string, stream: AssistantMessageEventStream | null, modelId: string = "claude-sonnet-5-5", pid?: number): void {
  activeSessions.set(sessionId, {
    sessionId,
    stream,
    childProcessPid: pid,
    completed: false,
    modelId
  });
}

export function updateSessionStream(sessionId: string, stream: AssistantMessageEventStream | null): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.stream = stream;
  }
}

/**
 * Cierre idempotente y unificado del stream de respuesta para Pi.
 * Corrige la fragmentación de 11 puntos de cierre detectada en la versión previa.
 */
export function finalizeStream(
  sessionId: string,
  reason: "stop" | "tool_use" | "error" | "rate_limited",
  errorMessage?: string
): void {
  const session = activeSessions.get(sessionId);
  if (!session || session.completed) {
    return;
  }

  session.completed = true;
  const stream = session.stream;

  if (stream) {
    if (reason === "error" || reason === "rate_limited") {
      const errText = errorMessage || (reason === "rate_limited" ? "Límite de cuota (Rate Limit) alcanzado." : "Error en la ejecución.");
      const errorAssistantMessage: AssistantMessage = {
        role: "assistant",
        content: [{ type: "text", text: `[Error: ${errText}]` }],
        api: "anthropic-messages",
        provider: PROVIDER_ID,
        model: session.modelId,
        usage: EMPTY_USAGE,
        stopReason: "error",
        timestamp: Date.now()
      };
      stream.push({
        type: "error",
        reason: "error",
        error: errorAssistantMessage
      });
    }

    try {
      stream.end();
    } catch {
      // Stream ya cerrado de forma segura
    }
  }

  activeSessions.delete(sessionId);
}

export function terminateAllActiveSessions(): void {
  for (const [id, session] of activeSessions.entries()) {
    if (session.childProcessPid) {
      try {
        process.kill(session.childProcessPid, "SIGTERM");
      } catch {
        // Proceso ya terminado
      }
    }
    finalizeStream(id, "stop");
  }
  activeSessions.clear();
}
