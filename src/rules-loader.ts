import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, normalize } from "node:path";
import type { ClaudeRuleItem } from "./types.js";

/**
 * Escanea y carga de forma segura las reglas del proyecto:
 * 1. .claude/rules/*.md
 * 2. AGENTS.override.md o AGENTS.md
 * 3. CLAUDE.md
 * 
 * Totalmente agnóstico de plataforma (Linux, macOS, Windows).
 * En Windows, el bucle ascendente se detiene en la raíz del disco (ej: 'C:\')
 * en lugar de intentar comparar rígidamente con '/'.
 */
export function loadProjectRules(startDir: string = process.cwd()): ClaudeRuleItem[] {
  const rules: ClaudeRuleItem[] = [];
  let currentDir = normalize(resolve(startDir));

  while (true) {
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
            break; // AGENTS.override.md tiene prioridad
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

    // Si encontramos reglas en el nivel actual, nos detenemos
    if (rules.length > 0) {
      break;
    }

    const parentDir = normalize(resolve(currentDir, ".."));
    // Detener si llegamos a la raíz del sistema de archivos (POSIX '/' o Windows 'C:\')
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
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
