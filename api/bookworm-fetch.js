// BOOKWORM — one-time full-book fetch + chapter detection/slicing.
// Deliberately separate from api/scout.js's fetchURL() (api/_context.js),
// which hard-truncates to 8000 chars for its other callers (Schedule
// Oracle, Content Intelligence) - Bookworm needs the WHOLE book to detect
// chapter boundaries, so this fetch is uncapped. Real risk, not papered
// over: Jina reliably returning a full book-length PDF's text in one
// response, within Vercel's function time/payload limits, is unverified -
// if it fails, this returns a clear error instead of silently truncating.
import { setCORS, callClaude } from './_context.js';

async function fetchFullText(url) {
  const jinaURL = 'https://r.jina.ai/' + url;
  const res = await fetch(jinaURL, {
    headers: { 'Accept': 'text/plain', 'X-Return-Format': 'text' }
  });
  if (!res.ok) throw new Error('Jina fetch failed: HTTP ' + res.status);
  const text = await res.text();
  if (!text || text.length < 50) throw new Error('Jina returned empty content for this URL');
  return text;
}

// Regex pass for common chapter-heading conventions. Looks for a heading
// line (start of line, reasonably short) matching "Chapter N", "Chapter
// <roman numeral>", or "Ch. N", optionally followed by ": Title" on the
// same line.
//
// Real bugs found on the first two hand-tests:
// 1. A book's own Table of Contents lists every chapter by name/number
//    too ("Chapter 1: Introduction"), so this matched the TOC's listing
//    before the real heading later in the body. Fixed: drop matches whose
//    captured title is itself a front/back-matter label ("Contents",
//    "Index", ...), and when the same chapter number matches more than
//    once, keep only the LAST occurrence - the real heading is always
//    further into the document than its own TOC listing.
// 2. Far more serious: 87 "chapters" detected on a real book. PDF-to-text
//    conversion breaks flowing prose across many short lines (following
//    the original page's line wraps, not sentence boundaries), so an
//    in-text reference like "...as covered in Chapter 5 of this book..."
//    can land on its own short line purely by coincidence of the layout,
//    indistinguishable from a real heading to a loose pattern. Fixed:
//    require a blank line immediately BEFORE the candidate heading line -
//    real headings in converted documents are reliably set off with
//    whitespace, continuous prose is not.
// 3. Still not enough on a 3rd hand-test: the same book ALSO had an
//    expanded per-chapter topic-summary section using "Chapter N: ..."
//    formatting too, which this function can't distinguish from a real
//    heading by pattern alone. This is why detectChaptersByOracle() below
//    is now the PRIMARY method (semantic reading comprehension can tell a
//    decoy apart from a real heading; a regex fundamentally cannot) -
//    this function is kept only as a fallback for when that call fails.
const FRONT_MATTER_TITLES = /^(table of )?contents$|^index$|^copyright$|^acknowledge?ments$/i;

function detectChaptersByRegex(fullText) {
  const pattern = /(^|\n)[ \t]*\r?\n[ \t]*(chapter\s+(\d+|[ivxlcdm]+)|ch\.\s*\d+)\s*[:\-.]?\s*(.{0,80})?$/gim;
  const byNumber = new Map();
  let m;
  while ((m = pattern.exec(fullText)) !== null) {
    const title = (m[4] || '').trim();
    if (FRONT_MATTER_TITLES.test(title)) continue;
    const key = (m[3] || m[2]).toLowerCase();
    // Offset should point at the heading itself, not the blank line
    // captured before it - recover it by finding where group 2 starts
    // within the matched span.
    const headingOffset = m.index + m[0].indexOf(m[2], m[1].length);
    byNumber.set(key, {
      offset: headingOffset,
      title: title ? (m[2] + ': ' + title).trim() : m[2].trim()
    });
  }
  return Array.from(byNumber.values());
}

