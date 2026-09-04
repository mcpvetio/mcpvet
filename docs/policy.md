# Policy — `.mcpaudit.yaml`

`mcpvet` accepts a YAML policy file that controls which servers are allowed, which patterns are disabled, and what severity threshold to use.

## Schema

```yaml
version: 1              # required, must be 1

# Optional: only these servers are allowed. Anything else is flagged.
allowedServers:
  - filesystem
  - github

# Optional: these servers are always rejected.
blockedServers:
  - known-evil-mcp

# Optional: pattern IDs to disable entirely (silenced).
disabledPatterns:
  - pi-urgency

# Optional: minimum severity to report. Findings below this are silenced.
severityThreshold: medium   # one of: info | low | medium | high | critical

# Optional: whether to exit non-zero on findings.
failOnFindings: true
```

All fields are optional. If you don't provide a policy file, `mcpvet` uses these defaults:

```yaml
version: 1
severityThreshold: low
failOnFindings: true
disabledPatterns: []
```

## How policy evaluation works

For each finding, `mcpvet` evaluates in this order:

1. **Allowlist** — if `allowedServers` is set and the server is not in the list → **block**
2. **Blocklist** — if `blockedServers` contains the server → **block**
3. **Severity threshold** — if severity is below `severityThreshold` → **allow** (silent)
4. **Otherwise** → **warn**

`failOnFindings: true` causes the CLI to exit with code 1 if any finding is `warn` or `block`.

## Examples

### Strict allowlist

```yaml
version: 1
allowedServers:
  - filesystem
  - github
  - git
severityThreshold: low
failOnFindings: true
```

Only the three listed servers can be installed. Anything else is blocked.

### Lenient monitoring

```yaml
version: 1
severityThreshold: high
failOnFindings: false
```

Reports high+ findings but never fails the CI. Useful for "observe first, enforce later" rollouts.

### Disable noisy patterns

```yaml
version: 1
disabledPatterns:
  - pi-urgency       # too many false positives in your codebase
  - exfil-base64-payload   # your servers legitimately use base64
```

Suppress specific pattern IDs. Use sparingly — every disabled pattern is a gap in your coverage.

### Allowlist + custom threshold

```yaml
version: 1
allowedServers:
  - filesystem
severityThreshold: medium
failOnFindings: true
```

Allowlist the safe server, then fail on any medium+ finding for everything else.

## Pattern IDs to disable

See [patterns.md](patterns.md) for the full list. Common ones to consider disabling:

- `pi-urgency` — low signal, many false positives
- `exfil-base64-payload` — if your tools legitimately use base64

Common ones you should NEVER disable:

- `exfil-curl-pipe-shell` — high signal, no false positives
- `cred-ssh-private-key` — high signal, no false positives
- `pi-ignore-previous` — high signal, no false positives
