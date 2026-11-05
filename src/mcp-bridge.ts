import type { Tool } from "@earendil-works/pi-ai";

export interface ToolCallExecution {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResultExecution {
  id: string;
  isError: boolean;
  content: string;
}

export function normalizeToolArguments(toolName: string, args: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...args };

  // Claude Code espera un timeout explícito en comandos bash para evitar bloqueos
  if (toolName === "bash" || toolName === "execute_command") {
    if (typeof normalized.timeout !== "number" || normalized.timeout <= 0) {
      normalized.timeout = 120; // 120 segundos por defecto
    }
  }

  return normalized;
}

export function formatToolResultForClaude(result: unknown): string {
  if (result === undefined || result === null) {
    return "";
  }
  if (typeof result === "string") {
    return result;
  }
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

export function mapPiToolsToClaudeMcp(tools: Tool[]): Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> {
  return tools.map(t => ({
    name: t.name,
    description: t.description || "",
    inputSchema: (t.parameters as Record<string, unknown>) || { type: "object", properties: {} }
  }));
}
