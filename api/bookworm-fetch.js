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
async function detectChaptersByOracle(apiKey, fullText) {
  // 25000 chars (up from the original 6000) - real evidence showed this
  // book's front matter alone (title page, table of contents, AND an
  // expanded per-chapter topic-summary section) ran well past 6000 chars.
  // Still a prefix, not the whole book - a genuine limit, not a
  // guaranteed-sufficient window for every book's front matter length.
  const prefix = fullText.slice(0, 25000);
  const prompt = 'This is the beginning of a book, likely including front matter (title page, table of contents, possibly an expanded per-chapter topic/summary index).\n\n' +
    'TEXT:\n' + prefix + '\n\n' +
    'List the book\'s REAL chapters in reading order. Two decoys to watch for and NOT use: (1) the table of contents itself, which lists every chapter by number and title but is not the chapter; (2) some books also have an expanded "chapter summary" or topic-index section listing sub-topics per chapter - also not the real chapter.\n\n' +
    'For each REAL chapter, give an EXACT short string (8-12 words) copied verbatim from the START OF THE CHAPTER\'S OWN OPENING PARAGRAPH - actual prose, not the heading/title text itself, since the heading text also appears in the table of contents and would match the wrong location.\n\n' +
    'Return ONLY JSON: {"chapters": [{"title": "...", "searchString": "..."}]}';

  const reply = await callClaude(apiKey, [{ role: 'user', content: prompt }], '', 1500);
  const jsonMatch = reply.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Oracle chapter-detection returned no JSON');
  const parsed = JSON.parse(jsonMatch[0]);
  const chapters = (parsed.chapters || []).map(function (c) {
    const offset = fullText.indexOf(c.searchString);
    return { offset: offset >= 0 ? offset : null, title: c.title };
  }).filter(function (c) { return c.offset !== null; });
  return chapters;
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
    if (!url) throw new Error('No URL provided');

    const fullText = await fetchFullText(url);

    // Oracle-primary as of the 3rd hand-test round (see detectChaptersByOracle
    // above for why) - regex is now only a fallback for when the Oracle call
    // itself fails outright or returns too few chapters to be useful.
    let boundaries;
    try {
      boundaries = await detectChaptersByOracle(apiKey, fullText);
      if (boundaries.length < 2) boundaries = detectChaptersByRegex(fullText);
    } catch (e) {
      console.warn('Bookworm: Oracle chapter-detection failed, falling back to regex:', e.message);
      boundaries = detectChaptersByRegex(fullText);
    }
    if (boundaries.length < 1) {
      throw new Error('Could not detect any chapter boundaries in this book');
    }
    boundaries = dropClusteredBoundaries(boundaries);

    const sliced = boundaries.map(function (b, i) {
      const end = (i + 1 < boundaries.length) ? boundaries[i + 1].offset : fullText.length;
      return { title: b.title, text: fullText.slice(b.offset, end).trim() };
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
        sliced[i + 1] = { title: sliced[i + 1].title, text: sliced[i].text + '\n\n' + sliced[i + 1].text };
        continue;
      }
      merged.push(sliced[i]);
    }
    const chapters = merged.map(function (c, i) { return { index: i, title: c.title, text: c.text }; });

    return res.status(200).json({
      success: true,
      title: guessTitleFromURL(url),
      chapters: chapters
    });
  } catch (err) {
    console.error('Bookworm fetch error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