// PRIMARY detection method as of the 3rd hand-test round (was a rare
// fallback for an implausible regex result - promoted after the regex
// approach failed 3 times running on the same real book, each a
// different failure shape: a Table of Contents listing every chapter by
// number+title, AND a separate expanded "Chapter N Summary" topic-index
// section that ALSO uses "Chapter N: ..." formatting. A blind pattern
// match cannot tell a real heading apart from either decoy - this is
// exactly the kind of judgment call that needs actual reading
// comprehension, which is why regex is now the fallback, not the other
// way around.
async function detectChaptersByOracle(apiKey, fullText, phylumList) {
  // 25000 chars (up from the original 6000) - real evidence showed this
  // book's front matter alone (title page, table of contents, AND an
  // expanded per-chapter topic-summary section) ran well past 6000 chars.
  // Still a prefix, not the whole book - a genuine limit, not a
  // guaranteed-sufficient window for every book's front matter length.
  const prefix = fullText.slice(0, 25000);
  const phylumBlock = phylumList ? '\n\nPHYLA (for the suggestedPhylum field below):\n' + phylumList : '';
  const prompt = 'This is the beginning of a book or book-summary document, likely including front matter (title page, table of contents, possibly per-chapter recap sections).\n\n' +
    'TEXT:\n' + prefix + '\n\n' +
    'List the book\'s REAL chapters in reading order, ONE entry per chapter number - never split a single chapter into multiple entries and never skip a chapter that has real content.\n\n' +
    'One genuine decoy to exclude: a table of contents / index that just LISTS every chapter by number and title with no real content of its own (e.g. a plain list of "Chapter N: Title" lines, or just chapter titles with page numbers) - that block is not a chapter.\n\n' +
    'IMPORTANT - this is NOT a decoy: some chapters may ONLY have an abbreviated "Chapter N Summary" recap (a short bullet/table recap of that chapter\'s key points), with no separate full-prose version anywhere - for example if fuller narrative text is paywalled or cut off after an early chapter. If that recap is the ONLY content available for that chapter number, it IS that chapter and must get its own entry. Only skip a "Chapter N Summary" if a FULLER narrative version of that SAME chapter number also exists elsewhere in the text - in that case use the fuller version instead, not both.\n\n' +
    'For each chapter, give an EXACT short string (8-12 words) copied verbatim from the very start of that chapter\'s own real content (its opening prose sentence, or its recap table\'s first real line if that\'s all it has) - not the heading/title text itself, since heading text can also appear in the table of contents and would match the wrong location. Also give 3-6 keywords for that chapter and (if a phylum list is given below) a best-guess suggestedPhylum number - just a starting hint for later insight placement, not a final decision. CRITICAL: never drop or merge a numbered chapter just because you are unsure whether it is substantial enough - if you are running low on output room, shorten titles/keywords first, never shorten the LIST of chapters.' + phylumBlock + '\n\n' +
    'Return ONLY JSON: {"chapters": [{"title": "...", "searchString": "...", "keywords": ["...", "..."], "suggestedPhylum": N}]}';

  const reply = await callClaude(apiKey, [{ role: 'user', content: prompt }], '', 3000);
  const jsonMatch = reply.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Oracle chapter-detection returned no JSON');
  const parsed = JSON.parse(jsonMatch[0]);
  return resolveChapterOffsets(fullText, parsed.chapters || []);
}

