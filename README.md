# mcpvet

> Security scanner for MCP (Model Context Protocol) configurations.

MCP servers in agentic IDEs (Cursor, Claude Code, Gemini CLI, GitHub Copilot, Windsurf, Continue, Cline) are arbitrary executables that auto-run with developer privileges. Their `description` fields are sent verbatim to the LLM with no sanitization. This is a real attack surface — the Cloud Security Alliance [documented it in July 2026](https://labs.cloudsecurityalliance.org/research/csa-research-note-mcp-tool-poisoning-auto-execution-20260701/) and OWASP ranked tool poisoning #3 in their MCP Top 10.

`mcpvet` audits your MCP configs:

- **Parses** every known MCP config location (global + workspace) across Cursor, Claude Code, Gemini CLI, GitHub Copilot, Windsurf, Continue, Cline
- **Audits** server commands, args, env vars, URLs, and headers against a curated library of exfiltration, credential access, command execution, and prompt injection signatures
- **Verifies** server origins (npm, PyPI, GitHub) and flags unknown publishers
- **Diffs** against a baseline to catch risky changes in PRs
- **Integrates** as a GitHub Action to block risky changes before merge

> ⚠️ **Scope:** `mcpvet` audits the **static configuration** of MCP servers. It does NOT connect to running servers. Tool descriptions exposed at runtime are not in scope for v1. See [docs/scope.md](docs/scope.md).

## Install

```bash
npx @mcpvetio/mcpvet scan
```

Or install globally:

```bash
npm install -g mcpvet
mcpvet scan
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

## Example output

```
mcpvet scan — 3 server(s), 1 finding(s)
risk score: 51/100 (critical)

Findings
CRITICAL evil-tool
  pattern:  cred-ssh-private-key
  field:    env
  match:    ~/.ssh/id_rsa
  refs:     https://cwe.mitre.org/data/definitions/522.html

Origin verification
  ✓ npm:@modelcontextprotocol/server-filesystem trust 95  on mcpvet allowlist
  ? local  trust 30  local command (no package registry reference)
```

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Clean — no findings above the threshold |
| 1 | Findings above the threshold |
| 2 | Runtime error |
| 3 | Configuration error (bad policy, bad input) |
| 4 | Network fatal |

## GitHub Action

> ⚠️ **MVP status**: the action is shipped as a local action (you copy the files into your own repo's `.github/actions/scan/`). External-action distribution via `mcpvetio/mcpvet/.github/actions/scan@v1` is a v0.2 task (needs release pipeline to build TS → JS and copy the dist).

For now, add to your workflow:

```yaml
# .github/workflows/mcpvet.yml in your repo
name: mcpvet
on: [pull_request]

permissions:
  contents: read
  pull-requests: write

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Copy apps/github-action/ from mcpvet into your own .github/actions/scan/
      - uses: ./.github/actions/scan
        with:
          severity-threshold: medium
          comment-pr: true
```

See [docs/ci.md](docs/ci.md) for the full reference.

## Configuration

`mcpvet` accepts a `.mcpaudit.yaml` at the repo root (or any path via `--policy`):

```yaml
version: 1

# Only these servers are allowed. Anything else is flagged.
allowedServers:
  - filesystem
  - github
  - git

# These servers are always rejected.
blockedServers:
  - some-evil-mcp

# Skip specific patterns by ID
disabledPatterns:
  - pi-urgency

# Minimum severity to report
severityThreshold: medium

# Exit non-zero on findings
failOnFindings: true
```

See [docs/policy.md](docs/policy.md) for the full schema.

## What we check

`mcpvet` ships with **34 curated patterns** across 7 categories:

- **Exfiltration** (6) — curl|sh, base64 payloads, DNS tunnels, tar piped to remote
- **Credential access** (10) — SSH keys, AWS/GCP/Azure creds, GitHub tokens, shell history, browser cookies
- **Command execution** (7) — bash -c, eval, rm -rf, base64 decode|exec, netcat reverse shells
- **Prompt injection** (8) — ignore previous instructions, jailbreaks, persona impersonation, hidden outputs
- **Covert channels** (4) — DNS TXT exfil, ICMP tunnels, steganography, timing channels
- **Persistence** (5) — crontab, shell rc files, systemd, launchd, ssh authorized_keys
- **Supply chain** (4) — postinstall scripts, dynamic require, install from URL, obfuscated source

See [docs/patterns.md](docs/patterns.md) for the full catalog with references.

## Why we built this

In July 2026, the Cloud Security Alliance published research showing that:
1. The `description` field in MCP tool definitions is sent verbatim to the LLM with no sanitization
2. Cursor, Claude Code, Gemini CLI, and GitHub Copilot auto-execute project-local MCP servers with full developer privileges

OWASP subsequently ranked MCP tool poisoning #3 in their MCP Top 10. The standard advice is "review your MCP configs carefully". `mcpvet` automates that review.

Read the [threat model](docs/threat-model.md) for the full picture of what we check, what we don't, and what an attacker who compromised `mcpvet` itself could do.

## Contributing

Patterns can be added by editing the YAML files in [`packages/mcpvet/patterns/`](packages/mcpvet/patterns/). Each pattern needs at least one public reference (CSA, OWASP, CWE, or incident writeup).

```yaml
- id: my-pattern-id
  name: Human-readable name
  description: |
    What this pattern detects and why it's dangerous.
  category: exfiltration  # one of: exfiltration, credential-access, command-execution, prompt-injection, covert-channels, persistence, supply-chain
  severity: high  # one of: critical, high, medium, low, info
  fields: [description, command, args, env, headers, url]
  matchers:
    - kind: regex
      pattern: "your regex here"
      flags: "i"
  references:
    - https://owasp.org/...
```

Run `pnpm test` to verify your pattern doesn't false-positive on the fixture corpus.

## License

MIT
