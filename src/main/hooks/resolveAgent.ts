import { promises as fs } from "node:fs";

interface KnownAgent {
  name: string;
  description: string;
}

/**
 * Claude Code's hook payload doesn't include the user-facing subagent name.
 * Resolution strategy, in order of reliability:
 *
 *   1. Read `<transcript>.meta.json` — Claude Code writes the actual
 *      `agentType` here (e.g. {"agentType":"ai-engineer"}). Authoritative.
 *   2. Fall back to scanning the transcript JSONL for the agent's
 *      description text — fragile, only works when the system prompt
 *      happens to land in transcript content.
 */
// Built-in Claude Code agent types that are never user-defined project agents.
const BUILTIN_TYPES = new Set([
  "general-purpose",
  "claude",
  "Explore",
  "claude-code-guide",
  "code-reviewer",
  "Plan",
  "statusline-setup",
]);

export async function resolveAgentNameFromTranscript(
  transcriptPath: string,
  knownAgents: KnownAgent[],
): Promise<string | null> {
  if (knownAgents.length === 0) return null;

  // 1. meta.json — most reliable when agentType matches a known project agent.
  const metaPath = transcriptPath.replace(/\.jsonl$/, ".meta.json");
  try {
    const raw = await fs.readFile(metaPath, "utf8");
    const parsed = JSON.parse(raw) as { agentType?: unknown };
    if (typeof parsed.agentType === "string" && parsed.agentType.length > 0) {
      const agentType = parsed.agentType;
      // Exact match against installed project agents.
      const exact = knownAgents.find((a) => a.name === agentType);
      if (exact) return exact.name;
      // If it's NOT a known built-in, it might be a custom agent with a
      // slightly different casing — try case-insensitive match.
      if (!BUILTIN_TYPES.has(agentType)) {
        const ci = knownAgents.find(
          (a) => a.name.toLowerCase() === agentType.toLowerCase(),
        );
        if (ci) return ci.name;
      }
    }
  } catch {
    // fall through
  }

  // 2. Scan the transcript JSONL for agent name mentions in content fields.
  let raw: string;
  try {
    raw = await fs.readFile(transcriptPath, "utf8");
  } catch {
    return null;
  }

  const haystack = raw.slice(0, 32_000).toLowerCase();

  // Try matching by agent name appearing in the transcript text.
  for (const a of knownAgents) {
    if (haystack.includes(a.name.toLowerCase())) {
      return a.name;
    }
  }

  // Try matching by description fingerprint.
  let best: { name: string; score: number } | null = null;
  for (const a of knownAgents) {
    const desc = (a.description || "").toLowerCase();
    if (!desc) continue;
    const probe = desc.slice(0, 60);
    if (probe.length < 16) continue;
    if (haystack.includes(probe)) {
      const score = probe.length;
      if (!best || score > best.score) best = { name: a.name, score };
    }
  }
  return best?.name ?? null;
}
