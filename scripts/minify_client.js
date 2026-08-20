#!/usr/bin/env node
/**
 * scripts/minify_client.js — real fix for the /decompress load-time audit's
 * own biggest finding (Aug 11 2026): rpgace_core.js (1.1MB raw/309KB gzipped,
 * 21% comment lines) + the old separate main.js (257KB/75KB gzipped) together
 * accounted for ~1.38MB of blocking JS parsed+executed before the app is
 * interactive — Alex reported this still measuring ~12,000ms on his laptop
 * even after the (correctly-scoped, but insufficient alone) cache-header/
 * preconnect fixes.
 *
 * Aug 20 2026: main.js was mechanically merged into rpgace_core.js (Alex's
 * own direct ask — one file instead of two, zero logic rewrite) — see that
 * file's own header comment and its LEGACY SECTION markers. There is now
 * exactly one client script to minify, one .min.js to serve.
 *
 * This is a committed, hand-re-run repo-generation script — same shape as
 * scripts/graphify_recolor.py — NEVER a live Vercel build step. RPGACE's
 * zero-build-step architecture rule is about the DEPLOYED app having no
 * build pipeline; this script runs once, here, before a commit, and its
 * OUTPUT file is what actually gets committed and served.
 *
 * SAFETY, real and verified, not assumed:
 *   - mangle: false, ALWAYS. index.html has 93 inline onclick="fnName(...)"
 *     HTML attributes referencing top-level global functions defined in
 *     rpgace_core.js (including its legacy section, ex-main.js). A minifier
 *     is a plain, per-file static analyzer — it cannot see those references
 *     living in a SEPARATE HTML file, so renaming would silently break every
 *     one of those 93 buttons with a runtime "X is not defined" error only
 *     visible in DevTools. Verified directly (Aug 11 2026, re-confirmed
 *     after the Aug 20 merge): with mangle:false, every one of the 47
 *     distinct onclick-referenced names survives byte-for-byte in the
 *     minified output (2 names, loadDemoShifts/debugComposio, were already
 *     dead references in the ORIGINAL unminified source — a real,
 *     pre-existing, unrelated bug, not something this script caused; see
 *     CLAUDE.md's "Known landmines" for the tracked fix item).
 *   - compress: true is safe here — dead-code elimination only removes code
 *     genuinely unreachable WITHIN the same file's own control flow, which
 *     is exactly the class of thing the onclick-safety check above already
 *     verifies isn't silently eating a real external reference.
 *   - Every run does a real node --check on its own output before writing
 *     the final file — a minifier bug producing invalid JS fails LOUD here,
 *     never silently ships broken code.
 *
 * MUST re-run whenever rpgace_core.js changes, in the SAME commit — same
 * discipline as the existing "bump index.html's ?v= in the same commit"
 * landmine rule, now extended. A stale .min.js file being served while the
 * real source has moved on is a silent "nothing changed" bug, same failure
 * class as every other cache-staleness landmine in this project.
 * `node scripts/minify_client.js` regenerates it.
 */

import { minify } from 'terser';
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const TARGETS = ['rpgace_core.js'];

async function run() {
  for (const file of TARGETS) {
    const src = readFileSync(file, 'utf8');
    const result = await minify(src, {
      compress: { defaults: true },
      mangle: false, // NEVER change — see the file header's onclick-safety note
      format: { comments: false },
    });
    if (result.error) {
      console.error(`FAILED minifying ${file}:`, result.error.message);
      process.exitCode = 1;
      return;
    }
    const outFile = file.replace(/\.js$/, '.min.js');
    writeFileSync(outFile, result.code);

    // Fail loud, not silent: a minifier producing invalid JS must never
    // ship. This is the same discipline as the standing "node --check
    // after every edit" habit, applied to generated output.
    try {
      execSync(`node --check ${outFile}`, { stdio: 'pipe' });
    } catch (e) {
      console.error(`FAILED: ${outFile} does not pass node --check:`, e.stderr.toString());
      process.exitCode = 1;
      return;
    }

    const rawLen = Buffer.byteLength(src);
    const minLen = Buffer.byteLength(result.code);
    console.log(`${file} -> ${outFile}: ${rawLen} -> ${minLen} bytes (${Math.round(100 * (1 - minLen / rawLen))}% smaller), node --check clean`);
  }
}

run();
