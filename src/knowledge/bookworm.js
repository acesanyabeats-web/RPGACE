
/* ===MODULE:bookworm=== */
// BOOKWORM — July 17. Whole-book ingestion, chapter by chapter, into
// Phylum Path. Spec locked after several rounds of real correction from
// the user (see bookworm_spec_backlog.txt at repo root - the durable
// record kept specifically because a first attempt at this substituted
// recommended defaults for the user's actual answers, which was wrong).
//
// Flow: paste a book's URL once -> api/bookworm-fetch.js does ONE
// uncapped Jina fetch + detects chapter boundaries + slices every
// chapter's text in that same pass (this is what makes the total
// chapter count, and therefore a real progress bar, known immediately -
// not discovered chapter by chapter). Chapters are then processed one
// at a time: read the chapter text -> extract every distinct insight ->
// find each insight's most-related phylum, cascading through the other
// enabled phyla for anything that doesn't fit, then a final broad
// 21-phylum search for genuine orphans -> Council-of-5 confidence score
// (1-10) on every placement before showing it, rewording+retrying
// insights that land in the mediocre 5-8 band, flagging (not forcing)
// anything under 4 -> user reviews each insight one at a time (read
// once per chapter, then per-insight: summary, path, justification,
// Approve/Reject/Edit) -> once every chapter is done, the book lands in
// the Bibliography section on the Research page.
//
// Reuses phylumPath's existing Oracle-calling helpers (_callExtractor,
// _callGroundWorkerJSON, _callGroundWorkerText) and its chained-insert
// pattern (_insertNewSteps) rather than duplicating that plumbing.
RPGACE.register('bookworm', {
  domain: 'knowledge',
  // G53 (Aug 2026) — real, ratified /CEO plan item, module 3 of 4 in the
  // pilot (after videoPipeline and beatLog): this module is split into two
  // internal namespaces, `ui` (rendering/DOM) and `logic` (business
  // logic/data), following the exact shape those two already shipped and
  // verified. Pure internal-structure refactor — zero functional,
  // behavioural, UX, data or schema change; every function below was MOVED
  // wholesale, never rewritten or split down the middle.
  //
  // Shared constants + transient state (TRIGGER_PREFIXES / _chapterWriteQueue
  // / _leafQueue) stay at module scope, and `init` stays a literal top-level
  // function because RPGACE.register() calls `module.init()` directly and
  // cannot see into a sub-object.
  //
  // The one real risk this split has to get right, function by function: a
  // function moved into `ui`/`logic` is invoked with `this` bound to THAT
  // sub-object, not the module. Every moved function that used to open with
  // `var self = this;` now opens with `var self = RPGACE.modules.bookworm;`,
  // and every cross-namespace call is explicitly qualified `self.ui.X` /
  // `self.logic.X` (module-scope properties stay bare: `self.TRIGGER_PREFIXES`,
  // `self._chapterWriteQueue`, `self._leafQueue`). 11 of the 40 moved
  // functions never referenced `this`/`self` at all and are byte-identical
  // moves (verified by de-indenting each new body and diffing it against the
  // original, not asserted): _ensurePdfJs, _ensureEpubJs, _goToDashboard,
  // _resolveEpubPath, _parseEpubXml, _phylumListForPrompt,
  // _chunkTextForFormatting, _looksLikeTableOfContents, _decidePlacementScored,
  // _rewordInsight, _checkUpgradeable. The other 29 needed the self-pin and/or
  // a namespace qualification, and nothing else.
  // One moved function needed a second, related fix rather than the standard
  // one: `_finalPlacementSearch` was the only function in the module reaching
  // the module through a bare `this.` inside a `.bind(this)` callback — it now
  // pins `self` like every other function and calls
  // `self.logic._decidePlacementScored(...)`, and the `.bind(this)` (which
  // existed solely to make that one `this` reachable) went with the reference
  // it served. Nothing else in the module used `this` to reach the module —
  // the only other `this` in the file's bookworm block, `origSend.apply(this,
  // arguments)` inside _patchChatTrigger's window.sendChat wrapper, is the
  // CALLER's `this` and was deliberately left untouched.
  //
  // Classification rule used (stated so a later reader can check it rather
  // than guess): a function lives in `ui` if it constructs or discovers LIVE
  // PAGE DOM (document.*, createElement/getElementById/querySelector on the
  // real page, innerHTML on a page node); otherwise in `logic`. Two real
  // refinements to that rule were needed here and are named rather than
  // applied silently:
  //   • `_startBookFromEPUB` / `_parseEpubXml` are `logic` despite calling
  //     querySelectorAll/createTextNode, because those run against a DETACHED
  //     `new DOMParser()` document (the code's own comment says so) — that is
  //     text extraction, not rendering, and their PDF sibling
  //     `_startBookFromPDF` is unambiguously logic. Splitting the two apart
  //     would have been worse than the rule it obeyed.
  //   • `_goToDashboard` is `ui` even though it contains no DOM marker at
  //     all: its whole body is a live page-navigation call into main.js's own
  //     `showPage()` global, i.e. real DOM work done through a helper. A
  //     mechanical grep for the marker list would not have placed it there.
  //   • `_ensurePdfJs` / `_ensureEpubJs` are `ui` on the literal rule — they
  //     genuinely mutate the live document (`document.createElement('script')`
  //     + `document.head.appendChild`) — even though they render nothing.
  //
  // Three moved functions are genuinely mixed (real live-DOM construction AND
  // a real persistent write in the same body) and landed in `ui` on the
  // dominant-side basis rather than being split down the middle. Verified by
  // direct grep, not asserted: these are the only 3 of the 14 real `ui`
  // functions containing a real `RPGACE.sb.secureWrite` or
  // `phylumPath._insertNewSteps` call —
  //   • `_refreshWidget` (the 🗑 delete button's real bookworm_books delete),
  //   • `_renderAddChapterText` (the Save button's real bookworm_chapters
  //     raw_text update),
  //   • `_renderInsightReview` (the Edit path's real taxonomy_tree write via
  //     phylumPath._insertNewSteps).

  TRIGGER_PREFIXES: ['bookworm:', 'study this book:'],

  // UI14 Phase 1 (Sep 2026) — a real, module-scope one-shot suppression
  // flag. showPage() ALWAYS fires a real 'page:show' hook, even when the
  // named page is already active (confirmed by direct read of the
  // showPage wrap at rpgace_core.js's own FUNCTION WRAPPERS section) — so
  // ui._showReader's own call to dashDeck._openPage('bookworm-widget')
  // (needed to land on #page-bookworm for real when entering the reader
  // from OUTSIDE it, e.g. a dashboard glance item or UI12's Resume
  // button) would otherwise immediately re-trigger the page:show listener
  // below and undo the very reader state _showReader is in the middle of
  // setting up. Set true right before that one call, read-and-cleared by
  // the listener itself — real, deterministic, not a guessed timing fix.
  _bookwormPageShowSuppress: false,

  // July 23 — _injectBibliographySection() used to also run unconditionally
  // 1700ms after every boot AND on every page:show->research, regardless of
  // active tab - one of the real contributors found to the reported 12-23s
  // freeze. The dashboard widget stays exactly as it was (it's not a
  // research-tab thing); the bibliography section is now gated behind
  // researchTabs' 'research:tab-active' hook, key 'biblio'.
  // CC-2: how much of a chapter goes to Orchestrator CC (whole chapter up to this).
  CC_CHAPTER_CHARS: 60000,

  init: function() {
    var self = this;
    // 'rpgace:ready' has always already fired by the time init() runs
    // (hooks.fire uses forEach; a mid-fire listener never gets revisited).
    RPGACE.registerBootTask(function() {
      self._injectDashboardWidget();
      self._patchChatTrigger();
    });
    if (RPGACE.modules.orchestratorCC) {
      RPGACE.modules.orchestratorCC.logic.registerType('bookworm_chapter_extract', {
        apply: function(parsed, row) { return self.logic._ccApply(parsed, row); },
        api: function(row) { return self.logic._ccApi(row); },
      });
    }
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.dashboard) self._injectDashboardWidget();
    });
    RPGACE.hooks.on('research:tab-active', function(key) {
      if (key === 'biblio') self._injectBibliographySection();
    });
    // UI14 Phase 1 (Sep 2026) — real reset for the book-reading flow's
    // own permanent #bookworm-reader container: a GENUINE fresh arrival
    // at Bookworm's picker (via a real nav button, not one of
    // _showReader's own internal page-anchoring calls) should always show
    // the picker, never a stale reading view left over from a prior
    // visit. The suppress flag is the one real signal that tells the two
    // apart — see its own module-scope comment above for why it exists.
    RPGACE.hooks.on('page:show', function(name) {
      if (name !== RPGACE.CONFIG.pages.bookworm) return;
      if (self._bookwormPageShowSuppress) { self._bookwormPageShowSuppress = false; return; }
      var reader = document.getElementById('bookworm-reader');
      if (reader) reader.style.display = 'none';
      var widget = document.getElementById('bookworm-widget');
      if (widget) widget.style.display = '';
    });
  },

  // ============================================================
  // logic — business logic/data. No live-page DOM construction or
  // lookup. Kept in the same relative order as before the split.
  // ============================================================
  logic: {

    // ── Start a new book: fetch + detect + slice chapters, create rows ──
    // Fixed July 17: RPGACE.sb.insert() sends 'Prefer: return=minimal' and
    // never parses the response as JSON (see RPGACE.sb definition) - it
    // returns the raw, unparsed fetch Response, not the inserted row. Using
    // it here meant book.id was always undefined, so every chapter insert
    // was silently sent with book_id: undefined - failing the NOT NULL
    // constraint server-side while the client never checked the response
    // status, so nothing ever surfaced as an error. Confirmed live: 2 real
    // book rows existed with 0 chapters each, both silently flipped to
    // "complete" the moment _openBook() found no chapter at index 0 (see
    // the fixed logic below). Now uses raw fetch with the same
    // 'Prefer: return=representation' pattern already established by
    // phylumPath._insertNewSteps()/_acceptConceptFusion() for exactly this
    // reason, and checks response.ok at every write instead of assuming
    // success.
    _startBook: function(url) {
      var self = RPGACE.modules.bookworm;
      return fetch('/api/bookworm-fetch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url, phylumList: self.logic._phylumListForPrompt() })
      }).then(function(r) { return r.json(); })
        .then(function(result) { return self.logic._createBookFromExtraction(result, url); });
    },

    // Uploaded-PDF entry point - for a legitimately purchased ebook sitting
    // on the user's own device with no fetchable URL. Extracts text
    // entirely client-side via PDF.js (dynamically loaded, never bundled
    // into index.html's own script tags - see _ensurePdfJs), then runs it
    // through the exact same /api/bookworm-fetch detection pipeline as a
    // URL fetch, just skipping the Jina step since the text is already in
    // hand. Real risk, not hidden: PDF text extraction quality depends on
    // how the PDF itself was produced (a scanned/image-only PDF won't
    // extract any real text this way, only a text-layer PDF will).
    _startBookFromPDF: function(title, file) {
      var self = RPGACE.modules.bookworm;
      return self.ui._ensurePdfJs().then(function(pdfjsLib) {
        return file.arrayBuffer().then(function(buffer) {
          return pdfjsLib.getDocument({ data: buffer }).promise.then(function(pdf) {
            var pageTextPromises = [];
            for (var i = 1; i <= pdf.numPages; i++) {
              pageTextPromises.push(pdf.getPage(i).then(function(page) {
                return page.getTextContent().then(function(content) {
                  return content.items.map(function(item) { return item.str; }).join(' ');
                });
              }));
            }
            return Promise.all(pageTextPromises);
          });
        }).then(function(pageTexts) {
          var fullText = pageTexts.join('\n\n');
          if (!fullText || fullText.length < 200) throw new Error('Could not extract readable text from this PDF - it may be a scanned/image-only file');
          return fetch('/api/bookworm-fetch', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullText: fullText, title: title, phylumList: self.logic._phylumListForPrompt() })
          }).then(function(r) { return r.json(); });
        });
      }).then(function(result) { return self.logic._createBookFromExtraction(result, 'uploaded-pdf'); });
    },

    // Resolves an EPUB manifest href (relative to the OPF file's own folder)
    // into a real zip entry path: strips any #fragment, percent-decodes it
    // (zip entry names are literal, hrefs are URI-escaped), and collapses
    // ./ and ../ segments, which real EPUBs genuinely use (e.g. an OPF in
    // OEBPS/ pointing at ../Text/ch1.xhtml).
    _resolveEpubPath: function(baseDir, href) {
      var clean = String(href || '').split('#')[0].split('?')[0];
      try { clean = decodeURIComponent(clean); } catch (e) { /* keep as-is if not valid escaping */ }
      if (!clean) return '';
      if (clean.charAt(0) === '/') return clean.replace(/^\/+/, '');
      var parts = (baseDir ? baseDir.split('/') : []).concat(clean.split('/'));
      var out = [];
      parts.forEach(function(seg) {
        if (!seg || seg === '.') return;
        if (seg === '..') { out.pop(); return; }
        out.push(seg);
      });
      return out.join('/');
    },

    // Parses one XML/XHTML string with the browser's own DOMParser and fails
    // loud on a real parse error rather than returning a document whose only
    // content is the browser's error message.
    _parseEpubXml: function(text, mime) {
      var doc = new DOMParser().parseFromString(text, mime);
      if (doc.getElementsByTagName('parsererror').length) throw new Error('Malformed XML inside this EPUB');
      return doc;
    },

    // Uploaded-EPUB entry point - the exact sibling of _startBookFromPDF
    // above, for a legitimately purchased ebook in EPUB form. An EPUB is a
    // ZIP archive: META-INF/container.xml names the OPF manifest, the OPF's
    // <manifest>/<spine> give the real reading order of its XHTML content
    // files, and each of those is parsed to plain text with DOMParser
    // (never a regex tag-strip). The concatenated text then runs through the
    // exact same /api/bookworm-fetch detection pipeline as a URL fetch or a
    // PDF upload. Real risk, not hidden - the same class of honest caveat
    // _startBookFromPDF states for scanned PDFs: EPUB structure genuinely
    // varies between producers (non-standard manifests/spine orderings can
    // extract in an unexpected order), and a DRM-protected EPUB has no
    // readable text to extract at all.
    _startBookFromEPUB: function(title, file) {
      var self = RPGACE.modules.bookworm;
      return self.ui._ensureEpubJs().then(function(JSZip) {
        return file.arrayBuffer()
          .then(function(buffer) { return JSZip.loadAsync(buffer); })
          .then(function(zip) {
            var containerEntry = zip.file('META-INF/container.xml');
            if (!containerEntry) throw new Error('Not a valid EPUB - no META-INF/container.xml inside');
            return containerEntry.async('string').then(function(containerXml) {
              var containerDoc = self.logic._parseEpubXml(containerXml, 'application/xml');
              // getElementsByTagNameNS('*', ...) matches on local name in any
              // namespace - real EPUBs vary between default namespaces and
              // explicit prefixes (<opf:package>), and a plain tag-name
              // lookup silently misses the prefixed ones.
              var rootfile = containerDoc.getElementsByTagNameNS('*', 'rootfile')[0];
              var opfPath = rootfile && rootfile.getAttribute('full-path');
              if (!opfPath) throw new Error('Could not find this EPUB\'s content manifest (OPF)');
              var opfEntry = zip.file(opfPath);
              if (!opfEntry) throw new Error('This EPUB\'s manifest is missing: ' + opfPath);
              var baseDir = opfPath.indexOf('/') === -1 ? '' : opfPath.slice(0, opfPath.lastIndexOf('/'));
              return opfEntry.async('string').then(function(opfXml) {
                var opfDoc = self.logic._parseEpubXml(opfXml, 'application/xml');
                var hrefById = {};
                var items = opfDoc.getElementsByTagNameNS('*', 'item');
                for (var i = 0; i < items.length; i++) {
                  var id = items[i].getAttribute('id');
                  var href = items[i].getAttribute('href');
                  if (id && href) hrefById[id] = href;
                }
                var order = [];
                var refs = opfDoc.getElementsByTagNameNS('*', 'itemref');
                for (var j = 0; j < refs.length; j++) {
                  var idref = refs[j].getAttribute('idref');
                  if (idref && hrefById[idref]) order.push(self.logic._resolveEpubPath(baseDir, hrefById[idref]));
                }
                // Fallback for an EPUB with a broken/empty spine: fall back to
                // every XHTML item in raw manifest order rather than giving up.
                if (!order.length) {
                  Object.keys(hrefById).forEach(function(k) {
                    if (/\.x?html?$/i.test(hrefById[k])) order.push(self.logic._resolveEpubPath(baseDir, hrefById[k]));
                  });
                }
                if (!order.length) throw new Error('No readable content files found in this EPUB');
                return order;
              }).then(function(paths) {
                // Sequential, not Promise.all - keeps reading order guaranteed
                // and avoids holding every decompressed chapter in memory at
                // once for a large book.
                var texts = [];
                var chain = Promise.resolve();
                paths.forEach(function(p) {
                  chain = chain.then(function() {
                    var entry = zip.file(p);
                    if (!entry) return; // a spine entry pointing at a missing file - skip, don't abort the book
                    return entry.async('string').then(function(html) {
                      var doc = new DOMParser().parseFromString(html, 'text/html');
                      var body = doc.body || doc.documentElement;
                      if (!body) return;
                      // .textContent alone runs block elements straight into each
                      // other ("<h1>Chapter One</h1><p>Alpha..." comes out as
                      // "Chapter OneAlpha...") - confirmed in real headless
                      // Chromium, not assumed. That would corrupt exactly the
                      // heading/paragraph boundaries the chapter-detection
                      // pipeline downstream reads, so block ends and <br>s become
                      // real newlines first. The parsed doc is detached from the
                      // page, so mutating it costs nothing and affects nothing.
                      Array.prototype.forEach.call(body.querySelectorAll('script,style'), function(el) { el.remove(); });
                      Array.prototype.forEach.call(body.querySelectorAll('br'), function(el) {
                        if (el.parentNode) el.parentNode.replaceChild(doc.createTextNode('\n'), el);
                      });
                      Array.prototype.forEach.call(body.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li,tr,td,th,dd,dt,section,article,blockquote,pre,figcaption'), function(el) {
                        el.appendChild(doc.createTextNode('\n'));
                      });
                      var text = body.textContent || '';
                      text = text.replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
                      if (text) texts.push(text);
                    }).catch(function(e) {
                      console.warn('[bookworm] EPUB content file failed, skipping: ' + p, e.message);
                    });
                  });
                });
                return chain.then(function() { return texts; });
              });
            });
          }).then(function(texts) {
            var fullText = texts.join('\n\n');
            if (!fullText || fullText.length < 200) throw new Error('Could not extract readable text from this EPUB - it may be DRM-protected or contain only images');
            return fetch('/api/bookworm-fetch', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fullText: fullText, title: title, phylumList: self.logic._phylumListForPrompt() })
            }).then(function(r) { return r.json(); });
          });
      }).then(function(result) { return self.logic._createBookFromExtraction(result, 'uploaded-epub'); });
    },

    _phylumListForPrompt: function() {
      var pp = RPGACE.modules.phylumPath;
      return pp.ENABLED_PHYLA.map(function(n) { return n + '. ' + RPGACE.utils.phylumContext(n); }).join('\n');
    },

    // Shared by _startBook (URL) and _startBookFromPDF (upload) - both hit
    // the same /api/bookworm-fetch detection pipeline and land here with
    // an identical result shape (chapters already have real text, plus
    // keywords/suggestedPhylum from Function 1's guidance). One insert
    // path, one confirmation screen, regardless of source.
    _createBookFromExtraction: function(result, sourceUrl) {
      var self = RPGACE.modules.bookworm;
      if (result.error) throw new Error(result.error);
      if (!result.chapters || !result.chapters.length) throw new Error('No chapters detected in this book');
      var pp = RPGACE.modules.phylumPath;
      // Surfaces api/bookworm-fetch.js's server-side gap-detection retry
      // (added July 17, same self-healing pattern as _startBookFromTOC's
      // client-side check) - the retry already ran server-side; this just
      // makes any still-unresolved gap visible instead of silently proceeding.
      if (result.warning) {
        RPGACE.utils.toast(result.warning, '#E2A83D', 8000);
      }

      // RI-2: ask which realms this book is for before saving it.
      var bwRealms = [];
      return RPGACE.realmPicker.pick({ what: 'book', title: result.title }).then(function(r) {
        bwRealms = r || [];
        return RPGACE.sb.secureWrite('bookworm_books', 'insert', { title: result.title, source_url: sourceUrl, current_chapter_index: 0, status: 'in_progress', realms: bwRealms });
      })
      .then(function(bookRows) {
        var book = Array.isArray(bookRows) ? bookRows[0] : bookRows;
        if (!book || !book.id) throw new Error('Book creation did not return an id');
        // Oct 13 2026 (LL-2): every book starts as a Life Library item
        // (Library = what you took in; Bookworm keeps chapters + progress).
        // Not awaited: a library hiccup must never block reading the book.
        var lib = RPGACE.modules.lifeLibrary;
        if (lib) lib.logic.add({ kind: 'book', title: result.title, url: /^https?:\/\//i.test(sourceUrl || '') ? sourceUrl : '',
          source_table: 'bookworm_books', source_id: book.id, realms: bwRealms })
          .catch(function(e) { RPGACE.utils.toast('Book saved, but not added to the Life Library: ' + (e && e.message || e), '#E2A83D', 5000); });

        var chapterRows = result.chapters.map(function(c) {
          return {
            book_id: book.id, chapter_index: c.index, chapter_title: c.title, raw_text: c.text, status: 'pending',
            keywords: c.keywords || [], suggested_phylum: pp.isEnabled(c.suggestedPhylum) ? c.suggestedPhylum : null
          };
        });
        return RPGACE.sb.secureWrite('bookworm_chapters', 'insert', chapterRows)
        .then(function(insertedChapters) {
          if (!insertedChapters || !insertedChapters.length) throw new Error('Chapters did not save correctly');
          self.ui._refreshWidget();
          self.ui._renderStructureFound(book, insertedChapters);
        });
      });
    },

    // TOC-first manual entry - for a physical/owned book with no fetchable
    // URL. Same idea as detectChaptersByOracle() does for a fetched book's
    // front matter, just applied to text the user pastes directly instead
    // of a Jina fetch: Oracle extracts the ordered chapter list from the
    // table of contents, so the total count (and a real progress bar) is
    // known upfront exactly like a URL-fetched book - the only difference
    // is each chapter's raw_text starts empty and gets filled in one at a
    // time as the user provides it (see _renderAddChapterText).
    // Function 1 — Analyze Book Structure. Extended per direct request:
    // beyond just the chapter list, also extracts per-chapter keywords and
    // a best-guess phylum, giving _analyzeChapter() (Function 2) a real
    // head start instead of re-deriving "which phylum" from scratch once
    // per chapter - the two functions share this data on purpose rather
    // than working in isolation.
    _startBookFromTOC: function(title, tocText) {
      var self = RPGACE.modules.bookworm;
      var pp = RPGACE.modules.phylumPath;
      var phylumList = pp.ENABLED_PHYLA.map(function(n) { return n + '. ' + RPGACE.utils.phylumContext(n); }).join('\n');
      var prompt = 'This is a table of contents pasted from a physical book, listing chapter titles/headings/sub-headings (and likely page numbers/dot leaders to ignore).\n\n' +
        'TEXT:\n' + tocText + '\n\n' +
        'Extract the ordered list of REAL chapters (not sub-sections within a chapter, unless the contents page only lists sub-sections - use your judgement on what the actual chapter-level breakdown is). CRITICAL: every top-level "Chapter N" entry you can find MUST get its own output entry, with no gaps in the chapter numbers - never drop or merge a numbered chapter just because you are unsure whether it is "substantial enough", and never silently skip one to save space. If you are running low on output room, shorten titles/keywords first - never shorten the LIST of chapters. For each chapter, also give: 3-6 keywords drawn from that chapter\'s heading/sub-heading text, and a best-guess phylum number from the list below based on those keywords (this is just a starting hint for later insight placement, not a final decision).\n\n' +
        'PHYLA:\n' + phylumList + '\n\n' +
        'Return ONLY JSON: {"chapters": [{"title": "...", "keywords": ["...", "..."], "suggestedPhylum": N}]}';
      // Defensive count check (real bug found July 17: 19 of 26 real chapters
      // came back as valid-looking JSON, 7 missing, scattered not a tail
      // cutoff - the model was silently judging some numbered chapters as
      // "not real chapters" rather than hitting a hard token limit). Scan the
      // raw pasted text for explicit "Chapter N" mentions as a floor - if the
      // model returned meaningfully fewer chapters than that, fail loud
      // instead of silently proceeding with a partial book (rule: never
      // silently swallow a failed/partial result).
      var mentionedNumbers = {};
      var chNumPattern = /chapter\s+(\d+)/gi;
      var cm;
      while ((cm = chNumPattern.exec(tocText)) !== null) { mentionedNumbers[cm[1]] = true; }
      var mentionedCount = Object.keys(mentionedNumbers).length;

      function numbersFoundIn(list) {
        var found = {};
        list.forEach(function(c) {
          var m = /chapter\s+(\d+)/i.exec(c.title || '');
          if (m) found[m[1]] = true;
        });
        return found;
      }
      function chapterNumOf(c) {
        var m = /chapter\s+(\d+)/i.exec(c.title || '');
        return m ? parseInt(m[1], 10) : NaN;
      }

      function commitChapters(finalChapters, stillMissing) {
        // Order by parsed chapter number where every chapter parsed cleanly
        // (a targeted retry can append entries out of original order) -
        // falls back to as-returned order if numbers can't be parsed
        // reliably, rather than risk a wrong sort on unnumbered titles.
        var allParsed = finalChapters.every(function(c) { return !isNaN(chapterNumOf(c)); });
        if (allParsed) {
          finalChapters = finalChapters.slice().sort(function(a, b) { return chapterNumOf(a) - chapterNumOf(b); });
        }
        if (stillMissing.length) {
          RPGACE.utils.toast('Heads up: chapter(s) ' + stillMissing.join(', ') + ' from this table of contents could not be extracted, even after a retry. Check the list below carefully before starting - you may need to add any missing chapter manually later.', '#E2A83D', 8000);
        }

        // RI-2: ask which realms this book is for before saving it.
        return RPGACE.realmPicker.pick({ what: 'book', title: title }).then(function(r) {
          return RPGACE.sb.secureWrite('bookworm_books', 'insert', { title: title, source_url: 'manual', current_chapter_index: 0, status: 'in_progress', realms: r || [] });
        })
        .then(function(bookRows) {
          var book = Array.isArray(bookRows) ? bookRows[0] : bookRows;
          if (!book || !book.id) throw new Error('Book creation did not return an id');

          var chapterRows = finalChapters.map(function(c, i) {
            return {
              book_id: book.id, chapter_index: i, chapter_title: c.title, raw_text: '', status: 'pending',
              keywords: c.keywords || [], suggested_phylum: pp.isEnabled(c.suggestedPhylum) ? c.suggestedPhylum : null
            };
          });
          return RPGACE.sb.secureWrite('bookworm_chapters', 'insert', chapterRows)
          .then(function(insertedChapters) {
            if (!insertedChapters || !insertedChapters.length) throw new Error('Chapters did not save correctly');
            self.ui._refreshWidget();
            self.ui._renderStructureFound(book, insertedChapters);
          });
        });
      }

      return pp._callGroundWorkerJSON(prompt, 3000).then(function(parsed) {
        var chapters = parsed.chapters || [];
        if (!chapters.length) throw new Error('Could not extract any chapters from that table of contents');

        var missing = Object.keys(mentionedNumbers).filter(function(n) { return !numbersFoundIn(chapters)[n]; });
        if (!mentionedCount || !missing.length) return commitChapters(chapters, []);

        // Self-healing retry (added July 17, alongside the count-check toast):
        // rather than just warning and leaving Alex to notice and manually
        // fix a shortfall, ask the model specifically for the chapter
        // numbers it missed on the first pass and merge the result in - one
        // targeted retry costs far less than a full re-paste, and per the
        // project's "fail loud, don't silently proceed with a partial
        // result" rule the toast still fires if the retry itself comes up
        // short.
        var retryPrompt = 'Same table of contents as before:\n\nTEXT:\n' + tocText + '\n\n' +
          'On a first extraction pass, chapter number(s) ' + missing.join(', ') + ' were missed entirely. Re-scan the text specifically for those chapter numbers and return an entry for each one you can genuinely find (only omit a number if it truly does not appear in this text at all - double check before omitting). Same fields as before: title, 3-6 keywords, suggestedPhylum.\n\n' +
          'PHYLA:\n' + phylumList + '\n\n' +
          'Return ONLY JSON: {"chapters": [{"title": "...", "keywords": ["...", "..."], "suggestedPhylum": N}]}';
        return pp._callGroundWorkerJSON(retryPrompt, 1200).then(function(retryParsed) {
          var merged = chapters.concat(retryParsed.chapters || []);
          var stillMissing = missing.filter(function(n) { return !numbersFoundIn(merged)[n]; });
          return commitChapters(merged, stillMissing);
        }).catch(function() {
          // Retry call itself failed (network/parse) - proceed with the
          // original list rather than blocking book creation entirely, but
          // still warn honestly that the gap is unresolved.
          return commitChapters(chapters, missing);
        });
      });
    },

    // ── Re-entry point: clicking a book card shows its full chapter list ──
    // (added July 19, per direct request) - every chapter, its real status
    // (reuses the existing bookworm_chapters.status field, already tracked
    // for every chapter regardless of source), clickable straight to any
    // chapter rather than being forced through them in strict order.
    // Internal "keep going" flows (finishing a chapter, saving a chapter's
    // pasted text, starting a fresh book) still want the OLD behavior -
    // jump straight into whatever the current checkpoint is - so that logic
    // is kept separately as _openCurrentChapter, called by those flows
    // instead of this one.
    _openBook: function(bookId) {
      var self = RPGACE.modules.bookworm;
      RPGACE.sb.select('bookworm_books', 'id=eq.' + bookId + '&limit=1').then(function(rows) {
        var book = rows && rows[0];
        if (!book) return;
        RPGACE.sb.select('bookworm_chapters', 'book_id=eq.' + bookId + '&order=chapter_index.asc')
          .then(function(allChapters) {
            allChapters = allChapters || [];
            if (!allChapters.length) {
              RPGACE.utils.toast('This book has no chapters stored - something went wrong when it was created. Delete it and try again.', '#CC4A4A', 5500);
              return;
            }
            self.ui._renderChapterList(book, allChapters);
          });
      });
    },

    // ── Open a book at its current checkpoint (internal "keep going" use ──
    // only - see _openBook above for the click-a-book-card entry point).
    // Fetches ALL of this book's chapters once (not just the current one)
    // so a genuine zero-chapters book (only possible via the bug above, now
    // fixed - kept as a defensive check) can be told apart from having
    // legitimately finished every chapter. Previously both cases looked
    // identical (no chapter row at the current index), so a broken book
    // silently got marked "complete" instead of surfacing an error.
    _openCurrentChapter: function(bookId) {
      var self = RPGACE.modules.bookworm;
      RPGACE.sb.select('bookworm_books', 'id=eq.' + bookId + '&limit=1').then(function(rows) {
        var book = rows && rows[0];
        if (!book) return;
        RPGACE.sb.select('bookworm_chapters', 'book_id=eq.' + bookId + '&order=chapter_index.asc')
          .then(function(allChapters) {
            allChapters = allChapters || [];
            if (!allChapters.length) {
              RPGACE.utils.toast('This book has no chapters stored - something went wrong when it was created. Delete it and try again.', '#CC4A4A', 5500);
              return;
            }
            var chapter = allChapters.find(function(c) { return c.chapter_index === book.current_chapter_index; });
            if (!chapter) {
              // Every chapter row exists upfront now, whether from a URL
              // fetch or a pasted table of contents (_startBookFromTOC) -
              // no chapter at this index always genuinely means finished.
              self.logic._markBookComplete(book);
              return;
            }
            if (!chapter.raw_text) {
              // TOC-extracted chapters start with empty raw_text until the
              // user provides that specific chapter's actual body text.
              self.ui._renderAddChapterText(book, chapter);
            } else if (chapter.insights) {
              self.ui._renderInsightReview(book, chapter);
            } else {
              self.ui._renderChapterRead(book, chapter);
            }
          });
      });
    },

    // Splits text into chunks safe to round-trip through one Oracle call
    // without hitting the documented 504 bug (CLAUDE.md: response length
    // scales the failure - 700 tokens works, 1200 truncates, 1800 fails
    // outright). A whole chapter is far past that, so each chunk is capped
    // small enough that even a same-length reformatted output stays well
    // under the proven-safe zone. Only ever breaks on whitespace - never
    // mid-word, so no chunk boundary can itself introduce a word-splitting
    // artifact of the exact kind this feature is trying to fix.
    _chunkTextForFormatting: function(text, maxChunkChars) {
      var words = text.split(/(\s+)/); // keep whitespace tokens so rejoining is exact
      var chunks = [];
      var current = '';
      words.forEach(function(token) {
        if (current.length + token.length > maxChunkChars && current.length > 0) {
          chunks.push(current);
          current = token;
        } else {
          current += token;
        }
      });
      if (current) chunks.push(current);
      return chunks;
    },

    // ── Reader-friendly formatting: whitespace/paragraph cleanup ONLY  ──
    // (added July 19, per direct request) - fixes PDF-extraction artifacts
    // (words split apart by a stray space, e.g. "M usical" -> "Musical";
    // irregular whitespace; missing paragraph breaks) without changing,
    // adding, removing, or reordering a single word. Chunked (see
    // _chunkTextForFormatting above) to stay clear of the documented 504
    // bug rather than risk it on a full chapter in one call. Cached to
    // bookworm_chapters.formatted_text so it only ever runs once per
    // chapter - re-opening the chapter reuses the cached version.
    _formatChapterForReading: function(chapter) {
      var self = RPGACE.modules.bookworm;
      if (chapter.formatted_text) return Promise.resolve(chapter.formatted_text);
      var pp = RPGACE.modules.phylumPath;
      var chunks = self.logic._chunkTextForFormatting(chapter.raw_text, 1800);
      var results = new Array(chunks.length);
      var chain = Promise.resolve();
      chunks.forEach(function(chunk, i) {
        chain = chain.then(function() {
          var prompt = 'This is raw text extracted from a PDF book page. It has whitespace artifacts from PDF extraction: some words got split apart by a stray inserted space (e.g. "M usical" should read "Musical", "T his" should read "This"), and there may be irregular multiple spaces or missing paragraph breaks.\n\n' +
            'TEXT:\n' + chunk + '\n\n' +
            'Reformat this text for reading comfort ONLY. STRICT RULES: (1) Do NOT add, remove, reorder, paraphrase, or reword ANY word - every single word from the original must appear, unchanged, in the exact same order. (2) ONLY fix: words split apart by a stray space (rejoin into the real word), irregular/multiple whitespace (normalize), and paragraph breaks (blank line) at natural boundaries. (3) Keep every figure caption, footnote, exercise number, and page artifact exactly as worded - just give normal spacing, never delete anything.\n\n' +
            'Before answering, verify: (1) same words, same order, nothing added or removed; (2) every split-word join forms a real recognizable word, not a guess; (3) paragraph breaks sit at genuine boundaries; (4) no whitespace artifact left unfixed; (5) nothing lost at the start/end of this excerpt. Fix any failed check before responding.\n\n' +
            'Return ONLY the reformatted text - no explanation, no markdown, no commentary.';
          // Mechanical whitespace job → Haiku tier (July 19, ~1/4 cost).
          return pp._callGroundWorkerText(prompt, 900, pp.MECHANICAL_MODEL).then(function(cleaned) {
            results[i] = cleaned.trim() || chunk;
          }).catch(function(e) {
            console.warn('[bookworm] formatting chunk ' + i + ' failed, keeping raw:', e.message);
            results[i] = chunk;
          });
        });
      });
      return chain.then(function() {
        var formatted = results.join('\n\n');
        return RPGACE.sb.secureWrite('bookworm_chapters', 'update', { formatted_text: formatted }, 'id=eq.' + chapter.id)
          .then(function() { return formatted; })
          .catch(function() { return formatted; }); // still usable even if the cache write fails
      });
    },

    // Heuristic guard against the repeated live mistake of pasting a table
    // of contents instead of a chapter's actual body text: TOC entries
    // reliably look like "Section Title . . . . . 12" (dot-leaders ending
    // in a page number) or "Section Title    12" (title, whitespace, bare
    // number at end of line) - real prose essentially never has multiple
    // lines shaped like that. 3+ matching lines is treated as a strong
    // signal, not proof - the caller still lets the user save anyway on a
    // second click rather than hard-blocking it.
    // Real pre-existing bug, found by the G53 split's own test harness (Sep 2
    // 2026) and fixed the same session, not smuggled silently into the
    // refactor: the comment directly above names "Section Title . . . . . 12"
    // — a SPACED dot leader — as this heuristic's own canonical example, but
    // the original first regex only matched 3+ CONSECUTIVE dots, missing that
    // exact spaced form. Real effect: a table of contents typeset with spaced
    // dot leaders (a common style) scored 0 TOC-like lines, so
    // _renderAddChapterText saved it as the chapter's own body text with no
    // warning at all — precisely the mistake this guard exists to catch, and
    // one that had already happened for real twice. Fixed by widening the
    // first regex to tolerate whitespace between the dots — independently
    // re-verified against 6 real probes (both spaced/unspaced dot-leader
    // forms, plus 3 real non-TOC prose cases including text ending in a
    // number and text containing an ellipsis) before applying, zero new false
    // positives. Second regex and the 3-line threshold unchanged.
    _looksLikeTableOfContents: function(text) {
      var lines = text.split('\n');
      var tocLikeLines = lines.filter(function(line) {
        return /(?:\.\s*){3,}\d{1,4}\s*$/.test(line) || /\S {2,}\d{1,4}\s*$/.test(line);
      });
      return tocLikeLines.length >= 3;
    },

    // ══════════════════════════════════════════════════════════════════
    // Chapter analysis: extract every distinct insight, find each one's
    // most-related phylum (cascading through the other enabled phyla for
    // anything that doesn't fit, then a final broad 21-phylum search for
    // genuine orphans), and a Council-of-5 confidence score on every
    // placement before it's ever shown to the user. Cached on
    // bookworm_chapters.insights once done - never re-run on resume.
    // ══════════════════════════════════════════════════════════════════
    _analyzeChapter: function(book, chapter, opts) {
      var self = RPGACE.modules.bookworm;
      var pp = RPGACE.modules.phylumPath;
      var oc = RPGACE.modules.orchestratorCC;
      // CC-2 (Oct 21 2026): on the 🤖 switch the extraction step goes to
      // Orchestrator CC (oracle_fallback_queue, type bookworm_chapter_extract)
      // with the WHOLE chapter (no cheap trim, no 12000 cap - CC has room);
      // _afterExtract runs when the answer comes back. opts.api = the
      // fallback after fallback_hours, straight to the normal API path.
      if (oc && !(opts && opts.api)) {
        return RPGACE.realmLensText(book && book.realms).then(function(lens) {
          var text = String(chapter.raw_text || '');
          if (text.length > self.CC_CHAPTER_CHARS) text = text.slice(0, self.CC_CHAPTER_CHARS) + '\n[... chapter continues - cut here for length ...]';
          return oc.logic.queue({ type: 'bookworm_chapter_extract', key: chapter.id, prompt: self.logic._extractPrompt(lens, chapter, text),
            tier: 'ground_worker_json', maxTokens: 1200, context: { chapterId: chapter.id, bookId: book && book.id, lensKeys: lens.keys } });
        }).then(function(queued) {
          if (!queued) return self.logic._analyzeChapter(book, chapter, { api: true });
          var at = new Date().toISOString();
          return RPGACE.sb.secureWrite('bookworm_chapters', 'update', { status: 'in_progress', cc_queued_at: at, analysis_complete: false }, 'id=eq.' + chapter.id).then(function() {
            RPGACE.utils.toast('🤖 "' + chapter.chapter_title + '" sent to Orchestrator CC — insights arrive after the next pick-up.', '#4CAF82', 5000);
            return Object.assign({}, chapter, { status: 'in_progress', cc_queued_at: at, analysis_complete: false });
          });
        });
      }

      // Aug 11, real Alex ask ("decompression part of massive expansion...
      // ridiculous load times") + a real, more serious bug found while
      // wiring it in, not just a speed one: this used to hard-truncate
      // raw_text at 12000 chars with no marker and no log - any real
      // content past that point was NEVER seen by Oracle at all, silently
      // dropping whatever insights lived in the back half of a long
      // chapter. Condensing FIRST (phylumPath's own Headroom-pattern
      // helper - strips genuine filler, preserves every specific
      // technique/quote/attribution exactly, fails open to the untouched
      // original on any error - built July 31/Aug 11, never wired into a
      // real call site until now per CLAUDE.md's own "needs its own real
      // read first" note) means the same 12000-char safety cap now holds
      // far more real substantive content instead of losing whatever came
      // after the first page of intro/disclaimer/filler.
      return pp._condenseIfLarge(chapter.raw_text, { source: 'bookworm_chapter', chapter_id: chapter.id }).then(function(condensedText) {
        if (condensedText.length < chapter.raw_text.length) {
          console.log('[bookworm] chapter ' + chapter.id + ' condensed ' + chapter.raw_text.length + ' -> ' + condensedText.length + ' chars before analysis (real, not simulated - check insight quality on the next real run)');
        }
        // RI-4 (Oct 15 2026): read through the realms Alex picked for this
        // book (was always "a music-production knowledge base"); each
        // insight comes back tagged with one realm, kept in
        // bookworm_chapters.insight_realms beside the unchanged text flow.
        return RPGACE.realmLensText(book && book.realms).then(function(lens) {
        var extractPrompt = self.logic._extractPrompt(lens, chapter, condensedText.slice(0, 12000));

        // Fixed same session as a real report: a 13-insight chapter took
        // ~7 minutes before ANYTHING appeared, because the original version
        // chained every insight's full placement cascade (each with up to 3
        // reword-retry Oracle calls) before ever resolving. Now only the
        // FIRST insight is awaited here - the rest continue in the
        // background via _continueAnalyzingInBackground(), appending to
        // Supabase as each one finishes, so the review UI can show insight 1
        // immediately and poll for the next one instead of blocking on all
        // of them.
        return pp._callGroundWorkerJSON(extractPrompt, 1200).then(function(parsed) {
          return self.logic._afterExtract(chapter, parsed, lens.keys);
        });
        }); // RI-4 realmLensText
      });
    },


    // The extraction prompt (shared by the API path and Orchestrator CC).
    _extractPrompt: function(lens, chapter, text) {
      return 'This is one chapter of a book Alex is studying for these realms of his life: ' + lens.names.join(', ') + '.\n' +
        'Read it through these lenses:\n' + lens.text + '\n\n' +
        'CHAPTER: "' + chapter.chapter_title + '"\n\n' +
        'TEXT:\n' + text + '\n\n' +
        'List every genuinely distinct, teachable insight in this chapter - as many or as few as are actually present, do not pad or split one idea into several. Restate each in your own words as a standalone fact/technique, not a verbatim quote. Tag each with the ONE realm key above it serves most.\n\n' +
        'Return ONLY JSON: {"insights": [{"text": "...", "realm": "' + lens.keys[0] + '"}]}';
    },

    // Everything after the extraction step (realm tags, phylum, placement,
    // background continuation) - one path whoever extracted (API or CC-2).
    _afterExtract: function(chapter, parsed, lensKeys) {
      var self = RPGACE.modules.bookworm;
      var pp = RPGACE.modules.phylumPath;
        var split = RPGACE.splitRealmInsights((parsed && parsed.insights) || [], lensKeys);
        var insightTexts = split.texts;
        if (insightTexts.length) {
          RPGACE.sb.secureWrite('bookworm_chapters', 'update', { insight_realms: split.realmOf }, 'id=eq.' + chapter.id)
            .catch(function(e) { console.warn('[bookworm] insight realms not saved:', e && e.message); });
        }
        if (!insightTexts.length) {
          return RPGACE.sb.secureWrite('bookworm_chapters', 'update', {
            insights: [], status: 'in_progress', current_insight_index: 0, analysis_complete: true
          }, 'id=eq.' + chapter.id).then(function() {
            return Object.assign({}, chapter, { insights: [], current_insight_index: 0, analysis_complete: true });
          });
        }

        // Function 1 (_startBookFromTOC) already produced a keyword-based
        // suggested_phylum for this chapter from its heading/sub-heading
        // text - use it directly instead of re-running the same "which
        // phylum" judgement call from scratch. Real merge point between
        // the two functions, not just a UI convenience: Function 1's
        // structural analysis speeds up and grounds Function 2's
        // placement, one fewer Oracle round trip per chapter.
        var primaryPhylumPromise = chapter.suggested_phylum
          ? Promise.resolve(chapter.suggested_phylum)
          : pp._callGroundWorkerJSON(
              'CHAPTER: "' + chapter.chapter_title + '"\n\nSUMMARY OF ITS INSIGHTS:\n' + insightTexts.join('\n- ') + '\n\n' +
              'Which ONE of these phyla is this chapter MOST closely related to overall?\n' +
              pp.ENABLED_PHYLA.map(function(n) { return n + '. ' + RPGACE.utils.phylumContext(n); }).join('\n') + '\n\n' +
              'Return ONLY JSON: {"phylumNumber": N}',
              200
            ).then(function(phylumParsed) { return phylumParsed.phylumNumber; });

        return primaryPhylumPromise.then(function(primaryPhylum) {
          var remainingPhyla = pp.ENABLED_PHYLA.filter(function(n) { return n !== primaryPhylum; });

          // Persist the FULL remaining insight-text list and the resolved
          // primaryPhylum up front (added July 19, per direct request to
          // harden against a closed tab) - this is what _resumeChapterAnalysis
          // reads back if the browser tab that started this closes mid-batch.
          // Without this, the raw insight texts only ever lived in JS memory -
          // if the tab closed, anything not yet placed was gone for good,
          // with no way to resume without re-extracting from scratch and
          // losing whatever the user had already reviewed.
          return RPGACE.sb.secureWrite('bookworm_chapters', 'update', {
            pending_insight_texts: insightTexts.slice(1), suggested_phylum: primaryPhylum, analysis_heartbeat: new Date().toISOString()
          }, 'id=eq.' + chapter.id).then(function() {
            return self.logic._placeInsightCascade(insightTexts[0], primaryPhylum, remainingPhyla, [], chapter.id).then(function(firstPlacement) {
              var insights = [firstPlacement];
              var onlyOne = insightTexts.length === 1;
              return RPGACE.sb.secureWrite('bookworm_chapters', 'update', {
                insights: insights, status: 'in_progress', current_insight_index: 0, analysis_complete: onlyOne, analysis_heartbeat: new Date().toISOString()
              }, 'id=eq.' + chapter.id).then(function() {
                if (!onlyOne) {
                  self.logic._continueAnalyzingInBackground(chapter.id, insightTexts.slice(1), primaryPhylum, remainingPhyla);
                }
                return Object.assign({}, chapter, { insights: insights, current_insight_index: 0, analysis_complete: onlyOne, pending_insight_texts: insightTexts.slice(1) });
              });
            }).catch(function(e) {
              // July 24 - Claude-fallback build: the very FIRST insight's
              // placement failed on credit exhaustion, already queued by
              // _placeInsightCascade above. pending_insight_texts already
              // holds the full remaining list (written just above, before
              // this call) - mark the chapter as waiting on the fallback
              // lane instead of silently leaving it in a half-set state.
              if (e.fallbackQueued) {
                // The first insight never actually got placed - restore the
                // FULL list as pending (the write above only dropped it
                // optimistically, assuming success).
                return RPGACE.sb.secureWrite('bookworm_chapters', 'update', {
                  status: 'in_progress', pending_insight_texts: insightTexts, fallback_pending: true, analysis_heartbeat: new Date().toISOString()
                }, 'id=eq.' + chapter.id).then(function() {
                  return Object.assign({}, chapter, { pending_insight_texts: insightTexts, fallback_pending: true });
                });
              }
              throw e;
            });
          });
        });
    },

    // CC-2: Orchestrator CC's extraction answer for a chapter came back.
    _ccApply: function(parsed, row) {
      var self = RPGACE.modules.bookworm, ctx = row.context || {};
      return RPGACE.sb.select('bookworm_chapters', 'id=eq.' + ctx.chapterId + '&limit=1').then(function(rows) {
        var ch = rows && rows[0];
        if (!ch || ch.analysis_complete || (ch.insights || []).length) return; // already done some other way
        return RPGACE.sb.secureWrite('bookworm_chapters', 'update', { cc_queued_at: null }, 'id=eq.' + ch.id).then(function() {
          return self.logic._afterExtract(ch, parsed, ctx.lensKeys && ctx.lensKeys.length ? ctx.lensKeys : ['producer']);
        }).then(function() {
          RPGACE.utils.toast('📖 Orchestrator CC finished "' + ch.chapter_title + '" — its insights are ready to review', 'rgba(42,191,176,0.85)', 5000);
        });
      });
    },
    // CC-2: waited past fallback_hours - run the chapter on the API as normal.
    _ccApi: function(row) {
      var self = RPGACE.modules.bookworm, ctx = row.context || {};
      return Promise.all([
        RPGACE.sb.select('bookworm_chapters', 'id=eq.' + ctx.chapterId + '&limit=1'),
        ctx.bookId ? RPGACE.sb.select('bookworm_books', 'id=eq.' + ctx.bookId + '&limit=1') : Promise.resolve([])
      ]).then(function(r) {
        var ch = r[0] && r[0][0], book = (r[1] && r[1][0]) || null;
        if (!ch || ch.analysis_complete || (ch.insights || []).length) return;
        return RPGACE.sb.secureWrite('bookworm_chapters', 'update', { cc_queued_at: null }, 'id=eq.' + ch.id).then(function() {
          return self.logic._analyzeChapter(book, ch, { api: true });
        });
      });
    },

    // Fire-and-forget: places insights 2..N one at a time, appending each
    // to bookworm_chapters.insights as it completes rather than holding
    // them all until the whole chapter is done. If anything in this chain
    // fails partway, analysis_complete still gets set on whatever
    // succeeded so far - without that, a mid-batch failure would leave the
    // review UI's polling (_renderWaitingForNextInsight) waiting forever.
    // Also used by _resumeChapterAnalysis - identical logic, just called
    // with remainingTexts freshly read from pending_insight_texts instead
    // of the original tab's in-memory list, which is exactly what makes a
    // resume from a DIFFERENT tab/session possible.
    _continueAnalyzingInBackground: function(chapterId, remainingTexts, primaryPhylum, remainingPhyla) {
      var self = RPGACE.modules.bookworm;
      // Batch-dedup awareness (July 19, Fable audit): seed the running list
      // of leaf names this chapter has already created (works on resume
      // too, where earlier placements aren't in this tab's memory), then
      // append locally as each new one lands. Passed into every placement
      // call so the model can attach to / extend a sibling it just made
      // instead of minting near-duplicate siblings - the audit found one
      // chapter had created 5+ overlapping inversion leaves this way, each
      // individually scored 9/10 because each was placed blind.
      var placedLeaves = [];
      var chain = RPGACE.sb.select('bookworm_chapters', 'id=eq.' + chapterId + '&limit=1').then(function(rows) {
        var current = rows && rows[0];
        ((current && current.insights) || []).forEach(function(ins) {
          if (ins.newSteps && ins.newSteps.length) placedLeaves.push(ins.newSteps[ins.newSteps.length - 1]);
        });
      }).catch(function() {});
      remainingTexts.forEach(function(insightText, i) {
        chain = chain.then(function() {
          return self.logic._placeInsightCascade(insightText, primaryPhylum, remainingPhyla, placedLeaves.slice(), chapterId).then(function(placement) {
            if (placement.newSteps && placement.newSteps.length) placedLeaves.push(placement.newSteps[placement.newSteps.length - 1]);
            return RPGACE.sb.select('bookworm_chapters', 'id=eq.' + chapterId + '&limit=1').then(function(rows) {
              var current = rows && rows[0];
              if (!current) return;
              var insights = (current.insights || []).concat([placement]);
              var isLast = (i === remainingTexts.length - 1);
              // Drop the just-placed text from the persisted pending list -
              // this is the resumable checkpoint; slice(1) is safe because
              // this same insightText was always pending_insight_texts[0]
              // (both derived from, and kept in lockstep with, remainingTexts).
              var stillPending = (current.pending_insight_texts || []).slice(1);
              return RPGACE.sb.secureWrite('bookworm_chapters', 'update', {
                insights: insights, analysis_complete: isLast, pending_insight_texts: stillPending, analysis_heartbeat: new Date().toISOString()
              }, 'id=eq.' + chapterId);
            });
          });
        });
      });
      return chain.catch(function(e) {
        // July 24 - Claude-fallback build: a credit-exhaustion failure is
        // NOT the same as a real terminal failure. pending_insight_texts
        // already correctly holds everything from the failed insight
        // onward (it's only ever advanced on SUCCESS, in the .then() above)
        // - marking fallback_pending instead of analysis_complete keeps the
        // chapter honestly "waiting," not silently "done."
        if (e.fallbackQueued) {
          console.warn('[bookworm] background insight analysis paused on credit exhaustion, queued for fallback:', e.message);
          return RPGACE.sb.secureWrite('bookworm_chapters', 'update', { fallback_pending: true, analysis_heartbeat: new Date().toISOString() }, 'id=eq.' + chapterId).catch(function() {});
        }
        console.warn('[bookworm] background insight analysis failed partway, marking complete with what succeeded so far:', e.message);
        return RPGACE.sb.secureWrite('bookworm_chapters', 'update', { analysis_complete: true }, 'id=eq.' + chapterId).catch(function() {});
      });
    },

    // ── Resume from the Claude-fallback lane (July 24) ──────────────────
    // Companion to _resumeChapterAnalysis above, but triggered by an
    // ANSWERED oracle_fallback_queue row (phylumPath._checkFallbackAnswers'
    // sweep) rather than a stale-heartbeat click. Resolves the one insight
    // that failed via phylumPath.resumeFallbackPlacement (re-fetches the
    // current tree, resolves the fallback Routine's answer the same way a
    // live call would), appends it, clears fallback_pending, then re-enters
    // _continueAnalyzingInBackground for whatever's still left - reusing
    // the exact same continuation chain the live path uses, not a second
    // one. If ANOTHER insight also queued while this one was pending, this
    // only resolves the one this row's context names; the next sweep picks
    // up any others once they're answered too.
    _resumeFromFallback: function(row) {
      var self = RPGACE.modules.bookworm;
      var ctx = row.context || {};
      var chapterId = ctx.chapterId;
      if (!chapterId) return;
      // No server-side lock against a double-resume if two sweeps somehow
      // overlap - same accepted, documented tradeoff as
      // _resumeChapterAnalysis above ("single-user personal tool, not a
      // distributed system"); resumed_at is marked as soon as this
      // resolves, and the sweep only ever selects resumed_at IS NULL rows.
      return RPGACE.modules.phylumPath.resumeFallbackPlacement(row.answer, ctx.phylumNumber).then(function(decision) {
        return RPGACE.sb.select('bookworm_chapters', 'id=eq.' + chapterId + '&limit=1').then(function(rows) {
          var current = rows && rows[0];
          if (!current) return;
          var placement = Object.assign({ text: ctx.insightText, decision: 'pending' }, decision);
          var insights = (current.insights || []).concat([placement]);
          var stillPending = (current.pending_insight_texts || []).filter(function(t) { return t !== ctx.insightText; });
          return RPGACE.sb.secureWrite('bookworm_chapters', 'update', {
            insights: insights, pending_insight_texts: stillPending, fallback_pending: false,
            analysis_complete: stillPending.length === 0, analysis_heartbeat: new Date().toISOString()
          }, 'id=eq.' + chapterId).then(function() {
            return RPGACE.sb.secureWrite('oracle_fallback_queue', 'update', { resumed_at: new Date().toISOString() }, 'id=eq.' + row.id);
          }).then(function() {
            RPGACE.utils.toast('📖 A queued Bookworm insight came back from the fallback lane and was placed', 'rgba(42,191,176,0.85)', 4500);
            if (stillPending.length) {
              self.logic._continueAnalyzingInBackground(chapterId, stillPending, ctx.phylumNumber, RPGACE.modules.phylumPath.ENABLED_PHYLA.filter(function(n) { return n !== ctx.phylumNumber; }));
            }
          });
        });
      }).catch(function(e) { console.warn('[bookworm] fallback resume failed:', e.message); });
    },

    // ── Resume a stalled chapter's background analysis (added July 19) ──
    // Reads pending_insight_texts + suggested_phylum FRESH from Supabase
    // (never from JS memory - the whole point is this can run in a NEW tab
    // after the original one closed) and re-enters the exact same
    // _continueAnalyzingInBackground chain. Known residual limitation,
    // honestly flagged rather than solved: there's no server-side lock, so
    // if the ORIGINAL tab is actually still alive and just slow (not truly
    // stalled), clicking Resume could run two chains over the same
    // remaining insights at once. The heartbeat timestamp is meant to make
    // that rare (the UI only offers Resume once the heartbeat has gone
    // stale for a while) but this is a single-user personal tool, not a
    // distributed system - true mutual exclusion isn't built here.
    _resumeChapterAnalysis: function(book, chapter) {
      var self = RPGACE.modules.bookworm;
      var pp = RPGACE.modules.phylumPath;
      return RPGACE.sb.select('bookworm_chapters', 'id=eq.' + chapter.id + '&limit=1').then(function(rows) {
        var fresh = rows && rows[0];
        if (!fresh) return;
        if (fresh.cc_queued_at && !(fresh.insights || []).length) { // CC-2: not stalled, waiting for Orchestrator CC
          RPGACE.utils.toast('🤖 "' + chapter.chapter_title + '" is with Orchestrator CC — nothing to resume.', '#4CAF82', 4000);
          return;
        }
        var pending = fresh.pending_insight_texts || [];
        if (!pending.length) {
          return RPGACE.sb.secureWrite('bookworm_chapters', 'update', { analysis_complete: true }, 'id=eq.' + chapter.id);
        }
        var primaryPhylum = fresh.suggested_phylum;
        var remainingPhyla = pp.ENABLED_PHYLA.filter(function(n) { return n !== primaryPhylum; });
        RPGACE.utils.toast('📖 Resuming analysis of "' + chapter.chapter_title + '" (' + pending.length + ' insight(s) left)...', '#9B6EC8', 3500);
        return self.logic._continueAnalyzingInBackground(chapter.id, pending, primaryPhylum, remainingPhyla);
      });
    },

    // Tries the primary phylum first, then keyword-ranked candidates, then a
    // final broad 21-phylum search for genuine orphans.
    //
    // TOKEN-COST RETUNE July 19 (confirmed by Alex after £10 of API credit
    // burned in one testing session): two changes, both evidence-backed.
    // 1. Accept gate 9→7. Real approval history showed every 7-8-scored
    //    placement was approved as-is - the old ≥5 reword band re-sent the
    //    full phylum tree up to 2 extra times per insight (3x cost) without
    //    changing outcomes. Now: ≥7 accepted, 4-6 gets the reword loop,
    //    <4 gets the upgrade check. Council scoring itself is unchanged.
    // 2. Cascade breadth capped: instead of walking ALL other enabled phyla
    //    (each attempt = that phylum's full tree in the prompt), non-primary
    //    candidates are pre-ranked by the free keyword scan and only the top
    //    2 with actual keyword hits are tried before falling through to
    //    _finalPlacementSearch (which is a cheap phylum-NAMES-only call).
    //    A phylum with zero keyword overlap was never going to win a
    //    fits/confidence contest it charges full price to enter.
    // chapterId (added July 24, Claude-fallback build): when present, a
    // credit-exhaustion failure inside tryPhylum is tagged with enough
    // context (chapterId, insightText, phylumNumber, priorLeaves) for
    // phylumPath._queueFallback to enqueue a resumable row, and the error
    // is RETHROWN instead of swallowed - real bug found in the same pass:
    // tryPhylum's own .catch() used to turn ANY error, including a real
    // credit-exhaustion failure, into `return null` ("doesn't fit"), which
    // meant the cascade would silently keep burning attempts across every
    // remaining phylum/reword-retry and could end up scoring a real
    // insight as confidenceScore:0 garbage instead of surfacing the real
    // failure. Now: a tagged fallbackQueued error is rethrown so the
    // caller (_continueAnalyzingInBackground) can stop cleanly instead of
    // poisoning the chapter with false "doesn't fit" placements.
    _placeInsightCascade: function(insightText, primaryPhylum, remainingPhyla, priorLeaves, chapterId) {
      var self = RPGACE.modules.bookworm;
      // LL-3: tree paused -> skip placement entirely (zero Oracle calls).
      // The insight is kept as-is and still becomes an idea card (recall's
      // chapterIdeas reads every non-rejected insight).
      var tt = RPGACE.modules.taxonomyTree;
      if (tt && tt.logic.isPaused()) {
        return Promise.resolve({ text: insightText, decision: 'pending', fits: false, confidenceScore: 0, phylumNumber: primaryPhylum, paused: true });
      }
      var tryPhylum = function(phylumNumber, text, attemptsLeft) {
        var ctx = chapterId ? { type: 'bookworm_chapter_insight', chapterId: chapterId, insightText: insightText, phylumNumber: phylumNumber, priorLeaves: priorLeaves } : undefined;
        return self.logic._decidePlacementScored(text, phylumNumber, priorLeaves, ctx).then(function(decision) {
          if (!decision.fits) return null;
          if (decision.confidenceScore >= 7) return decision;
          if (decision.confidenceScore >= 4 && attemptsLeft > 0) {
            return self.logic._rewordInsight(text).then(function(reworded) {
              return tryPhylum(phylumNumber, reworded, attemptsLeft - 1);
            });
          }
          if (decision.confidenceScore < 4) {
            return self.logic._checkUpgradeable(text, phylumNumber).then(function(upgraded) {
              return upgraded ? self.logic._decidePlacementScored(upgraded, phylumNumber, priorLeaves, ctx) : null;
            });
          }
          return decision; // ran out of reword attempts, best effort
        }).catch(function(e) {
          if (e.fallbackQueued) throw e; // real failure, queued for later - stop, don't guess
          console.warn('[bookworm] placement attempt failed:', e.message);
          return null;
        });
      };

      var ranked = [];
      if (RPGACE.utils._quickPhylaScan) {
        var hits = RPGACE.utils._quickPhylaScan(insightText); // sorted by hits desc, free
        ranked = hits.map(function(m) { return m.num; })
          .filter(function(n) { return n !== primaryPhylum && remainingPhyla.indexOf(n) !== -1; })
          .slice(0, 2);
      }
      var phylaToTry = [primaryPhylum].concat(ranked);
      var chain = Promise.resolve(null);
      phylaToTry.forEach(function(phylumNumber) {
        chain = chain.then(function(found) {
          if (found) return found;
          return tryPhylum(phylumNumber, insightText, 3);
        });
      });

      return chain.then(function(found) {
        if (found) return Object.assign({ text: insightText, decision: 'pending' }, found);
        return self.logic._finalPlacementSearch(insightText).then(function(fallback) {
          if (fallback) return Object.assign({ text: insightText, decision: 'pending' }, fallback);
          return { text: insightText, decision: 'pending', fits: false, confidenceScore: 0 };
        });
      });
    },

    // Combined placement + fit-check + justification + confidence score in
    // one call - keeps this to one Oracle round trip per attempt instead of
    // separate placement/scoring calls, given how many of these can run per
    // chapter (real cost/latency concern, flagged in patch notes).
    // Fixed same session as a live bug: this prompt originally dropped a
    // load-bearing instruction the proven phylumPath.decidePlacement()
    // prompt has always had ("do NOT repeat ranks that already exist in
    // the attach point"). Without it, Oracle returned newSteps as
    // cumulative restatements of the existing path at each step instead of
    // just the new segment names - confirmed live: a real insight came back
    // with newSteps like ["Anatomia", "Anatomia/Pitch & Keyboard Geography",
    // "Anatomia/Pitch & Keyboard Geography/Note Identification & Keyboard
    // Layout", "...the real new leaf name"], which joined into a wall of
    // repeated segments in the review popup - and would have inserted that
    // garbage as literal taxonomy_tree node names if approved. Restored the
    // instruction AND added _sanitizeNewSteps() as a defensive backstop
    // (strips any step that's really a multi-segment path or repeats
    // something already in the attach path) so a future prompt regression
    // can't corrupt the tree even if it slips past the wording again.
    // UNIFIED July 19 (Fable audit): the scored placement engine that
    // lived here (5 checks + numeric confidence + justification) was the
    // best-logged of the three pipelines that existed, so it was promoted
    // to phylumPath.decidePlacementScored as THE single placement engine
    // for every source (book, Oracle chat, Content Intelligence,
    // Encyclopedia sync). This is now a thin delegate kept only so the
    // cascade code above reads unchanged. The old local _sanitizeNewSteps
    // was folded into phylumPath.sanitizePlacement (now also enforced at
    // the _insertNewSteps choke point, which the old one never covered -
    // that gap is exactly how the depth-14 Edit-box corruption got in).
    _decidePlacementScored: function(insightText, phylumNumber, priorLeaves, fallbackContext) {
      return RPGACE.modules.phylumPath.decidePlacementScored(insightText, phylumNumber, priorLeaves, fallbackContext);
    },

    // Both routed to the Haiku mechanical tier July 19 - one-line rewording
    // is not judgment work, and these fire inside the retry loop where
    // every token multiplies.
    _rewordInsight: function(insightText) {
      var pp = RPGACE.modules.phylumPath;
      var prompt = 'Reword this insight to be clearer and more specifically teachable, same meaning, more concrete:\n\n"' + insightText + '"\n\nReturn ONLY the reworded insight text, nothing else.';
      return pp._callGroundWorkerText(prompt, 150, pp.MECHANICAL_MODEL);
    },

    _checkUpgradeable: function(insightText, phylumNumber) {
      var pp = RPGACE.modules.phylumPath;
      var prompt = 'This insight scored very low for taxonomy placement in ' + RPGACE.utils.phylumContext(phylumNumber) + ':\n\n"' + insightText + '"\n\n' +
        'Is there a genuinely more specific/concrete version of this that WOULD be leaf-worthy, or is it too vague/generic to ever place well? If upgradeable, return the improved version. If not, return null.\n\n' +
        'Return ONLY JSON: {"upgraded": "text or null"}';
      return pp._callGroundWorkerJSON(prompt, 200, pp.MECHANICAL_MODEL).then(function(parsed) { return parsed.upgraded || null; }).catch(function() { return null; });
    },

    // Final fallback for insights that didn't fit any enabled phylum -
    // broad search across all 21, not just the 10 currently enabled.
    _finalPlacementSearch: function(insightText) {
      var self = RPGACE.modules.bookworm;
      var tt = RPGACE.modules.taxonomyTree;
      var pp = RPGACE.modules.phylumPath;
      var allPhylaList = Object.keys(tt.PHYLUM_NAMES).map(function(n) { return n + '. ' + tt.PHYLUM_NAMES[n] + ' (' + tt.PHYLUM_ENGLISH[n] + ')'; }).join('\n');
      var prompt = 'This insight did not fit well in any of the currently-active phyla:\n\n"' + insightText + '"\n\n' +
        'Given ALL ' + Object.keys(tt.PHYLUM_NAMES).length + ' phyla below, which one genuinely fits best?\n' + allPhylaList + '\n\n' +
        'Return ONLY JSON: {"phylumNumber": N, "justification": "..."}';
      return pp._callGroundWorkerJSON(prompt, 300).then(function(parsed) {
        if (!parsed.phylumNumber) return null;
        return self.logic._decidePlacementScored(insightText, parsed.phylumNumber);
      }).catch(function() { return null; });
    },

    // Safe read-modify-write for a single insight inside
    // bookworm_chapters.insights (added July 19, alongside the background
    // leaf-creation queue below). Always enqueued onto a single shared
    // chain (_chapterWriteQueue) so two writes to the same chapter's
    // insights array can never race each other - critical once approving
    // an insight advances the UI immediately while the actual taxonomy
    // write finishes later in the background: without this, the later
    // write could read a stale array (missing the just-set decision) and
    // clobber it when it writes back.
    _patchChapterInsightAt: function(chapterId, idx, patchFn, extraFields) {
      var self = RPGACE.modules.bookworm;
      self._chapterWriteQueue = (self._chapterWriteQueue || Promise.resolve()).then(function() {
        return RPGACE.sb.select('bookworm_chapters', 'id=eq.' + chapterId + '&limit=1').then(function(rows) {
          var current = rows && rows[0];
          if (!current) return;
          var insights = (current.insights || []).slice();
          if (idx >= insights.length) return;
          insights[idx] = patchFn(insights[idx]);
          var body = Object.assign({ insights: insights }, extraFields || {});
          return RPGACE.sb.secureWrite('bookworm_chapters', 'update', body, 'id=eq.' + chapterId);
        });
      });
      return self._chapterWriteQueue;
    },

    // ── Background leaf-creation queue (added July 19, per direct request) ──
    // Approving an insight now advances the review UI immediately instead
    // of waiting on this - the actual taxonomy_tree write happens here,
    // queued. A single shared chain (_leafQueue, not per-chapter) so
    // _insertNewSteps's chained parent_id inserts never run concurrently
    // with themselves, regardless of how fast someone clicks through
    // several approvals in a row. The final status patch goes through
    // _patchChapterInsightAt above, which is itself globally serialized -
    // together these guarantee the eventual "created"/"failed" write can
    // never race or clobber the "approved" decision advance() already set.
    // Aug 22 2026 — W5: new OPTIONAL 4th parameter `bookTitle`. This is a
    // module-level function, so the enclosing book object is NOT in its
    // scope (unlike the Edit path in _renderInsightReview below) — both of
    // its real callers DO have `book` in scope and pass book.title down.
    // Omitting it stays valid: the companion entry falls back to a generic
    // Bookworm title rather than skipping the entry entirely.
    _queueLeafCreation: function(chapterId, idx, insight, bookTitle) {
      var self = RPGACE.modules.bookworm;
      var pp = RPGACE.modules.phylumPath;
      self._leafQueue = (self._leafQueue || Promise.resolve()).then(function() {
        return pp._insertNewSteps(insight.phylumNumber, insight.attachNode || null, insight.newSteps, insight.explainers, insight.text,
          { source: 'bookworm', title: bookTitle || 'Bookworm insight' })
          .then(function() {
            return self.logic._patchChapterInsightAt(chapterId, idx, function(current) {
              return Object.assign({}, current, { leafStatus: 'created' });
            });
          })
          .catch(function(e) {
            // Fail loud (per this project's own rule) rather than silently
            // dropping an approved insight that never actually made it into
            // taxonomy_tree - the toast survives even though the review
            // popup for this specific insight is long gone by the time this
            // resolves.
            console.warn('[bookworm] queued leaf creation failed for insight ' + idx + ':', e.message);
            RPGACE.utils.toast('⚠️ Leaf creation failed for an approved insight ("' + (insight.text || '').slice(0, 60) + '...") - reopen this chapter to check it.', '#CC4A4A', 6000);
            return self.logic._patchChapterInsightAt(chapterId, idx, function(current) {
              return Object.assign({}, current, { leafStatus: 'failed' });
            }).catch(function() {});
          });
      });
      return self._leafQueue;
    },

    _completeChapter: function(book, chapter) {
      var self = RPGACE.modules.bookworm;
      RPGACE.sb.secureWrite('bookworm_chapters', 'update', { status: 'complete' }, 'id=eq.' + chapter.id)
        .then(function() {
          var nextIndex = book.current_chapter_index + 1;
          return RPGACE.sb.secureWrite('bookworm_books', 'update', { current_chapter_index: nextIndex }, 'id=eq.' + book.id);
        }).then(function() {
          RPGACE.utils.toast('✓ Chapter complete: ' + chapter.chapter_title, '#4CAF82', 3000);
          self.ui._refreshWidget();
          self.logic._openCurrentChapter(book.id);
        }).catch(function(e) { RPGACE.utils.toast('Error: ' + e.message, '#CC4A4A', 3500); });
    },

    _markBookComplete: function(book) {
      var self = RPGACE.modules.bookworm;
      RPGACE.sb.select('bookworm_chapters', 'book_id=eq.' + book.id)
        .then(function(chapters) {
          chapters = chapters || [];
          var totalInsights = 0;
          var phyla = {};
          chapters.forEach(function(c) {
            (c.insights || []).forEach(function(i) {
              if (i.decision === 'approved' || i.decision === 'edited') { totalInsights++; if (i.phylumNumber) phyla[i.phylumNumber] = true; }
            });
          });
          return RPGACE.sb.secureWrite('bibliography', 'insert', {
            book_id: book.id, title: book.title, source_url: book.source_url,
            total_chapters: chapters.length, total_insights_placed: totalInsights,
            phyla_touched: Object.keys(phyla).map(Number)
          }).then(function() {
            return RPGACE.sb.secureWrite('bookworm_books', 'update', { status: 'complete', completed_at: new Date().toISOString() }, 'id=eq.' + book.id);
          });
        }).then(function() {
          RPGACE.utils.toast('📚 ' + book.title + ' — complete! Added to Bibliography.', '#4CAF82', 5000);
          self.ui._refreshWidget();
          self.ui._injectBibliographySection();
        }).catch(function(e) { RPGACE.utils.toast('Error: ' + e.message, '#CC4A4A', 3500); });
    },

  },

  // ============================================================
  // ui — rendering/DOM: builds the dashboard widget, the chapter/
  // insight overlays and the bibliography panel, and delegates
  // data/computation work to logic.* rather than doing it inline.
  // Kept in the same relative order as before the split.
  // ============================================================
  ui: {

    // ── UI14 Phase 1 (Sep 2026) — the real, permanent page-resident      ──
    // ── reader container all 7 chapter-flow render states below share.   ──
    // Real /interrogation scope (records/2026-09/ui14_dashdeck_popup_
    // audit_spec_2026-09-04.txt): Bookworm's own chapter-reading flow
    // (TOC found -> chapter list -> read/add-text/insight-review ->
    // waiting-for-next-insight) used to spawn a fresh dashDeck._popup()
    // overlay per state, stacking on top of whatever page showed
    // underneath — including, after UI11, potentially the real
    // #page-bookworm itself. This is the exact "crammed interface"
    // UI10/12/13 already fixed one level up (the book-PICKER); this
    // fixes the one level down (the actual reading experience once
    // inside a chosen book). A real record-detail view of a specific
    // book, revisited across many sessions — the same shape UI12's own
    // Resume-button logic already assumes exists.
    _ensureReaderContainer: function() {
      var existing = document.getElementById('bookworm-reader');
      if (existing) return existing;
      var page = document.getElementById('page-bookworm');
      if (!page) return null;
      var wrap = document.createElement('div');
      wrap.id = 'bookworm-reader';
      wrap.style.cssText = 'display:none;background:rgba(155,89,182,0.03);border:1px solid rgba(155,89,182,0.12);border-radius:12px;padding:18px 22px;';
      var eyebrowEl = document.createElement('div');
      eyebrowEl.id = 'bookworm-reader-eyebrow';
      eyebrowEl.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(155,89,182,0.6);margin-bottom:3px;';
      var titleEl = document.createElement('div');
      titleEl.id = 'bookworm-reader-title';
      titleEl.className = 'section-title';
      titleEl.style.cssText = 'font-size:14px;margin-bottom:14px;';
      var boxEl = document.createElement('div');
      boxEl.id = 'bookworm-reader-box';
      wrap.appendChild(eyebrowEl); wrap.appendChild(titleEl); wrap.appendChild(boxEl);
      page.appendChild(wrap);
      return wrap;
    },

    // Real render-target swap every one of the 7 render-state functions
    // below calls to get its content box, replacing each one's own
    // former dashDeck._popup({...}) call. Real, checkable state decides
    // the branch taken — never a guess about "was I called from inside
    // or outside the reader": if the reader is ALREADY the visible
    // state (an internal transition, e.g. clicking a chapter row, or
    // Approve/Reject advancing to the next insight), this just clears
    // and repopulates the SAME real page element in place, no page nav
    // at all. If it is NOT already showing (a fresh entry — a book card
    // click while the picker is visible, a dashboard glance item, UI12's
    // Resume button), it does the one real page-anchoring dance first:
    // ensure #page-bookworm is genuinely active via the same real
    // dashDeck._openPage('bookworm-widget') every other nav route
    // already uses (rule 8), suppressing this module's own page:show
    // reset listener for that one self-triggered call (see the
    // _bookwormPageShowSuppress field's own comment), then hide the
    // picker widget and reveal the reader.
    _showReader: function(eyebrow, title) {
      var self = RPGACE.modules.bookworm;
      self.ui._ensureReaderContainer();
      var reader = document.getElementById('bookworm-reader');
      if (!reader) { console.warn('[bookworm] #page-bookworm missing, cannot show reader'); return null; }
      var alreadyShowing = reader.style.display !== 'none';
      if (!alreadyShowing) {
        self._bookwormPageShowSuppress = true;
        RPGACE.modules.dashDeck._openPage('bookworm-widget');
        var widget = document.getElementById('bookworm-widget');
        if (widget) widget.style.display = 'none';
        reader.style.display = '';
      }
      document.getElementById('bookworm-reader-eyebrow').textContent = eyebrow || '';
      document.getElementById('bookworm-reader-title').textContent = title || '';
      var box = document.getElementById('bookworm-reader-box');
      box.innerHTML = '';
      // Reset any inline style a PRIOR render state left on this shared node
      // (e.g. _renderWaitingForNextInsight's textAlign:center) - box is reused
      // across every state now instead of being a fresh popup box each time,
      // so a style set by one state would otherwise silently leak into the next.
      box.removeAttribute('style');
      return box;
    },

    // ── Entry point: the main Oracle chat, not just the Dashboard widget ──
    // July 17, added per direct request ("include oracle in ai advisor as
    // an input too") - same TRIGGER_PREFIXES/window.sendChat-wrap pattern
    // scheduleOracle already established (rpgace_core.js's scheduleOracle
    // module), so a prefixed message in ANY Oracle chat surface routes
    // straight into _startBook() instead of a normal chat turn. Falls
    // through to the original sendChat for anything that doesn't match,
    // same chainable-wrap convention scheduleOracle's wrap already uses -
    // safe to coexist with that wrap and any other already on window.sendChat.
    _patchChatTrigger: function() {
      var self = RPGACE.modules.bookworm;
      if (typeof window.sendChat !== 'function' || window._bookwormChatPatched) return;
      window._bookwormChatPatched = true;
      var origSend = window.sendChat;
      window.sendChat = function() {
        var input = document.getElementById('chat-input');
        var val = input ? input.value.trim() : '';
        var lower = val.toLowerCase();
        var matchedPrefix = self.TRIGGER_PREFIXES.find(function(p) { return lower.indexOf(p) === 0; });
        if (matchedPrefix) {
          var url = val.slice(matchedPrefix.length).trim();
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          if (!url) { RPGACE.utils.toast('Add a book URL after "' + matchedPrefix + '"', '#CC4A4A', 2500); return; }
          RPGACE.utils.toast('📖 Fetching + detecting chapters...', '#9B6EC8', 3000);
          self.logic._startBook(url).catch(function(e) {
            RPGACE.utils.toast('Error: ' + e.message, '#CC4A4A', 4000);
          });
          return;
        }
        return origSend.apply(this, arguments);
      };
    },

    // ── Dashboard widget: in-progress books (progress bar each) + start-new-book input ──
    _injectDashboardWidget: function() {
      if (document.getElementById('bookworm-widget')) return;
      var self = RPGACE.modules.bookworm;
      var page = document.getElementById('page-dashboard');
      if (!page) return;

      var widget = document.createElement('div');
      widget.id = 'bookworm-widget';
      widget.style.cssText = 'background:rgba(155,89,182,0.03);border:1px solid rgba(155,89,182,0.12);border-radius:12px;padding:18px 22px;margin-bottom:20px;';

      var hdr = document.createElement('div');
      hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';
      var titleEl = document.createElement('div');
      var eyebrow = document.createElement('div');
      eyebrow.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(155,89,182,0.6);text-transform:uppercase;margin-bottom:3px;';
      eyebrow.textContent = 'Bookworm';
      var titleText = document.createElement('div');
      titleText.className = 'section-title';
      titleText.style.cssText = 'font-size:14px;';
      titleText.textContent = '📖 Work Through Books & Massive Texts';
      titleEl.appendChild(eyebrow); titleEl.appendChild(titleText);
      hdr.appendChild(titleEl);
      widget.appendChild(hdr);

      var urlRow = document.createElement('div');
      urlRow.style.cssText = 'display:flex;gap:6px;margin-bottom:14px;';
      var urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.id = 'bookworm-url-input';
      urlInput.placeholder = 'Paste a book URL (PDF or web page)...';
      urlInput.style.cssText = 'flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#D4DAF5;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;';
      var startBtn = document.createElement('button');
      startBtn.textContent = '📖 Start';
      startBtn.style.cssText = 'padding:8px 16px;background:rgba(155,89,182,0.12);border:1px solid rgba(155,89,182,0.35);border-radius:6px;color:#9B6EC8;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      startBtn.onclick = function() {
        var url = urlInput.value.trim();
        if (!url) { RPGACE.utils.toast('Paste a book URL first', '#CC4A4A', 2000); return; }
        startBtn.disabled = true; startBtn.textContent = '⏳ Fetching + detecting chapters...';
        self.logic._startBook(url).then(function() {
          startBtn.disabled = false; startBtn.textContent = '📖 Start';
          urlInput.value = '';
        }).catch(function(e) {
          startBtn.disabled = false; startBtn.textContent = '📖 Start';
          RPGACE.utils.toast('Error: ' + e.message, '#CC4A4A', 4000);
        });
      };
      urlRow.appendChild(urlInput); urlRow.appendChild(startBtn);
      widget.appendChild(urlRow);

      // TOC-first manual entry - real gap found live: URL/Jina fetch is
      // the only way in, but a physical/owned book has no fetchable URL.
      // First version of this (type title + chapter 1's full text
      // together, unknown total) was rejected live - real report: pasting
      // a book's actual table of contents by mistake produced a chapter
      // with nothing but section headings and page numbers, no real
      // content, and there was no way to know the real total chapter
      // count upfront. Fixed by splitting into two steps: paste the TOC
      // ONCE (Oracle extracts the ordered chapter list from it, same as
      // detectChaptersByOracle does for a fetched book - see
      // _startBookFromTOC), giving a real known total/progress bar exactly
      // like a URL-fetched book; THEN, one at a time, paste just that
      // chapter's actual body text when prompted (title already known).
      var manualToggle = document.createElement('button');
      manualToggle.textContent = '✍️ Or paste a table of contents (own physical book)';
      manualToggle.style.cssText = 'width:100%;padding:6px;background:none;border:1px dashed rgba(155,89,182,0.25);border-radius:6px;color:rgba(155,89,182,0.7);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;margin-bottom:14px;';
      var manualForm = document.createElement('div');
      manualForm.style.cssText = 'display:none;margin-bottom:14px;padding:10px;background:rgba(255,255,255,0.02);border-radius:8px;';
      var manualTitleInput = document.createElement('input');
      manualTitleInput.type = 'text';
      manualTitleInput.placeholder = 'Book title...';
      manualTitleInput.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#D4DAF5;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;margin-bottom:8px;';
      var manualTocInput = document.createElement('textarea');
      manualTocInput.placeholder = 'Paste the table of contents (chapter titles + numbers)...';
      manualTocInput.rows = 5;
      manualTocInput.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#D4DAF5;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;resize:vertical;margin-bottom:8px;';
      var manualStartBtn = document.createElement('button');
      manualStartBtn.textContent = '✍️ Extract chapters from this contents page';
      manualStartBtn.style.cssText = 'width:100%;padding:8px;background:rgba(155,89,182,0.12);border:1px solid rgba(155,89,182,0.35);border-radius:6px;color:#9B6EC8;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      manualStartBtn.onclick = function() {
        var title = manualTitleInput.value.trim();
        var toc = manualTocInput.value.trim();
        if (!title || !toc) { RPGACE.utils.toast('Add a title and the table of contents first', '#CC4A4A', 2500); return; }
        manualStartBtn.disabled = true; manualStartBtn.textContent = '⏳ Extracting chapter list...';
        self.logic._startBookFromTOC(title, toc).then(function() {
          manualStartBtn.disabled = false; manualStartBtn.textContent = '✍️ Extract chapters from this contents page';
          manualTitleInput.value = ''; manualTocInput.value = '';
          manualForm.style.display = 'none';
        }).catch(function(e) {
          manualStartBtn.disabled = false; manualStartBtn.textContent = '✍️ Extract chapters from this contents page';
          RPGACE.utils.toast('Error: ' + e.message, '#CC4A4A', 4000);
        });
      };
      manualForm.appendChild(manualTitleInput); manualForm.appendChild(manualTocInput); manualForm.appendChild(manualStartBtn);
      manualToggle.onclick = function() { manualForm.style.display = manualForm.style.display === 'none' ? 'block' : 'none'; };
      widget.appendChild(manualToggle);
      widget.appendChild(manualForm);

      // Upload a purchased ebook PDF directly - real request from owning a
      // legitimate ebook file with no fetchable URL and no interest in
      // retyping the table of contents. Text extracted entirely client-side
      // via PDF.js, never uploaded anywhere as a raw file - only the
      // extracted text goes to the server, same as any other book source.
      var uploadRow = document.createElement('div');
      uploadRow.style.cssText = 'margin-bottom:14px;';
      var uploadLabel = document.createElement('label');
      uploadLabel.textContent = '📎 Or upload your own purchased ebook PDF';
      uploadLabel.style.cssText = 'display:block;width:100%;padding:6px;background:none;border:1px dashed rgba(155,89,182,0.25);border-radius:6px;color:rgba(155,89,182,0.7);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;text-align:center;';
      var uploadInput = document.createElement('input');
      uploadInput.type = 'file';
      uploadInput.accept = '.pdf,application/pdf';
      uploadInput.style.cssText = 'display:none;';
      uploadInput.onchange = function() {
        var file = uploadInput.files && uploadInput.files[0];
        if (!file) return;
        var title = file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ');
        uploadLabel.textContent = '⏳ Extracting text + detecting chapters...';
        // Setting .textContent removes ALL of the label's children - which
        // includes the file input nested inside it - so it has to be
        // re-appended on every restore, or the label stops opening a file
        // dialog after the first upload (verified in real headless Chromium:
        // label.contains(input) goes true -> false on a textContent set, and
        // never comes back on its own). Real pre-existing bug, found while
        // mirroring this row for EPUB (W9).
        self.logic._startBookFromPDF(title, file).then(function() {
          uploadLabel.textContent = '📎 Or upload your own purchased ebook PDF';
          uploadLabel.appendChild(uploadInput);
          uploadInput.value = '';
        }).catch(function(e) {
          uploadLabel.textContent = '📎 Or upload your own purchased ebook PDF';
          uploadLabel.appendChild(uploadInput);
          uploadInput.value = '';
          RPGACE.utils.toast('Error: ' + e.message, '#CC4A4A', 4500);
        });
      };
      uploadLabel.appendChild(uploadInput);
      uploadRow.appendChild(uploadLabel);
      widget.appendChild(uploadRow);

      // W9: the exact EPUB sibling of the PDF upload row above - same
      // structure, same styling, same client-side-only extraction (nothing
      // but the extracted text ever leaves the browser), just a different
      // parser (_startBookFromEPUB) for a different file format.
      var epubRow = document.createElement('div');
      epubRow.style.cssText = 'margin-bottom:14px;';
      var epubLabel = document.createElement('label');
      epubLabel.textContent = '📎 Or upload your own purchased ebook EPUB';
      epubLabel.style.cssText = 'display:block;width:100%;padding:6px;background:none;border:1px dashed rgba(155,89,182,0.25);border-radius:6px;color:rgba(155,89,182,0.7);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;text-align:center;';
      var epubInput = document.createElement('input');
      epubInput.type = 'file';
      epubInput.accept = '.epub,application/epub+zip';
      epubInput.style.cssText = 'display:none;';
      epubInput.onchange = function() {
        var file = epubInput.files && epubInput.files[0];
        if (!file) return;
        var title = file.name.replace(/\.epub$/i, '').replace(/[-_]+/g, ' ');
        epubLabel.textContent = '⏳ Extracting text + detecting chapters...';
        // Re-append on restore - see the note on the PDF row above.
        self.logic._startBookFromEPUB(title, file).then(function() {
          epubLabel.textContent = '📎 Or upload your own purchased ebook EPUB';
          epubLabel.appendChild(epubInput);
          epubInput.value = '';
        }).catch(function(e) {
          epubLabel.textContent = '📎 Or upload your own purchased ebook EPUB';
          epubLabel.appendChild(epubInput);
          epubInput.value = '';
          RPGACE.utils.toast('Error: ' + e.message, '#CC4A4A', 4500);
        });
      };
      epubLabel.appendChild(epubInput);
      epubRow.appendChild(epubLabel);
      widget.appendChild(epubRow);

      var list = document.createElement('div');
      list.id = 'bookworm-list';
      list.innerHTML = '<div style="color:rgba(226,226,236,0.25);font-size:11px;">Loading...</div>';
      widget.appendChild(list);

      var kgPanel = document.getElementById('kg-panel');
      if (kgPanel && kgPanel.parentElement) kgPanel.parentElement.insertBefore(widget, kgPanel);
      else page.insertBefore(widget, page.firstChild);

      self.ui._refreshWidget();
    },

    _refreshWidget: function() {
      var self = RPGACE.modules.bookworm;
      var list = document.getElementById('bookworm-list');
      if (!list) return;
      list.innerHTML = '<div style="color:rgba(226,226,236,0.25);font-size:11px;">Loading...</div>';

      // Aug 22 (real /Routine follow-up — headless-Chromium-reproduced the
      // exact "boot task failed: Cannot read properties of undefined
      // (reading 'select')" warning from Alex's own console, with a real
      // stack trace pinning it here): this module registers before config
      // in file order, and config.init() is what sets RPGACE.sb — on
      // every real boot, _injectDashboardWidget's boot task called this
      // before RPGACE.sb existed yet, leaving the widget stuck on
      // "Loading..." forever (the throw aborted before the real fetch's
      // own .then/.catch could ever run). Same real guard dashDeck.
      // _refreshGlance already uses for the identical race.
      if (!RPGACE.sb || !RPGACE.sb.select) {
        list.innerHTML = '<div style="color:rgba(226,226,236,0.25);font-size:11px;">Loading...</div>';
        setTimeout(function() { self.ui._refreshWidget(); }, 400);
        return;
      }
      RPGACE.sb.select('bookworm_books', 'status=eq.in_progress&order=created_at.desc')
        .then(function(books) {
          books = books || [];
          list.innerHTML = '';
          if (!books.length) {
            list.innerHTML = '<div style="color:rgba(226,226,236,0.2);font-size:11px;">No books in progress - paste a URL above to start one.</div>';
            return;
          }
          return Promise.all(books.map(function(book) {
            return RPGACE.sb.select('bookworm_chapters', 'book_id=eq.' + book.id + '&select=id&order=chapter_index.asc').then(function(chapters) {
              return { book: book, total: (chapters || []).length };
            });
          })).then(function(rows) {
            rows.forEach(function(row) {
              var book = row.book, total = row.total;
              var pct = total ? Math.round((book.current_chapter_index / total) * 100) : 0;
              var card = document.createElement('div');
              card.style.cssText = 'padding:10px 12px;margin-bottom:8px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;';

              var topRow = document.createElement('div');
              topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;';
              var nameEl = document.createElement('div');
              nameEl.textContent = book.title;
              nameEl.style.cssText = 'font-size:12px;font-weight:600;color:#D4DAF5;flex:1;';
              // Delete button - real request after duplicate/dud books piled
              // up in this list from earlier detection-bug retries (each
              // retry creates a genuinely new book row, nothing gets
              // cleaned up automatically). Two clicks required (arms, then
              // confirms) since deletion isn't reversible - no separate
              // popup needed for something this low-risk-but-permanent.
              var delBtn = document.createElement('button');
              delBtn.textContent = '🗑';
              delBtn.title = 'Delete this book';
              delBtn.style.cssText = 'background:none;border:none;color:rgba(226,84,84,0.4);cursor:pointer;font-size:13px;padding:2px 4px;flex-shrink:0;';
              var armed = false;
              delBtn.onclick = function(e) {
                e.stopPropagation();
                if (!armed) {
                  armed = true;
                  delBtn.textContent = '❌ Confirm';
                  delBtn.style.color = '#CC4A4A';
                  setTimeout(function() { armed = false; delBtn.textContent = '🗑'; delBtn.style.color = 'rgba(226,84,84,0.4)'; }, 3000);
                  return;
                }
                RPGACE.sb.secureWrite('bookworm_books', 'delete', null, 'id=eq.' + book.id).then(function() {
                  RPGACE.utils.toast('🗑 Deleted: ' + book.title, 'rgba(226,226,236,0.5)', 2500);
                  self.ui._refreshWidget();
                }).catch(function(err) { RPGACE.utils.toast('Error: ' + err.message, '#CC4A4A', 3500); });
              };
              topRow.appendChild(nameEl); topRow.appendChild(delBtn);
              topRow.onclick = function() { self.logic._openBook(book.id); };

              // Total is known upfront regardless of source now (URL fetch
              // or TOC extraction both create every chapter row up front),
              // so both cases get the same real progress bar.
              var barOuter = document.createElement('div');
              barOuter.style.cssText = 'height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;margin:4px 0;';
              var barInner = document.createElement('div');
              barInner.style.cssText = 'height:100%;width:' + pct + '%;background:#9B6EC8;';
              barOuter.appendChild(barInner);
              var subEl = document.createElement('div');
              subEl.textContent = 'Chapter ' + Math.min(book.current_chapter_index + 1, total) + ' of ' + total;
              subEl.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.4);';
              card.appendChild(topRow); card.appendChild(barOuter); card.appendChild(subEl);
              list.appendChild(card);
            });
          });
        }).catch(function(e) {
          list.innerHTML = '<div style="color:#CC4A4A;font-size:11px;">Load error: ' + e.message + '</div>';
        });
    },

    // Dynamically loads PDF.js at runtime (never as a static <script> tag
    // in index.html - that's reserved for exactly main.js + rpgace_core.js
    // per this project's own rule, adding a 3rd static tag risks the same
    // password-gate race condition). Cached on RPGACE._pdfjsLib so it only
    // loads once per session.
    _ensurePdfJs: function() {
      if (RPGACE._pdfjsLib) return Promise.resolve(RPGACE._pdfjsLib);
      return new Promise(function(resolve, reject) {
        var script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = function() {
          var lib = window.pdfjsLib;
          if (!lib) { reject(new Error('PDF.js failed to load')); return; }
          lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          RPGACE._pdfjsLib = lib;
          resolve(lib);
        };
        script.onerror = function() { reject(new Error('Could not load PDF.js from CDN')); };
        document.head.appendChild(script);
      });
    },

    // Dynamically loads JSZip at runtime, same pattern (and same reason) as
    // _ensurePdfJs above - never a static <script> tag in index.html. An
    // EPUB file is just a ZIP archive of XHTML content files, so JSZip is
    // the only library needed; the XML/XHTML inside is parsed with the
    // browser's own built-in DOMParser, no second dependency.
    _ensureEpubJs: function() {
      if (RPGACE._jsZipLib) return Promise.resolve(RPGACE._jsZipLib);
      return new Promise(function(resolve, reject) {
        var script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = function() {
          var lib = window.JSZip;
          if (!lib) { reject(new Error('JSZip failed to load')); return; }
          RPGACE._jsZipLib = lib;
          resolve(lib);
        };
        script.onerror = function() { reject(new Error('Could not load JSZip from CDN')); };
        document.head.appendChild(script);
      });
    },

    // ── Function 1's visible output: confirm what was actually found     ──
    // ── before diving into chapter 1. Real gap found live: extraction     ──
    // ── succeeding silently and jumping straight to "paste chapter 1's    ──
    // ── text" looked exactly like the app had mistaken the table of       ──
    // ── contents itself for chapter 1 - there was no confirmation step    ──
    // ── showing "here's the structure I actually found" in between.       ──
    _renderStructureFound: function(book, chapters) {
      var self = RPGACE.modules.bookworm;
      var tt = RPGACE.modules.taxonomyTree;
      var box = self.ui._showReader('📚 Contents Found — ' + book.title, chapters.length + ' chapters extracted from the table of contents:');
      if (!box) return;

      var list = document.createElement('div');
      list.style.cssText = 'max-height:45vh;overflow-y:auto;margin-bottom:16px;';
      chapters.sort(function(a, b) { return a.chapter_index - b.chapter_index; }).forEach(function(c) {
        var row = document.createElement('div');
        row.style.cssText = 'padding:8px 10px;margin-bottom:4px;background:rgba(255,255,255,0.02);border-radius:6px;';
        var nameEl = document.createElement('div');
        nameEl.textContent = (c.chapter_index + 1) + '. ' + c.chapter_title;
        nameEl.style.cssText = 'font-size:12px;font-weight:600;color:#D4DAF5;';
        row.appendChild(nameEl);
        if (c.keywords && c.keywords.length) {
          var kwEl = document.createElement('div');
          kwEl.textContent = c.keywords.join(', ') + (c.suggested_phylum && tt ? ' — ' + tt.PHYLUM_NAMES[c.suggested_phylum] : '');
          kwEl.style.cssText = 'font-size:11px;color:rgba(155,89,182,0.6);margin-top:2px;';
          row.appendChild(kwEl);
        }
        list.appendChild(row);
      });
      box.appendChild(list);

      var startBtn = document.createElement('button');
      startBtn.textContent = '▶ Start Chapter 1';
      startBtn.style.cssText = 'width:100%;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#4CAF82;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      startBtn.onclick = function() { self.logic._openCurrentChapter(book.id); };
      box.appendChild(startBtn);

      var closeBtn = document.createElement('button');
      closeBtn.textContent = 'Exit to Dashboard';
      closeBtn.style.cssText = 'display:block;width:100%;margin-top:8px;padding:8px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.4);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      closeBtn.onclick = function() { self.ui._goToDashboard(); };
      box.appendChild(closeBtn);
    },

    // Navigates back to the Dashboard - shared by every Bookworm overlay's
    // Exit button (added July 19, per direct request) so leaving mid-flow
    // always lands somewhere useful instead of just removing the overlay
    // and leaving whatever page happened to be underneath. Background
    // analysis (_continueAnalyzingInBackground) isn't tied to the overlay's
    // lifetime anyway - it keeps running regardless of navigation.
    _goToDashboard: function() {
      if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.dashboard);
    },

    // ── Chapter list: tick per chapter + click-to-jump to any of them ──
    _renderChapterList: function(book, chapters) {
      var self = RPGACE.modules.bookworm;
      var box = self.ui._showReader('📖 ' + book.title, 'Chapters — tap any to jump straight there');
      if (!box) return;

      var list = document.createElement('div');
      list.style.cssText = 'max-height:60vh;overflow-y:auto;margin-bottom:16px;';
      chapters.slice().sort(function(a, b) { return a.chapter_index - b.chapter_index; }).forEach(function(c) {
        var row = document.createElement('div');
        var isCurrent = c.chapter_index === book.current_chapter_index && c.status !== 'complete';
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:9px 10px;margin-bottom:4px;background:rgba(255,255,255,0.02);border:1px solid ' + (isCurrent ? 'rgba(61,170,110,0.35)' : 'rgba(255,255,255,0.06)') + ';border-radius:6px;cursor:pointer;';

        var tick, statusLabel;
        if (c.status === 'complete') { tick = '✅'; statusLabel = 'Complete'; }
        else if (!c.raw_text) { tick = '✍️'; statusLabel = 'Needs chapter text'; }
        else if (c.insights && c.insights.length) { tick = '🔄'; statusLabel = 'In progress — insights awaiting review'; }
        else if (c.status === 'in_progress') { tick = '🔄'; statusLabel = 'Analyzing...'; }
        else { tick = '⏳'; statusLabel = 'Not started'; }

        var tickEl = document.createElement('div');
        tickEl.textContent = tick;
        tickEl.style.cssText = 'font-size:14px;flex-shrink:0;';
        var textWrap = document.createElement('div');
        textWrap.style.cssText = 'flex:1;min-width:0;';
        var nameEl = document.createElement('div');
        nameEl.textContent = (c.chapter_index + 1) + '. ' + c.chapter_title + (isCurrent ? ' — → Continue here' : '');
        nameEl.style.cssText = 'font-size:12px;font-weight:600;color:#D4DAF5;';
        var subEl = document.createElement('div');
        subEl.textContent = statusLabel;
        subEl.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.4);';
        textWrap.appendChild(nameEl); textWrap.appendChild(subEl);
        row.appendChild(tickEl); row.appendChild(textWrap);
        // L1 (Oct 10 2026): a chapter with insights can be read as flashcards.
        if (RPGACE.modules.recall && RPGACE.modules.recall.logic.chapterIdeas(c).length) {
          var fc = document.createElement('button');
          fc.type = 'button';
          fc.textContent = '🃏 Cards';
          fc.title = 'Read this chapter\'s insights as flashcards';
          fc.style.cssText = 'flex-shrink:0;min-height:36px;padding:4px 10px;background:none;border:1px solid rgba(201,168,76,0.4);border-radius:6px;color:#C9A84C;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
          fc.onclick = function(ev) { ev.stopPropagation(); RPGACE.modules.recall.openChapter(book, c); };
          row.appendChild(fc);
        }

        row.onclick = function() {
          if (c.status === 'complete') {
            self.ui._renderChapterSummary(book, c);
          } else if (!c.raw_text) {
            self.ui._renderAddChapterText(book, c);
          } else if (c.insights) {
            self.ui._renderInsightReview(book, c);
          } else {
            self.ui._renderChapterRead(book, c);
          }
        };
        list.appendChild(row);
      });
      box.appendChild(list);

      var closeBtn = document.createElement('button');
      closeBtn.textContent = 'Exit to Dashboard';
      closeBtn.style.cssText = 'display:block;width:100%;padding:8px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.4);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      closeBtn.onclick = function() { self.ui._goToDashboard(); };
      box.appendChild(closeBtn);
    },

    // ── Read-only view for an already-complete chapter: what was decided ──
    // on each of its insights. Nothing here can be re-run or re-approved -
    // per direct confirmation, a complete chapter is a historical record,
    // not something to reopen for editing.
    _renderChapterSummary: function(book, chapter) {
      var self = RPGACE.modules.bookworm;
      var tt = RPGACE.modules.taxonomyTree;
      var box = self.ui._showReader('✅ ' + book.title, chapter.chapter_title);
      if (!box) return;

      var insights = chapter.insights || [];
      var list = document.createElement('div');
      list.style.cssText = 'max-height:55vh;overflow-y:auto;margin-bottom:16px;';
      if (!insights.length) {
        var noneEl = document.createElement('div');
        noneEl.textContent = 'No insights were extracted from this chapter.';
        noneEl.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.4);';
        list.appendChild(noneEl);
      }
      insights.forEach(function(insight, i) {
        var row = document.createElement('div');
        row.style.cssText = 'padding:9px 10px;margin-bottom:6px;background:rgba(255,255,255,0.02);border-radius:6px;';
        var decisionTag = { approved: '✓ Approved', rejected: '✗ Rejected', edited: '✎ Edited' }[insight.decision] || insight.decision || '—';
        var decisionColor = insight.decision === 'rejected' ? '#CC4A4A' : '#4CAF82';
        // leafStatus (added July 19, alongside the background leaf-creation
        // queue) - an approved insight's decision can be set well before its
        // actual taxonomy_tree write lands or fails in the background, so
        // this view (the one place a chapter's insights are reviewed after
        // the fact) surfaces that honestly rather than showing "Approved"
        // as if the leaf definitely exists.
        var leafTag = '';
        if (insight.decision === 'approved' || insight.decision === 'edited') {
          if (insight.leafStatus === 'pending') leafTag = ' <span style="color:#E2A83D;">(leaf still writing...)</span>';
          else if (insight.leafStatus === 'failed') leafTag = ' <span style="color:#CC4A4A;">(⚠️ leaf write failed)</span>';
        }
        var head = document.createElement('div');
        head.innerHTML = '<span style="color:' + decisionColor + ';font-weight:700;">' + decisionTag + '</span>' + leafTag +
          (insight.phylumNumber && tt ? ' <span style="color:rgba(155,89,182,0.7);">— ' + (tt.PHYLUM_NAMES[insight.phylumNumber] || 'Phylum ' + insight.phylumNumber) + '</span>' : '');
        head.style.cssText = 'font-size:11px;margin-bottom:4px;';
        var textEl = document.createElement('div');
        textEl.textContent = insight.text;
        textEl.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.7);line-height:1.5;';
        row.appendChild(head); row.appendChild(textEl);
        if (insight.leafStatus === 'failed') {
          var retryBtn = document.createElement('button');
          retryBtn.textContent = '🔁 Retry Leaf Creation';
          retryBtn.style.cssText = 'margin-top:6px;padding:5px 10px;background:rgba(226,84,84,0.1);border:1px solid rgba(226,84,84,0.3);border-radius:6px;color:#CC4A4A;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
          retryBtn.onclick = function() {
            retryBtn.disabled = true; retryBtn.textContent = '⏳ Retrying...';
            self.logic._patchChapterInsightAt(chapter.id, i, function(current) { return Object.assign({}, current, { leafStatus: 'pending' }); })
              .then(function() { return self.logic._queueLeafCreation(chapter.id, i, insight, book && book.title); })
              .then(function() {
                retryBtn.textContent = '✓ Retried - reopen to confirm';
              }).catch(function(e) {
                retryBtn.disabled = false; retryBtn.textContent = '🔁 Retry Leaf Creation';
                RPGACE.utils.toast('Error: ' + e.message, '#CC4A4A', 3500);
              });
          };
          row.appendChild(retryBtn);
        }
        list.appendChild(row);
      });
      box.appendChild(list);

      var backBtn = document.createElement('button');
      backBtn.textContent = '← Back to chapter list';
      backBtn.style.cssText = 'width:100%;padding:9px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.3);border-radius:8px;color:#9B6EC8;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-bottom:8px;';
      backBtn.onclick = function() { self.logic._openBook(book.id); };
      box.appendChild(backBtn);

      var closeBtn = document.createElement('button');
      closeBtn.textContent = 'Exit to Dashboard';
      closeBtn.style.cssText = 'display:block;width:100%;padding:8px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.4);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      closeBtn.onclick = function() { self.ui._goToDashboard(); };
      box.appendChild(closeBtn);
    },

    // ── Chapter read view: full text, then a single "I've read this" button ──
    _renderChapterRead: function(book, chapter) {
      var self = RPGACE.modules.bookworm;
      var box = self.ui._showReader('📖 ' + book.title, chapter.chapter_title);
      if (!box) return;

      var textBox = document.createElement('div');
      textBox.style.cssText = 'white-space:pre-wrap;font-size:12px;color:rgba(226,226,236,0.7);line-height:1.7;background:rgba(255,255,255,0.02);border-radius:8px;padding:14px;margin-bottom:16px;max-height:50vh;overflow-y:auto;';
      var showingFormatted = false;
      textBox.textContent = chapter.raw_text;
      box.appendChild(textBox);

      var formatBtn = document.createElement('button');
      formatBtn.textContent = chapter.formatted_text ? '✨ Show Reader-Friendly Version' : '✨ Clean Up Formatting for Reading';
      formatBtn.style.cssText = 'width:100%;padding:9px;margin-bottom:8px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.3);border-radius:8px;color:#9B6EC8;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      formatBtn.onclick = function() {
        if (showingFormatted) {
          textBox.textContent = chapter.raw_text;
          showingFormatted = false;
          formatBtn.textContent = '✨ Show Reader-Friendly Version';
          return;
        }
        if (chapter.formatted_text) {
          textBox.textContent = chapter.formatted_text;
          showingFormatted = true;
          formatBtn.textContent = '📄 Show Original';
          return;
        }
        formatBtn.disabled = true; formatBtn.textContent = '⏳ Formatting for readability...';
        self.logic._formatChapterForReading(chapter).then(function(formatted) {
          chapter.formatted_text = formatted;
          textBox.textContent = formatted;
          showingFormatted = true;
          formatBtn.disabled = false;
          formatBtn.textContent = '📄 Show Original';
        }).catch(function(e) {
          formatBtn.disabled = false; formatBtn.textContent = '✨ Clean Up Formatting for Reading';
          RPGACE.utils.toast('Error formatting: ' + e.message, '#CC4A4A', 3500);
        });
      };
      box.appendChild(formatBtn);

      var readBtn = document.createElement('button');
      readBtn.textContent = "✓ I've Read This — Show Insights";
      readBtn.style.cssText = 'width:100%;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#4CAF82;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      readBtn.onclick = function() {
        // Extraction runs in the background from the moment this is clicked
        // (added July 19, per direct request) - doesn't wait for insight 1
        // like the review flow still does further down the pipeline. Errors
        // still surface as a toast even though the overlay's already gone;
        // RPGACE.utils.toast isn't tied to this overlay's lifetime.
        RPGACE.utils.toast('📖 Analyzing "' + chapter.chapter_title + '" in the background - check back via the book\'s chapter list when ready.', '#9B6EC8', 4500);
        self.ui._goToDashboard();
        self.logic._analyzeChapter(book, chapter).catch(function(e) {
          RPGACE.utils.toast('Error analyzing "' + chapter.chapter_title + '": ' + e.message, '#CC4A4A', 4500);
        });
      };
      box.appendChild(readBtn);

      // W8: jump straight back to this book's chapter list instead of having
      // to fully exit to the dashboard and re-open the book from scratch.
      // Same button/behaviour _renderChapterSummary has always had - the
      // other chapter-level views were simply missing it. _openBook re-fetches
      // (one cheap query) rather than threading the whole chapters array
      // through every render function's signature.
      var backBtn = document.createElement('button');
      backBtn.textContent = '← Back to chapter list';
      backBtn.style.cssText = 'width:100%;padding:9px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.3);border-radius:8px;color:#9B6EC8;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-top:8px;margin-bottom:8px;';
      backBtn.onclick = function() { self.logic._openBook(book.id); };
      box.appendChild(backBtn);

      var closeBtn = document.createElement('button');
      closeBtn.textContent = 'Exit to Dashboard';
      closeBtn.style.cssText = 'display:block;width:100%;margin-top:8px;padding:8px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.4);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      closeBtn.onclick = function() { self.ui._goToDashboard(); };
      box.appendChild(closeBtn);
    },

    // ── TOC-extracted chapters only: this chapter's title/order is       ──
    // ── already known from _startBookFromTOC - just needs its actual body──
    // ── text, which the user provides one chapter at a time as they      ──
    // ── transcribe/copy it from their physical copy.                     ──
    _renderAddChapterText: function(book, chapter) {
      var self = RPGACE.modules.bookworm;
      var box = self.ui._showReader('📖 ' + book.title, chapter.chapter_title);
      if (!box) return;

      var sub = document.createElement('div');
      sub.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.4);margin-bottom:14px;';
      sub.textContent = 'Paste this chapter\'s actual body text (not the table of contents entry) to continue.';
      box.appendChild(sub);

      var chapterTextInput = document.createElement('textarea');
      chapterTextInput.placeholder = 'Paste or type this chapter\'s text...';
      chapterTextInput.rows = 8;
      chapterTextInput.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#D4DAF5;font-size:12px;padding:8px 10px;outline:none;font-family:Rajdhani,sans-serif;resize:vertical;margin-bottom:12px;';
      box.appendChild(chapterTextInput);

      var warningBox = document.createElement('div');
      warningBox.style.cssText = 'display:none;font-size:11px;color:#CC4A4A;background:rgba(226,84,84,0.08);border:1px solid rgba(226,84,84,0.25);border-radius:6px;padding:8px 10px;margin-bottom:10px;';
      box.insertBefore(warningBox, chapterTextInput.nextSibling);

      var addBtn = document.createElement('button');
      addBtn.textContent = '✍️ Save this chapter\'s text';
      addBtn.style.cssText = 'width:100%;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#4CAF82;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-bottom:8px;';
      var confirmedAnyway = false;
      addBtn.onclick = function() {
        var text = chapterTextInput.value.trim();
        if (!text) { RPGACE.utils.toast('Add the chapter\'s text first', '#CC4A4A', 2000); return; }

        // Real, repeated live mistake: the table of contents (dot-leader
        // lines ending in a page number, e.g. "Title . . . . . 12") got
        // pasted here as the chapter's actual text, twice. Catch that
        // pattern before saving instead of relying on the user to notice.
        if (!confirmedAnyway && self.logic._looksLikeTableOfContents(text)) {
          warningBox.textContent = '⚠️ This looks like a table of contents (section titles with page numbers), not the chapter\'s actual prose. Click Save again to save it anyway, or replace it with the real chapter text.';
          warningBox.style.display = 'block';
          confirmedAnyway = true;
          return;
        }
        confirmedAnyway = false;
        warningBox.style.display = 'none';

        addBtn.disabled = true; addBtn.textContent = '⏳ Saving...';
        RPGACE.sb.secureWrite('bookworm_chapters', 'update', { raw_text: text }, 'id=eq.' + chapter.id).then(function() {
          self.logic._openCurrentChapter(book.id);
        }).catch(function(e) {
          addBtn.disabled = false; addBtn.textContent = '✍️ Save this chapter\'s text';
          RPGACE.utils.toast('Error: ' + e.message, '#CC4A4A', 3500);
        });
      };
      box.appendChild(addBtn);

      // W8: same "← Back to chapter list" escape hatch _renderChapterSummary
      // already had - see the note there.
      var backBtn = document.createElement('button');
      backBtn.textContent = '← Back to chapter list';
      backBtn.style.cssText = 'width:100%;padding:9px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.3);border-radius:8px;color:#9B6EC8;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-bottom:8px;';
      backBtn.onclick = function() { self.logic._openBook(book.id); };
      box.appendChild(backBtn);

      var closeBtn = document.createElement('button');
      closeBtn.textContent = 'Exit to Dashboard';
      closeBtn.style.cssText = 'display:block;width:100%;padding:8px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.4);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      closeBtn.onclick = function() { self.ui._goToDashboard(); };
      box.appendChild(closeBtn);
    },

    // ── Per-insight review: summary, path, justification, Approve/Reject/Edit ──
    _renderInsightReview: function(book, chapter) {
      var self = RPGACE.modules.bookworm;
      var insights = chapter.insights || [];
      var idx = chapter.current_insight_index || 0;

      if (idx >= insights.length) {
        if (chapter.analysis_complete) {
          self.logic._completeChapter(book, chapter);
        } else {
          self.ui._renderWaitingForNextInsight(book, chapter);
        }
        return;
      }
      var insight = insights[idx];
      if (insight.decision === 'approved' || insight.decision === 'rejected' || insight.decision === 'edited') {
        chapter = Object.assign({}, chapter, { current_insight_index: idx + 1 });
        self.ui._renderInsightReview(book, chapter);
        return;
      }

      var box = self.ui._showReader('📖 ' + book.title, chapter.chapter_title + ' — Insight ' + (idx + 1) + '/' + insights.length);
      if (!box) return;

      if (insight.paused) {
        var pausedBox = document.createElement('div');
        pausedBox.style.cssText = 'font-size:12px;color:#9B6EC8;margin-bottom:14px;';
        pausedBox.textContent = '🌳 Tree paused until the phyla are rebuilt — Keep saves this as an idea card, nothing is added to the tree.';
        box.appendChild(pausedBox);
      } else if (!insight.fits) {
        var unplaceableBox = document.createElement('div');
        unplaceableBox.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.5);margin-bottom:14px;';
        unplaceableBox.textContent = 'Could not find a confident home for this insight - skipped rather than forced into a leaf.';
        box.appendChild(unplaceableBox);
      }

      var summary = document.createElement('div');
      summary.style.cssText = 'font-size:13px;color:#D4DAF5;line-height:1.6;margin-bottom:14px;padding:10px 12px;background:rgba(255,255,255,0.02);border-radius:8px;';
      summary.textContent = insight.text;
      box.appendChild(summary);
      // LL-5: "🔗 Find links" to learn more about this insight.
      var wlm = RPGACE.modules.webLookup;
      if (wlm && insight.text) {
        var fl = wlm.ui.findLinksButton(insight.text, (book && book.title) ? 'from the book "' + String(book.title).slice(0, 60) + '"' : '');
        fl.style.marginBottom = '12px';
        box.appendChild(fl);
      }
      // Realm Tasks: a book insight can become a task (duplicate-checked).
      if (RPGACE.modules.realmTasks && insight.text) {
        var tb = RPGACE.modules.realmTasks.ui.taskButton({ title: String(insight.text).slice(0, 120), realm: insight.realm || null, kind: 'once', source: { table: 'bookworm', ref: String(insight.id || insight.text).slice(0, 80), label: String((book && book.title) || 'book').slice(0, 60) } });
        tb.style.marginBottom = '12px'; box.appendChild(tb);
      }

      var tt = RPGACE.modules.taxonomyTree;
      var pathLine = document.createElement('div');
      pathLine.style.cssText = 'font-size:11px;color:#4CAF82;margin-bottom:8px;';
      pathLine.innerHTML = '<strong>Path:</strong> ' + (insight.phylumNumber ? (tt.PHYLUM_NAMES[insight.phylumNumber] || 'Phylum ' + insight.phylumNumber) : '?') +
        (insight.attachPath ? '/' + insight.attachPath.split('/').slice(1).join('/') : '') +
        (insight.newSteps && insight.newSteps.length ? '/' + insight.newSteps.join('/') : '');
      if (!insight.paused) box.appendChild(pathLine);

      if (insight.justification) {
        var justLine = document.createElement('div');
        justLine.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.5);font-style:italic;margin-bottom:14px;';
        justLine.textContent = insight.justification + (insight.confidenceScore ? ' (confidence ' + insight.confidenceScore + '/10)' : '');
        box.appendChild(justLine);
      }

      var editWrap = document.createElement('div');
      editWrap.style.cssText = 'display:none;margin-bottom:12px;';
      var editInput = document.createElement('textarea');
      editInput.placeholder = 'Your own path, slash-separated (e.g. Order/Class/Family)...';
      editInput.style.cssText = 'width:100%;min-height:60px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#D4DAF5;font-size:12px;padding:8px;outline:none;font-family:Rajdhani,sans-serif;';
      var editSubmit = document.createElement('button');
      editSubmit.textContent = 'Use this path';
      editSubmit.style.cssText = 'margin-top:6px;padding:6px 14px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:6px;color:#4CAF82;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      editWrap.appendChild(editInput); editWrap.appendChild(editSubmit);
      box.appendChild(editWrap);

      var advance = function(decision, updates) {
        var newInsight = Object.assign({}, insight, { decision: decision }, updates || {});
        var newInsights = insights.slice();
        newInsights[idx] = newInsight;
        var newChapter = Object.assign({}, chapter, { insights: newInsights, current_insight_index: idx + 1 });
        // Safe read-modify-write (added July 19, alongside the background
        // leaf-creation queue below) instead of blindly overwriting the
        // whole insights array from this closure - the queue writes to the
        // same array asynchronously, sometime after the UI has already
        // moved on to a later insight, so a blind write here could clobber
        // a leaf-creation result that landed first.
        self.logic._patchChapterInsightAt(chapter.id, idx, function() { return newInsight; }, { current_insight_index: idx + 1 }).catch(function() {});
        self.ui._renderInsightReview(book, newChapter);
      };

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
      var approveBtn = document.createElement('button');
      approveBtn.textContent = '✓ Approve';
      approveBtn.disabled = !insight.fits;
      approveBtn.style.cssText = 'flex:1;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#4CAF82;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;opacity:' + (insight.fits ? '1' : '0.4') + ';';
      if (insight.paused) {
        approveBtn.textContent = '✓ Keep';
        approveBtn.disabled = false;
        approveBtn.style.opacity = '1';
      }
      approveBtn.onclick = function() {
        if (insight.paused) { advance('approved', { leafStatus: 'paused' }); return; } // LL-3: no tree write
        // Advances to the next insight IMMEDIATELY (added July 19, per
        // direct request) - the actual taxonomy_tree write no longer blocks
        // the review flow. Queued instead (_queueLeafCreation) so several
        // approvals in a row never run _insertNewSteps concurrently with
        // itself (it does a chained parent_id insert - unsafe to overlap).
        advance('approved', { leafStatus: 'pending' });
        self.logic._queueLeafCreation(chapter.id, idx, insight, book && book.title);
      };
      var rejectBtn = document.createElement('button');
      rejectBtn.textContent = '✗ Reject';
      rejectBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(226,84,84,0.2);border-radius:8px;color:#CC4A4A;font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      rejectBtn.onclick = function() { advance('rejected'); };
      var editBtn = document.createElement('button');
      editBtn.textContent = '✎ Edit';
      editBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(155,89,182,0.25);border-radius:8px;color:#9B6EC8;font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      editBtn.onclick = function() { editWrap.style.display = 'block'; };
      editSubmit.onclick = function() {
        var steps = editInput.value.split('/').map(function(s) { return s.trim(); }).filter(Boolean);
        if (!steps.length) { RPGACE.utils.toast('Enter at least one path step', '#CC4A4A', 2000); return; }
        editSubmit.disabled = true; editSubmit.textContent = 'Creating...';
        var pp = RPGACE.modules.phylumPath;
        // W5: `book` IS in this closure's scope (unlike _queueLeafCreation),
        // so the companion entry gets the real book title directly.
        pp._insertNewSteps(insight.phylumNumber, insight.attachNode || null, steps, steps.map(function() { return ''; }), insight.text,
          { source: 'bookworm', title: (book && book.title) || 'Bookworm insight' })
          .then(function() { advance('edited', { newSteps: steps }); })
          .catch(function(e) { RPGACE.utils.toast('Error: ' + e.message, '#CC4A4A', 3500); editSubmit.disabled = false; editSubmit.textContent = 'Use this path'; });
      };

      btnRow.appendChild(approveBtn); btnRow.appendChild(rejectBtn); if (!insight.paused) btnRow.appendChild(editBtn);
      box.appendChild(btnRow);

      // W8: same "← Back to chapter list" escape hatch _renderChapterSummary
      // already had - see the note there.
      var backBtn = document.createElement('button');
      backBtn.textContent = '← Back to chapter list';
      backBtn.style.cssText = 'width:100%;padding:9px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.3);border-radius:8px;color:#9B6EC8;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-top:10px;margin-bottom:8px;';
      backBtn.onclick = function() { self.logic._openBook(book.id); };
      box.appendChild(backBtn);

      var closeBtn = document.createElement('button');
      closeBtn.textContent = 'Exit to Dashboard';
      closeBtn.style.cssText = 'display:block;width:100%;margin-top:10px;padding:8px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.4);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      closeBtn.onclick = function() { self.ui._goToDashboard(); };
      box.appendChild(closeBtn);
    },

    // Shown when the next insight isn't ready yet - background analysis
    // (_continueAnalyzingInBackground above) is still working on it. Polls
    // Supabase every few seconds instead of blocking the whole chapter on
    // every insight finishing before showing anything - real report: a
    // 13-insight chapter took ~7 minutes before the FIRST insight appeared.
    _renderWaitingForNextInsight: function(book, chapter) {
      var self = RPGACE.modules.bookworm;
      var box = self.ui._showReader('📖 ' + book.title, 'Analyzing next insight...');
      if (!box) return;
      box.style.textAlign = 'center';
      var msg = document.createElement('div');
      msg.textContent = '⏳ Still analyzing the next insight in the background...';
      msg.style.cssText = 'font-size:13px;color:rgba(226,226,236,0.6);margin-bottom:14px;';
      box.appendChild(msg);

      // Resume button (added July 19, per direct request to harden against
      // a closed tab): background analysis is a client-side promise chain,
      // not a server job - if the tab that started it closes, this screen
      // would otherwise poll forever with nothing actually running. Hidden
      // until the heartbeat (_continueAnalyzingInBackground/_analyzeChapter
      // update it after every insight) has gone stale for a while, so a
      // chapter that's just genuinely slow doesn't get falsely flagged.
      var resumeBtn = document.createElement('button');
      resumeBtn.textContent = '▶ Resume Analysis';
      resumeBtn.style.cssText = 'display:none;width:100%;margin-bottom:10px;padding:9px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.3);border-radius:8px;color:#9B6EC8;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      box.appendChild(resumeBtn);

      var stopped = false;

      // W8: same "← Back to chapter list" escape hatch _renderChapterSummary
      // already had - see the note there. This view additionally has to set
      // `stopped`, exactly like Exit to Dashboard below does: the poll loop
      // is not tied to the overlay's lifetime, so leaving it running would
      // pop a stale insight-review overlay on top of the chapter list the
      // moment the next background insight landed.
      var backBtn = document.createElement('button');
      backBtn.textContent = '← Back to chapter list';
      backBtn.style.cssText = 'width:100%;padding:9px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.3);border-radius:8px;color:#9B6EC8;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-bottom:8px;';
      backBtn.onclick = function() { stopped = true; self.logic._openBook(book.id); };
      box.appendChild(backBtn);

      var closeBtn = document.createElement('button');
      closeBtn.textContent = 'Exit to Dashboard';
      closeBtn.style.cssText = 'padding:8px 16px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.4);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      closeBtn.onclick = function() { stopped = true; self.ui._goToDashboard(); };
      box.appendChild(closeBtn);

      var idx = chapter.current_insight_index || 0;
      var STALL_MS = 45000;
      var poll = function() {
        if (stopped) return;
        RPGACE.sb.select('bookworm_chapters', 'id=eq.' + chapter.id + '&limit=1').then(function(rows) {
          if (stopped) return;
          var fresh = rows && rows[0];
          if (!fresh) return;
          if ((fresh.insights || []).length > idx || fresh.analysis_complete) {
            self.ui._renderInsightReview(book, fresh);
            return;
          }
          // CC-2: the extraction is with Orchestrator CC - no stall/Resume,
          // just when it will be picked up (it isn't a stuck browser chain).
          var oc = RPGACE.modules.orchestratorCC;
          if (fresh.cc_queued_at && oc) {
            msg.textContent = '🤖 ' + oc.logic.waiting(fresh.cc_queued_at).text.replace(/^⏳ /, '') + ' — the insights come back by themselves; you can leave this screen.';
            resumeBtn.style.display = 'none';
            setTimeout(poll, 30000);
            return;
          }
          var heartbeatMs = fresh.analysis_heartbeat ? new Date(fresh.analysis_heartbeat).getTime() : 0;
          var staleFor = heartbeatMs ? (Date.now() - heartbeatMs) : 0;
          if (heartbeatMs && staleFor > STALL_MS) {
            msg.textContent = '⏳ No progress in over ' + Math.round(staleFor / 1000) + 's - looks stalled (likely the tab that started this was closed).';
            resumeBtn.style.display = 'block';
            resumeBtn.onclick = function() {
              resumeBtn.disabled = true; resumeBtn.textContent = '⏳ Resuming...';
              self.logic._resumeChapterAnalysis(book, fresh).catch(function(e) {
                RPGACE.utils.toast('Error resuming: ' + e.message, '#CC4A4A', 3500);
              }).then(function() {
                if (resumeBtn.isConnected) { resumeBtn.disabled = false; resumeBtn.textContent = '▶ Resume Analysis'; }
              });
            };
          }
          setTimeout(poll, 4000);
        }).catch(function() { if (!stopped) setTimeout(poll, 4000); });
      };
      setTimeout(poll, 4000);
    },

    // ── Bibliography section ──────────────────────────────────────────
    // Aug 23 2026 (UI2/UI3) — was "on the Research page", built straight into
    // #page-learning via a fallback chain whose leading 'page-research' clause
    // was confirmed dead. That page is retired; this now builds into the same
    // shared staging holder every other relocatable panel uses
    // (RPGACE.utils.panelHome), and dashDeck._openBookworm's own
    // "📚 Open Bibliography" button MOVES the node into its own popup.
    _injectBibliographySection: function() {
      var self = RPGACE.modules.bookworm;
      var existing = document.getElementById('bookworm-bibliography');
      // If the panel currently lives inside an open popup, rebuilding it here
      // would tear the live node out from under that popup. Rebuild it in
      // place instead: remember the real parent and re-append there.
      var page = (existing && existing.parentNode) || RPGACE.utils.panelHome();
      if (!page) return;
      if (existing) existing.remove();

      var wrap = document.createElement('div');
      wrap.id = 'bookworm-bibliography';
      wrap.style.cssText = 'background:rgba(155,89,182,0.03);border:1px solid rgba(155,89,182,0.12);border-radius:12px;padding:18px 22px;margin-bottom:20px;';
      var hdr = document.createElement('div');
      hdr.className = 'section-title';
      hdr.style.cssText = 'font-size:14px;margin-bottom:10px;';
      hdr.textContent = '📚 Bibliography';
      wrap.appendChild(hdr);

      var list = document.createElement('div');
      list.innerHTML = '<div style="color:rgba(226,226,236,0.25);font-size:11px;">Loading...</div>';
      wrap.appendChild(list);
      // Append at the end of whichever container currently hosts it (the
      // shared staging holder, or the open popup it was already inside) - NOT
      // page.firstChild, which used to put it above the page title and the tab
      // bar on every visit (Bug B).
      page.appendChild(wrap);
      RPGACE.hooks.fire('research:panel-injected');

      RPGACE.sb.select('bibliography', 'order=completed_at.desc').then(function(rows) {
        rows = rows || [];
        list.innerHTML = '';
        if (!rows.length) { list.innerHTML = '<div style="color:rgba(226,226,236,0.2);font-size:11px;">No completed books yet.</div>'; return; }
        var tt = RPGACE.modules.taxonomyTree;
        rows.forEach(function(row) {
          var card = document.createElement('div');
          card.style.cssText = 'padding:10px 12px;margin-bottom:8px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;';
          var nameEl = document.createElement('div');
          nameEl.textContent = row.title;
          nameEl.style.cssText = 'font-size:12px;font-weight:600;color:#D4DAF5;';
          var subEl = document.createElement('div');
          var phylaNames = (row.phyla_touched || []).map(function(n) { return tt ? tt.PHYLUM_NAMES[n] : n; }).join(', ');
          subEl.textContent = row.total_chapters + ' chapters, ' + row.total_insights_placed + ' insights placed' + (phylaNames ? ' — ' + phylaNames : '');
          subEl.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.4);';
          card.appendChild(nameEl); card.appendChild(subEl);
          list.appendChild(card);
        });
      }).catch(function(e) { list.innerHTML = '<div style="color:#CC4A4A;font-size:11px;">Load error: ' + e.message + '</div>'; });
    },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. A fresh repo-wide grep for `RPGACE.modules.bookworm` found FOUR
  // externally-called methods across five real call sites, not the two this
  // pass was briefed with — the extra two are the `ensure:` hooks inside
  // dashDeck.PAGE_PANELS, which reach the module by property name and are
  // easy to miss because they never name it in a `var bw = ...` alias:
  //   • _openBook              <- dashDeck's Continue-a-book glance item, and
  //                               the Bookworm popup's own Resume button
  //   • _injectDashboardWidget <- PAGE_PANELS['bookworm-widget'].ensure
  //   • _injectBibliographySection <- PAGE_PANELS['bookworm-bibliography'].ensure
  //   • _resumeFromFallback    <- phylumPath._checkFallbackAnswers' sweep
  // All four keep working byte-identically with zero change on their side
  // (three of the five sites additionally guard with `if (m && m._method)`,
  // which a pass-through satisfies exactly as the original method did, since
  // it is a real own function on the module object). Every other
  // moved function gets a pass-through too, so the module object exposes
  // exactly the same method names it did before this split. `this` here
  // is always the module itself — every real call site invokes these as a
  // property access on RPGACE.modules.bookworm, never as a detached
  // function reference.
  _startBook: function(url) { return this.logic._startBook(url); },
  _startBookFromPDF: function(title, file) { return this.logic._startBookFromPDF(title, file); },
  _resolveEpubPath: function(baseDir, href) { return this.logic._resolveEpubPath(baseDir, href); },
  _parseEpubXml: function(text, mime) { return this.logic._parseEpubXml(text, mime); },
  _startBookFromEPUB: function(title, file) { return this.logic._startBookFromEPUB(title, file); },
  _phylumListForPrompt: function() { return this.logic._phylumListForPrompt(); },
  _createBookFromExtraction: function(result, sourceUrl) { return this.logic._createBookFromExtraction(result, sourceUrl); },
  _startBookFromTOC: function(title, tocText) { return this.logic._startBookFromTOC(title, tocText); },
  _openBook: function(bookId) { return this.logic._openBook(bookId); },
  _openCurrentChapter: function(bookId) { return this.logic._openCurrentChapter(bookId); },
  _chunkTextForFormatting: function(text, maxChunkChars) { return this.logic._chunkTextForFormatting(text, maxChunkChars); },
  _formatChapterForReading: function(chapter) { return this.logic._formatChapterForReading(chapter); },
  _looksLikeTableOfContents: function(text) { return this.logic._looksLikeTableOfContents(text); },
  _analyzeChapter: function(book, chapter) { return this.logic._analyzeChapter(book, chapter); },
  _continueAnalyzingInBackground: function(chapterId, remainingTexts, primaryPhylum, remainingPhyla) { return this.logic._continueAnalyzingInBackground(chapterId, remainingTexts, primaryPhylum, remainingPhyla); },
  _resumeFromFallback: function(row) { return this.logic._resumeFromFallback(row); },
  _resumeChapterAnalysis: function(book, chapter) { return this.logic._resumeChapterAnalysis(book, chapter); },
  _placeInsightCascade: function(insightText, primaryPhylum, remainingPhyla, priorLeaves, chapterId) { return this.logic._placeInsightCascade(insightText, primaryPhylum, remainingPhyla, priorLeaves, chapterId); },
  _decidePlacementScored: function(insightText, phylumNumber, priorLeaves, fallbackContext) { return this.logic._decidePlacementScored(insightText, phylumNumber, priorLeaves, fallbackContext); },
  _rewordInsight: function(insightText) { return this.logic._rewordInsight(insightText); },
  _checkUpgradeable: function(insightText, phylumNumber) { return this.logic._checkUpgradeable(insightText, phylumNumber); },
  _finalPlacementSearch: function(insightText) { return this.logic._finalPlacementSearch(insightText); },
  _patchChapterInsightAt: function(chapterId, idx, patchFn, extraFields) { return this.logic._patchChapterInsightAt(chapterId, idx, patchFn, extraFields); },
  _queueLeafCreation: function(chapterId, idx, insight, bookTitle) { return this.logic._queueLeafCreation(chapterId, idx, insight, bookTitle); },
  _completeChapter: function(book, chapter) { return this.logic._completeChapter(book, chapter); },
  _markBookComplete: function(book) { return this.logic._markBookComplete(book); },
  _patchChatTrigger: function() { return this.ui._patchChatTrigger(); },
  _injectDashboardWidget: function() { return this.ui._injectDashboardWidget(); },
  _refreshWidget: function() { return this.ui._refreshWidget(); },
  _ensurePdfJs: function() { return this.ui._ensurePdfJs(); },
  _ensureEpubJs: function() { return this.ui._ensureEpubJs(); },
  _renderStructureFound: function(book, chapters) { return this.ui._renderStructureFound(book, chapters); },
  _goToDashboard: function() { return this.ui._goToDashboard(); },
  _renderChapterList: function(book, chapters) { return this.ui._renderChapterList(book, chapters); },
  _renderChapterSummary: function(book, chapter) { return this.ui._renderChapterSummary(book, chapter); },
  _renderChapterRead: function(book, chapter) { return this.ui._renderChapterRead(book, chapter); },
  _renderAddChapterText: function(book, chapter) { return this.ui._renderAddChapterText(book, chapter); },
  _renderInsightReview: function(book, chapter) { return this.ui._renderInsightReview(book, chapter); },
  _renderWaitingForNextInsight: function(book, chapter) { return this.ui._renderWaitingForNextInsight(book, chapter); },
  _injectBibliographySection: function() { return this.ui._injectBibliographySection(); },
});
/* ===END:bookworm=== */
