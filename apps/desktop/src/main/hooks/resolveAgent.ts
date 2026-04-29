import { promises as fs } from "node:fs";

interface KnownAgent {
  name: string;
  description: string;
}

/**
 * Claude Code's hook payload doesn't include the user-facing subagent name
 * (e.g. "team-lead"). It does include the transcript path. The transcript's
 * first line contains the system prompt the subagent ran with — we match its
 * description against the known project agents to recover the name.
 */
export async function resolveAgentNameFromTranscript(
  transcriptPath: string,
  knownAgents: KnownAgent[],
): Promise<string | null> {
  if (knownAgents.length === 0) return null;
  let raw: string;
  try {
    raw = await fs.readFile(transcriptPath, "utf8");
  } catch {
    return null;
  }
  // Look at the first ~10KB — that's where the system prompt lands.
  const haystack = raw.slice(0, 16_000).toLowerCase();
  let best: { name: string; score: number } | null = null;
  for (const a of knownAgents) {
    const desc = (a.description || "").toLowerCase();
    if (!desc) continue;
    // Use the first ~60 chars of the description as a fingerprint —
    // unique enough across wshobson agents.
    const probe = desc.slice(0, 60);
    if (probe.length < 16) continue;
    if (haystack.includes(probe)) {
      const score = probe.length;
      if (!best || score > best.score) best = { name: a.name, score };
    }
  }
  return best?.name ?? null;
}
