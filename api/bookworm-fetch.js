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
//    heading by pattern alone. This is why detectChapterListByOracle() +
//    resolveChapterHeadingsMechanically() below are now the PRIMARY method
//    (semantic reading comprehension can tell a decoy apart from a real
//    heading; a regex fundamentally cannot) - this function is kept only
//    as a fallback for when that call fails outright.
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

// REBUILT July 18, after real evidence proved the searchString approach
// below was structurally unreliable, not just buggy: three independent
// fix attempts (whitespace-fuzzy matching, gap-fill retry, bounded
// structural fallback) each improved things but the missing/misordered
// set kept shifting between runs - because the model was being asked to
// "quote verbatim" from chapters it had structurally never read (their
// real content lies beyond its 25000-char viewing window, which this
// book's own front-matter table of contents alone can fill). Confirmed
// directly via Vercel logs: a failed searchString for a chapter titled
// "Intervals" was literally that chapter's own TOC sub-heading list
// strung together, not real prose - a plausible-sounding guess, not a
// memory of something actually read.
//
// The manual TOC-paste path (_startBookFromTOC, rpgace_core.js) never
// hit this problem, ever, across every real test - because it only ever
// asks the model to do the ONE thing it's proven completely reliable at:
// read a clean table of contents and extract {number, title, keywords,
// suggestedPhylum}. It never asks the model to recall body text.
//
// This function now does the same thing for URL/PDF-sourced books: the
// model's ONLY job is reading the table of contents. Finding each
// chapter's REAL body text is a separate, fully mechanical, deterministic
// step (resolveChapterHeadingsMechanically below) that never depends on
// the model having "read" anything beyond the TOC.
async function detectChapterListByOracle(apiKey, fullText, phylumList) {
  // 25000 chars is enough to read a table of contents (even a long,
  // detailed one) - it no longer needs to reach real chapter body text,
  // since nothing past this call ever asks for that.
  const prefix = fullText.slice(0, 25000);
  const phylumBlock = phylumList ? '\n\nPHYLA (for the suggestedPhylum field below):\n' + phylumList : '';
  // Self-verification pass built into the prompt itself (added July 18,
  // per Alex's ask for real rigor on this specific step - reading a TOC
  // correctly is the one thing this whole rebuild depends on, so it earns
  // the same 5-angle scrutiny this project already applies to real
  // architecture decisions, reframed for this concrete task rather than
  // theater): completeness, accuracy, order, no-duplication, page numbers.
  const prompt = 'This is the beginning of a book, likely including a title page and a table of contents (chapter numbers, titles, sub-headings, page numbers, possibly dot leaders). Text extracted from a PDF can lose spaces between words that had visible spacing in the original ("Chapter14", "AdditiveRhythms") - read past that, it does not change what the real chapter numbers and titles are.\n\n' +
    'TEXT:\n' + prefix + '\n\n' +
    'Read ONLY the table of contents and list every real chapter in reading order - the chapter NUMBER, its TITLE, and its PAGE NUMBER if one is shown. Do not skip any numbered chapter, and do not merge two chapters into one entry, even if you are unsure how substantial a chapter is - the table of contents tells you what chapters exist, that is enough.\n\n' +
    'Before answering, verify your own list against these 5 checks: (1) COMPLETENESS - does every chapter number from 1 up to the highest one you found appear exactly once, no gaps? (2) ACCURACY - does each title match what is actually printed, not a paraphrase or summary of it? (3) ORDER - are your entries in the same order the chapters are printed in? (4) NO DUPLICATION - no chapter number listed twice, no two chapters merged into one entry? (5) PAGE NUMBERS - did you capture the printed page number for each chapter where one is shown? If checking these reveals a gap or a mistake, go back and fix it before responding - do not describe the checks in your answer, just make sure they are all true of the final list.\n\n' +
    'For each chapter, also give 3-6 keywords drawn from its title/sub-heading text, and (if a phylum list is given below) a best-guess suggestedPhylum number - just a starting hint for later insight placement, not a final decision.' + phylumBlock + '\n\n' +
    'Return ONLY JSON: {"chapters": [{"number": N, "title": "...", "pageNumber": N, "keywords": ["...", "..."], "suggestedPhylum": N}]}';

  const reply = await callClaude(apiKey, [{ role: 'user', content: prompt }], '', 2000);
  const jsonMatch = reply.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Oracle table-of-contents read returned no JSON');
  const parsed = JSON.parse(jsonMatch[0]);
  let chapters = (parsed.chapters || []).filter(function (c) { return c && c.number && c.title; });

  // Negative-feedback recircle loop (added July 18, per Alex's direct
  // design): a real re-test after the rebuild above still skipped 4
  // numbered chapters (14, 15, 20, 26) - not because the mechanical text
  // search failed to find their heading, but because the model's OWN
  // first-pass TOC read never included them in its returned list at all.
  // Different failure mode from the one the rebuild fixed, needs its own
  // check: the chapter list is numbered, so any gap in the number
  // sequence is a real, checkable signal, not a guess. Unlike the OLD
  // (removed) gap-fill retry, this is safe - it re-asks the model to
  // re-read the EXACT SAME already-fully-visible TOC text for numbers it
  // skipped, never asking it to recall body content it hasn't seen. Kept
  // to one retry round: if a number is still missing after this, it's
  // logged and surfaced as a real gapWarning rather than looped forever.
  const nums = chapters.map(function (c) { return c.number; });
  if (nums.length) {
    const maxNum = Math.max.apply(null, nums);
    const foundSet = {}; nums.forEach(function (n) { foundSet[n] = true; });
    const missingNums = [];
    for (let n = 1; n <= maxNum; n++) { if (!foundSet[n]) missingNums.push(n); }
    if (missingNums.length) {
      try {
        const recirclePrompt = 'Same table of contents excerpt as before:\n\nTEXT:\n' + prefix + '\n\n' +
          'On a first read, chapter number(s) ' + missingNums.join(', ') + ' were skipped even though this is the same table of contents text. Re-scan it specifically for those chapter numbers and return an entry for each one you can genuinely find listed there (only omit a number if it truly is not in this table of contents - double check before omitting). Same fields as before: title, pageNumber if shown, 3-6 keywords, suggestedPhylum.' + phylumBlock + '\n\n' +
          'Return ONLY JSON: {"chapters": [{"number": N, "title": "...", "pageNumber": N, "keywords": ["...", "..."], "suggestedPhylum": N}]}';
        const recircleReply = await callClaude(apiKey, [{ role: 'user', content: recirclePrompt }], '', 1200);
        const recircleMatch = recircleReply.match(/\{[\s\S]*\}/);
        if (recircleMatch) {
          const recircleParsed = JSON.parse(recircleMatch[0]);
          const recovered = (recircleParsed.chapters || []).filter(function (c) { return c && c.number && c.title; });
          console.warn('Bookworm DIAG: TOC recircle for chapter(s) [' + missingNums.join(',') + '] - recovered ' + recovered.length + ' of ' + missingNums.length);
          // Inject recovered chapters back into chronological order rather
          // than appending them at the end - the confirm screen and every
          // downstream step assume chapters arrive in reading order.
          chapters = chapters.concat(recovered).sort(function (a, b) { return a.number - b.number; });
        }
      } catch (e) {
        console.warn('Bookworm: TOC recircle failed:', e.message);
      }
    }
  }

  return chapters;
}

