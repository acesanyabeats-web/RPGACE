═══════════════════════════════════════════════════════════════
RPGACE — STEP 1: Split + Claude Code Setup
═══════════════════════════════════════════════════════════════

WHAT THIS DOES
--------------
Splits your single index.html into three clean files:
  • main.js      — all JavaScript (~3000 lines)
  • style.css    — all CSS
  • index.html   — pure HTML shell (just structure + links)

Eliminates the template literal collision bug that broke
encyclopedia/journal pages across MASTER32-40.

Also installs Claude Code project context so Claude Code
understands your entire codebase from day one.

═══════════════════════════════════════════════════════════════
INSTRUCTIONS — DO THESE IN ORDER
═══════════════════════════════════════════════════════════════

PART A — Run the split script
──────────────────────────────
1. Copy ALL files from this zip into:
   C:\Users\acesa\Downloads\rpgace-vercel-v4\

   Files to copy:
   • split.py
   • CLAUDE.md
   • .claude\settings.json   ← note the dot

2. Open terminal in C:\Users\acesa\Downloads\rpgace-vercel-v4\

3. Run:
   python split.py

4. You should see:
   ✓ CSS extracted — X chars
   ✓ JS extracted  — X chars, X lines
   ✓ HTML shell    — X chars, X lines
   ✓ style.css written
   ✓ main.js written
   ✓ index.html written
   ✓ main.js syntax check PASSED
   ✅ Split complete.

5. Deploy to verify nothing broke:
   npx vercel --prod

6. Open https://rpgace.vercel.app
   ✓ Password gate works
   ✓ All tabs switch
   ✓ Encyclopedia loads
   ✓ Oracle chat works

   If anything is wrong: your original is backed up as index.html.bak
   Restore with: copy index.html.bak index.html


PART B — Install Claude Code
──────────────────────────────
(Node.js must be installed — you already have it since npx works)

1. In terminal:
   npm install -g @anthropic-ai/claude-code

2. Set your Anthropic API key (one time):
   Windows Command Prompt:
     set ANTHROPIC_API_KEY=your_key_here

   Or add to Windows Environment Variables permanently:
   Control Panel → System → Advanced → Environment Variables
   Add: ANTHROPIC_API_KEY = (your key from C:\Users\acesa\RPGACE\.anthropic_key)

3. In your project folder:
   cd C:\Users\acesa\Downloads\rpgace-vercel-v4
   claude

4. Claude Code will read CLAUDE.md automatically and know:
   • Your entire app architecture
   • All Supabase tables and keys
   • The 10 features still to add
   • What NOT to do (the bugs we kept hitting)
   • Your content strategy

5. Test it works — type this in Claude Code:
   "Check main.js syntax and tell me how many lines it has"

   You should see it run: node --check main.js
   Then report the line count.


PART C — Verify file structure
──────────────────────────────
After split, your project should look like:

rpgace-vercel-v4/
  index.html          ← HTML only, ~50 lines shorter
  main.js             ← all JS, ~3000 lines
  style.css           ← all CSS
  CLAUDE.md           ← Claude Code context
  .claude/
    settings.json     ← Claude Code config
  index.html.bak      ← your backup (keep this)
  api/
    oracle.js
    executor.js
    ...
  vercel.json
  saved_conversation.md

═══════════════════════════════════════════════════════════════
WHAT'S NEXT (Steps 2-5)
═══════════════════════════════════════════════════════════════

Step 2 — GitHub repo setup (I'll give you 5 git commands)
Step 3 — GitHub Actions auto-deploy
Step 4 — Build the 10 missing features via Claude Code
Step 5 — Test and polish

Tell me when Step 1 is done and working, and I'll give you Step 2.

═══════════════════════════════════════════════════════════════
