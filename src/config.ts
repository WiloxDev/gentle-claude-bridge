import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import type { GentleClaudeConfig } from "./types.js";

const DEFAULT_CONFIG: GentleClaudeConfig = {
  enabled: true,
  effort: "none",
  fastMode: false,
  strictMcpConfig: true,
  pathToClaudeExecutable: "",
  loadProjectRules: true,
  cliproxyapiFallbackUrl: "http://127.0.0.1:8317",
  enableUsageReporting: true
};

export function getAgentConfigDir(): string {
  const home = homedir();
  const gentleDir = join(home, ".gentle-shell", "agent");
  if (existsSync(gentleDir)) {
    return gentleDir;
  }
  const piDir = join(home, ".pi", "agent");
  if (existsSync(piDir)) {
    return piDir;
  }
  return gentleDir;
}

export function getConfigFilePath(): string {
  return join(getAgentConfigDir(), "gentle-claude-bridge.json");
}

export function loadConfig(projectDir?: string): GentleClaudeConfig {
  const globalPath = getConfigFilePath();
  let merged: GentleClaudeConfig = { ...DEFAULT_CONFIG };

  if (existsSync(globalPath)) {
    try {
      const raw = readFileSync(globalPath, "utf-8");
      const parsed = JSON.parse(raw);
      merged = { ...merged, ...parsed };
    } catch {
      // Degrada a default en caso de error de lectura/parseo
    }
  }

  if (projectDir) {
    const projectCandidates = [
      join(projectDir, ".gentle-shell", "gentle-claude-bridge.json"),
      join(projectDir, ".pi", "gentle-claude-bridge.json")
    ];
    for (const p of projectCandidates) {
      if (existsSync(p)) {
        try {
          const raw = readFileSync(p, "utf-8");
          const parsed = JSON.parse(raw);
          merged = { ...merged, ...parsed };
          break;
        } catch {
          // Ignorar error de parseo en proyecto
        }
      }
    }
  }

  return merged;
}

export function saveConfig(updates: Partial<GentleClaudeConfig>): GentleClaudeConfig {
  const dir = getAgentConfigDir();
  mkdirSync(dir, { recursive: true });
  const current = loadConfig();
  const next = { ...current, ...updates };
  writeFileSync(getConfigFilePath(), JSON.stringify(next, null, 2), "utf-8");
  return next;
}

export function resolveClaudeBinary(explicitPath?: string): string | null {
  if (explicitPath && existsSync(explicitPath)) {
    return explicitPath;
  }

  try {
    const stdout = execSync("which claude 2>/dev/null || which claude-code 2>/dev/null", {
      encoding: "utf-8"
    }).trim();
    if (stdout && existsSync(stdout)) {
      return stdout;
    }
  } catch {
    // which falló
  }

  const commonPaths = [
    join(homedir(), ".npm-global", "bin", "claude"),
    "/usr/local/bin/claude",
    "/usr/bin/claude",
    join(homedir(), ".nix-profile", "bin", "claude")
  ];

  for (const p of commonPaths) {
    if (existsSync(p)) {
      return p;
    }
  }

  return null;
}
