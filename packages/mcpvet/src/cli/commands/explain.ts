import { loadPatternCatalog } from '../../patterns/loader.js';
import { log } from '../logger.js';
import { EXIT } from './scan.js';

export async function runExplain(findingId: string): Promise<number> {
  const catalog = await loadPatternCatalog();
  // We don't store the full finding by ID persistently yet, but we can look up
  // patterns by their patternId prefix or by the FND-* hash. For now, if the
  // id is a FND- id, we tell the user to re-run --json | jq.
  if (findingId.startsWith('FND-')) {
    log.info('finding IDs are content-hashes; rerun with --json and filter by id for full details');
    return EXIT.OK;
  }
  // Otherwise treat it as a patternId
  const pattern = catalog.patterns.find((p) => p.id === findingId);
  if (!pattern) {
    log.error(`unknown id: ${findingId}`);
    return EXIT.CONFIG_ERROR;
  }
  process.stdout.write(`# ${pattern.name}\n\n`);
  process.stdout.write(`${pattern.description}\n\n`);
  process.stdout.write(`**Category:** ${pattern.category}\n`);
  process.stdout.write(`**Severity:** ${pattern.severity}\n`);
  process.stdout.write(`**Fields:** ${pattern.fields.join(', ')}\n\n`);
  process.stdout.write('**Matchers:**\n');
  for (const m of pattern.matchers) {
    process.stdout.write(`- \`${m.kind}\`: \`${m.pattern}\`\n`);
  }
  process.stdout.write('\n**References:**\n');
  for (const r of pattern.references) {
    process.stdout.write(`- ${r}\n`);
  }
  return EXIT.OK;
}
