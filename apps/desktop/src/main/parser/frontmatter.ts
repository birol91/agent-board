import yaml from "js-yaml";

export interface ParsedMarkdown {
  data: Record<string, unknown>;
  content: string;
}

const DELIM = "---";

export function parseFrontmatter(raw: string): ParsedMarkdown {
  if (!raw.startsWith(DELIM)) {
    return { data: {}, content: raw };
  }
  const afterFirst = raw.slice(DELIM.length);
  const newlineAfterFirst = afterFirst.indexOf("\n");
  if (newlineAfterFirst === -1) {
    return { data: {}, content: raw };
  }
  const body = afterFirst.slice(newlineAfterFirst + 1);
  const closeIdx = body.indexOf(`\n${DELIM}`);
  if (closeIdx === -1) {
    return { data: {}, content: raw };
  }
  const yamlText = body.slice(0, closeIdx);
  const rest = body.slice(closeIdx + DELIM.length + 1);
  const content = rest.startsWith("\n") ? rest.slice(1) : rest;
  let data: Record<string, unknown> = {};
  try {
    const parsed = yaml.load(yamlText);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      data = parsed as Record<string, unknown>;
    }
  } catch {
    data = {};
  }
  return { data, content };
}
