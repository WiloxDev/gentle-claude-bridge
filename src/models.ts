import type { Model } from "@earendil-works/pi-ai";
import { PROVIDER_ID } from "./types.js";

const ZERO_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0
};

export const CLAUDE_MODELS: Model<any>[] = [
  {
    id: "claude-opus-5",
    name: "Claude Opus 5.5",
    provider: PROVIDER_ID,
    api: "anthropic-messages",
    baseUrl: "https://api.anthropic.com",
    cost: ZERO_COST,
    contextWindow: 1_000_000,
    maxTokens: 32_000,
    reasoning: true,
    input: ["text", "image"]
  },
  {
    id: "claude-sonnet-5-5",
    name: "Claude Sonnet 5.5",
    provider: PROVIDER_ID,
    api: "anthropic-messages",
    baseUrl: "https://api.anthropic.com",
    cost: ZERO_COST,
    contextWindow: 1_000_000,
    maxTokens: 16_000,
    reasoning: true,
    input: ["text", "image"]
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: PROVIDER_ID,
    api: "anthropic-messages",
    baseUrl: "https://api.anthropic.com",
    cost: ZERO_COST,
    contextWindow: 200_000,
    maxTokens: 8_192,
    reasoning: false,
    input: ["text", "image"]
  }
];

export function getModelById(id: string): Model<any> | undefined {
  const cleanId = id.startsWith(`${PROVIDER_ID}/`) ? id.replace(`${PROVIDER_ID}/`, "") : id;
  return CLAUDE_MODELS.find(m => m.id === cleanId);
}
