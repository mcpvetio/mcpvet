# Pattern catalog

`mcpvet` ships with **34 patterns** across **7 categories**. Each pattern is a YAML data file under [`packages/mcpvet/patterns/`](../packages/mcpvet/patterns/), and can be added or modified by the community without touching the engine code.

## Categories

| Category | Count | Purpose |
| --- | --- | --- |
| [Exfiltration](#exfiltration) | 6 | Send data to attacker-controlled destinations |
| [Credential access](#credential-access) | 10 | Read secrets (SSH keys, cloud creds, tokens) |
| [Command execution](#command-execution) | 7 | Run arbitrary code |
| [Prompt injection](#prompt-injection) | 8 | Subvert the LLM via tool descriptions |
| [Covert channels](#covert-channels) | 4 | Hide data movement in legitimate traffic |
| [Persistence](#persistence) | 5 | Establish a foothold that survives reboot |
| [Supply chain](#supply-chain) | 4 | Risky install/load mechanisms |

## Severity levels

- **critical** — Drop-and-execute, credential theft, or direct prompt injection. Almost never a false positive.
- **high** — Strong signal of malicious intent, but slightly more context-dependent.
- **medium** — Suspicious but could be legitimate in some contexts.
- **low** — Risk indicator; may have false positives depending on your stack.
- **info** — Hygiene issue; not necessarily malicious.

## Adding a pattern

1. Pick the right YAML file in `packages/mcpvet/patterns/` (or create a new one).
2. Add your pattern with at least one public reference.
3. Add a fixture to `fixtures/test-config.json` that triggers the pattern.
4. Add a fixture that should NOT trigger it (negative test).
5. Run `pnpm test` to verify.

## Exfiltration

| ID | Severity | Description |
| --- | --- | --- |
| `exfil-curl-pipe-shell` | critical | Tool description instructs `curl ... \| sh` |
| `exfil-wget-pipe-shell` | critical | Same but with `wget` |
| `exfil-fetch-upload` | high | "Fetch X then send to Y" pattern in description |
| `exfil-base64-payload` | high | Long base64 strings (>60 chars) in description |
| `exfil-dns-tunnel` | high | References to `nslookup`/`dig +short` |
| `exfil-tar-pipe-curl` | critical | `tar \| curl` in description |

## Credential access

| ID | Severity | Description |
| --- | --- | --- |
| `cred-ssh-private-key` | critical | `~/.ssh/id_rsa` or similar in any field |
| `cred-aws-credentials` | critical | `~/.aws/credentials` or `AWS_SECRET_ACCESS_KEY` |
| `cred-gcp-credentials` | critical | GCP service account JSON or `GOOGLE_APPLICATION_CREDENTIALS` |
| `cred-azure-credentials` | critical | Azure auth references |
| `cred-github-token-env` | high | `GITHUB_TOKEN` env var reference |
| `cred-npm-token` | high | `.npmrc` or `NPM_TOKEN` |
| `cred-env-dump` | high | `process.env` or `os.environ` references |
| `cred-shell-history` | medium | `~/.bash_history` or similar |
| `cred-private-key-file` | high | `.pem`/`.key`/`.pfx` file references |
| `cred-browser-cookies` | high | Browser cookie DB references |

## Command execution

| ID | Severity | Description |
| --- | --- | --- |
| `cmd-bash-sh-exec` | critical | `bash -c`, `sh -c`, `/bin/sh` references |
| `cmd-eval` | high | `eval()`, `new Function()`, `child_process.exec` |
| `cmd-rm-rf-destructive` | critical | `rm -rf /` or `rm -rf ~` |
| `cmd-base64-decode-exec` | critical | `base64 -d \| sh` |
| `cmd-netcat-reverse-shell` | critical | `nc -e /bin/sh` or `/dev/tcp/` |
| `cmd-chmod-777` | high | `chmod 777` or `chmod a+rwx` |
| `cmd-disable-security` | critical | `setenforce 0`, `spctl --master-disable`, `Disable-Defender` |

## Prompt injection

| ID | Severity | Description |
| --- | --- | --- |
| `pi-ignore-previous` | critical | "ignore previous instructions" |
| `pi-new-system-prompt` | critical | "system: you are" or "new instructions:" |
| `pi-jailbreak` | critical | DAN / developer mode / jailbreak keywords |
| `pi-exfil-via-llm` | critical | "send contents of X to URL" pattern |
| `pi-hide-from-user` | critical | "do not show this to the user" |
| `pi-impersonate` | high | "pretend to be" / "act as" |
| `pi-markdown-image-exfil` | high | `![](https://...?{data})` template |
| `pi-urgency` | low | Urgency framing in description |

## Covert channels

| ID | Severity | Description |
| --- | --- | --- |
| `covert-dns-txt-exfil` | high | DNS TXT exfiltration references |
| `covert-icmp-tunnel` | high | `ping -p` data exfil |
| `covert-steganography` | medium | "hide in image" references |
| `covert-timing-channel` | medium | `sleep ... encode` references |

## Persistence

| ID | Severity | Description |
| --- | --- | --- |
| `persist-crontab` | high | Crontab modification references |
| `persist-shell-rc` | high | `.bashrc`/`.zshrc`/`.profile` modification |
| `persist-systemd` | high | Systemd service installation |
| `persist-launchd` | high | macOS LaunchAgent/Daemon references |
| `persist-ssh-authorized-keys` | high | `authorized_keys` injection |

## Supply chain

| ID | Severity | Description |
| --- | --- | --- |
| `sc-postinstall-script` | high | npm `postinstall` references |
| `sc-dynamic-require` | high | Dynamic `require()` or `import()` with template strings |
| `sc-install-from-url` | high | `npm install https://...` |
| `sc-obfuscated-source` | medium | javascript-obfuscator or minified single-line blocks |

## References per pattern

Every pattern links to at least one of:
- [OWASP MCP Top 10](https://owasp.org/www-project-mcp-top-10/)
- [CSA: MCP Tool Poisoning & Auto-Execution (July 2026)](https://labs.cloudsecurityalliance.org/research/csa-research-note-mcp-tool-poisoning-auto-execution-20260701/)
- [MITRE CWE](https://cwe.mitre.org/) entries
- Public incident write-ups

If you find a pattern with no public reference, please open an issue — we'll either remove it or document it properly.
