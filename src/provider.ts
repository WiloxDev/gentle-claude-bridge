import {
  createAssistantMessageEventStream,
  type AssistantMessage,
  type AssistantMessageEventStream,
  type Context,
  type Model,
  type SimpleStreamOptions,
  type Usage
} from "@earendil-works/pi-ai";
import { resolveClaudeBinary, loadConfig } from "./config.js";
import { finalizeStream, registerSession } from "./session-lifecycle.js";
import { recordUsageTurn } from "./quota-tracker.js";
import { PROVIDER_ID, PROVIDER_API } from "./types.js";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

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

export function createClaudeStream(
  model: Model<any>,
  context: Context,
  options?: SimpleStreamOptions
): AssistantMessageEventStream {
  const stream = createAssistantMessageEventStream();
  const sessionId = randomUUID();
  const config = loadConfig();
  const claudeBin = resolveClaudeBinary(config.pathToClaudeExecutable);

  registerSession(sessionId, stream, model.id);

  if (!claudeBin) {
    const errorMsg = "No se encontró el ejecutable de Claude Code ('claude'). Ejecuta 'npm i -g @anthropic-ai/claude-code' o revisa /claude doctor.";
    const assistantError: AssistantMessage = {
      role: "assistant",
      content: [{ type: "text", text: errorMsg }],
      api: PROVIDER_API,
      provider: PROVIDER_ID,
      model: model.id,
      usage: EMPTY_USAGE,
      stopReason: "error",
      timestamp: Date.now()
    };
    stream.push({
      type: "error",
      reason: "error",
      error: assistantError
    });
    finalizeStream(sessionId, "error");
    return stream;
  }

  // Ejecución en segundo plano sin bloquear el loop de eventos
  (async () => {
    try {
      const messages = context.messages || [];
      const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
      let promptText = "";

      if (lastUserMessage) {
        if (typeof lastUserMessage.content === "string") {
          promptText = lastUserMessage.content;
        } else if (Array.isArray(lastUserMessage.content)) {
          promptText = lastUserMessage.content
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text)
            .join("\n");
        }
      }

      if (!promptText.trim()) {
        promptText = "Hola";
      }

      const args = [
        "--print",
        "--output-format", "stream-json",
        promptText
      ];

      if (config.fastMode) {
        args.unshift("--fast");
      }

      const child = spawn(claudeBin, args, {
        env: {
          ...process.env,
          CI: "1"
        },
        stdio: ["ignore", "pipe", "pipe"]
      });

      registerSession(sessionId, stream, model.id, child.pid);

      let buffer = "";
      let accumulatedText = "";

      const getPartialAssistant = (): AssistantMessage => ({
        role: "assistant",
        content: [{ type: "text", text: accumulatedText }],
        api: PROVIDER_API,
        provider: PROVIDER_ID,
        model: model.id,
        usage: EMPTY_USAGE,
        stopReason: "stop",
        timestamp: Date.now()
      });

      child.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf-8");
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const data = JSON.parse(trimmed);
            if (data.type === "text" || data.type === "content_block_delta") {
              const delta = data.text || data.delta?.text || "";
              if (delta) {
                accumulatedText += delta;
                stream.push({
                  type: "text_delta",
                  contentIndex: 0,
                  delta,
                  partial: getPartialAssistant()
                });
              }
            } else if (data.type === "usage" || data.usage) {
              const u = data.usage || data;
              recordUsageTurn(u.input_tokens || 0, u.output_tokens || 0);
            }
          } catch {
            const delta = trimmed + "\n";
            accumulatedText += delta;
            stream.push({
              type: "text_delta",
              contentIndex: 0,
              delta,
              partial: getPartialAssistant()
            });
          }
        }
      });

      let stderrLog = "";
      child.stderr.on("data", (errChunk: Buffer) => {
        stderrLog += errChunk.toString("utf-8");
      });

      child.on("close", (code: number | null) => {
        if (code !== 0) {
          const isRateLimit = stderrLog.includes("rate_limit") || stderrLog.includes("429");
          finalizeStream(
            sessionId,
            isRateLimit ? "rate_limited" : "error",
            stderrLog || `El proceso de Claude Code finalizó con código ${code}`
          );
        } else {
          finalizeStream(sessionId, "stop");
        }
      });

      child.on("error", (err: Error) => {
        finalizeStream(sessionId, "error", `Error al spawnear Claude Code: ${err.message}`);
      });

    } catch (err: any) {
      finalizeStream(sessionId, "error", err?.message || "Excepción inesperada en Claude Bridge.");
    }
  })();

  return stream;
}
