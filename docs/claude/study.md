# Study and Bookworm — sub-file of the Knowledge hub (`docs/claude/knowledge.md`)
Modules `studyHub`, `bookworm`, `recall` (domain knowledge). Facts only; stories in `patch_notes.html`.

## Study (`studyHub`)
- Knowledge page `/study`, AWS AI Practitioner first: 18 lessons, 300 questions; `study/aws-aif-c01/*.json` is the source, synced into `study_questions` on open. Quick 10/topic/mock/flash/Redo; wrong answers on Recall's schedule; `xp_on_study` (+2 Scholar per correct, max 30/day). [story](../../patch_notes.html#card-2026-10-20-study-aws)

## Bookworm
- Large chapter text goes through `phylumPath._condenseIfLarge()` before the cap in `_analyzeChapter()`; background analysis `_continueAnalyzingInBackground` with `analysis_complete`. New books via `bookworm._createBookFromExtraction()` (raw fetch, `return=representation`). PDF.js loads at runtime via `_ensurePdfJs()`.
- Credit-exhaustion auto-resume covers only a cascade's first placement attempt per phylum, not reword/upgrade sub-calls inside `_placeInsightCascade`.
- Tables: `bookworm_books`, `bookworm_chapters`, `bibliography` (consolidated into Chronicles), all written through `/api/data-write`.
- Worm family: Videoworm (built, see content.md), MusicWorm (identity exists), Articleworm (not built).
- Video write-ups: `encyclopediaPosts.ui.openByUrl(url, onMissing)` matches `encyclopedia.source_url`; used by the Life Library video button (📖 Read the write-up) and the Videoworm insight row (📖 Read the full write-up). [UD-1](../../patch_notes.html#card-2026-10-27-ui-debloat-1)
