# CI integration — GitHub Action

`mcpvet` ships as a [GitHub composite action](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action). It runs `mcpvet scan` against your repository, posts a PR comment with the findings, and fails the workflow if any finding meets the threshold.

## Quick start

Create `.github/workflows/mcpvet.yml`:

```yaml
name: mcpvet
on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: mcpvetio/mcpvet/.github/actions/scan@v1
# (as of v0.2 — for now, copy apps/github-action/ into your own .github/actions/scan/)
        with:
          severity-threshold: medium
          comment-pr: true
```

That's it. The action will:
1. Install `mcpvet` via `npx`
2. Run `mcpvet scan --json --severity medium --cwd .`
3. Post or update a PR comment with the findings table
4. Fail the workflow if any finding meets the threshold

## Inputs

| Input | Description | Default |
| --- | --- | --- |
| `config-path` | Working directory for workspace config discovery | `.` |
| `severity-threshold` | Minimum severity to report and fail on (`info`/`low`/`medium`/`high`/`critical`) | `low` |
| `fail-on-findings` | Whether to fail the action when findings are present | `true` |
| `comment-pr` | Post a PR comment with the results | `true` |
| `baseline-path` | Path to the baseline file (for diff mode) | `.mcpvet/baseline.json` |
| `offline` | Skip network calls to npm/PyPI/GitHub | `false` |
| `mcpvet-command` | Command to invoke mcpvet | `npx @mcpvetio/mcpvet` |
| `github-token` | GitHub token for posting PR comments | `${{ secrets.GITHUB_TOKEN }}` |

## Outputs

| Output | Description |
| --- | --- |
| `findings-count` | Number of findings at or above the threshold |
| `risk-score` | Aggregate risk score (0-100) |
| `has-critical` | `"true"` if any critical findings, else `"false"` |
| `result-path` | Path to the JSON results file (upload as artifact) |
| `exit-code` | Exit code from mcpvet |

## Example: post as artifact, no PR comment

```yaml
- uses: mcpvetio/mcpvet/.github/actions/scan@v1
# (as of v0.2 — for now, copy apps/github-action/ into your own .github/actions/scan/)
  with:
    comment-pr: false
    severity-threshold: high
- uses: actions/upload-artifact@v4
  with:
    name: mcpvet-results
    path: mcpvet-result.json
```

## Example: pinned to a specific version

```yaml
- uses: mcpvetio/mcpvet/.github/actions/scan@v0.1.2
```

Always pin to a specific tag or SHA for security tools. The `@v1` major tag is acceptable but less safe.

## Example: with custom policy

```yaml
- uses: mcpvetio/mcpvet/.github/actions/scan@v1
# (as of v0.2 — for now, copy apps/github-action/ into your own .github/actions/scan/)
  with:
    severity-threshold: medium
    comment-pr: true
- name: Upload policy
  uses: actions/upload-artifact@v4
  with:
    name: policy
    path: .mcpaudit.yaml
```

Place `.mcpaudit.yaml` at the repo root — the action picks it up automatically.

## Example: SARIF output for code scanning

The CLI supports `--sarif` for native GitHub code scanning integration. Run the action and pipe the output to `github/codeql-action/upload-sarif`:

```yaml
- uses: mcpvetio/mcpvet/.github/actions/scan@v1
# (as of v0.2 — for now, copy apps/github-action/ into your own .github/actions/scan/)
  with:
    comment-pr: false
    sarif-output: true  # TODO: add this input in v0.2
- if: always()
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mcpvet-result.sarif
```

## Security considerations

- The action does NOT auto-execute any MCP servers. It only reads your config files.
- The action makes outbound network calls to npm/PyPI/GitHub if `offline: false`. Set `offline: true` if your runners have no network or you don't want the calls.
- The PR comment is idempotent — it updates an existing `<!-- mcpvet-scan -->` comment rather than creating duplicates.
