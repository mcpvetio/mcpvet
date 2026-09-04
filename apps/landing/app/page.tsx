export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a0f] text-[#e5e5e5]">
      <div className="max-w-3xl w-full space-y-12">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#888]">
            <span className="h-1 w-1 rounded-full bg-[#7c83ff]" />
            MCP attack surface scanner
          </div>
          <h1 className="text-5xl sm:text-7xl font-semibold tracking-tight">
            mcp<span className="text-[#7c83ff]">vet</span>
          </h1>
          <p className="text-lg text-[#a0a0a0] max-w-xl mx-auto leading-relaxed">
            Your agentic IDE auto-executes whatever is in{' '}
            <code className="font-mono text-[#7c83ff]">.cursor/mcp.json</code>. Most of those
            servers have never been audited. mcpvet checks them in 2 seconds.
          </p>
        </header>

        <div className="bg-[#14141c] border border-[#2a2a3a] rounded-lg p-4 font-mono text-sm">
          <div className="flex items-center gap-2 mb-3 text-[#666]">
            <span className="h-2 w-2 rounded-full bg-[#f5b342]" />
            <span className="h-2 w-2 rounded-full bg-[#7c83ff]" />
            <span className="h-2 w-2 rounded-full bg-[#5fb878]" />
            <span className="ml-2">terminal</span>
          </div>
          <div className="space-y-1">
            <div>
              <span className="text-[#7c83ff]">$</span> npx mcpvet scan
            </div>
            <div className="text-[#888]">mcpvet scan — 3 server(s), 1 finding(s)</div>
            <div className="text-[#f5b342]">risk score: 51/100 (critical)</div>
            <div className="mt-3 text-[#f87171]">CRITICAL evil-tool</div>
            <div className="pl-4 text-[#888]">pattern: cred-ssh-private-key</div>
            <div className="pl-4 text-[#888]">match: ~/.ssh/id_rsa</div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">What it catches</h2>
          <ul className="space-y-2 text-[#a0a0a0]">
            <li>
              <span className="text-[#f87171]">●</span> Tool description prompt injection (ignore
              previous instructions, jailbreak personas)
            </li>
            <li>
              <span className="text-[#f87171]">●</span> Credential access (SSH keys, AWS/GCP/Azure
              tokens)
            </li>
            <li>
              <span className="text-[#f87171]">●</span> Command execution (curl|sh, rm -rf, reverse
              shells)
            </li>
            <li>
              <span className="text-[#f87171]">●</span> Persistence (crontab, shell rc, launchd,
              systemd)
            </li>
            <li>
              <span className="text-[#f87171]">●</span> Origin verification (untrusted
              npm/PyPI/GitHub packages)
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <a
            href="https://github.com/mcpvetio/mcpvet"
            className="px-6 py-3 rounded-md bg-[#7c83ff] text-[#0a0a0f] font-medium hover:bg-[#8e95ff] transition-colors"
          >
            View on GitHub →
          </a>
          <a
            href="https://github.com/mcpvetio/mcpvet#readme"
            className="px-6 py-3 rounded-md border border-[#2a2a3a] text-[#e5e5e5] font-medium hover:border-[#7c83ff] transition-colors"
          >
            Read the docs
          </a>
        </div>

        <footer className="text-center text-xs text-[#666] pt-8">
          MIT licensed · Built after the{' '}
          <a
            href="https://labs.cloudsecurityalliance.org/research/csa-research-note-mcp-tool-poisoning-auto-execution-20260701/"
            className="underline hover:text-[#a0a0a0]"
          >
            CSA July 2026 report
          </a>{' '}
          on MCP tool poisoning
        </footer>
      </div>
    </main>
  );
}
