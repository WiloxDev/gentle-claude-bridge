import { execSync } from "node:child_process";
import { resolveClaudeBinary } from "./config.js";

export interface ClaudeVersionStatus {
  installedClaudeVersion: string | null;
  latestClaudeNpmVersion: string | null;
  claudeUpdateAvailable: boolean;
  bridgeVersion: string;
  latestBridgeVersion: string | null;
  bridgeUpdateAvailable: boolean;
}

const BRIDGE_REPO_API = "https://api.github.com/repos/WiloxDev/gentle-claude-bridge/releases/latest";
const CLAUDE_NPM_REGISTRY = "https://registry.npmjs.org/@anthropic-ai/claude-code/latest";

export async function checkClaudeUpdates(currentBridgeVersion: string): Promise<ClaudeVersionStatus> {
  let installedClaudeVersion: string | null = null;
  let latestClaudeNpmVersion: string | null = null;
  let latestBridgeVersion: string | null = null;

  // 1. Obtener versión local de Claude Code
  const claudeBin = resolveClaudeBinary();
  if (claudeBin) {
    try {
      const out = execSync(`"${claudeBin}" --version`, { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      installedClaudeVersion = out;
    } catch {
      // Ignorar fallo de flag
    }
  }

  // 2. Consultar npm registry para Claude Code
  try {
    const res = await fetch(CLAUDE_NPM_REGISTRY, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data: any = await res.json();
      latestClaudeNpmVersion = data.version || null;
    }
  } catch {
    // Red no disponible
  }

  // 3. Consultar extensión Bridge
  try {
    const res = await fetch(BRIDGE_REPO_API, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data: any = await res.json();
      latestBridgeVersion = data.tag_name ? data.tag_name.replace(/^v/, "") : null;
    }
  } catch {
    // Red no disponible
  }

  const claudeUpdateAvailable = !!(
    latestClaudeNpmVersion &&
    installedClaudeVersion &&
    !installedClaudeVersion.includes(latestClaudeNpmVersion)
  );

  const bridgeUpdateAvailable = !!(
    latestBridgeVersion &&
    currentBridgeVersion &&
    latestBridgeVersion !== currentBridgeVersion
  );

  return {
    installedClaudeVersion,
    latestClaudeNpmVersion,
    claudeUpdateAvailable,
    bridgeVersion: currentBridgeVersion,
    latestBridgeVersion,
    bridgeUpdateAvailable
  };
}
