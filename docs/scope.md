# Scope — what mcpvet checks and what it doesn't

`mcpvet` is a **static configuration scanner**. It reads MCP config files and looks for dangerous patterns. It does not connect to running servers.

## In scope (v1)

- **Server definitions** in MCP config files:
  - `command` and `args` (stdio servers)
  - `env` variables and their values
  - `url` and `headers` (HTTP/SSE servers)
  - `cwd` (working directory)
- **Origin verification** of stdio servers that use package managers:
  - `npx`, `pnpm dlx`, `bunx`, `npm exec` → npm registry
  - `uvx`, `uv tool run`, `pipx run` → PyPI
  - `github:owner/repo` URLs → GitHub
- **Diff** of any of the above against a baseline

## Out of scope (v1)

- **Tool descriptions exposed at runtime** — the `description` field that the LLM actually sees is sent by the running server when the IDE queries it. `mcpvet` does not start the server. To audit runtime descriptions, you would need either:
  - Active probing (against our threat model — we don't ship a tool that auto-runs arbitrary executables)
  - A user-declared tools manifest in `.mcpaudit.yaml` (planned for v0.2)
  - A separate `mcpvet introspect <server>` command that speaks the MCP protocol (planned for v0.3)
- **The behavior of the package once installed** — we verify the publisher, the recency, and the allowlist status, not the runtime behavior. For that, use a sandbox.
- **Network calls made by the server at runtime** — out of scope. The user is responsible for monitoring that.
- **Modification of MCP configs** — `mcpvet` is read-only by design. It will not silently edit your files. Use the policy file to declare allowlists/blocklists for future runs.

## What we explicitly do NOT do

- **No auto-execution.** `mcpvet` never starts the servers it scans.
- **No telemetry.** No outbound calls except the user-enabled origin verification.
- **No file modification.** We never write to MCP config files (only the user-specified `--baseline` file).
- **No exfiltration.** No data leaves your machine.
- **No code obfuscation.** The tool is fully open source and auditable.

## When to complement with other tools

| Need | Use |
| --- | --- |
| Audit package code at runtime | Run the server in a sandbox (Docker, gVisor) |
| Monitor network calls at runtime | Network egress monitoring (e.g. `sniffnet`) |
| Detect prompt injection in chat | Tools like Lakera, Rebuff, or your own guardrails |
| Scan the broader application | ProjectDiscovery Cloud, runZero, or your own pentest |
| Audit source code for malicious patterns | Semgrep, CodeQL, or the patterns in our `packages/mcpvet/patterns/` files reused as Semgrep rules |

`mcpvet` is the *first* line of defense — it catches the obvious cases before a human ever needs to look. It is not a substitute for security review of the packages you install.