// Two-pass offset resolution, shared by the initial detection and the
// gap-fill retry. Pass 1 resolves everything findOffset() can (exact or
// whitespace-fuzzy searchString match) and records number->offset for
// every success - these are trusted anchors. Pass 2 uses ONLY those
// trusted anchors to bound findChapterHeadingOffset()'s structural search
// for whatever's left, so it can never overshoot into an unrelated LATER
// cross-reference to that chapter number elsewhere in the book (the real
// bug found July 18 - taking the single last match in the WHOLE document
// pulled in a later back-reference instead of the real heading, landing
// recovered chapters at the end of the list instead of their real
// position). Bounding the search to [nearest lower known offset, nearest
// higher known offset] keeps the match in the correct neighborhood.
function resolveChapterOffsets(fullText, entries, externalKnown) {
  const withNums = entries.map(function (c) {
    const m = /chapter\s+(\d+)/i.exec(c.title || '');
    return { raw: c, num: c.number || (m ? parseInt(m[1], 10) : null) };
  });
  const known = Object.assign({}, externalKnown); // number -> offset, trusted anchors only
  const pass1 = withNums.map(function (e) {
    const offset = findOffset(fullText, e.raw.searchString);
    if (offset >= 0 && e.num) known[e.num] = offset;
    return { e: e, offset: offset };
  });
  const knownNums = Object.keys(known).map(Number).sort(function (a, b) { return a - b; });
  const resolved = pass1.map(function (p) {
    let offset = p.offset;
    if (offset < 0 && p.e.num) {
      let minOffset = 0, maxOffset = fullText.length;
      for (let i = 0; i < knownNums.length; i++) {
        if (knownNums[i] < p.e.num) minOffset = known[knownNums[i]];
        if (knownNums[i] > p.e.num) { maxOffset = known[knownNums[i]]; break; }
      }
      offset = findChapterHeadingOffset(fullText, p.e.num, p.e.raw.title, minOffset, maxOffset);
    }
    const titleOut = p.e.num && !/chapter\s+\d+/i.test(p.e.raw.title || '') ? ('Chapter ' + p.e.num + ': ' + p.e.raw.title) : p.e.raw.title;
    return { offset: offset >= 0 ? offset : null, title: titleOut, keywords: p.e.raw.keywords || [], suggestedPhylum: p.e.raw.suggestedPhylum || null };
  }).filter(function (c) { return c.offset !== null; });
  return resolved;
}

// Real root cause found July 18 via direct log evidence: for a book whose
// front matter (detailed table of contents, dot-leader page listings) fills
// the ENTIRE 25000-char prefix the model can see, the model never actually
// reads that chapter's real opening prose - it only sees the chapter's TOC
// entry (number + title + sub-section names + page numbers). Asked for a
// "verbatim opening sentence" it has never read, it reconstructs a
// plausible-sounding guess from the TOC's own sub-heading vocabulary (real
// example logged: "working out intervals compound intervals exercises
// understanding intervals" for a chapter titled "Intervals" - literally
// just that chapter's TOC sub-headings strung together, not real prose).
// That guess correctly fails to string-match anywhere in the real text,
// because it was never real. No amount of retrying the SAME question fixes
// this - the model needs a different tool, not a second guess.
// Fix: since the model DOES correctly read the chapter's number and title
// from the TOC (that part never failed), search fullText directly and
// mechanically for a real heading occurrence of "Chapter N" near that
// title text - a real chapter heading always appears later in the
// document than its own front-matter TOC listing (same principle
// detectChaptersByRegex already uses for decoy filtering).
//
// minOffset/maxOffset (added after a real bug: taking the single LAST
// match in the WHOLE document pulled in a later back-reference to that
// chapter instead of the real heading, e.g. "...as covered in Chapter 6,
// Intervals are..." appearing much further into the book - landing
// recovered chapters at the end of the list instead of their real
// position) bound the search to the neighborhood between the nearest
// chapters already anchored with real confidence, so a stray later
// mention outside that neighborhood can never be picked by mistake.
function findChapterHeadingOffset(fullText, chapterNum, title, minOffset, maxOffset) {
  const titleWords = (title || '').replace(/^chapter\s+\d+\s*[:\-]?\s*/i, '').trim().split(/\s+/).slice(0, 4).filter(Boolean);
  if (!titleWords.length) return -1;
  const titlePattern = titleWords.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('\\s+');
  const lo = typeof minOffset === 'number' ? minOffset : 0;
  const hi = typeof maxOffset === 'number' ? maxOffset : fullText.length;
  try {
    const re = new RegExp('chapter\\s+' + chapterNum + '\\b[\\s\\S]{0,80}?' + titlePattern, 'gi');
    let m, last = null;
    while ((m = re.exec(fullText)) !== null) {
      if (m.index >= lo && m.index < hi) last = m;
      if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-width match loops
    }
    return last ? last.index : -1;
  } catch (e) {
    return -1;
  }
}

