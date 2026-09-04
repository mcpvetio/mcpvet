# `@mcpvetio/mcpvet`

> Security scanner for MCP (Model Context Protocol) configurations.

MCP servers in agentic IDEs (Cursor, Claude Code, Gemini CLI, GitHub Copilot, Windsurf, Continue, Cline) are arbitrary executables that auto-run with developer privileges. Their `description` fields are sent verbatim to the LLM with no sanitization. The Cloud Security Alliance [documented this in July 2026](https://labs.cloudsecurityalliance.org/research/csa-research-note-mcp-tool-poisoning-auto-execution-20260701/) and OWASP ranked tool poisoning #3 in their MCP Top 10.

`mcpvet` audits your MCP configs against **34 curated attack patterns** across 7 categories, and verifies server origins via npm / PyPI / GitHub.

> ⚠️ **Scope:** static config analysis. Does not connect to running servers. See [docs/scope.md](https://github.com/mcpvetio/mcpvet/blob/main/docs/scope.md).

## Install

```bash
npx @mcpvetio/mcpvet scan
```

## Usage

```bash
# Basic scan — human-readable output
mcpvet scan

# JSON output for piping
mcpvet scan --json

# Diff against the last baseline
mcpvet scan --diff

# Only fail on high+ severity findings
mcpvet scan --severity high

# Skip network calls (offline mode)
mcpvet scan --offline

# Use a custom policy file
mcpvet scan --policy .mcpaudit.yaml

# Markdown for PR comments
mcpvet scan --markdown

# SARIF for GitHub code scanning
mcpvet scan --sarif
```

## What it catches

- **Exfiltration** (6 patterns) — `curl ... | sh`, base64 payloads, DNS tunnels, tar piped to remote
- **Credential access** (10) — SSH keys, AWS / GCP / Azure creds, GitHub tokens, shell history, browser cookies
- **Command execution** (7) — `bash -c`, `eval`, `rm -rf`, base64 decode|exec, reverse shells
- **Prompt injection** (8) — "ignore previous instructions", jailbreaks, persona impersonation, hidden outputs
- **Covert channels** (4) — DNS TXT exfil, ICMP tunnels, steganography, timing channels
- **Persistence** (5) — crontab, shell rc files, systemd, launchd, SSH authorized_keys
- **Supply chain** (4) — postinstall scripts, dynamic require, install from URL, obfuscated source

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Clean — no findings above the threshold |
| 1 | Findings above the threshold |
| 2 | Runtime error |
| 3 | Configuration error |
| 4 | Network fatal |

## Programmatic API

```ts
import { audit, loadPatternCatalog, loadPolicy } from "@mcpvetio/mcpvet";

const catalog = await loadPatternCatalog();
const policy = await loadPolicy("./.mcpaudit.yaml");
const findings = audit(servers, catalog, policy);
```

## Links

- [GitHub](https://github.com/mcpvetio/mcpvet)
- [Documentation](https://github.com/mcpvetio/mcpvet/tree/main/docs)
- [Threat model](https://github.com/mcpvetio/mcpvet/blob/main/docs/threat-model.md)
- [Pattern catalog](https://github.com/mcpvetio/mcpvet/blob/main/docs/patterns.md)

## License

MIT