// Purely mechanical, no model involvement: given the chapter list the
// model read from the table of contents (proven reliable - it's just
// reading a list, not recalling unread body text), find where each
// chapter's REAL heading actually occurs in the full extracted text.
//
// Every chapter number+title appears at least twice in a real book: once
// in the front-matter table of contents (always early, and every
// chapter's mention clusters tightly together there), and once at its
// real heading later in the body. A chapter may ALSO be mentioned a
// third time as a later cross-reference ("...as covered in Chapter 6...")
// - a real bug found July 18 when an earlier version of this logic took
// the unconditional LAST match in the whole document and grabbed a
// cross-reference instead of the real heading.
//
// This avoids both decoys with one mechanism: collect every occurrence
// of every chapter's number+title pattern, strip the tightly-clustered
// front-matter run (dropClusteredBoundaries's exact logic, generalized to
// carry the chapter number through), then walk the chapters in their
// given reading order assigning each one the FIRST remaining occurrence
// that comes after the previously assigned chapter's position. A forward
// cross-reference to a not-yet-reached chapter essentially never happens
// in real prose (you cite chapters you've already covered, not ones still
// to come), so this greedy, strictly-increasing assignment naturally
// lands on the real heading and never on a later back-reference.
function resolveChapterHeadingsMechanically(fullText, chapterList) {
  const MIN_GAP = 600;
  const allMatches = [];
  chapterList.forEach(function (c) {
    const titleWords = (c.title || '').replace(/^chapter\s+\d+\s*[:\-]?\s*/i, '').trim().split(/\s+/).slice(0, 4).filter(Boolean);
    if (!titleWords.length) return;
    // Real evidence (Alex pasted the raw extracted TOC text directly, July
    // 18): this book's real heading text has ZERO space in places a human
    // reader sees a space - "Chapter14", "AdditiveRhythms" - not a PDF.js
    // quirk unique to this book, a genuine PDF-encoding pattern (many PDFs
    // position glyphs precisely instead of using an actual space character
    // for stylized headings). \s* (zero-or-more) instead of \s+
    // (one-or-more) between "chapter"/number and between title words
    // handles both cases with one pattern. (?!\d) instead of \b after the
    // number specifically allows a letter to immediately follow with zero
    // separation ("Chapter14Additive...") while still refusing to match "14"
    // as a false-positive prefix of a longer number like "140".
    const titlePattern = titleWords.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('\\s*');
    let re;
    try { re = new RegExp('chapter\\s*' + c.number + '(?!\\d)[\\s\\S]{0,80}?' + titlePattern, 'gi'); } catch (e) { return; }
    let m;
    while ((m = re.exec(fullText)) !== null) {
      allMatches.push({ number: c.number, offset: m.index });
      if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-width match loops
    }
  });
  allMatches.sort(function (a, b) { return a.offset - b.offset; });
  // Same declustering rule as dropClusteredBoundaries: a tight run of 2+
  // matches within MIN_GAP chars of each other is the front-matter TOC,
  // not real headings - strip it, keeping the number attached.
  const kept = [];
  for (let i = 0; i < allMatches.length; i++) {
    const last = kept[kept.length - 1];
    if (last && allMatches[i].offset - last.offset < MIN_GAP) continue;
    kept.push(allMatches[i]);
  }
  const offsetByNumber = {};
  let cursor = -1;
  chapterList.forEach(function (c) {
    let found = false;
    for (let i = 0; i < kept.length; i++) {
      if (kept[i].number === c.number && kept[i].offset > cursor) {
        offsetByNumber[c.number] = kept[i].offset;
        cursor = kept[i].offset;
        found = true;
        break;
      }
    }
    if (!found) {
      // DIAGNOSTIC (added July 18, after a re-test showed the same 4
      // chapters failing mechanical resolution twice running): is the
      // number+title pattern genuinely absent past the cursor, or does it
      // exist but got declustered/rejected for some other reason? Separately,
      // does a BARE "Chapter N" (no title requirement) exist past the
      // cursor at all - if yes, the real heading exists but this book's
      // formatting puts more than 80 chars between the number and title
      // (or the title itself doesn't match closely enough), not that the
      // heading is missing entirely.
      const rawForNumber = allMatches.filter(function (m) { return m.number === c.number; });
      const pastCursor = rawForNumber.filter(function (m) { return m.offset > cursor; });
      let bareContext = 'none found past cursor';
      const bareRe = new RegExp('chapter\\s*' + c.number + '(?!\\d)', 'gi');
      let bm; let bareOffset = -1;
      while ((bm = bareRe.exec(fullText)) !== null) {
        if (bm.index > cursor) { bareOffset = bm.index; break; }
        if (bm.index === bareRe.lastIndex) bareRe.lastIndex++;
      }
      if (bareOffset >= 0) {
        bareContext = 'offset ' + bareOffset + ': "' + fullText.slice(bareOffset, bareOffset + 200).replace(/\s+/g, ' ') + '"';
      }
      console.warn('Bookworm DIAG: chapter ' + c.number + ' ("' + c.title + '") - ' + rawForNumber.length + ' number+title match(es) total, ' + pastCursor.length + ' past cursor (' + cursor + '). Bare "Chapter ' + c.number + '" past cursor: ' + bareContext);
    }
  });
  return offsetByNumber;
}

