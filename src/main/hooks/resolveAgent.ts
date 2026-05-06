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
export async function resolveAgentNameFromTranscript(
  transcriptPath: string,
  knownAgents: KnownAgent[],
): Promise<string | null> {
  // 1. meta.json — the reliable path.
  const metaPath = transcriptPath.replace(/\.jsonl$/, ".meta.json");
  try {
    const raw = await fs.readFile(metaPath, "utf8");
    const parsed = JSON.parse(raw) as { agentType?: unknown };
    if (typeof parsed.agentType === "string" && parsed.agentType.length > 0) {
      // Only return it if the project actually has this agent installed.
      // Built-in types like "general-purpose" should not light up a block.
      const known = knownAgents.find((a) => a.name === parsed.agentType);
      if (known) return known.name;
    }
  } catch {
    // fall through to transcript scanning
  }

  // 2. Description fingerprint fallback.
  if (knownAgents.length === 0) return null;
  let raw: string;
  try {
    raw = await fs.readFile(transcriptPath, "utf8");
  } catch {
    return null;
  }
  const haystack = raw.slice(0, 16_000).toLowerCase();
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
