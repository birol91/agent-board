export type HookEvent =
  | SubagentStartEvent
  | SubagentStopEvent
  | PreToolUseEvent
  | PostToolUseEvent
  | StopEvent;

export interface SubagentStartEvent {
  type: "SubagentStart";
  timestamp: string;
  sessionId: string;
  agentId: string;
  agentName: string | null;
  agentTranscriptPath: string | null;
  transcriptPath: string | null;
  cwd: string;
}

export interface SubagentStopEvent {
  type: "SubagentStop";
  timestamp: string;
  sessionId: string;
  agentId: string;
  agentName: string | null;
  agentTranscriptPath: string | null;
  transcriptPath: string | null;
  reason: string | null;
  lastAssistantMessage: string | null;
  cwd: string;
}

export interface PreToolUseEvent {
  type: "PreToolUse";
  timestamp: string;
  sessionId: string;
  agentId: string | null;
  toolName: string;
  toolInput: Record<string, unknown>;
  cwd: string;
}

export interface PostToolUseEvent {
  type: "PostToolUse";
  timestamp: string;
  sessionId: string;
  agentId: string | null;
  toolName: string;
  success: boolean;
  cwd: string;
}

export interface StopEvent {
  type: "Stop";
  timestamp: string;
  sessionId: string;
  cwd: string;
}
