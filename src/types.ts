export const PROVIDER_ID = "gentle-claude";
export const PROVIDER_LABEL = "Gentle Claude Bridge";

export type EffortLevel = "low" | "medium" | "high" | "max" | "none";

export interface GentleClaudeConfig {
  enabled: boolean;
  effort: EffortLevel;
  fastMode: boolean;
  strictMcpConfig: boolean;
  pathToClaudeExecutable: string;
  loadProjectRules: boolean;
  cliproxyapiFallbackUrl: string;
  enableUsageReporting: boolean;
}

export interface QuotaWindow {
  label: string;
  usedPercent: number;
  windowSeconds: number;
  resetAt: number | null;
  tokensUsed?: number;
  tokensLimit?: number;
}

export interface QuotaMetrics {
  primaryWindow5h: QuotaWindow;
  secondaryWindowWeekly?: QuotaWindow;
  limitReached: boolean;
  lastUpdated: number;
}

export interface DoctorCheck {
  title: string;
  ok: boolean;
  details: string;
  suggestion?: string;
}

export interface DoctorReport {
  timestamp: number;
  checks: DoctorCheck[];
  allPassed: boolean;
}

export interface ClaudeRuleItem {
  name: string;
  path: string;
  content: string;
}
