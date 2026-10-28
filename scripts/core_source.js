// CK-8 (Oct 28 2026): JS twin of scripts/core_source.py - the one reader of the client source for Node tools
// (scripts/minify_client.js, tests). rpgace_core.js is a hub of `// @file src/...` lines (no code); readCore()
// joins those files in memory in hub order. A hub without @file lines is read as the file itself (pre-split).
//   node scripts/core_source.js check   join + node --check (the old `node --check rpgace_core.js`)
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function hubFiles() {
  const t = readFileSync(join(ROOT, 'rpgace_core.js'), 'utf8');
  if (!t.startsWith('/* RPGACE HUB')) return [];
  return [...t.matchAll(/^\/\/ @file (\S+)/gm)].map(m => m[1]);
}

export function readCore() {
  const files = hubFiles();
  if (!files.length) return readFileSync(join(ROOT, 'rpgace_core.js'), 'utf8');
  return files.map(f => readFileSync(join(ROOT, f), 'utf8')).join('');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] && process.argv[2] === 'check') {
  const tmp = join(tmpdir(), 'rpgace_core_check_' + process.pid + '.js');
  writeFileSync(tmp, readCore());
  try { execSync(`node --check ${tmp}`, { stdio: 'pipe' }); console.log('core_source.js: syntax clean (' + (hubFiles().length || 1) + ' files)'); }
  catch (e) { console.error('core_source.js: SYNTAX FAIL\n' + e.stderr.toString()); process.exitCode = 1; }
  finally { unlinkSync(tmp); }
}
