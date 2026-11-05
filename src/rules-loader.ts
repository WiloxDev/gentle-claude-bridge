import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ClaudeRuleItem } from "./types.js";

/**
 * Escanea y carga de forma segura las reglas del proyecto:
 * 1. .claude/rules/*.md
 * 2. AGENTS.override.md o AGENTS.md
 * 3. CLAUDE.md
 */
export function loadProjectRules(startDir: string = process.cwd()): ClaudeRuleItem[] {
  const rules: ClaudeRuleItem[] = [];
  let currentDir = resolve(startDir);
  const rootDir = resolve("/");

  // Buscar hacia arriba hasta la raíz del sistema
  while (currentDir !== rootDir) {
    // 1. Buscar .claude/rules/
    const claudeRulesDir = join(currentDir, ".claude", "rules");
    if (existsSync(claudeRulesDir)) {
      try {
        const files = readdirSync(claudeRulesDir);
        for (const file of files) {
          if (file.endsWith(".md") || file.endsWith(".txt")) {
            const fullPath = join(claudeRulesDir, file);
            if (statSync(fullPath).isFile()) {
              const content = readFileSync(fullPath, "utf-8").trim();
              if (content) {
                rules.push({
                  name: `.claude/rules/${file}`,
                  path: fullPath,
                  content
                });
              }
            }
          }
        }
      } catch {
        // Ignorar errores de acceso
      }
    }

    // 2. Buscar AGENTS.override.md o AGENTS.md
    const agentsFiles = ["AGENTS.override.md", "AGENTS.md"];
    for (const agFile of agentsFiles) {
      const p = join(currentDir, agFile);
      if (existsSync(p)) {
        try {
          const content = readFileSync(p, "utf-8").trim();
          if (content) {
            rules.push({
              name: agFile,
              path: p,
              content
            });
            break; // AGENTS.override.md tiene prioridad sobre AGENTS.md
          }
        } catch {
          // Ignorar
        }
      }
    }

    // 3. Buscar CLAUDE.md
    const claudeMd = join(currentDir, "CLAUDE.md");
    if (existsSync(claudeMd)) {
      try {
        const content = readFileSync(claudeMd, "utf-8").trim();
        if (content) {
          rules.push({
            name: "CLAUDE.md",
            path: claudeMd,
            content
          });
        }
      } catch {
        // Ignorar
      }
    }

    // Si ya encontramos reglas en este directorio de proyecto, no seguimos subiendo
    if (rules.length > 0) {
      break;
    }

    currentDir = resolve(currentDir, "..");
  }

  return rules;
}

export function formatRulesForPrompt(rules: ClaudeRuleItem[]): string {
  if (rules.length === 0) {
    return "";
  }

  const sections = rules.map(r => `### Regla: ${r.name}\n${r.content}`);
  return `\n## REGLAS DEL PROYECTO (Cargadas localmente):\n${sections.join("\n\n")}\n`;
}
