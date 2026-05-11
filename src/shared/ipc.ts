import type { Project } from "./project";
import type { Catalog, CatalogAgent, CatalogSkill } from "./catalog";
import type { AgentFrontmatter } from "./agent";
import type { LayoutMap } from "./layout";

export interface MemoryEntry {
  fileName: string;
  filePath: string;
  title: string;
  description: string;
  type: string;
  body: string;
}

export interface IpcContract {
  "project:read": {
    input: { rootPath: string };
    output: Project;
  };
  "app:health": {
    input: void;
    output: { version: string; ok: true };
  };
  "app:projectRoot": {
    input: void;
    output: { rootPath: string };
  };
  "app:recentProjects": {
    input: void;
    output: { paths: string[] };
  };
  "app:addRecent": {
    input: { rootPath: string };
    output: { ok: true };
  };
  "app:clearRecent": {
    input: { rootPath: string };
    output: { ok: true };
  };
  "dialog:openProject": {
    input: void;
    output: { rootPath: string | null };
  };
  "project:hasClaudeFolder": {
    input: { rootPath: string };
    output: { exists: boolean };
  };
  "catalog:read": {
    input: void;
    output: Catalog;
  };
  "agent:install": {
    input: { rootPath: string; from: CatalogAgent };
    output: { filePath: string };
  };
  "agent:save": {
    input: {
      filePath: string;
      frontmatter: AgentFrontmatter;
      systemPrompt: string;
    };
    output: { ok: true };
  };
  "agent:delete": {
    input: { filePath: string };
    output: { ok: true };
  };
  "skill:install": {
    input: { rootPath: string; from: CatalogSkill };
    output: { folderPath: string };
  };
  "skill:delete": {
    input: { folderPath: string };
    output: { ok: true };
  };
  "layout:save": {
    input: { rootPath: string; layout: LayoutMap };
    output: { ok: true };
  };
  "claudeMd:read": {
    input: { rootPath: string };
    output: { content: string; filePath: string; exists: boolean };
  };
  "claudeMd:write": {
    input: { rootPath: string; content: string };
    output: { ok: true };
  };
  "memory:list": {
    input: void;
    output: { entries: MemoryEntry[]; indexPath: string; indexBody: string };
  };
  "memory:delete": {
    input: { fileName: string };
    output: { ok: true };
  };
  "memory:initialize": {
    input: void;
    output: { indexPath: string; created: boolean };
  };
  "project:reset": {
    input: {
      rootPath: string;
      what: "claudeMd" | "agents" | "skills" | "hooks" | "all";
    };
    output: { ok: true };
  };
  "hooks:install": {
    input: { rootPath: string };
    output: { ok: true };
  };
  "hooks:status": {
    input: { rootPath: string };
    output: { installed: boolean; socketPath: string };
  };
}

export type IpcChannel = keyof IpcContract;
export type IpcInput<C extends IpcChannel> = IpcContract[C]["input"];
export type IpcOutput<C extends IpcChannel> = IpcContract[C]["output"];

export interface IpcErrorEnvelope {
  ok: false;
  error: { message: string; code?: string };
}
export interface IpcOkEnvelope<T> {
  ok: true;
  data: T;
}
export type IpcEnvelope<T> = IpcOkEnvelope<T> | IpcErrorEnvelope;
