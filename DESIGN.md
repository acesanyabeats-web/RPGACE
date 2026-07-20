# DESIGN.md — RPGACE Structural Restructure

> One scroll answers everything: who you are, what your tools are, where to go next — in RPGACE's own gold-and-dark RPG skin, untouched.

**Reference**: aingertomlin.co.nz (structure ONLY — hero answering who/what/how in one scroll, 2×2 service-card grid with one link each, narrative-left/"At a glance"-right sections, strict 3-color discipline). **Identity source**: RPGACE's existing `style.css` — every color and font below is the app's current real token, not a new one. This spec restructures layout; it deliberately changes zero visual identity.

## 1. Visual Theme & Atmosphere

**Style**: Dark RPG command deck with accounting-firm structural discipline
**Keywords**: gold-on-dark, Cinzel serif authority, stat-bar HUD, one-scroll clarity, 2×2 order, checklist scannability, restrained accents
**Tone**: A guild hall's quest board run by a meticulous clerk — NOT a neon dashboard sprayed with every accent color at once
**Feel**: Same armor, better-organized armory.

**Interaction Tier**: L1 (refined static — existing hover/toast behavior kept; soft entrance fades only)
**Dependencies**: CSS only (no GSAP/Lenis/scroll-jacking — this is a working tool, not a landing page)

## 2. Color Palette & Roles

All values are RPGACE's EXISTING tokens (style.css `:root`), re-declared with template role aliases + RGB helpers. Zero new colors.

```css
:root {
  /* Backgrounds */
  --bg: #0d0f14;            /* = --dark, page background */
  --bg-deep: #080a0e;       /* = --darker, nav/gate */
  --surface: #13161e;       /* = --panel, cards/containers */
  --surface-alt: #1a1e29;   /* = --panel2, nested/alternate */
  --surface-hover: #20263a; /* = --panel3 */

  /* Borders */
  --border: #2a3050;
  --border-hover: #3a4570;  /* = --border2 */

  /* Text */
  --text: #d4daf5;
  --text-secondary: #6a7099; /* = --muted */
  --text-tertiary: rgba(106,112,153,0.7);

  /* Accent (primary) */
  --accent: #c9a84c;        /* = --gold */
  --accent-hover: #e8c96a;  /* = --gold2 */

  /* RGB helpers for rgba() */
  --bg-rgb: 13,15,20;
  --surface-rgb: 19,22,30;
  --accent-rgb: 201,168,76;
  --green-rgb: 76,175,130;
  --purple-rgb: 155,110,200;
  --blue-rgb: 74,140,204;
  --red-rgb: 204,74,74;

  /* Semantic (existing) */
  --success: #4caf82;       /* = --green */
  --error: #cc4a4a;         /* = --red */
  --warning: #cc7a3a;       /* = --orange */
  --info: #4a8ccc;          /* = --blue */
  --special: #9b6ec8;       /* = --purple */
  --hp-col: #e05555; --mp-col: #5588ee; --xp-col: #c9a84c;
}
```

**Color Rules (the Ainger 3-color discipline, adapted):**
- Every color referenced via CSS variable — zero hardcoded hex in new markup.
- **Per section: neutrals + gold + AT MOST ONE module accent.** A module owns one accent (Research=purple, Bookworm=purple, Taxonomy=green, Oracle=gold, Beat Log=blue, Intel=blue) and uses it for its eyebrow, border tint, and link only — never for body text.
- Semantic colors (success/error/warning) appear only on status chips, toasts, and validation — never decoratively.
- Stat-bar colors (hp/mp/xp) are reserved exclusively for the character HUD.

## 3. Typography Rules

**Font Stack** (existing — already loaded by index.html):
```css
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Rajdhani:wght@400;500;600;700&display=swap');
```

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Hero H1 (character name / page title) | Cinzel, serif | 20–22px | 700 | 1.25 | 2–3px |
| Section H2 (`.section-title`) | Rajdhani | 15–16px | 700 | 1.3 | 1.5px, uppercase |
| Card H3 / module name | Rajdhani | 14px | 700 | 1.35 | 1px |
| Body / narrative | Rajdhani | 13px | 500 | 1.65 | 0 |
| Label / eyebrow | Rajdhani | 9–10px | 700 | 1.2 | 2–3px, uppercase |
| At-a-glance checklist item | Rajdhani | 12px | 600 | 1.7 | 0 |
| Mono (bars, offsets) | monospace | 10px | 400 | 1.4 | — |