// Defensive backstop regardless of which detection method ran: a real
// Table of Contents or topic-index decoy shows up as a tight RUN of
// boundaries clustered close together (each entry only a line or two
// apart) - something a real chapter's actual body content basically
// never does. Drops any run of 3+ boundaries that are all within
// MIN_GAP characters of the previous one, keeping only the first of
// that run (the rest are almost certainly decoys, not real chapters).
function dropClusteredBoundaries(boundaries) {
  const MIN_GAP = 600;
  const sorted = boundaries.slice().sort(function (a, b) { return a.offset - b.offset; });
  const kept = [];
  for (let i = 0; i < sorted.length; i++) {
    const last = kept[kept.length - 1];
    if (last && sorted[i].offset - last.offset < MIN_GAP) {
      continue; // within a tight run of the last KEPT boundary - skip
    }
    kept.push(sorted[i]);
  }
  return kept;
}

// Real bug found July 18, confirmed via Vercel runtime logs: a real
// PDF-upload request returned 200 with no errors/warnings logged, yet
// still silently dropped 7 of 27 chapters even after the gap-fill retry
// ran. Root cause: chapter anchoring here relies on an EXACT substring
// match (fullText.indexOf(c.searchString)) between the model's
// "verbatim opening sentence" and the raw extracted text. PDF.js joins
// every text item with a single space (content.items.map(i => i.str)
// .join(' ')), collapsing the PDF's real line breaks/hyphenation -  a
// model reconstructing a "verbatim" sentence from that can easily
// introduce a whitespace difference invisible to a human reading it but
// fatal to exact indexOf(). URL-fetched (Jina) text is normal prose and
// mostly avoids this; PDF-extracted text hits it far more, which is
// exactly the pattern seen (PDF path repeatedly short, URL path never
// reported this specific failure shape). Fix: fall back to a
// whitespace-flexible regex match (words joined by \s+) instead of
// giving up outright on an exact-match miss - finds a true offset into
// the ORIGINAL fullText directly, no separate normalized-text mapping
// needed.
function findOffset(fullText, searchString) {
  if (!searchString) return -1;
  const exact = fullText.indexOf(searchString);
  if (exact >= 0) return exact;
  const words = searchString.trim().split(/\s+/).filter(Boolean);
  if (words.length < 3) return -1; // too short to fuzzy-match safely
  const pattern = words.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('\\s+');
  try {
    const m = new RegExp(pattern, 'i').exec(fullText);
    return m ? m.index : -1;
  } catch (e) {
    return -1;
  }
}

