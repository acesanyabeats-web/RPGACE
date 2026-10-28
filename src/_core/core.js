/**
 * RPGACE Core (unified) v2.0
 * Single client script — main.js was mechanically merged into this file
 * Aug 20 2026 (Alex's own direct ask: get rid of the 2-file split, absorb
 * main.js's legacy bootstrap/routing/career-score code here). Zero logic
 * rewrite: the legacy section immediately below is byte-identical to the
 * old main.js, deliberately placed OUTSIDE this file's own IIFE so its
 * ~211 top-level functions/vars stay real window globals — the load-
 * bearing thing index.html's 47 inline onclick="fn()" handlers and the
 * FUNCTION WRAPPERS section further down both depend on. New features
 * still go in the module system below as RPGACE.register() modules —
 * the legacy section is not a second place for new code.
 *
 * Architecture: rpgace.vercel.app/rpgace_core.js
 * Docs:         RPGACE_ARCHITECTURE.md
 */

/* ═══════════════════════════════════════════════════════════════════
   LEGACY SECTION — merged verbatim from the old main.js, Aug 20 2026.
   Byte-identical to main.js as it existed before the merge (diff-
   verified). Do not treat this as a place for new code — see the
   module-marker convention in the section below instead.
   ═══════════════════════════════════════════════════════════════════ */
/* ===LEGACY:mainjs=== */

// ── CONFIG ──
const CONFIG = {
  composioEntityId: '2d5cbaae-b75e-4e58-a573-5c07bc633ad9',
};

// ── PASSWORD ──
// July 23, 2026 — deliberate, logged FROZEN-file exception (Alex-
// authorized Tier 3 security fix, see patch_notes.html same session).
// The real check moved server-side (api/auth.js + rpgace_core.js's
// authGate module) — the password itself is no longer a string shipped
// to the browser and readable via view-source.
async function checkPassword(){
  const val=document.getElementById('pw-input').value;
  const verify=window.RPGACE_verifyPassword;
  const ok=verify?await verify(val):false;
  if(ok){
    const gate=document.getElementById('gate');
    gate.style.opacity='0';gate.style.transition='opacity .5s';
    setTimeout(()=>{gate.style.display='none';document.getElementById('app').style.display='block';initApp();},500);
  } else {
    const inp=document.getElementById('pw-input');
    inp.classList.add('error');document.getElementById('gate-error').textContent='✗ Access denied.';
    setTimeout(()=>{inp.classList.remove('error');document.getElementById('gate-error').textContent='';},1500);
  }
  return ok;
}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&document.getElementById('gate').style.display!=='none')checkPassword();});
function togglePwVis(){const i=document.getElementById('pw-input');i.type=i.type==='password'?'text':'password';}

// ── STATE ──
const STATE={xp:0,level:1,totalXP:0,tasksCompleted:0,xpRequired:[500,1200,2200,3500,5000,7000,9500,12500],chatHistory:[],chatMode:'chat',importedShifts:[]};
const LEVEL_TITLES=['Novice Producer','Content Apprentice','Rising Creator','Consistent Grinder','Viral Contender','Established Creator','Platform Veteran','The Producer','Elite Creator'];

// ── DATA ──
// Oct 12 2026 — the generic template quests are gone (Alex: "this is
// useless tbh, i need real goals i need to tick off" / "Remove them").
// His real routines live in the `routines` table, shown by the myDay
// module. QUESTS stays as an empty shell because completeQuest,
// buildAllQuests and questEngine._restoreBoardState still read it.
const QUESTS={daily:[],weekly:[],career:[],health:[],lifestyle:[]};

const SKILLS=[
  {name:'Content Fundamentals',icon:'🎬',desc:'Basic video creation, scripting and posting',req:'Lv 1',active:true},
  {name:'Algorithm Whisperer',icon:'📊',desc:'Understand TikTok & YT ranking signals',req:'Lv 2',active:false},
  {name:'Iron Discipline',icon:'💪',desc:'Gym attendance and meal prep locked in',req:'Lv 2',active:false},
  {name:'Batch Content Machine',icon:'⚡',desc:'Film 10 videos in one session',req:'Lv 3',active:false},
  {name:'Community Architect',icon:'🏛',desc:'Email list + loyal follower base',req:'Lv 4',active:false},
  {name:'Monetisation Unlocked',icon:'💰',desc:'Brand deals, merch, Patreon',req:'Lv 5',active:false},
  {name:'Peak Performance',icon:'🧠',desc:'Optimised sleep, nutrition and recovery',req:'Lv 4',active:false},
  {name:'Viral Formula',icon:'🔥',desc:'Consistent hook-body-CTA that reliably hits',req:'Lv 6',active:false},
  {name:'The 10K Creator',icon:'👑',desc:'10,000 subscribers across all platforms',req:'Lv 8',active:false},
];

const AGENT_ACTIONS=[
  {id:'ag1',app:'gmail',icon:'📧',name:'Draft collab outreach email',desc:'Saves a collab pitch to your Gmail drafts — open Gmail to add recipient and send.',xp:40,tool:'GMAIL_CREATE_EMAIL_DRAFT',input:{subject:'Collab Opportunity — Let\'s Create Together',body:'Hey,\n\nI came across your content and think we could create something great together. I\'m a music producer and content creator growing my YouTube and TikTok under the name AceSanya.\n\nWould love to explore a collab — let me know if you\'re open to it!\n\nAlex\nacesanyabeats@gmail.com',to:''}},
  {id:'ag2',app:'supadata',icon:'🎬',name:'Fetch YouTube channel stats',desc:'Get your YouTube channel stats — subs, views, video count via Supadata.',xp:20,tool:'SUPADATA_GET_YOUTUBE_CHANNEL',input:{id:'@AceSanyaBeats'}},
  {id:'ag3',app:'notion',icon:'📓',name:'Log quest progress to Notion',desc:'Create a Notion page logging today\'s completed quests.',xp:30,tool:'NOTION_CREATE_NOTION_PAGE',input:{parent_id:'3830f922-7ad0-8064-ac35-f6ebaff22b99',title:'RPGACE Quest Log — '+new Date().toLocaleDateString(),markdown:'# RPGACE Quest Log\n\nDate: '+new Date().toLocaleDateString()+'\n\n## Today\'s Progress\n\n## Completed Quests\n\n- \n\n## XP Earned\n\n## Tomorrow\'s Focus\n\n'}},
  {id:'ag4',app:'notion',icon:'📋',name:'Create weekly content calendar',desc:'Build a structured weekly content plan page in Notion.',xp:50,tool:'NOTION_CREATE_NOTION_PAGE',input:{parent_id:'3830f922-7ad0-8064-ac35-f6ebaff22b99',title:'Weekly Content Calendar — '+new Date().toLocaleDateString(),markdown:'# Weekly Content Calendar\n\n## YouTube\n- 1 video — Topic: \n\n## TikTok\n- 7 videos (1/day)\n- Theme: \n\n## Instagram\n- 3 posts\n- Style: \n\n## Notes\n\n'}},
  {id:'ag5',app:'github',icon:'💻',name:'Create content scripts repo',desc:'Create a GitHub repo to store your video scripts and content ideas.',xp:35,tool:'GITHUB_CREATE_A_REPOSITORY',input:{name:'content-scripts',description:'Video scripts, content ideas and strategies for YouTube, TikTok and Instagram',private:false,auto_init:true}},
  {id:'ag6',app:'canva',icon:'🎨',name:'List recent Canva designs',desc:'See your latest Canva designs — thumbnails, posts, graphics.',xp:20,tool:'CANVA_LIST_DESIGNS',input:{}},
  {id:'ag7',app:'gmail',icon:'📬',name:'Check unread emails',desc:'Scan Gmail inbox and summarise key unread messages.',xp:15,tool:'GMAIL_FETCH_EMAILS',input:{max_results:10,label_ids:['UNREAD']}},
  {id:'ag8',app:'instagram',icon:'📸',name:'Get Instagram media',desc:'Fetch your latest Instagram posts and engagement data.',xp:20,tool:'INSTAGRAM_BASIC_DISPLAY_MEDIA_DETAILS',input:{}},
];

// ── API CALLS VIA VERCEL FUNCTIONS ──
// July 28 FROZEN-file exception, logged in patch_notes.html: real Oracle
// 504 fix (root cause per CLAUDE.md: a single blocking non-streaming call
// can exceed the Vercel function's duration ceiling on long, detailed
// responses). Optional 4th param `onChunk(fullTextSoFar)` opts a caller
// into streaming; every existing call site that doesn't pass it keeps the
// exact same behavior and return shape as before - zero risk to any of
// the ~20 other callOracle() callers in this file. A prior streaming
// attempt (rpgace_core.js's now-neutralised RPGACE.streamOracle) was
// reverted because the SERVER never actually streamed - the client-side
// parsing logic this reuses (data: lines, content_block_delta/delta.text)
// already matches Anthropic's real SSE format correctly; api/oracle.js
// now genuinely proxies it when `stream:true` is sent.
async function callOracle(messages, system, maxTokens=1000, onChunk){
  // Aug 6 (real /paranoia-adjacent build, credit-exhaustion context) — a
  // real mock-mode escape hatch, checked INSIDE this function rather than
  // as an outer window.callOracle wrap. Deliberate: main.js's oracle-
  // grounding modules (oracleTreeGrounding/oracleAppGrounding/
  // oracleFetchGuard, all in rpgace_core.js) already wrap window.callOracle
  // 3 deep, each forwarding via orig.apply - wrapping a 4th time from
  // outside would race their own init() ordering and risk sitting either
  // too far in (skipping grounding) or too far out (never seeing real
  // calls). Checking here, inside the one real function every wrap layer
  // eventually calls through to, guarantees correct behavior regardless
  // of module registration order: every real grounding/context-injection
  // step still runs authentically, ONLY the actual network fetch below is
  // replaced with a synthetic reply. See rpgace_core.js's mockOracle
  // module for the real toggle + fake-reply generator.
  if (window.RPGACE && RPGACE.modules.mockOracle && RPGACE.modules.mockOracle.isEnabled()) {
    return RPGACE.modules.mockOracle._fakeReply(messages, system, onChunk);
  }
  // Aug 6, same day 2nd pass — real third Oracle mode: Fallback Scout.
  // Alex's own spec ("in the toggle in top right as a third mode, think
  // of those oracle functions as modes"). While active, every real Oracle
  // send queues into oracle_fallback_queue instead of calling the live
  // API, and is answered later for free by the existing daily Fallback
  // Drain Routine. See mockOracle._queueScoutItem in rpgace_core.js.
  if (window.RPGACE && RPGACE.modules.mockOracle && RPGACE.modules.mockOracle.isFallbackMode()) {
    return RPGACE.modules.mockOracle._queueScoutItem(messages, system, onChunk);
  }
  // G34 Level 1 (Aug 15 2026, real /CEO plan item) — a real, separate
  // axis: WHICH provider answers a genuine real call, not whether one
  // happens at all. Checked inside this same function, same reasoning as
  // the mockOracle checks above (never a 4th outer window.callOracle
  // wrap). Real, load-bearing landmine avoided: api/oracle.js's own
  // `provider` branch runs BEFORE its `stream` branch and always returns
  // plain JSON, never SSE — so this always sends `stream:false`
  // regardless of whether the caller passed an onChunk, and forwards the
  // real final text to onChunk ONCE at the end so a streaming caller's
  // UI still renders correctly (an honest UX difference for this mode —
  // no word-by-word animation — not a silent bug). Dormant until a real
  // MOONSHOT_API_KEY/OPENAI_API_KEY is configured server-side; until
  // then this fails loud with api/oracle.js's own honest error text.
  if (window.RPGACE && RPGACE.modules.oracleProviderMode && RPGACE.modules.oracleProviderMode.isExternal()) {
    const providerName = RPGACE.modules.oracleProviderMode.getProviderName();
    let res;
    try {
      res = await fetch('/api/oracle', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({messages, system, maxTokens, provider: providerName})
      });
    } catch(e) { throw new Error('Cannot reach /api/oracle — check Vercel deployment. ' + e.message); }
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { throw new Error('Oracle returned non-JSON: ' + text.slice(0,100)); }
    if(!res.ok) throw new Error(data.error || (providerName + ' error ' + res.status));
    if (onChunk && data.content && data.content[0]) onChunk(data.content[0].text || '');
    return data;
  }
  if (onChunk) {
    let res;
    try {
      res = await fetch('/api/oracle', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({messages, system, maxTokens, stream: true})
      });
    } catch(e) { throw new Error('Cannot reach /api/oracle — check Vercel deployment. ' + e.message); }
    if(!res.ok){
      let errMsg = 'Oracle error ' + res.status;
      try{ const errData = await res.json(); if(errData.error) errMsg = errData.error; }catch(_){}
      throw new Error(errMsg);
    }
    const r = await readOracleStream(res, onChunk);
    return { content: [{ type: 'text', text: r.text }], usage: r.usage, model: r.model };
  }
  let res;
  try {
    res = await fetch('/api/oracle', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({messages, system, maxTokens})
    });
  } catch(e) { throw new Error('Cannot reach /api/oracle — check Vercel deployment. ' + e.message); }
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch(e) { throw new Error('Oracle returned non-JSON: ' + text.slice(0,100)); }
  if(!res.ok) throw new Error(data.error || 'Oracle error ' + res.status);
  return data;
}

// One reader for /api/oracle's SSE stream (Oct 21 2026, OP-4 — moved out of
// callOracle so oracleProfessor shares it, rule 8). Text deltas only (Opus
// thinking blocks have no delta.text, so they never reach the reply); also
// keeps the token usage from message_start/message_delta for cost lines.
async function readOracleStream(res, onChunk){
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', full = '', model = '', stop = '';
  const usage = { input: 0, output: 0, cache_read: 0, cache_write: 0 };
  while(true){
    const {done, value} = await reader.read();
    if(done) break;
    buffer += decoder.decode(value, {stream: true});
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep the last (possibly partial) line for the next chunk
    for(const line of lines){
      if(!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if(data === '[DONE]') continue;
      try{
        const parsed = JSON.parse(data);
        if(parsed.type === 'content_block_delta' && parsed.delta && parsed.delta.text){
          full += parsed.delta.text;
          if (onChunk) onChunk(full);
        } else if(parsed.type === 'message_start' && parsed.message){
          model = parsed.message.model || '';
          const u = parsed.message.usage || {};
          usage.input = u.input_tokens || 0;
          usage.cache_read = u.cache_read_input_tokens || 0;
          usage.cache_write = u.cache_creation_input_tokens || 0;
        } else if(parsed.type === 'message_delta'){
          if (parsed.usage && parsed.usage.output_tokens) usage.output = parsed.usage.output_tokens;
          if (parsed.delta && parsed.delta.stop_reason) stop = parsed.delta.stop_reason;
        }
      }catch(e){}
    }
  }
  return { text: full, usage: usage, model: model, stop: stop };
}

async function callComposio(action, opts={}){
  let res;
  try {
    res = await fetch('/api/composio', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action, ...opts})
    });
  } catch(e) { throw new Error('Cannot reach /api/composio — check Vercel deployment. ' + e.message); }
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch(e) { throw new Error('Composio returned non-JSON: ' + text.slice(0,100)); }
  if(!res.ok) throw new Error(data.error || 'Composio error ' + res.status);
  return data;
}

// ── AGENT ACTIONS ──
function buildAgentActions(){
  const el=document.getElementById('agent-actions'); if(!el) return; el.innerHTML='';
  AGENT_ACTIONS.forEach(a=>{
    const d=document.createElement('div'); d.className='quest-card career';
    d.innerHTML=`<div class="quest-top"><div class="quest-name">${a.icon} ${a.name}</div><div class="quest-xp">+${a.xp} XP</div></div><div class="quest-desc">${a.desc}</div><div class="quest-tags"><span class="tag career">${a.app}</span><span class="tag daily">agent</span></div><button class="complete-btn" onclick="triggerAgent('${a.id}')">⚡ Execute</button>`;
    el.appendChild(d);
  });
}

function triggerAgent(id){
  const a=AGENT_ACTIONS.find(x=>x.id===id); if(!a) return;
  const popup=document.getElementById('agent-confirm-popup');
  document.getElementById('agent-popup-title').textContent=`${a.icon} ${a.name}`;
  document.getElementById('agent-popup-desc').textContent=a.desc+'\n\nProceed?';
  popup.classList.add('show');
  document.getElementById('agent-popup-confirm').onclick=async function(){
    popup.classList.remove('show');
    agentLog(`[EXEC] ${a.name}...`,'info');
    addMsg(`⚡ Executing: ${a.name}...`,'system');
    try{
      const result = await callComposio('execute',{tool:a.tool,input:a.input});
      const rawData = result.data?.data || result.data || result;
      const rawStr = JSON.stringify(rawData);
      agentLog(`[OK] ${a.name} — formatting result...`,'ok');

      // Format via Claude
      try {
        const fmtData = await callOracle(
          [{role:'user', content:`Format this agent result as clean readable text for Alex. Use emojis, highlight key numbers. Action: ${a.name}\n\nData:\n${rawStr.slice(0,2000)}`}],
          'You format API results into clean readable summaries. Max 8 lines. Emojis welcome.'
        );
        const formatted = fmtData.content.map(c=>c.text||'').join('');
        addMsg(`✓ ${a.name}\n\n${formatted}`,'system');
      } catch(e) {
        addMsg(`✓ ${a.name}\n${rawStr.slice(0,400)}`,'system');
      }
      addXP(a.xp);
    } catch(e){
      const errMsg = typeof e.message === 'object' ? JSON.stringify(e.message) : e.message;
      agentLog(`[ERR] ${a.name}: ${errMsg}`,'err');
      addMsg(`✗ Agent error: ${errMsg}`,'error-msg');
    }
  };
}

function agentLog(msg,type='info'){
  const log=document.getElementById('agent-log'); if(!log) return;
  const span=document.createElement('span'); span.className='log-'+type;
  span.textContent='\n['+new Date().toLocaleTimeString()+'] '+msg; log.appendChild(span); log.scrollTop=log.scrollHeight;
}

// ── QUESTS ──
function makeCard(q){
  const d=document.createElement('div'); d.className=`quest-card ${q.cat} ${q.done?'done':''}`;
  // A9 Phase 1: the ▶ button is what makes a REAL duration measurable for
  // a board quest. Completing without starting is still fine and still
  // saves - it just records actual_minutes as NULL and is deliberately
  // left out of the running average rather than being given an invented
  // duration (see questEngine's header).
  const timing=(()=>{try{const qe=window.RPGACE&&RPGACE.modules&&RPGACE.modules.questEngine;return!!(qe&&qe._loadBoardStarts()[q.id]);}catch(e){return false;}})();
  d.innerHTML=`<div class="quest-top"><div class="quest-name">${q.name}</div><div class="quest-xp">+${q.xp} XP</div></div><div class="quest-desc">${q.desc}</div><div class="quest-tags"><span class="tag ${q.cat}">${q.cat}</span><span class="tag ${q.type}">${q.type}</span></div><div style="display:flex;gap:6px"><button class="complete-btn" style="flex:0 0 auto;border-color:#2ABFB0;color:#2ABFB0" ${q.done||timing?'disabled':''} onclick="startBoardQuest('${q.id}',this)">${timing?'⏱ timing':'▶'}</button><button class="complete-btn ${q.done?'done':''}" style="flex:1" onclick="completeQuest('${q.id}',${q.xp},this)">${q.done?'✓ Completed':'◎ Mark Complete'}</button></div>`;
  return d;
}
function buildQS(id,arr){const el=document.getElementById(id);if(!el)return;el.innerHTML='';arr.forEach(q=>el.appendChild(makeCard(q)));}
function buildAllQuests(){buildQS('daily-quests',QUESTS.daily);buildQS('weekly-quests',QUESTS.weekly);buildQS('career-quests',QUESTS.career);buildQS('health-quests',QUESTS.health);buildQS('lifestyle-quests',QUESTS.lifestyle);}
// A9 Phase 1 (Aug 23 2026): two real changes.
// 1. The group list was hardcoded to the 5 original QUESTS keys, so any
//    future group would have been silently uncompletable. It now walks
//    whatever groups QUESTS actually has.
// 2. This used to be the whole story - a done-flag on an in-memory
//    object and an addXP() that mutated an in-memory STATE, with zero
//    persistence anywhere, so every completion evaporated on the next
//    page load. That gap was flagged 4 separate times in
//    oracle_dev_suggestions and is recorded in careerStatCard's own
//    header comment. questEngine.recordBoardCompletion writes the real
//    row (and folds a real timed duration into the running average, when
//    the quest was actually timed). It fails LOUD if the write fails -
//    the tick has already happened on screen by then, so silence would
//    leave Alex believing something saved that did not.
function completeQuest(id,xp,btn){
  const all=Object.keys(QUESTS).reduce((acc,k)=>acc.concat(QUESTS[k]||[]),[]);
  const q=all.find(x=>x.id===id);if(!q||q.done)return;
  q.done=true;btn.textContent='✓ Completed';btn.classList.add('done');btn.closest('.quest-card').classList.add('done');addXP(xp);
  try{
    const qe=window.RPGACE&&RPGACE.modules&&RPGACE.modules.questEngine;
    if(qe&&qe.recordBoardCompletion)qe.recordBoardCompletion(q);
  }catch(e){console.warn('[completeQuest] persistence:',e.message);}
}
// A9 Phase 1 - referenced by makeCard's inline onclick, so it has to be a
// real global (minify runs mangle:false precisely because index.html and
// these generated handlers reference globals by literal name).
function startBoardQuest(id,btn){
  try{
    const qe=window.RPGACE&&RPGACE.modules&&RPGACE.modules.questEngine;
    if(qe&&qe.startBoardQuest)qe.startBoardQuest(id,btn);
  }catch(e){console.warn('[startBoardQuest]',e.message);}
}

// ── XP / LEVEL ──
// A9 Phase 1: one shared painter instead of the same two-line snippet
// pasted into addXP, levelUp and (new) questEngine's boot restore
// (rule 8). It also fixes a real, pre-existing bug found while wiring
// the restore: style.css animates .bar-fill with `transform:scaleX()`
// (transform-origin:left), never `width` - so every existing call here
// set a property the stylesheet does not read, and the XP bar has never
// actually filled. Both are set now; width is kept for any older CSS
// path, transform is what the live stylesheet genuinely uses.
function paintXpBar(xp,req){
  const el=document.getElementById('xp-bar');if(!el)return;
  const pct=Math.max(0,Math.min(100,Math.round((xp/(req||1))*100)));
  el.style.width=pct+'%';el.style.transform='scaleX('+(pct/100)+')';
}
// Oct 13 2026 (XP-1, XP Season Pass): retired. These "+XP" pop-ups were
// in-memory only and vanished on reload. Real XP is now written by the
// database (xp_on_change triggers -> xp_events) and shown by xpSeason.
// Kept as a no-op so the existing call sites stay harmless.
function addXP(amount){}
function levelUp(){
  STATE.xp-=STATE.xpRequired[STATE.level-1];STATE.level++;
  document.getElementById('stat-lvl').textContent=STATE.level;
  document.getElementById('lvl-display').textContent=STATE.level;
  document.getElementById('new-level').textContent=STATE.level;
  const title=LEVEL_TITLES[Math.min(STATE.level-1,LEVEL_TITLES.length-1)];
  document.getElementById('char-title').textContent=title+' • Level '+STATE.level;
  document.getElementById('levelup-msg').textContent=title+' achieved!';
  document.getElementById('levelup').classList.add('show');
  updateSkillTree();
  const newReq=STATE.xpRequired[STATE.level-1]||9999;
  paintXpBar(STATE.xp,newReq);
  document.getElementById('xp-val').textContent=STATE.xp+' / '+newReq;
}
function showXPToast(a){const t=document.getElementById('xp-toast');t.textContent='+'+a+' XP';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);}

// ── SCHEDULE ──
function buildTimeSlots(){const el=document.getElementById('time-slots');if(!el)return;el.innerHTML='';for(let h=0;h<24;h++){const label=h===0?'12am':h<12?h+'am':h===12?'12pm':(h-12)+'pm';const slot=document.createElement('div');slot.className='time-slot';slot.id='ts-'+h;slot.innerHTML=`<span class="time-label">${label}</span><input class="time-input" id="ti-${h}" placeholder="Add task..." oninput="this.closest('.time-slot').classList.toggle('filled',this.value.length>0)"/>`;el.appendChild(slot);}}
// (dead duplicate buildWeekSlots removed - old goal-tracker version, superseded by the real shift-calendar version later in this file)
// (dead duplicate buildMonthSlots removed - old goal-tracker version, superseded by the real shift-calendar version later in this file)

// ── SHIFT IMPORT ──
function dzOver(e){e.preventDefault();document.getElementById('drop-zone').classList.add('drag-over');}
function dzLeave(){document.getElementById('drop-zone').classList.remove('drag-over');}
function dzDrop(e){e.preventDefault();dzLeave();const f=e.dataTransfer.files[0];if(f)handleFile(f);}
function handleFile(file){const r=new FileReader();r.onload=e=>{if(file.name.endsWith('.ics'))parseICS(e.target.result);else parseCSV(e.target.result);};r.readAsText(file);}
function showPasteArea(){const pa=document.getElementById('paste-area'),btn=document.getElementById('parse-paste-btn');pa.style.display=pa.style.display==='block'?'none':'block';btn.style.display=btn.style.display==='inline-block'?'none':'inline-block';}
function parsePasteInput(){const t=document.getElementById('paste-area').value;if(!t.trim()){alert('Paste your schedule text first.');return;}parseText(t);}
function parseICS(text){const events=[];text.split('BEGIN:VEVENT').slice(1).forEach(block=>{const s=(block.match(/SUMMARY:(.+)/)||['','Shift'])[1].trim();const ds=(block.match(/DTSTART[^:]*:(\d+T\d+)/)||['',''])[1];const de=(block.match(/DTEND[^:]*:(\d+T\d+)/)||['',''])[1];if(ds){const sH=parseInt(ds.substring(9,11)),eH=de?parseInt(de.substring(9,11)):sH+8;events.push({title:s,startH:sH,endH:eH});}});if(events.length)applyShifts(events,'ICS');else showImportErr('No events found in ICS file.');}
function parseCSV(text){const lines=text.split('\n').filter(l=>l.trim());const events=[];lines.slice(1).forEach(line=>{const cols=line.split(',').map(c=>c.replace(/"/g,'').trim());if(cols.length>=2){const tm=(cols[1]||'').match(/(\d+):(\d+)\s*[-–to]+\s*(\d+):(\d+)/);events.push({title:cols[0]||'Shift',startH:tm?parseInt(tm[1]):9,endH:tm?parseInt(tm[3]):17});}});if(events.length)applyShifts(events,'CSV');else parseText(text);}
function parseText(text){const lines=text.split('\n').filter(l=>l.trim());const events=[];const timeRx=/(\d{1,2}):(\d{2})\s*(?:to|-|–)\s*(\d{1,2}):(\d{2})/;const dayRx=/(mon|tue|wed|thu|fri|sat|sun)/i;lines.forEach(line=>{const tm=line.match(timeRx),dm=line.match(dayRx);if(tm||dm){const sH=tm?parseInt(tm[1]):9,eH=tm?parseInt(tm[3]):17,day=dm?dm[1][0].toUpperCase()+dm[1].slice(1).toLowerCase():'';const parts=line.split(/[-–|]/);events.push({title:parts[parts.length-1].trim()||'Work Shift',startH:sH,endH:eH,dayName:day});}});if(events.length)applyShifts(events,'text');else showImportErr('Could not parse. Try .ics or .csv format.');}
function applyShifts(events,source){STATE.importedShifts=events;events.forEach(ev=>{for(let h=ev.startH;h<ev.endH&&h<24;h++){const inp=document.getElementById('ti-'+h);if(inp){inp.value=ev.title+(inp.value?', '+inp.value:'');inp.closest('.time-slot').classList.add('shift','filled');}}});const dayMap={mon:0,tue:1,wed:2,thu:3,fri:4,sat:5,sun:6};const wI=document.querySelectorAll('.day-input');events.forEach(ev=>{if(ev.dayName){const idx=dayMap[ev.dayName.toLowerCase()];if(idx!==undefined&&wI[idx]){wI[idx].value=(wI[idx].value?wI[idx].value+'\n':'')+`${ev.startH}:00-${ev.endH}:00 ${ev.title}`;}}});const mc=document.querySelectorAll('.week-col');if(mc[0]){events.forEach(ev=>{const item=document.createElement('div');item.className='month-task shift-task';item.innerHTML=`<span>🏢 ${ev.title} ${ev.startH}:00–${ev.endH}:00</span><span onclick="this.parentElement.classList.toggle('done')" style="cursor:pointer;font-size:12px">✓</span>`;mc[0].insertBefore(item,mc[0].querySelector('.add-month-task'));});}const r=document.getElementById('import-result');r.style.display='block';r.style.borderColor='var(--green)';r.style.color='var(--green)';r.textContent=`✓ Imported ${events.length} shift${events.length!==1?'s':''} from ${source}.`;addXP(30);}
function showImportErr(msg){const r=document.getElementById('import-result');r.style.display='block';r.style.borderColor='var(--red)';r.style.color='var(--red)';r.textContent='✗ '+msg;}


// ── AI ADVISOR ──
const ORACLE_SYS=`You are the Oracle — elite AI life coach in RPGACE, a gamified RPG life app. User is an aspiring YouTube/TikTok/Instagram producer who wants to get fit and build great habits.

Rules:
1. Format new tasks as: QUEST: [name] | XP: [50-300] | Type: [daily/weekly/monthly] | Category: [career/health/lifestyle]
2. Use RPG language — quests, XP, levelling up
3. Be direct, motivating, slightly edgy — mentor who doesn't sugarcoat
4. In Agent mode: describe exactly what Composio action to take (Gmail draft, Notion page, GitHub repo, etc.)
5. Suggest productivity methods when relevant
6. If shifts are imported, plan around them
7. Connected apps: Canva, GitHub, Gmail, Instagram, Notion, YouTube
8. Max 200 words unless asked for more. End with one sharp memorable line.`;

// ── INSTA-ORACLE ──────────────────────────────────────────────────
const INSTA_ORACLE_SYS = `[INSTA-ORACLE MODE ACTIVE]
You are INSTA-ORACLE — the Instagram growth strategist embedded inside RPGACE,
built exclusively for @AceSanyaBeats (Alex, UK music producer, FL Studio).

ACCOUNT MISSION: UK music production niche. Target: aspiring producers 16-30, UK + global.
Goal: grow to 10k → 50k → monetisation. Pillars: beat tutorials | behind-the-scenes | producer lifestyle | reel hooks.

RULES — FOLLOW EXACTLY:

RULE 1 — NEVER GUESS. If content not provided, ask ONLY these 3 questions:
"❓ Q1 — What's the caption? (paste in full including hashtags)
❓ Q2 — Content type? (Reel/Carousel/Static) + what's shown/heard?
❓ Q3 — Engagement stats? (Likes/Comments/Views + any notable comments)"

RULE 2 — ALWAYS OPEN WITH THIS ANALYSIS BLOCK:
📊 CONTENT TYPE: [Reel / Carousel / Static]
📊 HOOK STRENGTH: [1-10] — [specific reason]
📊 CAPTION SCORE: [1-10] — [specific reason]
📊 HASHTAG STRATEGY: [Weak/Average/Strong] — [specific reason]
📊 CTA PRESENCE: [Yes/No] — [what it says or what's missing]
📊 REACH POTENTIAL: [Low/Medium/High] — [specific reason]

RULE 3 — EVERY RESPONSE MUST CONTAIN ALL 7 OF THESE IN ORDER:
1. **VERDICT** — one punchy sentence. No fluff.
2. **WHAT WORKED** — specific things done right (be honest, may be nothing)
3. **WHAT TO FIX** — specific, numbered, actionable. Never vague.
4. **REWRITTEN CAPTION** — always provide. Hook first line. Line breaks. Soft CTA. No "Hey everyone".
5. **HASHTAG SET** — 30 tags across 3 tiers (see Rule 5)
6. **BEST POST TIME** — specific day + time for UK audience
7. **GROWTH INTEL** — see Rule 8

RULE 4 — CAPTION STANDARDS:
- First line is the HOOK. It must stop the scroll. No exceptions.
- Use line breaks (mobile-first reading)
- Soft CTA before hashtags (save / follow / comment)
- Hashtags go in first comment OR after 3 dots below caption
- NEVER start with: "New beat", "Just dropped", "Hey", "So excited", "Check out"

RULE 5 — HASHTAG TIERS (always exactly this format):
TIER 1 — NICHE (<500k posts) — 10 tags — highest relevance, lowest competition
TIER 2 — MID (500k–5M posts) — 10 tags — balance reach/relevance
TIER 3 — BROAD (5M+ posts) — 10 tags — reach boost

RULE 6 — REELS: Assess hook (first 1-3 seconds) as priority #1. Recommend 1 specific edit. ID best 7-second clip for TikTok crosspost.
RULE 7 — CAROUSELS: Slide 1 = standalone hook. Final slide = CTA. Assess both specifically.

RULE 8 — GROWTH INTEL (end every response with this block):
🧠 GROWTH INTEL:
→ What top producers in this niche are doing that Alex isn't
→ One content gap Alex can own that competitors aren't covering
→ One collab angle to pursue this week

RULE 9 — END EVERY RESPONSE WITH A QUEST:
⚡ QUEST: [specific Instagram action, one sentence]
XP: [50-200]
DEADLINE: [today / this week / this month]

RULE 10 — TONE: Direct. Sharp. No fluff. Blunt about what isn't working. Always constructive. Never generic. Like a manager who's grown 10 music accounts past 100k.`;

function isInstaOracleQuery(text){
  const t = text.toLowerCase();
  // 2026-07-31 FROZEN-file exception, logged: real bug Alex caught live —
  // a pure architecture question ("how does dashDeck's popup system work")
  // got tagged 📸 INSTA-ORACLE with no Instagram content anywhere in it.
  // Root cause: the bare `#[a-z]` clause here was meant to catch Instagram
  // hashtags, but Oracle's own reply quoted real CSS/DOM id references from
  // the new oracle_module_anatomy grounding content (`#bookworm-widget`,
  // `#cpl-widget`) — those match `#[a-z]` exactly as well as a real
  // hashtag does, so isInstaOracleQuery(cleanReply) below false-positived
  // on a reply that never mentioned Instagram at all. Removed — every
  // remaining clause (literal "hashtag", "instagram", "@acesanya", etc.)
  // already reliably detects real Instagram-shaped text without this
  // over-broad, code-colliding signal.
  //
  // SAME SESSION, SECOND ROUND: a follow-up test (asking about authGate)
  // still got tagged 📸 despite containing zero Instagram content. Verified
  // in Node against the real reply text before touching anything (rule 4):
  // `story\s` matched literally inside "git hi-STORY -is permanent" (the
  // word "history" followed by a space), which is exactly why this
  // specific reply mis-tagged. Checking the sibling clauses the same way
  // surfaced a MUCH bigger, likely long-standing problem: `ig\s` matches
  // "b-IG- improvement" — the word "big" followed by a space — and bare
  // `reel` matches inside "f-REEL-ance"/"freelancer". Both are common
  // enough English words that this was very likely inflating real token
  // cost on ordinary messages well before today, independent of the
  // one-way-latch bug fixed earlier this session. Fixed by requiring a
  // real leading word boundary (`\b`) on all three, so each still matches
  // its intended standalone usage ("ig story", "post a reel", "check the
  // history" no longer trips it) without matching as a bare substring
  // inside an unrelated word. Verified against both directions in Node
  // before shipping — see oracle_architecture_anatomy_db_debate_2026-07-31.txt
  // for the anatomy-grounding context this was found investigating.
  return /instagram|insta\b|\breel|carousel|caption|hashtag|\big\s|@acesanya|insta-oracle|instaoracle|followers|\bstory\s|post strategy|content plan|instagram\.com/.test(t);
}

function renderInstaMsg(text){
  // Render hashtags as chips, captions as copyable boxes, quests as buttons
  let html = renderMarkdown(text);
  // Wrap hashtag sets in chip format
  html = html.replace(/(#\w+)/g, '<span onclick="navigator.clipboard.writeText(\'$1\')" style="display:inline-block;background:rgba(193,53,132,.15);border:1px solid rgba(193,53,132,.3);color:#E1306C;border-radius:12px;padding:2px 8px;font-size:11px;margin:2px;cursor:pointer" title="Click to copy">$1</span>');
  // Parse QUEST block into button
  html = html.replace(/⚡ QUEST: (.+?)\nXP: (\d+)\nDEADLINE: (.+?)(?=\n|$)/gs, (m, name, xp, deadline) =>
    `<div style="background:rgba(225,48,108,.1);border:1px solid rgba(225,48,108,.3);border-radius:8px;padding:12px;margin-top:10px">
      <div style="font-size:12px;color:#E1306C;font-family:'Cinzel',serif;letter-spacing:1px;margin-bottom:6px">⚡ INSTA QUEST UNLOCKED</div>
      <div style="font-size:13px;color:var(--text);margin-bottom:8px">${name}</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px">XP: ${xp} · Deadline: ${deadline}</div>
      <button onclick="addInstaQuest('${name.replace(/'/g,"\\'")}',${xp},'${deadline}')" style="background:#E1306C;border:none;color:#fff;border-radius:6px;padding:6px 14px;font-size:12px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700">+ Add to My Day</button>
    </div>`
  );
  return html;
}

// Oct 12 2026 — used to only pop an alert and award XP without saving
// anything; now lands on My Day as a one-off routine due today.
function addInstaQuest(name, xp, deadline){
  const md=window.RPGACE&&RPGACE.modules&&RPGACE.modules.myDay;
  if(!md){alert('My Day is not loaded yet.');return;}
  md.logic.addOneOffs([{name,xp}]).then(()=>{RPGACE.utils.toast('☀️ Added to My Day: '+name,'#4caf82',2600);md.ui.inject();}).catch(e=>RPGACE.utils.toast('⚠️ Could not add to My Day: '+(e.message||e),'#CC4A4A',3500,'myDay'));
}

function toggleInstaPanel(){
  const p = document.getElementById('insta-oracle-panel');
  if(p) p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

const INSTA_COMMANDS = {
  1: "Run command 1 — find the content angle that owns the niche for @AceSanyaBeats right now.",
  2: "Run command 2 — write 15 scroll-stopping hooks for UK music production content. Each under 10 words.",
  3: "Run command 3 — I need a week of content. Here's an idea that performed well recently: [describe your idea or paste a recent post]",
  4: "Run command 4 — write a caption for @AceSanyaBeats. Topic: [describe your content topic]",
  5: "Run command 5 — algorithm audit. Here's my recent content: [describe your last 3 posts and their performance]",
  6: "Run command 6 — profile audit. My current bio is: [paste your bio]. My highlights are: [describe]. My pinned post is: [describe].",
  7: "Run command 7 — build my complete weekly Instagram growth system for @AceSanyaBeats right now."
};

function fireInstaCommand(num){
  const prompt = INSTA_COMMANDS[num];
  if(!prompt) return;
  // Commands 1, 2, 7 fire immediately. Others need user input — pre-fill the input.
  if([1, 2, 7].includes(num)){
    window._instaOracleActive = true;
    document.getElementById('chat-input').value = prompt;
    sendChat();
  } else {
    // Pre-fill so user can add their details
    document.getElementById('chat-input').value = prompt;
    document.getElementById('chat-input').focus();
    // Move cursor to the [placeholder] area
    const el = document.getElementById('chat-input');
    const bracketIdx = prompt.indexOf('[');
    if(bracketIdx > 0){ el.setSelectionRange(bracketIdx, prompt.indexOf(']') + 1); }
  }
  // Close the panel
  const p = document.getElementById('insta-oracle-panel');
  if(p) p.style.display = 'none';
}

async function sendChat(){
  const input=document.getElementById('chat-input');
  const msg=input.value.trim();
  if(!msg) return;
  input.value='';
  addMsg(msg,'user');
  document.getElementById('send-btn').disabled=true;
  STATE.chatHistory.push({role:'user',content:msg});

  // Show typing indicator
  const typing=document.createElement('div');
  typing.className='msg ai';typing.id='typing-indicator';
  typing.innerHTML='<div class="ai-name">✦ Oracle</div><span id="oracle-stream-preview" style="color:var(--muted)">thinking...</span>';
  document.getElementById('chat-msgs').appendChild(typing);
  document.getElementById('chat-msgs').scrollTop=99999;

  // Detect if user wants an agent action
  const saveToNotionPattern = /save.*notion|log.*notion|notion.*page|save (that|this|it|my progress)/i;
  const agentKeywords = /^(draft|send|check)\b.*(email|inbox)/i;
  const isShortMessage = msg.length < 120;

  // Handle Notion save directly — no need to go through Claude
  const NOTION_RPGACE_PAGE_ID = '3830f922-7ad0-8064-ac35-f6ebaff22b99';

  // Handle Notion save directly — no need to go through Claude
  if(saveToNotionPattern.test(msg)){
    const lastAiReply = STATE.chatHistory.filter(m=>m.role==='assistant').slice(-1)[0]?.content || '';
    if(!lastAiReply){ addMsg('Nothing to save yet — ask me something first!','system'); document.getElementById('send-btn').disabled=false; return; }
    addMsg('Saving to Notion and Encyclopedia...','system');
    try{
      const title = 'RPGACE Oracle — ' + new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
      const res = await fetch('/api/executor',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ tool:'NOTION_CREATE_NOTION_PAGE', input:{ parent_id: NOTION_RPGACE_PAGE_ID, title, markdown: lastAiReply.slice(0,8000) } })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error||'Executor error');
      const ti=document.getElementById('typing-indicator'); if(ti) ti.remove();
      saveOracleToEncyclopedia(title, lastAiReply);
      addMsg(`✓ Saved!\n\n📓 **Notion** — added to your RPGACE page\n📖 **Encyclopedia** — available in Learning Lab\n\n💡 Want to save this to your **Journal** too? Type "save to journal" or click the Journal tab.`, 'system');
      addXP(30);
      agentLog('[OK] Oracle reply saved to Notion + Encyclopedia','ok');
    } catch(e){
      const ti=document.getElementById('typing-indicator'); if(ti) ti.remove();
      const lastAiReply2 = STATE.chatHistory.filter(m=>m.role==='assistant').slice(-1)[0]?.content || '';
      const title2 = 'Oracle — ' + new Date().toLocaleDateString();
      saveOracleToEncyclopedia(title2, lastAiReply2);
      addMsg(`⚠️ Notion: ${e.message}\n✓ Saved to Encyclopedia anyway — check Learning Lab.`,'system');
    }
    document.getElementById('send-btn').disabled=false;
    return;
  }

  // Handle journal save
  if(/save.*journal|journal.*save|log.*journal/i.test(msg)){
    const lastAiReply = STATE.chatHistory.filter(m=>m.role==='assistant').slice(-1)[0]?.content || '';
    if(!lastAiReply){ addMsg('Nothing to save yet — ask me something first!','system'); document.getElementById('send-btn').disabled=false; return; }
    const ti=document.getElementById('typing-indicator'); if(ti) ti.remove();
    const title = 'Oracle Session — ' + new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
    const fullConvo = STATE.chatHistory.slice(-20).map(m => (m.role==='user'?'**You:** ':'**Oracle:** ') + m.content).join('\n\n');
    await saveToJournal(title, fullConvo, 'oracle');
    addMsg(`✓ Saved to Journal!\n\nFull conversation logged. Check the **📓 Journal** tab.`, 'system');
    addXP(20);
    document.getElementById('send-btn').disabled=false;
    return;
  }

  const needsAgent = isShortMessage && agentKeywords.test(msg);

  // Detect URL in message — fetch content via Jina before sending to Oracle
  const urlMatch = msg.match(/https?:\/\/[^\s]+/i);
  if(urlMatch){
    const url = urlMatch[0];
    const isYouTube = /youtube\.com|youtu\.be/i.test(url);
    const isInstagram = /instagram\.com/i.test(url);

    const fetchingMsg = document.createElement('div');
    fetchingMsg.className='msg system';
    fetchingMsg.innerHTML = isYouTube
      ? `🎬 Fetching YouTube transcript via Supadata...`
      : isInstagram
      ? `📸 Reading Instagram post...`
      : `🔍 Reading <strong>${url.slice(0,50)}</strong>...`;
    document.getElementById('chat-msgs').appendChild(fetchingMsg);
    document.getElementById('chat-msgs').scrollTop=99999;

    try {
      let pageContent = '';

      if(isYouTube){
        // Extract video ID
        const ytMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        const videoId = ytMatch ? ytMatch[1] : null;

        if(videoId){
          // Use Supadata transcript via executor
          const transcriptRes = await fetch('/api/executor', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ tool: 'SUPADATA_GET_YOUTUBE_TRANSCRIPT', input: { video_id: videoId } })
          });
          const transcriptData = await transcriptRes.json();

          if(transcriptRes.ok && transcriptData.data){
            const transcript = transcriptData.data?.transcript || transcriptData.data?.content || JSON.stringify(transcriptData.data).slice(0,4000);
            pageContent = `YouTube Video Transcript (ID: ${videoId}):\n${transcript}`;
            fetchingMsg.innerHTML = `✓ YouTube transcript fetched (${Math.round(pageContent.length/4)} words)`;
          } else {
            // Fallback: get video metadata
            const metaRes = await fetch('/api/executor', {
              method: 'POST', headers: {'Content-Type':'application/json'},
              body: JSON.stringify({ tool: 'SUPADATA_GET_YOUTUBE_VIDEO', input: { video_id: videoId } })
            });
            const metaData = await metaRes.json();
            if(metaRes.ok && metaData.data){
              const d = metaData.data;
              pageContent = `YouTube Video Metadata:\nTitle: ${d.title||'Unknown'}\nChannel: ${d.channel?.name||'Unknown'}\nViews: ${d.viewCount||0}\nLikes: ${d.likeCount||0}\nDuration: ${Math.round((d.duration||0)/60)} mins\nDescription: ${(d.description||'').slice(0,1500)}`;
              fetchingMsg.innerHTML = `✓ YouTube metadata fetched — "${d.title||videoId}"`;
            } else {
              fetchingMsg.innerHTML = `⚠️ YouTube fetch failed — paste the title/description instead`;
            }
          }
        } else {
          fetchingMsg.innerHTML = `⚠️ Couldn't extract video ID from that URL`;
        }

      } else if(isInstagram){
        // Instagram blocks all fetches — trigger INSTA-ORACLE mode
        const igShortcode = url.match(/\/p\/([^/?]+)/)?.[1] || '';
        pageContent = `[INSTAGRAM POST — URL: ${url} — SHORTCODE: ${igShortcode}]\nInstagram blocks direct fetching. You are now in INSTA-ORACLE mode. Ask the user the 3 required questions (caption, content type, engagement stats) before giving any analysis. Do not guess or fabricate.`;
        fetchingMsg.innerHTML = `📸 Instagram detected — <strong style="color:#E1306C">INSTA-ORACLE</strong> activating...`;
        // Mark this conversation as insta mode
        window._instaOracleActive = true;

      } else {
        // Generic URL — try Jina
        const jinaRes = await fetch('https://r.jina.ai/' + url, {
          headers: { 'Accept': 'text/plain', 'X-Return-Format': 'text' }
        });
        if(jinaRes.ok){
          const text = await jinaRes.text();
          pageContent = text.slice(0, 4000);
          fetchingMsg.innerHTML = `✓ Page read — ${url.slice(0,50)}`;
        } else {
          fetchingMsg.innerHTML = `⚠️ Couldn't read that URL — Oracle will answer from context only`;
        }
      }

      if(pageContent){
        const lastUserMsg = STATE.chatHistory[STATE.chatHistory.length-1];
        lastUserMsg.content = `${msg}\n\n[FETCHED CONTENT FROM ${url}]:\n${pageContent}`;
      }

    } catch(e){
      console.error('URL fetch error:', e.message);
      fetchingMsg.innerHTML = `⚠️ Fetch error — Oracle will answer from context only`;
    }
  }

  try{
    let reply, actionTaken=null, actionDesc=null, actionResult=null, actionError=null;

    if(needsAgent){
      // Send only last 4 messages to orchestrate — keeps it fast
      const res=await fetch('/api/orchestrate',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          messages: STATE.chatHistory.slice(-4),
          // Pass the last AI reply as context for saving
          lastReply: STATE.chatHistory.filter(m=>m.role==='assistant').slice(-1)[0]?.content || ''
        })
      });
      const text=await res.text();
      let data;
      try{data=JSON.parse(text);}catch(e){throw new Error('Server error: '+text.slice(0,100));}
      if(!res.ok) throw new Error(data.error||'Orchestrator HTTP '+res.status);
      reply=data.reply;
      actionTaken=data.action_taken;
      actionDesc=data.action_description;
      actionResult=data.action_result;
      actionError=data.action_error;
    } else {
      // Use oracle directly for pure conversation — much faster, no timeout risk
      // Detect INSTA-ORACLE mode — triggered by Instagram URL or Instagram keywords
      // 2026-07-31 FROZEN-file exception, logged: real token-cost bug Alex
      // caught (credits dropping fast; every message including unrelated
      // ones tagged 📸 INSTA-ORACLE). window._instaOracleActive was set to
      // true in 5 places but never reset anywhere - a one-way latch that,
      // once tripped, silently appended the full ~2000-char Instagram-
      // strategist system prompt to every later message for the rest of
      // the page session, no matter the topic. Now re-evaluated fresh
      // every send from THIS message's own content, so it naturally turns
      // off the moment the topic actually changes instead of staying on
      // forever. The explicit one-shot triggers (sendInsightToCmd3 etc.)
      // still work - they set the flag then immediately send an Insta-
      // flavoured message that matches isInstaOracleQuery on its own merits.
      const instaMode = window._instaOracleActive || isInstaOracleQuery(msg);
      window._instaOracleActive = isInstaOracleQuery(msg);

      // July 15 deliberate main.js exception (frozen-file rule, logged same
      // session): asked directly "which phylum is this," Oracle invented a
      // whole fictional classification (a "Kingdom" rank that doesn't exist
      // in RPGACE, a phylum name "Instrument Realism & MIDI Craft" that
      // isn't one of the real 21) - normal chat had zero awareness of the
      // real taxonomy, only the structured flows (Phylum Path, proposeLineage)
      // did. Reads the real list live from taxonomyTree.PHYLUM_NAMES/
      // PHYLUM_ENGLISH (rpgace_core.js, already loaded by the time a user
      // can send a message) instead of hardcoding a second copy here.
      const _phylumList = (function(){
        var tt = window.RPGACE && RPGACE.modules && RPGACE.modules.taxonomyTree;
        if(!tt) return '';
        return Object.keys(tt.PHYLUM_NAMES).map(function(n){
          return n+'. '+tt.PHYLUM_NAMES[n]+' ('+tt.PHYLUM_ENGLISH[n]+')';
        }).join('\n');
      })();
      // Oct 16 2026: Oracle "logged" two journal entries, tagged them with
      // phyla as if they were realms and listed +235 XP - none of it was
      // saved. It now gets the real realm list, and is told it cannot save
      // or award XP by writing it.
      const _realmList = (function(){
        var xs = window.RPGACE && RPGACE.modules && RPGACE.modules.xpSeason;
        if(!xs || !xs.REALMS) return '';
        return (xs.ORDER || Object.keys(xs.REALMS)).map(function(k){ return xs.REALMS[k].icon+' '+xs.REALMS[k].name; }).join(', ');
      })();

      const ORACLE_SYS=`You are the Oracle — Alex's AI life coach in RPGACE, a gamified life management app.
Alex is an aspiring UK music producer and content creator targeting YouTube (@AceSanyaBeats), TikTok and Instagram.
Be direct, motivating, RPG-toned. Use markdown formatting (**, ##, bullet points).

When a message contains [PAGE CONTENT FROM ...], you have been given the actual text of that webpage or post.
Analyse and respond to that content directly — summarise it, extract insights, give strategy, connect it to Alex's goals.
Never say you can't access URLs — the content has already been fetched and is in the message.
${_phylumList ? `
RPGACE organises production/career/life knowledge into exactly these numbered Phyla - never invent a new one, never use a rank that isn't real here (there is no "Kingdom" level):
${_phylumList}
If asked which phylum something belongs to, or to classify/place a topic in the taxonomy, answer ONLY using one of the phyla above.
` : ''}${_realmList ? `
Alex's life is split into 13 REALMS (not the same thing as phyla): ${_realmList}. When you tag an activity, event or journal entry, use realm names; phyla are only for knowledge and the taxonomy.
` : ''}
You cannot save anything or award XP by writing it in a reply. Never say an entry was logged or saved, and never list XP as awarded - XP only comes from the app itself when Alex saves or ticks something. If he wants something kept, write it up (one Title: line per write-up, realms by name) and tell him to tap 📓 Save as entry under your reply - there he picks journal entry or realm mission, the date, the realms and ⭐ big unusual day.
For quests: QUEST: [name] | XP: [50-300] | Type: [daily/weekly/monthly] | Category: [career/health/lifestyle]
One sharp memorable line at the end of every reply.`;

      const activeSystem = instaMode
        ? INSTA_ORACLE_SYS + '\n\n---\nADDITIONAL CONTEXT:\n' + ORACLE_SYS
        : ORACLE_SYS;

      // Streams into the existing typing-indicator bubble as text arrives
      // (real 504 fix — see callOracle's own comment). Purely a progressive
      // preview: every side effect below (quest suggestions, XP, save
      // buttons, chat history) still runs on the final resolved `reply`
      // exactly as before, since this callback only touches the temporary
      // preview element, never the outcome.
      // 2026-07-31 FROZEN-file exception, logged: 1200 -> 3000. Real bug
      // Alex hit directly — a structured multi-section reply (Visual
      // Treatment Doc) cut off mid-sentence. 1200 was tuned back when the
      // 504 timeout was a live risk that scaled with response length;
      // streaming (built July 28) already removed that risk, and max_tokens
      // is a ceiling billed on tokens actually generated, not a floor — a
      // short reply still costs the same as before, this only lets a
      // genuinely long one finish instead of being cut off.
      // Oct 13 2026 (LL-5): only this main-chat turn may get the WEB LOOKUP block.
      if(window.RPGACE&&RPGACE.modules.webLookup) RPGACE.modules.webLookup.logic.markChatTurn();
      const data=await callOracle(STATE.chatHistory.slice(-8), activeSystem, 3000, function(fullSoFar){
        const preview=document.getElementById('oracle-stream-preview');
        if(preview){
          preview.style.color='var(--text)';
          // July 28 readability fix (Alex-reported: streamed text was
          // unreadable) — .textContent collapsed every newline, so a
          // structured reply (headers, lists, paragraph breaks) streamed
          // in as one unbroken wall of text until the final render swap.
          // renderMarkdown() is safe to call on every chunk now that it
          // HTML-escapes first (today's XSS fix) — worst case, an
          // incomplete **bold marker mid-word looks briefly odd for one
          // chunk and self-corrects once the closing marker streams in.
          try{ preview.innerHTML=renderMarkdown(fullSoFar); }catch(e){ preview.textContent=fullSoFar; }
          const msgs=document.getElementById('chat-msgs');
          if(msgs) msgs.scrollTop=99999;
        }
      });
      reply=data.content.map(c=>c.text||'').join('');
    }

    // Remove typing indicator
    const ti=document.getElementById('typing-indicator');
    if(ti) ti.remove();

    // Show reply
    if(reply){
      const cleanReply=reply.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```$/i,'').trim();
      const instaActive = window._instaOracleActive || isInstaOracleQuery(cleanReply);
      addMsg(cleanReply, 'ai', instaActive);
      STATE.chatHistory.push({role:'assistant',content:cleanReply});
      checkForQuestSuggestions(cleanReply);

      // Oct 27 2026: one shared row (also used by Oracle Professor answers).
      addReplySaveRow(msg, cleanReply);
    }

    // Show agent result if any
    if(actionTaken && actionTaken!=='null'){
      if(actionError){
        addMsg(`⚠️ Agent tried: ${actionDesc||actionTaken}\n✗ Error: ${actionError}`,'error-msg');
        agentLog(`[ERR] ${actionTaken}: ${actionError}`,'err');
      } else {
        const rawResult=typeof actionResult==='object'?JSON.stringify(actionResult):String(actionResult||'');
        agentLog(`[OK] ${actionTaken} complete`,'ok');
        addXP(50);
        try{
          const fmtData=await callOracle(
            [{role:'user',content:`Format this agent result as clean readable text for Alex. Use emojis, highlight key numbers. Action: ${actionDesc||actionTaken}\n\nData:\n${rawResult.slice(0,2000)}`}],
            'Format API results into clean readable summaries. Max 8 lines. Emojis welcome.'
          );
          const formatted=fmtData.content.map(c=>c.text||'').join('');
          addMsg(`✓ ${actionDesc||actionTaken}\n\n${formatted}`,'system');
        } catch(e){
          addMsg(`✓ ${actionDesc||actionTaken}\n${rawResult.slice(0,400)}`,'system');
        }
      }
    }

  } catch(e){
    const ti=document.getElementById('typing-indicator');
    if(ti) ti.remove();
    addMsg('✗ Oracle error: '+e.message,'error-msg');
  }
  document.getElementById('send-btn').disabled=false;
}
// Oct 27 2026 — the 📓 Save as entry / 📖 Save to Encyclopedia / ⭐ Library row
// under an Oracle reply. Shared by sendChat and oracleProfessor.ui.run (deep
// answers used to get no row at all, so 📓 never appeared on them).
function addReplySaveRow(question, reply){
  const saveBtn = document.createElement('div');
  saveBtn.style.cssText = 'display:flex;gap:6px;margin:4px 0 12px 0;flex-wrap:wrap';
  saveBtn.innerHTML = `
    <button class="oe-open" onclick="(window.RPGACE&&RPGACE.modules.oracleEntry)?RPGACE.modules.oracleEntry.ui.openLast():quickSaveToJournal()" style="background:none;border:1px solid rgba(201,168,76,.3);color:var(--gold);border-radius:5px;padding:3px 10px;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif">📓 Save as entry</button>
    <button onclick="quickSaveToEncyclopedia()" style="background:none;border:1px solid rgba(255,255,255,.1);color:var(--muted);border-radius:5px;padding:3px 10px;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif">📖 Save to Encyclopedia</button>
  `;
  // LL-4: ⭐ keeps this answer in the Life Library (question as title).
  const llMod = window.RPGACE && RPGACE.modules.lifeLibrary;
  if (llMod) {
    const ex = llMod.logic.exchange(question, reply);
    window._lastOracleExchange = ex;
    saveBtn.appendChild(llMod.ui.starButton(ex));
  }
  const msgs = document.getElementById('chat-msgs');
  if (msgs) { msgs.appendChild(saveBtn); msgs.scrollTop = 99999; }
  try { if (window.RPGACE && RPGACE.modules.deepDive) RPGACE.modules.deepDive.ui.button(saveBtn, reply); } catch (e) { console.warn('[deepDive]', e); }
  saveOracleChat(question, reply);
  return saveBtn;
}
// FL-3 (Oct 27 2026): every Oracle exchange is kept in the private
// oracle_chats table so Oracle can look back later (askMyData source "chats").
// Fire-and-forget: a failed save never blocks the chat, but is logged.
function saveOracleChat(question, reply){
  try {
    if (!window.RPGACE || !RPGACE.sb || !RPGACE.sb.secureWrite) return;
    const ag = RPGACE.modules.authGate; if (!ag || !ag._apiSecret) return;
    const q = String(question || '').trim(), a = String(reply || '').trim();
    if (!q || !a) return;
    if (!window._oracleChatSession) window._oracleChatSession = new Date().toISOString().slice(0, 16) + '-' + Math.random().toString(36).slice(2, 7);
    RPGACE.sb.secureWrite('oracle_chats', 'insert', { session_id: window._oracleChatSession, question: q.slice(0, 8000), answer: a.slice(0, 20000) })
      .catch(function(e) { console.warn('[oracle_chats] not saved:', e && e.message || e); });
  } catch (e) { console.warn('[oracle_chats]', e); }
}
// July 28 FROZEN-file exception, logged in patch_notes.html: renderMarkdown
// used to inject `text` straight into innerHTML with zero HTML-escaping.
// Oracle responses can contain fetched web/YouTube/Instagram content
// (oracleFetchGuard only tells the model to treat it as data, it can't stop
// the model quoting hostile HTML-like text back verbatim) - a page or
// transcript containing literal markup would render/execute in the chat
// DOM. Escaping first, before the markdown regexes run, closes that without
// touching the markdown syntax itself (none of `* ` `` ` `` `#` `-` are
// HTML-escaped characters).
function _escChatHtml(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function renderMarkdown(text){
  return _escChatHtml(text)
    .replace(/^### (.+)$/gm,'<strong style="color:var(--gold2);font-size:13px">$1</strong>')
    .replace(/^## (.+)$/gm,'<strong style="color:var(--gold);font-size:14px;display:block;margin-top:10px">$1</strong>')
    .replace(/^# (.+)$/gm,'<strong style="color:var(--gold);font-size:15px;display:block;margin-top:10px">$1</strong>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/`(.+?)`/g,'<code style="background:rgba(255,255,255,.08);padding:1px 5px;border-radius:3px;font-size:12px">$1</code>')
    .replace(/^- (.+)$/gm,'<span style="display:block;padding-left:14px">• $1</span>')
    .replace(/^\d+\. (.+)$/gm,'<span style="display:block;padding-left:14px">$1</span>')
    .replace(/^---$/gm,'<hr style="border-color:var(--border);margin:8px 0"/>')
    .replace(/\n/g,'<br>');
}

function addMsg(text, role, instaMode=false){
  const el = document.createElement('div');
  el.className = 'msg ' + role;
  if(role === 'ai'){
    if(instaMode){
      el.style.cssText = 'border-left:3px solid #E1306C;background:linear-gradient(135deg,rgba(131,58,180,.06),rgba(193,53,132,.06))';
      el.innerHTML = `<div class="ai-name" style="color:#E1306C">📸 INSTA-ORACLE</div>${renderInstaMsg(text)}`;
    } else {
      el.innerHTML = `<div class="ai-name">✦ Oracle</div>${renderMarkdown(text)}`;
    }
  } else if(role === 'system'){ el.innerHTML = renderMarkdown(text);
  } else if(role === 'error-msg'){ el.innerHTML = text.replace(/\n/g,'<br>');
  } else if(role === 'user' && String(text).length > 400){
    // Oct 10 2026 (N2, Oracle slice): app-generated prompts (Morning Brief,
    // Platform Oracle, recipes) are long - show a 4-line preview + toggle.
    const body = document.createElement('div');
    body.className = 'msg-clamp';
    body.textContent = text;
    const t = document.createElement('button');
    t.type = 'button'; t.className = 'msg-more'; t.textContent = 'Show all';
    t.onclick = function(){ const open = body.classList.toggle('open'); t.textContent = open ? 'Show less' : 'Show all'; };
    el.appendChild(body); el.appendChild(t);
  } else { el.textContent = text; }
  const msgs = document.getElementById('chat-msgs');
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}
function checkForQuestSuggestions(text){if(text.includes('QUEST:')){const lines=text.split('\n').filter(l=>l.includes('QUEST:'));if(lines.length)showSuggestionPopup(lines);}}
function showSuggestionPopup(lines){const c=document.getElementById('popup-tasks');c.innerHTML='';document.getElementById('popup-msg').textContent='The Oracle has '+lines.length+' new quest'+(lines.length!==1?'s':'')+' for you!';lines.slice(0,3).forEach(line=>{const xm=line.match(/XP:\s*(\d+)/),nm=line.match(/QUEST:\s*([^|]+)/);if(nm){const d=document.createElement('div');d.className='popup-task';d.innerHTML=`<span>⚔ ${nm[1].trim()}</span><span class="popup-task-xp">+${xm?xm[1]:50} XP</span>`;c.appendChild(d);}});document.getElementById('suggestion-popup').classList.add('show');}
// Oct 12 2026 — Oracle's suggested tasks land on My Day as one-off routines due today.
function acceptSuggestions(){const items=[];document.querySelectorAll('.popup-task').forEach(item=>{const name=item.querySelector('span:first-child').textContent.replace('⚔ ','').trim();const xp=parseInt(item.querySelector('.popup-task-xp').textContent.replace(/[^0-9]/g,''))||50;if(name)items.push({name,xp});});try{closeSuggestion();}catch(e){}const md=window.RPGACE&&RPGACE.modules&&RPGACE.modules.myDay;if(!md||!items.length)return;md.logic.addOneOffs(items).then(()=>{RPGACE.utils.toast('☀️ '+items.length+' added to My Day','#4caf82',2400);md.ui.inject();}).catch(e=>RPGACE.utils.toast('⚠️ Could not add to My Day: '+(e.message||e),'#CC4A4A',3500,'myDay'));}
function closeSuggestion(){document.getElementById('suggestion-popup').classList.remove('show');}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&document.activeElement.id==='chat-input'){e.preventDefault();sendChat();}});

// ── SKILL TREE ──
function buildSkillTree(){const el=document.getElementById('skill-tree');if(!el)return;el.innerHTML='';SKILLS.forEach(s=>{const n=document.createElement('div');n.className='skill-node'+(s.active?' active':'');n.innerHTML=`<span class="skill-icon">${s.icon}</span><div class="skill-name">${s.name}</div><div class="skill-desc">${s.desc}</div><div class="skill-req">${s.active?'✓ Unlocked':s.req}</div>`;el.appendChild(n);});}
function updateSkillTree(){SKILLS.forEach(s=>{if(STATE.level>=(parseInt(s.req.replace('Lv ',''))||1))s.active=true;});buildSkillTree();}

// ── PAGE NAV ──
function showPage(name,tab){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));document.getElementById('page-'+name).classList.add('active');if(tab)tab.classList.add('active');if(name==='learning'||name==='encyclopedia')refreshEncyclopediaDisplay();
  if(name==='schedule')setTimeout(loadScheduledAgendas,100); if(name==='journal')refreshJournalDisplay();}
function showSched(type,btn){['daily','weekly','monthly','import'].forEach(t=>{const el=document.getElementById('sched-'+t);if(el)el.style.display=t===type?'block':'none';});document.querySelectorAll('.sched-tab').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');if(type==='weekly'||type==='daily')setTimeout(autoApplyStoredShifts,100);if(type==='monthly')setTimeout(buildMonthSlots,60);if(type==='weekly')setTimeout(buildWeekSlots,60);if(type==='daily'){setTimeout(initDailyNav,50);setTimeout(renderDailyGrid,150);setTimeout(_addSchedButtons,700);}}

// ── INIT ──
const AGENDA_CACHE_KEY='rpgace_agendas_'+new Date().toDateString();
const CAT_ICON={beat:'🎛',content:'📸',growth:'📈',learning:'📚',personal:'⚡'};
const CAT_COL={beat:'var(--gold)',content:'#E1306C',growth:'var(--green)',learning:'var(--blue)',personal:'var(--purple)'};
let AGENDA_LIST=[];

async function generateAgendas(force=false){
  if(!force){const cached=localStorage.getItem(AGENDA_CACHE_KEY);if(cached){try{AGENDA_LIST=JSON.parse(cached);renderAgendas();return;}catch(e){}}}
  const btn=document.getElementById('agenda-gen-btn');
  if(btn){btn.disabled=true;btn.textContent='⚡ Generating...';}
  let encEntries=[],journalEntries=[];
  try{const er=await _sbGet('/rest/v1/encyclopedia?order=created_at.desc&limit=15');if(er.ok)encEntries=await er.json();}catch(e){}
  try{const jr=await _sbGet('/rest/v1/journal?order=created_at.desc&limit=4');if(jr.ok)journalEntries=await jr.json();}catch(e){}
  const encSummary=encEntries.slice(0,8).map(e=>`- ${e.title}: ${(e.content||'').slice(0,90)}`).join('\n')||'No entries yet';
  const journalSummary=journalEntries.slice(0,3).map(j=>`- ${j.title}: ${(j.content||'').slice(0,120)}`).join('\n')||'No journal yet';
  const vstsFound=[...new Set(encEntries.flatMap(e=>e.vst_tags||[]))].slice(0,8).join(', ')||'FL Studio built-ins';
  const today=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
  const shiftCtx=typeof getShiftContext==='function'?getShiftContext():'No shift data';
  const freeWin=typeof getFreeWindows==='function'?getFreeWindows():'Unknown';
  const prompt=`Generate 5 daily agendas for Alex (@AceSanyaBeats) — UK music producer (Russian/French background, grew up London), building FL Studio YouTube content toward 100k subscribers.\n\nTODAY: ${today}\nACTIVE VSTs: ${vstsFound}\nCONTENT PILLARS: FL Studio Secrets (2x/week), Made Different (1x/week), Producer Challenge (1x/week)\nWORK SHIFTS THIS WEEK:\n${shiftCtx}\nFREE WINDOWS TODAY: ${freeWin}\nCRITICAL: Never suggest tasks that overlap with shift times. Only use free windows.\n\nRECENT ENCYCLOPEDIA:\n${encSummary}\n\nRECENT JOURNAL:\n${journalSummary}\n\nRULES: 2 beat making, 1 content creation, 1 growth, 1 personal/learning. Each directly actionable. Duration 25-90 mins.\n\nReturn ONLY a JSON array. IMPORTANT: every string value must be under 12 words. Short and direct only.\n[{"title":"6 words max","description":"12 words max","category":"beat|content|growth|learning|personal","duration_mins":45,"why":"8 words max","xp":75}]`;
  try{
    const data=await callOracle([{role:'user',content:prompt}],'',2000);
    const raw=data.content.map(x=>x.text||'').join('');
    const cleaned=raw.replace(/```json|```/g,"").trim();
    let parsed=[];
    try{const m=cleaned.match(/\[[\s\S]*\]/);if(m)parsed=JSON.parse(m[0]);}catch(e){
      const re=/\{[^{}]*"title"\s*:[^{}]*\}/g;
      let m2;while((m2=re.exec(cleaned))!==null){try{const o=JSON.parse(m2[0]);if(o&&o.title)parsed.push(o);}catch(_){}}
    }
    parsed=parsed.filter(a=>a&&a.title);
    if(!parsed.length)throw new Error('No agendas returned');
    AGENDA_LIST=parsed.slice(0,5).map((a,i)=>({...a,id:'ag'+Date.now()+i,status:'pending'}));
    localStorage.setItem(AGENDA_CACHE_KEY,JSON.stringify(AGENDA_LIST));
    renderAgendas();
  }catch(e){
    const el=document.getElementById('agenda-list');
    if(el)el.innerHTML=`<div style="color:var(--red);font-size:13px;padding:16px">✗ ${e.message}</div>`;
  }
  if(btn){btn.disabled=false;btn.textContent='⚡ Generate';}
}

function initAgendas(){
  const label=document.getElementById('agenda-date-label');
  if(label)label.textContent=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
  const cached=localStorage.getItem(AGENDA_CACHE_KEY);
  if(cached){try{AGENDA_LIST=JSON.parse(cached);renderAgendas();}catch(e){}}
}

function renderAgendas(){setTimeout(patchAgendaCardsWithSchedule,400);
  const el=document.getElementById('agenda-list');
  if(!el)return;
  if(!AGENDA_LIST.length){el.innerHTML='<div style="color:var(--muted);font-size:13px;padding:12px">No agendas yet — click Generate.</div>';return;}
  el.innerHTML=AGENDA_LIST.map((a,i)=>{
    const icon=CAT_ICON[a.category]||'📋';
    const col=CAT_COL[a.category]||'var(--gold)';
    const done=a.status==='done';
    const sched=a.status==='scheduled';
    return `<div class="agenda-card${done?' done':sched?' scheduled':''}" id="agenda-card-${i}">
      <div style="display:flex;gap:10px;align-items:flex-start">
        <div style="font-size:20px;flex-shrink:0">${icon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:2px">${a.title}</div>
          <div style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:6px">${a.description}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
            <span style="background:${col}22;border:1px solid ${col}44;color:${col};border-radius:10px;padding:1px 8px;font-size:10px;font-family:'Rajdhani',sans-serif;font-weight:700">${(a.category||'').toUpperCase()}</span>
            <span style="font-size:10px;color:var(--muted)">⏱ ${a.duration_mins}min</span>
            <span style="font-size:10px;color:var(--gold)">+${a.xp||50} XP</span>
          </div>
          <div style="font-size:11px;color:var(--muted);font-style:italic;margin-bottom:10px">💡 ${a.why||''}</div>
          ${done?`<div style="color:var(--green);font-size:12px;font-weight:700">✓ Completed</div>`:sched?`<div style="color:var(--blue);font-size:12px;font-weight:700">📅 Scheduled</div>`:`<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            <button onclick="startDoNow(${i})" style="background:var(--gold);border:none;color:#000;border-radius:6px;padding:7px 16px;font-size:12px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:800">▶ Do Now</button>
            <button onclick="scheduleAgendaByIdx(${i})" style="background:none;border:1px solid rgba(201,168,76,0.4);color:#C9A84C;border-radius:6px;padding:7px 14px;font-size:12px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700">📅 Schedule</button>
            <button onclick="markAgendaDone(${i})" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:7px 12px;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif">✓ Do Now</button>
          </div>
          <div id="sched-picker-${i}" style="display:none;margin-top:10px;background:var(--panel);border:1px solid var(--blue);border-radius:8px;padding:12px">
            <div style="font-size:11px;color:var(--blue);font-family:'Cinzel',serif;letter-spacing:.5px;margin-bottom:8px">SCHEDULE THIS AGENDA</div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <input type="time" id="sched-time-${i}" value="19:00" style="background:var(--panel2);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:6px 10px;font-size:13px;font-family:'Rajdhani',sans-serif;outline:none"/>
              <span style="font-size:12px;color:var(--muted)">${a.duration_mins} min</span>
              <button onclick="confirmSchedule(${i})" style="background:var(--blue);border:none;color:#fff;border-radius:6px;padding:6px 14px;font-size:12px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700">Confirm</button>
              <button onclick="document.getElementById('sched-picker-${i}').style.display='none'" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif">Cancel</button>
            </div>
          </div>`}
        </div>
      </div>
    </div>`;
  }).join('');
}

function markAgendaDone(idx){
  if(!AGENDA_LIST[idx])return;
  AGENDA_LIST[idx].status='done';
  addXP(AGENDA_LIST[idx].xp||50);
  showXPToast(AGENDA_LIST[idx].xp||50);
  localStorage.setItem(AGENDA_CACHE_KEY,JSON.stringify(AGENDA_LIST));
  renderAgendas();
}

function openSchedulePicker(idx){
  const el=document.getElementById(`sched-picker-${idx}`);
  if(el)el.style.display=el.style.display==='none'?'block':'none';
}

function confirmSchedule(idx){
  const a=AGENDA_LIST[idx];if(!a)return;
  const timeEl=document.getElementById(`sched-time-${idx}`);
  const time=timeEl?timeEl.value:'19:00';
  const parts=(time||'19:00').split(':');
  const hour=parseInt(parts[0])||19, minute=parseInt(parts[1])||0;
  const dateStr=(typeof _calDateStr==='function'?_calDateStr(new Date()):new Date().toISOString().split('T')[0]);
  scheduleToCalendar({title:a.title,category:a.category,duration_mins:a.duration_mins,hour,minute,date:dateStr,xp:a.xp,source_type:'agenda'});
  AGENDA_LIST[idx].status='scheduled';
  AGENDA_LIST[idx].scheduled_time=time;
  localStorage.setItem(AGENDA_CACHE_KEY,JSON.stringify(AGENDA_LIST));
  renderAgendas();
}




// ═══════════════════════════════════════════════════════════
// FOCUS MODE SYSTEM — Features 7-10
// Timer widget + overlay + text selection AI + stop reason
// ═══════════════════════════════════════════════════════════
let FM_SESSION = {duration:0, agenda:null, phase:'idle'};
let FM_TIMER_INTERVAL = null;
let FM_TIMER_SECS = 0;

// ── SESSION SETUP ──
function startDoNow(idx){
  const a = AGENDA_LIST[idx];
  if(!a) return;
  FM_SESSION.agenda = a;
  FM_SESSION.duration = 0;
  const titleEl = document.getElementById('session-agenda-title');
  if(titleEl) titleEl.textContent = a.title;
  document.querySelectorAll('.dur-btn').forEach(b=>b.classList.remove('sel'));
  const dd = document.getElementById('dur-display');
  if(dd) dd.textContent = '';
  const so = document.getElementById('session-setup-overlay');
  if(so) so.style.display = 'flex';
}

function pickDuration(mins){
  FM_SESSION.duration = mins;
  document.querySelectorAll('.dur-btn').forEach(b=>b.classList.remove('sel'));
  const btn = document.getElementById('dur-'+mins);
  if(btn) btn.classList.add('sel');
  const dd = document.getElementById('dur-display');
  if(dd) dd.textContent = '⏱ ' + mins + ' minute session selected';
}

function closeSessionSetup(){
  const so = document.getElementById('session-setup-overlay');
  if(so) so.style.display = 'none';
}

function beginSession(){
  if(!FM_SESSION.duration){
    const dd = document.getElementById('dur-display');
    if(dd){ dd.textContent = '⚠ Select a duration first'; dd.style.color='var(--red)'; }
    return;
  }
  closeSessionSetup();
  openFocusOverlay();
  showTimerWidget();
  FM_SESSION.phase = 'warmup';
  startFMTimer(300, 'WARM-UP', 'Browse · Read · Get in the zone', ()=>{
    FM_SESSION.phase = 'session';
    startFMTimer(FM_SESSION.duration * 60, 'SESSION', (FM_SESSION.agenda?.title||'Focus').slice(0,20), ()=>{
      onSessionTimerEnd();
    });
  });
}

// ── TIMER ──
function showTimerWidget(){ const w=document.getElementById('timer-widget'); if(w) w.style.display='block'; }
function hideTimerWidget(){ const w=document.getElementById('timer-widget'); if(w) w.style.display='none'; }

function startFMTimer(totalSecs, label, sublabel, onDone){
  if(FM_TIMER_INTERVAL){ clearInterval(FM_TIMER_INTERVAL); FM_TIMER_INTERVAL=null; }
  FM_TIMER_SECS = totalSecs;
  updateTimerDisplay(label, sublabel);
  FM_TIMER_INTERVAL = setInterval(()=>{
    FM_TIMER_SECS--;
    updateTimerDisplay(label, sublabel);
    if(FM_TIMER_SECS <= 0){
      clearInterval(FM_TIMER_INTERVAL);
      FM_TIMER_INTERVAL = null;
      if(onDone) onDone();
    }
  }, 1000);
}

function updateTimerDisplay(label, sublabel){
  const m = Math.floor(FM_TIMER_SECS/60);
  const s = FM_TIMER_SECS % 60;
  const timeStr = m + ':' + String(s).padStart(2,'0');
  const lbl = document.getElementById('tw-label');
  const tim = document.getElementById('tw-time');
  const sub = document.getElementById('tw-sub');
  if(lbl) lbl.textContent = label;
  if(tim){ tim.textContent = timeStr; tim.style.color = (FM_SESSION.phase==='session' && FM_TIMER_SECS<120) ? 'var(--red)' : 'var(--gold)'; }
  if(sub) sub.textContent = sublabel;
}

function onSessionTimerEnd(){
  FM_SESSION.phase = 'complete';
  const lbl=document.getElementById('tw-label'); if(lbl) lbl.textContent='COMPLETE';
  const tim=document.getElementById('tw-time'); if(tim){ tim.textContent='✓'; tim.style.color='var(--green)'; }
  const sub=document.getElementById('tw-sub'); if(sub) sub.textContent='Session done';
  const sp = document.getElementById('focus-stop-panel');
  if(sp){ sp.style.display='block'; sp.scrollIntoView({behavior:'smooth',block:'start'}); }
}

function logStopReason(reason){
  if(reason==='Finished it!'){
    const idx = AGENDA_LIST.findIndex(a=>a.id===FM_SESSION.agenda?.id);
    if(idx>=0) markAgendaDone(idx);
    closeFocusOverlay();
    return;
  }
  const el = document.getElementById('stop-reason-logged');
  if(el) el.innerHTML = '<span style="color:var(--gold)">✓ Logged: "' + reason + '"</span>';
  if(FM_SESSION.agenda){
    const title = 'Session Log — ' + FM_SESSION.agenda.title;
    const body = 'Reason stopped: ' + reason + '\nAgenda: ' + FM_SESSION.agenda.title + '\nPlanned: ' + FM_SESSION.duration + 'min\nDate: ' + new Date().toLocaleDateString();
    saveToJournal(title, body, 'session').catch(()=>{});
  }
}

// ── FOCUS OVERLAY ──
async function openFocusOverlay(){
  const ov = document.getElementById('focus-overlay');
  if(!ov) return;
  ov.style.display = 'block';
  const title = document.getElementById('focus-agenda-title');
  if(title) title.textContent = FM_SESSION.agenda?.title || '';
  const sp = document.getElementById('focus-stop-panel');
  if(sp) sp.style.display = 'none';
  const cp = document.getElementById('focus-concept-panel');
  if(cp) cp.style.display = 'none';
  await loadFocusEntries();
  setupFocusTextSelect();
}

async function loadFocusEntries(){
  const el = document.getElementById('focus-entries');
  if(!el) return;
  el.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px">Loading related knowledge...</div>';
  let entries = [];
  try{
    const res = await _sbGet('/rest/v1/encyclopedia?order=created_at.desc&limit=60');
    if(res.ok) entries = await res.json();
  }catch(e){}
  const a = FM_SESSION.agenda;
  const words = ((a?.title||'')+' '+(a?.description||'')+' '+(a?.category||'')).toLowerCase().split(/\s+/).filter(w=>w.length>3);
  const scored = entries.map(e=>({...e,_s:words.filter(w=>((e.title||'')+' '+(e.content||'')).toLowerCase().includes(w)).length}))
    .sort((a,b)=>b._s-a._s).slice(0,5);
  if(!scored.length){
    el.innerHTML='<div style="color:var(--muted);font-size:13px;text-align:center;padding:30px">No encyclopedia entries yet.<br>Analyse videos in Research to build your knowledge base.</div>';
    return;
  }
  el.innerHTML = scored.map((e,i)=>`
    <div class="focus-entry">
      <div style="font-family:'Cinzel',serif;font-size:12px;color:var(--gold);margin-bottom:8px">${e.title||'Entry'}</div>
      <div class="focus-selectable" data-eid="${e.id||i}" data-etitle="${(e.title||'').replace(/"/g,'')}" style="font-size:13px;line-height:1.9;color:var(--text)">${renderMarkdown(e.content||'')}</div>
    </div>`).join('');
}

function closeFocusOverlay(){
  if(FM_TIMER_INTERVAL){ clearInterval(FM_TIMER_INTERVAL); FM_TIMER_INTERVAL=null; }
  hideTimerWidget();
  const ov = document.getElementById('focus-overlay');
  if(ov) ov.style.display = 'none';
  const rb = document.getElementById('return-session-btn');
  if(rb) rb.style.display = 'none';
  FM_SESSION = {duration:0, agenda:null, phase:'idle'};
}

function exitFocusToEnc(){
  const ov = document.getElementById('focus-overlay');
  if(ov) ov.style.display = 'none';
  const rb = document.getElementById('return-session-btn');
  if(rb) rb.style.display = 'block';
  const encTab = document.querySelector('[onclick*="encyclopedia"]');
  if(encTab) showPage('encyclopedia', encTab);
}

function reopenFocusOverlay(){
  const ov = document.getElementById('focus-overlay');
  if(ov) ov.style.display = 'block';
  const rb = document.getElementById('return-session-btn');
  if(rb) rb.style.display = 'none';
}

// ── TEXT SELECTION AI — Feature 9 ──
let _focusSelectTimeout = null;
function setupFocusTextSelect(){
  // Prevent concept panel from triggering itself
  const panel = document.getElementById('focus-concept-panel');
  if(panel){
    panel.addEventListener('mouseup', function(e){ e.stopPropagation(); });
    panel.style.userSelect = 'none';
    panel.style.webkitUserSelect = 'none';
  }

  const ov = document.getElementById('focus-overlay');
  if(!ov) return;
  ov.addEventListener('mouseup', (e)=>{
    if(e.target.closest('#focus-concept-panel')) return;
    clearTimeout(_focusSelectTimeout);
    _focusSelectTimeout = setTimeout(handleFocusSelect, 400);
  });
}

async function handleFocusSelect(){
  const sel = window.getSelection();
  if(!sel || sel.isCollapsed || sel.toString().trim().length < 5) return;
  const selectedText = sel.toString().trim();
  const node = sel.anchorNode?.parentElement;
  const container = node?.closest('.focus-selectable');
  const fullText = container ? container.textContent : '';
  const selIdx = fullText.indexOf(selectedText);
  const before = selIdx > 0 ? fullText.slice(Math.max(0,selIdx-400), selIdx) : '';
  const after = fullText.slice(selIdx+selectedText.length, selIdx+selectedText.length+400);

  const panel = document.getElementById('focus-concept-panel');
  const conceptEl = document.getElementById('focus-concept-text');
  const insightsEl = document.getElementById('focus-insights-list');
  if(!panel) return;
  panel.style.display = 'block';
  if(conceptEl) conceptEl.innerHTML = '<em style="color:var(--muted)">Identifying "'+selectedText.slice(0,40)+'"...</em>';
  if(insightsEl) insightsEl.innerHTML = '';
  panel.scrollIntoView({behavior:'smooth',block:'start'});

  let storedInsights = [];
  try{
    const ir = await _sbGet('/rest/v1/encyclopedia_insights?order=created_at.desc&limit=40');
    if(ir.ok) storedInsights = await ir.json();
  }catch(e){}

  const insightTexts = storedInsights.slice(0,30).map(i=>'• '+i.insight_text+' ['+( i.source_entry_title||'')+']').join('\n');
  const prompt = 'A music producer selected: "'+selectedText+'"\n\nContext:\n...'+before.slice(-250)+' [[['+selectedText+']]] '+after.slice(0,250)+'...\n\nKnowledge base:\n'+(insightTexts||'None yet')+'\n\nReturn JSON only:\n{"meaning":"2-3 sentence explanation","insights":[{"text":"insight","entry_id":"","entry_title":""}]}';

  try{
    const data = await callOracle([{role:'user',content:prompt}],'',400);
    const raw = data.content.map(x=>x.text||'').join('').replace(/```json|```/g,'').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if(!match) throw new Error('no json');
    const result = JSON.parse(match[0]);
    if(conceptEl) conceptEl.innerHTML = '<strong style="color:var(--gold)">"'+selectedText+'"</strong><br><br>'+(result.meaning||'');
    if(insightsEl) insightsEl.innerHTML = (result.insights||[]).map(ins=>`
      <div class="focus-insight-card" onclick="goToEncFromFocus('${ins.entry_id||''}')">
        <div style="font-size:12px;color:var(--text);margin-bottom:3px">${ins.text}</div>
        ${ins.entry_title?'<div style="font-size:10px;color:var(--blue)">↗ '+ins.entry_title+'</div>':''}
      </div>`).join('');
  }catch(e){
    if(conceptEl) conceptEl.textContent = 'Could not identify — try selecting more specific text.';
  }
}

function goToEncFromFocus(entryId){
  exitFocusToEnc();
  setTimeout(()=>{
    if(typeof refreshEncyclopediaDisplay==='function') refreshEncyclopediaDisplay();
  }, 300);
}


// -- SCHEDULED AGENDAS IN SCHEDULE TAB --
function loadScheduledAgendas(){
  const blocks = JSON.parse(localStorage.getItem('rpgace_scheduled_agendas')||'[]');
  const CAT_ICON_S = {beat:'🎛',content:'📸',growth:'📈',learning:'📚',personal:'⚡'};
  const schedPage = document.getElementById('page-schedule');
  if(!schedPage) return;
  let summaryEl = document.getElementById('scheduled-agendas-summary');
  if(summaryEl) summaryEl.remove();
  if(!blocks.length) return;
  summaryEl = document.createElement('div');
  summaryEl.id = 'scheduled-agendas-summary';
  summaryEl.style.cssText = 'background:var(--panel2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:16px';
  const firstChild = schedPage.querySelector('.section-title');
  if(firstChild) schedPage.insertBefore(summaryEl, firstChild);
  else schedPage.prepend(summaryEl);
  summaryEl.innerHTML = '<div style="font-family:Cinzel,serif;font-size:11px;color:var(--gold);letter-spacing:1px;margin-bottom:10px">SCHEDULED AGENDAS</div>'
    + blocks.map(function(b,i){
        return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">'
          + '<span style="font-size:16px">'+(CAT_ICON_S[b.category]||'📋')+'</span>'
          + '<div style="flex:1"><div style="font-size:13px;color:var(--text);font-weight:600">'+b.title+'</div>'
          + '<div style="font-size:11px;color:var(--muted)">'+b.time+' · '+b.duration_mins+'min · '+(b.date||'Today')+'</div></div>'
          + '<button onclick="removeScheduledAgenda('+i+')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px">✕</button>'
          + '</div>';
      }).join('')
    + '<div style="margin-top:10px"><button onclick="clearScheduledAgendas()" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:5px;padding:4px 10px;font-size:11px;cursor:pointer">Clear All</button></div>';
}

function removeScheduledAgenda(idx){
  const blocks = JSON.parse(localStorage.getItem('rpgace_scheduled_agendas')||'[]');
  blocks.splice(idx,1);
  localStorage.setItem('rpgace_scheduled_agendas',JSON.stringify(blocks));
  loadScheduledAgendas();
}

function clearScheduledAgendas(){
  if(!confirm('Clear all scheduled agendas?')) return;
  localStorage.removeItem('rpgace_scheduled_agendas');
  loadScheduledAgendas();
}


// ═══════════════════════════════════════════════════
// FOURTH ROTA — SHIFT SYSTEM
// ═══════════════════════════════════════════════════
const SHIFTS_KEY = 'rpgace_shifts';

// Oct 12 2026 (MD2-1): the hardcoded June-July 2026 rota that used to seed
// an empty browser is gone (Alex: "forget about june/july, just start
// fresh"). Shifts come from rpgace_shifts via shiftSync.
function initShifts(){}

function getShifts(){
  try{ return JSON.parse(localStorage.getItem(SHIFTS_KEY)||'[]'); }catch(e){ return []; }
}

function getTodayShifts(){
  // Local date (toISOString is UTC, so after midnight in BST it gave yesterday).
  const n = new Date(), today = n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');
  return getShifts().filter(s=>s.date===today);
}

function getShiftsForDate(dateStr){
  return getShifts().filter(s=>s.date===dateStr);
}

function getShiftContext(){
  // Returns shift summary for agenda generator prompt
  const today = new Date();
  const next7 = [];
  for(let i=0;i<7;i++){
    const d = new Date(today);
    d.setDate(today.getDate()+i);
    const dateStr = d.toISOString().split('T')[0];
    const shifts = getShiftsForDate(dateStr);
    if(shifts.length){
      const dayName = d.toLocaleDateString('en-GB',{weekday:'short'});
      const dayNum = d.getDate();
      shifts.forEach(s=>{
        next7.push(dayName+' '+dayNum+': '+s.start+'-'+s.end+' ('+s.role+', '+s.hours+'h)');
      });
    }
  }
  if(!next7.length) return 'No shifts in next 7 days';
  return next7.join('\n');
}

function getFreeWindows(){
  // Get free time windows today around shifts
  const todayShifts = getTodayShifts();
  if(!todayShifts.length) return 'Full day free';
  const windows = [];
  const toMins = t => { const [h,m]=(t||'00:00').split(':').map(Number); return h*60+m; };
  const toTime = m => String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
  // Sort shifts by start time
  const sorted = [...todayShifts].sort((a,b)=>toMins(a.start)-toMins(b.start));
  let cursor = 0;
  sorted.forEach(s=>{
    const start = toMins(s.start);
    const end = s.end==='00:00'?24*60:toMins(s.end);
    if(start-cursor >= 60) windows.push(toTime(cursor)+'-'+s.start+' ('+(start-cursor)+'min free)');
    cursor = end;
  });
  if(1440-cursor >= 60) windows.push(toTime(cursor)+'-00:00 ('+(1440-cursor)+'min free)');
  return windows.length ? windows.join(', ') : 'No significant free windows today';
}

function renderShiftBlocks(){autoApplyStoredShifts();
  // Show shift blocks in schedule tab
  const shifts = getShifts();
  const _n = new Date(), today = _n.getFullYear()+'-'+String(_n.getMonth()+1).padStart(2,'0')+'-'+String(_n.getDate()).padStart(2,'0');
  // Remove existing shift blocks
  document.querySelectorAll('.shift-block').forEach(el=>el.remove());
  let shiftSummaryEl = document.getElementById('shift-summary');
  if(shiftSummaryEl) shiftSummaryEl.remove();
  const schedPage = document.getElementById('page-schedule');
  if(!schedPage) return;
  // Show upcoming shifts summary
  const upcoming = shifts.filter(s=>s.date>=today).slice(0,8);
  // Oct 12 2026 (MD2-1): always render, even with no upcoming shifts —
  // returning early here hid the paste box/import button exactly when
  // there was nothing imported yet.
  shiftSummaryEl = document.createElement('div');
  shiftSummaryEl.id = 'shift-summary';
  // UI Debloat: with no shifts it's one slim line (title + Update Rota).
  shiftSummaryEl.style.cssText = upcoming.length ? 'background:rgba(128,128,128,.08);border:1px solid rgba(128,128,128,.2);border-radius:10px;padding:14px;margin-bottom:16px' : 'padding:4px 2px;margin-bottom:10px';
  shiftSummaryEl.innerHTML = '<div style="font-family:Cinzel,serif;font-size:11px;color:var(--muted);letter-spacing:1px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">'
    + '<span>🏪 WORK SHIFTS — The Joiners Arms</span>'
    + '</div>'
    + (upcoming.length ? '' : '<div style="font-size:12px;color:var(--muted)">No upcoming shifts.</div>')
    + upcoming.map(s=>{
        const d = new Date(s.date+'T00:00:00');
        const dayStr = d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
        const isTraining = s.role==='Training';
        const col = isTraining ? 'var(--blue)' : 'rgba(128,128,128,.7)';
        return '<div class="shift-block" style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">'
          + '<div style="font-size:12px;color:var(--muted);min-width:90px">'+dayStr+'</div>'
          + '<div style="flex:1;font-size:13px;font-weight:600;color:'+col+'">'+s.start+' → '+s.end+'</div>'
          + '<div style="font-size:11px;color:var(--muted)">'+s.role+' · '+s.hours+'h</div>'
          + '</div>';
      }).join('')
    + '<div id="paste-rota-area" style="display:none;margin-top:12px">'
    + '<div style="font-size:11px;color:var(--muted);margin-bottom:6px">Paste your shifts below (one per line: DD/MM START-END, e.g. "25/06 10:30-21:00"):</div>'
    + '<textarea id="rota-paste-input" rows="6" placeholder="23/06 10:30-21:00&#10;25/06 10:30-21:00&#10;27/06 13:00-22:00" style="width:100%;background:var(--panel);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:8px;font-size:12px;font-family:monospace;resize:vertical;box-sizing:border-box"></textarea>'
    + '<div style="display:flex;gap:8px;margin-top:8px">'
    + '<button onclick="parseAndSaveRota()" style="background:var(--gold);border:none;color:#000;border-radius:6px;padding:8px 16px;font-size:13px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:800">✓ Import Shifts</button>'
    + '<button onclick="closePasteRota()" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:8px 12px;font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif">Cancel</button>'
    + '</div></div>';
  // Insert before scheduled agendas summary or first section title
  const agendaSummary = document.getElementById('scheduled-agendas-summary');
  const firstTitle = schedPage.querySelector('.section-title');
  // Oct 12 2026 (MD2-1): insert into the anchor's real parent — schedPage
  // isn't always its direct parent, which made insertBefore throw.
  const anchor = agendaSummary || firstTitle;
  if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(shiftSummaryEl, anchor);
  else schedPage.prepend(shiftSummaryEl);
}

function openPasteRota(){
  const el = document.getElementById('paste-rota-area');
  if(el) el.style.display = 'block';
}

function closePasteRota(){
  const el = document.getElementById('paste-rota-area');
  if(el) el.style.display = 'none';
}

function parseAndSaveRota(){
  const input = document.getElementById('rota-paste-input');
  if(!input) return;
  const text = input.value.trim();
  if(!text){ alert('Please paste your shifts first'); return; }
  const lines = text.split('\n').map(l=>l.trim()).filter(l=>l);
  const shifts = [];
  const ss = window.RPGACE && RPGACE.modules.shiftSync;
  if(!ss){ alert('Shift sync is still loading, try again in a moment.'); return; }
  const defaultRole = ss.logic.lastRole();
  const dayNames = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const monthMap = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
  lines.forEach(line=>{
    // Format: DD/MM HH:MM-HH:MM or DD/MM/YYYY HH:MM-HH:MM
    const m = line.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\s+(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s*(.*)$/);
    if(m){
      const day = parseInt(m[1]);
      const month = parseInt(m[2])-1;
      const year = m[3] ? parseInt(m[3].length===2?'20'+m[3]:m[3]) : new Date().getFullYear();
      const start = m[4];
      const end = m[5];
      const d = new Date(year, month, day);
      // Oct 12 2026: local date — toISOString() of local midnight was a day early in BST.
      const dateStr = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      const [sh,sm] = start.split(':').map(Number);
      const [eh,em] = end.split(':').map(Number);
      let hours = eh===0 ? (24-sh-sm/60) : (eh+em/60-sh-sm/60);
      if(hours < 0) hours += 24;
      shifts.push({
        date: dateStr,
        day: dayNames[d.getDay()],
        role: (m[6]||'').trim() || defaultRole,
        start, end,
        hours: Math.round(hours*10)/10
      });
    }
  });
  if(!shifts.length){ alert('Could not parse any shifts. Use format: DD/MM HH:MM-HH:MM'); return; }
  // Oct 12 2026 (MD2-1): one shared save path — replaces the dates pasted,
  // saves to Supabase so every device sees them.
  closePasteRota();
  ss.logic.replaceDates(shifts, 'paste').then(r=>{
    renderShiftBlocks();
    RPGACE.utils.toast('✅ Imported '+r.saved+' shifts'+(r.pushed?'':' (saved on this device, uploads when you are signed in)'),'#4caf82',3000);
  });
}


// ═══════════════════════════════════════════════════
// ORACLE IMAGE UPLOAD — Rota Vision Parser
// ═══════════════════════════════════════════════════
let _pendingImage = null; // {base64, mediaType, preview}

function oracleImageUpload(){
  document.getElementById('oracle-img-input').click();
}

function handleOracleImage(input){
  const file = input.files[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){
    alert('Please upload an image file');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e){
    const dataUrl = e.target.result;
    const base64 = dataUrl.split(',')[1];
    const mediaType = file.type;
    _pendingImage = {base64, mediaType, name: file.name};
    // Show preview in chat
    const preview = document.createElement('div');
    preview.style.cssText = 'margin:8px 0;position:relative;display:inline-block';
    preview.innerHTML = '<img src="'+dataUrl+'" style="max-width:200px;max-height:150px;border-radius:8px;border:1px solid var(--gold)"/>'
      + '<button onclick="clearPendingImage(this.parentElement)" style="position:absolute;top:-6px;right:-6px;background:var(--red,#e74c3c);border:none;color:#fff;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer;line-height:18px;text-align:center">✕</button>'
      + '<div style="font-size:10px;color:var(--muted);margin-top:3px">📸 Image ready — send to analyse</div>';
    const chatMessages = document.getElementById('chat-msgs');
    if(chatMessages){ chatMessages.appendChild(preview);
    chatMessages.scrollTop = chatMessages.scrollHeight; }
  };
  reader.readAsDataURL(file);
  input.value = ''; // reset so same file can be re-uploaded
}

function clearPendingImage(el){
  _pendingImage = null;
  if(el) el.remove();
}

async function sendChatWithImage(){
  if(!_pendingImage){ sendChat(); return; }
  const input = document.getElementById('chat-input');
  const userText = (input ? input.value.trim() : '') || 'Please analyse this image.';
  if(input) input.value = '';

  // Detect if this looks like a rota/schedule
  const isRotaUpload = userText.toLowerCase().includes('rota') 
    || userText.toLowerCase().includes('shift')
    || userText.toLowerCase().includes('schedule')
    || userText === 'Please analyse this image.';

  addMsg(userText + ' [image attached]', 'user');

  const imageData = _pendingImage;
  _pendingImage = null;
  // Remove preview from chat
  document.querySelectorAll('#chat-messages img').forEach(img=>{
    if(img.src.includes('data:image')) img.closest('div').remove();
  });

  const systemPrompt = isRotaUpload
    ? RPGACE.modules.shiftSync.logic.ROTA_SYSTEM
    : 'You are a helpful AI assistant. Analyse this image and respond helpfully.';

  try {
    // Call oracle with image
    const response = await fetch('/api/oracle', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: [
            {type:'image', source:{type:'base64', media_type:imageData.mediaType, data:imageData.base64}},
            {type:'text', text: isRotaUpload ? 'Extract all shifts from this rota screenshot.' : userText}
          ]
        }],
        system: systemPrompt,
        max_tokens: 1000
      })
    });

    if(!response.ok) throw new Error('Oracle request failed');
    const data = await response.json();
    const raw = (data.content||[]).map(x=>x.text||'').join('');

    if(isRotaUpload){
      // MD2-3 (Oct 14 2026): parsing moved to shiftSync.logic.fromRotaJson,
      // shared with the Screenshot inbox route; saved through the one
      // shiftSync path so it reaches Supabase and every device.
      const ss = RPGACE.modules.shiftSync;
      const newShifts = ss ? ss.logic.fromRotaJson(raw) : null;
      if(newShifts && newShifts.length){
        ss.logic.replaceDates(newShifts, 'rota screenshot');
        addMsg('✅ Rota imported! Found **'+newShifts.length+' shifts**:\n\n'
          + newShifts.map(s=>'• '+s.day+' '+s.date.split('-').reverse().join('/')+': '+s.start+'-'+s.end+' ('+s.role+', '+s.hours+'h)').join('\n')
          + '\n\nSwitch to the Schedule tab to see your shifts. Your agenda generator is now shift-aware.', 'assistant');
        return;
      }
      addMsg(raw || 'Could not parse rota from image. Try uploading a clearer screenshot.', 'assistant');
    } else {
      addMsg(raw, 'assistant');
    }
  } catch(err){
    addMsg('Error analysing image: '+err.message, 'assistant');
  }
}


function updateDBStats(){} // stub — removed from dead code cleanup

// ═══════════════════════════════════════════════════
// GLOBAL TEXT SELECTION AI — works across all tabs
// ═══════════════════════════════════════════════════
let _globalSelectTimeout = null;
let _globalSelectedText = '';
let _globalSelectedContext = '';

// Aug 23 2026 (UI2) - 'page-learning' dropped: the Research Lab page is
// retired, so this text-selection-to-quest feature has no live page to
// apply to there any more. The other 4 entries are unchanged and real.
const SELECTABLE_PAGES = ['page-advisor','page-encyclopedia','page-journal','focus-overlay'];

function initGlobalTextSelect(){
  document.addEventListener('mouseup', function(e){
    // Skip if inside concept panels
    if(e.target.closest('#global-concept-panel')) return;
    if(e.target.closest('#focus-concept-panel')) return;
    if(e.target.closest('#selection-identify-btn')) return;
    // Check we're on a selectable page
    const activePage = document.querySelector('.page.active');
    const inFocus = document.getElementById('focus-overlay')?.style.display === 'block';
    const pageId = activePage ? activePage.id : '';
    if(!inFocus && !SELECTABLE_PAGES.includes(pageId)) return;
    clearTimeout(_globalSelectTimeout);
    _globalSelectTimeout = setTimeout(()=>handleGlobalSelect(e), 350);
  });

  // Hide identify button when clicking elsewhere
  document.addEventListener('mousedown', function(e){
    if(!e.target.closest('#selection-identify-btn')){
      document.getElementById('selection-identify-btn').style.display = 'none';
    }
  });
}

function handleGlobalSelect(e){
  // Skip if in focus overlay (handled separately)
  const inFocus = document.getElementById('focus-overlay')?.style.display === 'block';
  if(inFocus) return;

  const sel = window.getSelection();
  if(!sel || sel.isCollapsed || sel.toString().trim().length < 5) return;

  _globalSelectedText = sel.toString().trim();

  // Get surrounding context
  const node = sel.anchorNode?.parentElement;
  const container = node?.closest('p,div,li,td,section') || node;
  _globalSelectedContext = container ? container.textContent.slice(0, 600) : '';

  // Show identify button near selection
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const btn = document.getElementById('selection-identify-btn');
  if(!btn) return;
  btn.style.display = 'block';
  btn.style.top = Math.max(10, rect.top - 38) + 'px';
  btn.style.left = Math.min(window.innerWidth - 120, rect.left) + 'px';
}

async function triggerGlobalIdentify(){
  const btn = document.getElementById('selection-identify-btn');
  if(btn) btn.style.display = 'none';

  const text = _globalSelectedText;
  const context = _globalSelectedContext;
  if(!text) return;

  const panel = document.getElementById('global-concept-panel');
  const conceptEl = document.getElementById('global-concept-text');
  const insightsEl = document.getElementById('global-insights-list');

  if(!panel) return;
  panel.classList.remove('hidden');
  panel.style.display = 'block';
  if(conceptEl) conceptEl.innerHTML = '<em style="color:var(--muted)">Identifying "'+text.slice(0,40)+'"...</em>';
  if(insightsEl) insightsEl.innerHTML = '';

  // Fetch stored insights for context
  let storedInsights = [];
  try{
    const ir = await _sbGet('/rest/v1/encyclopedia_insights?order=created_at.desc&limit=30');
    if(ir.ok) storedInsights = await ir.json();
  }catch(e){}

  const insightTexts = storedInsights.slice(0,20).map(i=>'• '+i.insight_text).join('\n') || 'None yet';
  const prompt = 'A music producer / content creator selected this text: "'+text+'"\n\nContext around it:\n'+context+'\n\nKnowledge base:\n'+insightTexts+'\n\nReturn JSON only:\n{"meaning":"2-3 sentence explanation of this concept for a music producer/content creator","insights":[{"text":"brief related insight","entry_title":""}]}';

  try{
    const data = await callOracle([{role:'user',content:prompt}],'',400);
    const raw = data.content.map(x=>x.text||'').join('').replace(/```json|```/g,'').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if(!match) throw new Error('no json');
    const result = JSON.parse(match[0]);

    if(conceptEl) conceptEl.innerHTML = '<strong style="color:var(--gold)">"'+text.slice(0,60)+(text.length>60?'...':'')+'"</strong><br><br>'+(result.meaning||'');
    if(insightsEl) insightsEl.innerHTML = (result.insights||[]).map(ins=>
      '<div class="focus-insight-card" style="margin-bottom:6px;cursor:default">'
      + '<div style="font-size:12px;color:var(--text)">'+ins.text+'</div>'
      + (ins.entry_title?'<div style="font-size:10px;color:var(--blue);margin-top:2px">↗ '+ins.entry_title+'</div>':'')
      + '</div>').join('');
  }catch(err){
    if(conceptEl) conceptEl.textContent = 'Could not identify — try selecting more specific text.';
  }
}

function closeGlobalPanel(){
  const panel = document.getElementById('global-concept-panel');
  if(panel){ panel.classList.add('hidden'); setTimeout(()=>panel.style.display='none',250); }
}


// ═══════════════════════════════════════════════════
// PROD. BY ORACLE — 7 Teaching Commands + Beat Analysis
// ═══════════════════════════════════════════════════
const PROD_ORACLE_SYS = `You are Alex's personal 300IQ music production teacher — a master producer, beatmaker, and composer who has created beats for top hip hop and rap artists. You have encyclopedic knowledge of the complete craft:

MUSIC THEORY: scales (minor pentatonic, dorian, phrygian), modes, chord progressions for hip hop, melody construction, counter-melodies, harmonic tension
SOUND DESIGN: synthesis in Omnisphere/Serum/3xOsc/Harmor/Sytrus, layering techniques, sound selection for trap/drill/boom bap, sampling philosophy  
DRUM SEQUENCING: 808 programming and pitch slides, trap hi-hat patterns and rolls, kick/snare placement, swing and groove quantization, percussion layering
ARRANGEMENT: song structure (intro/verse/hook/bridge/outro), tension and release, transition techniques, stereo space, energy mapping across a track
MIXING: EQ (frequency separation, surgical cuts, hi-shelf air), compression (attack/release for punch), sidechain (volume and multiband), saturation, reverb/delay for depth, stereo width
MASTERING: loudness normalisation, true peak limiting, multiband compression, M/S processing, streaming standards (Spotify -14 LUFS)

Alex (@AceSanyaBeats) uses FL Studio on Windows. Active VSTs: Omnisphere, Serum, Harmor, Sytrus, FL built-ins (3xOsc, Parametric EQ2, Fruity Compressor, Maximus). Target: YouTube content about FL Studio Secrets, grow to 100k subscribers.

TEACHING RULES — never break these:
1. Never waste a single word on anything that doesn't directly serve Alex's specific learning destination
2. Always reference FL Studio specifically — plugins, menus, shortcuts, workflow
3. Give concrete immediately actionable techniques he can apply in the next session
4. Connect every concept to real tracks/producers he can reference and study
5. Build compounding knowledge — connect each lesson to what came before
6. Treat Alex as intelligent — skip the basics he clearly knows, go straight to the gap`;

const PROD_COMMANDS = {
  '1': {label:'Master Learning', icon:'🎓', prefill:true,
    prompt:`You are now my personal teacher for the complete craft of hip hop and rap music production — music theory, sound design, drum sequencing, arrangement, mixing and mastering, all inside FL Studio. Before teaching anything ask me three questions: what is my current level of understanding in the specific area I want to learn, what specifically needs to be learned right now, and how will this knowledge be used in my actual beats and YouTube content. Use every answer to design a completely personalised teaching approach that starts from exactly where my understanding currently sits and builds toward exactly where it needs to go without wasting a single minute on anything that does not directly serve that specific destination.`},
  '2': {label:'Instant Understanding', icon:'⚡', prefill:true,
    prompt:`Here is something I need to understand right now: [TYPE CONCEPT — e.g. "sidechain compression", "dorian mode", "808 pitch slides"]. Teach it in three layers. Layer one: explain it in one sentence so simple a complete beginner understands it. Layer two: explain it in one paragraph with one real world example inside FL Studio — specific plugin, specific setting, specific result. Layer three: explain every nuance and complexity that matters for actually using this in my beats and production career. Stop after each layer and ask if that level of understanding is enough before going deeper.`},
  '3': {label:'Socratic Teaching', icon:'🤔', prefill:true,
    prompt:`Do not explain [TYPE SUBJECT — e.g. "compression", "minor scales", "trap hi-hat patterns"] directly. Instead teach it using only questions. Ask one question at a time. After each answer ask the next question that builds naturally on what was just said. Guide my thinking toward the right understanding without ever stating it directly. Only correct a wrong answer by asking a better question that reveals why it is wrong. Continue until I have reached complete understanding through thinking rather than being told what to think.`},
  '4': {label:'Real World Application', icon:'🌍', prefill:true,
    prompt:`Here is something I understand theoretically but have never fully applied: [TYPE KNOWLEDGE — e.g. "frequency separation", "chord inversions", "sidechain"]. Stop teaching theory completely. Design five real world scenarios in FL Studio where this knowledge gets applied immediately starting from today. For each scenario describe the exact situation, the exact decision this knowledge changes, the exact steps in FL Studio, and the exact way my beat sounds different. Make every scenario so realistic and immediately relevant that applying this knowledge feels urgent rather than optional.`},
  '5': {label:'Gap Finder', icon:'🔍', prefill:true,
    prompt:`Here is everything I currently understand about [TYPE SUBJECT]: [DESCRIBE YOUR CURRENT KNOWLEDGE AS HONESTLY AS POSSIBLE]. Study this completely. Find every gap in my understanding I do not even know exists yet. Find every place where my understanding is technically correct but missing the deeper insight that makes it genuinely useful. Find every misconception hiding inside what seems like correct knowledge. Address every gap starting with the one causing the most damage to the quality of my music right now.`},
  '6': {label:'Teach It Back', icon:'🎯', prefill:true,
    prompt:`Here is my explanation of [TYPE SUBJECT] that needs checking for genuine understanding: [PASTE YOUR EXPLANATION IN YOUR OWN WORDS]. Find every place where my explanation reveals genuine understanding versus comfortable familiarity with the right words without the right understanding underneath. Give me a score out of 10 for genuine production mastery and tell me exactly what needs to be studied and practised to move that score to a 10.`},
  '7': {label:'Permanent Knowledge', icon:'🧠', prefill:true,
    prompt:`Here is production knowledge I need permanently accessible: [DESCRIBE WHAT NEEDS TO BE REMEMBERED]. Design a complete knowledge retention system for this content. Include the spaced repetition schedule, the active recall exercises I can do while making beats, and the one connection to existing production knowledge that makes this feel like a natural extension of something I already deeply understand rather than an isolated piece of information floating without any anchor.`}
};

function toggleProdOraclePanel(){
  const p = document.getElementById('prod-oracle-panel');
  if(!p) return;
  p.style.display = p.style.display==='none'||!p.style.display ? 'block' : 'none';
}

function fireProdCommand(num){
  const cmd = PROD_COMMANDS[String(num)];
  if(!cmd) return;
  document.getElementById('prod-oracle-panel').style.display = 'none';
  const input = document.getElementById('chat-input');
  if(!input) return;
  if(num===1){
    // Fire immediately — no blanks to fill
    window._prodOracleActive = true;
    input.value = cmd.prompt;
    sendChat();
  } else {
    // Pre-fill so user fills in the blanks
    input.value = cmd.prompt;
    input.focus();
    // Highlight first [bracket] for easy replacement
    const start = cmd.prompt.indexOf('[');
    const end = cmd.prompt.indexOf(']') + 1;
    if(start>=0) input.setSelectionRange(start, end);
  }
}

async function fireBeatAnalysis(){
  document.getElementById('prod-oracle-panel').style.display = 'none';
  const input = document.getElementById('chat-input');

  // Fetch encyclopedia insights
  let insights = [];
  try{
    const r = await _sbGet('/rest/v1/encyclopedia_insights?order=created_at.desc&limit=60');
    if(r.ok) insights = await r.json();
  }catch(e){}

  // Fetch encyclopedia entries
  let entries = [];
  try{
    const r = await _sbGet('/rest/v1/encyclopedia?order=created_at.desc&limit=20');
    if(r.ok) entries = await r.json();
  }catch(e){}

  const insightTexts = insights.map(i=>'• '+i.insight_text+(i.macro_category?' ['+i.macro_category+']':'')).join('\n') || 'No insights yet — extract some from encyclopedia entries first.';
  const entryTitles = entries.map(e=>e.title).join(', ') || 'None yet';

  const prompt = `BEAT ANALYSIS — scan my production knowledge base and teach me.

MY ENCYCLOPEDIA ENTRIES: ${entryTitles}

MY EXTRACTED INSIGHTS:
${insightTexts}

As my 300IQ production teacher:
1. WHAT I KNOW: Identify the strongest production knowledge I have based on these insights
2. THE GAP: Find the single most important gap in my production knowledge that is holding back my sound right now — the gap I probably don't even know exists
3. CONNECTIONS: Find 3 insights that connect to each other in a way I probably haven't realised yet
4. NEXT LESSON: Based on everything above, design my next production lesson starting with the most urgent knowledge gap
5. APPLY NOW: Give me one concrete 30-minute FL Studio exercise I can do tonight that directly addresses the biggest gap

Be brutal and specific. Reference my actual insights by content, not vaguely.`;

  window._prodOracleActive = true;
  if(input) input.value = prompt;
  sendChat();
}

// Override sendChat to use PROD_ORACLE_SYS when active
const _origSendChat = typeof sendChat === 'function' ? sendChat : null;


function autoApplyStoredShifts(){
  const stored=JSON.parse(localStorage.getItem('rpgace_shifts')||'[]');
  if(!stored.length)return;
  const dayNames=['sun','mon','tue','wed','thu','fri','sat'];
  const colMap={sun:6,mon:0,tue:1,wed:2,thu:3,fri:4,sat:5};
  const today=new Date();
  const dow=today.getDay();
  const monday=new Date(today);
  monday.setDate(today.getDate()-(dow===0?6:dow-1));
  monday.setHours(0,0,0,0);
  const sunday=new Date(monday);
  sunday.setDate(monday.getDate()+6);
  const weekShifts=stored.filter(s=>{
    const d=new Date(s.date+'T00:00:00');
    return d>=monday&&d<=sunday;
  }).map(s=>{
    const d=new Date(s.date+'T00:00:00');
    const startH=parseInt(s.start.split(':')[0]);
    const endH=s.end==='00:00'?24:parseInt(s.end.split(':')[0]);
    return {title:s.role,startH,endH,dayName:dayNames[d.getDay()],date:s.date,start:s.start,end:s.end};
  });
  if(!weekShifts.length)return;
  applyShifts(weekShifts,'Fourth Rota');
  const cols=document.querySelectorAll('.day-col');
  document.querySelectorAll('.auto-shift-block').forEach(el=>el.remove());
  weekShifts.forEach(shift=>{
    const idx=colMap[shift.dayName];
    const col=cols[idx];
    if(!col)return;
    const endLabel=shift.end==='00:00'||shift.endH===24?'00:00':shift.end;
    const block=document.createElement('div');
    block.className='auto-shift-block';
    block.style.cssText='background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.35);border-radius:6px;padding:7px 10px;margin:6px 4px 0;font-size:11px;font-family:Rajdhani,sans-serif;';
    block.innerHTML='<div style="color:#C9A84C;font-weight:700">\uD83C\uDFEA '+shift.title+'</div>'
      +'<div style="color:rgba(226,226,236,0.6);margin-top:2px">'+shift.start+' - '+endLabel+'</div>';
    col.appendChild(block);
  });
}


window._calMonthDate=new Date();
window._calWeekStart=null;
function _calGetShifts(){return JSON.parse(localStorage.getItem('rpgace_shifts')||'[]');}
function _calGetSchedAgendas(){return JSON.parse(localStorage.getItem('rpgace_sched_agendas')||'[]');}
function _calDateStr(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function _calMondayOf(d){const r=new Date(d);r.setHours(0,0,0,0);const dow=r.getDay();r.setDate(r.getDate()-(dow===0?6:dow-1));return r;}
function _calCellItems(dateStr){const shifts=_calGetShifts().filter(s=>s.date===dateStr);const agendas=_calGetSchedAgendas().filter(a=>a.date===dateStr);
  // DR-8 (Oct 27 2026): one-off events and memories (eventMemories) show on the Calendar too.
  const em=window.RPGACE&&RPGACE.modules.eventMemories;((em&&em._rows)||[]).forEach(function(r){if(r.happened_on===dateStr&&r.status!=='dropped'){const m=/^(\d{1,2})/.exec(r.at_time||'');agendas.push({title:(r.status==='kept'?'🎞 ':'📅 ')+r.title,hour:m?+m[1]:12,date:dateStr});}});
  return {shifts,agendas};}
function _calFmtShort(s){return s.start+'\u2013'+(s.end==='00:00'?'00:00':s.end);}

function buildMonthSlots(){
  const el=document.getElementById('month-slots');if(!el)return;el.innerHTML='';
  // DR-11 (Oct 27 2026, Alex on phone: "Poorly done on phone"): .month-grid's old card grid (4 cols, 2 on phone)
  // split nav / day names / grid into columns; this view lays out its own rows.
  el.style.display='block';
  const ref=window._calMonthDate,yr=ref.getFullYear(),mo=ref.getMonth();
  const btnS='background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#E2E2EC;padding:5px 13px;border-radius:5px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;';
  const moName=ref.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
  const nav=document.createElement('div');nav.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;';
  nav.innerHTML='<button onclick="calMonthNav(-1)" style="'+btnS+'">\u25C4</button>'
    +'<div style="text-align:center"><div style="font-family:Cinzel,serif;font-size:14px;color:#C9A84C">'+moName+'</div>'
    +'<div style="display:flex;gap:8px;margin-top:4px"><button onclick="calYearNav(-1)" style="'+btnS+';padding:2px 8px;font-size:10px">\u25C4 '+(yr-1)+'</button>'
    +'<button onclick="calYearNav(1)" style="'+btnS+';padding:2px 8px;font-size:10px">'+(yr+1)+' \u25BA</button></div></div>'
    +'<button onclick="calMonthNav(1)" style="'+btnS+'">\u25BA</button>';
  el.appendChild(nav);
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const hdrRow=document.createElement('div');hdrRow.style.cssText='display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;margin-bottom:4px;';
  days.forEach(function(d){const h=document.createElement('div');h.style.cssText='font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--muted);text-align:center;padding:4px 0;';h.textContent=d.toUpperCase();hdrRow.appendChild(h);});
  el.appendChild(hdrRow);
  const firstOfMonth=new Date(yr,mo,1),gridStart=_calMondayOf(firstOfMonth);
  const lastOfMonth=new Date(yr,mo+1,0),lastDow=lastOfMonth.getDay();
  const gridEnd=new Date(lastOfMonth);gridEnd.setDate(lastOfMonth.getDate()+(lastDow===0?0:7-lastDow));
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;';
  const cursor=new Date(gridStart),todayStr=_calDateStr(new Date());
  while(cursor<=gridEnd){
    const dateStr=_calDateStr(cursor),inMonth=cursor.getMonth()===mo&&cursor.getFullYear()===yr,isToday=dateStr===todayStr;
    const {shifts,agendas}=_calCellItems(dateStr);
    const cell=document.createElement('div');
    cell.style.cssText='background:'+(isToday?'rgba(201,168,76,0.1)':'rgba(255,255,255,0.02)')+';border:1px solid '+(isToday?'rgba(201,168,76,0.4)':'rgba(255,255,255,0.05)')+';border-radius:4px;padding:4px;min-height:52px;cursor:pointer;min-width:0;overflow:hidden;';
    cell.onclick=(function(ds){return function(){var sf=RPGACE.modules.scheduleFixes;if(sf)sf.ui.openDay(ds);};})(dateStr);
    const dayNum=document.createElement('div');dayNum.style.cssText='font-family:Rajdhani,sans-serif;font-size:11px;font-weight:700;color:'+(isToday?'#C9A84C':inMonth?'#E2E2EC':'rgba(226,226,236,0.25)')+';margin-bottom:2px;';dayNum.textContent=cursor.getDate();cell.appendChild(dayNum);
    shifts.forEach(function(s){const dot=document.createElement('div');dot.style.cssText='background:rgba(201,168,76,0.15);border-left:2px solid #C9A84C;border-radius:2px;padding:1px 4px;font-size:9px;color:#C9A84C;font-family:Rajdhani,sans-serif;font-weight:700;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';dot.textContent='\uD83C\uDFEA '+_calFmtShort(s);cell.appendChild(dot);});
    agendas.forEach(function(a){const dot=document.createElement('div');dot.style.cssText='background:rgba(74,144,226,0.12);border-left:2px solid #4A90E2;border-radius:2px;padding:1px 4px;font-size:9px;color:#4A90E2;font-family:Rajdhani,sans-serif;font-weight:700;margin-bottom:1px;';dot.textContent='\u23F0 '+String(a.hour).padStart(2,'0')+':00';cell.appendChild(dot);});
    grid.appendChild(cell);cursor.setDate(cursor.getDate()+1);
  }
  el.appendChild(grid);
}
function calMonthNav(delta){const d=window._calMonthDate;window._calMonthDate=new Date(d.getFullYear(),d.getMonth()+delta,1);buildMonthSlots();}
function calYearNav(delta){const d=window._calMonthDate;window._calMonthDate=new Date(d.getFullYear()+delta,d.getMonth(),1);buildMonthSlots();}

function buildWeekSlots(){
  const el=document.getElementById('week-slots');if(!el)return;el.innerHTML='';
  el.style.display='block'; // DR-11: same as buildMonthSlots - one full-width row per day, not .week-grid columns
  if(!window._calWeekStart)window._calWeekStart=_calMondayOf(new Date());
  const monday=new Date(window._calWeekStart),endSun=new Date(monday);endSun.setDate(monday.getDate()+6);
  const wNum=Math.ceil(monday.getDate()/7);
  const wLabel='Week '+wNum+' \u00B7 '+monday.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+'\u2013'+endSun.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  const btnS='background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#E2E2EC;padding:5px 13px;border-radius:5px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;';
  const nav=document.createElement('div');nav.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;';
  nav.innerHTML='<button onclick="calWeekNav(-1)" style="'+btnS+'">\u25C4 Prev</button>'
    +'<div style="text-align:center"><div style="font-family:Cinzel,serif;font-size:12px;color:#C9A84C">'+wNum+'</div><div style="font-family:Rajdhani,sans-serif;font-size:10px;color:var(--muted);margin-top:2px">'+wLabel+'</div></div>'
    +'<button onclick="calWeekNav(1)" style="'+btnS+'">Next \u25BA</button>';
  el.appendChild(nav);
  const todayStr=_calDateStr(new Date());
  for(var i=0;i<7;i++){
    const day=new Date(monday);day.setDate(monday.getDate()+i);
    const dateStr=_calDateStr(day),isToday=dateStr===todayStr;
    const {shifts,agendas}=_calCellItems(dateStr);
    const dayName=day.toLocaleDateString('en-GB',{weekday:'long'}),dayLabel=day.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
    const row=document.createElement('div');
    row.style.cssText='display:flex;gap:0;align-items:stretch;border-bottom:1px solid rgba(255,255,255,0.05);'+(isToday?'background:rgba(201,168,76,0.05);':'')+'cursor:pointer;min-height:52px;';
    row.onclick=(function(ds){return function(){var sf=RPGACE.modules.scheduleFixes;if(sf)sf.ui.openDay(ds);};})(dateStr);
    const dayCol=document.createElement('div');dayCol.style.cssText='width:90px;min-width:90px;padding:10px;border-right:1px solid rgba(255,255,255,0.05);display:flex;flex-direction:column;justify-content:center;';
    dayCol.innerHTML='<div style="font-family:Rajdhani,sans-serif;font-size:13px;font-weight:700;color:'+(isToday?'#C9A84C':'#E2E2EC')+'">'+dayName+'</div>'+'<div style="font-family:Rajdhani,sans-serif;font-size:10px;color:var(--muted);margin-top:2px">'+dayLabel+'</div>';
    row.appendChild(dayCol);
    const evCol=document.createElement('div');evCol.style.cssText='flex:1;padding:8px 10px;display:flex;flex-direction:column;gap:3px;justify-content:center;';
    if(!shifts.length&&!agendas.length){const rest=document.createElement('div');rest.style.cssText='font-family:Rajdhani,sans-serif;font-size:11px;color:rgba(226,226,236,0.2);font-style:italic;';rest.textContent='Rest day';evCol.appendChild(rest);}
    shifts.forEach(function(s){const blk=document.createElement('div');blk.style.cssText='background:rgba(201,168,76,0.1);border-left:2px solid #C9A84C;border-radius:3px;padding:3px 8px;font-size:11px;font-family:Rajdhani,sans-serif;font-weight:700;color:#C9A84C;';blk.innerHTML='\uD83C\uDFEA '+s.role+' <span style="color:rgba(226,226,236,0.4);font-weight:400">'+_calFmtShort(s)+'</span>';evCol.appendChild(blk);});
    agendas.forEach(function(a){const blk=document.createElement('div');blk.style.cssText='background:rgba(74,144,226,0.1);border-left:2px solid #4A90E2;border-radius:3px;padding:3px 8px;font-size:11px;font-family:Rajdhani,sans-serif;font-weight:700;color:#4A90E2;';blk.textContent='\u23F0 '+String(a.hour).padStart(2,'0')+':00 '+a.title;evCol.appendChild(blk);});
    row.appendChild(evCol);el.appendChild(row);
  }
}
function calWeekNav(delta){if(!window._calWeekStart)window._calWeekStart=_calMondayOf(new Date());const d=new Date(window._calWeekStart);d.setDate(d.getDate()+delta*7);window._calWeekStart=d;buildWeekSlots();}


function logDailyAction(dateStr,title,summary){
  const stored=JSON.parse(localStorage.getItem('rpgace_daily_log')||'{}');
  if(!stored[dateStr])stored[dateStr]=[];
  const time=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  stored[dateStr].push({time,title,summary:summary||'',done:true,id:Date.now()});
  localStorage.setItem('rpgace_daily_log',JSON.stringify(stored));
}

// ── Unified scheduling entry point — every "Schedule" button anywhere
// in RPGACE should call this instead of writing to localStorage directly.
// Ensures Weekly/Daily/Monthly all read one consistent data shape.
function scheduleToCalendar(item){
  const entry={
    id:'sa_'+Date.now()+Math.random().toString(36).slice(2,6),
    date:item.date,
    hour:item.hour||0,
    minute:item.minute||0,
    title:item.title||'Task',
    description:item.description||'',
    category:item.category||'personal',
    xp:item.xp!=null?item.xp:50, // Oct 14 2026: 0 stays 0 (chore blocks, 0-XP routines)
    estimated_mins:item.duration_mins||60,
    actual_mins:null,
    completed:false,
    started_at:null,
    ended_at:null,
    source_type:item.source_type||'agenda',
    source_id:item.source_id||null,
    created_at:new Date().toISOString()
  };
  // Oct 12 2026 MD2-4: optional template/place/travel (columns added same day).
  if(item.template_id)entry.template_id=String(item.template_id);
  if(item.place)entry.place=item.place;
  if(item.journey_mins!=null&&item.journey_mins!=='')entry.journey_mins=Number(item.journey_mins)||0;
  if(item.ready_mins!=null&&item.ready_mins!=='')entry.ready_mins=Number(item.ready_mins)||0;
  // Oct 15 2026 CM-2: a cook done without scheduling it is back-filled as an
  // already-finished entry (real start/end times), never left as a to-do.
  if(item.completed){entry.completed=true;entry.started_at=item.started_at||null;entry.ended_at=item.ended_at||null;entry.actual_mins=item.actual_mins!=null?item.actual_mins:null;}
  // Oct 16 2026 DN-1: Doing Now starts a running entry (started_at, not done yet),
  // and any entry can carry realms + a details blob (columns added same day).
  else if(item.started_at)entry.started_at=item.started_at;
  if(Array.isArray(item.realms)&&item.realms.length)entry.realms=item.realms.slice();
  if(item.details&&typeof item.details==='object')entry.details=item.details;
  // Write to localStorage immediately (instant UI feedback, works offline).
  // July 24 audit fix: routed through RPGACE.DB (rule 8 - DB.SCHEMA
  // already declares 'sched' as this exact key) instead of raw
  // localStorage, so R.hooks.fire('db:change', ...) actually fires.
  const stored = RPGACE.DB.get('sched');
  stored.push(entry);
  RPGACE.DB.set('sched', stored);

  // Also push to Supabase (rpgace_agendas) - same cross-device pattern as rpgace_shifts.
  // Fixes: tasks scheduled on one device (e.g. phone) not appearing on another.
  // July 24 FROZEN-file exception: migrated from a raw anon-key fetch to
  // the authenticated write-proxy (rpgace_core.js's RPGACE.sb.secureWrite)
  // - same real /Routine audit as the const comment above this function's
  // enclosing section.
  RPGACE.sb.secureWrite('rpgace_agendas', 'insert', entry).catch(function(e){ console.warn('[scheduleToCalendar] Supabase push failed, saved locally only:', e.message); try { RPGACE.utils.toast('⚠️ "' + entry.title + '" saved on this device only - not synced: ' + (e.message || e), '#CC4A4A', 4500, 'schedule'); } catch (x) {} }); // DL-7: fail loud (rule 7)

  return entry;
}

function _fracClock(f){
  // H20 (Sep 17 2026, real Alex bug report: "end time was 26hrs which
  // didnt make sense" — a real HABITS cook session starting late at
  // night and running long enough to cross midnight) — real root cause:
  // this took a raw fractional-hour value with no wrap, so a genuine
  // 26.55 (23:30 start + a real 183-minute cook session) rendered as the
  // nonsensical clock time "26:33" instead of the real next-day "02:33."
  // Wrapped modulo 24 here so every real caller gets a genuine, sane
  // clock time; the one real caller that can produce a value >=24
  // (renderDailyGrid's own rangeLabel) separately appends a "+1 day"
  // note so crossing midnight is still shown honestly, not hidden.
  var wrapped=((f%24)+24)%24;
  var h=Math.floor(wrapped), m=Math.round((wrapped-h)*60);
  if(m===60){h+=1;m=0;}
  if(h===24){h=0;}
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
}

function renderDailyGrid(){
  window._dailyDate=window._dailyDate||new Date();
  const d=window._dailyDate;
  const lbl=document.getElementById('daily-date-label');
  if(lbl)lbl.textContent=d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  const dateStr=(typeof _calDateStr==='function'?_calDateStr(d):d.toISOString().split('T')[0]);
  const todayStr=(typeof _calDateStr==='function'?_calDateStr(new Date()):new Date().toISOString().split('T')[0]);
  const isPast=dateStr<todayStr;

  const el=document.getElementById('time-slots');
  if(!el)return;
  el.innerHTML='';
  el.style.position='static';

  // ── Gather events, normalized to fractional hours (0-24) ──
  const shifts=typeof getShiftsForDate==='function'?getShiftsForDate(dateStr):[];
  const schedAgendas=JSON.parse(localStorage.getItem('rpgace_sched_agendas')||'[]').filter(a=>a.date===dateStr);

  const events=[];
  shifts.forEach(function(s){
    const startH=parseInt(s.start.split(':')[0]);
    const startM=parseInt(s.start.split(':')[1])||0;
    const isMid=s.end==='00:00';
    const endH=isMid?24:parseInt(s.end.split(':')[0]);
    const endM=isMid?0:(parseInt(s.end.split(':')[1])||0);
    events.push({startFrac:startH+startM/60, endFrac:endH+endM/60, type:'shift', label:'\uD83C\uDFEA '+s.role, color:'#C9A84C', bg:'rgba(201,168,76,0.14)'});
  });
  schedAgendas.forEach(function(a){
    const startFrac=(a.hour||0)+(a.minute||0)/60;
    const endFrac=startFrac+((a.estimated_mins||60)/60);
    events.push({startFrac,endFrac,type:'agenda',label:'\u23F0 '+a.title,color:'#4A90E2',bg:'rgba(74,144,226,0.14)',id:a.id,completed:a.completed,estimated_mins:a.estimated_mins,source_type:a.source_type,source_id:a.source_id});
  });
  // MD-7 (Oct 20 2026): My Day's 🌅 Morning / 🌙 Night blocks are drawn on the calendar (worked out, never stored).
  try{const md=window.RPGACE&&RPGACE.modules.myDay;if(md)md.logic.calendarBookends(dateStr).forEach(function(b){events.push(b);});}catch(e){}
  events.sort(function(a,b){return a.startFrac-b.startFrac;});

  // ── Build a row list: free gaps + events, collapsing multi-hour spans into ONE row ──
  const rows=[];
  let cursor=0;
  events.forEach(function(ev){
    if(ev.startFrac>cursor+0.001) rows.push({startFrac:cursor,endFrac:ev.startFrac,type:'free'});
    rows.push(ev);
    cursor=Math.max(cursor,ev.endFrac);
  });
  if(cursor<23.999) rows.push({startFrac:cursor,endFrac:24,type:'free'});

  // ── Render each row as one normal-flow div — no absolute positioning, no pixel math ──
  let firstEventRow=null;
  rows.forEach(function(row,i){
    const div=document.createElement('div');
    div.className='time-slot'+(row.type!=='free'?' filled':'');
    // H20 (Sep 17 2026) \u2014 real, honest "+1 day" note when a genuine block
    // (a long HABITS cook session, most likely) runs past midnight,
    // instead of a raw wrapped clock time silently implying it ends
    // EARLIER the same day than it started.
    const rangeLabel=_fracClock(row.startFrac)+'\u2013'+_fracClock(row.endFrac)+(row.endFrac>=24?' (+1 day)':'');

    if(row.type==='free'){
      div.style.cssText='padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;gap:12px;min-height:36px;cursor:pointer;';
      div.innerHTML='<span style="font-family:Rajdhani,sans-serif;font-size:11px;color:rgba(226,226,236,0.35);min-width:110px;">'+rangeLabel+'</span>'
        +'<span style="flex:1;color:rgba(226,226,236,0.3);font-family:Rajdhani,sans-serif;font-size:12px;">+ Add task</span>';
      const rowStartFrac=row.startFrac;
      div.onclick=function(){
        if(typeof openSchedModal!=='function')return;
        openSchedModal({title:'',category:'personal',xp:50,description:''});
        setTimeout(function(){
          const dateEl=document.getElementById('sched-date');
          if(dateEl)dateEl.value=dateStr;
          const hourEl=document.getElementById('sched-hour');
          if(hourEl)hourEl.value=Math.floor(rowStartFrac);
          const minEl=document.getElementById('sched-minute');
          if(minEl)minEl.value=Math.round((rowStartFrac%1)*60);
          const titleEl=document.getElementById('sched-modal-title');
          if(titleEl)titleEl.textContent='New Task';
        },30);
      };
    } else {
      const isAgenda=row.type==='agenda';
      div.style.cssText='padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.04);border-left:3px solid '+row.color+';background:'+row.bg+';'+(row.completed?'opacity:0.5;':'');
      div.innerHTML='<div style="font-family:Rajdhani,sans-serif;font-size:13px;font-weight:700;color:'+row.color+';">'+row.label+'</div>'
        +'<div style="font-family:Rajdhani,sans-serif;font-size:11px;color:rgba(226,226,236,0.4);margin-top:2px;">'+rangeLabel+(isAgenda&&row.estimated_mins?' \u00B7 '+row.estimated_mins+'min est':'')+'</div>';

      // Oct 20 2026: an entry that lands on the shift (or its travel) says so.
      // (Not for a Doing Now record or a done entry - those already happened.)
      if(isAgenda&&!row.completed&&row.source_type!=='doing_now'){try{const md0=window.RPGACE&&RPGACE.modules.myDay;const c=md0&&md0.logic.clashWith(dateStr,Math.round(row.startFrac*60),Math.round((row.endFrac-row.startFrac)*60));
        if(c){div.dataset.clash='1';const w=document.createElement('div');w.className='sched-clash-flag';w.style.cssText='grid-column:1/-1;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;color:#e0a84c;margin-top:4px;';
          w.textContent='\u26A0 Clashes with '+(c.kind==='shift'?'your shift':'your '+c.label.toLowerCase())+' ('+md0.logic.fmtMin(c.from)+'\u2013'+md0.logic.fmtMin(c.to)+')';div.appendChild(w);}}catch(e){}}
      if(isAgenda && !row.completed){
        const actions=document.createElement('div');
        actions.style.cssText='display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;grid-column:1/-1;'; // MD-7: full row width (the slot is a 56px|1fr grid)
        actions.innerHTML='<button onclick="event.stopPropagation();startScheduledTask(\''+row.id+'\')" style="background:none;border:1px solid rgba(74,144,226,0.3);color:#4A90E2;border-radius:4px;padding:3px 9px;font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;">Start</button>'
          +'<button onclick="event.stopPropagation();completeScheduledTask(\''+row.id+'\')" style="background:none;border:1px solid rgba(61,170,110,0.3);color:#3DAA6E;border-radius:4px;padding:3px 9px;font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;">Done</button>';
        div.appendChild(actions);
      }
      // MD-7: My Day blocks and the Morning/Night blocks open My Day.
      const md=window.RPGACE&&RPGACE.modules.myDay;
      if(md&&(row.type==='bookend'||(isAgenda&&md.SCHEDULE_LINK_SOURCES.indexOf(row.source_type)!==-1))){
        div.dataset.myday=row.type==='bookend'?row.which:row.source_type;
        const go=document.createElement('button');go.type='button';go.className='sched-myday-link';go.textContent='\u2600\uFE0F My Day';
        go.style.cssText='background:none;border:1px solid rgba(201,168,76,0.4);color:#C9A84C;border-radius:4px;padding:3px 9px;font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;white-space:nowrap;';
        go.onclick=function(e){e.stopPropagation();md.ui.openFromSchedule(row,dateStr);};
        // Same button row as Start/Done when there is one, else its own row.
        let bar=div.querySelector('button[onclick*="startScheduledTask("]');bar=bar?bar.parentElement:null;
        if(!bar){bar=document.createElement('div');bar.style.cssText='display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;grid-column:1/-1;';div.appendChild(bar);}
        go.style.marginTop='0';bar.style.flexWrap='wrap';bar.appendChild(go);
      }
      if(firstEventRow===null) firstEventRow=div;
    }
    el.appendChild(div);
  });

  if(isPast){
    const log=JSON.parse(localStorage.getItem('rpgace_daily_log')||'{}');
    const entries=log[dateStr]||[];
    if(entries.length){
      const logC=document.createElement('div');logC.className='dsh-log';logC.style.cssText='margin:16px 0 0;background:rgba(61,170,110,0.07);border:1px solid rgba(61,170,110,0.2);border-radius:8px;overflow:hidden;';
      const logH=document.createElement('div');logH.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:10px 14px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;color:#3DAA6E;letter-spacing:1px;text-transform:uppercase;';
      logH.innerHTML='\u2705 '+entries.length+' actions logged <span style="font-size:10px">\u25BC</span>';
      const logB=document.createElement('div');logB.style.cssText='display:none;padding:0 14px 12px;';
      entries.forEach(function(e){
        const row=document.createElement('div');row.style.cssText='padding:6px 0;border-bottom:1px solid rgba(61,170,110,0.1);font-size:11px;font-family:Rajdhani,sans-serif;cursor:pointer;';
        row.innerHTML='<div style="display:flex;gap:8px"><span style="color:var(--muted);font-size:10px">'+e.time+'</span><span style="color:#3DAA6E;font-weight:600">'+e.title+'</span></div>'+(e.summary?'<div style="color:rgba(226,226,236,0.5);font-size:10px;margin-top:2px;display:none" class="log-sum">'+e.summary+'</div>':'');
        row.onclick=function(){const s=this.querySelector('.log-sum');if(s)s.style.display=s.style.display==='none'?'block':'none';};
        logB.appendChild(row);
      });
      logH.onclick=function(){logB.style.display=logB.style.display==='none'?'block':'none';};
      logC.appendChild(logH);logC.appendChild(logB);
      el.parentNode.insertBefore(logC,el);
    }
  }

  // MD-8: ✅ What you did (today and past days), under the list.
  try{const md=window.RPGACE&&RPGACE.modules.myDay;if(md)md.ui.didSection(el,dateStr);}catch(e){}
  if(firstEventRow) setTimeout(function(){firstEventRow.scrollIntoView({behavior:'smooth',block:'center'});},100);
}

function initDailyNav(){
  const sect=document.getElementById('sched-daily');if(!sect||document.getElementById('daily-nav'))return;
  const nav=document.createElement('div');nav.id='daily-nav';nav.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:10px 0 14px;';
  const btnS='background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#E2E2EC;padding:6px 16px;border-radius:6px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:13px;font-weight:600;';
  nav.innerHTML='<button onclick="shiftDay(-1)" style="'+btnS+'">\u25C4 Prev</button><div id="daily-date-label" style="font-family:Cinzel,serif;font-size:13px;color:#C9A84C;text-align:center;flex:1;padding:0 12px"></div><button onclick="shiftDay(1)" style="'+btnS+'">Next \u25BA</button>';
  sect.insertBefore(nav,sect.firstChild);
  renderDailyGrid();
}
function shiftDay(delta){window._dailyDate=window._dailyDate||new Date();window._dailyDate=new Date(window._dailyDate);window._dailyDate.setDate(window._dailyDate.getDate()+delta);renderDailyGrid();}


function initSchedModal(){
  if(document.getElementById('sched-modal'))return;
  const hours=Array.from({length:24},function(_,i){const h=i;const label=h===0?'12:00 AM':h<12?h+':00 AM':h===12?'12:00 PM':(h-12)+':00 PM';return '<option value="'+h+'">'+label+'</option>';}).join('');
  const minutes=[0,5,10,15,20,25,30,35,40,45,50,55].map(function(m){return '<option value="'+m+'">:'+String(m).padStart(2,'0')+'</option>';}).join('');
  const modal=document.createElement('div');modal.id='sched-modal';modal.style.cssText='display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;align-items:center;justify-content:center;';
  const pills=[15,30,45,60,90,120].map(function(m){return '<button onclick="selectDuration('+m+')" data-dur="'+m+'" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.6);padding:6px 12px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700">'+(m<60?m+'m':m===60?'1h':m===90?'1.5h':'2h')+'</button>';}).join('');
  modal.innerHTML='<div style="background:#0f0f18;border:1px solid rgba(201,168,76,0.3);border-radius:12px;padding:28px;width:min(420px,90vw);max-height:90vh;overflow-y:auto">'
    +'<div style="font-family:Cinzel,serif;font-size:14px;color:#C9A84C;margin-bottom:6px">Schedule Task</div>'
    +'<div id="sched-modal-title" style="font-family:Rajdhani,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;color:rgba(226,226,236,0.4);margin-bottom:16px;text-transform:uppercase;"></div>'
    +'<div style="display:grid;gap:14px">'+'<div id="sched-tpl-box"></div>'
    +'<div><div style="font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.4);text-transform:uppercase;margin-bottom:6px">Title</div><input type="text" id="sched-title-input" placeholder="What are you doing?" style="width:100%;background:#141420;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;padding:8px 12px;font-family:Rajdhani,sans-serif;font-size:13px;outline:none;box-sizing:border-box;"/></div>'
    +'<div><div style="font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.4);text-transform:uppercase;margin-bottom:6px">Description (optional)</div><textarea id="sched-desc-input" rows="2" placeholder="Any notes..." style="width:100%;background:#141420;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;padding:8px 12px;font-family:Rajdhani,sans-serif;font-size:13px;outline:none;resize:vertical;box-sizing:border-box;"></textarea></div>'
    +'<div id="sched-extra-box"></div>'
    +'<div><div style="font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.4);text-transform:uppercase;margin-bottom:6px">Date</div><input type="date" id="sched-date" style="width:100%;background:#141420;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;padding:8px 12px;font-family:Rajdhani,sans-serif;font-size:13px;outline:none"/></div>'
    +'<div><div style="font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.4);text-transform:uppercase;margin-bottom:6px">Start Time</div><div style="display:flex;gap:8px"><select id="sched-hour" style="flex:1;background:#141420;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;padding:8px 12px;font-family:Rajdhani,sans-serif;font-size:13px;outline:none">'+hours+'</select><select id="sched-minute" style="width:80px;background:#141420;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;padding:8px 12px;font-family:Rajdhani,sans-serif;font-size:13px;outline:none">'+minutes+'</select></div></div>'
    +'<div><div style="font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.4);text-transform:uppercase;margin-bottom:8px">Estimated Duration</div><div id="duration-pills" style="display:flex;gap:6px;flex-wrap:wrap">'+pills+'</div><input type="hidden" id="sched-duration" value="60"/></div>'
    +'<div style="display:flex;gap:8px;margin-top:4px"><button onclick="confirmScheduleModal()" style="flex:1;background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.4);color:#C9A84C;padding:10px;border-radius:8px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:13px;font-weight:700;letter-spacing:1px">SCHEDULE</button><button onclick="closeSchedModal()" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:rgba(226,226,236,0.5);padding:10px 16px;border-radius:8px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px">Cancel</button></div>'
    +'</div></div>';
  document.body.appendChild(modal);
  modal.onclick=function(e){if(e.target===modal)closeSchedModal();};
  modal.querySelector('#sched-date').value=(typeof _calDateStr==='function'?_calDateStr(new Date()):new Date().toISOString().split('T')[0]);
  selectDuration(60);
}

function openSchedModal(agenda){
  initSchedModal();
  {const w=document.getElementById('sched-clash');if(w)w.remove();window._schedClashOk=false;}
  window._pendingSchedAgenda=agenda;
  const titleEl=document.getElementById('sched-modal-title');
  if(titleEl)titleEl.textContent=agenda.title?'Editing: '+agenda.title:'New Task';
  const titleInput=document.getElementById('sched-title-input');
  if(titleInput)titleInput.value=agenda.title||'';
  const descInput=document.getElementById('sched-desc-input');
  if(descInput)descInput.value=agenda.description||'';
  const dateEl=document.getElementById('sched-date');
  if(dateEl)dateEl.value=(typeof _calDateStr==='function'?_calDateStr(window._dailyDate||new Date()):new Date().toISOString().split('T')[0]);
  document.getElementById('sched-modal').style.display='flex';
  // Oct 12 2026 MD2-4: template picker + category + place/journey (myDay).
  try{ if(RPGACE.modules.myDay) RPGACE.modules.myDay.ui.schedExtras(agenda); }catch(e){ console.warn('[sched] template box', e.message); }
  setTimeout(function(){if(titleInput)titleInput.focus();},50);
}

function closeSchedModal(){
  const m=document.getElementById('sched-modal');if(m)m.style.display='none';
  window._pendingSchedAgenda=null;
}

function selectDuration(mins){
  const inp=document.getElementById('sched-duration');if(inp)inp.value=mins;
  document.querySelectorAll('#duration-pills button').forEach(function(b){
    const active=parseInt(b.dataset.dur)===mins;
    b.style.background=active?'rgba(201,168,76,0.15)':'rgba(255,255,255,0.05)';
    b.style.borderColor=active?'rgba(201,168,76,0.4)':'rgba(255,255,255,0.1)';
    b.style.color=active?'#C9A84C':'rgba(226,226,236,0.6)';
  });
}

function confirmScheduleModal(){
  const agenda=window._pendingSchedAgenda;if(!agenda)return;
  const date=document.getElementById('sched-date').value;
  const hour=parseInt(document.getElementById('sched-hour').value)||10;
  const minuteEl=document.getElementById('sched-minute');
  const minute=minuteEl?parseInt(minuteEl.value)||0:0;
  const estMins=parseInt(document.getElementById('sched-duration').value)||60;
  const titleInput=document.getElementById('sched-title-input');
  const descInput=document.getElementById('sched-desc-input');
  const typedTitle=titleInput?titleInput.value.trim():'';
  const typedDesc=descInput?descInput.value.trim():'';
  if(!date){alert('Please choose a date.');return;}
  if(!typedTitle){alert('Please enter a title.');return;}
  // MD2-4: category, place and travel from the form (myDay.ui.schedExtras).
  var ex={};try{ if(RPGACE.modules.myDay) ex=RPGACE.modules.myDay.ui.schedExtrasValues()||{}; }catch(e){ ex={}; }
  if(ex.error){alert(ex.error);return;}
  // Oct 20 2026: warn before saving on top of a shift (myDay.logic.clashWith).
  if(!window._schedClashOk){try{const md=RPGACE.modules.myDay;const c=md&&md.logic.clashWith(date,hour*60+minute,estMins);
    if(c&&md.ui.schedClashWarn(c,md.logic.freeFor(date,hour*60+minute,estMins),function(at){document.getElementById('sched-hour').value=Math.floor(at/60);if(minuteEl)minuteEl.value=at%60;confirmScheduleModal();},function(){window._schedClashOk=true;confirmScheduleModal();}))return;}catch(e){console.warn('[schedule] clash check',e);}}
  window._schedClashOk=false;
  const entry=scheduleToCalendar({title:typedTitle,description:typedDesc||agenda.description,category:ex.category||agenda.category,xp:agenda.xp,duration_mins:estMins,hour,minute,date,source_type:'agenda',template_id:ex.template_id,place:ex.place,journey_mins:ex.journey_mins,ready_mins:ex.ready_mins});
  closeSchedModal();
  window._dailyDate=new Date(date+'T00:00:00');
  if(typeof showSched==='function')showSched('daily',document.querySelector('.sched-tab'));
  if(typeof showPage==='function')showPage('schedule',document.querySelector('[onclick*="schedule"]'));
  const toast=document.createElement('div');
  toast.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0f0f18;border:1px solid rgba(201,168,76,0.4);color:#C9A84C;font-family:Rajdhani,sans-serif;font-size:13px;font-weight:700;padding:10px 20px;border-radius:8px;z-index:9999;white-space:nowrap;';
  toast.textContent='Scheduled: '+entry.title+' on '+date+' at '+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0')+' ('+estMins+'min est)';
  document.body.appendChild(toast);setTimeout(function(){toast.remove();},3500);
  if(typeof renderDailyGrid==='function')setTimeout(renderDailyGrid,200);
}

function startScheduledTask(id){
  const stored=JSON.parse(localStorage.getItem('rpgace_sched_agendas')||'[]');
  const idx=stored.findIndex(function(a){return a.id===id;});
  if(idx<0)return;
  const now=new Date().toISOString();
  stored[idx].started_at=now;
  localStorage.setItem('rpgace_sched_agendas',JSON.stringify(stored));
  // H20 (Sep 17 2026, real Alex bug report: "pressing start planned cook
  // on schedule did nothing") — real root cause: this only ever touched
  // the LOCAL cache, with zero visible feedback and zero re-render, so a
  // real click was indistinguishable from a genuinely broken button.
  // Fixed with a real toast, a real re-render (so the grid actually
  // reflects the click), and a real write-through to the same
  // rpgace_agendas row scheduleToCalendar itself created (cross-device
  // parity, same established pattern, rule 8).
  if(RPGACE.sb&&RPGACE.sb.secureWrite){
    RPGACE.sb.secureWrite('rpgace_agendas','update',{started_at:now},'id=eq.'+id)
      .catch(function(e){console.warn('[startScheduledTask] Supabase write failed:',e.message);});
  }
  if(RPGACE.utils&&RPGACE.utils.toast)RPGACE.utils.toast('▶️ Started: '+(stored[idx].title||'task'),'#4A90E2',2200);
  if(typeof renderDailyGrid==='function')renderDailyGrid();
  // H24 (Sep 17 2026, 10th pass, real Alex ask: "i clicked start on cook
  // in schedule, nothing happened, can it take me to oracle...") — a
  // planned-cook entry gets the real live-cooking experience on top of
  // the existing toast/re-render/write-through above (rule 8, additive,
  // never replacing the generic agenda-start behaviour every other
  // scheduled task still relies on).
  if(stored[idx].source_type==='planned_cook'&&stored[idx].source_id&&RPGACE.modules&&RPGACE.modules.cookingOracle){
    RPGACE.modules.cookingOracle.ui._openLiveCookMode(stored[idx].source_id);
  }
}

function completeScheduledTask(id){
  const stored=JSON.parse(localStorage.getItem('rpgace_sched_agendas')||'[]');
  const idx=stored.findIndex(function(a){return a.id===id;});
  if(idx<0)return null;
  const entry=stored[idx],endedAt=new Date();
  entry.ended_at=endedAt.toISOString();entry.completed=true;
  if(entry.started_at){const startedAt=new Date(entry.started_at);entry.actual_mins=Math.round((endedAt-startedAt)/60000);}
  // H20 (Sep 17 2026) — same real write-through fix as startScheduledTask
  // above (rule 8), so "Done" reaches the real cross-device record too,
  // not just the local cache.
  if(RPGACE.sb&&RPGACE.sb.secureWrite){
    RPGACE.sb.secureWrite('rpgace_agendas','update',{ended_at:entry.ended_at,completed:true,actual_mins:entry.actual_mins||null},'id=eq.'+id)
      .catch(function(e){console.warn('[completeScheduledTask] Supabase write failed:',e.message);});
  }
  stored[idx]=entry;localStorage.setItem('rpgace_sched_agendas',JSON.stringify(stored));
  const diff=entry.actual_mins&&entry.estimated_mins?entry.actual_mins-entry.estimated_mins:null;
  const summary=entry.actual_mins?'Estimated: '+entry.estimated_mins+'min Actual: '+entry.actual_mins+'min'+(diff!==null?' ('+(diff>0?'+':'')+diff+'min vs estimate)':''):' Completed';
  if(typeof logDailyAction==='function')logDailyAction(entry.date,entry.title,summary);
  if(typeof saveToJournal==='function')saveToJournal(entry.title+' Completed',entry.title+'\n'+summary,'schedule');
  // Oct 5 2026: completing a planned-cook entry from the Daily Schedule
  // never told planned_cooks the cook was done (only cookingOracle's own
  // _finishCook did), so the row stayed 'scheduled' and could later be
  // picked up and edited as if it were still open. Mark it cooked here
  // too. (_finishCook calls this function, so no call back the other way.)
  if(entry.source_type==='planned_cook'&&entry.source_id&&RPGACE.sb&&RPGACE.sb.secureWrite){
    RPGACE.sb.secureWrite('planned_cooks','update',{status:'cooked'},'id=eq.'+entry.source_id+'&status=neq.cooked')
      .then(function(){var co=RPGACE.modules&&RPGACE.modules.cookingOracle;if(co&&co.ui&&co.ui._offerStockUpdate)co.ui._offerStockUpdate(entry.source_id,null);})
      .catch(function(e){console.warn('[completeScheduledTask] planned_cooks cooked write failed:',e.message);});
  }
  // H20 (Sep 17 2026) — same real "give visible feedback, don't just
  // silently update a cache" fix as startScheduledTask above (rule 8);
  // "Done" had the identical gap, just not the one Alex happened to
  // click first.
  if(RPGACE.utils&&RPGACE.utils.toast)RPGACE.utils.toast('✅ Completed: '+(entry.title||'task'),'#3DAA6E',2200);
  if(typeof renderDailyGrid==='function')renderDailyGrid();
  return entry;
}

function scheduleAgenda(agenda){openSchedModal(agenda);}

function _addSchedButtons(){} // stub - superseded by inline Start/Done buttons in renderDailyGrid's rewrite, kept as empty stub since multiple places still call it

function patchAgendaCardsWithSchedule(){}


function scheduleAgendaByIdx(idx){
  var a=(window.STATE&&STATE.agendas&&STATE.agendas[idx])||{};
  if(!a.title){
    var cards=document.querySelectorAll('.agenda-card,.agenda-item,[class*="agenda-"]');
    var card=cards[idx];
    var titleEl=card&&card.querySelector('[class*="title"],[class*="name"],h3,h4,strong,.agenda-title');
    a.title=titleEl?titleEl.textContent.trim():'Task '+(idx+1);
    a.duration_mins=a.duration_mins||60;a.xp=a.xp||50;a.category=a.category||'personal';
  }
  openSchedModal(a);
}

function initApp(){
  buildAllQuests();buildTimeSlots();buildWeekSlots();buildMonthSlots();buildSkillTree();buildAgentActions();initLearning();
  // Oct 10 2026 (N2, Oracle slice): shorter, and only things that work today.
  addMsg(`What are we working on?\n\nAsk about your own data ("what's in my fridge?", "what did I save about mixing?"), get a recipe, or open a tool from 🧰 — Platform Oracle for captions and producer business tools, Prod. Oracle for lessons.`,'ai');
  setTimeout(()=>{
    // Guarded - #popup-msg no longer exists in current DOM (stale first-time
    // onboarding element, was throwing on every page load per user report).
    var pm=document.getElementById('popup-msg'); if(pm) pm.textContent='Welcome to RPGACE. Ready to earn your first XP?';
    var pt=document.getElementById('popup-tasks'); if(pt) pt.innerHTML='<div class="popup-task"><span>⚔ Post your first TikTok video</span><span class="popup-task-xp">+80 XP</span></div>';
    var sp=document.getElementById('suggestion-popup'); if(sp) sp.classList.add('show');
  },3000);
  // Start Content Intelligence auto-sync (polls Supabase + local server every 30s)
  setTimeout(startIntelPolling, 2000);
  // Load encyclopedia from Supabase
  setTimeout(refreshEncyclopediaDisplay, 1000);
  // Enable manual text-selection insight tagging
  setTimeout(setupManualInsightSelection, 500);
  // Oct 27 2026: the June "seed saved Oracle conversation if journal is empty" block
  // was removed - it re-inserted the INSTA-ORACLE Command 1 session into the
  // journal on every fresh device/cleared cache. The one real copy (Aug 24) stays.
  initAgendas();
}
// Aug 6 (real /scope+GODMODE dedup sweep, Alex-authorized main.js
// exception - freeze lifted indefinitely same session) - the old
// 4-agent 'Content Pipeline' (Scout/Analyst/Noter/Executor chain:
// runPipeline/savePipelineToDB/addToEncyclopedia/copyPipelineOutput/
// resetPipeline/pipelineToNotion/pipelineToGitHub/pipelineToGmail/
// setAgentPipeStatus + the PIPELINE/TYPE_META/TYPE_PROMPTS state)
// removed outright, not just renamed. Confirmed genuinely dead, not
// just unused: every DOM id it touched (pipeline-output, pipeline-
// text-input, pipeline-run-btn, chain-1..4, agent-pipe-status, the
// .type-chip buttons) had zero matches anywhere in index.html - this
// whole subsystem's HTML host was removed at some earlier point,
// orphaning all of this JS with no way to ever reach it again.
// api/noter.js was called ONLY from this dead code (confirmed via
// grep, zero other callers) and was deleted alongside it, freeing a
// real slot against Vercel Hobby's 12-Serverless-Function cap this
// project already sits at (see the standing CLAUDE.md landmine).
// api/scout.js and api/analyst.js stay - both are genuinely reused
// live by rpgace_core.js's own ingestion path (grep-confirmed, see
// the comment at rpgace_core.js ~line 4732), api/executor.js stays
// too (4 other live callers beyond the 3 deleted pipelineToX
// functions). Full record: engineer_pass_2026-08-06_13.txt.

// ── ENCYCLOPEDIA — SUPABASE SYNCED ──
// Aug 27 2026 (/Routine item #1) — real, separately-found bug fixed in
// passing: `source` was hardcoded to 'oracle' for EVERY caller, including
// intel/video-sourced saves — meaning renderEncEntries()'s own
// e.source==='intel'?'🧠':... icon logic could never actually fire. Now a
// real optional 3rd param, sourceUrl: when present, this is a genuine
// intel-sourced entry (source becomes 'intel', source_url is persisted —
// a real, additive encyclopedia.source_url column) so a later delete can
// log the real url into the reanalysis pool; entries with no sourceUrl
// (plain Oracle-chat saves) are unaffected, byte-identical to before.
async function saveOracleToEncyclopedia(title, content, sourceUrl){
  try {
    const date = new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
    const html = `<div class="enc-entry" style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--border)">
      <h2 style="font-family:'Cinzel',serif;font-size:14px;color:var(--gold);margin-bottom:4px">${title}</h2>
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px">📅 ${date}</div>
      <div style="font-size:13px;line-height:1.8">${renderMarkdown(content)}</div>
    </div>`;

    const entry = { title, date, content, html, source: sourceUrl ? 'intel' : 'oracle', source_url: sourceUrl || null, created_at: new Date().toISOString() };

    // Extract VSTs before saving
    entry.vst_tags = extractVSTsFromText(content);

    // Save to Supabase - upsert on title, matches the UNIQUE(title) constraint.
    // Was a raw insert before, causing repeated 409 Conflict spam in console
    // every time an already-saved title was submitted again.
    // July 24 FROZEN-file exception: migrated to RPGACE.sb.secureWrite
    // (the authenticated write-proxy) - api/data-write.js was extended
    // with an optional onConflict param specifically for this call site,
    // since a mechanical migration without it would have turned every
    // re-save into a 409 that secureWrite throws on, silently breaking
    // the VST-tag write below (the exact 409-spam bug this upsert was
    // already written to fix).
    try {
      const saved = await RPGACE.sb.secureWrite('encyclopedia', 'insert', entry, undefined, 'title');
      const savedEntry = Array.isArray(saved) ? saved[0] : saved;
      if(savedEntry?.id) await saveEncWithVSTs(savedEntry);
    } catch(e){ console.log('Supabase enc save failed:', e.message); }

    // Also cache locally
    const existing = JSON.parse(localStorage.getItem('rpgace_encyclopedia') || '[]');
    existing.unshift(entry);
    if(existing.length > 50) existing.splice(50);
    localStorage.setItem('rpgace_encyclopedia', JSON.stringify(existing));

    refreshEncyclopediaDisplay();
  } catch(e){ console.error('Encyclopedia save error:', e.message); }
}


// ═══════════════════════════════════════════════
// ENCYCLOPEDIA INSIGHT SYSTEM v1
// Auto | Semi-auto | Manual extraction
// ═══════════════════════════════════════════════
let ENC_INSIGHTS = [];
let ENC_INSIGHT_CACHE = {};
const ENC_INSIGHT_TABLE = 'encyclopedia_insights';

// July 24 FROZEN-file exception: migrated to RPGACE.sb.secureWrite -
// same try/catch-to-null contract preserved, since secureWrite throws on
// a non-ok response (unlike the raw fetch, which returned the parsed
// error body) - callers here already only check the resolved value.
async function sbInsightPost(data){
  try {
    return await RPGACE.sb.secureWrite(ENC_INSIGHT_TABLE, 'insert', data);
  } catch(e){ return null; }
}

async function sbInsightFetch(macroCategory){
  try {
    const filter = macroCategory && macroCategory!=='all' ? `macro_category=eq.${macroCategory}&` : '';
    const res = await _sbGet(`/rest/v1/${ENC_INSIGHT_TABLE}?${filter}order=created_at.desc&limit=500`);
    return res.ok ? await res.json() : [];
  } catch(e){ return []; }
}

async function sbInsightDelete(id){
  try {
    await RPGACE.sb.secureWrite(ENC_INSIGHT_TABLE, 'delete', null, 'id=eq.' + id);
  } catch(e){}
}

function parseInsightJSON(raw){
  if(!raw) return [];
  const cleaned = raw.replace(/```json|```/g,'').trim();
  try{ const r=JSON.parse(cleaned); if(Array.isArray(r)) return r.filter(i=>i&&i.insight); }catch(e){}
  try{ const m=cleaned.match(/\[[\s\S]*\]/); if(m){ const r=JSON.parse(m[0]); if(Array.isArray(r)) return r.filter(i=>i&&i.insight); } }catch(e){}
  try{
    const objs=[]; const re=/\{[^{}]*"insight"\s*:[^{}]*\}/g; let match;
    while((match=re.exec(cleaned))!==null){ try{ const o=JSON.parse(match[0]); if(o.insight) objs.push(o); }catch(e){} }
    if(objs.length) return objs;
  }catch(e){}
  try{
    const lines=cleaned.split('\n'); const objs=[];
    for(const line of lines){ try{ const o=JSON.parse(line.trim().replace(/,$/,'')); if(o&&o.insight) objs.push(o); }catch(e){} }
    if(objs.length) return objs;
  }catch(e){}
  return [];
}

// ── METHOD 1: AUTO ──
async function extractInsightsAuto(entry, silent=true){
  const eid = String(entry.id||entry.created_at||entry.title||'');
  if(ENC_INSIGHT_CACHE[eid]) return ENC_INSIGHT_CACHE[eid];
  const prompt = `Extract 5-10 specific standalone insights from this music producer encyclopedia entry.
Each insight = one concrete fact, technique or observation under 25 words.
Good examples: "EQ cut at 300hz in melody bus removes muddiness from stacked pads" | "J Cole's beats use 3-note descending melodies over sparse 808 patterns"

Entry: ${entry.title}
Content: ${(entry.content||'').slice(0,3500)}

Return ONLY a JSON array of insight objects, no explanation:\n[{"insight":"one concrete fact or technique under 25 words","category":"technique|theory|mindset|gear|workflow|inspiration|business","micro_category":"specific sub-topic"}]`;
  try {
    const data = await callOracle([{role:'user',content:prompt}],'',600);
    const raw = data.content.map(c=>c.text||'').join('').replace(/```json|```/g,'').trim();
    // Use robust 4-strategy parser to handle special chars in insight text
    const parsed = parseInsightJSON(raw.replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"'));
    const saved = [];
    for(const ins of parsed){
      const row = {source_entry_id:eid, source_entry_title:entry.title||'', insight_text:ins.insight,
        micro_categories:ins.micro_categories||[], macro_category:ins.macro_category||detectCategory(entry.content,entry.title), status:'auto'};
      const r = await sbInsightPost(row);
      if(r) saved.push(Array.isArray(r)?r[0]:r);
    }
    ENC_INSIGHT_CACHE[eid] = saved;
    if(!silent) alert(`✓ Auto-extracted ${saved.length} insights`);
    return saved;
  } catch(e){ return []; }
}

// ── METHOD 2: SEMI-AUTO ──
async function extractInsightsSemiAuto(entry, safeId){
  const eid = String(entry.id||entry.created_at||entry.title||'');
  const statusEl = document.getElementById('enc-insight-status-'+safeId);
  if(statusEl) statusEl.innerHTML='<span style="color:var(--muted)">⚡ AI extracting...</span>';
  const prompt = `Extract 7 specific insights from this entry.
Entry: ${entry.title}
Content: ${(entry.content||'').slice(0,3500)}
Return JSON only:
[{"insight":"under 25 words","micro_categories":["Tag1","Tag2"],"macro_category":"beat|mixing|vst|genre|artist|strategy|content|notes"}]`;
  try {
    const data = await callOracle([{role:'user',content:prompt}],'',500);
    const raw = data.content.map(c=>c.text||'').join('').replace(/```json|```/g,'').trim();
    const suggestions = parseInsightJSON(raw.replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"'))
    console.log('SEMI suggestions:', suggestions.length, suggestions[0]);
    const panel = document.getElementById('enc-approval-'+safeId);
    if(!panel){ console.log('PANEL NOT FOUND:', 'enc-approval-'+safeId); return; }
    panel.style.display='block';
    panel.innerHTML = `<div style="font-size:11px;color:var(--gold);font-family:'Cinzel',serif;letter-spacing:1px;margin-bottom:10px">📋 APPROVE INSIGHTS</div>`
      + suggestions.map((s,i)=>`<div style="background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:10px;margin-bottom:6px;display:flex;gap:8px;align-items:flex-start">
          <input type="checkbox" id="ic-${safeId}-${i}" checked style="margin-top:3px;accent-color:var(--gold)"/>
          <div style="flex:1"><textarea id="it-${safeId}-${i}" style="width:100%;background:transparent;border:none;color:var(--text);font-size:12px;font-family:'Rajdhani',sans-serif;resize:none;outline:none" rows="2">${s.insight}</textarea>
          <div style="font-size:10px;color:var(--blue)">${(s.micro_categories||[]).join(' · ')}</div></div></div>`).join('')
      + `<div style="display:flex;gap:8px;margin-top:8px">
          <button onclick="approveInsights('${safeId}',${JSON.stringify(suggestions).replace(/'/g,'&#39;')},'${eid.replace(/'/g,"\\'")}','${(entry.title||'').replace(/'/g,"\\'")}','${entry.macro||detectCategory(entry.content,entry.title)}')"
            style="background:var(--green);border:none;color:#000;border-radius:6px;padding:6px 14px;font-size:12px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700">✓ Save Selected</button>
          <button onclick="document.getElementById('enc-approval-${safeId}').style.display='none'"
            style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:6px 14px;font-size:12px;cursor:pointer;font-family:'Rajdhani',sans-serif">Cancel</button>
         </div>`;
    if(statusEl) statusEl.innerHTML='';
  } catch(e){
    if(statusEl) statusEl.innerHTML=`<span style="color:var(--red)">✗ ${e.message}</span>`;
  }
}

async function approveInsightsFromCache(safeId){
  const ctx = window._encSuggestions?.[safeId];
  if(!ctx){ alert('Session expired — re-extract insights.'); return; }
  await approveInsights(safeId, ctx.suggestions, ctx.eid, ctx.etitle, ctx.emacro);
}

async function approveInsights(safeId, suggestions, eid, etitle, emacro){
  let saved=0;
  for(let i=0;i<suggestions.length;i++){
    if(!document.getElementById(`ic-${safeId}-${i}`)?.checked) continue;
    const text = document.getElementById(`it-${safeId}-${i}`)?.value?.trim();
    if(!text) continue;
    await sbInsightPost({source_entry_id:eid, source_entry_title:etitle, insight_text:text,
      micro_categories:suggestions[i].micro_categories||[], macro_category:suggestions[i].macro_category||emacro, status:'approved'});
    saved++;
  }
  document.getElementById('enc-approval-'+safeId).style.display='none';
  const s=document.getElementById('enc-insight-status-'+safeId);
  if(s){s.innerHTML=`<span style="color:var(--green)">✓ ${saved} insights saved</span>`;setTimeout(()=>s.innerHTML='',3000);}
}

// ── METHOD 3: MANUAL TEXT SELECTION ──
let _manualCtx=null;
function setupManualInsightSelection(){
  document.addEventListener('mouseup',()=>{
    const sel=window.getSelection();
    if(!sel||sel.isCollapsed||sel.toString().trim().length<10){removeInsightTooltip();return;}
    const node=sel.anchorNode?.parentElement;
    const entryDiv=node?.closest('[data-entry-id]');
    if(!entryDiv){removeInsightTooltip();return;}
    const text=sel.toString().trim().slice(0,200);
    const rect=sel.getRangeAt(0).getBoundingClientRect();
    _manualCtx={entryId:entryDiv.dataset.entryId,entryTitle:entryDiv.dataset.entryTitle,text};
    showInsightTooltip(rect.left+window.scrollX,rect.top+window.scrollY-44);
  });
}
function showInsightTooltip(x,y){
  removeInsightTooltip();
  const tip=document.createElement('div');
  tip.id='ins-tooltip';
  tip.style.cssText=`position:fixed;left:${Math.min(x,window.innerWidth-190)}px;top:${y}px;z-index:9999;background:var(--gold);color:#000;border-radius:6px;padding:5px 12px;font-size:12px;font-family:'Rajdhani',sans-serif;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4)`;
  tip.innerHTML='📌 Tag as Insight';
  tip.onclick=saveManualInsight;
  document.body.appendChild(tip);
}
function removeInsightTooltip(){document.getElementById('ins-tooltip')?.remove();}
async function saveManualInsight(){
  removeInsightTooltip();
  if(!_manualCtx) return;
  const{entryId,entryTitle,text}=_manualCtx;
  let micro=[],macro=detectCategory(text,'');
  try{
    const data=await callOracle([{role:'user',content:`2-3 micro-category tags and macro-category for this music producer insight:\n"${text}"\nJSON only: {"micro_categories":["Tag1","Tag2"],"macro_category":"beat|mixing|vst|genre|artist|strategy|content|notes"}`}],'',120);
    const raw=data.content.map(c=>c.text||'').join('').replace(/```json|```/g,'').trim();
    const p=JSON.parse(raw);micro=p.micro_categories||[];macro=p.macro_category||macro;
  }catch(e){}
  await sbInsightPost({source_entry_id:String(entryId),source_entry_title:entryTitle,insight_text:text,micro_categories:micro,macro_category:macro,status:'manual'});
  const toast=document.createElement('div');
  toast.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--green);color:#000;border-radius:8px;padding:8px 20px;font-size:13px;font-family:"Rajdhani",sans-serif;font-weight:700;z-index:9999';
  toast.textContent='✓ Insight tagged & saved!';
  document.body.appendChild(toast);
  setTimeout(()=>toast.remove(),2500);
  _manualCtx=null;
}

// ── INSIGHT CATEGORY VIEW ──
async function loadInsightsByCategory(macroCategory){
  const el=document.getElementById('enc-output');
  if(!el) return;
  el.innerHTML='<div style="color:var(--muted);font-size:12px;padding:12px">Loading insights...</div>';
  const insights=await sbInsightFetch(macroCategory);
  ENC_INSIGHTS=insights;
  if(!insights.length){
    el.innerHTML=`<div style="text-align:center;padding:40px 20px">
      <div style="font-size:36px;margin-bottom:12px">💡</div>
      <div style="font-size:14px;color:var(--text);margin-bottom:8px">No insights yet in this category</div>
      <div style="font-size:12px;color:var(--muted);line-height:2">
        Switch to <strong style="color:var(--gold)">All</strong> and expand any entry to extract insights,<br>
        or select text in an expanded entry and click <strong style="color:var(--gold)">📌 Tag as Insight</strong>.<br><br>
        <button onclick="autoExtractAllInCategory('${macroCategory}')" style="background:var(--gold);border:none;color:#000;border-radius:6px;padding:6px 16px;font-size:12px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700">⚡ Auto-extract from all ${macroCategory} entries</button>
      </div></div>`;
    return;
  }
  // Group by micro-category
  const groups={};
  insights.forEach(ins=>{
    const cats=ins.micro_categories?.length?ins.micro_categories:['General'];
    cats.forEach(cat=>{if(!groups[cat])groups[cat]=[];groups[cat].push(ins);});
  });
  const sortedGroups=Object.entries(groups).sort((a,b)=>b[1].length-a[1].length);
  const badge={auto:'🤖',approved:'✅',manual:'📌'};
  el.innerHTML=`<div style="margin-bottom:14px;font-size:12px;color:var(--muted)">
    ${insights.length} insights · ${sortedGroups.length} micro-categories
    <button onclick="autoExtractAllInCategory('${macroCategory}')" style="margin-left:12px;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);color:var(--gold);border-radius:4px;padding:2px 10px;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif">⚡ Auto-extract more</button>
    ${macroCategory==='content'?`<button onclick="generateContentIdeasFromInsights()" style="margin-left:6px;background:rgba(193,53,132,.1);border:1px solid rgba(193,53,132,.3);color:#E1306C;border-radius:4px;padding:2px 10px;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif">📸 Send all to INSTA-ORACLE Cmd 3</button>`:''}
  </div>`
  +sortedGroups.map(([grp,grpIns])=>`
    <div style="margin-bottom:14px">
      <div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'"
        style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 12px;background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.15);border-radius:8px;margin-bottom:6px;user-select:none">
        <span style="font-family:'Cinzel',serif;font-size:12px;color:var(--gold);font-weight:600">${grp}</span>
        <span style="font-size:11px;color:var(--muted);margin-left:auto">${grpIns.length} insight${grpIns.length!==1?'s':''} ▾</span>
      </div>
      <div>
        ${grpIns.map(ins=>`
          <div style="background:var(--panel2);border:1px solid var(--border);border-radius:7px;padding:10px 12px;margin-bottom:6px;display:flex;gap:8px;align-items:flex-start">
            <span style="font-size:10px;color:var(--muted);margin-top:2px;flex-shrink:0" title="Source: ${ins.status}">${badge[ins.status]||'•'}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;color:var(--text);line-height:1.5;margin-bottom:5px">${ins.insight_text}</div>
              <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">
                ${(ins.micro_categories||[]).map(t=>`<span style="background:rgba(74,144,226,.1);border:1px solid rgba(74,144,226,.2);color:var(--blue);border-radius:10px;padding:1px 7px;font-size:10px">${t}</span>`).join('')}
                <span style="font-size:10px;color:var(--muted);margin-left:4px;cursor:pointer;text-decoration:underline" onclick="jumpToSourceEntry('${ins.source_entry_id}')">↗ ${(ins.source_entry_title||'').slice(0,35)}</span>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
              <button onclick="sendInsightToCmd3('${ins.insight_text.replace(/'/g,"\\'").replace(/"/g,'\\"')}')"
                title="Send to INSTA-ORACLE Command 3"
                style="background:rgba(225,48,108,.1);border:1px solid rgba(225,48,108,.2);color:#E1306C;border-radius:4px;padding:2px 7px;font-size:10px;cursor:pointer;white-space:nowrap;font-family:'Rajdhani',sans-serif;font-weight:700">📸 Cmd3</button>
              <button onclick="sbInsightDelete('${ins.id}').then(()=>loadInsightsByCategory('${macroCategory}'))"
                style="background:none;border:none;color:var(--muted);font-size:12px;cursor:pointer;padding:0">🗑</button>
            </div>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

function sendInsightToCmd3(insightText){
  window._instaOracleActive=true;
  const input=document.getElementById('chat-input');
  if(input) input.value=`Run command 3 — Turn this specific insight into a week of content for @AceSanyaBeats: "${insightText}"`;
  const tab=document.querySelector('[onclick*="advisor"]');
  if(tab) showPage('advisor',tab);
  const panel=document.getElementById('insta-oracle-panel');
  if(panel) panel.style.display='block';
}

async function generateContentIdeasFromInsights(){
  const insights=await sbInsightFetch(null);
  if(!insights.length){alert('No insights yet — extract some first.');return;}
  const texts=insights.slice(0,25).map(i=>`• ${i.insight_text}`).join('\n');
  const input=document.getElementById('chat-input');
  if(input) input.value=`Run command 3 — Here are specific insights from my music production encyclopedia. Turn the most content-worthy ones into a week of Instagram posts for @AceSanyaBeats:\n\n${texts}`;
  window._instaOracleActive=true;
  const tab=document.querySelector('[onclick*="advisor"]');
  if(tab) showPage('advisor',tab);
  const panel=document.getElementById('insta-oracle-panel');
  if(panel) panel.style.display='block';
}

async function autoExtractAllInCategory(macroCategory){
  const entries=macroCategory==='all'?ENC_ALL_ENTRIES:ENC_ALL_ENTRIES.filter(e=>detectCategory(e.content,e.title)===macroCategory);
  if(!entries.length){alert('No entries in this category yet.');return;}
  const btn=event?.target;
  if(btn){btn.disabled=true;btn.textContent=`Extracting from ${entries.length} entries...`;}
  for(const entry of entries) await extractInsightsAuto(entry,true);
  if(btn){btn.disabled=false;btn.textContent='⚡ Auto-extract more';}
  await loadInsightsByCategory(macroCategory);
}

function jumpToSourceEntry(entryId){
  setEncCategory('all');
  setTimeout(()=>document.getElementById('enc-output')?.scrollIntoView({behavior:'smooth'}),300);
}



// ═══════════════════════════════════════════════
// LEARN BUTTON — Video Finder → Content Intelligence
// ═══════════════════════════════════════════════
window._pendingLearnVideo = null;

async function learnVideo(id, title, thumb, channel){
  const url = `https://youtube.com/watch?v=${id}`;
  window._pendingLearnVideo = {id, title, url};

  // Submit to CI job queue in Supabase
  // July 24 FROZEN-file exception: migrated to RPGACE.sb.secureWrite,
  // which already throws its own real error message on failure - the
  // explicit !res.ok check is no longer needed, secureWrite's rejection
  // is caught by the same catch below.
  try {
    // RI-2: always ask which realms this video is for.
    const realms = await RPGACE.realmPicker.pick({ what: 'video', title: title || url });
    // RI-3: "Not now" holds the job until realms are picked.
    await RPGACE.sb.secureWrite('intel_jobs', 'insert', {url, status: realms ? 'queued' : 'awaiting_realms', realms: realms || []});
  } catch(e){
    setLearnStatus('search-status', '✗ Queue failed: ' + e.message, 'err');
    return;
  }

  // Show confirmation + Watch Progress link (Option B+C)
  const queueEl = document.getElementById('learn-queue-status');
  if(queueEl){
    queueEl.style.display = 'block';
    queueEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div>
          <div style="font-size:12px;font-weight:600;color:var(--green)">✓ Queued for analysis</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${title.slice(0,55)}${title.length>55?'...':''}</div>
          <div style="font-size:11px;color:var(--muted)">Local server will process this. Takes 15–25 mins.</div>
        </div>
        <button onclick="switchToCI()" style="background:rgba(74,144,226,.15);border:1px solid rgba(74,144,226,.3);color:var(--blue);border-radius:6px;padding:6px 12px;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;white-space:nowrap">Watch Progress →</button>
      </div>`;
  }
  // Start polling for completion
  startJobPolling(null);
  setLearnStatus('search-status', '', '');
}

function switchToCI(){
  // Aug 23 2026 (UI2) - removed:
  //     const researchTab = document.querySelector('[onclick*="learning"]');
  //     if(researchTab) showPage('learning', researchTab);
  // Provably inert on two independent counts, not a judgement call: the
  // .nav-tab bar those [onclick*="learning"] handlers lived on was removed
  // July 20 2026 (so the guard has always been null since), and the
  // 'learning' page itself is retired as of this pass. Kept the real
  // behaviour (jump the intel view to its insights tab) unchanged.
  setTimeout(()=>showIntelTab('insights'), 100);
}

// ═══════════════════════════════════════════════
// VST / EQUIPMENT EXTRACTION SYSTEM
// ═══════════════════════════════════════════════
const VST_KNOWN = [
  // Synths
  'Omnisphere','Serum','Nexus','Sylenth1','Massive','Massive X','Spire','Pigments',
  'Vital','Phase Plant','Diva','Zebra','Hive','u-he','Roland','Arturia','Korg',
  'Harmor','Sytrus','3xOsc','ZGameEditor','PoiZone','Toxic Biohazard','Morphine',
  'Sakura','BeepMap','DirectWave','FLEX',
  // Effects & Mixing
  'FabFilter','Pro-Q','Pro-MB','Pro-C','Pro-L','Saturn','Volcano','Timeless',
  'Valhalla','ValhallaRoom','ValhallaVintageVerb','Reverb','Delay','OTT',
  'Kickstart','Gross Beat','Fruity Peak Controller','Parametric EQ',
  'Maximus','Transient Processor','Multiband','Limiter','Compressor',
  'Waves','SSL','API','UAD','Universal Audio','iZotope','Neutron','Ozone',
  'RX','Trash','Stutter Edit','VocalSynth',
  // Kontakt & Sample-based
  'Kontakt','Native Instruments','Maschine','Battery','Splice','Looperman',
  'UJAM','Output','Portal','Portal','Arcade','Hybrid','Exhale','Signal',
  // Roland / 808 / Drum machines
  '808','909','TR-808','TR-909','SP-404','MPC','Akai','Roland Cloud',
  // DAW-specific
  'FL Studio','Ableton','Logic Pro','Pro Tools','Reason','Studio One',
  // Sample Packs & Drum Kits (common ones)
  'Drum Kit','Sample Pack','One Shot','Loop Kit','Melody Kit',
  'Kanye West Kit','808 Mafia Kit','Metro Boomin Kit','Southside Kit',
  'Wheezy Kit','TM88 Kit','Zaytoven Kit','Pi\xf1ata Kit',
];

const VST_PATTERN = new RegExp(
  '(' + VST_KNOWN.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')',
  'gi'
);

function extractVSTsFromText(text){
  if(!text) return [];
  const found = new Set();
  const matches = text.match(VST_PATTERN) || [];
  matches.forEach(m => found.add(
    VST_KNOWN.find(v => v.toLowerCase() === m.toLowerCase()) || m
  ));
  // Also catch patterns like "[Name] preset", "[Name] kit", "[Name] pack"
  const presetPattern = /(\b[\w\s]+(?:preset|kit|pack|plugin|vst|synth|sampler)\b)/gi;
  const presets = text.match(presetPattern) || [];
  presets.slice(0,5).forEach(p => {
    if(p.length < 40 && p.length > 4) found.add(p.trim());
  });
  return [...found].slice(0, 15);
}

function highlightVSTsInContent(htmlContent, vsts){
  if(!vsts || !vsts.length) return htmlContent;
  let result = htmlContent;
  vsts.forEach(vst => {
    const safe = vst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const anchorId = 'vst-ref-' + vst.replace(/[^a-zA-Z0-9]/g,'-').toLowerCase();
    const regex = new RegExp(`(?<!<[^>]*)(${safe})(?![^<]*>)`, 'i');
    // Only wrap first occurrence with anchor, rest with just highlight
    result = result.replace(regex,
      `<mark id="${anchorId}" style="background:rgba(255,140,0,.15);color:var(--text);border-radius:3px;padding:0 3px">${vst}</mark>`
    );
  });
  return result;
}

function renderVSTChips(vsts, entryId){
  if(!vsts || !vsts.length) return '';
  return `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">
    ${vsts.map(v => {
      const anchor = 'vst-ref-' + v.replace(/[^a-zA-Z0-9]/g,'-').toLowerCase();
      return `<span onclick="scrollToVSTInEntry('${entryId}','${anchor}')"
        style="background:rgba(255,140,0,.12);border:1px solid rgba(255,140,0,.3);color:#FF8C00;border-radius:10px;padding:2px 8px;font-size:10px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:600"
        title="Click to find in entry">${v}</span>`;
    }).join('')}
  </div>`;
}

function scrollToVSTInEntry(safeId, anchor){
  // Expand the entry first
  expandEncEntry(safeId);
  setTimeout(()=>{
    const el = document.getElementById(anchor);
    if(el) el.scrollIntoView({behavior:'smooth', block:'center'});
  }, 200);
}

function extractVSTContext(content, vstName){
  if(!content||!vstName) return '';
  const sentences=content.split(/[.!?\n]+/).map(s=>s.trim()).filter(s=>s.length>0);
  const re=new RegExp(vstName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i');
  const found=sentences.find(s=>re.test(s));
  if(!found) return '';
  return found.length>80?found.slice(0,80)+'...':found;
}

function renderVSTFooter(vsts,rawContent){
  if(!vsts || !vsts.length) return '';
  return `<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">
    <div style="font-size:10px;color:#FF8C00;font-family:'Cinzel',serif;letter-spacing:1px;margin-bottom:8px">🔌 VSTs & EQUIPMENT DETECTED</div>
    <div style="display:flex;flex-wrap:wrap;gap:5px">
      ${vsts.map(v => {
        const anchor = 'vst-ref-' + v.replace(/[^a-zA-Z0-9]/g,'-').toLowerCase();
        const ctx = extractVSTContext(rawContent, v);
        return `<a href="#${anchor}" onclick="event.preventDefault();document.getElementById('${anchor}')?.scrollIntoView({behavior:'smooth',block:'center'})"
          style="background:rgba(255,140,0,.12);border:1px solid rgba(255,140,0,.3);color:#FF8C00;border-radius:8px;padding:3px 10px;font-size:12px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;text-decoration:none">${v}</a>${ctx ? `<span style="font-size:11px;color:var(--muted);font-style:italic;margin-left:6px">${ctx}</span>` : ''}`;
      }).join('')}
    </div>
  </div>`;
}

// Auto-extract VSTs when saving encyclopedia entries
async function saveEncWithVSTs(entry){
  const vsts = extractVSTsFromText(entry.content || '');
  if(!vsts.length) return;
  try {
    await RPGACE.sb.secureWrite('encyclopedia', 'update', { vst_tags: vsts }, 'id=eq.' + entry.id);
  } catch(e){}
}

// ── VST INSPECTOR (for VST/Plugins category view) ──
function loadVSTInspector(){
  const el = document.getElementById('enc-output');
  if(!el || !ENC_ALL_ENTRIES.length){
    if(el) loadInsightsByCategory('vst');
    return;
  }

  // Build VST → entries map
  const vstMap = {};
  ENC_ALL_ENTRIES.forEach(entry => {
    const vsts = entry.vst_tags?.length
      ? entry.vst_tags
      : extractVSTsFromText(entry.content || '');
    vsts.forEach(vst => {
      if(!vstMap[vst]) vstMap[vst] = [];
      vstMap[vst].push(entry);
    });
  });

  const sorted = Object.entries(vstMap).sort((a,b) => b[1].length - a[1].length);

  if(!sorted.length){
    loadInsightsByCategory('vst'); // Fall back to insights view
    return;
  }

  el.innerHTML = `
    <div style="margin-bottom:16px">
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
        <button onclick="loadVSTInspector()" class="enc-sort-btn active">🔌 VST Inspector</button>
        <button onclick="loadInsightsByCategory('vst')" class="enc-sort-btn">💡 VST Insights</button>
      </div>
      <div style="font-size:12px;color:var(--muted)">${sorted.length} VSTs/plugins detected across ${ENC_ALL_ENTRIES.length} entries</div>
    </div>
    ${sorted.map(([vst, entries]) => `
      <div style="margin-bottom:14px">
        <div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'"
          style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 14px;background:rgba(255,140,0,.06);border:1px solid rgba(255,140,0,.2);border-radius:8px;margin-bottom:6px;user-select:none">
          <span style="font-size:16px">🔌</span>
          <span style="font-family:'Cinzel',serif;font-size:13px;color:#FF8C00;font-weight:600">${vst}</span>
          <span style="font-size:11px;color:var(--muted);margin-left:auto">${entries.length} entr${entries.length===1?'y':'ies'} ▾</span>
        </div>
        <div>
          ${entries.map(e => `
            <div style="background:var(--panel2);border:1px solid var(--border);border-radius:7px;padding:10px 14px;margin-bottom:6px;display:flex;align-items:center;gap:10px;cursor:pointer"
              onclick="setEncCategory('all');setTimeout(()=>refreshEncyclopediaDisplay(),200)">
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;color:var(--gold);font-family:'Cinzel',serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.title||'Entry'}</div>
                <div style="font-size:11px;color:var(--muted);margin-top:2px">📅 ${e.date||''} · ${e.source||'oracle'}</div>
              </div>
              <span style="color:var(--muted);font-size:12px">→</span>
            </div>`).join('')}
        </div>
      </div>
    `).join('')}
  `;
}

function jumpToFullEntry(entryId){
  setEncCategory('all');
  ENC_SORT = 'recent';
  setTimeout(()=>{
    // Find and expand the matching entry
    const cards = document.querySelectorAll('[id^="enc-card-"]');
    // Highlight by scrolling to enc-output
    document.getElementById('enc-output')?.scrollIntoView({behavior:'smooth'});
  }, 400);
}

// Override setEncCategory to use VST Inspector for vst category
const _origSetEncCategory = setEncCategory;

// ═══════════════════════════════════════════════
// POST-PROCESSING JUMP DIALOG
// ═══════════════════════════════════════════════
function showJumpToEncDialog(videoTitle){
  // Non-blocking confirm-style notification
  const overlay = document.createElement('div');
  overlay.id = 'jump-enc-dialog';
  overlay.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:9998;background:var(--panel);border:1px solid var(--green);border-radius:12px;padding:16px 20px;box-shadow:0 4px 24px rgba(0,0,0,.5);max-width:340px;width:90%';
  overlay.innerHTML = `
    <div style="font-size:12px;color:var(--green);font-family:'Cinzel',serif;letter-spacing:.5px;margin-bottom:6px">✓ ANALYSIS COMPLETE</div>
    <div style="font-size:13px;color:var(--text);margin-bottom:4px;line-height:1.4">${(videoTitle||'Your video').slice(0,60)}</div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:12px">Jump to Encyclopedia to view the summary?</div>
    <div style="display:flex;gap:8px">
      <button onclick="acceptJumpToEnc()" style="flex:1;background:var(--green);border:none;color:#000;border-radius:6px;padding:8px;font-size:12px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700">Yes, show me</button>
      <button onclick="document.getElementById('jump-enc-dialog')?.remove()" style="flex:1;background:none;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:8px;font-size:12px;cursor:pointer;font-family:'Rajdhani',sans-serif">Stay here</button>
    </div>`;
  document.body.appendChild(overlay);
  // Auto-dismiss after 30s
  setTimeout(()=>overlay.remove(), 30000);
}

function acceptJumpToEnc(){
  document.getElementById('jump-enc-dialog')?.remove();
  ENC_SORT = 'recent';
  document.querySelectorAll('.enc-sort-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('enc-sort-recent')?.classList.add('active');
  const encTab = document.querySelector('[onclick*="encyclopedia"]');
  if(encTab) showPage('encyclopedia', encTab);
  refreshEncyclopediaDisplay();
}

// ── ENCYCLOPEDIA STATE ──
let ENC_ALL_ENTRIES = [];
let ENC_CATEGORY    = 'all';
// Aug 22 (real /interrogation, same /paranoia pass as the case-sensitivity
// fix above): default changed from 'unique' to 'recent' on Alex's own
// explicit choice. 'unique' remains inherently O(n^2) in entry count even
// after the precompute-once fix above - fine at today's real ~70-row
// scale, but would creep back toward multi-second cost as the Encyclopedia
// grows past a few hundred rows. 'recent' is a cheap O(n log n) date sort
// with zero quadratic risk, removing that growth risk from first paint
// permanently. 'Unique' stays fully available as a one-click mode for a
// deliberate creative-browsing session - only the DEFAULT changed.
let ENC_SORT        = 'recent';
const ENC_BULLET_CACHE = {}; // keyed by entry id/created_at

// Category auto-detection keywords
const ENC_CATEGORY_MAP = {
  beat:     ['beat','808','drum','melody','chord','sample','arrangement','progression','loop','bass','kick','snare','hi-hat','hihat','perc'],
  mixing:   ['mix','master','eq','compress','reverb','delay','frequency','gain','pan','bus','chain','saturation','limiter','volume','stereo','mono'],
  vst:      ['vst','plugin','omnisphere','serum','nexus','sylenth','massive','fl studio','daw','midi','kontakt','sample pack','arturia','native instruments','splice'],
  genre:    ['drill','afrobeats','grime','trap','rnb','r&b','hip hop','hiphop','dancehall','soul','pop','house','garage','uk','us','nigerian','jamaican'],
  artist:   ['rick ross','j cole','jay z','drake','skepta','stormzy','headie one','central cee','artist','vocalist','rapper','singer','collab','feature'],
  strategy: ['strategy','growth','instagram','youtube','tiktok','followers','views','engagement','algorithm','content plan','posting','schedule','viral'],
  content:  ['reel','carousel','caption','hook','hashtag','thumbnail','short','clip','video idea','post','story','insta','oracle command'],
  notes:    []
};

function detectCategory(content='', title=''){
  const text = (title + ' ' + content).toLowerCase();
  for(const [cat, keywords] of Object.entries(ENC_CATEGORY_MAP)){
    if(cat === 'notes') continue;
    if(keywords.some(k => text.includes(k))) return cat;
  }
  return 'notes';
}

function setEncCategory(cat){
  ENC_CATEGORY = cat;
  document.querySelectorAll('.enc-cat-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('enc-cat-' + cat);
  if(btn) btn.classList.add('active');
  if(cat === 'all' || cat === 'strategy'){
    renderEncEntries();
  } else if(cat === 'vst'){
    loadVSTInspector();
  } else {
    loadInsightsByCategory(cat);
  }
}

function setEncSort(sort){
  ENC_SORT = sort;
  document.querySelectorAll('.enc-sort-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('enc-sort-' + sort);
  if(btn) btn.classList.add('active');
  renderEncEntries();
}

function sortEntries(entries){
  const clone = [...entries];
  if(ENC_SORT === 'recent'){
    return clone.sort((a,b)=>new Date(b.created_at||b.date||0)-new Date(a.created_at||a.date||0));
  }
  if(ENC_SORT === 'unique'){
    // Prioritise entries with unusual combos — cross-entry uniqueness via title/content diversity
    //
    // Aug 22 (real /Routine follow-up — a real Performance-panel flame
    // chart from Alex's own live session, captured after a genuine
    // multi-recording DevTools troubleshooting pass, pinned a 12+ second
    // main-thread freeze exactly to sortEntries): this used to be ENC_SORT's
    // own DEFAULT value, so this comparator ran unconditionally on the very
    // first real Encyclopedia render after boot. The original comparator
    // recomputed each entry's full cross-entry overlap scan (an allText.
    // filter + nested .split/.includes) from scratch on EVERY comparison
    // Array.sort makes - O(n log n) repeats of an O(n)-with-string-ops
    // inner scan. Real fix, 100% behavior-preserving for the overlap
    // FORMULA (same technique, just computed once instead of ~n times):
    // compute each entry's own overlap score exactly ONCE (a real O(n^2)
    // pass, but run once, not O(n log n) times) before sorting.
    //
    // Real, separate case-sensitivity fix, same day, after Alex's own
    // /paranoia+Council-of-5+/interrogation pass on this exact code: the
    // ORIGINAL allText was never lowercased while each entry's own
    // comparison text (eText) was - a real mismatch with two symptoms
    // (both traced to this one cause, not two separate bugs): (1) self-
    // exclusion (comparing an entry's raw-case text against its own
    // lowercased text) almost never actually fired for any real entry
    // whose title/content wasn't already all-lowercase, so an entry
    // partially counted overlap against a copy of itself; (2) any shared
    // word that happened to be capitalized in its ORIGINAL occurrence
    // (sentence-start, a proper noun, "FL Studio") was silently never
    // matched cross-entry, since eText is fully lowercase and the word
    // being tested wasn't. Net effect was a noisier, less meaningful
    // "uniqueness" signal than the button's own label promises ("Most
    // unusual entries first"). Fixed by lowercasing allText too (so the
    // comparison is genuinely case-insensitive both directions) and
    // excluding self by real identity (index) rather than a string
    // equality check that depended on case matching by coincidence -
    // this is a real, deliberate, Alex-approved change to the actual
    // ranking output (not just a perf tweak), unlike the fix above.
    const allText = clone.map(e=>((e.title||'')+' '+(e.content||'')).toLowerCase());
    const overlapScores = new Map();
    clone.forEach((e, i) => {
      const eText = allText[i];
      const overlap = allText.filter((t,j)=>j!==i).reduce((s,t)=>s+(t.split(' ').filter(w=>w.length>4&&eText.includes(w)).length),0);
      overlapScores.set(e, overlap);
    });
    // Score: how many OTHER entries share words with this one (lower = more unique)
    return clone.sort((a,b) => overlapScores.get(a) - overlapScores.get(b));
  }
  if(ENC_SORT === 'steal'){
    // Entries with most specific techniques first — detect technique density
    const techWords = ['technique','method','trick','tip','secret','how to','approach','workflow','process','setting','parameter','plugin','vst','sample','sound design'];
    return clone.sort((a,b) => {
      const score = e => techWords.filter(w=>(e.content||'').toLowerCase().includes(w)).length;
      return score(b) - score(a);
    });
  }
  if(ENC_SORT === 'action'){
    // Entries with actionable language first
    const actionWords = ['quest','xp','do this','try this','apply','implement','record','post','create','build','start','today','this week','action','next step'];
    return clone.sort((a,b) => {
      const score = e => actionWords.filter(w=>(e.content||'').toLowerCase().includes(w)).length;
      return score(b) - score(a);
    });
  }
  if(ENC_SORT === 'context'){
    // Group by detected category, then alphabetically by title
    return clone.sort((a,b) => {
      const catA = detectCategory(a.content, a.title);
      const catB = detectCategory(b.content, b.title);
      if(catA !== catB) return catA.localeCompare(catB);
      return (a.title||'').localeCompare(b.title||'');
    });
  }
  return clone;
}

function filterEntries(entries){
  if(ENC_CATEGORY === 'all') return entries;
  return entries.filter(e => detectCategory(e.content, e.title) === ENC_CATEGORY);
}

// Aug 6 (Alex's real /deduplication ask, surfaced by the Fallback Scout
// list showing the SAME encyclopedia entries re-queued repeatedly):
// ENC_BULLET_CACHE alone is NOT real dedup - it's a plain in-memory JS
// object that evaporates on every page reload, so the exact same entry
// got re-sent to Oracle (and, once Fallback mode shipped, re-queued into
// oracle_fallback_queue) every time the Encyclopedia page loaded, even
// though its bullets had already been generated in a prior session. Real
// fix, per rule 8: check the entry's own real "destination of planned
// output" - a persisted preview_bullets column on the encyclopedia row
// itself - BEFORE ever calling Oracle, not just an in-memory cache that
// only helps within one page load.
async function generateEncBullets(entry, allEntries){
  const id = entry.id || entry.created_at || entry.title;
  if(ENC_BULLET_CACHE[id]) return ENC_BULLET_CACHE[id];
  if(Array.isArray(entry.preview_bullets) && entry.preview_bullets.length){
    ENC_BULLET_CACHE[id] = entry.preview_bullets;
    return entry.preview_bullets;
  }
  // Oct 10 2026 (N2, Knowledge slice): an article built from an analysed
  // video (C1) already has its idea cards stored - use the first few as the
  // preview instead of paying for an Oracle call per article.
  if(entry.id && RPGACE.modules.encyclopediaPosts){
    try {
      const ideas = await RPGACE.modules.encyclopediaPosts.loadIdeas(entry.id);
      const pick = (ideas||[]).filter(d => d.idea_section !== 'summary').concat((ideas||[]).filter(d => d.idea_section === 'summary'))
        .map(d => d.insight_text).filter(Boolean).slice(0,4);
      if(pick.length){ ENC_BULLET_CACHE[id] = pick; return pick; }
    } catch(e){}
  }

  // Build cross-entry context (titles of other entries for comparison)
  const otherTitles = allEntries
    .filter(e => (e.id||e.created_at) !== id)
    .map(e => e.title||'')
    .filter(Boolean)
    .slice(0,20)
    .join(', ');

  const prompt = `You are generating 7 collapsed preview bullet points for an encyclopedia entry in RPGACE — a music producer's personal knowledge base.

ENTRY TITLE: ${entry.title||'Entry'}
ENTRY DATE: ${entry.date||''}
ENTRY SOURCE: ${entry.source||'oracle'}
ENTRY CONTENT:
${(entry.content||'').slice(0,3000)}

OTHER ENTRIES IN THE ENCYCLOPEDIA (titles only, for comparison):
${otherTitles || 'None yet'}

RULES — apply in this exact priority order:
1. UNIQUENESS (weight 10/10) — What makes this entry stand out vs all other entries listed above? Most unusual, rare or unexpected insight.
2. STEAL-NOW (weight 9.8/10) — The single most specific technique, sound, plugin or method mentioned that can be applied immediately.
3. ACTIONABLE (weight 9/10) — The clearest next step, quest or concrete action mentioned.
4. CONTEXT (weight 8.5/10) — Genre, artist, style or cultural reference that gives this entry its creative context.

ALSO CONSIDER (for beat/music entries):
- What is most unique about any beat discussed vs other beat entries?
- Genre comparison, artist comparisons (emerging vs established, sound characteristics)
- Sound selection for melodies, drums, mixing, mastering, VST selection, VST techniques

Generate EXACTLY 7 bullet points. Rank all possible reasons internally from most to least valuable, then output the top 7 in ranked order. Each bullet: one sentence, under 20 words, starts with an emoji that matches the content type.

Return ONLY a JSON array of 7 strings. No explanation, no markdown, no preamble:
["bullet 1","bullet 2","bullet 3","bullet 4","bullet 5","bullet 6","bullet 7"]`;

  try {
    const data = await callOracle([{role:'user', content: prompt}], '', 400);
    const raw = data.content.map(c=>c.text||'').join('').replace(/```json|```/g,'').trim();
    const match = raw.match(/\[[\s\S]*?\]/);
    if(match){
      const bullets = JSON.parse(match[0]);
      ENC_BULLET_CACHE[id] = bullets;
      entry.preview_bullets = bullets; // keeps this session's in-memory entry object in sync too
      // Persist to the real row (id && real UUID guard - same pattern
      // deleteEncEntry already uses) so the NEXT page load/session/device
      // finds it via the check above and never re-generates it. Only the
      // genuine success path writes here - the fallback below never does,
      // so a transient failure can never poison the row with a useless
      // placeholder bullet.
      if(entry.id && String(entry.id).includes('-') && String(entry.id).length > 20){
        RPGACE.sb.secureWrite('encyclopedia', 'update', {preview_bullets: bullets}, 'id=eq.' + entry.id)
          .catch(function(e){ console.warn('[generateEncBullets] preview_bullets persist failed:', e.message); });
      }
      return bullets;
    }
  } catch(e){}
  return ['📖 Expand to read full entry'];
}

function renderEncEntries(){
  const el = document.getElementById('enc-output');
  if(!el) return;

  const filtered = filterEntries(ENC_ALL_ENTRIES);
  const sorted   = sortEntries(filtered);

  const countEl = document.getElementById('enc-count');
  // Oct 10 2026 (N2): filters now fold away, so the always-visible count
  // line names the active category and sort in plain words.
  const _catName = {all:'All',beat:'Beat Analysis',mixing:'Mixing/Mastering',vst:'VST/Plugins',genre:'Genre Study',artist:'Artist Analysis',strategy:'Strategy/Growth',content:'Content Ideas',notes:'Notes'}[ENC_CATEGORY]||ENC_CATEGORY;
  const _sortName = {recent:'Most recent',unique:'Most unique',steal:'Steal now',action:'Do today',context:'Genre/Artist'}[ENC_SORT]||ENC_SORT;
  if(countEl) countEl.textContent = `${sorted.length} of ${ENC_ALL_ENTRIES.length} articles · ${_catName} · ${_sortName}`;

  if(!sorted.length){
    el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">No entries in this category yet.</div>`;
    return;
  }

  const sortLabel = {recent:'🕐 Recent',unique:'⭐ Most Unique',steal:'🔧 Steal Now',action:'⚡ Do Today',context:'🎵 Genre/Artist'}[ENC_SORT]||'';

  el.innerHTML = sorted.map((e, i) => {
    const id       = e.id || e.created_at || i;
    const safeId   = 'enc-' + String(id).replace(/[^a-zA-Z0-9]/g,'').slice(0,16) + i;
    const icon     = e.source==='intel'?'🧠':e.source==='workshop'?'🎬':e.source==='insta'?'📸':'💬';
    const cat      = detectCategory(e.content, e.title);
    const catLabel = {beat:'🎛 Beat',mixing:'🎚 Mix',vst:'🔌 VST',genre:'🎵 Genre',artist:'🎤 Artist',strategy:'📊 Strategy',content:'📸 Content',notes:'📝 Notes'}[cat]||'📝';

    // Oct 10 2026 (N2, Knowledge slice): no gold side-stripe (impeccable
    // side-tab), full titles that wrap, readable meta, 36px+ buttons.
    return `<div id="enc-card-${safeId}" style="background:var(--panel2);border:1px solid var(--border);border-radius:10px;margin-bottom:12px;overflow:hidden">
      <!-- Header — always visible -->
      <div style="display:flex;align-items:center;gap:8px;padding:14px 16px;cursor:pointer" onclick="toggleEncEntry('${safeId}')">
        <div style="flex:1;min-width:0">
          <div style="font-size:16px;line-height:1.3;color:var(--gold);font-weight:700;overflow-wrap:anywhere">${e.title||'Entry'}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px">${icon} ${e.source||'oracle'} · ${e.date||''} · <span style="color:var(--blue)">${catLabel}</span></div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          ${e.id ? `<button onclick="event.stopPropagation();RPGACE.modules.encyclopediaPosts.openPost('${e.id}')" style="background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.35);color:var(--gold);font-size:13px;cursor:pointer;padding:6px 10px;min-height:36px;border-radius:6px;font-family:inherit" title="Read as idea cards">▶ Read</button>` : ''}
          <button onclick="event.stopPropagation();deleteEncEntry('${id}')" style="background:none;border:none;color:var(--muted);font-size:15px;cursor:pointer;min-width:36px;min-height:36px;border-radius:6px" title="Delete entry" aria-label="Delete entry">🗑</button>
          <div id="enc-chevron-${safeId}" style="color:var(--muted);font-size:12px;transition:transform .2s">▼</div>
        </div>
      </div>

      <!-- Collapsed: AI bullet points -->
      <div id="enc-collapsed-${safeId}" style="padding:0 16px 14px">
        <div id="enc-bullets-${safeId}" style="display:flex;flex-direction:column;gap:5px">
          <div style="color:var(--muted);font-size:11px;font-style:italic">Click to load preview bullets...</div>
        </div>
        ${(() => { const vsts = e.vst_tags?.length ? e.vst_tags : extractVSTsFromText(e.content||''); return renderVSTChips(vsts, safeId); })()}
        <button onclick="expandEncEntry('${safeId}')" style="background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.2);color:var(--gold);border-radius:6px;padding:6px 14px;min-height:36px;font-size:13px;cursor:pointer;font-family:'Rajdhani',sans-serif;margin-top:8px">▼ Full article</button>
      </div>

      <!-- Expanded: full content (hidden by default) -->
      <div id="enc-expanded-${safeId}" style="display:none;padding:0 16px 16px;border-top:1px solid var(--border)">
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 8px;padding:8px;background:rgba(201,168,76,.04);border-radius:6px;align-items:center">
          <span style="font-size:10px;color:var(--muted);font-family:'Cinzel',serif;letter-spacing:.5px">EXTRACT INSIGHTS:</span>
          <button onclick="extractInsightsSemiAuto(ENC_ALL_ENTRIES.find(e=>(e.id||e.created_at)===('${id}')||e.title==='${e.title?.replace(/'/g,"\'")}'),'${safeId}')" style="background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.3);color:var(--gold);border-radius:5px;padding:3px 10px;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:600">📋 Semi-auto</button>
          <button onclick="extractInsightsAuto(ENC_ALL_ENTRIES.find(e=>(e.id||e.created_at)===('${id}')||e.title==='${e.title?.replace(/'/g,"\'")}'),false)" style="background:rgba(74,144,226,.1);border:1px solid rgba(74,144,226,.3);color:var(--blue);border-radius:5px;padding:3px 10px;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:600">🤖 Auto</button>
          <span style="font-size:10px;color:var(--muted)">or select any text below → 📌 Tag</span>
          <div id="enc-insight-status-${safeId}" style="font-size:11px"></div>
        </div>
        <div id="enc-approval-${safeId}" style="display:none;background:rgba(201,168,76,.05);border:1px solid rgba(201,168,76,.2);border-radius:8px;padding:12px;margin-bottom:10px"></div>
        ${(() => { const vsts = e.vst_tags?.length ? e.vst_tags : extractVSTsFromText(e.content||''); const highlighted = highlightVSTsInContent(renderMarkdown(e.content||''), vsts); return `<div data-entry-id="${id}" data-entry-title="${(e.title||'').replace(/"/g,'&quot;')}" style="font-size:13px;line-height:1.9;color:var(--text);margin-top:8px">${highlighted}</div>${renderVSTFooter(vsts, e.content||'')}`; })()}
        <button onclick="collapseEncEntry('${safeId}')" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:5px;padding:4px 12px;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif;margin-top:12px">▲ Collapse</button>
      </div>
    </div>`;
  }).join('');

  // Lazy-load bullets for first 5 visible entries
  sorted.slice(0, 5).forEach((e, i) => {
    const id = e.id || e.created_at || i;
    const safeId = 'enc-' + String(id).replace(/[^a-zA-Z0-9]/g,'').slice(0,16) + i;
    loadEncBullets(safeId, e);
  });
}

async function loadEncBullets(safeId, entry){
  const bulletsEl = document.getElementById('enc-bullets-' + safeId);
  if(!bulletsEl) return;
  // Check cache first
  const cacheKey = entry.id || entry.created_at || entry.title;
  if(ENC_BULLET_CACHE[cacheKey]){
    renderBullets(bulletsEl, ENC_BULLET_CACHE[cacheKey]);
    return;
  }
  bulletsEl.innerHTML = '<div style="color:var(--muted);font-size:11px">⚡ Generating preview...</div>';
  const bullets = await generateEncBullets(entry, ENC_ALL_ENTRIES);
  renderBullets(bulletsEl, bullets);
}

function renderBullets(el, bullets){
  el.innerHTML = (bullets||[]).map((b,i) =>
    `<div style="display:flex;gap:6px;align-items:flex-start;font-size:12px;color:var(--text);line-height:1.5">
      <span style="color:var(--gold);font-size:10px;margin-top:2px;flex-shrink:0">${i+1}</span>
      <span>${b}</span>
    </div>`
  ).join('');
}

async function toggleEncEntry(safeId){
  const collapsed = document.getElementById('enc-collapsed-' + safeId);
  const expanded  = document.getElementById('enc-expanded-'  + safeId);
  const chevron   = document.getElementById('enc-chevron-'   + safeId);
  if(!collapsed || !expanded) return;
  if(expanded.style.display === 'none'){
    expandEncEntry(safeId);
  } else {
    collapseEncEntry(safeId);
  }
}

function expandEncEntry(safeId){
  const collapsed = document.getElementById('enc-collapsed-' + safeId);
  const expanded  = document.getElementById('enc-expanded-'  + safeId);
  const chevron   = document.getElementById('enc-chevron-'   + safeId);
  if(collapsed) collapsed.style.display = 'none';
  if(expanded)  expanded.style.display  = 'block';
  if(chevron)   chevron.textContent      = '▲';
}

function collapseEncEntry(safeId){
  const collapsed = document.getElementById('enc-collapsed-' + safeId);
  const expanded  = document.getElementById('enc-expanded-'  + safeId);
  const chevron   = document.getElementById('enc-chevron-'   + safeId);
  if(collapsed) collapsed.style.display = 'block';
  if(expanded)  expanded.style.display  = 'none';
  if(chevron)   chevron.textContent      = '▼';
}

async function deleteEncEntry(id){
  if(!confirm('Delete this encyclopedia entry?')) return;
  if(id && String(id).includes('-') && String(id).length > 20){
    try {
      await RPGACE.sb.secureWrite('encyclopedia', 'delete', null, 'id=eq.' + id);
    } catch(e){}
  }
  // Aug 27 2026 (/Routine item #1) — only entries with a real source_url
  // (a genuine intel-sourced analysis, per saveIntelToEncyclopedia) have
  // anything to reanalyze; a plain Oracle-chat save has no video/URL
  // behind it, so it correctly never enters the pool.
  const deletedEntry = ENC_ALL_ENTRIES.find(e => (e.id||e.created_at) === id);
  if (deletedEntry && deletedEntry.source_url) {
    RPGACE.utils.logReanalysisCandidate(deletedEntry.source_url, deletedEntry.title, 'encyclopedia', deletedEntry.created_at || null, 'bad_extraction');
  }
  ENC_ALL_ENTRIES = ENC_ALL_ENTRIES.filter(e => (e.id||e.created_at) !== id);
  localStorage.setItem('rpgace_encyclopedia', JSON.stringify(ENC_ALL_ENTRIES));
  renderEncEntries();
}

async function refreshEncyclopediaDisplay(){
  const encOutput = document.getElementById('enc-output');
  if(!encOutput) return;
  encOutput.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:16px">Loading...</div>';

  let entries = [];
  // Aug 27 2026 (/Routine item #1) — track real fetch success separately
  // from row count. Before this fix, a genuinely successful fetch that
  // correctly found 0 rows (right after a real clear) was indistinguishable
  // from a fetch that failed outright — both fell back to whatever stale
  // localStorage cache was left, silently resurrecting cleared entries.
  let fetchSucceeded = false;
  try {
    const res = await _sbGet('/rest/v1/encyclopedia?order=created_at.desc&limit=200');
    if(res.ok){
      entries = await res.json();
      fetchSucceeded = true;
      localStorage.setItem('rpgace_encyclopedia', JSON.stringify(entries));
    }
  } catch(e){}

  if(!fetchSucceeded){
    try { const p = JSON.parse(localStorage.getItem('rpgace_encyclopedia')||'[]'); entries = Array.isArray(p)?p:[]; } catch(e){}
  }

  // Suppress any entry that's the same age or older than a real deletion
  // Alex made (see RPGACE.utils.filterReanalysisSuppressed) — this is what
  // makes the "⚡ Sync & Push All Reports" button safe without touching it
  // directly, since the suppression runs here regardless of what pushed
  // stale data back into the encyclopedia table.
  try { entries = await RPGACE.utils.filterReanalysisSuppressed(entries, 'created_at', 'source_url'); } catch(e){}

  ENC_ALL_ENTRIES = entries;

  // Aug 27 2026 (/Routine item #1) — runs regardless of which branch below
  // fires, so the pool stays current whether the encyclopedia is empty or not.
  try { renderReanalysisPool(); } catch(e){}

  if(!entries.length){
    encOutput.innerHTML = `<div style="text-align:center;padding:60px 20px">
      <div style="font-size:48px;margin-bottom:16px">📖</div>
      <div style="font-size:15px;color:var(--text);margin-bottom:12px;font-family:'Cinzel',serif">Your Encyclopedia is Empty</div>
      <div style="font-size:13px;color:var(--muted);line-height:2.2">
        Entries appear when you analyse videos or save Oracle chats.<br><br>
        <button onclick="syncAndPush()" style="background:var(--gold);border:none;color:#000;border-radius:6px;padding:8px 20px;font-size:13px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700">⚡ Sync &amp; Push All Reports</button>
      </div>
    </div>`;
    return;
  }

  renderEncEntries();
}

// Aug 27 2026 (/Routine item #1) — real, visible "re-analysis pool" list,
// Alex's own words: "a list I can access and choose from to revisit that I
// found interesting in the past when I'm in encyclopedia." Same 2-click
// arm/confirm dismiss pattern as intelDelete._injectBibSection's per-row
// delete. "Revisit" opens the real url in a new tab — the only honest
// action buildable from this repo (there is no button-triggerable
// re-analysis pipeline here; the real Intel script runs externally
// against a pasted URL on Alex's own machine).
async function renderReanalysisPool(){
  const holder = document.getElementById('enc-reanalysis-pool');
  if(!holder) return;
  let rows = [];
  try {
    rows = await RPGACE.sb.select('intel_reanalysis_pool', 'status=eq.pending&order=deleted_at.desc&limit=100');
    rows = Array.isArray(rows) ? rows : [];
  } catch(e){ rows = []; }

  if(!rows.length){ holder.innerHTML=''; return; }

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  holder.innerHTML = `<details style="margin-bottom:16px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;padding:10px 14px">
    <summary style="cursor:pointer;font-size:12px;font-weight:700;color:var(--gold);font-family:'Rajdhani',sans-serif;letter-spacing:.5px">🔁 RE-ANALYSIS POOL · ${rows.length} deleted extraction${rows.length===1?'':'s'}, source still there</summary>
    <div style="font-size:11px;color:var(--muted);margin:8px 0 10px">These were deleted because the extraction was wrong — the video/URL itself is untouched. Revisit any of them to reprocess with the Intel script.</div>
    <div id="enc-reanalysis-pool-rows"></div>
  </details>`;

  const rowsEl = document.getElementById('enc-reanalysis-pool-rows');
  rows.forEach(r => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);align-items:flex-start';
    row.innerHTML = `<div style="flex:1;min-width:0">
      <div style="font-size:12px;font-weight:600;color:var(--text)">${esc(r.title||'Untitled')}</div>
      <a href="${esc(r.url)}" target="_blank" rel="noopener" style="font-size:10px;color:rgba(201,168,76,.55);text-decoration:none;font-family:monospace;word-break:break-all">${esc((r.url||'').length>65?r.url.slice(0,65)+'...':r.url)}</a>
    </div>`;
    const revisit = document.createElement('button');
    revisit.textContent = '🔗 Revisit';
    revisit.style.cssText = 'background:none;border:1px solid var(--border);color:var(--gold);border-radius:5px;padding:3px 10px;font-size:11px;cursor:pointer;font-family:\'Rajdhani\',sans-serif;flex-shrink:0';
    revisit.onclick = () => { window.open(r.url, '_blank', 'noopener'); };
    const dismiss = document.createElement('button');
    dismiss.textContent = '✕';
    dismiss.title = 'Dismiss from this list';
    dismiss.style.cssText = 'background:none;border:none;color:rgba(226,84,84,.4);cursor:pointer;font-size:13px;padding:2px 6px;flex-shrink:0;font-family:\'Rajdhani\',sans-serif';
    let armed = false, busy = false;
    dismiss.onclick = () => {
      if(busy) return;
      if(!armed){
        armed = true; dismiss.textContent = '❌'; dismiss.style.color = '#CC4A4A';
        setTimeout(()=>{ if(busy) return; armed=false; dismiss.textContent='✕'; dismiss.style.color='rgba(226,84,84,.4)'; }, 3000);
        return;
      }
      busy = true; dismiss.textContent = '…';
      RPGACE.sb.secureWrite('intel_reanalysis_pool', 'update', {status:'dismissed'}, 'id=eq.'+r.id)
        .then(()=>{ renderReanalysisPool(); })
        .catch(e=>{
          busy=false; armed=false; dismiss.textContent='✕'; dismiss.style.color='rgba(226,84,84,.4)';
          if(typeof RPGACE!=='undefined' && RPGACE.utils) RPGACE.utils.toast('Dismiss FAILED: '+((e&&e.message)||'unknown error'), '#CC4A4A', 4000);
        });
    };
    row.appendChild(revisit); row.appendChild(dismiss);
    rowsEl.appendChild(row);
  });
}

async function syncAndPush(){
  const btn = event?.target;
  if(btn){ btn.disabled=true; btn.textContent='Pushing...'; }
  const result = await pushLocalToSupabase();
  if(result) alert('✓ Pushed '+result.pushed+' reports. Refreshing...');
  await syncIntelData(true);
  await refreshEncyclopediaDisplay();
  if(btn){ btn.disabled=false; btn.textContent='⚡ Sync'; }
}

// Real delete-all pattern (flagged, not silently glossed over, in the
// July 24 /Routine audit that migrated this): gated only by the
// confirm() below both before and after this migration - RLS on this
// table isn't being flipped in this pass, so today's real blast radius
// (anyone with the public anon key could already do this directly) is
// unchanged either way. No Supabase backup/PITR exists (confirmed
// separately) - this stays genuinely unrecoverable if fired.
async function clearEncyclopedia(){
  if(!confirm('Clear all encyclopedia entries from all devices?')) return;
  // Aug 27 2026 (/Routine item #1) — snapshot every real intel-sourced
  // entry BEFORE wiping, so each one's real url lands in the reanalysis
  // pool (fire-and-forget, never blocks the clear). Plain Oracle-chat
  // saves (no source_url) have nothing to reanalyze and are skipped.
  (ENC_ALL_ENTRIES || []).forEach(function(e){
    if (e && e.source_url) {
      RPGACE.utils.logReanalysisCandidate(e.source_url, e.title, 'encyclopedia', e.created_at || null, 'bad_extraction');
    }
  });
  try {
    await RPGACE.sb.secureWrite('encyclopedia', 'delete', null, 'created_at=gte.2000-01-01');
  } catch(e){}
  ENC_ALL_ENTRIES = [];
  localStorage.removeItem('rpgace_encyclopedia');
  document.getElementById('enc-output').innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px">Encyclopedia cleared.</div>';
}

const LEARN = {
  selectedVideo: null,
  db: JSON.parse(localStorage.getItem('rpgace_notes') || '[]'),
  ytKey: localStorage.getItem('rpgace_ytkey') || ''
};

function saveYTKey(){
  const val = document.getElementById('yt-api-key').value.trim();
  if(!val){ alert('Paste your YouTube API key first.'); return; }
  LEARN.ytKey = val;
  localStorage.setItem('rpgace_ytkey', val);
  setLearnStatus('search-status','✓ YouTube API key saved.','ok');
  setTimeout(()=>setLearnStatus('search-status',''),'2000');
}
function toggleYTKeyVis(){
  const i = document.getElementById('yt-api-key');
  i.type = i.type==='password' ? 'text' : 'password';
}
function initLearning(){
  if(LEARN.ytKey) document.getElementById('yt-api-key').value = LEARN.ytKey;
  renderDB(); updateDBStats();
  // Clear old string-format encyclopedia data (caused JS to render as visible text)
  const oldEnc = localStorage.getItem('rpgace_encyclopedia');
  if(oldEnc && !oldEnc.startsWith('[')) localStorage.removeItem('rpgace_encyclopedia');
  // Encyclopedia loads from Supabase via refreshEncyclopediaDisplay() on init
}

// ── 1. VIDEO SEARCH ──
async function searchVideos(){
  const query = document.getElementById('video-search-input').value.trim();
  if(!query){ alert('Enter a search topic first.'); return; }
  setLearnStatus('search-status','Searching YouTube...','loading');
  document.getElementById('search-btn').disabled = true;
  try {
    // Server-side YouTube search — no API key needed
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({query})
    });
    const data = await res.json();
    const videos = (data.videos||[]).map(v => ({
      id: v.id, title: v.title, channel: v.channel,
      thumb: v.thumb || `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`,
      views: v.views, duration: v.duration
    }));
    if(!videos.length) throw new Error('no_results');
    renderVideoResults(videos);
    setLearnStatus('search-status', `✓ Found ${videos.length} videos`, 'ok');
  } catch(e){
    // Fallback — Oracle suggests real videos by ID
    setLearnStatus('search-status', '⚡ Using AI search...', 'loading');
    try {
      const fallback = await callOracle([{role:'user', content:
        `List 6 real YouTube videos about: "${query}" that actually exist.\n\nReturn ONLY a JSON array, no explanation:\n[{"id":"REAL_VIDEO_ID","title":"Exact title","channel":"Channel name"}]\n\nFocus on music production, beats, FL Studio. Use real 11-character video IDs.`
      }], '', 600);
      const raw = fallback.content.map(c=>c.text||'').join('').replace(/```json|```/g,'').trim();
      const match = raw.match(/\[[\s\S]*?\]/);
      if(!match) throw new Error('Search unavailable');
      const videos = JSON.parse(match[0]).filter(v=>v.id?.length===11).map(v=>({
        ...v, thumb: `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`
      }));
      if(!videos.length) throw new Error('No results found');
      renderVideoResults(videos);
      setLearnStatus('search-status', `✓ ${videos.length} AI-suggested videos`, 'ok');
    } catch(e2){
      setLearnStatus('search-status', '✗ Search unavailable — paste a YouTube URL directly in Notes AI below', 'err');
    }
  }
  document.getElementById('search-btn').disabled = false;
}

function renderVideoResults(items){
  const el = document.getElementById('video-results');
  if(!items.length){ el.innerHTML='<div style="color:var(--muted);font-size:12px;padding:8px">No results found.</div>'; return; }
  el.innerHTML = '';
  items.forEach(item=>{
    const vid     = item.id?.videoId || item.id;
    const title   = (item.snippet?.title || item.title || 'Unknown').replace(/['"`]/g, ' ');
    const channel = item.snippet?.channelTitle || item.channel || '';
    const thumb   = item.snippet?.thumbnails?.medium?.url || item.thumb || `https://img.youtube.com/vi/${vid}/mqdefault.jpg`;
    const meta    = [item.duration, item.views].filter(Boolean).join(' · ');
    const card = document.createElement('div');
    card.className = 'video-card';
    card.style.cssText = 'display:flex;gap:10px;padding:10px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;margin-bottom:8px';
    card.innerHTML = `
      <img src="${thumb}" style="width:120px;height:68px;object-fit:cover;border-radius:4px;flex-shrink:0;background:var(--panel)"/>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${item.snippet?.title||item.title||'Unknown'}</div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:5px">${channel}${meta?' · '+meta:''}</div>
        <div style="display:flex;gap:6px">
          <button onclick="learnVideo('${vid}','${title}','${thumb}','${channel.replace(/'/g,"\\'")}')" style="background:var(--green);border:none;color:#000;border-radius:4px;padding:4px 10px;font-size:11px;cursor:pointer;font-weight:700;font-family:'Rajdhani',sans-serif">✓ Select</button>
          <a href="https://youtube.com/watch?v=${vid}" target="_blank" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:4px;padding:4px 8px;font-size:11px;text-decoration:none;font-family:'Rajdhani',sans-serif">▶ Watch</a>
        </div>
      </div>`;
    el.appendChild(card);
  });
}

// ── 2. NOTES AI ──
async function generateNotes(){
  if(!LEARN.selectedVideo){ alert('Select a video first.'); return; }
  const focus = '';
  setLearnStatus('notes-status','Generating AI notes...','loading');
  document.getElementById('notes-btn').disabled = true;
  document.getElementById('notes-output').value = '';

  const prompt = `You are an expert content analyst and learning coach for an aspiring music producer and content creator.

Analyse this YouTube video and generate detailed, structured notes:

Video Title: "${LEARN.selectedVideo.title}"
Channel: "${LEARN.selectedVideo.channel}"
URL: ${LEARN.selectedVideo.url}


Generate comprehensive notes covering:

## KEY CONCEPTS
List the main ideas, techniques or methods likely taught in this video based on its title and context.

## PRODUCTION / TECHNICAL METHODS
Any specific techniques, tools, workflows or technical approaches covered.

## CONTENT CREATION INSIGHTS
How this applies to YouTube, TikTok, Instagram growth or content strategy.

## ACTIONABLE STEPS
3-5 concrete things to implement immediately after watching.

## KEY QUOTES / MOMENTS TO NOTE
Important phrases or timestamps to remember (infer from title context).

## HOW THIS CONNECTS TO OTHER TOPICS
Links to related skills: mixing, marketing, performance, branding, etc.

## DIFFICULTY LEVEL & WHO IT'S FOR
Beginner / Intermediate / Advanced — and what prior knowledge helps.

Be specific, practical and detailed. Format clearly with headers. Write as if building a personal knowledge base.`;

  try{
    const data = await callOracle([{role:'user',content:prompt}],'You are a detailed, practical learning coach who creates thorough structured notes.');
    const notes = data.content.map(c=>c.text||'').join('');
    document.getElementById('notes-output').value = notes;
    const wc = notes.split(/\s+/).filter(Boolean).length;

    document.getElementById('save-notes-btn').disabled = false;
    const encBtn = document.getElementById('enc-notes-btn'); if(encBtn) encBtn.disabled = false;
    setLearnStatus('notes-status','✓ Notes generated — review and save to database','ok');
    addXP(40);
  } catch(e){
    setLearnStatus('notes-status','✗ '+e.message,'err');
  }
  document.getElementById('notes-btn').disabled = false;
}

// ── DATABASE ──
// ═══════════════════════════════════════════════
// JOURNAL — Supabase-synced conversation logs
// ═══════════════════════════════════════════════
async function saveToJournal(title, content, source='manual'){
  const date = new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  const entry = { title, content, date, source, created_at: new Date().toISOString() };

  // Push to Supabase. July 24 FROZEN-file exception: migrated to
  // RPGACE.sb.secureWrite - journal's RLS is deliberately NOT being
  // flipped in this pass (the real Morning Brief Routine writes here
  // directly with the plain anon key), but routing the app's OWN client
  // writes through the authenticated proxy is still correct for
  // consistency/dedup (rule 8) regardless of that table's RLS state.
  // Oct 15 2026: a failed save used to be silent (console only) - fail loud.
  let saved = false;
  try {
    await RPGACE.sb.secureWrite('journal', 'insert', entry);
    saved = true;
    if (RPGACE.cache) RPGACE.cache.clear('journal');
  } catch(e){
    console.log('Journal Supabase push failed:', e.message);
    RPGACE.utils.toast('⚠️ Journal entry NOT saved online: ' + (e.message || e) + ' — kept on this device only', '#CC4A4A', 6000, 'journal');
  }
  if (saved && source === 'manual') RPGACE.utils.toast('📓 Saved to Journal — it is at the top of the list', '#4CAF82', 2500);

  // Cache locally
  const existing = JSON.parse(localStorage.getItem('rpgace_journal') || '[]');
  existing.unshift(entry);
  localStorage.setItem('rpgace_journal', JSON.stringify(existing.slice(0,200)));

  refreshJournalDisplay();
}

async function quickSaveToJournal(){
  const lastReply = STATE.chatHistory.filter(m=>m.role==='assistant').slice(-1)[0]?.content || '';
  if(!lastReply){ alert('No Oracle reply to save yet.'); return; }
  const title = 'Oracle — ' + new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  // Save last exchange (user + reply)
  const lastUser = STATE.chatHistory.filter(m=>m.role==='user').slice(-1)[0]?.content || '';
  const body = (lastUser ? `**You asked:**\n${lastUser}\n\n---\n\n` : '') + `**Oracle:**\n${lastReply}`;
  await saveToJournal(title, body, 'oracle');
  // Visual feedback
  const btns = document.querySelectorAll('#chat-msgs button');
  btns.forEach(b => { if(b.textContent.includes('Save to Journal')){ b.textContent = '✓ Saved!'; b.style.color = 'var(--green)'; setTimeout(()=>{ b.textContent = '📓 Save to Journal'; b.style.color = 'var(--gold)'; }, 2000); }});
}

async function quickSaveToEncyclopedia(){
  const lastReply = STATE.chatHistory.filter(m=>m.role==='assistant').slice(-1)[0]?.content || '';
  if(!lastReply){ alert('No Oracle reply to save yet.'); return; }
  const title = 'Oracle — ' + new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  await saveOracleToEncyclopedia(title, lastReply);
  const btns = document.querySelectorAll('#chat-msgs button');
  btns.forEach(b => { if(b.textContent.includes('Save to Encyclopedia')){ b.textContent = '✓ Saved!'; b.style.color = 'var(--green)'; setTimeout(()=>{ b.textContent = '📖 Save to Encyclopedia'; b.style.color = 'var(--muted)'; }, 2000); }});
}

function openJournalEntry(){
  document.getElementById('journal-new-entry').style.display = 'block';
  document.getElementById('journal-entry-title').focus();
}

function closeJournalEntry(){
  document.getElementById('journal-new-entry').style.display = 'none';
  document.getElementById('journal-entry-title').value = '';
  document.getElementById('journal-entry-body').value = '';
}

async function saveJournalEntry(){
  const title = document.getElementById('journal-entry-title').value.trim() || ('Journal Entry — ' + new Date().toLocaleDateString());
  const content = document.getElementById('journal-entry-body').value.trim();
  if(!content){ alert('Write something first.'); return; }
  await saveToJournal(title, content, 'manual');
  closeJournalEntry();
}

async function refreshJournalDisplay(){
  const el = document.getElementById('journal-output');
  if(!el) return;
  el.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:12px">Loading...</div>';

  let entries = [];
  // Aug 27 2026 (/Routine item #1) — same fix as refreshEncyclopediaDisplay:
  // track real fetch success independent of row count, so a genuinely
  // successful fetch that correctly finds 0 rows (right after a clear)
  // never falls back to stale localStorage cache.
  let fetchSucceeded = false;
  try {
    const res = await _sbGet('/rest/v1/journal?order=created_at.desc&limit=200');
    if(res.ok){
      entries = await res.json();
      fetchSucceeded = true;
      localStorage.setItem('rpgace_journal', JSON.stringify(entries));
    }
  } catch(e){}

  if(!fetchSucceeded){
    const cached = JSON.parse(localStorage.getItem('rpgace_journal') || '[]');
    entries = cached;
  }

  const countEl = document.getElementById('journal-count');
  if(countEl) countEl.textContent = entries.length ? `${entries.length} entries` : '';

  if(!entries.length){
    el.innerHTML = `<div style="text-align:center;padding:60px 20px">
      <div style="font-size:48px;margin-bottom:16px">📓</div>
      <div style="font-size:15px;color:var(--text);margin-bottom:12px;font-family:'Cinzel',serif">Your Journal is Empty</div>
      <div style="font-size:13px;color:var(--muted);line-height:2.2">
        After every Oracle reply, click <strong style="color:var(--gold)">📓 Save to Journal</strong><br>
        or type <strong style="color:var(--gold)">"save to journal"</strong> to log a full session.<br><br>
        <button onclick="openJournalEntry()" style="background:var(--gold);border:none;color:#000;border-radius:6px;padding:8px 20px;font-size:13px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700">✏️ Write First Entry</button>
      </div>
    </div>`;
    return;
  }

  const sourceIcon = s => s==='oracle'?'🔮':s==='insta'?'📸':s==='session'?'⚡':'✏️';

  // 2026-09-10 (HABITS/Cooking, H3) - a real, small conditional addition
  // to this existing legacy renderer rather than a duplicate journal view
  // (rule 8): a saved recipe entry (entry_type='recipe', status='saved')
  // gets a real Mark Cooked button; once cooked, a badge instead. Every
  // non-recipe entry (entry_type='note', the pre-existing default) is
  // completely unaffected - both new template fragments are '' for them.
  const cookRowFor = e => {
    if (e.entry_type !== 'recipe') return '';
    if (e.status === 'cooked') {
      const d = e.cooked_at ? new Date(e.cooked_at).toLocaleDateString() : '';
      return `<div style="font-size:11px;color:var(--green);margin-top:6px">🍽 Cooked${d?(' · '+d):''}</div>`;
    }
    if (e.status === 'saved') {
      return `<button onclick="markRecipeCooked('${e.id}')" style="background:rgba(76,175,130,0.12);border:1px solid rgba(76,175,130,0.35);color:var(--green);border-radius:4px;padding:4px 10px;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif;margin-top:6px">✅ Mark Cooked</button>`;
    }
    return '';
  };

  el.innerHTML = entries.map((e,i) => {
    const preview = (e.content||'').slice(0,200).replace(/\*\*/g,'').replace(/\n/g,' ');
    const id = `jentry-${i}`;
    return `<div style="background:var(--panel2);border:1px solid var(--border);border-left:3px solid var(--gold);border-radius:10px;padding:16px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:8px;flex-wrap:wrap">
        <div>
          <div style="font-family:'Cinzel',serif;font-size:13px;color:var(--gold);font-weight:600">${e.entry_type==='recipe'?'🍳 ':''}${e.title||'Journal Entry'}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${sourceIcon(e.source)} ${e.source||'manual'} · 📅 ${e.date||''}</div>
        </div>
        <button onclick="deleteJournalEntry('${e.id||e.created_at}')" style="background:none;border:none;color:var(--muted);font-size:13px;cursor:pointer;padding:2px 6px" title="Delete">🗑</button>
      </div>
      <div id="${id}-preview" style="font-size:12px;color:var(--muted);line-height:1.7;margin-bottom:8px">${preview}${(e.content||'').length>200?'...':''}</div>
      <div id="${id}-full" style="display:none;font-size:13px;color:var(--text);line-height:1.8;white-space:pre-wrap;margin-bottom:8px">${e.content||''}</div>
      <button onclick="toggleJournalEntry('${id}')" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:4px;padding:3px 10px;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif">▼ Expand</button>
      ${cookRowFor(e)}
    </div>`;
  }).join('');
}

// 2026-09-10 (HABITS/Cooking, H3) - real global onclick handler, same
// convention as deleteJournalEntry/toggleJournalEntry above. Thin wrapper
// delegating to cookingOracle.logic (module code, not legacy) so the
// actual write logic lives with the rest of the Cooking module (rule 8),
// not duplicated here.
function markRecipeCooked(journalId){
  var m = RPGACE.modules.cookingOracle;
  if (!m || !m.logic || !m.logic._markCooked) return;
  m.logic._markCooked(journalId, function(err){
    if (err) { RPGACE.utils.toast('⚠️ ' + err, '#CC4A4A', 4000); return; }
    RPGACE.utils.toast('🍽 Marked cooked', '#4caf82', 2200);
    if (typeof refreshJournalDisplay === 'function') refreshJournalDisplay();
  });
}

function toggleJournalEntry(id){
  const preview = document.getElementById(id+'-preview');
  const full    = document.getElementById(id+'-full');
  const btn     = full.nextElementSibling;
  if(full.style.display === 'none'){
    full.style.display = 'block';
    preview.style.display = 'none';
    btn.textContent = '▲ Collapse';
  } else {
    full.style.display = 'none';
    preview.style.display = 'block';
    btn.textContent = '▼ Expand';
  }
}

async function deleteJournalEntry(id){
  if(!confirm('Delete this journal entry?')) return;
  // Remove from Supabase if it has a UUID
  if(id && id.includes('-') && id.length > 20){
    try {
      await RPGACE.sb.secureWrite('journal', 'delete', null, 'id=eq.' + id);
    } catch(e){}
  }
  // Remove from localStorage
  const existing = JSON.parse(localStorage.getItem('rpgace_journal') || '[]');
  const filtered = existing.filter(e => (e.id||e.created_at) !== id);
  localStorage.setItem('rpgace_journal', JSON.stringify(filtered));
  refreshJournalDisplay();
}

// Same real delete-all pattern/blast-radius note as clearEncyclopedia
// above - migrated mechanically, RLS not flipped on this table.

// PC-6 (Oct 17 2026): the Upload Workshop (runVideoWorkshop and its save buttons) is retired.

// ═══════════════════════════════════════════════
// CONTENT INTELLIGENCE — AUTO SYNC + SUBMIT
// ═══════════════════════════════════════════════
// July 24 FROZEN-file exception (logged, /Routine interconnection debate,
// Alex-confirmed): this is a second hardcoded copy of rpgace_core.js's
// own Supabase URL+key (rule 8a) - still needed here for this file's
// remaining GET/select calls, which stay on the anon key. All real
// WRITE (POST/PATCH/DELETE) calls below were migrated to
// RPGACE.sb.secureWrite() (the same authenticated write-proxy
// rpgace_core.js already uses) per a real audit that found this file
// was the sole real writer for journal/rpgace_agendas/intel_jobs/
// encyclopedia_insights - a prior "zero real client write call sites"
// doc claim was wrong because it only ever grepped rpgace_core.js.
const SUPABASE_URL = 'https://gripopghczmrbrhqtqbm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0Z8C5X-FOLrw95VYKxZVCw_4golMyXf';
// Real dedup fix (Aug 6, /paranoia pass on main.js): 15 call sites across
// this file each hand-rolled the identical fetch+header boilerplate below
// (the "4th Supabase-write-idiom" landmine CLAUDE.md already flagged, here
// on the read side). One shared helper now — pure boilerplate consolidation,
// zero behavior change: still returns the raw Response, so every caller's
// existing .ok/.json()/error handling works exactly as before. A `function`
// declaration (hoisted), not `const`, so it's callable from call sites that
// appear earlier in the file than this definition, same as SUPABASE_URL/KEY
// already had to be (those consts are only read once a function body runs,
// well after the whole script has parsed).
function _sbGet(pathAndQuery){
  return fetch(SUPABASE_URL + pathAndQuery, {headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY}});
}
const LOCAL_SERVER = 'http://localhost:7842';
let INTEL_POLL_INTERVAL = null;
let JOB_POLL_INTERVAL   = null;
let SERVER_ONLINE       = false;

// ── QUEUE STATUS — read from the intel_jobs queue ──
// Oct 15 2026 (Alex: "this looks off"): the old check showed a green
// "Ready" whenever Supabase answered, whether or not anything could
// process a video. The queue is drained by the cloud runner every 10
// minutes (.github/workflows/intel-queue.yml, since Oct 11) and by the
// laptop's local_server.py when it is running, so the honest status is
// what the queue itself shows: waiting, analysing, stuck, or idle.
const INTEL_STUCK_MIN = 45; // the cloud run's own timeout
function _intelAgo(iso){
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if(m < 1) return 'just now';
  if(m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  if(h < 48) return h + ' h ago';
  return Math.round(h / 24) + ' days ago';
}
function _intelCcText(j){
  const o = RPGACE.modules && RPGACE.modules.orchestratorCC;
  const w = o && o.logic && o.logic.waiting ? o.logic.waiting(j.awaiting_since || j.created_at) : null;
  return w ? w.text.replace(/^⏳ /, '') : 'Waiting for Orchestrator CC';
}
function _intelQueueState(jobs){
  const now = Date.now();
  const queued = jobs.filter(j => j.status === 'queued');
  const proc = jobs.filter(j => j.status === 'processing' || j.status === 'downloading');
  const stuck = proc.filter(j => now - new Date(j.created_at).getTime() > INTEL_STUCK_MIN * 60000);
  const done = jobs.filter(j => j.status === 'complete')[0];
  const held = jobs.filter(j => j.status === 'awaiting_realms');
  // CC-1 (Oct 21 2026): transcript + frames done, waiting for Orchestrator CC (the 🤖 switch)
  const cc = jobs.filter(j => j.status === 'awaiting_cc');
  if(cc.length && !proc.length && !queued.length) return { color:'var(--gold)', text:'🤖 ' + cc.length + ' video' + (cc.length>1?'s':'') + ' — ' + _intelCcText(cc[0]) };
  if(held.length && !proc.length && !queued.length) return { color:'var(--gold)', text:'🎯 ' + held.length + ' video' + (held.length>1?'s':'') + ' waiting for you to pick realms' };
  if(stuck.length) return { color:'var(--gold)', text:'⚠️ ' + stuck.length + ' video' + (stuck.length>1?'s':'') + ' stuck since ' + _intelAgo(stuck[0].created_at) + ' — use Retry below' };
  if(proc.length) return { color:'var(--green)', text:'⚡ Analysing ' + proc.length + ' video' + (proc.length>1?'s':'') + ' now' };
  if(queued.length) return { color:'var(--gold)', text:'⏳ ' + queued.length + ' waiting — the cloud checks every 10 min' };
  return { color:'var(--green)', text:'✅ Ready' + (done ? ' — last analysed ' + _intelAgo(done.created_at) : '') };
}
async function checkServerStatus(){
  const dot   = document.getElementById('intel-server-dot');
  const label = document.getElementById('intel-server-label');
  try {
    const res = await _sbGet('/rest/v1/intel_jobs?select=id,status,created_at,awaiting_since&order=created_at.desc&limit=30');
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const st = _intelQueueState(await res.json());
    SERVER_ONLINE = true;
    if(dot) dot.style.background = st.color;
    if(label){ label.textContent = st.text; label.style.color = st.color; }
  } catch(e){
    SERVER_ONLINE = false;
    if(dot) dot.style.background = 'var(--red)';
    if(label){ label.textContent = '❌ Can\'t reach the video queue — check your connection'; label.style.color = 'var(--red)'; }
  }
  return SERVER_ONLINE;
}

// One readable line for a failed job; the full message stays in the tooltip.
function _intelErrorText(j){
  const e = String(j.error || '');
  if(/No video formats found/i.test(e) && /instagram/i.test(e + ' ' + (j.url||''))) return 'Instagram gave no video — it may be a photo post, or Instagram blocked the download. Try the reel link.';
  if(/Sign in to confirm|not a bot/i.test(e)) return 'YouTube blocked the cloud download — it will work from your PC (start_server.bat).';
  const first = e.replace(/^Error:\s*/,'').split(/[;\n]/)[0];
  return first.length > 140 ? first.slice(0,140) + '…' : first;
}
// Put a failed or stuck job back in the queue.
async function retryIntelJob(id){
  try {
    await RPGACE.sb.secureWrite('intel_jobs', 'update', { status:'queued', progress:null, error:null }, 'id=eq.' + id);
    RPGACE.utils.toast('🔁 Back in the queue — the cloud checks every 10 min', '#4CAF82', 3000);
    startJobPolling(id); pollJobs(); checkServerStatus();
  } catch(e){ RPGACE.utils.toast('⚠️ Retry failed: ' + e.message, '#CC4A4A', 4000); }
}

// ── SUBMIT URL — via Supabase job queue ──
async function submitIntelURL(){
  const input = document.getElementById('intel-url-input');
  // SA-1 (Oct 27 2026): one box for anything - a video link, a web page
  // link, or pasted text (shareInbox.logic.source decides which).
  const src = RPGACE.modules.shareInbox.logic.source({ text: input?.value || '' });
  if(!src){ alert('Paste a link, or a few sentences of text.'); return; }
  const url = src.url;

  const btn = document.getElementById('intel-submit-btn');
  if(btn){ btn.disabled = true; btn.textContent = '\u23F3 Checking...'; }

  try {
    // Guard: check for an existing pending/processing job with this exact URL
    // before inserting a new one - prevents wasting a full transcription+analysis
    // cycle on an accidental double-submit.
    const checkRes = await _sbGet(`/rest/v1/intel_jobs?url=eq.${encodeURIComponent(url)}&status=in.(queued,processing,awaiting_realms,awaiting_cc)&select=id,status`);
    const existing = checkRes.ok ? await checkRes.json() : [];
    if(existing.length > 0){
      alert('This URL is already ' + existing[0].status + '. Check the Insights tab - it should appear shortly.');
      if(btn){ btn.disabled = false; btn.textContent = '\u26A1 Analyse'; }
      return;
    }

    // RI-2: always ask which realms this video is for.
    if(btn) btn.textContent = '\u23F3 Pick realms...';
    const realms = await RPGACE.realmPicker.pick({ what: RPGACE.modules.shareInbox.logic.whatOf(url), title: src.text ? src.text.slice(0, 80) : url });
    if(btn) btn.textContent = '\u23F3 Queuing...';

    // Submit job to Supabase — local server picks it up automatically
    // July 24 FROZEN-file exception: migrated to RPGACE.sb.secureWrite,
    // which already resolves to the parsed row data and throws its own
    // real error on failure - the manual !res.ok check is gone since
    // there is no longer a raw Response to check.
    // RI-3: "Not now" holds the job until realms are picked.
    const row = {url, status: realms ? 'queued' : 'awaiting_realms', realms: realms || []};
    if(src.text) row.text = src.text;
    const data = await RPGACE.sb.secureWrite('intel_jobs', 'insert', row);

    const jobId = Array.isArray(data) ? data[0]?.id : data?.id;
    input.value = '';
    showIntelTab('insights');

    // Show queued state
    const jobsEl = document.getElementById('intel-jobs');
    if(jobsEl) jobsEl.innerHTML = `<div style="background:var(--panel2);border:1px solid var(--gold)33;border-left:3px solid var(--gold);border-radius:6px;padding:10px 14px;margin-bottom:8px">
      <div style="font-size:12px;color:var(--text)">${RPGACE.utils.escapeHtml ? RPGACE.utils.escapeHtml((src.text || url).slice(0,60)) : (src.text || url).slice(0,60).replace(/[<>&]/g,'')}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px">\u23F3 Queued — analysed within about 10 minutes</div>
    </div>`;

    // Start polling Supabase for job updates
    startJobPolling(jobId);

  } catch(e){
    alert('Submit failed: ' + e.message);
  }

  if(btn){ btn.disabled = false; btn.textContent = '\u26A1 Analyse'; }
}

// ── JOB TRACKING ──
let TRACKED_JOBS = {};

function startJobPolling(jobId){
  if(jobId) TRACKED_JOBS[jobId] = true;
  if(JOB_POLL_INTERVAL) return; // already polling
  JOB_POLL_INTERVAL = setInterval(pollJobs, 3000);
}

async function pollJobs(){
  try {
    // Poll Supabase for job status updates
    const res = await _sbGet('/rest/v1/intel_jobs?order=created_at.desc&limit=10');
    if(!res.ok) return;
    const jobs = await res.json();

    const activeJobs = jobs.filter(j => j.status !== 'cancelled');
    renderJobs(activeJobs);

    // CC-1: a job handed to Orchestrator CC finishes hours later - stop
    // polling for it (the report is picked up on the next app load/sync).
    activeJobs.forEach(j => { if(j.status === 'awaiting_cc') delete TRACKED_JOBS[j.id]; });

    // If any tracked job just completed, sync intel data
    const justDone = activeJobs.filter(j => j.status === 'complete' && TRACKED_JOBS[j.id]);
    if(justDone.length > 0){
      justDone.forEach(j => delete TRACKED_JOBS[j.id]);
      await syncIntelData(false);
      // Auto-save latest insight to encyclopedia
      const insights = JSON.parse(localStorage.getItem('rpgace_intel_insights')||'[]');
      if(insights.length > 0){
        const latest = insights[0];
        const enc = latest.insights?.encyclopedia_entry||{};
        if(enc.title){
          const content = `## ${enc.title}\n\n**Source:** ${latest.title} by ${latest.creator}\n**Score:** ${latest.score}/10\n\n### Summary\n${enc.summary||''}\n\n### Key Learnings\n${enc.key_learnings?.map(l=>'- '+l).join('\n')||''}\n\n### Production Techniques\n${(latest.insights?.production_techniques||[]).map(t=>'- '+t).join('\n')}\n\n### What To Apply\n${(latest.insights?.what_to_steal||[]).map(s=>'→ '+s).join('\n')}\n\n### Tags\n${enc.tags?.join(', ')||''}`;
          await saveOracleToEncyclopedia(enc.title, content);
        }
      }
      addXP(100);
      showXPToast(100);
    }

    // Stop polling if nothing active
    const stillActive = activeJobs.filter(j => ['queued','processing'].includes(j.status));
    if(stillActive.length === 0 && Object.keys(TRACKED_JOBS).length === 0){
      clearInterval(JOB_POLL_INTERVAL);
      JOB_POLL_INTERVAL = null;
    }
  } catch(e){}
}

function renderJobs(jobs){
  const el = document.getElementById('intel-jobs');
  if(!el || jobs.length === 0){ if(el) el.innerHTML=''; return; }

  const stuckIds = {};
  jobs.forEach(j => { if((j.status==='processing'||j.status==='downloading') && Date.now() - new Date(j.started_at||j.created_at).getTime() > INTEL_STUCK_MIN*60000) stuckIds[j.id] = true; }); // VW-0: started_at = when a runner took it
  el.innerHTML = jobs.map(j => {
    const statusColor = j.status==='complete' ? 'var(--green)' : j.status==='error' ? 'var(--red)' : 'var(--gold)';
    const statusIcon  = j.status==='complete' ? '✓' : j.status==='error' ? '✗' : j.status==='processing' ? '⚡' : j.status==='awaiting_realms' ? '🎯' : j.status==='awaiting_cc' ? '🤖' : '⏳';
    const dots = j.status==='processing'||j.status==='downloading' ? '<span class="loading-dots">...</span>' : '';
    return `<div style="background:var(--panel2);border:1px solid ${statusColor}33;border-left:3px solid ${statusColor};border-radius:6px;padding:10px 14px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${j.url?.slice(0,55)||'Processing...'}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${j.status==='awaiting_cc' ? _intelCcText(j) : (j.progress||'')}${dots}</div>
        </div>
        <div style="font-size:13px;font-weight:700;color:${statusColor};margin-left:12px">${statusIcon}</div>
      </div>
      ${j.status==='error' ? `<div style="font-size:12px;color:var(--red);margin-top:4px" title="${String(j.error||'').replace(/"/g,'&quot;').replace(/</g,'&lt;')}">✗ ${_intelErrorText(j).replace(/</g,'&lt;')}</div>` : ''}
      ${j.status==='awaiting_realms' ? `<button class="learn-btn intel-realms" style="margin-top:6px;min-height:44px" onclick="RPGACE.realmPicker.askHeld()">🎯 Pick realms to analyse it</button>` : ''}
      ${(j.status==='error' || (stuckIds[j.id])) ? `<button class="learn-btn intel-retry" style="margin-top:6px;min-height:36px" onclick="retryIntelJob('${j.id}')">🔁 Retry</button>` : ''}
    </div>`;
  }).join('');
}

async function fetchFromSupabase(){
  try {
    const res = await _sbGet('/rest/v1/intel_reports?order=created_at.desc&limit=50');
    if(!res.ok) return null;
    return (await res.json()).map(r=>({...r,date:r.created_at,source:'supabase'}));
  } catch(e){ return null; }
}

async function fetchFromLocal(){
  try {
    const res = await fetch(`${LOCAL_SERVER}/reports`,{signal:AbortSignal.timeout(3000)});
    if(!res.ok) return null;
    const data = await res.json();
    // Local server serves actual JSON files from strategy folder
    return (data.reports||[]).map(r=>({
      url: r.url, title: r.title, creator: r.creator,
      platform: r.platform, score: r.score,
      date: r.date||new Date().toISOString(),
      insights: r.insights,
      transcript_snippet: r.transcript_snippet,
      source: 'local'
    }));
  } catch(e){ return null; }
}

async function pushLocalToSupabase(){
  // Tell the local server to push all local files to Supabase
  try {
    const res = await fetch(`${LOCAL_SERVER}/push-to-supabase`,{signal:AbortSignal.timeout(30000)});
    const data = await res.json();
    return data;
  } catch(e){ return null; }
}

async function fetchWatchlistFromSupabase(){
  try {
    const res = await _sbGet('/rest/v1/intel_watchlist?order=created_at.desc&limit=100');
    if(!res.ok) return null;
    return await res.json();
  } catch(e){ return null; }
}

async function fetchWatchlistFromLocal(){
  try {
    const res = await fetch(`${LOCAL_SERVER}/watchlist`,{signal:AbortSignal.timeout(2000)});
    if(!res.ok) return null;
    return (await res.json()).watchlist||[];
  } catch(e){ return null; }
}

function mergeByUrl(primary,secondary){
  const seen=new Set(primary.map(r=>r.url));
  const merged=[...primary];
  for(const r of secondary) if(!seen.has(r.url)){merged.push(r);seen.add(r.url);}
  return merged.sort((a,b)=>new Date(b.date||b.created_at||0)-new Date(a.date||a.created_at||0));
}

async function syncIntelData(showStatus=false){
  const statusEl=document.getElementById('intel-sync-status');
  if(showStatus&&statusEl) statusEl.innerHTML='<span style="color:var(--muted)">🔄 Syncing...</span>';

  // Try local server first (reads actual JSON files — always works if server is running)
  let reports = await fetchFromLocal();
  let source = 'local';

  // Also try Supabase and merge
  const sbReports = await fetchFromSupabase();
  if(sbReports && sbReports.length > 0){
    reports = mergeByUrl(sbReports, reports||[]);
    source = 'supabase';
  } else if(!reports || reports.length === 0){
    // Fall back to localStorage cache
    reports = JSON.parse(localStorage.getItem('rpgace_intel_insights')||'[]');
    source = 'cache';
  }

  // Merge with localStorage cache
  const cached = JSON.parse(localStorage.getItem('rpgace_intel_insights')||'[]');
  let all = mergeByUrl(reports||[], cached);

  // Aug 27 2026 (/Routine item #1, "delete doesn't stick") — drop any
  // report that's the same age or older than a real deletion Alex made
  // (local_server.py's own files have no concept of that deletion, so
  // this merge would otherwise silently bring it straight back every
  // 30s). A genuinely newer reanalysis of the same URL still passes
  // through untouched — see RPGACE.utils.filterReanalysisSuppressed.
  try { all = await RPGACE.utils.filterReanalysisSuppressed(all); } catch(e) {}

  // Watchlist
  let wl = await fetchWatchlistFromSupabase();
  if(!wl||wl.length===0) wl = await fetchWatchlistFromLocal();
  const localWl = JSON.parse(localStorage.getItem('rpgace_intel_watchlist')||'[]');
  // Also build watchlist from high-scoring reports
  const autoWl = all.filter(r=>(r.score||0)>=7).map(r=>({
    url:r.url, title:r.title, creator:r.creator,
    platform:r.platform, score:r.score,
    reason:r.insights?.watchlist_reason||'Scored '+r.score+'/10',
    date:r.date||r.created_at
  }));
  const allWl = mergeByUrl(wl||[], mergeByUrl(autoWl, localWl));

  // Cache everything
  if(all.length)  localStorage.setItem('rpgace_intel_insights',  JSON.stringify(all.slice(0,200)));
  if(allWl.length) localStorage.setItem('rpgace_intel_watchlist', JSON.stringify(allWl.slice(0,100)));

  if(showStatus&&statusEl){
    const srcLabel = source==='supabase'?'☁️ Supabase':source==='local'?'💻 Local files':'📱 Cache';
    statusEl.innerHTML=`<span style="color:var(--green)">✓ ${srcLabel} — ${all.length} reports · ${allWl.length} watchlist</span>`;
  }

  loadIntelInsights();
  loadIntelWatchlist();
  showIntelTab('insights');

  // Oct 10 2026 — replaced the old "newest 5 reports, localStorage-gated" auto-save
  // (it never re-saved after the encyclopedia wipe, so 37 finished articles never
  // landed). One pipeline now: encyclopediaPosts.ensureArticles() turns every
  // report into an article + idea cards, deduped against Supabase itself.
  if(RPGACE.modules.encyclopediaPosts) RPGACE.modules.encyclopediaPosts.ensureArticles();

  const statsEl=document.getElementById('intel-stats');
  if(statsEl){
    const scores=all.map(r=>r.score||0).filter(Boolean);
    const avg=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1):0;
    statsEl.innerHTML=`<span style="color:var(--gold)">📊 ${all.length} analysed</span> · <span style="color:var(--purple)">⭐ ${allWl.length} watchlist</span> · <span style="color:var(--green)">avg ${avg}/10</span>`;
  }
  return all;
}

function startIntelPolling(){
  syncIntelData(false);
  checkServerStatus();
  if(INTEL_POLL_INTERVAL) clearInterval(INTEL_POLL_INTERVAL);
  // Oct 27 2026 (FL-2): the full sync (all reports + watchlist, localStorage
  // rewrite, list redraw, Encyclopedia check) took ~0.7s and ran every 30s on
  // every page — about 300 recorded freezes a week. It only repeats now while
  // its insights list is on screen and the tab is visible; a finished video
  // job still syncs straight away (pollJobs) and articles are still made once
  // per load (encyclopediaPosts boot task).
  INTEL_POLL_INTERVAL = setInterval(()=>{
    if(document.hidden) return;
    const list=document.getElementById('intel-insights-content');
    if(!list || list.offsetParent===null) return;
    syncIntelData(false);
    checkServerStatus();
  }, 30000);
}

function showIntelTab(tab){
  ['setup','watchlist','insights'].forEach(t=>{
    const el=document.getElementById('intel-tab-'+t);
    if(el) el.style.display=t===tab?'block':'none';
  });
  if(tab==='watchlist') loadIntelWatchlist();
  if(tab==='insights') loadIntelInsights();
}

function loadIntelInsights(){
  const insights=JSON.parse(localStorage.getItem('rpgace_intel_insights')||'[]');
  const el=document.getElementById('intel-insights-content');
  if(!el) return;
  if(insights.length===0){
    el.innerHTML='<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px">No insights yet.<br><br>Run the Intel script and paste a URL.<br>Reports appear here automatically within 30 seconds.</div>';
    return;
  }
  el.innerHTML=insights.map((i,idx)=>{
    const score=i.score||0;
    const bar='█'.repeat(score)+'░'.repeat(10-score);
    const enc=i.insights?.encyclopedia_entry||{};
    const src=i.source==='supabase'?'<span style="font-size:10px;color:var(--blue);margin-left:6px">☁️</span>':i.source==='local'?'<span style="font-size:10px;color:var(--green);margin-left:6px">💻</span>':'';
    return `<div style="background:var(--panel2);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--text)">${i.title||'Unknown'}${src}</div>
        <div style="font-size:11px;color:var(--muted)">${i.creator||''} · ${i.platform||''} · ${new Date(i.date||i.created_at).toLocaleDateString()}</div></div>
        <div style="text-align:right;margin-left:12px"><div style="font-size:18px;font-weight:700;color:${score>=7?'var(--green)':score>=5?'var(--gold)':'var(--red)'}">${score}/10</div>
        <div style="font-size:10px;color:var(--muted);font-family:monospace">${bar}</div></div>
      </div>
      <div style="font-size:12px;color:var(--gold2);margin-bottom:8px;font-style:italic">"${i.insights?.verdict_summary||''}"</div>
      ${enc.key_learnings?'<div style="font-size:12px;color:var(--muted)">'+enc.key_learnings.slice(0,3).map(l=>`• ${l}`).join('<br>')+'</div>':''}
      <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
        <button onclick="saveIntelToEncyclopedia(${idx})" style="background:none;border:1px solid var(--border);color:var(--text);border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif">📖 Encyclopedia</button>
        ${i.url?`<a href="${i.url}" target="_blank" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:4px;padding:3px 8px;font-size:11px;text-decoration:none;font-family:'Rajdhani',sans-serif">🔗 Original</a>`:''}
      </div></div>`;
  }).join('');
}

function loadIntelWatchlist(){
  const wl=JSON.parse(localStorage.getItem('rpgace_intel_watchlist')||'[]');
  const el=document.getElementById('intel-watchlist-content');
  if(!el) return;
  if(wl.length===0){el.innerHTML='<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px">Watchlist empty — videos scoring 7+ added automatically.</div>';return;}
  el.innerHTML=wl.map(w=>{
    const score=w.score||0;
    const bar='█'.repeat(score)+'░'.repeat(10-score);
    return `<div style="background:var(--panel2);border:1px solid rgba(139,92,246,.3);border-radius:8px;padding:12px;margin-bottom:10px;display:flex;gap:12px;align-items:center">
      <div style="font-size:20px;font-weight:700;color:var(--purple);min-width:32px;text-align:center">${score}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${w.title||'Unknown'}</div>
        <div style="font-size:11px;color:var(--muted)">${w.creator||''} · ${w.platform||''}</div>
        <div style="font-size:11px;color:var(--muted);font-style:italic">${w.reason||''}</div>
        <div style="font-size:10px;font-family:monospace;color:var(--purple);margin-top:2px">${bar}</div>
      </div>
      ${w.url?`<a href="${w.url}" target="_blank" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:4px;padding:3px 8px;font-size:11px;text-decoration:none;white-space:nowrap;font-family:'Rajdhani',sans-serif">▶ Watch</a>`:''}
    </div>`;
  }).join('');
}

function importIntelJSON(){
  const jsonStr=prompt('Paste Intel JSON here (fallback — only if auto-sync not working):');
  if(!jsonStr) return;
  try {
    const data=JSON.parse(jsonStr);
    const reports=Array.isArray(data)?data:[data];
    const existing=JSON.parse(localStorage.getItem('rpgace_intel_insights')||'[]');
    const wl=JSON.parse(localStorage.getItem('rpgace_intel_watchlist')||'[]');
    reports.forEach(r=>{existing.unshift(r);if((r.score||0)>=7)wl.unshift({url:r.url,title:r.title,creator:r.creator,platform:r.platform,score:r.score,reason:r.insights?.watchlist_reason||'',date:new Date().toISOString()});});
    localStorage.setItem('rpgace_intel_insights',JSON.stringify(existing.slice(0,200)));
    localStorage.setItem('rpgace_intel_watchlist',JSON.stringify(wl.slice(0,100)));
    loadIntelInsights();loadIntelWatchlist();
    alert(`✓ Imported ${reports.length} report(s).`);
  } catch(e){alert('Invalid JSON.');}
}

function saveIntelToEncyclopedia(index){
  const insights=JSON.parse(localStorage.getItem('rpgace_intel_insights')||'[]');
  const item=insights[index]; if(!item) return;
  const enc=item.insights?.encyclopedia_entry||{};
  const content=`## ${enc.title||item.title}\n\n**Source:** ${item.title} by ${item.creator} (${item.platform})\n**Score:** ${item.score}/10\n**Date:** ${new Date(item.date||item.created_at).toLocaleDateString()}\n\n### Summary\n${enc.summary||''}\n\n### Key Learnings\n${enc.key_learnings?.map(l=>'- '+l).join('\n')||''}\n\n### Production Techniques\n${(item.insights?.production_techniques||[]).map(t=>'- '+t).join('\n')}\n\n### What To Apply\n${(item.insights?.what_to_steal||[]).map(s=>'→ '+s).join('\n')}\n\n### Tags\n${enc.tags?.join(', ')||''}`;
  // Aug 27 2026 (/Routine item #1) — pass the real source url through so
  // this entry can enter the reanalysis pool if later deleted.
  saveOracleToEncyclopedia(enc.title||item.title, content, item.url);
  // Switch to encyclopedia tab to show it
  const encTab = document.querySelector('[onclick*="encyclopedia"]');
  if(encTab) showPage('encyclopedia', encTab);
  else alert('✓ Saved to Encyclopedia — check the Encyclopedia tab.');
}

function extractTopic(title){
  const topics = ['mixing','mastering','production','marketing','branding','youtube','tiktok','instagram','songwriting','beats','sampling','plugins','workflow','mindset','business','social media','content','editing','thumbnail','SEO'];
  const t = title.toLowerCase();
  return topics.find(tp=>t.includes(tp)) || 'general';
}

function renderDB(filter=''){
  const el = document.getElementById('db-list');
  if(!el) return;
  const items = filter ? LEARN.db.filter(n=>n.videoTitle.toLowerCase().includes(filter.toLowerCase())||n.topic.includes(filter.toLowerCase())) : LEARN.db;
  if(!items.length){
    el.innerHTML = `<div style="color:var(--muted);font-size:13px;padding:12px;text-align:center">${filter?'No matching notes found.':'No notes saved yet.'}</div>`;
    return;
  }
  el.innerHTML = '';
  items.forEach(entry=>{
    const d = document.createElement('div');
    d.className = 'db-item';
    d.innerHTML = `
      <div class="db-item-info">
        <div class="db-item-title">🎬 ${entry.videoTitle}</div>
        <div class="db-item-meta">${entry.channel} · ${entry.wordCount} words · ${entry.savedAt} · <span style="color:var(--gold);text-transform:uppercase;font-size:10px">${entry.topic}</span></div>
      </div>
      <div class="db-item-actions">
        <button class="db-btn" onclick="loadNote(${entry.id})">Load</button>
        <a href="${entry.url}" target="_blank"><button class="db-btn">Watch</button></a>
        <button class="db-btn del" onclick="deleteNote(${entry.id})">✕</button>
      </div>`;
    el.appendChild(d);
  });
}

// Aug 23 2026 (UI2) - two real fixes in one, both evidence-backed:
//
// 1. NAVIGATION. The last real step used to be
//    `showPage('learning', document.querySelector('.nav-tab:nth-child(7)'))`
//    - an UNCONDITIONAL jump to the Research Lab page, which is now retired.
//    showPage() has no null guard on its own getElementById('page-'+name), so
//    this would have thrown outright. It now opens the Videoworm panel as its
//    own popup (the real new home of this notes sub-view's content), via the
//    same shared helper every other worm button uses. The second argument was
//    already dead on its own terms: the .nav-tab bar it queried was removed
//    July 20 2026, so it has been passing null for a long time.
//
// 2. DEFENSIVE ELEMENT LOOKUPS. Direct grep evidence (not assumed): NONE of
//    #notes-output / #save-notes-btn / #db-list / #notes-selected-info /
//    #notes-video-url / #notes-status exist anywhere in index.html any more -
//    the notes sub-view's markup was removed at some earlier point without
//    this handler being cleaned up. That means renderDB() already returns
//    early (no #db-list), so the "Load" button this function backs is never
//    actually rendered today; and if it somehow were, the two UNGUARDED
//    lookups below would have thrown before ever reaching the navigation bug
//    above. Both are now guarded in exactly the style the other two lookups
//    in this same function already used, so the function degrades honestly
//    instead of throwing - and still works correctly if that markup returns.
function loadNote(id){
  const entry = LEARN.db.find(n=>n.id===id);
  if(!entry) return;
  LEARN.selectedVideo = {id:entry.videoId, title:entry.videoTitle, thumb:entry.thumb, channel:entry.channel, url:entry.url};
  const out = document.getElementById('notes-output');
  if(out) out.value = entry.notes;
  const info = document.getElementById('notes-selected-info');
  if(info){ info.textContent = '✓ '+entry.videoTitle; info.style.display='block'; }
  const urlEl = document.getElementById('notes-video-url');
  if(urlEl) urlEl.value = entry.url||'';
  const saveBtn = document.getElementById('save-notes-btn');
  if(saveBtn) saveBtn.disabled = false;
  const dd = window.RPGACE && RPGACE.modules && RPGACE.modules.dashDeck;
  // Aug 31 2026 (UI11) — navigates to the real #page-videoworm instead of a
  // transient popup (dashDeck._openPage, PAGE_PANELS).
  if(dd && dd._openPage) dd._openPage('file-analyzer-panel');
  setLearnStatus('notes-status',`✓ Loaded notes for "${entry.videoTitle}"`,'ok');
}

function deleteNote(id){
  if(!confirm('Delete this note?')) return;
  LEARN.db = LEARN.db.filter(n=>n.id!==id);
  localStorage.setItem('rpgace_notes', JSON.stringify(LEARN.db));
  renderDB();
  updateDBStats();
}

// ── 3. ENCYCLOPEDIA ──
async function compileEncyclopedia(){
  if(!LEARN.db.length){ alert('Save at least one set of notes first.'); return; }
  setLearnStatus('enc-status','Compiling encyclopedia...','loading');
  document.getElementById('enc-output').innerHTML = '<div style="color:var(--muted);padding:16px">AI is reading all your notes and organising them into an encyclopedia...</div>';

  const allNotes = LEARN.db.map((n,i)=>`--- NOTE ${i+1}: "${n.videoTitle}" (${n.topic}) ---\n${n.notes}`).join('\n\n');
  const topics = [...new Set(LEARN.db.map(n=>n.topic))];

  const prompt = `You are compiling a personal creator encyclopedia from study notes.

Here are all the saved notes (${LEARN.db.length} videos studied):

${allNotes.slice(0, 12000)}

Topics covered: ${topics.join(', ')}

Create a well-structured encyclopedia with these sections:

1. A brief intro paragraph summarising the knowledge base
2. A TABLE OF CONTENTS with anchor links (use format #section-name)
3. For each major topic group, create a section with:
   - Section header (##)
   - Key concepts explained
   - Methods and techniques
   - Bullet point summaries
   - [→ See notes: Video Title] links for reference
4. A QUICK REFERENCE section at the end with the most actionable tips

Format using HTML for rich display:
- Use <h2 id="section-name"> for main sections
- Use <h3> for subsections  
- Use <ul><li> for lists
- Use <a href="#section-name" class="tag-link">topic</a> for cross-links
- Use <strong> for key terms
- Keep it scannable and practical

This is a personal knowledge base for an aspiring music producer and content creator.`;

  try{
    const data = await callOracle([{role:'user',content:prompt}],'You are a knowledge organiser creating a structured encyclopedia. Output clean HTML only, no markdown code fences.');
    const html = data.content.map(c=>c.text||'').join('').replace(/```html|```/g,'');
    document.getElementById('enc-output').innerHTML = html;
    LEARN.encyclopedia = html;
    localStorage.setItem('rpgace_encyclopedia', html);
    setLearnStatus('enc-status','✓ Encyclopedia compiled!','ok');
    addXP(100);
    showXPToast(100);
  } catch(e){
    setLearnStatus('enc-status','✗ '+e.message,'err');
    document.getElementById('enc-output').innerHTML = '<div style="color:var(--red);padding:16px">✗ '+e.message+'</div>';
  }
}

function showEncEntry(){
  const enc = document.getElementById('enc-output').innerHTML;
  if(!enc||enc.includes('Your encyclopedia')){ alert('Compile your encyclopedia first.'); return; }
  // Scroll to enc-output
  document.getElementById('enc-output').scrollIntoView({behavior:'smooth'});
}

function exportEncyclopedia(){
  const content = document.getElementById('enc-output').innerHTML;
  if(!content){ alert('No encyclopedia content to export.'); return; }
  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>RPGACE Encyclopedia</title></head><body>' + content + '</body></html>';
  const blob = new Blob([html], {type:'text/html'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'rpgace-encyclopedia.html';
  a.click();
}

function setLearnStatus(id, msg, type=''){
  const el = document.getElementById(id);
  if(!el) return;
  el.textContent = msg;
  el.className = 'learn-status'+(type?' '+type:'');
}

document.addEventListener('keydown', e=>{
  if(e.key==='Enter' && document.activeElement.id==='video-search-input') searchVideos();
});


/* ===END:LEGACY:mainjs=== */
/* ═══════════════════════════════════════════════════════════════════
   END LEGACY SECTION — the real rpgace_core.js module system (unchanged
   since before the merge) continues below.
   ═══════════════════════════════════════════════════════════════════ */


(function (global) {
  'use strict';

  /* ─── WAIT FOR THE DOM, NOT FOR EVERY IMAGE/FONT ────────
     July 22 GODMODE finding ("clicking the left nav does nothing for the
     first ~10s after login"): this used to gate on window 'load'
     (document.readyState==='complete') - which waits for EVERY
     subresource on the page (fonts, images) to finish downloading, not
     just the DOM. The original comment's premise ("give initApp() time
     to run") doesn't actually hold: initApp() is called from
     checkPassword() - gated by LOGIN, a user-timed action completely
     decoupled from page-load timing. It can run seconds after window
     'load', or long before it if login is instant. Every module below
     already has to tolerate 'ready fired before initApp() finished'
     (that's what the various 1200-8000ms retry delays scattered through
     this file are actually for) - so there was never a real dependency
     on waiting for images/fonts specifically, just unnecessary latency
     stacked on top of an already-necessary retry pattern. main.js and
     this script both load at the very end of <body>, so by the time this
     line executes the DOM is already fully parsed - 'interactive' (or
     later) is the real signal needed, not 'complete'. */
  function onReady(fn) {
    if (document.readyState !== 'loading') {
      setTimeout(fn, 50);
    } else {
      global.addEventListener('DOMContentLoaded', function () { setTimeout(fn, 50); });
    }
  }

  /* ─── NAMESPACE ────────────────────────────────────────── */
  global.RPGACE = global.RPGACE || {};
  const R = global.RPGACE;

  /* ══════════════════════════════════════════════════════════
     DATA LAYER
     Validated, schema-aware localStorage access.
     Never call localStorage directly in new code.
     ══════════════════════════════════════════════════════════ */
  R.DB = {
    SCHEMA: {
      shifts:   { key: 'rpgace_shifts',        fallback: [] },
      sched:    { key: 'rpgace_sched_agendas', fallback: [] },
      log:      { key: 'rpgace_daily_log',     fallback: {} },
      agendas:  { key: 'rpgace_agendas',       fallback: [] },
    },

    /* Resolve key string from schema name or raw key */
    _key(name) {
      return (this.SCHEMA[name] && this.SCHEMA[name].key) || name;
    },
    _fb(name) {
      const s = this.SCHEMA[name];
      if (!s) return null;
      return Array.isArray(s.fallback) ? [] : (typeof s.fallback === 'object' ? {} : s.fallback);
    },

    get(name) {
      try {
        const raw = localStorage.getItem(this._key(name));
        if (raw === null) return this._fb(name);
        return JSON.parse(raw);
      } catch (e) {
        console.warn('[RPGACE.DB.get]', name, e.message);
        return this._fb(name);
      }
    },

    set(name, value) {
      try {
        localStorage.setItem(this._key(name), JSON.stringify(value));
        R.hooks.fire('db:change', name, value);
        return true;
      } catch (e) {
        console.warn('[RPGACE.DB.set]', name, e.message);
        return false;
      }
    },

    /* Append an item to an array key, auto-assigning an id */
    push(name, item) {
      const arr = this.get(name) || [];
      const entry = Object.assign({ id: R.utils.id(), createdAt: new Date().toISOString() }, item);
      arr.push(entry);
      this.set(name, arr);
      return entry;
    },

    /* Update one item by id in an array key */
    update(name, id, updates) {
      const arr = this.get(name) || [];
      const idx = arr.findIndex(function (x) { return x.id === id || x._id === id; });
      if (idx < 0) return null;
      arr[idx] = Object.assign({}, arr[idx], updates);
      this.set(name, arr);
      return arr[idx];
    },

    /* Remove one item by id from an array key */
    remove(name, id) {
      const arr = (this.get(name) || []).filter(function (x) {
        return x.id !== id && x._id !== id;
      });
      this.set(name, arr);
      return arr;
    },
  };

  /* ══════════════════════════════════════════════════════════
     STATE LAYER
     Single source of truth for all UI state.
     Replaces scattered window._xxx globals.
     ══════════════════════════════════════════════════════════ */
  R.STATE = (function () {
    var _s = {};
    return {
      get: function (key) { return _s[key]; },
      set: function (key, value) {
        _s[key] = value;
        R.hooks.fire('state:change', key, value);
        return value;
      },
      get dailyDate()    { return _s.dailyDate  || new Date(); },
      set dailyDate(d)   { _s.dailyDate  = d;  R.hooks.fire('state:change', 'dailyDate', d); },
      get weekStart()    { var d = _s.weekStart; if (d) return d; var n=new Date(); n.setDate(n.getDate()-((n.getDay()+6)%7)); n.setHours(0,0,0,0); return n; },
      set weekStart(d)   { _s.weekStart  = d;  R.hooks.fire('state:change', 'weekStart', d); },
      get monthDate()    { return _s.monthDate  || new Date(); },
      set monthDate(d)   { _s.monthDate  = d;  R.hooks.fire('state:change', 'monthDate', d); },
      get pendingSched()    { return _s.pendingSched; },
      set pendingSched(v)   { _s.pendingSched = v; },
    };
  }())

  /* Bridge: make existing window._xxx globals proxy through RPGACE.STATE
     so old code in main.js keeps working without changes.             */
    function bridgeGlobal(name, getter, setter) {
    try {
      Object.defineProperty(global, name, {
        get: getter, set: setter, configurable: true, enumerable: true,
      });
    } catch (e) {}
  }
  bridgeGlobal('_dailyDate',
    function() { var v = R.STATE && R.STATE.dailyDate; return (v instanceof Date) ? v : new Date(); },
    function(v) { if (R.STATE) R.STATE.dailyDate = v; });
  bridgeGlobal('_calWeekStart',
    function() { var v = R.STATE && R.STATE.weekStart; return (v instanceof Date) ? v : (function(){ var d=new Date(); d.setDate(d.getDate()-((d.getDay()+6)%7)); d.setHours(0,0,0,0); return d; })(); },
    function(v) { if (R.STATE) R.STATE.weekStart = v; });
  bridgeGlobal('_calMonthDate',
    function() { var v = R.STATE && R.STATE.monthDate; return (v instanceof Date) ? v : new Date(); },
    function(v) { if (R.STATE) R.STATE.monthDate = v; });
  bridgeGlobal('_pendingSchedAgenda',
    function() { return R.STATE && R.STATE.pendingSched; },
    function(v) { if (R.STATE) R.STATE.pendingSched = v; });

  /* ══════════════════════════════════════════════════════════
     BOOT TASK GATE — July 24, Alex's own direct standing rule:
     "no loads should happen after login, only before." Real precedent
     already existed for exactly ONE module (careerStatCard's dashboard
     prefetch, built July 23) but was never generalized - every OTHER
     module still injected its own dashboard-visible content via a bare
     setTimeout(fn, 1200-3000ms) fired from inside its own init(), which
     runs AFTER 'rpgace:ready' - meaning it runs AFTER the boot loader
     already hid and the user is already looking at the page. That's
     the real mechanism behind the visible pop-in this was built to end.

     Any module whose init() does real boot-time work that should finish
     BEFORE the user ever sees the app calls R.registerBootTask(fn) -
     fn must return a Promise (or a plain value). The boot loader
     (below, near 'rpgace:ready') waits on Promise.all of every
     registered task before hiding, same 20s hard-ceiling safety net as
     before. A task that rejects is caught and logged, never allowed to
     block every other module's own gate (fail open, per rule 7 - a
     slow/broken module delays the loader at most until the ceiling,
     never breaks it for everyone else).

     This does NOT apply to page:show-triggered re-injection (visiting
     a page you haven't been to yet) - that's a real, deliberate,
     already-decided lazy-load pattern (Research Lab's own single-tab
     loading, for one) and is a different thing from content silently
     popping in on a page the user is ALREADY looking at. Only the
     boot-time (rpgace:ready-triggered) half of each module's own
     injection logic moves onto this gate.
     ══════════════════════════════════════════════════════════ */
  R._bootTasks = [];
  R.registerBootTask = function (fn) {
    var result;
    try { result = fn(); } catch (e) { result = Promise.reject(e); }
    R._bootTasks.push(Promise.resolve(result));
  };

  /* ══════════════════════════════════════════════════════════
     HOOK SYSTEM
     Register handlers on named events.
     New features hook in here — no more string replacement.

     Usage:
       RPGACE.hooks.on('sched:show', type => { ... });
       RPGACE.hooks.fire('sched:show', 'daily');
     ══════════════════════════════════════════════════════════ */
  R.hooks = {
    _reg: {},

    /* Subscribe. Returns an unsubscribe function. */
    on: function (event, handler, priority) {
      priority = priority || 10;
      if (!this._reg[event]) this._reg[event] = [];
      this._reg[event].push({ handler: handler, priority: priority });
      this._reg[event].sort(function (a, b) { return a.priority - b.priority; });
      var self = this;
      return function () { self.off(event, handler); };
    },

    off: function (event, handler) {
      if (!this._reg[event]) return;
      this._reg[event] = this._reg[event].filter(function (h) {
        return h.handler !== handler;
      });
    },

    /* Fire all handlers for an event */
    // July 24 audit fix: iterates a snapshot (.slice()), not the live
    // array. Two real hazards this closes, found the same session:
    // (1) the already-documented one - on() pushing onto this array
    // mid-fire (e.g. a module subscribing to 'rpgace:ready' from inside
    // its own init()) never got visited, since forEach doesn't revisit
    // appended entries; (2) a sharper one - on() also SORTS this array
    // in place (line below), and sorting a live array mid-forEach can
    // move not-yet-visited entries past the iteration cursor, silently
    // skipping them. Currently masked because every real call site uses
    // the same default priority (10) and Array.prototype.sort is stable,
    // but a single future hooks.on(event, fn, 5) call from inside any
    // init() would reintroduce the exact "N modules silently never
    // registered" failure mode the July 22 leftNav incident already cost
    // this project once. Iterating a snapshot fixes both at the same
    // choke point, one fix instead of two.
    fire: function (event) {
      var args = Array.prototype.slice.call(arguments, 1);
      (this._reg[event] || []).slice().forEach(function (h) {
        try { h.handler.apply(null, args); }
        catch (e) { console.warn('[RPGACE.hooks.fire]', event, e.message); }
      });
    },

    /* Pipe: each handler receives and returns the value, transforming it */
    pipe: function (event, value) {
      return (this._reg[event] || []).slice().reduce(function (acc, h) {
        try { return h.handler(acc); }
        catch (e) { return acc; }
      }, value);
    },
  };

  /* ══════════════════════════════════════════════════════════
     API LAYER
     Unified external call interface.
     All Composio, Oracle, and future API calls go through here.

     Usage:
       await RPGACE.api('GMAIL_CREATE_EMAIL_DRAFT', { subject, body, to })
       await RPGACE.oracle([{ role:'user', content:'...' }], systemPrompt)
     ══════════════════════════════════════════════════════════ */
  R.api = async function (action, params) {
    params = params || {};
    var res = await fetch('/api/composio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'execute', tool: action, input: params }),
    });
    var data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.data || data;
  };

  R.oracle = async function (messages, system, maxTokens) {
    if (typeof callOracle === 'function') {
      return callOracle(messages, system, maxTokens || 1000);
    }
    throw new Error('[RPGACE.oracle] callOracle not available');
  };

  /* ══════════════════════════════════════════════════════════
     UTILITIES
     Shared helpers used across all modules.
     ══════════════════════════════════════════════════════════ */
  R.utils = {

    // ── panelHome() — Aug 23 2026 (UI2/UI3 of the "UI Consistency & Worm
    // Family Cohesion" batch). ONE shared answer to "where does a relocatable
    // panel physically live while its popup is closed?", replacing 5 separate
    // hand-rolled copies of the same fallback chain that all resolved the
    // (now-retired) Research Lab page:
    //     document.getElementById('page-research')            <- ALWAYS null,
    //         confirmed dead: no element with that id has ever existed in
    //         index.html; it named an even older page id (UI3 removed it)
    //  || document.getElementById('page-learning')            <- retired UI2
    //  || document.querySelector('[id*="research"]') || ...'[id*="learning"]'
    //
    // The real destination is the same hidden holder #kg-panel / #cpl-widget /
    // #mb-wrap already use (dashDeck._ensureStash), so every relocatable panel
    // now shares ONE staging convention instead of two. Falls back to
    // #legacy-worm-panels (index.html's own hidden staging div, which hosts
    // the 3 static worm panels) and finally to a self-created holder, so an
    // injector that runs before dashDeck's own init still finds a real parent
    // rather than silently returning early and never building its panel.
    panelHome: function () {
      var holder = document.getElementById('dd-stash-holder');
      if (holder) return holder;
      var dd = R.modules && R.modules.dashDeck;
      if (dd && dd._ensureStash) {
        try { holder = dd._ensureStash(); } catch (e) { holder = null; }
        if (holder) return holder;
      }
      holder = document.getElementById('legacy-worm-panels');
      if (holder) return holder;
      // Last resort: build the shared holder ourselves, same id/shape
      // _ensureStash would have used, so a later _ensureStash() call finds
      // this one instead of making a second, competing holder.
      var host = document.getElementById('page-dashboard') || document.body;
      if (!host) return null;
      holder = document.createElement('div');
      holder.id = 'dd-stash-holder';
      holder.style.display = 'none';
      host.appendChild(holder);
      return holder;
    },

    // July 24 audit fix (rule 8, dedup): two independent _esc() helpers
    // existed (videoSummary, careerStatCard) - the second escaped only
    // '<', unsafe if its output ever lands in an attribute context (a
    // real "&gt;\"" payload would pass it through untouched). One shared
    // implementation here; both modules now delegate to this instead of
    // keeping their own copy that could drift further.
    escapeHtml: function (s) {
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');  // CK-6: + apostrophe (RPGACE.kit.esc)
    },

    /* YYYY-MM-DD string from a Date object */
    dateStr: function (d) {
      d = d || new Date();
      return d.toISOString().split('T')[0];
    },

    /* Monday of the week containing d */
    mondayOf: function (d) {
      d = d || new Date();
      var r = new Date(d);
      r.setHours(0, 0, 0, 0);
      var dow = r.getDay();
      r.setDate(r.getDate() - (dow === 0 ? 6 : dow - 1));
      return r;
    },

    /* 3-letter day abbreviation from YYYY-MM-DD */
    dayAbbr: function (dateStr) {
      try {
        var d = new Date(dateStr + 'T00:00:00');
        return ['MON','TUE','WED','THU','FRI','SAT','SUN'][
          d.getDay() === 0 ? 6 : d.getDay() - 1
        ];
      } catch (e) { return '???'; }
    },

    /* Format seconds as M:SS */
    fmtTime: function (secs) {
      var m = Math.floor(secs / 60);
      var s = Math.floor(secs % 60);
      return m + ':' + String(s).padStart(2, '0');
    },

    /* Generate a short unique ID */
    id: function () {
      return 'rp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    },

    /* Show a temporary gold toast notification */
    // Aug 6 (Engineer pass, 2nd real hand-test round) — z-index raised
    // 9999 -> 100000. Real, confirmed root cause of Alex's "some error
    // popped up about directors or something, couldnt see behind the
    // purple pop up" report: dashDeck's own _popup() renders at 99999
    // (documented landmine), so ANY toast fired while a popup is open —
    // e.g. _saveDocToProduction's "No director pick found" warning,
    // firing while the director-blend picker itself was still on
    // screen — rendered ten thousand z-index levels BEHIND it,
    // invisible. One universal fix here closes this whole bug class
    // everywhere a toast can fire under an open popup, not just this
    // one call site.
    toast: function (msg, color, ms, moduleName) {
      color = color || '#C9A84C';
      ms    = ms    || 3000;
      var t = document.createElement('div');
      t.style.cssText = [
        'position:fixed;bottom:24px;left:50%;transform:translateX(-50%)',
        'background:#0f0f18;border:1px solid ' + color + '40;color:' + color,
        'font-family:Rajdhani,sans-serif;font-size:13px;font-weight:700',
        'padding:10px 20px;border-radius:8px;z-index:100000',
        'white-space:nowrap;pointer-events:none;transition:opacity .3s',
      ].join(';');
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(function () {
        t.style.opacity = '0';
        setTimeout(function () { t.remove(); }, 300);
      }, ms);
      // Aug 26 2026 (real Alex ask: "make these toast visible and hookable
      // for oracle to pick up"). Purely additive - the visual behavior
      // above is completely unchanged. #CC4A4A is the real, established
      // error-toast color across this whole codebase (confirmed via a
      // direct grep: 33 of the ~80 real toast() call sites use it for a
      // genuine "something's wrong" message, vs. #E2A83D for soft
      // warnings and #4CAF82 for success — never guessed, this is the
      // codebase's own existing convention). An error-colored toast now
      // (a) persists into error_log via the SAME real dedup/write path
      // every other error type already uses (rule 8 — errorLog._capture,
      // not a second logging mechanism), tagged 'ui_toast' so it's
      // distinguishable from a genuine uncaught JS exception, since many
      // of these are user-input validation nudges ("add a title first"),
      // not code bugs; and (b) fires a real, new RPGACE.hooks event so
      // ANY future consumer (Oracle Control, a future module) can
      // subscribe to real-time error-toast signals - this is the actual
      // "hookable" part Alex asked for. Neither is a live "Oracle watches
      // the DOM" mechanism (that's still not real/possible) - this is a
      // real, concrete signal fired at the moment the error happens,
      // which something can choose to listen for.
      if (color === '#CC4A4A') {
        try {
          var el = RPGACE.modules && RPGACE.modules.errorLog;
          // Real F2 completion, Sep 2026: a caller that already knows its
          // own module (moduleName, 4th param, optional - every existing
          // call site omits it and is completely unaffected) is passed
          // through as opts.module, which errorLog._capture now prefers
          // OUTRIGHT over stack-walking. Real reason this exists: a
          // toast() fired from inside a Promise .catch(function(e){...})
          // (the shape questEngine._createQuests and most other real error
          // paths actually use) gets a genuinely SHALLOW new Error().stack
          // - the microtask boundary means the original synchronous call
          // chain back to the real calling module is not in it, no matter
          // how far _extractModule walks the stack. Confirmed by direct
          // evidence, not assumed: every one of the 15 real toast-sourced
          // error_log rows to date has linked_perspective_id NULL despite
          // the stack always being captured. The stack-walk stays as the
          // real fallback for the ~87 other #CC4A4A call sites that don't
          // pass a moduleName - nothing about their behavior changes.
          if (el && el._capture) el._capture('ui_toast', 'toast()', msg, { stack: (new Error()).stack, module: moduleName || null });
        } catch (e) { /* fails open - a logging failure must never break the toast itself */ }
        try { RPGACE.hooks.fire('rpgace:error-toast', { msg: msg, color: color, ts: Date.now() }); } catch (e) {}
      }
    },

    // ── Reanalysis-pool insurance write + resurrection suppression ──
    // Aug 27 2026 (/Routine item #1, "delete doesn't stick" - real
    // /CEO+/interrogation+/drift+/paranoia pass, see
    // records/2026-08/delete_doesnt_stick_tombstone_ceo_spec_2026-08-27.txt).
    // Real root cause: local_server.py (outside this repo, Alex's own
    // machine) holds its own independent copy of intel report/encyclopedia
    // source data with zero concept of "this was deleted" - syncIntelData's
    // 30s recurring poll and the encyclopedia empty-state's own
    // "Sync & Push" button both merge that stale data straight back in.
    // Alex's own real correction mid-interrogation: a delete here means
    // "this extraction was wrong", not "ban this URL forever" - the same
    // URL must stay free to produce a genuinely NEW, better report later.
    // So this is NOT a permanent tombstone: a merge candidate is only
    // suppressed if it's the same age or OLDER than the row that was
    // deleted; anything newer (a real fresh reanalysis) passes through.
    // ONE shared mechanism (rule 8) used by both the intel_reports/
    // videoSummary merge path and the encyclopedia fetch/render path.
    _reanalysisPoolCache: null,
    _reanalysisPoolCacheAt: 0,

    // Fire-and-forget insurance write - called from intelDelete/deleteEncEntry/
    // clearEncyclopedia at the moment something with a real url is deleted.
    // Never blocks or throws into the caller's own delete flow.
    logReanalysisCandidate: function (url, title, sourceTable, deletedRowCreatedAt, reason) {
      if (!url) return;
      try {
        RPGACE.sb.secureWrite('intel_reanalysis_pool', 'insert', {
          url: url,
          title: title || null,
          source_table: sourceTable || 'intel_reports',
          deleted_row_created_at: deletedRowCreatedAt || null,
          reason: reason || 'bad_extraction',
        }).then(function () {
          RPGACE.utils._reanalysisPoolCacheAt = 0; // invalidate cache, a new row exists
        }).catch(function (e) { console.warn('[reanalysisPool] insert failed:', e.message); });
      } catch (e) { /* never break a delete over this */ }
    },

    // Cached ~30s (matches the poll interval this is guarding against) so
    // the 30s syncIntelData loop doesn't hammer Supabase every cycle.
    _fetchReanalysisPool: function () {
      var now = Date.now();
      if (RPGACE.utils._reanalysisPoolCache && (now - RPGACE.utils._reanalysisPoolCacheAt) < 30000) {
        return Promise.resolve(RPGACE.utils._reanalysisPoolCache);
      }
      return RPGACE.sb.select('intel_reanalysis_pool', 'status=eq.pending&select=url,deleted_row_created_at')
        .then(function (rows) {
          RPGACE.utils._reanalysisPoolCache = Array.isArray(rows) ? rows : [];
          RPGACE.utils._reanalysisPoolCacheAt = now;
          return RPGACE.utils._reanalysisPoolCache;
        }).catch(function () { return RPGACE.utils._reanalysisPoolCache || []; });
    },

    // Filters `list`, dropping anything that matches a pending pool row's
    // url AND is the same age or older than that row's
    // deleted_row_created_at. An item with no date is treated
    // conservatively (suppressed if a pool row exists for its url) since
    // an undated candidate is more likely stale legacy data than a genuine
    // fresh reanalysis. urlKey/dateKey let callers whose objects use a
    // different field name (encyclopedia's source_url vs. intel_reports'
    // plain url) reuse the exact same suppression logic (rule 8) instead
    // of a second copy.
    filterReanalysisSuppressed: function (list, dateKey, urlKey) {
      if (!Array.isArray(list) || !list.length) return Promise.resolve(list || []);
      urlKey = urlKey || 'url';
      return RPGACE.utils._fetchReanalysisPool().then(function (pool) {
        if (!pool.length) return list;
        var norm = (RPGACE.modules.intelDedup && RPGACE.modules.intelDedup.normUrl) || function (u) { return (u || '').toLowerCase(); };
        var byUrl = {};
        pool.forEach(function (p) {
          var k = norm(p.url);
          if (!k) return;
          var d = p.deleted_row_created_at ? new Date(p.deleted_row_created_at).getTime() : Infinity;
          if (!byUrl[k] || d > byUrl[k]) byUrl[k] = d; // keep the LATEST deletion marker per url
        });
        return list.filter(function (item) {
          var k = norm(item && item[urlKey]);
          if (!k || !(k in byUrl)) return true;
          var itemDateRaw = dateKey ? item[dateKey] : (item.date || item.created_at);
          var itemDate = itemDateRaw ? new Date(itemDateRaw).getTime() : 0;
          return itemDate > byUrl[k]; // strictly newer than the deletion -> genuine fresh reanalysis, let it through
        });
      });
    },

    /* Copy text to clipboard and briefly show feedback on a button */
    copy: function (text, btn) {
      navigator.clipboard.writeText(text).then(function () {
        if (btn) {
          var orig = btn.textContent;
          btn.textContent = 'Copied';
          setTimeout(function () { btn.textContent = orig; }, 1500);
        }
      }).catch(function () {
        /* fallback for older browsers */
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      });
    },

    // Oct 11 2026 (S1) — the photo pipeline dailyLife's fridge photo built,
    // lifted here so the Screenshot Inbox reuses it instead of a 2nd copy
    // (rule 8). resizeImage: file/blob -> {mediaType, base64} JPEG, longest
    // side <= maxSide. oracleVision: one /api/oracle call with an image,
    // returns the reply text.
    resizeImage: function(file, maxSide, quality) {
      maxSide = maxSide || 1280;
      return new Promise(function(resolve, reject) {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function() {
          var k = Math.min(1, maxSide / Math.max(img.width, img.height));
          var c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          var data = c.toDataURL('image/jpeg', quality || 0.8);
          resolve({ mediaType: 'image/jpeg', base64: data.slice(data.indexOf(',') + 1) });
        };
        img.onerror = function() { URL.revokeObjectURL(url); reject(new Error('could not read that image')); };
        img.src = url;
      });
    },
    oracleVision: function(image, system, text, maxTokens) {
      return fetch('/api/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
            { type: 'text', text: text },
          ] }],
          system: system,
          max_tokens: maxTokens || 900,
        }),
      }).then(function(r) {
        if (!r.ok) throw new Error('Oracle could not read the image (' + r.status + ')');
        return r.json();
      }).then(function(d) { return (d.content || []).map(function(x) { return x.text || ''; }).join(''); });
    },
  };

  /* ══════════════════════════════════════════════════════════
     FUNCTION WRAPPERS
     Wraps existing main.js functions to add hook fire points.
     This runs AFTER initApp() has completed.
     Do NOT patch main.js — wrap here instead.
     ══════════════════════════════════════════════════════════ */
  try{if(!window._calMonthDate||!(window._calMonthDate instanceof Date))window._calMonthDate=new Date();}catch(e){}
  onReady(function () {

    /* showSched → fires 'sched:show' after each tab switch */
    if (typeof showSched === 'function') {
      var _origShowSched = showSched;
      global.showSched = function (type, btn) {
        try { _origShowSched.call(this, type, btn); }
        catch (e) { console.warn('[RPGACE wrap:showSched]', e.message); }
        R.hooks.fire('sched:show', type);
      };
    }

    /* showPage → fires 'page:show' after each nav switch */
    if (typeof showPage === 'function') {
      var _origShowPage = showPage;
      global.showPage = function (name, tab) {
        try { _origShowPage.call(this, name, tab); }
        catch (e) { console.warn('[RPGACE wrap:showPage]', e.message); }
        R.hooks.fire('page:show', name);
      };
    }

    /* renderAgendas → fires 'agendas:rendered' after cards are drawn */
    if (typeof renderAgendas === 'function') {
      var _origRenderAgendas = renderAgendas;
      global.renderAgendas = function () {
        try { _origRenderAgendas.call(this); }
        catch (e) { console.warn('[RPGACE wrap:renderAgendas]', e.message); }
        R.hooks.fire('agendas:rendered');
      };
    }

    /* addXP → fires 'xp:awarded' for future streak/level systems */
    if (typeof addXP === 'function') {
      var _origAddXP = addXP;
      global.addXP = function (amount) {
        try { _origAddXP.call(this, amount); }
        catch (e) { console.warn('[RPGACE wrap:addXP]', e.message); }
        R.hooks.fire('xp:awarded', amount);
      };
    }

    /* checkPassword → fires 'rpgace:login' once, for the new pathRouter
       module (July 23) to do its one-time deep-link routing. checkPassword
       itself (main.js, frozen) fades #gate over 500ms then calls initApp()
       - the 700ms delay here gives that real sequence room to finish
       before pathRouter reads which page should actually be showing.
       July 23 (authGate fix): checkPassword() is now async (it calls the
       real server-side check via authGate.verify() instead of comparing
       a local constant) and returns the real true/false result. This wrap
       now awaits that result and only fires 'rpgace:login' on an actual
       successful login - the previous version fired unconditionally,
       even on a wrong password, a real latent bug caught while making
       this change rather than knowingly carried forward. */
    if (typeof checkPassword === 'function') {
      global._rpgaceLoginWrapped = true;
      var _origCheckPassword = checkPassword;
      global.checkPassword = function () {
        var result;
        try { result = _origCheckPassword.apply(this, arguments); }
        catch (e) { console.warn('[RPGACE wrap:checkPassword]', e.message); }
        Promise.resolve(result).then(function(ok) {
          if (ok) setTimeout(function() { R.hooks.fire('rpgace:login'); }, 700);
        }).catch(function(e) { console.warn('[RPGACE wrap:checkPassword]', e.message); });
        return result;
      };
    }

    /* saveToJournal → fires 'journal:saved' for cross-system sync */
    if (typeof saveToJournal === 'function') {
      var _origSaveJournal = saveToJournal;
      global.saveToJournal = async function (title, content, source) {
        var result;
        try { result = await _origSaveJournal.call(this, title, content, source); }
        catch (e) { console.warn('[RPGACE wrap:saveToJournal]', e.message); }
        R.hooks.fire('journal:saved', { title: title, source: source });
        return result;
      };
    }

    console.log('[RPGACE] Foundation layer active. Hooks wired. Modules:', Object.keys(R.modules));
    R._ready = true;
    R.hooks.fire('rpgace:ready');

    // July 23: real finding from Alex - after login, several dashboard
    // DOMs (the career stat card, Chronicles feed) took 10-20s to actually
    // populate, because careerStatCard._fetchAll() (8 separate Supabase
    // calls) only ever ran AFTER login, on the same rpgace:ready cascade
    // that first shows the dashboard. The login gate is a purely visual
    // overlay (no server-side check - CORRECT_PW is client-side only, a
    // known separate finding) so nothing actually requires waiting for
    // login to start these fetches. Alex's own preference, stated
    // directly: wait longer BEFORE the login screen appears, not after
    // logging in when he's ready to click. So the boot loader now also
    // warms RPGACE.cache with this same prefetch before ever revealing the
    // gate - careerStatCard's own later _render() call reads the already-
    // cached results (same query strings = same cache key) instead of
    // re-fetching, so post-login the dashboard populates instantly.
    var _hideBoot = function() {
      try {
        var _boot = document.getElementById('rpgace-boot-loader');
        if (_boot) _boot.classList.add('rpgace-boot-hidden');
      } catch (e) { console.warn('[RPGACE] boot loader hide failed', e.message); }
    };
    var _bootHidden = false;
    var _hideBootOnce = function() { if (_bootHidden) return; _bootHidden = true; _hideBoot(); };
    // Hard ceiling: never make Alex wait more than ~20s even on a dead
    // network - matches his own stated tolerance, and guarantees the gate
    // is always reachable (fail loud, never trap a user), independent of
    // index.html's own pure-CSS 6s->22s fallback below.
    setTimeout(_hideBootOnce, 20000);
    // careerStatCard's own prefetch folded into the same array every
    // other module's registerBootTask() call now feeds, instead of
    // being a special case (rule 8 - one shared gate, not two).
    try {
      if (R.modules.careerStatCard && R.modules.careerStatCard._fetchAll) {
        R._bootTasks.push(R.modules.careerStatCard._fetchAll());
      }
    } catch (e) {}
    // Oct 14 2026: settled count + done time feed perfWatch's freeze reports.
    R._bootSettled = 0;
    Promise.all(R._bootTasks.map(function(p) {
      return Promise.resolve(p).catch(function(e) { console.warn('[RPGACE] a boot task failed:', e && e.message); })
        .then(function() { R._bootSettled++; });
    })).then(function() { R._bootDoneAt = Date.now(); _hideBootOnce(); }).catch(_hideBootOnce);
    // Aug 22 (real /Routine finding, rule 8) - a 2nd, independent "YouTube
    // Oracle button" injector used to live here ("direct, no module
    // dependency"), duplicating youtubeOracle._btn() (registered below via
    // registerBootTask) almost line for line: same #yt-ob id/guard, same
    // toggleProdOraclePanel anchor lookup, same insertBefore placement -
    // just a worse retry shape (3 fixed setTimeout delays vs. _btn()'s
    // real capped 20-try poll). Both always checked "if (document.
    // getElementById('yt-ob')) return" first, so this was never a visible
    // double-button bug - just real, harmless-but-confusing duplicate
    // code sitting in the boot sequence, found while investigating an
    // unrelated boot-task console warning. Removed; youtubeOracle._btn()
    // is the one real implementation now.
  });

  /* ══════════════════════════════════════════════════════════
     MODULE REGISTRY
     Step 8+ features register here as self-contained modules.
     Each module has an init() that runs after RPGACE is ready.

  ═══════════════════════════════════════════════════ */
  R.modules  = {};
  R._ready   = false;
  R._queue   = [];

  // Oct 11 2026 (M1, rivers -> domains) — every registered module carries a
  // `domain:` key naming one of these. The keys match the left menu's
  // groups (plus Platform for the shell itself). The Galaxy Map tooling
  // reads `domain:` straight from this file, so there is ONE source of
  // truth for where a module belongs (scripts/check_module_domains.py
  // fails if a module has none). Record:
  // records/2026-10/rivers_to_domains_scrutiny_2026-10-10.txt
  R.DOMAINS = {
    oracle: 'Oracle', content: 'Content & Video', knowledge: 'Knowledge', habits: 'Habits',
    schedule: 'Schedule & Journal', chronicles: 'Chronicles', oversight: 'Oversight', platform: 'Platform'
  };

  // Oct 15 2026 (KN-0, area regen series) — the look of each area in the
  // left nav and on its hub: icon, colour token, and the XP realms it
  // feeds (xpSeason.REALMS keys). `hub` is set by each area's own plan
  // (e.g. Knowledge's hub page) and is what the 🏠 button opens.
  // Record: records/2026-10/knowledge_reorg_ceo_plan_2026-10-15.txt
  R.AREAS = {
    oracle:     { label: 'Oracle', icon: '🔮', color: 'var(--gold)', realms: [] },
    content:    { label: 'Content & Video', icon: '🎬', color: 'var(--purple)', realms: ['producer', 'creator', 'hustler'] },
    knowledge:  { label: 'Knowledge', icon: '📚', color: 'var(--blue)', realms: ['scholar'] },
    // BT-0 (Oct 16 2026): Beats home (beatsHub) - a sub-area of Content & Video for ← Back / 🏠.
    beats:      { label: 'Beats', icon: '🥁', color: 'var(--purple)', realms: ['producer'] },
    // PC-0 (Oct 17 2026): Posting home (postingHub) - a sub-area of Content & Video.
    posting:    { label: 'Posting', icon: '📣', color: 'var(--purple)', realms: ['creator'] },
    // SH-0 (Oct 17 2026): Selling home (sellingHub) - a sub-area of Content & Video.
    selling:    { label: 'Selling', icon: '💼', color: 'var(--gold)', realms: ['hustler'] },
    // SH-5b (Oct 17 2026): one Money page shared by Hustler (Selling) and Steward (Habits).
    money:      { label: 'Money', icon: '💷', color: 'var(--gold)', realms: ['hustler', 'steward'] },
    // MD-0 (Oct 18 2026): My Day home (myDay) - a sub-area of Schedule & Journal for ← Back / 🏠.
    myday:      { label: 'My Day', icon: '☀️', color: 'var(--orange)', realms: ['life', 'homekeeper', 'mind'] },
    habits:     { label: 'Habits', icon: '🌱', color: 'var(--green)', realms: ['chef', 'athlete', 'steward'] },
    schedule:   { label: 'Schedule & Journal', icon: '☀️', color: 'var(--orange)', realms: ['life', 'homekeeper', 'mind', 'explorer', 'connector'] },
    chronicles: { label: 'Chronicles', icon: '📜', color: 'var(--gold)', realms: [] },
    oversight:  { label: 'Oversight', icon: '🛠', color: 'var(--steel)', realms: ['builder'] },
  };
  R.areaForLabel = function (label) {
    for (var k in R.AREAS) if (R.AREAS[k].label === label) return k;
    return null;
  };

  // Realm Inputs RI-0 (Oct 15 2026). Alex: "any data should be tagged by
  // realms" - chose "derived + chosen": rows that can belong to several
  // realms (inputs, quests, plans) store the realms he picks; everything
  // else is worked out here, from the table it lives in. One helper, so the
  // Brief, reports and realm cards never keep their own copies. Always
  // returns an array of xpSeason realm keys (maybe empty).
  R.REALM_OF_TABLE = {
    recipes: 'chef', planned_cooks: 'chef', pantry_stock: 'chef', shopping_lists: 'chef',
    gym_sessions: 'athlete', gym_sets: 'athlete', food_log: 'athlete', body_log: 'athlete',
    wishlist_items: 'steward', cutback_log: 'mind', plans: 'explorer', plan_tasks: 'explorer',
    people: 'connector', outreach_log: 'connector', content_productions: 'producer', posts: 'creator', artists: 'hustler', pitches: 'hustler', pitch_sends: 'hustler', subscriptions: 'steward',
    conid_pot: 'producer', reference_tracks: 'producer', video_jobs: 'creator',
    journal: 'life', bookworm_books: 'scholar', jargon_encyclopedia: 'scholar'
  };
  R.QUEST_CATEGORY_REALM = { career: 'producer', health: 'athlete', lifestyle: 'life' };
  R.realmOf = function (table, row) {
    row = row || {};
    var ok = function (k) { return !!(R.modules.xpSeason && R.modules.xpSeason.REALMS[k]); };
    var list = Array.isArray(row.realms) ? row.realms.filter(ok) : [];
    if (list.length) return list;
    if (row.realm && ok(row.realm)) return [row.realm];
    if (table === 'quest_log' && R.QUEST_CATEGORY_REALM[row.category]) return [R.QUEST_CATEGORY_REALM[row.category]];
    if (table === 'routines' && R.modules.myDay) return [R.modules.myDay.logic.realmOf(row)];
    if (table === 'chronicles_finance') return [row.type === 'sale' ? 'hustler' : 'steward'];
    // BT-3 (Oct 16 2026): a logged beat is Producer work; tutorials stay Creator.
    if (table === 'content_productions' && row.content_type === 'music_video') return ['producer'];
    // PC-1 (Oct 17 2026): a post idea is Creator work.
    if (table === 'conid_pot' && row.kind === 'post') return ['creator'];
    // RC-1 (Oct 15 2026): anything on a phylum shelf carries that phylum's realm.
    var pn = Number(row.phylum_number), pm = R.phylumRealmMap;
    if (pn && pm && pm.byPhylum[pn]) return [pm.byPhylum[pn]];
    return R.REALM_OF_TABLE[table] ? [R.REALM_OF_TABLE[table]] : [];
  };
  // RF-7 (Oct 27 2026): shared Oracle prompts live as files in prompts/ and are
  // copied in below by scripts/build_prompts.py. R.prompt(name, vars) fills {word}.
  /* ===PROMPTS (generated by scripts/build_prompts.py from prompts/*.md - edit those files, not this)=== */
  R.PROMPTS = {"exercise_extract": "From this gym/fitness video write-up, list the specific exercises it teaches or tells the viewer to do (max 8). Skip diet, sleep and mindset advice.\nFor each exercise give: name (short, common name), discipline (one of: weights, bodyweight, cardio, stretches, mobility), group (one of: chest, back, shoulders, arms, core, legs, glutes, full_body), primary (region keys it mainly works), secondary (region keys it also works), cue (one short how-to line from the video, max 20 words).\nUse only these region keys: {regions}\nIf the video teaches no exercises, return {\"exercises\":[]}.\nReturn only JSON: {\"exercises\":[{\"name\":\"\",\"discipline\":\"\",\"group\":\"\",\"primary\":[],\"secondary\":[],\"cue\":\"\"}]}\n\nVideo: {title}\nWrite-up:\n{text}", "mission_file": "You sort specific tasks for the {realm} realm under generic missions.\nA mission is generic and repeatable (e.g. \"Roast with a technique\"); the specific task becomes a short context card under it (e.g. \"Poke-and-score crackling\").\nMissions:\n{missions}\n\nTasks:\n{tasks}\n\nFor every task give either the number of the mission it fits (\"m\"), or, only if no mission fits, a new generic mission name (\"new\", 3-7 words, no brand or person names, reusable for many future tasks).\n\"card\" is the task's specific content in 3-9 plain words (keep names of techniques, tools or creators).\nReturn only JSON: {\"items\":[{\"t\":1,\"m\":2,\"card\":\"...\"},{\"t\":2,\"new\":\"...\",\"card\":\"...\"}]}", "morning_brief": "Write the brief as plain text, under 220 words, direct, no greeting, RPG-toned like Oracle, UK English. Sections, in this order, each only if it has real data, each starting with its heading line exactly as written here:\n  ⚔️ TOP 3 TODAY - the three most important things today, numbered 1-3. Take them first from planned_blocks_today (what Alex planned, with times), then follow_ups_due (a task chained after something he already did - these are owed), then agenda_today_open, and only then from waiting_on_alex\n  📅 SHIFTS & WINDOW - today's shift (or \"no shift - full creative day\"), the free window around it and the planned blocks, tomorrow's shift if any\n  📥 WAITING ON YOU - real counts/titles (taxonomy reviews, jargon terms, chapters in progress)\n  🎛️ BEAT FOCUS - one specific thing to try in a session today, grounded in one real recent_producer_insights entry (name its source); leave the section out if there are none - never use cooking or other non-music tips\n  🎬 CONTENT IDEA - one idea worth filming, from the Idea Bank or a recent video analysis\n  ▶ one sharp action line, max 15 words\nDO NOT include (the app already shows these live next to the brief - repeating them is duplication): today's realm pick, saved ideas due for recall, the library pick, XP/level lines, Alex's own words/decisions, the inbox, YouTube stats. Never invent data; if something is empty, leave the section out. Entries with \"_error\" mean that source couldn't be read - say so briefly, never guess.", "professor": "You are Oracle in professor mode: a world-class expert in whatever the question is about, answering Alex, a UK music producer building RPGACE, his personal life app. Use the evidence brief for anything about his data or the app; use your own knowledge only for general facts, and never invent his data. Write dense bullet points: as many as are useful, few words each, numbers, stats and facts over prose. Use these bold headings in this order: **Answer**, **Counter-case** (the strongest reason this could be wrong, 1-3 bullets), **Confidence** (one line: high, medium or low and why), **Unknowns** (what is missing; if one thing only Alex can tell you would change the answer, ask it here as one short question instead of guessing). Put the source tag after each fact that came from the brief, e.g. [Food log] or [web 1]. End with one final line exactly like: HOW I KNOW: [tag] | [tag] | general knowledge. No intro, no sign-off.", "receipt_read": "You read UK shop receipts and invoices for a music producer. Reply with ONE JSON object only: {\"shop\":\"\",\"item\":\"\",\"amount\":0,\"date\":\"YYYY-MM-DD\",\"category\":\"\"}. item = what was bought, short (several lines: join them, max 80 chars). amount = the total paid in pounds as a number. category = one of Samples, Plugins / VSTs, Software, Gear, Subscriptions, Other. Leave a field empty when you cannot read it - never guess a number.", "rota_read": "You are analysing a work schedule/rota screenshot from the Fourth/HotSchedules app.\nExtract ALL shifts visible in the image.\nReturn ONLY a JSON object in this exact format, no other text:\n{\"shifts\":[{\"date\":\"DD/MM/YYYY\",\"day\":\"MON\",\"role\":\"Bar Tender\",\"start\":\"HH:MM\",\"end\":\"HH:MM\",\"hours\":8.5}],\"summary\":\"Brief summary of what you see\"}\nFor shifts ending at 0:00 or 00:00, use \"00:00\" as end time.\nCalculate hours accurately. Include ALL visible shifts including training sessions.", "screenshot_read": "You read screenshots for a music producer's personal app. Return ONLY one JSON object on a single line, no other text: {\"text\":\"...\",\"description\":\"...\",\"tags\":[\"...\"],\"kind\":\"...\",\"suggest\":[\"...\"]}. text: the readable words in the screenshot, verbatim, at most 1200 characters, line breaks written as \" / \". description: one plain sentence saying what it is, e.g. \"Instagram post with a chicken tikka recipe\". tags: 3 to 6 lowercase search words. kind: one of recipe, product, idea, music, article, message, rota (a work rota or shift schedule), other. suggest: 0 to 2 of wishlist (something to buy), idea (a tip or insight worth remembering), recipe (a dish to cook), journal (a personal note, plan or reminder), shifts (a work rota with shift dates and times). Never invent text that is not visible.", "tutor": "You are a private tutor with a PhD in {subject}"};
  /* ===END PROMPTS=== */
  R.prompt = function (name, vars) {
    var t = (R.PROMPTS || {})[name];
    if (t == null) throw new Error('No prompt file prompts/' + name + '.md');
    return t.replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? String(vars[k]) : m; });
  };
  // The realm lens file (realm_lenses.json, repo root): loaded once, shared.
  R.realmLenses = function () {
    if (!R._lensP) R._lensP = fetch('/realm_lenses.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('lenses ' + r.status); return r.json(); })
      .catch(function (e) { R._lensP = null; throw e; });
    return R._lensP;
  };

  // RC-0 (Oct 15 2026): the realm<->phylum map, from realm_lenses.json
  // (each realm's "phyla"). Resolves to { byPhylum: {n: realm}, byRealm:
  // {realm: [n]} }; R.phylumRealmMap holds the last loaded copy for sync use.
  // Phylum 21 (Miscellaneous) has no realm.
  R.phylumRealmMap = null;
  R.phylumRealms = function () {
    return R.realmLenses().then(function (data) {
      var out = { byPhylum: {}, byRealm: {} }, realms = (data && data.realms) || {};
      Object.keys(realms).forEach(function (k) {
        var list = (realms[k].phyla || []).map(Number).filter(function (n) { return n > 0; });
        out.byRealm[k] = list;
        list.forEach(function (n) { if (!out.byPhylum[n]) out.byPhylum[n] = k; });
      });
      R.phylumRealmMap = out;
      return out;
    });
  };

  // RI-4 (Oct 15 2026): the lens lines for a set of realms, for any in-app
  // prompt (book chapters, screenshot reads) - the same realm_lenses.json the
  // cloud video analyser reads. No realms = Producer (inputs from before the
  // picker). Resolves to { keys, names, text }; never rejects (a missing lens
  // file still names the realms).
  R.realmLensText = function (realms) {
    var X = R.modules.xpSeason;
    var keys = (R.realmPicker ? R.realmPicker.clean(realms) : []);
    if (!keys.length) keys = ['producer'];
    var name = function (k, L) { return (L && L.name) || (X && X.REALMS[k] ? X.REALMS[k].name : k); };
    return R.realmLenses().catch(function () { return { realms: {} }; }).then(function (data) {
      var lenses = (data && data.realms) || {};
      return {
        keys: keys,
        names: keys.map(function (k) { return name(k, lenses[k]); }),
        text: keys.map(function (k) {
          var L = lenses[k];
          return '- ' + name(k, L) + ' (key "' + k + '")' + (L && L.looks_for ? ': looks for ' + L.looks_for : '');
        }).join('\n')
      };
    });
  };
  // A model's [{text, realm}] (or plain strings) -> { texts, realmOf: {text: realm} }.
  // Realms outside `keys` fall back to the first key; never trusted to the model.
  R.splitRealmInsights = function (list, keys) {
    var texts = [], map = {};
    (Array.isArray(list) ? list : []).forEach(function (x) {
      var t = typeof x === 'string' ? x : (x && (x.text || x.insight)) || '';
      t = String(t).trim();
      if (!t) return;
      var r = x && typeof x === 'object' && keys.indexOf(x.realm) !== -1 ? x.realm : keys[0];
      texts.push(t); map[t] = r;
    });
    return { texts: texts, realmOf: map };
  };

  // RI-5 (Oct 15 2026): filing by realm. ONE chip row for every list that
  // filters by realm (Life Library, Encyclopedia ideas + posts): "All" plus
  // only the realms that have something in them (Alex's choice), counts
  // shown, xpSeason order. opts: { counts: {realm: n}, selected, onPick,
  // className }.
  R.realmFilterRow = function (opts) {
    var X = R.modules.xpSeason, counts = opts.counts || {}, row = document.createElement('div');
    row.className = opts.className || 'realm-filter';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Filter by realm');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px;';
    var keys = (X ? X.ORDER : []).filter(function (k) { return counts[k] > 0; });
    if (!keys.length) { row.hidden = true; return row; }
    var total = 0; Object.keys(counts).forEach(function (k) { total += counts[k] || 0; });
    [''].concat(keys).forEach(function (k) {
      var on = (opts.selected || '') === k;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'realm-filter-chip'; b.dataset.realm = k;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.textContent = k ? X.REALMS[k].icon + ' ' + X.REALMS[k].name + ' ' + counts[k] : 'All realms';
      b.style.cssText = 'min-height:40px;padding:6px 12px;border-radius:18px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:13px;font-weight:700;' +
        (on ? 'background:var(--gold);color:#111;border:none;' : 'background:none;color:var(--text);border:1px solid var(--border);');
      b.onclick = function () { opts.onPick(on && k ? '' : k); };
      row.appendChild(b);
    });
    return row;
  };
  // RC-2 (Oct 15 2026): what each realm knows - accepted jargon terms and
  // Life Library items, counted by realm (realmOf, phylum shelf fallback).
  // { realm: { terms, items } }. Cached 60s; R._knowCache cleared on saves.
  R.realmKnowledge = function (force) {
    var c = R._knowCache;
    if (!force && c && Date.now() - c.at < 60000) return Promise.resolve(c.data);
    var lib = R.modules.lifeLibrary;
    var items = lib && lib.logic.signedIn() ? (lib._loaded ? Promise.resolve(lib._items) : lib.logic.load().then(function () { return lib._items; })) : Promise.resolve([]);
    return Promise.all([
      R.phylumRealms().catch(function () { return null; }),
      R.sb.select('jargon_encyclopedia', 'select=phylum_number&status=eq.accepted&limit=5000').catch(function () { return []; }),
      items.catch(function () { return []; }),
      // VW-5: key points from video realm sections (one realm per card).
      R.sb.select('encyclopedia_insights', 'select=realms&idea_section=eq.point&limit=5000').catch(function () { return []; }),
    ]).then(function (r) {
      var out = {}, get = function (k) { return out[k] = out[k] || { terms: 0, items: 0, points: 0 }; };
      (r[1] || []).forEach(function (t) { R.realmOf('jargon_encyclopedia', t).forEach(function (k) { get(k).terms++; }); });
      (r[2] || []).forEach(function (i) { R.realmOf('library_items', i).forEach(function (k) { get(k).items++; }); });
      (Array.isArray(r[3]) ? r[3] : []).forEach(function (c) { (c.realms || []).forEach(function (k) { get(k).points++; }); });
      R._knowCache = { at: Date.now(), data: out };
      return out;
    });
  };
  // RC-3/RC-4: one realm's raw knowledge for an Oracle prompt - up to 15
  // accepted jargon terms from its phyla + its last 10 Library titles.
  // Shared by questEngine.suggestFor and xpSeason milestone proposals.
  R.realmKnowledgeFor = function (realm) {
    var lib = R.modules.lifeLibrary;
    return Promise.all([
      R.phylumRealms().catch(function () { return { byRealm: {} }; }),
      lib && lib.logic.signedIn() ? (lib._loaded ? Promise.resolve(lib._items) : lib.logic.load().then(function () { return lib._items; })).catch(function () { return []; }) : Promise.resolve([]),
    ]).then(function (res) {
      var phyla = (res[0].byRealm || {})[realm] || [];
      var items = (res[1] || []).filter(function (i) { return R.realmOf('library_items', i).indexOf(realm) !== -1; })
        .slice(-10).map(function (i) { return i.title; }).filter(Boolean);
      var terms = phyla.length
        ? R.sb.select('jargon_encyclopedia', 'select=term&status=eq.accepted&phylum_number=in.(' + phyla.join(',') + ')&order=created_at.desc&limit=15').catch(function () { return []; })
        : Promise.resolve([]);
      return terms.then(function (t) {
        return { terms: (t || []).map(function (x) { return x.term; }).filter(Boolean), items: items };
      });
    });
  };
  R.realmKnowledgeText = function (k) {
    if (!k || !(k.terms || k.items || k.points)) return '';
    var bits = [];
    if (k.terms) bits.push(k.terms + ' term' + (k.terms === 1 ? '' : 's'));
    if (k.items) bits.push(k.items + ' in your Library');
    if (k.points) bits.push(k.points + ' video point' + (k.points === 1 ? '' : 's'));
    return bits.join(' · ');
  };
  // Count rows per realm (a row with several realms counts once in each).
  R.realmCounts = function (rows, table) {
    var c = {};
    (rows || []).forEach(function (r) { R.realmOf(table, r).forEach(function (k) { c[k] = (c[k] || 0) + 1; }); });
    return c;
  };
  // What was taken in for each realm this calendar month, from the Life
  // Library: { realm: { total, kinds: {video: n, ...} } }. Cached 60s.
  R.realmTakenIn = function (force) {
    var lib = R.modules.lifeLibrary, c = R._takenCache;
    if (!lib || !lib.logic.signedIn()) return Promise.resolve({});
    if (!force && c && Date.now() - c.at < 60000) return Promise.resolve(c.data);
    var d = new Date(), start = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
    return lib.logic.read('library_items', 'select=kind,realms,created_at&created_at=gte.' + start + '&limit=1000').then(function (rows) {
      var out = {};
      (rows || []).forEach(function (i) {
        R.realmOf('library_items', i).forEach(function (k) {
          var o = out[k] = out[k] || { total: 0, kinds: {} };
          o.total++; o.kinds[i.kind] = (o.kinds[i.kind] || 0) + 1;
        });
      });
      R._takenCache = { at: Date.now(), data: out };
      return out;
    });
  };
  // "3 videos, 1 book" from one realm's taken-in entry.
  R.realmTakenText = function (o) {
    if (!o || !o.total) return '';
    var plural = { video: 'videos', book: 'books', screenshot: 'screenshots', web_lookup: 'web lookups', answer: 'Oracle answers', music: 'tracks', note: 'notes', link: 'links', quote: 'quotes', course: 'courses', file: 'files', recommendation: 'recommendations' };
    var single = { web_lookup: 'web lookup', answer: 'Oracle answer', music: 'track', recommendation: 'recommendation' };
    return Object.keys(o.kinds).sort(function (a, b) { return o.kinds[b] - o.kinds[a]; }).map(function (k) {
      var n = o.kinds[k]; return n + ' ' + (n === 1 ? (single[k] || k) : (plural[k] || k + 's'));
    }).join(', ');
  };

  // Realm Inputs RI-2 (Oct 15 2026). ONE picker for every input (video
  // links, books, screenshots, web lookups, starred replies, Library adds):
  // the 13 realms as chips, up to 4, the ones used most recently first.
  // Alex: always ask. pick() resolves to an array of realm keys, or null
  // when he taps "Not now" (RI-3 holds those inputs until he picks).
  // Sits above every popup (z 100001); a second ask waits for the first.
  R.realmPicker = {
    MAX: 4,
    _key: 'rpgace_recent_realms',
    _chain: Promise.resolve(),
    clean: function (list) {
      var X = R.modules.xpSeason, seen = {};
      return (Array.isArray(list) ? list : []).filter(function (k) {
        if (!X || !X.REALMS[k] || seen[k]) return false; seen[k] = 1; return true;
      }).slice(0, R.realmPicker.MAX);
    },
    recent: function () {
      try { return R.realmPicker.clean(JSON.parse(localStorage.getItem(R.realmPicker._key) || '[]')); } catch (e) { return []; }
    },
    remember: function (list) {
      var all = R.realmPicker.clean(list).concat([]);
      var old = []; try { old = JSON.parse(localStorage.getItem(R.realmPicker._key) || '[]'); } catch (e) {}
      (Array.isArray(old) ? old : []).forEach(function (k) { if (all.indexOf(k) === -1) all.push(k); });
      try { localStorage.setItem(R.realmPicker._key, JSON.stringify(all.slice(0, 13))); } catch (e) {}
    },
    // Recent realms first, then the rest in xpSeason order.
    order: function () {
      var X = R.modules.xpSeason, rec = R.realmPicker.recent();
      var rest = (X ? X.ORDER : []).filter(function (k) { return rec.indexOf(k) === -1; });
      return rec.concat(rest);
    },
    // opts: { what: 'video' | 'book' | ..., title: the input's name,
    //         preset: [keys], note: one line under the title }
    pick: function (opts) {
      var P = R.realmPicker;
      var run = function () { return P._open(opts || {}); };
      var p = P._chain.then(run, run);
      P._chain = p.catch(function () {});
      return p;
    },
    _open: function (opts) {
      var P = R.realmPicker, X = R.modules.xpSeason;
      if (!X) return Promise.resolve(null);
      return new Promise(function (resolve) {
        var chosen = P.clean(opts.preset);
        var ov = document.createElement('div');
        ov.className = 'realm-pick-ov';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-modal', 'true');
        ov.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(8,8,16,0.9);display:flex;align-items:center;justify-content:center;padding:16px;';
        var box = document.createElement('div');
        box.style.cssText = 'background:var(--panel);border:1px solid var(--gold);border-radius:12px;padding:20px;width:min(460px,100%);max-height:90vh;overflow-y:auto;font-family:Rajdhani,sans-serif;';
        var eb = document.createElement('div');
        eb.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:6px;';
        eb.textContent = 'Which realms is this for?';
        var ti = document.createElement('div');
        ti.className = 'realm-pick-title';
        ti.style.cssText = 'font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px;word-break:break-word;';
        ti.textContent = (opts.what ? opts.what.charAt(0).toUpperCase() + opts.what.slice(1) + ': ' : '') + (opts.title || 'New input');
        var sub = document.createElement('div');
        sub.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:12px;';
        sub.textContent = opts.note || ('Pick up to ' + P.MAX + '. It is saved under these realms.');
        var grid = document.createElement('div');
        grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
        var save = document.createElement('button');
        var later = document.createElement('button');
        var chips = {};
        var paint = function () {
          Object.keys(chips).forEach(function (k) {
            var on = chosen.indexOf(k) !== -1, full = !on && chosen.length >= P.MAX;
            chips[k].setAttribute('aria-pressed', on ? 'true' : 'false');
            chips[k].style.background = on ? 'var(--gold)' : 'var(--panel2)';
            chips[k].style.color = on ? '#000' : 'var(--text)';
            chips[k].style.opacity = full ? '0.45' : '1';
          });
          save.disabled = !chosen.length;
          save.style.opacity = chosen.length ? '1' : '0.5';
          save.textContent = chosen.length ? 'Save (' + chosen.length + ')' : 'Pick at least one';
        };
        P.order().forEach(function (k) {
          var r = X.REALMS[k];
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'realm-chip';
          b.dataset.realm = k;
          b.textContent = r.icon + ' ' + r.name;
          b.style.cssText = 'min-height:44px;padding:8px 14px;border:1px solid var(--border);border-radius:22px;font-size:14px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
          b.onclick = function () {
            var i = chosen.indexOf(k);
            if (i !== -1) chosen.splice(i, 1);
            else if (chosen.length < P.MAX) chosen.push(k);
            else { RPGACE.utils.toast('Up to ' + P.MAX + ' realms', '#888', 1800); return; }
            paint();
          };
          chips[k] = b;
          grid.appendChild(b);
        });
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;';
        save.type = 'button'; save.className = 'realm-pick-save';
        save.style.cssText = 'flex:2;min-width:140px;min-height:44px;background:var(--gold);color:#000;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
        later.type = 'button'; later.className = 'realm-pick-later';
        later.textContent = 'Not now';
        // RI-3: when several held inputs are asked in a row, one tap puts
        // them all off until the next time the app opens.
        var allLater = null;
        if (opts.skipAll) {
          allLater = document.createElement('button');
          allLater.type = 'button'; allLater.className = 'realm-pick-all-later';
          allLater.textContent = 'Ask me later (all)';
          allLater.style.cssText = 'flex-basis:100%;min-height:44px;background:none;color:var(--muted);border:none;font-size:13px;text-decoration:underline;cursor:pointer;font-family:Rajdhani,sans-serif;';
          allLater.onclick = function () { P._skipAll = true; done(null); };
        }
        later.style.cssText = 'flex:1;min-width:100px;min-height:44px;background:none;color:var(--muted);border:1px solid var(--border);border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
        var done = function (val) {
          document.removeEventListener('keydown', onKey, true);
          ov.remove();
          if (val) P.remember(val);
          resolve(val);
        };
        var onKey = function (e) { if (e.key === 'Escape') { e.stopPropagation(); done(null); } };
        save.onclick = function () { if (chosen.length) done(chosen.slice()); };
        later.onclick = function () { done(null); };
        document.addEventListener('keydown', onKey, true);
        row.appendChild(save); row.appendChild(later);
        if (allLater) row.appendChild(allLater);
        box.appendChild(eb); box.appendChild(ti); box.appendChild(sub); box.appendChild(grid); box.appendChild(row);
        ov.appendChild(box);
        document.body.appendChild(ov);
        paint();
      });
    },
    // Ask, then write the choice onto a row that already exists (inputs
    // that are saved first, e.g. a starred reply or a web lookup). "Not now"
    // writes an empty list, which marks the row as waiting (RI-3).
    tag: function (table, id, opts) {
      return R.realmPicker.pick(opts).then(function (realms) {
        if (!id) return realms;
        R._takenCache = null; R._knowCache = null;
        return RPGACE.sb.secureWrite(table, 'update', { realms: realms || [] }, 'id=eq.' + id).then(function () { return realms; });
      });
    },

    // ── RI-3 (Oct 15 2026): inputs waiting for realms ──────────────────
    // "Not now" holds an input: a video job sits at status 'awaiting_realms'
    // (the cloud runner only takes 'queued', so it waits); a book,
    // screenshot or Library item keeps realms = {} (empty list = asked,
    // not answered; null = from before the picker, never nagged). Alex:
    // "if i return to app without choosing, the pop-up is the first thing
    // i choose and see on return" - askHeld() runs after sign-in and when
    // the app comes back to the front, oldest first, one at a time.
    EMPTY: 'realms=eq.%7B%7D',
    held: function () {
      var P = R.realmPicker, safe = function (p) { return Promise.resolve(p).catch(function () { return []; }); };
      var lib = R.modules.lifeLibrary, shot = R.modules.screenshotInbox;
      var signed = !!(lib && lib.logic.signedIn());
      return Promise.all([
        safe(R.sb.select('intel_jobs', 'select=id,url,created_at&status=eq.awaiting_realms&order=created_at.asc&limit=50')),
        safe(R.sb.select('bookworm_books', 'select=id,title,created_at&' + P.EMPTY + '&order=created_at.asc&limit=50')),
        signed && shot ? safe(shot.logic.api('held')) : [],
        signed ? safe(lib.logic.read('library_items', 'select=id,kind,title,created_at,source_table&' + P.EMPTY + '&order=created_at.asc&limit=100')) : []
      ]).then(function (r) {
        var arr = function (x) { return Array.isArray(x) ? x : []; }, out = [];
        arr(r[0]).forEach(function (j) { out.push({ table: 'intel_jobs', id: j.id, what: 'video', title: j.url, at: j.created_at }); });
        arr(r[1]).forEach(function (b) { out.push({ table: 'bookworm_books', id: b.id, what: 'book', title: b.title, at: b.created_at }); });
        arr(r[2]).forEach(function (x) { out.push({ table: 'screenshots', id: x.id, what: 'screenshot', title: x.description || 'Screenshot', at: x.created_at }); });
        // A book's or screenshot's own Library item is answered with it.
        arr(r[3]).filter(function (i) { return i.source_table !== 'bookworm_books' && i.source_table !== 'screenshots'; }).forEach(function (i) {
          var k = lib && lib.KINDS[i.kind] ? String(lib.KINDS[i.kind]).replace(/^\S+\s/, '').toLowerCase() : 'Library item';
          out.push({ table: 'library_items', id: i.id, what: k, title: i.title, at: i.created_at });
        });
        return out.sort(function (a, b) { return String(a.at || '').localeCompare(String(b.at || '')); });
      });
    },
    // Write the picked realms; a held video goes back in the queue.
    release: function (it, realms) {
      var sw = RPGACE.sb.secureWrite, id = encodeURIComponent(it.id);
      R._takenCache = null; R._knowCache = null;
      var libToo = function (src) {
        return sw('library_items', 'update', { realms: realms }, 'source_table=eq.' + src + '&source_id=eq.' + id).catch(function () {});
      };
      if (it.table === 'intel_jobs') return sw('intel_jobs', 'update', { realms: realms, status: 'queued' }, 'id=eq.' + id + '&status=eq.awaiting_realms');
      if (it.table === 'bookworm_books') return sw('bookworm_books', 'update', { realms: realms }, 'id=eq.' + id).then(function () { return libToo('bookworm_books'); });
      if (it.table === 'screenshots') return R.modules.screenshotInbox.logic.api('update', { id: it.id, patch: { realms: realms } }).then(function () { return libToo('screenshots'); });
      return sw('library_items', 'update', { realms: realms }, 'id=eq.' + id);
    },
    // Resolves to { asked, picked, left }.
    askHeld: function () {
      var P = R.realmPicker;
      if (P._asking) return P._asking;
      P._skipAll = false;
      P._asking = P.held().then(function (list) {
        var picked = 0, i = 0;
        var next = function () {
          if (i >= list.length || P._skipAll) return { asked: i, picked: picked, left: list.length - picked };
          var it = list[i++];
          return P.pick({ what: it.what, title: it.title, skipAll: list.length > 1,
            note: 'Waiting for realms' + (list.length > 1 ? ' (' + i + ' of ' + list.length + ')' : '') + '. Pick up to ' + P.MAX + '.' })
            .then(function (realms) {
              if (!realms) return next();
              return P.release(it, realms).then(function () { picked++; }, function (e) {
                RPGACE.utils.toast('Could not save realms: ' + (e.message || e), '#CC4A4A', 4000, 'realmPicker');
              }).then(next);
            });
        };
        return next();
      }).then(function (res) {
        P._asking = null;
        if (res.picked) R.hooks.fire('realms:released', res);
        return res;
      }, function (e) { P._asking = null; throw e; });
      return P._asking;
    },
    // After sign-in, and whenever the app comes back to the front (at most
    // every 10 minutes) - so a held input is the first thing he sees.
    _watchReturn: function () {
      var P = R.realmPicker;
      if (P._watching) return; P._watching = true;
      var run = function () {
        var lib = R.modules.lifeLibrary;
        if (!lib || !lib.logic.signedIn()) return;
        P._lastAsk = Date.now();
        P.askHeld().catch(function (e) { console.warn('[realmPicker] held check failed:', e && e.message); });
      };
      R.hooks.on('rpgace:login', function () { setTimeout(run, 1500); });
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && Date.now() - (P._lastAsk || 0) > 600000) run();
      });
    }
  };
  if (typeof document !== 'undefined') R.realmPicker._watchReturn();

  // Oct 21 2026 (Alex: "redesign the pages in cooking with right screen
  // feature, I need this for most pages"): the one side shortcut list, first
  // built for My Day (MDX). A page keeps its main job; everything else sits
  // here. open({label, groups:[[heading, [[icon, text, fn], ...]], ...]})
  // slides it in from the left (☰ or a swipe right inside the page); attach()
  // wires the swipe on any element. Swipes starting within 40px of the edge
  // are left alone (that's the phone's Back gesture and the main side menu).
  R.sideList = {
    _css: function () {
      if (document.getElementById('side-list-css')) return;
      var st = document.createElement('style'); st.id = 'side-list-css';
      st.textContent =
        '.side-list-bg{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.45)}' +
        '.side-list{position:fixed;top:0;bottom:0;left:0;z-index:100001;width:min(86vw,360px);background:var(--panel);border-right:1px solid var(--border);overflow-y:auto;padding:calc(40px + env(safe-area-inset-top,0px)) 14px 20px;box-sizing:border-box;transform:translateX(-100%);transition:transform .22s var(--ease-drawer,ease-out)}' +
        '.side-list.open{transform:none}.side-list h3{font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:14px 0 6px}' +
        '.side-list .side-list-title{font-size:13px;font-weight:700;color:var(--gold);margin:0 0 4px}' +
        '.side-list button{display:flex;align-items:center;gap:10px;width:100%;min-height:48px;padding:8px 10px;border:0;border-radius:10px;background:none;color:var(--text);font-size:15px;text-align:left;cursor:pointer;font-family:inherit}.side-list button:hover{background:rgba(255,255,255,0.05)}.side-list button:focus-visible{outline:2px solid var(--gold);outline-offset:-2px}' +
        // UI Debloat (Oct 27 2026, Alex: "the button beneath selling should be a right swipe, not that button
        // structure"): the round ☰ is now a slim tab on the left edge; swiping right still opens the list.
        '.side-list-btn{position:fixed;left:0;top:50%;transform:translateY(-50%);z-index:9000;width:16px;min-width:16px;height:72px;padding:0;border-radius:0 10px 10px 0;border:1px solid var(--border);border-left:0;background:var(--panel);color:var(--muted);font-size:13px;line-height:1;cursor:pointer;font-family:inherit;opacity:.7}' +
        '.side-list-btn:hover,.side-list-btn:focus-visible{opacity:1;color:var(--gold)}' +
        '.area-bar:not(:has(> :not(.side-list-btn))){margin:0!important;padding:0!important;min-height:0!important;height:0}' +
        // Pages fold extras away with el.hidden; inline display styles would beat the browser's own [hidden].
        '.dd-overlay [hidden]{display:none!important}' +
        '@media (prefers-reduced-motion:reduce){.side-list{transition:none}}';
      document.head.appendChild(st);
    },
    isOpen: function () { return !!document.querySelector('.side-list'); },
    open: function (o) {
      o = o || {};
      if (this.isOpen()) return null;
      this._css();
      var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
      var bg = document.createElement('div'); bg.className = 'side-list-bg' + (o.bgCls ? ' ' + o.bgCls : ''); if (o.bgId) bg.id = o.bgId;
      var d = document.createElement('nav'); d.className = 'side-list' + (o.cls ? ' ' + o.cls : ''); if (o.id) d.id = o.id;
      d.setAttribute('aria-label', (o.label || 'Shortcuts'));
      var done = false;
      var close = function () {
        if (done) return; done = true;
        document.removeEventListener('keydown', onKey);
        d.classList.remove('open'); setTimeout(function () { d.remove(); bg.remove(); }, 220);
      };
      var onKey = function (e) { if (e.key === 'Escape') close(); };
      bg.onclick = close;
      if (o.title) { var t = document.createElement('div'); t.className = 'side-list-title'; t.textContent = o.title; d.appendChild(t); }
      (o.groups || []).forEach(function (gr) {
        var items = (gr[1] || []).filter(Boolean);
        if (!items.length) return;
        var h = document.createElement('h3'); h.textContent = gr[0]; d.appendChild(h);
        items.forEach(function (it) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'side-list-item' + (o.itemCls ? ' ' + o.itemCls : '');
          if (it[3]) b.dataset.key = it[3];
          b.innerHTML = '<span aria-hidden="true">' + esc(it[0]) + '</span><span>' + esc(it[1]) + '</span>';
          b.onclick = function () { close(); try { it[2](); } catch (e) { console.warn('[sideList]', e); R.utils && R.utils.toast && R.utils.toast('⚠️ Could not open that: ' + (e.message || e), '#CC4A4A', 3200); } };
          d.appendChild(b);
        });
      });
      if (!d.querySelector('button') && o.empty) { var em = document.createElement('div'); em.className = 'side-list-empty'; em.style.cssText = 'font-size:14px;color:var(--muted);padding:10px 4px;'; em.textContent = o.empty; d.appendChild(em); }
      document.body.appendChild(bg); document.body.appendChild(d);
      document.addEventListener('keydown', onKey);
      requestAnimationFrame(function () { d.classList.add('open'); var f = d.querySelector('button'); if (f) f.focus({ preventScroll: true }); });
      var sx = null;
      d.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
      d.addEventListener('touchend', function (e) { var t = e.changedTouches[0]; if (sx != null && sx - t.clientX > 60) close(); sx = null; }, { passive: true });
      return { el: d, close: close };
    },
    // Swipe right inside `el` opens the list. getOpts() is called at swipe
    // time; o.ignore = selector of things that own their own swipes/drags;
    // o.when() can veto (e.g. My Day only on its new home).
    attach: function (el, getOpts, o) {
      o = o || {};
      if (!el || el._sideListSwipe) return;
      el._sideListSwipe = true;
      var self = this, s = null;
      el.addEventListener('touchstart', function (e) {
        if ((o.when && !o.when()) || !e.touches || e.touches.length !== 1) { s = null; return; }
        var t = e.touches[0];
        if (t.clientX < 40 || (o.ignore && e.target.closest && e.target.closest(o.ignore)) || (e.target.closest && e.target.closest('input,select,textarea,[data-no-side-swipe]')) || self._inScroller(e.target, el)) { s = null; return; }
        s = { x: t.clientX, y: t.clientY, t: Date.now() };
      }, { passive: true });
      el.addEventListener('touchend', function (e) {
        if (!s) return;
        var t = e.changedTouches && e.changedTouches[0], a = s; s = null;
        if (!t || (o.busy && o.busy())) return;
        var dx = t.clientX - a.x, dy = t.clientY - a.y;
        if (dx > 70 && Math.abs(dy) < 45 && Date.now() - a.t < 800) { var op = getOpts(); if (op) self.open(op); }
      }, { passive: true });
    },
    // A row that scrolls sideways owns its own swipes (chip rows, tabs).
    _inScroller: function (t, stop) {
      for (var n = t; n && n !== stop && n.nodeType === 1; n = n.parentElement) {
        if (n.scrollWidth > n.clientWidth + 2) { var ox = getComputedStyle(n).overflowX; if (ox === 'auto' || ox === 'scroll') return true; }
      }
      return false;
    },

    // ── SL-0 (Oct 21 2026, plan "Side List Everywhere + Real-Day Timeline",
    // records/2026-10/side_list_everywhere_ceo_2026-10-21.txt). Alex: one
    // shared hook - every area bar (areaNav.bar) and every card popup's nav
    // row (dashDeck._popup) gets ☰. The list = This page (the host's own
    // extras, host._sideExtras) + On this page (host._sideJumps) + this
    // area's screens, read from the left menu (leftNav.groupItems) so there
    // is no second copy of any area's screen list. Other areas stay in the
    // left menu (his answer: "This area only").
    AREA_HEADINGS: {
      content: ['Content & Video'], beats: ['Content & Video'], posting: ['Content & Video'], selling: ['Content & Video'],
      money: ['Content & Video', 'Habits'], knowledge: ['Knowledge'], habits: ['Habits'],
      myday: ['Schedule & Journal'], schedule: ['Schedule & Journal'], chronicles: ['Chronicles'], oracle: ['Oracle'], oversight: ['Oversight']
    },
    // [heading, items] for an area; `current` {page, card} leaves out the
    // screen you're on. Tapping an item runs the menu's own action.
    areaGroup: function (area, current) {
      var ln = R.modules.leftNav;
      if (!ln || !ln.groupItems) return null;
      var a = R.AREAS[area] || {}, heads = this.AREA_HEADINGS[area] || (a.label ? [a.label] : []);
      var seen = {}, cur = current || {};
      var items = ln.groupItems(heads).filter(function (it) {
        if (!it.label || seen[it.label]) return false;
        seen[it.label] = 1;
        if (cur.page && it.page === cur.page) return false;
        if (cur.card && it.card === cur.card) return false;
        return true;
      }).map(function (it) { return [it.icon || '•', it.label, function () { if (R.areaNav) R.areaNav.closePopups(); ln.activate(it); }, 'area:' + it.label]; });
      return [heads.join(' · ') || 'This area', items];
    },
    extrasOf: function (host) {
      var ex = host && host._sideExtras;
      try { ex = typeof ex === 'function' ? ex() : ex; } catch (e) { ex = null; }
      return Array.isArray(ex) ? ex : [];
    },
    // The full list for a page or popup.
    optsFor: function (area, host, current) {
      var a = R.AREAS[area] || {}, groups = [['This page', this.extrasOf(host)]];
      var jumps = host && typeof host._sideJumps === 'function' ? host._sideJumps() : [];
      if (jumps.length) groups.push(['On this page', jumps]);
      var ag = this.areaGroup(area, current);
      if (ag) groups.push(ag);
      return { id: 'side-area', cls: 'side-area', itemCls: 'side-area-item', label: (a.label || 'Area') + ' shortcuts',
        title: (a.icon ? a.icon + ' ' : '') + (a.label || ''), groups: groups, empty: 'Nothing else here yet.' };
    },
    // Wires ☰ + swipe for a host (a .page or a popup overlay). getOpts may be
    // overridden later by host._sideOpts (Cooking's own list).
    wire: function (host, bar, getOpts) {
      var self = this;
      var get = function () { return host && typeof host._sideOpts === 'function' ? host._sideOpts() : getOpts(); };
      var b = this.button(get, 'Shortcuts');
      b.classList.add('side-area-btn');
      if (bar) bar.insertBefore(b, bar.firstChild);
      if (host) this.attach(host, get, { ignore: '.mdx-lane,.mdx-chip,.mdx-scroll,.mdx-week,.xp-hud' });
      return b;
    },
    // ☰ 'On this page': the host's section headings, tap scrolls there.
    jumps: function (host, selector, labelOf) {
      if (!host) return;
      host._sideJumps = function () {
        return Array.prototype.slice.call(host.querySelectorAll(selector)).filter(function (el) {
          var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0;
        }).map(function (el, i) {
          var t = (labelOf ? labelOf(el) : el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
          return ['↘', t || 'Section ' + (i + 1), function () { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 'jump:' + i];
        });
      };
    },
    // A form folded behind one "➕ ..." button (Stock, Reference tracks,
    // Wishlist...). els are hidden until the button (or ☰ item) reveals
    // them. Returns { button, reveal }.
    foldForm: function (container, els, focusEl, label, opts) {
      opts = opts || {};
      this._css();
      var t = document.createElement('button');
      t.type = 'button';
      t.className = 'side-fold-btn' + (opts.cls ? ' ' + opts.cls : '');
      t.textContent = label;
      t.style.cssText = opts.style || 'display:block;width:100%;min-height:44px;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--panel2);color:var(--text);font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;';
      // An inline display (flex/grid rows) beats the hidden attribute, so park it too.
      els.forEach(function (e) { e.hidden = true; e._foldDisp = e.style.display; e.style.display = 'none'; });
      var reveal = function () {
        els.forEach(function (e) { e.hidden = false; e.style.display = e._foldDisp || ''; });
        t.hidden = true;
        if (focusEl) { try { focusEl.focus(); } catch (e) {} if (focusEl.scrollIntoView) focusEl.scrollIntoView({ block: 'center' }); }
      };
      t.onclick = reveal;
      if (opts.before) container.insertBefore(t, opts.before); else container.appendChild(t);
      return { button: t, reveal: reveal };
    },
    // A row of filter chips folded into one "Filter: All ▾" row. The chips
    // keep their own handlers; the row shows what's picked (aria-pressed or
    // .active chips, or opts.label()).
    filterRow: function (chips, opts) {
      opts = opts || {};
      if (!chips || chips._sideFilter) return null;
      this._css();
      chips._sideFilter = true;
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'side-filter-row';
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;width:100%;min-height:44px;padding:8px 14px;margin:0 0 8px;border-radius:10px;border:1px solid var(--border);background:var(--panel2);color:var(--text);font-size:14px;cursor:pointer;font-family:inherit;';
      var picked = function () {
        if (opts.label) return opts.label();
        var on = Array.prototype.slice.call(chips.querySelectorAll('[aria-pressed="true"],.active')).map(function (c) { return c.textContent.trim(); }).filter(Boolean);
        return on.length ? on.join(' · ') : 'All';
      };
      var paint = function () { row.innerHTML = ''; var a = document.createElement('span'); a.textContent = (opts.prefix || 'Filter') + ': ' + picked(); var b = document.createElement('span'); b.textContent = chips.hidden ? '▾' : '▴'; row.appendChild(a); row.appendChild(b); };
      chips.hidden = true;
      row.onclick = function () { chips.hidden = !chips.hidden; paint(); };
      chips.addEventListener('click', function (e) { if (e.target.closest('button')) setTimeout(function () { chips.hidden = true; paint(); }, 0); });
      chips.parentNode.insertBefore(row, chips);
      paint();
      return { row: row, refresh: paint };
    },

    // A ☰ button that opens the list (for a nav row or page header).
    button: function (getOpts, label) {
      this._css();
      var self = this, b = document.createElement('button');
      b.type = 'button'; b.className = 'side-list-btn'; b.textContent = '›';
      b.setAttribute('aria-label', label || 'Shortcuts');
      b.onclick = function () { var op = getOpts(); if (op) self.open(op); };
      return b;
    },
  };

  // Back + 🏠 for any area screen (page or popup). A screen calls
  // visit(area, {key, label, open}) when it shows; bar(area, opts) gives the
  // "← Back to <previous>" + "🏠 <Area>" row. Back re-opens the previous
  // screen of the SAME area (one stack per area); 🏠 opens R.AREAS[area].hub.
  // SL-0: the plain pages get their bar whenever one is shown.
  R.hooks.on('page:show', function () { setTimeout(function () { if (R.areaNav) R.areaNav.ensureBars(); }, 0); });
  R.areaNav = {
    _stacks: {},
    visit: function (area, entry) {
      if (!area || !entry || !entry.key) return;
      var s = this._stacks[area] = this._stacks[area] || [];
      var n = s.length;
      // Same screen again: refresh it. Otherwise it is a forward step: move
      // the screen to the top. Only back() steps backwards (it pops first).
      if (n && s[n - 1].key === entry.key) { s[n - 1] = entry; return; }
      for (var i = s.length - 1; i >= 0; i--) if (s[i].key === entry.key) s.splice(i, 1);
      s.push(entry);
      if (s.length > 20) s.shift();
    },
    previous: function (area) {
      var s = this._stacks[area] || [];
      return s.length > 1 ? s[s.length - 2] : null;
    },
    back: function (area) {
      var s = this._stacks[area] || [];
      if (s.length < 2) { this.home(area); return; }
      s.pop();
      var e = s[s.length - 1];
      try { e.open(); } catch (err) { console.warn('[areaNav] back failed', err); }
    },
    home: function (area) {
      var a = R.AREAS[area];
      if (a && typeof a.hub === 'function') a.hub();
    },
    _css: function () {
      if (document.getElementById('area-nav-css')) return;
      var st = document.createElement('style');
      st.id = 'area-nav-css';
      st.textContent = '.area-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 12px}' +
        '.area-bar button{min-height:44px;padding:8px 14px;border-radius:22px;border:1px solid var(--border);background:var(--panel2);color:var(--text);font-family:Rajdhani,sans-serif;font-size:14px;font-weight:700;cursor:pointer}' +
        '.area-bar button:hover{border-color:var(--border2)}' +
        '.area-bar .area-home{border-color:var(--area-c,var(--gold));color:var(--area-c,var(--gold))}' +
        // UI Debloat: the ☰ edge tab keeps its own shape inside a bar too.
        '.area-bar .side-list-btn{min-height:0;height:72px;width:16px;min-width:16px;padding:0;border-radius:0 10px 10px 0;background:var(--panel)}' +
        // UI Debloat: step tiles (areaNav.steps).
        '.an-tiles{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}' +
        '.an-tile{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-height:72px;padding:12px;border:1px solid var(--border);border-radius:14px;background:var(--panel);color:var(--text);font:inherit;text-align:left;cursor:pointer}' +
        '.an-next-lbl{font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:4px 0 6px}' +
        '.an-list{display:flex;flex-direction:column;gap:6px}.an-morelist{display:flex;flex-direction:column;gap:6px}.an-morelist[hidden]{display:none}' +
        '.an-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:10px;background:var(--panel)}' +
        '.an-row-first{border-color:var(--gold)}.an-row-ic{font-size:18px}.an-row-tx{flex:1 1 140px;min-width:0}' +
        '.an-row-t{display:block;width:100%;text-align:left;background:none;border:0;padding:0;color:var(--text);font:inherit;font-weight:700;font-size:14px;cursor:pointer}' +
        '.an-row-s{font-size:12px;color:var(--muted)}' +
        '.an-row-go{min-height:40px;padding:6px 12px;border:1px solid var(--border);border-radius:8px;background:var(--panel2);color:var(--text);font:inherit;font-size:13px;font-weight:700;cursor:pointer}' +
        '.an-more{margin-top:6px;min-height:36px;padding:4px 10px;border:0;background:none;color:var(--muted);font:inherit;font-size:13px;cursor:pointer}' +
        '.an-tile:hover,.an-tile:focus-visible{border-color:var(--gold)}.an-tile-hot{border-color:var(--gold)}.an-tile-info{cursor:default;background:none;border-style:dashed}.an-tile-info:hover{border-color:var(--border)}' +
        '.an-tile-name{font-size:16px;font-weight:700;line-height:1.2}.an-tile-count{font-size:12px;color:var(--muted);line-height:1.3;font-variant-numeric:tabular-nums}' +
        '.an-sheet{display:flex;flex-direction:column;gap:8px}.an-sheet-line{font-size:13px;color:var(--muted)}.an-sheet .an-sheet-btn{width:100%;min-height:48px;justify-content:flex-start;text-align:left}' +
        '@media (min-width:760px){.an-tiles{grid-template-columns:repeat(3,minmax(0,1fr))}}';
      document.head.appendChild(st);
    },
    // KN-2 (Oct 15 2026): turns a former popup into a full page of its area.
    // Makes the page div once (inside #app), closes any open dashDeck popups
    // (their history entries are handled by dashDeck._navClosed), shows the
    // page, records it for ← Back, puts the Back/🏠 row above a cleared body
    // and returns { box, close } shaped like dashDeck._popup's result, so the
    // owning module's own render code runs unchanged. close() is a no-op: a
    // page is left by navigating, not closed.
    _hosting: null,
    ensurePage: function (slug, title) {
      var id = 'page-' + slug, pg = document.getElementById(id);
      if (pg) return pg;
      var app = document.getElementById('app');
      if (!app) return null;
      pg = document.createElement('div');
      pg.className = 'page';
      pg.id = id;
      var t = document.createElement('div'); t.className = 'section-title'; t.textContent = title;
      var body = document.createElement('div'); body.className = 'area-page-body';
      pg.appendChild(t); pg.appendChild(body);
      app.appendChild(pg);
      return pg;
    },
    page: function (area, slug, title, entry) {
      var pg = this.ensurePage(slug, title);
      if (!pg) return null;
      this.closePopups();
      if (!pg.classList.contains('active') && typeof showPage === 'function') {
        this._hosting = slug;
        try { showPage(slug); } finally { this._hosting = null; }
      }
      if (entry) this.visit(area, entry);
      var body = pg.querySelector('.area-page-body');
      body.innerHTML = '';
      var old = pg.querySelector(':scope > .area-bar');
      if (old) old.remove();
      pg.insertBefore(this.bar(area), body);
      return { box: body, overlay: pg, close: function () {} };
    },
    // Closes every open dashDeck popup (their history entries are handled
    // by dashDeck._navClosed) - used before jumping from a popup to a page.
    closePopups: function () {
      var dd = R.modules.dashDeck;
      if (!dd || !dd._navStack) return;
      if (dd._navPrune) dd._navPrune();
      dd._navStack.slice().reverse().forEach(function (e) { try { e.close(); } catch (x) {} });
    },
    // A page shown by Back/URL rather than by its own open(): re-render it.
    onPageShow: function (slug, render) {
      var self = this;
      R.hooks.on('page:show', function (name) {
        if (name === slug && self._hosting !== slug) render();
      });
    },

    // SL-0: Schedule, Journal, Chronicles and Oracle were never area pages,
    // so they had no Back/🏠 row (and so no ☰). Put the shared bar at the
    // top of each (after its title) whenever it's shown.
    PLAIN_PAGES: { schedule: 'schedule', journal: 'schedule', chronicles: 'chronicles', oracle: 'oracle' },
    ensureBars: function () {
      var self = this, P = (R.CONFIG && R.CONFIG.pages) || {};
      Object.keys(this.PLAIN_PAGES).forEach(function (key) {
        var pg = P[key] && document.getElementById('page-' + P[key]);
        if (!pg || pg.querySelector(':scope > .area-bar')) return;
        var bar = self.bar(self.PLAIN_PAGES[key], { isHub: true });
        var t = pg.querySelector(':scope > .section-title');
        if (t) pg.insertBefore(bar, t.nextSibling); else pg.insertBefore(bar, pg.firstChild);
      });
    },

    // opts: { isHub: true } hides 🏠 on the hub itself.
    // UI Debloat (Oct 27 2026): one shared way every hub shows its steps -
    // a 2-column grid of small tiles (name, one count line, a badge). A step
    // with one action runs it on tap; otherwise a small sheet lists its
    // actions. steps: [{ n, name, count, badge, btns: [[label, key], ...] }];
    // makeBtn(b) returns that hub's own working button for b.
    // RF-4 (Oct 27 2026): one shared "What's next" for every hub and realm
    // home (Beats, Posting, Selling, Knowledge and the realm frame each drew
    // their own). items: [{ icon, title, sub, go: [label, fn], extra: [[label, fn]] }].
    // The first item is the headline; the rest sit under "+ N more". Each row
    // keeps the hub's own class prefix (cls-row, cls-row-t, cls-row-go).
    next: function (el, items, opts) {
      this._css();
      opts = opts || {};
      var cls = opts.cls || 'an', label = opts.label === undefined ? 'What\'s next' : opts.label;
      el.textContent = '';
      el.classList.add('an-next');
      if (label) { var lb = document.createElement('div'); lb.className = 'an-next-lbl'; lb.textContent = label; el.appendChild(lb); }
      items = items || [];
      var row = function (n, first) {
        var r = document.createElement('div'); r.className = cls + '-row an-row' + (first ? ' an-row-first' : '');
        if (n.id != null) r.dataset.id = n.id;
        var ic = document.createElement('span'); ic.className = 'an-row-ic'; ic.textContent = n.icon || '•'; ic.setAttribute('aria-hidden', 'true');
        var tx = document.createElement('div'); tx.className = cls + '-row-tx an-row-tx';
        var t = document.createElement(n.open ? 'button' : 'div'); t.className = cls + '-row-t an-row-t'; t.textContent = n.title;
        if (n.open) { t.type = 'button'; t.onclick = n.open; }
        tx.appendChild(t);
        if (n.sub) { var s = document.createElement('div'); s.className = cls + '-row-s an-row-s'; s.textContent = n.sub; tx.appendChild(s); }
        r.appendChild(ic); r.appendChild(tx);
        [n.go].concat(n.extra || []).forEach(function (b, i) {
          if (!b) return;
          var g = document.createElement('button'); g.type = 'button'; g.className = cls + '-row-go an-row-go' + (i ? ' ' + cls + '-row-extra' : '');
          g.textContent = b[0]; g.onclick = b[1]; r.appendChild(g);
        });
        return r;
      };
      if (!items.length) {
        var none = document.createElement('div'); none.className = cls + '-row-s an-next-none'; none.textContent = opts.empty || 'Nothing waiting.';
        el.appendChild(none);
        if (opts.emptyGo) { var eg = document.createElement('button'); eg.type = 'button'; eg.className = 'an-row-go'; eg.textContent = opts.emptyGo[0]; eg.onclick = opts.emptyGo[1]; el.appendChild(eg); }
        return;
      }
      var list = document.createElement('div'); list.className = cls + '-list an-list';
      list.appendChild(row(items[0], true));
      el.appendChild(list);
      if (items.length > 1) {
        var more = document.createElement('button'); more.type = 'button'; more.className = 'an-more ' + cls + '-more';
        var rest = document.createElement('div'); rest.className = 'an-morelist'; rest.hidden = !opts.open;
        items.slice(1).forEach(function (n) { rest.appendChild(row(n, false)); });
        var lab = function () { more.textContent = (rest.hidden ? '＋ ' : '－ ') + (items.length - 1) + ' more'; };
        more.onclick = function () { rest.hidden = !rest.hidden; lab(); }; lab();
        list.appendChild(rest); el.appendChild(more);
      }
    },
    steps: function (el, steps, makeBtn, cls) {
      this._css();
      el.textContent = '';
      el.classList.add('an-tiles');
      (steps || []).forEach(function (s) {
        var t = document.createElement('button'); t.type = 'button'; t.className = 'an-tile' + (cls ? ' ' + cls : ''); t.dataset.step = s.key != null ? s.key : s.n;
        t.innerHTML = '<span class="an-tile-name"></span><span class="an-tile-count"></span>';
        t.querySelector('.an-tile-name').textContent = s.name + (s.badge ? ' · ' + s.badge : '');
        t.querySelector('.an-tile-count').textContent = s.count || '';
        if (s.badge) t.classList.add('an-tile-hot');
        if (!(s.btns || []).length && !s.open && !(s.lines || []).length) { t.disabled = true; t.classList.add('an-tile-info'); }
        t.onclick = function () {
          var btns = s.btns || [];
          if (s.open) { s.open(); return; }
          if (btns.length === 1 && !(s.lines || []).length) { makeBtn(btns[0]).click(); return; }
          var pop = R.modules.dashDeck._popup({ eyebrow: s.name, title: s.count || s.name, width: '420px' });
          pop.box.classList.add('an-sheet');
          (s.lines || []).forEach(function (ln) { var d = document.createElement('div'); d.className = 'an-sheet-line'; d.textContent = ln; pop.box.appendChild(d); });
          btns.forEach(function (b) {
            var x = makeBtn(b); x.classList.add('an-sheet-btn');
            x.addEventListener('click', function () { setTimeout(function () { try { pop.close(); } catch (e) {} }, 0); });
            pop.box.appendChild(x);
          });
        };
        el.appendChild(t);
      });
    },
    bar: function (area, opts) {
      opts = opts || {};
      this._css();
      var self = this, a = R.AREAS[area] || {}, prev = this.previous(area);
      var el = document.createElement('div');
      el.className = 'area-bar';
      el.dataset.area = area;
      if (a.color) el.style.setProperty('--area-c', a.color);
      // SL-0: ☰ for every area (My Day draws its own). Wired once the bar is
      // on its page, so the list knows which page it belongs to.
      if (area !== 'myday' && !opts.noSide && R.sideList) {
        var sl = R.sideList, sideBtn = sl.button(function () { return el._sideOpts ? el._sideOpts() : null; }, (a.label || 'Area') + ' shortcuts');
        sideBtn.classList.add('side-area-btn');
        el.appendChild(sideBtn);
        el._sideOpts = function () {
          var host = el.closest('.page') || el.closest('.dd-overlay');
          if (host && typeof host._sideOpts === 'function') return host._sideOpts();
          return sl.optsFor(area, host, { page: host && host.id && host.id.indexOf('page-') === 0 ? host.id.slice(5) : null });
        };
        setTimeout(function () {
          var host = el.closest('.page') || el.closest('.dd-overlay');
          // A popup whose nav row already has ☰ keeps just that one.
          if (host && !el.closest('.page') && host.querySelector('.dd-pop-nav .side-list-btn')) {
            sideBtn.remove();
            if (!el.children.length) el.style.display = 'none';
            return;
          }
          if (host) sl.attach(host, function () { var b = host.querySelector('.area-bar'); return b && b._sideOpts ? b._sideOpts() : null; }, { ignore: '.mdx-lane,.mdx-chip,.mdx-scroll,.mdx-week' });
        }, 0);
      }
      if (prev) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'area-back';
        b.setAttribute('aria-label', 'Back');
        b.textContent = '← ' + prev.label;
        b.onclick = function () { self.back(area); };
        el.appendChild(b);
      }
      if (!opts.isHub && typeof a.hub === 'function') {
        var h = document.createElement('button');
        h.type = 'button';
        h.className = 'area-home';
        h.textContent = '🏠 ' + a.label;
        h.onclick = function () { self.home(area); };
        el.appendChild(h);
      }
      if (!el.children.length) el.style.display = 'none';
      else if (el.children.length === 1 && el.firstChild.classList.contains('side-area-btn')) el.classList.add('area-bar-solo');
      return el;
    },
  };

  R.register = function (name, module) {
    if (R.modules[name]) {
      console.warn('[RPGACE.register] Already registered:', name);
      return;
    }
    R.modules[name] = module;

    if (typeof module.init === 'function') {
      if (R._ready) {
        try { module.init(); }
        catch (e) { console.error('[RPGACE] Module init failed:', name, e.message); }
      } else {
        R.hooks.on('rpgace:ready', function () {
          try { module.init(); }
          catch (e) { console.error('[RPGACE] Module init failed:', name, e.message); }
        });
      }
    }

    console.log('[RPGACE] Module registered:', name);
  };

  /* ══════════════════════════════════════════════════════════
     HOOK DEFINITIONS (reference)
     All named hooks fired in the system.
     ══════════════════════════════════════════════════════════

     rpgace:ready        — foundation layer live, all modules can init
     sched:show(type)    — schedule tab switched (daily/weekly/monthly/import)
     page:show(name)     — nav page switched
     agendas:rendered    — agenda cards redrawn
     xp:awarded(amount)  — XP given to the user
     journal:saved(data) — journal entry saved
     db:change(key,val)  — any RPGACE.DB key written
     state:change(k,v)   — any RPGACE.STATE key written
     shift:loaded        — shifts loaded from Fourth rota

  ══════════════════════════════════════════════════════════ */

})(window);

/* ══════════════════════════════════════════════════════════════════
   STEP 8+ MODULES GO BELOW THIS LINE.
   Each module is a RPGACE.register() call.
   No main.js edits. No string replacements. No patch scripts.

   Template:

   RPGACE.register('myFeature', {
     init() {
       RPGACE.hooks.on('sched:show', type => {
         if (type === 'daily') this.render();
       });
     },

     render() {
       const container = document.getElementById('sched-daily');
       if (!container || document.getElementById('my-widget')) return;
       const el = document.createElement('div');
       el.id = 'my-widget';
       el.innerHTML = '...';
       container.appendChild(el);
     },

     async fetchData() {
       return RPGACE.DB.get('myData');
     },

     async callAPI(params) {
       return RPGACE.api('TOOL_NAME', params);
     },
   });

══════════════════════════════════════════════════════════════════ */
/* ================================================================
   RPGACE — FEYNMAN LOOP MODULE
   Step 8 · Registers into rpgace_core.js
   
   Triggers:
     - Taxonomy node button in Encyclopedia
     - Do Now on a learning agenda
     - Oracle chat intent detection
     - Direct: RPGACE.modules.feynman.start(concept)
   
   Outputs:
     - Oracle tab: session report
     - Journal: structured study entry
     - Taxonomy node: study_count++, last_studied_at
     - Agenda: spaced repetition (3/7/14 day follow-up)
     - Content Pipeline: YouTube idea from verified explanation
================================================================ */

