import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'mcpvet — MCP attack surface scanner',
  description:
    'Security scanner for MCP (Model Context Protocol) configurations. Catches prompt injection, credential access, command execution, and persistence in your Cursor/Claude Code configs.',
  openGraph: {
    title: 'mcpvet — MCP attack surface scanner',
    description:
      'Your agentic IDE auto-executes whatever is in .cursor/mcp.json. mcpvet checks them in 2 seconds.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