**Typography Rules:**
- Cinzel is reserved for identity moments (brand, character name, big stat values) — never body text.
- Headings weight ≥ 700; body never below 12px; checklists never below 12px.
- No new font families. No font-size inflation to fake hierarchy — hierarchy comes from the eyebrow/H3/body pattern.

## 4. Component Stylings

**Module Card** (the 2×2 grid unit — Ainger's service card in RPGACE skin):
```css
.mod-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;
  padding:18px 20px;display:flex;flex-direction:column;gap:8px;transition:border-color .2s, transform .15s}
.mod-card .eyebrow{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
  color:rgba(var(--mod-accent-rgb,var(--accent-rgb)),0.7)}
.mod-card h3{font-size:14px;font-weight:700;color:var(--text);letter-spacing:1px}
.mod-card p{font-size:12px;color:var(--text-secondary);line-height:1.6}
.mod-card .glance{font-size:11px;color:var(--text-secondary)} /* live stat, e.g. "35 analysed · 27 watchlist" */
.mod-card a.go{margin-top:auto;font-size:12px;font-weight:700;color:var(--accent);text-decoration:none;
  padding:9px 0;min-height:38px;display:inline-flex;align-items:center;gap:6px}
.mod-card:hover{border-color:var(--border-hover);transform:translateY(-2px)}
.mod-card a.go:hover{color:var(--accent-hover)}
.mod-card a.go:focus-visible{outline:1px solid var(--accent);outline-offset:3px;border-radius:4px}
.mod-card[data-disabled]{opacity:.45;pointer-events:none} /* disabled state */
.mod-card:active{transform:translateY(0)}
```

**Narrative/Checklist section** (Ainger's services-page pattern):
```css
.split-sec{display:grid;grid-template-columns:1.4fr 1fr;gap:24px;padding:20px 0;border-top:1px solid var(--border)}
.split-sec .story h2{/* Section H2 per §3 */}
.split-sec .story p{font-size:13px;color:var(--text-secondary);line-height:1.65;max-width:56ch}
.split-sec .glance-box{background:var(--surface-alt);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
.split-sec .glance-box .g-title{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--text-secondary);margin-bottom:8px}
.split-sec .glance-box li{list-style:none;font-size:12px;font-weight:600;line-height:1.7;color:var(--text)}
.split-sec .glance-box li::before{content:'✦';color:var(--accent);margin-right:8px} /* gold check, Ainger's orange ticks */
```

**Buttons** (existing `.gate-btn`/`.learn-btn` idiom, all states):
```css
.btn-primary{padding:10px 18px;min-height:40px;border-radius:8px;background:rgba(var(--accent-rgb),.15);
  border:1px solid var(--accent);color:var(--accent);font:700 13px Rajdhani;letter-spacing:1.5px;cursor:pointer;transition:all .2s}
.btn-primary:hover{background:rgba(var(--accent-rgb),.28)}
.btn-primary:focus-visible{outline:2px solid var(--accent-hover);outline-offset:2px}
.btn-primary:active{transform:scale(.98)}
.btn-primary:disabled{opacity:.4;cursor:not-allowed}
.btn-ghost{same geometry; background:none;border-color:var(--border);color:var(--text-secondary)}
.btn-ghost:hover{border-color:var(--border-hover);color:var(--text)}
```

**Status chip** (existing convention, formalized): pill, 10px/700, `rgba(semantic,.15)` bg + semantic color text; states: pending=warning, done=success, failed=error, info=info.

**Nav**: unchanged — existing sticky `.nav` + `.nav-tab` (this spec does not touch navigation).

## 5. Layout Principles

**The one-scroll Dashboard contract** (Ainger homepage, translated):
1. **Hero = Character HUD** (exists): avatar, name in Cinzel gold, HP/MP/XP bars, stat chips → answers *"who am I"*.
2. **Immediately below: the 2×2 Module Grid** → answers *"what are my tools"*. Exactly 4 cards above the fold: 🧠 Research Lab, 📖 Bookworm, 🌳 Taxonomy & Review, ⚡ Oracle. Each: eyebrow (module accent) → name → one-line description → one live "at a glance" stat → ONE gold link ("Enter →"). No embedded forms, no scrolling widgets inside cards.
3. **Below the fold: `.split-sec` stacks** → answers *"what needs me now"*. Each current dashboard widget (review queue, in-progress books, quests, agenda) becomes narrative-left ("2 chapters awaiting insight review") + glance-box-right (checklist of concrete pending items, each a link). One widget = one split section, separated by 1px border-top, no nested panels-in-panels.

**Research page**: keeps the existing sub-tab bar (shipped July 19); each tab's panel adopts the same discipline — panel header (eyebrow + H2 + one-line description) then EITHER a card grid or a split-sec, never freeform stacking.

**Spacing scale**: 4 / 8 / 12 / 16 / 20 / 24 / 40px only. **Container**: max-width 1080px, centered, 16px side padding. **Grid**: module grid `repeat(2, 1fr)` gap 12px.

## 6. Depth & Elevation

Flat-first (existing app has no shadow system — keep it that way):
- Level 0 (page): none. Level 1 (cards/panels): 1px `--border` only.
- Level 2 (hover): border → `--border-hover` + translateY(-2px), no shadow.
- Level 3 (overlays/popups only): `box-shadow: 0 12px 40px rgba(0,0,0,.5)` — the single permitted shadow, existing overlay convention.

## 7. Animation & Interaction (L1)

```css
@keyframes riseIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.mod-card,.split-sec{animation:riseIn .35s ease both}
.mod-card:nth-child(2){animation-delay:.05s}.mod-card:nth-child(3){animation-delay:.1s}.mod-card:nth-child(4){animation-delay:.15s}
@media (prefers-reduced-motion: reduce){*{animation:none !important;transition:none !important}}
```
- Hover states per §4 only. NO scroll-driven effects, NO parallax, NO pins, NO cursor effects — L1 by explicit product decision (working tool, identity preservation).
- Existing app interactions (toasts, popups, stat-bar fills) are kept exactly as they are.

## 8. Do's and Don'ts

**Do:**
1. Reuse existing CSS variables for every color; existing Cinzel/Rajdhani stack for every glyph.
2. Give every module exactly ONE accent color and use gold for every "go" action.
3. Keep every card's contract: eyebrow → name → one line → one stat → one link.
4. Answer who/what/what-needs-me within one Dashboard scroll at 1280×800.
5. Keep all overlays appended to `document.body` (existing landmine rule).
6. Keep touch targets ≥ 38px (44px preferred on primary actions).

**Don't:**
1. Don't introduce any new hex color, font family, or shadow level.
2. Don't put more than one accent color (beyond gold) inside a single section.
3. Don't embed forms/inputs inside module-grid cards — cards navigate, pages act.
4. Don't nest panels inside panels more than one level (`--surface` → `--surface-alt` max).
5. Don't add scroll-jacking, parallax, WebGL, or cursor effects — L1 is a hard cap here.
6. Don't touch the nav, the password gate, or the character HUD's internals.
7. Don't add a static `<script>` tag to index.html (two-script rule) — all wiring stays in rpgace_core.js modules.
8. Don't use emoji as icons in NEW glance-box checklists (existing emoji module titles stay — identity).

## 9. Responsive Behavior

- **Breakpoint**: 600px (existing app convention).
- ≤600px: module grid → 1 column; `.split-sec` → single column with glance-box ABOVE narrative (scan first on mobile); container padding 12px.
- Touch targets ≥ 44px on mobile for links/buttons; card link rows get full-width tap area.
- No horizontal overflow at 390px (existing verification standard).
- Sticky nav unchanged; long lists keep the existing show-8/"Show more" batching.