function guessTitleFromURL(url) {
  try {
    const filename = url.split('/').pop().replace(/\.[a-z0-9]+$/i, '');
    return decodeURIComponent(filename).replace(/[-_]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  } catch (e) { return 'Untitled Book'; }
}

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const url = (body && body.url || '').trim();
    // Uploaded-PDF path (client extracts text via PDF.js, no fetch needed
    // here) - a real, legitimate personal-copy entry point alongside the
    // URL fetch, since a purchased ebook sitting on a laptop has no URL
    // to paste. Same detection/slicing pipeline either way.
    const providedText = (body && body.fullText || '').trim();
    if (!url && !providedText) throw new Error('No URL or text provided');
    const providedTitle = (body && body.title || '').trim();
    const phylumList = (body && body.phylumList) || null;

    const fullText = providedText || await fetchFullText(url);

    // Oracle-primary as of the 3rd hand-test round (see detectChaptersByOracle
    // above for why) - regex is now only a fallback for when the Oracle call
    // itself fails outright or returns too few chapters to be useful.
    let boundaries;
    try {
      boundaries = await detectChaptersByOracle(apiKey, fullText, phylumList);
      if (boundaries.length < 2) boundaries = detectChaptersByRegex(fullText);
    } catch (e) {
      console.warn('Bookworm: Oracle chapter-detection failed, falling back to regex:', e.message);
      boundaries = detectChaptersByRegex(fullText);
    }
    if (boundaries.length < 1) {
      throw new Error('Could not detect any chapter boundaries in this book');
    }
    boundaries = dropClusteredBoundaries(boundaries);

    // Self-healing retry (added July 17), ported from the manual TOC-paste
    // path's fix (_startBookFromTOC in rpgace_core.js) - that fix only ever
    // covered the manual-paste entry point, NOT this URL/PDF-upload path,
    // which is why the exact same missing-chapters bug reproduced
    // identically on a real hand-test after the other path was already
    // fixed. Can't reuse the manual path's "scan raw text for Chapter N
    // mentions" trick directly here - fullText is the WHOLE BOOK, so a
    // literal mention-count would hit false positives from in-body
    // references and running headers, not just real headings. Instead:
    // check for GAPS in the numeric sequence of chapter numbers actually
    // found (e.g. found 1-5,7-9,11... - missing 6,10) - a much more
    // reliable signal against a real chapter list than a raw mention count.
    function chapterNumOfBoundary(b) {
      const m = /chapter\s+(\d+)/i.exec(b.title || '');
      return m ? parseInt(m[1], 10) : null;
    }
    const foundNums = boundaries.map(chapterNumOfBoundary).filter(function (n) { return n !== null; });
    let gapWarning = null;
    if (foundNums.length >= 2) {
      const maxNum = Math.max.apply(null, foundNums);
      const foundSet = {}; foundNums.forEach(function (n) { foundSet[n] = true; });
      const missingNums = [];
      for (let n = 1; n <= maxNum; n++) { if (!foundSet[n]) missingNums.push(n); }
      if (missingNums.length) {
        const prefix = fullText.slice(0, 25000);
        // DIAGNOSTIC (added July 18, after the whitespace-fix alone failed
        // to recover the exact same missing set on a real re-test - three
        // independent Oracle calls losing the identical 7 chapter numbers
        // rules out random variance, so this logs real forensic data
        // instead of guessing a 4th blind fix. For each missing number:
        // does "Chapter N" literally appear anywhere in fullText at all
        // (if not, the real heading text differs from that pattern
        // entirely - roman numeral, spelled-out number, no heading), and
        // if it does, is it even within the 25000-char prefix the model
        // can see, plus the real surrounding text so any formatting quirk
        // (running header, table layout, page-break artifact) is visible
        // directly in Vercel logs rather than inferred.
        missingNums.forEach(function (n) {
          const re = new RegExp('chapter\\s+' + n + '\\b', 'i');
          const fullIdx = fullText.search(re);
          if (fullIdx < 0) {
            console.warn('Bookworm DIAG: "Chapter ' + n + '" does not literally appear anywhere in fullText - real heading text differs from that pattern.');
          } else {
            const context = fullText.slice(Math.max(0, fullIdx - 40), fullIdx + 160).replace(/\s+/g, ' ');
            console.warn('Bookworm DIAG: "Chapter ' + n + '" found at offset ' + fullIdx + ' of ' + fullText.length + ' (in 25000-char prefix: ' + (fullIdx < 25000) + '). Context: "' + context + '"');
          }
        });
        try {
          const phylumBlock = phylumList ? '\n\nPHYLA (for the suggestedPhylum field below):\n' + phylumList : '';
          // Real cause confirmed July 18 (see findChapterHeadingOffset above):
          // when a chapter's real content lies beyond the 25000-char prefix,
          // the model has never actually read it and can only guess at a
          // "verbatim" opening line from its own TOC sub-headings - asking
          // it AGAIN with the same limited view doesn't fix that. This retry
          // is kept as a secondary attempt (still useful if the miss was a
          // genuine one-off rather than a window-visibility problem), but
          // the real recovery mechanism is the structural title+number
          // search below, which doesn't depend on the model seeing content
          // it structurally cannot see.
          const retryPrompt = 'Same book excerpt as before:\n\nTEXT:\n' + prefix + '\n\n' +
            'On a first extraction pass, chapter number(s) ' + missingNums.join(', ') + ' were missed entirely. Re-scan specifically for those chapter numbers and return an entry for each one you can genuinely find in this text (only omit a number if it truly does not appear at all - double check before omitting). Include the chapter NUMBER as its own field this time, not just embedded in the title. Same fields as before otherwise: title, an EXACT short searchString (8-12 words verbatim from that chapter\'s own opening content), 3-6 keywords, suggestedPhylum.' + phylumBlock + '\n\n' +
            'Return ONLY JSON: {"chapters": [{"number": N, "title": "...", "searchString": "...", "keywords": ["...", "..."], "suggestedPhylum": N}]}';
          const retryReply = await callClaude(apiKey, [{ role: 'user', content: retryPrompt }], '', 1500);
          const retryMatch = retryReply.match(/\{[\s\S]*\}/);
          if (retryMatch) {
            const retryParsed = JSON.parse(retryMatch[0]);
            const rawRetryCount = (retryParsed.chapters || []).length;
            // Seed with the first pass's already-anchored chapters so the
            // structural fallback bounds against the WHOLE known-good set,
            // not just the other retried chapters - the tightest possible
            // neighborhood, and how the out-of-order bug (July 18) was fixed.
            const externalKnown = {};
            boundaries.forEach(function (b) {
              const n = chapterNumOfBoundary(b);
              if (n !== null) externalKnown[n] = b.offset;
            });
            const retryBoundaries = resolveChapterOffsets(fullText, retryParsed.chapters || [], externalKnown);
            const droppedCount = rawRetryCount - retryBoundaries.length;
            if (droppedCount > 0) {
              console.warn('Bookworm DIAG: gap-fill retry for [' + missingNums.join(',') + '] - ' + droppedCount + ' of ' + rawRetryCount + ' still could not be anchored even with the structural fallback');
            }
            console.warn('Bookworm: gap-fill retry for chapters [' + missingNums.join(',') + '] - model returned ' + rawRetryCount + ', ' + retryBoundaries.length + ' anchored successfully');
            boundaries = dropClusteredBoundaries(boundaries.concat(retryBoundaries));
          }
        } catch (e) {
          console.warn('Bookworm: gap-fill retry failed:', e.message);
        }
        const afterNums = boundaries.map(chapterNumOfBoundary).filter(function (n) { return n !== null; });
        const afterSet = {}; afterNums.forEach(function (n) { afterSet[n] = true; });
        const stillMissing = missingNums.filter(function (n) { return !afterSet[n]; });
        if (stillMissing.length) {
          gapWarning = 'Chapter number(s) ' + stillMissing.join(', ') + ' could not be found in this text, even after a retry - check the extracted chapter list carefully before starting.';
        }
      }
    }

    const sliced = boundaries.map(function (b, i) {
      const end = (i + 1 < boundaries.length) ? boundaries[i + 1].offset : fullText.length;
      return { title: b.title, text: fullText.slice(b.offset, end).trim(), keywords: b.keywords || [], suggestedPhylum: b.suggestedPhylum || null };
    }).filter(function (c) { return c.text.length > 0; });

    // A genuine chapter has real body content - anything left this short
    // after the front-matter filter above is still probably a fragment
    // (a stray heading match, a half-page transition), not something
    // worth its own read-and-analyze cycle. Merge it forward into the
    // next chapter instead of creating a near-empty row (the exact
    // failure mode found on the first hand-test - a "Contents" chapter
    // with nothing real to show in the read popup).
    const MIN_CHAPTER_LENGTH = 400;
    const merged = [];
    for (let i = 0; i < sliced.length; i++) {
      if (sliced[i].text.length < MIN_CHAPTER_LENGTH && i + 1 < sliced.length) {
        sliced[i + 1] = Object.assign({}, sliced[i + 1], { text: sliced[i].text + '\n\n' + sliced[i + 1].text });
        continue;
      }
      merged.push(sliced[i]);
    }
    const chapters = merged.map(function (c, i) {
      return { index: i, title: c.title, text: c.text, keywords: c.keywords, suggestedPhylum: c.suggestedPhylum };
    });

    return res.status(200).json({
      success: true,
      title: providedTitle || guessTitleFromURL(url || 'Untitled Book.pdf'),
      chapters: chapters,
      warning: gapWarning
    });
  } catch (err) {
    console.error('Bookworm fetch error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
