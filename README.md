# AgentBoard

> Visual control panel for Claude Code agents, skills, memory, and configuration — built on top of the [wshobson/agents](https://github.com/wshobson/agents) ecosystem.

A desktop application that turns Claude Code's `.claude/` configuration into a modern GUI. Pick agents from a marketplace of 184+ specialists, edit their prompts, manage your project's memory, and watch agents work in real time — all without leaving the dashboard.

**AgentBoard does not replace your Claude Code chat.** Conversations and orchestration stay in the official VS Code extension or terminal CLI. AgentBoard is the *configuration + observability* layer that sits next to it.

---

## Why AgentBoard?

Claude Code is powerful but its surface area lives in scattered files: `.claude/agents/*.md`, `.claude/skills/<name>/SKILL.md`, `.claude/commands/*.md`, `CLAUDE.md`, `settings.json`, `~/.claude/memory/`. Setting up a new project means copying boilerplate, editing markdown by hand, and remembering which agent does what.

AgentBoard solves three problems:

1. **Setup friction** — A new project should take 60 seconds, not 30 minutes of file shuffling.
2. **Discovery** — 184 agents in the wshobson marketplace is too many to remember. A visual catalog with filters helps you pick the right ones.
3. **Observability** — There is no built-in way to see *which agent is running right now*, *what tool it just called*, *how long it took*. AgentBoard shows this live.

---

## Architecture (high level)

```
┌──────────────────────────────────────────────────────────┐
│                    AgentBoard (Electron)                   │
│  ┌────────────────────────────────────────────────────┐  │
│  │  React + TypeScript UI                             │  │
│  │  ┌──────────┬─────────┬─────────┬──────────────┐  │  │
│  │  │ Wizard   │ Editor  │ Memory  │  Live Dash   │  │  │
│  │  └──────────┴─────────┴─────────┴──────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
│                          │                                │
│  ┌───────────────────────▼────────────────────────────┐  │
│  │  Local Node service (Express + ws)                 │  │
│  │  - File system: reads/writes .claude/*             │  │
│  │  - WebSocket: receives hook events from Claude Code│  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                           │ ▲
                           │ │ hook callbacks (PreToolUse, PostToolUse, ...)
                           │ │
                           ▼ │
              ┌──────────────────────────┐
              │  Claude Code CLI / VS    │
              │  Code extension          │
              │  (orchestrator + chat)   │
              └──────────────────────────┘
```

- **AgentBoard never proxies the LLM.** Claude Code talks to Anthropic directly.
- **AgentBoard never owns the chat.** It only reads/writes config files and listens to hook events.
- **Communication with Claude Code is one-way at runtime:** Claude Code → hooks → AgentBoard. AgentBoard shows the world; the chat drives it.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Shell | Electron |
| UI | React + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Local server | Express + `ws` (WebSocket) |
| File parsing | `gray-matter` (YAML frontmatter) |
| Packaging | electron-builder (.dmg / .exe / AppImage) |
| License | MIT |

---

## Roadmap

The project ships in five sliced versions. Each version is independently usable and announceable.

### v1.0 — Project Setup Wizard *(2–3 weeks)*

The minimum useful product. Spin up a `.claude/` folder for any project, pick agents from a catalog, get going.

- [ ] Browse the 184 agents from `wshobson/agents` in a searchable, filterable grid
- [ ] Browse 150 skills the same way
- [ ] Browse 98 commands
- [ ] "Add to project" button copies the file/folder into the target project's `.claude/`
- [ ] Generate a starter `CLAUDE.md` from a template (with project name, stack, conventions)
- [ ] Generate a default `settings.json` (permission allowlist, env vars)
- [ ] Open an existing project and see what's already installed
- [ ] Cross-platform build (macOS + Windows + Linux)

**Success criterion:** A new Claude Code project goes from zero to fully configured in under 60 seconds.

### v2.0 — Agent / Skill / Command Editor + Memory *(2 weeks)*

Edit what you installed. Manage memory.

- [ ] Frontmatter editor (name, description, model, color, tools) with validation
- [ ] System prompt editor (markdown) with preview
- [ ] Structured prompt editor: edit persona, capabilities, constraints as separate fields
- [ ] Create new agents/skills/commands from blank or template
- [ ] Memory panel: read/write `~/.claude/memory/*.md`, manage `MEMORY.md` index
- [ ] Edit `CLAUDE.md` (project) and `~/.claude/CLAUDE.md` (global) with live diff
- [ ] Auto-detect anti-patterns (over-constrained, empty description, missing trigger)

**Success criterion:** No reason to leave the GUI to edit any markdown file in `.claude/`.

### v3.0 — Live Agent Dashboard *(2–3 weeks)*

The killer feature. See what's happening as it happens.

- [ ] Hook-based event capture: `PreToolUse`, `PostToolUse`, `SubagentStop`, `Stop`
- [ ] WebSocket pipe from Claude Code hooks to AgentBoard
- [ ] Active agents panel: who's running, since when, on which task
- [ ] Tool-call timeline: every Read/Edit/Write/Bash with parameters and result
- [ ] Per-agent token usage and duration
- [ ] Color-coded badges matching the agent's `color` frontmatter field
- [ ] Notifications when long-running agents finish

**Success criterion:** A 30-second screen recording of this view is shareable on Twitter / Reddit.

### v4.0 — Manual Trigger + History *(1–2 weeks)*

Drive the deck yourself.

- [ ] Trigger any installed agent manually with a custom prompt
- [ ] Run history: every past invocation, queryable, with full input/output
- [ ] Re-run a past invocation with edited prompt
- [ ] Compare two runs side by side
- [ ] Export run as markdown / JSON

**Success criterion:** Power users use AgentBoard instead of typing `Task` calls.

### v5.0 — Hooks, Permissions, Polish *(2 weeks)*

The full settings surface, plus release engineering.

- [ ] Visual editor for `settings.json` hooks (PreToolUse / PostToolUse / Stop / etc.)
- [ ] Permission allowlist / denylist editor
- [ ] Environment variables editor
- [ ] MCP server configuration UI
- [ ] Theme support (light / dark / system)
- [ ] Auto-update via electron-updater
- [ ] Signed builds for macOS / Windows
- [ ] **Official 1.0 release** — landing page, demo video, launch posts (HN, Reddit r/ClaudeAI, Twitter)

**Success criterion:** Anyone using Claude Code daily wants this installed.

---

## Project structure (planned)

```
AgentBoard/
├── apps/
│   ├── desktop/              # Electron + React shell
│   │   ├── src/
│   │   │   ├── main/         # Electron main process
│   │   │   ├── renderer/     # React UI
│   │   │   └── preload/      # IPC bridge
│   │   └── package.json
│   └── service/              # Local Node service (Express + ws)
│       ├── src/
│       │   ├── fs/           # .claude file system operations
│       │   ├── ws/           # WebSocket server for hook events
│       │   └── parsers/      # gray-matter wrappers, validators
│       └── package.json
├── packages/
│   ├── shared-types/         # TypeScript types shared across apps
│   └── catalog/              # Cached metadata of wshobson/agents
├── scripts/
│   └── sync-marketplace.ts   # Pull latest from wshobson/agents
├── README.md
├── LICENSE                   # MIT
└── package.json              # Workspace root
```

---

## Non-goals

To keep the project focused, AgentBoard explicitly **will not**:

- Replace the Claude Code chat interface (use the VS Code extension or terminal CLI for that)
- Send prompts to Claude / Anthropic directly (Claude Code is the only thing that talks to the API)
- Compete with the official Anthropic desktop app
- Support non-Claude-Code agent ecosystems (no LangChain, no AutoGen, no CrewAI)
- Run on mobile

---

## Contributing

Not yet. The project is in early development and the architecture is still moving. After v1.0 lands, contribution guidelines will be added.

---

## Credits

- Built on top of [wshobson/agents](https://github.com/wshobson/agents) — the marketplace this entire project visualizes.
- Built for [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) by Anthropic.

---

## License

MIT (planned). License file added before v1.0 release.
