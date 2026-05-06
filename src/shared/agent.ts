export type ClaudeModel = "opus" | "sonnet" | "haiku" | "inherit";

export type AgentColor =
  | "blue"
  | "green"
  | "red"
  | "yellow"
  | "cyan"
  | "magenta";

export interface AgentFrontmatter {
  name: string;
  description: string;
  model?: ClaudeModel;
  color?: AgentColor;
  tools?: string[];
}

export interface Agent {
  frontmatter: AgentFrontmatter;
  systemPrompt: string;
  filePath: string;
  source: AgentSource;
}

export type AgentSource =
  | { kind: "project"; projectPath: string }
  | { kind: "global" }
  | { kind: "marketplace"; pluginName: string };
