# Show HN draft

## Title options (A/B)

1. **Show HN: mcpvet — security scanner for MCP server configs**
2. **Show HN: I built a static scanner for the MCP attack surface CSA flagged in July**
3. **Show HN: mcpvet catches prompt injection in your Cursor/Claude Code configs**

## Body

Hi HN,

In July, the Cloud Security Alliance published a report showing that MCP servers in agentic IDEs auto-execute arbitrary code on open, and their `description` fields are sent verbatim to the LLM with no sanitization. OWASP then ranked MCP tool poisoning #3 in their new MCP Top 10.

I built **mcpvet** to give dev teams a 2-second "is my config safe?" check. It scans every known MCP config location (Cursor, Claude Code, Gemini CLI, GitHub Copilot, Windsurf, etc.), audits server commands/env/URLs against 34 patterns (prompt injection, credential access, command execution, persistence), and verifies server origins via npm/PyPI/GitHub.

Three things that made it worth shipping rather than just a one-off:

1. **Patterns are data, not code.** Anyone can PR a new pattern as a YAML entry. Each pattern has at least one public reference (CSA, OWASP, CWE, or incident writeup).

2. **The CI integration is a one-liner.** Drop a workflow file and every PR gets a comment with the findings table. Block risky changes before merge.

3. **It doesn't auto-execute anything.** mcpvet is read-only — it never starts the servers it scans, never writes to your configs, and the threat model is published. The OWASP-style "this tool itself is a security risk" trap is something I took seriously.

It's MIT-licensed, ~120 tests, no telemetry, and works offline.

Tech: TypeScript, Zod for schema validation, commander for the CLI, GitHub Actions for CI. The pattern catalog is YAML in `packages/mcpvet/patterns/` — fork it and add your own.

What I'd love feedback on:

- Are the right patterns in the default catalog? (Easy to add more via PR.)
- Is the GitHub Action UX right? (Inputs, outputs, PR comment format.)
- What would make you actually use this in your team? (Right now I'm thinking "agency of one" — solo devs, small teams, fintech/security-conscious orgs.)

Repo: https://github.com/mcpvetio/mcpvet

---

## Things to remember when posting

- **Don't oversell.** The first comment is "I built this, here's why". The ask is feedback, not signups.
- **Engage with critical comments.** If someone points out a false positive, fix it. If someone says "use Amass/Subfinder instead", have a real answer (they're for general subdomain recon, not MCP-specific).
- **Be ready to explain the threat model.** Someone will ask "why no active probing" — answer: "we don't auto-execute arbitrary code, that would defeat the purpose of a security tool."
- **Link to the CSA report and OWASP in the first comment**, not just the title. Sets the credibility frame immediately.
