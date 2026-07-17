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
//    whitespace, continuous prose is not. This alone won't be perfect for
//    every PDF's formatting, which is why the caller falls back to
//    detectChaptersByOracle() below whenever the regex result still looks
//    implausible (see MAX_PLAUSIBLE_CHAPTERS in the handler).
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

// Fallback when regex finds too few boundaries (< 2) - ask Oracle to read
// a prefix of the text (enough to usually cover a table of contents) and
// propose a chapter list with a short exact search string per chapter so
// we can still locate it via indexOf in the full text.
async function detectChaptersByOracle(apiKey, fullText) {
  const prefix = fullText.slice(0, 6000);
  const prompt = 'This is the beginning of a book (possibly including a table of contents).\n\n' +
    'TEXT:\n' + prefix + '\n\n' +
    'List the book\'s chapters in order. For each, give an EXACT short string (5-10 words) that would appear at the very start of that chapter in the full text, so it can be located with a plain text search - not a paraphrase, the literal heading text if you can identify it.\n\n' +
    'Return ONLY JSON: {"chapters": [{"title": "...", "searchString": "..."}]}';

  const reply = await callClaude(apiKey, [{ role: 'user', content: prompt }], '', 800);
  const jsonMatch = reply.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Oracle chapter-detection returned no JSON');
  const parsed = JSON.parse(jsonMatch[0]);
  const chapters = (parsed.chapters || []).map(function (c) {
    const offset = fullText.indexOf(c.searchString);
    return { offset: offset >= 0 ? offset : null, title: c.title };
  }).filter(function (c) { return c.offset !== null; });
  return chapters;
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

    // 40 is a deliberately generous ceiling - real books occasionally run
    // 30+ chapters, but 87 (the count that surfaced the mid-sentence false-
    // positive bug above) is well past what a regex heuristic should be
    // trusted for. Past this point, prefer Oracle's semantic read of the
    // text over more pattern-matching.
    const MAX_PLAUSIBLE_CHAPTERS = 40;
    let boundaries = detectChaptersByRegex(fullText);
    if (boundaries.length < 2 || boundaries.length > MAX_PLAUSIBLE_CHAPTERS) {
      boundaries = await detectChaptersByOracle(apiKey, fullText);
    }
    if (boundaries.length < 1) {
      throw new Error('Could not detect any chapter boundaries in this book');
    }
    boundaries.sort(function (a, b) { return a.offset - b.offset; });

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
