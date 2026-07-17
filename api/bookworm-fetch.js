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
function detectChaptersByRegex(fullText) {
  const pattern = /^[ \t]*(chapter\s+(\d+|[ivxlcdm]+)|ch\.\s*\d+)\s*[:\-.]?\s*(.{0,80})?$/gim;
  const matches = [];
  let m;
  while ((m = pattern.exec(fullText)) !== null) {
    const title = (m[3] || '').trim();
    matches.push({
      offset: m.index,
      title: title ? (m[1] + ': ' + title).trim() : m[1].trim()
    });
  }
  return matches;
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

    let boundaries = detectChaptersByRegex(fullText);
    if (boundaries.length < 2) {
      boundaries = await detectChaptersByOracle(apiKey, fullText);
    }
    if (boundaries.length < 1) {
      throw new Error('Could not detect any chapter boundaries in this book');
    }
    boundaries.sort(function (a, b) { return a.offset - b.offset; });

    const chapters = boundaries.map(function (b, i) {
      const end = (i + 1 < boundaries.length) ? boundaries[i + 1].offset : fullText.length;
      return { index: i, title: b.title, text: fullText.slice(b.offset, end).trim() };
    }).filter(function (c) { return c.text.length > 0; });

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
