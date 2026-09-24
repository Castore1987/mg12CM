import Anthropic from "@anthropic-ai/sdk";
import { requireAnthropicKey } from "../config.js";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: requireAnthropicKey() });
  }
  return client;
}

export async function askClaude(params: {
  system: string;
  prompt: string;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: params.model ?? "claude-sonnet-5",
    max_tokens: params.maxTokens ?? 1024,
    system: params.system,
    messages: [{ role: "user", content: params.prompt }],
  });

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}