// Defensive backstop for the regex-fallback detection path (when the
// model's own TOC read fails outright): a real Table of Contents or
// topic-index decoy shows up as a tight RUN of boundaries clustered
// close together (each entry only a line or two apart) - something a
// real chapter's actual body content basically never does. Drops any
// run of 2+ boundaries within MIN_GAP characters of the previous one,
// keeping only the first of that run.
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

    // REBUILT July 18 - see detectChapterListByOracle's comment for the
    // full reasoning. Two clean, independent steps instead of one fragile
    // one: (1) model reads the TOC only, returning {number, title,
    // keywords, suggestedPhylum} - the one thing it's proven completely
    // reliable at; (2) fully mechanical, deterministic offset resolution
    // against the real extracted text, no model recall of body content
    // involved at any point.
    let chapterList;
    let gapWarning = null;
    let boundaries;
    try {
      chapterList = await detectChapterListByOracle(apiKey, fullText, phylumList);
      if (chapterList.length < 2) throw new Error('Oracle table-of-contents read returned too few chapters');

      // Two DISTINCT failure modes, each needs its own visibility rather
      // than one silently masking the other: (1) the recircle loop inside
      // detectChapterListByOracle already tried once to recover any number
      // missing from the TOC read itself - if it's STILL missing here,
      // that's a real gap, not something the mechanical step below can
      // ever fix (it can only find headings for chapters it's TOLD about).
      const gotNums = chapterList.map(function (c) { return c.number; });
      const maxGotNum = gotNums.length ? Math.max.apply(null, gotNums) : 0;
      const gotSet = {}; gotNums.forEach(function (n) { gotSet[n] = true; });
      const stillMissingFromTOC = [];
      for (let n = 1; n <= maxGotNum; n++) { if (!gotSet[n]) stillMissingFromTOC.push(n); }

      const offsetByNumber = resolveChapterHeadingsMechanically(fullText, chapterList);
      const unresolved = []; // (2) TOC read them fine, but no real heading found in the text
      boundaries = chapterList.map(function (c) {
        const offset = offsetByNumber[c.number];
        if (offset === undefined) { unresolved.push(c.number); return null; }
        const titleOut = /chapter\s+\d+/i.test(c.title || '') ? c.title : ('Chapter ' + c.number + ': ' + c.title);
        return { offset: offset, title: titleOut, keywords: c.keywords || [], suggestedPhylum: c.suggestedPhylum || null };
      }).filter(Boolean);

      const warnings = [];
      if (stillMissingFromTOC.length) {
        console.warn('Bookworm DIAG: chapter(s) [' + stillMissingFromTOC.join(',') + '] still missing from the TOC read even after the recircle retry.');
        warnings.push('chapter(s) ' + stillMissingFromTOC.join(', ') + ' could not be found in the table of contents at all, even after a re-scan');
      }
      if (unresolved.length) {
        console.warn('Bookworm DIAG: mechanical resolution could not find a real heading for chapter(s) [' + unresolved.join(',') + '] - the TOC read them correctly but no matching "Chapter N <title>" occurrence was found in the extracted text past the previous chapter\'s position.');
        warnings.push('chapter(s) ' + unresolved.join(', ') + ' were listed in the table of contents but their real heading could not be located in the extracted text');
      }
      if (warnings.length) {
        gapWarning = 'Heads up: ' + warnings.join('; ') + '. Check the list below carefully before starting.';
      }
      if (boundaries.length < 2) throw new Error('Mechanical resolution found too few real chapter headings');
    } catch (e) {
      console.warn('Bookworm: TOC-based detection failed, falling back to regex:', e.message);
      boundaries = detectChaptersByRegex(fullText);
      gapWarning = null;
    }
    if (boundaries.length < 1) {
      throw new Error('Could not detect any chapter boundaries in this book');
    }
    boundaries = dropClusteredBoundaries(boundaries);

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
