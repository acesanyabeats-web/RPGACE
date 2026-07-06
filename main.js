// ── CONFIG ──
const CONFIG = {
  composioEntityId: '2d5cbaae-b75e-4e58-a573-5c07bc633ad9',
};

// ── PASSWORD ──
const CORRECT_PW = 'jddj12alexpillBDE';
function checkPassword(){
  const val=document.getElementById('pw-input').value;
  if(val===CORRECT_PW){
    const gate=document.getElementById('gate');
    gate.style.opacity='0';gate.style.transition='opacity .5s';
    setTimeout(()=>{gate.style.display='none';document.getElementById('app').style.display='block';initApp();},500);
  } else {
    const inp=document.getElementById('pw-input');
    inp.classList.add('error');document.getElementById('gate-error').textContent='✗ Access denied.';
    setTimeout(()=>{inp.classList.remove('error');document.getElementById('gate-error').textContent='';},1500);
  }
}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&document.getElementById('gate').style.display!=='none')checkPassword();});
function togglePwVis(){const i=document.getElementById('pw-input');i.type=i.type==='password'?'text':'password';}

// ── STATE ──
const STATE={xp:0,level:1,totalXP:0,tasksCompleted:0,xpRequired:[500,1200,2200,3500,5000,7000,9500,12500],chatHistory:[],chatMode:'chat',importedShifts:[]};
const LEVEL_TITLES=['Novice Producer','Content Apprentice','Rising Creator','Consistent Grinder','Viral Contender','Established Creator','Platform Veteran','The Producer','Elite Creator'];

// ── DATA ──
const QUESTS={
  daily:[
    {id:'d1',name:'Post 1 TikTok video',desc:'Film, edit and upload one short-form vertical video. Focus on trending sounds and hooks.',xp:80,cat:'career',type:'daily',done:false},
    {id:'d2',name:'30-min gym session',desc:'Cardio or weights — consistency over intensity. Log what you did after.',xp:60,cat:'health',type:'daily',done:false},
    {id:'d3',name:'Cook one meal from scratch',desc:'Batch-cook if possible. Avoid UberEats. Track macros if you can.',xp:50,cat:'health',type:'daily',done:false},
    {id:'d4',name:'Script next YouTube video',desc:'Write a 300-word script or detailed bullet outline for your next upload.',xp:70,cat:'career',type:'daily',done:false},
    {id:'d5',name:'10-min meditation',desc:'Clear mental state before content creation.',xp:30,cat:'lifestyle',type:'daily',done:false},
    {id:'d6',name:'Engage with 5 creators',desc:'Comment meaningfully on 5 videos in your niche. Networking = growth.',xp:40,cat:'career',type:'daily',done:false},
  ],
  weekly:[
    {id:'w1',name:'Publish YouTube video',desc:'Film, edit, thumbnails, SEO title/tags. Upload and promote across all platforms.',xp:200,cat:'career',type:'weekly',done:false},
    {id:'w2',name:'5x gym sessions',desc:'Hit gym 5 out of 7 days. Log workouts.',xp:150,cat:'health',type:'weekly',done:false},
    {id:'w3',name:"Plan next week's content",desc:'Map out 7 TikToks, 1 YT video, 3 Instagram posts.',xp:120,cat:'career',type:'weekly',done:false},
    {id:'w4',name:'Meal prep Sunday',desc:'Prep meals for the week. Rice, protein, veg.',xp:100,cat:'health',type:'weekly',done:false},
  ],
  career:[
    {id:'c1',name:'Reach 100 YouTube subs',desc:'Create a channel trailer, optimise profile, post consistently.',xp:300,cat:'career',type:'monthly',done:false},
    {id:'c2',name:'Post 30 TikToks in a month',desc:'Volume is king early on. Post daily, iterate fast.',xp:400,cat:'career',type:'monthly',done:false},
    {id:'c3',name:'Collab with one creator',desc:'DM 10 creators in your niche.',xp:250,cat:'career',type:'monthly',done:false},
    {id:'c4',name:'Build email list (50 subs)',desc:'Set up ConvertKit. Offer a freebie.',xp:200,cat:'career',type:'weekly',done:false},
    {id:'c5',name:'Learn video colour grading',desc:'DaVinci Resolve basics.',xp:150,cat:'career',type:'weekly',done:false},
    {id:'c6',name:'Set up Instagram business account',desc:'Link bio to YouTube. 3 posts per week minimum.',xp:100,cat:'career',type:'daily',done:false},
  ],
  health:[
    {id:'h1',name:'Establish gym schedule',desc:'Book 5 weekly sessions in your calendar.',xp:100,cat:'health',type:'weekly',done:false},
    {id:'h2',name:'Track calories for 7 days',desc:'Use MyFitnessPal.',xp:120,cat:'health',type:'weekly',done:false},
    {id:'h3',name:'Learn 5 healthy recipes',desc:'Chicken/rice/veg, oats, eggs, pasta.',xp:90,cat:'health',type:'weekly',done:false},
    {id:'h4',name:'Run 5km under 30 mins',desc:'Build up gradually.',xp:160,cat:'health',type:'monthly',done:false},
    {id:'h5',name:'Cut takeaway to once a week',desc:'Cook in bulk to reduce cravings.',xp:80,cat:'health',type:'weekly',done:false},
    {id:'h6',name:'Sleep 7-8 hours consistently',desc:'No screens 1hr before bed.',xp:60,cat:'health',type:'daily',done:false},
  ],
  lifestyle:[
    {id:'l1',name:'Morning routine: 7am wake',desc:'Wake 7am, 500ml water, 10 stretches, review goals.',xp:70,cat:'lifestyle',type:'daily',done:false},
    {id:'l2',name:'Read 20 pages daily',desc:'Books on marketing, content strategy, fitness.',xp:50,cat:'lifestyle',type:'daily',done:false},
    {id:'l3',name:'Digital detox Sunday PM',desc:'No social scrolling after 2pm Sunday.',xp:80,cat:'lifestyle',type:'weekly',done:false},
    {id:'l4',name:'Budget review',desc:'Track all spending weekly.',xp:60,cat:'lifestyle',type:'weekly',done:false},
    {id:'l5',name:'Journaling — 10 mins',desc:"Write what went well, what to improve, tomorrow's top 3.",xp:40,cat:'lifestyle',type:'daily',done:false},
    {id:'l6',name:'Cold shower challenge (7 days)',desc:'30 seconds cold at end of shower.',xp:90,cat:'lifestyle',type:'weekly',done:false},
  ]
};

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
async function callOracle(messages, system, maxTokens=1000){
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
  d.innerHTML=`<div class="quest-top"><div class="quest-name">${q.name}</div><div class="quest-xp">+${q.xp} XP</div></div><div class="quest-desc">${q.desc}</div><div class="quest-tags"><span class="tag ${q.cat}">${q.cat}</span><span class="tag ${q.type}">${q.type}</span></div><button class="complete-btn ${q.done?'done':''}" onclick="completeQuest('${q.id}',${q.xp},this)">${q.done?'✓ Completed':'◎ Mark Complete'}</button>`;
  return d;
}
function buildQS(id,arr){const el=document.getElementById(id);if(!el)return;el.innerHTML='';arr.forEach(q=>el.appendChild(makeCard(q)));}
function buildAllQuests(){buildQS('daily-quests',QUESTS.daily);buildQS('weekly-quests',QUESTS.weekly);buildQS('career-quests',QUESTS.career);buildQS('health-quests',QUESTS.health);buildQS('lifestyle-quests',QUESTS.lifestyle);}
function completeQuest(id,xp,btn){const all=[...QUESTS.daily,...QUESTS.weekly,...QUESTS.career,...QUESTS.health,...QUESTS.lifestyle];const q=all.find(x=>x.id===id);if(!q||q.done)return;q.done=true;btn.textContent='✓ Completed';btn.classList.add('done');btn.closest('.quest-card').classList.add('done');addXP(xp);}

// ── XP / LEVEL ──
function addXP(amount){
  STATE.xp+=amount;STATE.totalXP+=amount;STATE.tasksCompleted++;showXPToast(amount);
  const req=STATE.xpRequired[STATE.level-1]||9999;
  document.getElementById('xp-bar').style.width=Math.min(100,Math.round(STATE.xp/req*100))+'%';
  document.getElementById('xp-val').textContent=STATE.xp+' / '+req;
  document.getElementById('stat-tasks').textContent=STATE.tasksCompleted;
  document.getElementById('stat-xp').textContent=STATE.totalXP;
  if(STATE.xp>=req)levelUp();
}
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
  document.getElementById('xp-bar').style.width=Math.min(100,Math.round(STATE.xp/newReq*100))+'%';
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
  return /instagram|insta\b|reel|carousel|caption|hashtag|#[a-z]|ig\s|@acesanya|insta-oracle|instaoracle|followers|story\s|post strategy|content plan|instagram\.com/.test(t);
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
      <button onclick="addInstaQuest('${name.replace(/'/g,"\\'")}',${xp},'${deadline}')" style="background:#E1306C;border:none;color:#fff;border-radius:6px;padding:6px 14px;font-size:12px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700">+ Add to Quest Board</button>
    </div>`
  );
  return html;
}

function addInstaQuest(name, xp, deadline){
  addXP(xp);
  showXPToast(xp);
  alert(`✓ Quest added! "${name}" — ${xp} XP\n\nCheck your Quest Board.`);
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
  typing.innerHTML='<div class="ai-name">✦ Oracle</div><span style="color:var(--muted)">thinking...</span>';
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
      const instaMode = window._instaOracleActive || isInstaOracleQuery(msg);
      if(isInstaOracleQuery(msg)) window._instaOracleActive = true;

      const ORACLE_SYS=`You are the Oracle — Alex's AI life coach in RPGACE, a gamified life management app.
Alex is an aspiring UK music producer and content creator targeting YouTube (@AceSanyaBeats), TikTok and Instagram.
Be direct, motivating, RPG-toned. Use markdown formatting (**, ##, bullet points).

When a message contains [PAGE CONTENT FROM ...], you have been given the actual text of that webpage or post.
Analyse and respond to that content directly — summarise it, extract insights, give strategy, connect it to Alex's goals.
Never say you can't access URLs — the content has already been fetched and is in the message.

For quests: QUEST: [name] | XP: [50-300] | Type: [daily/weekly/monthly] | Category: [career/health/lifestyle]
One sharp memorable line at the end of every reply.`;

      const activeSystem = instaMode
        ? INSTA_ORACLE_SYS + '\n\n---\nADDITIONAL CONTEXT:\n' + ORACLE_SYS
        : ORACLE_SYS;

      const data=await callOracle(STATE.chatHistory.slice(-8), activeSystem, 1200);
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

      // Add Save to Journal button after every AI reply
      const saveBtn = document.createElement('div');
      saveBtn.style.cssText = 'display:flex;gap:6px;margin:4px 0 12px 0;flex-wrap:wrap';
      saveBtn.innerHTML = `
        <button onclick="quickSaveToJournal()" style="background:none;border:1px solid rgba(201,168,76,.3);color:var(--gold);border-radius:5px;padding:3px 10px;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif">📓 Save to Journal</button>
        <button onclick="quickSaveToEncyclopedia()" style="background:none;border:1px solid rgba(255,255,255,.1);color:var(--muted);border-radius:5px;padding:3px 10px;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif">📖 Save to Encyclopedia</button>
      `;
      document.getElementById('chat-msgs').appendChild(saveBtn);
      document.getElementById('chat-msgs').scrollTop = 99999;
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
function renderMarkdown(text){
  return text
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
  } else { el.textContent = text; }
  const msgs = document.getElementById('chat-msgs');
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}
function checkForQuestSuggestions(text){if(text.includes('QUEST:')){const lines=text.split('\n').filter(l=>l.includes('QUEST:'));if(lines.length)showSuggestionPopup(lines);}}
function showSuggestionPopup(lines){const c=document.getElementById('popup-tasks');c.innerHTML='';document.getElementById('popup-msg').textContent='The Oracle has '+lines.length+' new quest'+(lines.length!==1?'s':'')+' for you!';lines.slice(0,3).forEach(line=>{const xm=line.match(/XP:\s*(\d+)/),nm=line.match(/QUEST:\s*([^|]+)/);if(nm){const d=document.createElement('div');d.className='popup-task';d.innerHTML=`<span>⚔ ${nm[1].trim()}</span><span class="popup-task-xp">+${xm?xm[1]:50} XP</span>`;c.appendChild(d);}});document.getElementById('suggestion-popup').classList.add('show');}
function acceptSuggestions(){document.querySelectorAll('.popup-task').forEach(item=>{const name=item.querySelector('span:first-child').textContent.replace('⚔ ','');const xp=parseInt(item.querySelector('.popup-task-xp').textContent.replace(/[^0-9]/g,''))||50;QUESTS.daily.push({id:'ai'+Date.now()+Math.random(),name,desc:'AI-generated quest from the Oracle.',xp,cat:'career',type:'daily',done:false});});buildQS('daily-quests',QUESTS.daily);closeSuggestion();addXP(10);}
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
  try{const er=await fetch(`${SUPABASE_URL}/rest/v1/encyclopedia?order=created_at.desc&limit=15`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});if(er.ok)encEntries=await er.json();}catch(e){}
  try{const jr=await fetch(`${SUPABASE_URL}/rest/v1/journal?order=created_at.desc&limit=4`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});if(jr.ok)journalEntries=await jr.json();}catch(e){}
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
    const res = await fetch(SUPABASE_URL+'/rest/v1/encyclopedia?order=created_at.desc&limit=60',
      {headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY}});
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
    const ir = await fetch(SUPABASE_URL+'/rest/v1/encyclopedia_insights?order=created_at.desc&limit=40',
      {headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY}});
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

// Pre-loaded rota from Fourth screenshots (June-July 2026)
const DEFAULT_SHIFTS = [
  {date:'2026-06-23',day:'TUE',role:'Bar Tender',start:'10:30',end:'21:00',hours:10},
  {date:'2026-06-25',day:'THU',role:'Bar Tender',start:'10:30',end:'21:00',hours:10},
  {date:'2026-06-27',day:'SAT',role:'Bar Tender',start:'13:00',end:'22:00',hours:8.5},
  {date:'2026-06-28',day:'SUN',role:'Training',start:'10:00',end:'12:00',hours:2},
  {date:'2026-06-28',day:'SUN',role:'Bar Tender',start:'17:00',end:'00:00',hours:7},
  {date:'2026-06-30',day:'TUE',role:'Bar Tender',start:'10:30',end:'21:00',hours:10},
  {date:'2026-07-02',day:'THU',role:'Bar Tender',start:'10:30',end:'21:00',hours:10},
  {date:'2026-07-03',day:'FRI',role:'Bar Tender',start:'13:00',end:'22:00',hours:8.5},
  {date:'2026-07-04',day:'SAT',role:'Bar Tender',start:'13:00',end:'22:00',hours:8.5},
  {date:'2026-07-05',day:'SUN',role:'Bar Tender',start:'17:00',end:'00:00',hours:7},
  {date:'2026-07-07',day:'TUE',role:'Bar Tender',start:'10:30',end:'21:00',hours:10},
  {date:'2026-07-09',day:'THU',role:'Bar Tender',start:'10:30',end:'21:00',hours:10},
  {date:'2026-07-10',day:'FRI',role:'Bar Tender',start:'13:00',end:'22:00',hours:8.5},
  {date:'2026-07-11',day:'SAT',role:'Bar Tender',start:'13:00',end:'22:00',hours:8.5},
  {date:'2026-07-12',day:'SUN',role:'Training',start:'10:00',end:'12:00',hours:2},
  {date:'2026-07-12',day:'SUN',role:'Bar Tender',start:'17:00',end:'00:00',hours:7},
  {date:'2026-07-13',day:'MON',role:'Bar Tender',start:'17:00',end:'00:00',hours:7},
  {date:'2026-07-15',day:'WED',role:'Bar Tender',start:'10:30',end:'21:00',hours:10},
  {date:'2026-07-16',day:'THU',role:'Bar Tender',start:'17:00',end:'00:00',hours:7},
  {date:'2026-07-18',day:'SAT',role:'Bar Tender',start:'13:00',end:'23:00',hours:9.5},
  {date:'2026-07-19',day:'SUN',role:'Bar Tender',start:'17:00',end:'00:00',hours:7},
];

function initShifts(){
  if(!localStorage.getItem(SHIFTS_KEY)){
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(DEFAULT_SHIFTS));
  }
}

function getShifts(){
  try{ return JSON.parse(localStorage.getItem(SHIFTS_KEY)||'[]'); }catch(e){ return []; }
}

function getTodayShifts(){
  const today = new Date().toISOString().split('T')[0];
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
  const today = new Date().toISOString().split('T')[0];
  // Remove existing shift blocks
  document.querySelectorAll('.shift-block').forEach(el=>el.remove());
  let shiftSummaryEl = document.getElementById('shift-summary');
  if(shiftSummaryEl) shiftSummaryEl.remove();
  const schedPage = document.getElementById('page-schedule');
  if(!schedPage) return;
  // Show upcoming shifts summary
  const upcoming = shifts.filter(s=>s.date>=today).slice(0,8);
  if(!upcoming.length) return;
  shiftSummaryEl = document.createElement('div');
  shiftSummaryEl.id = 'shift-summary';
  shiftSummaryEl.style.cssText = 'background:rgba(128,128,128,.08);border:1px solid rgba(128,128,128,.2);border-radius:10px;padding:14px;margin-bottom:16px';
  shiftSummaryEl.innerHTML = '<div style="font-family:Cinzel,serif;font-size:11px;color:var(--muted);letter-spacing:1px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">'
    + '<span>🏪 WORK SHIFTS — The Joiners Arms</span>'
    + '<button onclick="openPasteRota()" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:5px;padding:3px 8px;font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif">+ Update Rota</button>'
    + '</div>'
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
  if(agendaSummary) schedPage.insertBefore(shiftSummaryEl, agendaSummary);
  else if(firstTitle) schedPage.insertBefore(shiftSummaryEl, firstTitle);
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
  const dayNames = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const monthMap = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
  lines.forEach(line=>{
    // Format: DD/MM HH:MM-HH:MM or DD/MM/YYYY HH:MM-HH:MM
    const m = line.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\s+(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    if(m){
      const day = parseInt(m[1]);
      const month = parseInt(m[2])-1;
      const year = m[3] ? parseInt(m[3].length===2?'20'+m[3]:m[3]) : new Date().getFullYear();
      const start = m[4];
      const end = m[5];
      const d = new Date(year, month, day);
      const dateStr = d.toISOString().split('T')[0];
      const [sh,sm] = start.split(':').map(Number);
      const [eh,em] = end.split(':').map(Number);
      let hours = eh===0 ? (24-sh-sm/60) : (eh+em/60-sh-sm/60);
      if(hours < 0) hours += 24;
      shifts.push({
        date: dateStr,
        day: dayNames[d.getDay()],
        role: 'Bar Tender',
        start, end,
        hours: Math.round(hours*10)/10
      });
    }
  });
  if(!shifts.length){ alert('Could not parse any shifts. Use format: DD/MM HH:MM-HH:MM'); return; }
  // Merge with existing shifts (keep future ones not in new list)
  const existing = getShifts();
  const newDates = new Set(shifts.map(s=>s.date));
  const kept = existing.filter(s=>!newDates.has(s.date));
  const merged = [...kept, ...shifts].sort((a,b)=>a.date.localeCompare(b.date));
  localStorage.setItem(SHIFTS_KEY, JSON.stringify(merged));
  closePasteRota();
  renderShiftBlocks();
  alert('Imported '+shifts.length+' shifts successfully!');
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
    ? `You are analysing a work schedule/rota screenshot from the Fourth/HotSchedules app.
Extract ALL shifts visible in the image.
Return ONLY a JSON object in this exact format, no other text:
{"shifts":[{"date":"DD/MM/YYYY","day":"MON","role":"Bar Tender","start":"HH:MM","end":"HH:MM","hours":8.5}],"summary":"Brief summary of what you see"}
For shifts ending at 0:00 or 00:00, use "00:00" as end time.
Calculate hours accurately. Include ALL visible shifts including training sessions.`
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
      // Try to parse as rota JSON
      try{
        const cleaned = raw.replace(/```json|```/g,'').trim();
        const match = cleaned.match(/\{[\s\S]*\}/);
        if(!match) throw new Error('No JSON found');
        const result = JSON.parse(match[0]);
        if(result.shifts && result.shifts.length){
          // Convert to our shift format
          const dayMap = {mon:'MON',tue:'TUE',wed:'WED',thu:'THU',fri:'FRI',sat:'SAT',sun:'SUN'};
          const newShifts = result.shifts.map(s=>{
            const parts = s.date.split('/');
            let dateStr;
            if(parts.length===3){
              const y = parts[2].length===2?'20'+parts[2]:parts[2];
              dateStr = y+'-'+parts[1].padStart(2,'0')+'-'+parts[0].padStart(2,'0');
            } else {
              dateStr = new Date().toISOString().split('T')[0];
            }
            return {
              date: dateStr,
              day: (s.day||'').toUpperCase(),
              role: s.role||'Bar Tender',
              start: s.start||'00:00',
              end: s.end||'00:00',
              hours: s.hours||0
            };
          });
          // Merge with existing
          const existing = JSON.parse(localStorage.getItem('rpgace_shifts')||'[]');
          const newDates = new Set(newShifts.map(x=>x.date));
          const kept = existing.filter(x=>!newDates.has(x.date));
          const merged = [...kept,...newShifts].sort((a,b)=>a.date.localeCompare(b.date));
          localStorage.setItem('rpgace_shifts', JSON.stringify(merged));
          addMsg('✅ Rota imported! Found **'+newShifts.length+' shifts**:\n\n'
            + newShifts.map(s=>'• '+s.day+' '+s.date.split('-').reverse().join('/')+': '+s.start+'-'+s.end+' ('+s.role+', '+s.hours+'h)').join('\n')
            + '\n\nSwitch to the Schedule tab to see your shifts. Your agenda generator is now shift-aware.', 'assistant');
          return;
        }
      }catch(parseErr){
        // Fall through to show raw response
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

const SELECTABLE_PAGES = ['page-advisor','page-encyclopedia','page-journal','page-learning','focus-overlay'];

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
    const ir = await fetch(SUPABASE_URL+'/rest/v1/encyclopedia_insights?order=created_at.desc&limit=30',
      {headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY}});
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
    const r = await fetch(SUPABASE_URL+'/rest/v1/encyclopedia_insights?order=created_at.desc&limit=60',
      {headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY}});
    if(r.ok) insights = await r.json();
  }catch(e){}

  // Fetch encyclopedia entries
  let entries = [];
  try{
    const r = await fetch(SUPABASE_URL+'/rest/v1/encyclopedia?order=created_at.desc&limit=20',
      {headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY}});
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
function _calCellItems(dateStr){const shifts=_calGetShifts().filter(s=>s.date===dateStr);const agendas=_calGetSchedAgendas().filter(a=>a.date===dateStr);return {shifts,agendas};}
function _calFmtShort(s){return s.start+'\u2013'+(s.end==='00:00'?'00:00':s.end);}

function buildMonthSlots(){
  const el=document.getElementById('month-slots');if(!el)return;el.innerHTML='';
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
  const hdrRow=document.createElement('div');hdrRow.style.cssText='display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px;';
  days.forEach(function(d){const h=document.createElement('div');h.style.cssText='font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--muted);text-align:center;padding:4px 0;';h.textContent=d.toUpperCase();hdrRow.appendChild(h);});
  el.appendChild(hdrRow);
  const firstOfMonth=new Date(yr,mo,1),gridStart=_calMondayOf(firstOfMonth);
  const lastOfMonth=new Date(yr,mo+1,0),lastDow=lastOfMonth.getDay();
  const gridEnd=new Date(lastOfMonth);gridEnd.setDate(lastOfMonth.getDate()+(lastDow===0?0:7-lastDow));
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(7,1fr);gap:2px;';
  const cursor=new Date(gridStart),todayStr=_calDateStr(new Date());
  while(cursor<=gridEnd){
    const dateStr=_calDateStr(cursor),inMonth=cursor.getMonth()===mo&&cursor.getFullYear()===yr,isToday=dateStr===todayStr;
    const {shifts,agendas}=_calCellItems(dateStr);
    const cell=document.createElement('div');
    cell.style.cssText='background:'+(isToday?'rgba(201,168,76,0.1)':'rgba(255,255,255,0.02)')+';border:1px solid '+(isToday?'rgba(201,168,76,0.4)':'rgba(255,255,255,0.05)')+';border-radius:4px;padding:4px;min-height:52px;cursor:pointer;';
    cell.onclick=(function(ds){return function(){window._dailyDate=new Date(ds+'T00:00:00');showSched('daily',document.querySelector('.sched-tab'));};})(dateStr);
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
    row.onclick=(function(ds){return function(){window._dailyDate=new Date(ds+'T00:00:00');showSched('daily',document.querySelector('.sched-tab'));};})(dateStr);
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
    xp:item.xp||50,
    estimated_mins:item.duration_mins||60,
    actual_mins:null,
    completed:false,
    started_at:null,
    ended_at:null,
    source_type:item.source_type||'agenda',
    source_id:item.source_id||null,
    created_at:new Date().toISOString()
  };
  const stored=JSON.parse(localStorage.getItem('rpgace_sched_agendas')||'[]');
  stored.push(entry);
  localStorage.setItem('rpgace_sched_agendas',JSON.stringify(stored));
  return entry;
}

function _fracClock(f){
  var h=Math.floor(f), m=Math.round((f-h)*60);
  if(m===60){h+=1;m=0;}
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
    events.push({startFrac,endFrac,type:'agenda',label:'\u23F0 '+a.title,color:'#4A90E2',bg:'rgba(74,144,226,0.14)',id:a.id,completed:a.completed,estimated_mins:a.estimated_mins});
  });
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
    const rangeLabel=_fracClock(row.startFrac)+'\u2013'+_fracClock(row.endFrac);

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

      if(isAgenda && !row.completed){
        const actions=document.createElement('div');
        actions.style.cssText='display:flex;gap:6px;margin-top:6px;';
        actions.innerHTML='<button onclick="event.stopPropagation();startScheduledTask(\''+row.id+'\')" style="background:none;border:1px solid rgba(74,144,226,0.3);color:#4A90E2;border-radius:4px;padding:3px 9px;font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;">Start</button>'
          +'<button onclick="event.stopPropagation();completeScheduledTask(\''+row.id+'\')" style="background:none;border:1px solid rgba(61,170,110,0.3);color:#3DAA6E;border-radius:4px;padding:3px 9px;font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;">Done</button>';
        div.appendChild(actions);
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
  const hours=Array.from({length:18},function(_,i){const h=i+6;const label=h<12?h+':00 AM':h===12?'12:00 PM':(h-12)+':00 PM';return '<option value="'+h+'">'+label+'</option>';}).join('');
  const minutes=[0,5,10,15,20,25,30,35,40,45,50,55].map(function(m){return '<option value="'+m+'">:'+String(m).padStart(2,'0')+'</option>';}).join('');
  const modal=document.createElement('div');modal.id='sched-modal';modal.style.cssText='display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;align-items:center;justify-content:center;';
  const pills=[15,30,45,60,90,120].map(function(m){return '<button onclick="selectDuration('+m+')" data-dur="'+m+'" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.6);padding:6px 12px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700">'+(m<60?m+'m':m===60?'1h':m===90?'1.5h':'2h')+'</button>';}).join('');
  modal.innerHTML='<div style="background:#0f0f18;border:1px solid rgba(201,168,76,0.3);border-radius:12px;padding:28px;width:min(420px,90vw);max-height:90vh;overflow-y:auto">'
    +'<div style="font-family:Cinzel,serif;font-size:14px;color:#C9A84C;margin-bottom:6px">Schedule Task</div>'
    +'<div id="sched-modal-title" style="font-family:Rajdhani,sans-serif;font-size:16px;font-weight:700;color:#E2E2EC;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.07)"></div>'
    +'<div style="display:grid;gap:14px">'
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
  window._pendingSchedAgenda=agenda;
  const titleEl=document.getElementById('sched-modal-title');
  if(titleEl)titleEl.textContent=agenda.title||'Task';
  const dateEl=document.getElementById('sched-date');
  if(dateEl)dateEl.value=(typeof _calDateStr==='function'?_calDateStr(window._dailyDate||new Date()):new Date().toISOString().split('T')[0]);
  document.getElementById('sched-modal').style.display='flex';
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
  if(!date){alert('Please choose a date.');return;}
  const entry=scheduleToCalendar({title:agenda.title,description:agenda.description,category:agenda.category,xp:agenda.xp,duration_mins:estMins,hour,minute,date,source_type:'agenda'});
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
  if(idx<0)return;stored[idx].started_at=new Date().toISOString();
  localStorage.setItem('rpgace_sched_agendas',JSON.stringify(stored));
}

function completeScheduledTask(id){
  const stored=JSON.parse(localStorage.getItem('rpgace_sched_agendas')||'[]');
  const idx=stored.findIndex(function(a){return a.id===id;});
  if(idx<0)return null;
  const entry=stored[idx],endedAt=new Date();
  entry.ended_at=endedAt.toISOString();entry.completed=true;
  if(entry.started_at){const startedAt=new Date(entry.started_at);entry.actual_mins=Math.round((endedAt-startedAt)/60000);}
  stored[idx]=entry;localStorage.setItem('rpgace_sched_agendas',JSON.stringify(stored));
  const diff=entry.actual_mins&&entry.estimated_mins?entry.actual_mins-entry.estimated_mins:null;
  const summary=entry.actual_mins?'Estimated: '+entry.estimated_mins+'min Actual: '+entry.actual_mins+'min'+(diff!==null?' ('+(diff>0?'+':'')+diff+'min vs estimate)':''):' Completed';
  if(typeof logDailyAction==='function')logDailyAction(entry.date,entry.title,summary);
  if(typeof saveToJournal==='function')saveToJournal(entry.title+' Completed',entry.title+'\n'+summary,'schedule');
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
  addMsg(`Greetings, Creator. I am the Oracle — now fully wired to your apps.\n\nI can talk AND act in the same message:\n📧 "Draft a collab email" → fires Gmail instantly\n📓 "Log today's progress" → creates a Notion page\n🎬 "Check my YouTube stats" → fetches live data\n💻 "Save these notes to GitHub" → commits a file\n\nJust talk to me naturally. I'll handle the rest.\n\nWhat do you need today?`,'ai');
  setTimeout(()=>{document.getElementById('popup-msg').textContent='Welcome to RPGACE. Ready to earn your first XP?';document.getElementById('popup-tasks').innerHTML='<div class="popup-task"><span>⚔ Post your first TikTok video</span><span class="popup-task-xp">+80 XP</span></div>';document.getElementById('suggestion-popup').classList.add('show');},3000);
  // Start Content Intelligence auto-sync (polls Supabase + local server every 30s)
  setTimeout(startIntelPolling, 2000);
  // Load encyclopedia from Supabase
  setTimeout(refreshEncyclopediaDisplay, 1000);
  // Enable manual text-selection insight tagging
  setTimeout(setupManualInsightSelection, 500);
  // Seed saved Oracle conversation if journal is empty
  setTimeout(async ()=>{
    const cached = JSON.parse(localStorage.getItem('rpgace_journal')||'[]');
    if(cached.length === 0){
      const seedEntry = {
        title: 'INSTA-ORACLE — Command 1 + Content Strategy Session',
        date: '21 Jun 2026',
        content: `# Oracle Session — INSTA-ORACLE Command 1 + Content Rebuild
Date: 21 Jun 2026

---

## COMMAND 1 — NICHE DOMINATION SCAN

### The 5 Oversaturated Angles to Avoid
1. "Watch me make a beat in 60 seconds" Reels — scroll fatigue, dropping engagement
2. Sample flip tutorials — dominated by US creators
3. "Rate my setup" static posts — low effort, low return, vanity content
4. Plugin/VST reviews — YouTube owns this format
5. Beat selling / promo posts — algorithm suppresses sales content

### THE GAP: What Nobody Is Owning
**Angle: "UK Producer POV" — Process + Identity + Culture**
*(later revised to remove UK-specific framing — see below)*

### Positioning Statement (FINAL — de-Britished)
> @AceSanyaBeats = The producer who explains WHY beats hit — not just how to copy them.

**Background context:** Alex is Russian and French, grew up in London. This outsider/multi-cultural angle is more authentic and more interesting than a straight UK producer angle.

---

## CONFIRMED ANCHOR: PILLAR 3 — FL STUDIO SECRETS SERIES

**"FL Studio Secrets They Don't Teach"**
- Format: Reels, 30-45 seconds
- Frequency: 2x per week
- ONE technique. ONE reel. Numbered and named.

Examples:
- "FL Secret #1 — Why your 808s sound weak (fix this in 10 seconds)"
- "FL Secret #4 — The mixer routing nobody shows beginners"
- "FL Secret #7 — How to make hi-hats feel human"

**Why it wins:** Series = algorithm training + audience return habit. Every post builds the library. The library builds authority. Authority builds monetisation.

---

## REBUILT CONTENT MIX — 3 PILLARS

### PILLAR A — FL STUDIO SECRETS SERIES (anchor)
- Format: Reels 30-45s
- Frequency: 2x per week
- Purpose: Algorithm reach + authority

### PILLAR B — MADE DIFFERENT (outsider producer angle)
- Format: Reels 30-45s
- Frequency: 1x per week
- Content ideas:
  - "Growing up between 3 cultures gave me this chord theory hack"
  - "Why producers from outside the US hit differently — here's mine"
  - "I learned music theory from Russian classical — this is how I use it in FL"
- Purpose: Identity + loyal followers. Nobody can copy being you. This is your moat.

### PILLAR C — PRODUCER CHALLENGE (beat constraints series)
- Format: Reels 45-60s
- Frequency: 1x per week
- Content ideas:
  - "I made a beat using ONLY 3 notes — here's what happened"
  - "Made a drill beat with zero 808s. Should've been impossible."
  - "5 minutes. One sample. No undo button."
  - "I used only free plugins. Does it still slap?"
- Purpose: Virality + rewatchability. High completion rate = pushed by algorithm.

### Full Weekly Schedule
| Pillar | Format | Frequency | Purpose |
|---|---|---|---|
| FL Studio Secrets # | Reel 30-45s | 2x per week | Algorithm reach + authority |
| Made Different | Reel 30-45s | 1x per week | Identity + loyal followers |
| Producer Challenge | Reel 45-60s | 1x per week | Virality + rewatchability |

4 posts per week. Clean. Sustainable.

---

## GROWTH INTEL

→ **What top producers are doing that Alex isn't:** Running episodic series with numbered hooks that build return viewership. One post is forgettable. A series is a reason to follow.
→ **Content gap Alex can own:** The outsider/multi-cultural production identity angle. US producers dominate tutorials globally. Nobody has planted this flag with cultural authority on Instagram.
→ **Collab angle:** Find ONE UK rapper or vocalist on Instagram with 2k-10k followers posting freestyle/acapella content. Offer to flip their acapella into a beat on camera. Tag both accounts. Mutual audience growth, zero cost.

### How to find vocalists under 5K (15 minute method)
Search these hashtags on Instagram, filter by Recent, look for video posts with under 500 likes:
- #UKVocalist
- #UKSinger2025
- #FreestyleUK
- #UKRnB
- #GrimeVocals
- #UKDrillVocals
- #NewArtistUK
- #EmerginArtistUK

DM script: "Yo [name], I make beats in FL Studio and I want to flip your vocals into a full track on camera. No charge, I'll tag you in everything. You in?"

---

## QUEST UNLOCKED
⚡ Map Your Niche | XP: 150 | This week
`,
        source: 'oracle',
        created_at: '2026-06-21T03:00:00.000Z'
      };
      localStorage.setItem('rpgace_journal', JSON.stringify([seedEntry]));
      await saveToJournal(seedEntry.title, seedEntry.content, 'oracle');
    }
  }, 3000);
  initAgendas();
}
// ── CONTENT PIPELINE ──
const PIPELINE = {
  type: 'auto',
  imageData: null,
  imageType: null,
  lastResult: null,
  lastDetectedType: null,
  lastTitle: null
};

const TYPE_META = {
  music:   { icon:'🎵', color:'#9b6ec8', label:'Music / Production' },
  food:    { icon:'🍳', color:'#cc7a3a', label:'Food / Recipe' },
  tech:    { icon:'💻', color:'#4a8ccc', label:'AI / Tech' },
  fitness: { icon:'💪', color:'#4caf82', label:'Fitness / Health' },
  social:  { icon:'📱', color:'#e0609a', label:'Social Media' },
  article: { icon:'📰', color:'#c9a84c', label:'Article / Post' },
  general: { icon:'📄', color:'#6a7099', label:'General' }
};

const TYPE_PROMPTS = {
  music: `You are an expert music production analyst and educator.
Analyse this music-related content and extract:
## GENRE & STYLE — What genre, subgenre, mood, era, influences
## PRODUCTION TECHNIQUES — Specific methods: sound design, mixing, arrangement, plugins, DAW workflows
## SONG STRUCTURE — Intro, verse, chorus, bridge, drops, transitions
## SONIC ELEMENTS — Drums, bass, melody, harmony, fx, vocals, sampling
## KEY LEARNINGS — What techniques to study and replicate
## TOOLS MENTIONED — Software, hardware, plugins, samples
## SKILL LEVEL — Beginner/Intermediate/Advanced and why
## ACTION STEPS — 3-5 specific things to try in your next session`,

  food: `You are a professional chef and nutrition educator.
Analyse this food/recipe content and extract:
## DISH OVERVIEW — Name, cuisine, occasion, difficulty
## INGREDIENTS — Full list with quantities and substitutions
## METHOD — Step-by-step technique broken down clearly
## COOKING SCIENCE — Why each technique works (maillard, emulsification etc.)
## NUTRITION — Macros, key nutrients, dietary notes
## FLAVOUR PRINCIPLES — Seasoning logic, balance, umami, acid/fat/salt/heat
## CHEF TIPS — Pro shortcuts, common mistakes to avoid
## VARIATIONS — How to adapt the recipe
## ACTION STEPS — Try this dish this week`,

  tech: `You are a senior AI/tech educator and developer.
Analyse this tech/AI content and extract:
## CORE CONCEPT — What technology, tool or idea is this about
## HOW IT WORKS — Technical explanation made clear
## USE CASES — Real applications especially for creators and small businesses
## TOOLS & PLATFORMS — Specific software, APIs, services mentioned
## WORKFLOW INTEGRATION — How to add this to a creator/developer workflow
## SKILL REQUIREMENTS — What you need to know first
## COST & ACCESS — Free tiers, pricing, limitations
## KEY TAKEAWAYS — Most important insights
## ACTION STEPS — How to start using or learning this today`,

  fitness: `You are an elite personal trainer and sports nutritionist.
Analyse this fitness content and extract:
## EXERCISE / PROGRAMME OVERVIEW — What is being trained and why
## MOVEMENT BREAKDOWN — Form cues, muscle activation, common mistakes
## PROGRAMMING — Sets, reps, rest, frequency, progression
## SCIENCE — Why this works physiologically
## NUTRITION LINKS — Diet considerations for this type of training
## RECOVERY — Sleep, stretching, mobility, deload advice
## EQUIPMENT — What's needed, what's optional
## BEGINNER MODIFICATIONS — How to scale down safely
## ACTION STEPS — Add this to your training this week`,

  social: `You are a top social media strategist and content creator coach.
Analyse this social media content and extract:
## PLATFORM — Where this content lives and why it works there
## HOOK ANALYSIS — Opening line/image strategy, why it stops the scroll
## CONTENT STRUCTURE — How it's built from start to finish
## ENGAGEMENT TACTICS — CTAs, questions, community triggers
## VISUAL STRATEGY — Colours, format, thumbnails, aesthetic
## CAPTION FORMULA — Tone, length, hashtags, emojis
## ALGORITHM SIGNALS — What this does to boost reach
## AUDIENCE PSYCHOLOGY — Why this resonates with followers
## ACTION STEPS — Adapt this format for your next 3 posts`,

  article: `You are an expert knowledge curator and researcher.
Analyse this article/post and extract:
## CORE ARGUMENT — Main thesis or point being made
## KEY EVIDENCE — Data, examples, case studies used
## METHODS & FRAMEWORKS — Any models, systems or approaches described
## EXPERT INSIGHTS — Notable quotes or expert positions (paraphrased)
## COUNTERARGUMENTS — What pushes back on this view
## PRACTICAL APPLICATIONS — How to apply this knowledge
## CONNECTED TOPICS — What else to study alongside this
## CREDIBILITY ASSESSMENT — How reliable/current is this source
## ACTION STEPS — What to research or implement next`,

  general: `You are a comprehensive knowledge analyst and educator.
Analyse this content and extract structured notes covering:
## WHAT IS THIS — Type of content, main subject, purpose
## KEY CONCEPTS — Main ideas, terms, frameworks explained
## METHODS & TECHNIQUES — Any how-to, process or skill described
## INSIGHTS & LESSONS — What can be learned and applied
## CONNECTIONS — How this links to music production, content creation, fitness, or cooking
## TOOLS & RESOURCES — Any tools, platforms or resources mentioned
## DIFFICULTY & AUDIENCE — Who this is for and what level
## ACTION STEPS — 3-5 concrete next steps`
};

function setPipelineType(type, btn){
  PIPELINE.type = type;
  document.querySelectorAll('.type-chip').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

function pipelineDragOver(e){ e.preventDefault(); document.getElementById('pipeline-drop-zone').classList.add('drag-over'); }
function pipelineDragLeave(){ document.getElementById('pipeline-drop-zone').classList.remove('drag-over'); }
function pipelineDrop(e){
  e.preventDefault(); pipelineDragLeave();
  const file = e.dataTransfer.files[0];
  if(file) handlePipelineFile(file);
  else {
    const text = e.dataTransfer.getData('text');
    if(text) document.getElementById('pipeline-text-input').value = text;
  }
}

function handlePipelineFile(file){
  if(!file) return;
  if(file.type.startsWith('image/')){
    const reader = new FileReader();
    reader.onload = e => {
      const b64 = e.target.result.split(',')[1];
      PIPELINE.imageData = b64;
      PIPELINE.imageType = file.type;
      const preview = document.getElementById('pipeline-img-preview');
      preview.src = e.target.result;
      preview.style.display = 'block';
      document.getElementById('pipeline-text-input').placeholder = `Image loaded: ${file.name}\n\nOptionally add context or description below...`;
    };
    reader.readAsDataURL(file);
  } else {
    const reader = new FileReader();
    reader.onload = e => { document.getElementById('pipeline-text-input').value = e.target.result; };
    reader.readAsText(file);
  }
}

function setChainStep(step, status, state=''){
  const el = document.getElementById('chain-'+step);
  const statusEl = document.getElementById('chain-'+step+'-status');
  el.className = 'chain-step'+(state?' '+state+'-step':'');
  statusEl.textContent = status;
}
function resetChain(){
  [1,2,3,4].forEach(i=>setChainStep(i,'Waiting',''));
}

async function runPipeline(){
  const text = document.getElementById('pipeline-text-input').value.trim();
  const hasImage = !!PIPELINE.imageData;
  if(!text && !hasImage){ alert('Paste some content, a URL, or upload an image first.'); return; }

  document.getElementById('pipeline-run-btn').disabled = true;
  document.getElementById('pipeline-output').classList.remove('show');
  resetChain();
  setLearnStatus('pipeline-status','Running AI chain...','loading');

  try{
    // ── AGENT 1: SCOUT ──
    setChainStep(1,'Fetching & identifying content...','active');
    const scoutRes = await fetch('/api/scout',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ content: text, type: PIPELINE.type })
    });
    const scoutText = await scoutRes.text();
    let scoutData;
    try { scoutData = JSON.parse(scoutText); } catch(e){ throw new Error('Scout non-JSON: '+scoutText.slice(0,100)); }
    if(!scoutRes.ok) throw new Error('Scout: ' + (scoutData.error||scoutRes.status));

    const { detectedType, title, content: fetchedContent, jinaFetched, sourceURL } = scoutData;
    PIPELINE.lastDetectedType = detectedType;
    PIPELINE.lastTitle = title;
    const typeMeta = TYPE_META[detectedType] || TYPE_META.general;
    setChainStep(1, `✓ ${typeMeta.label}${jinaFetched?' — URL fetched via Jina':''}`, 'done');

    // ── AGENT 2: ANALYST ──
    setChainStep(2,'Analysing content deeply...','active');
    const analystBody = { content: fetchedContent, detectedType, title };
    if(hasImage){ analystBody.imageData = PIPELINE.imageData; analystBody.imageType = PIPELINE.imageType; }
    const analystRes = await fetch('/api/analyst',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(analystBody)
    });
    const analystText = await analystRes.text();
    let analystData;
    try { analystData = JSON.parse(analystText); } catch(e){ throw new Error('Analyst non-JSON: '+analystText.slice(0,100)); }
    if(!analystRes.ok) throw new Error('Analyst: ' + (analystData.error||analystRes.status));
    setChainStep(2, `✓ Analysis complete (${analystData.wordCount} words)`, 'done');

    // ── AGENT 3: NOTER ──
    setChainStep(3,'Formatting notes + quality check...','active');
    const noterRes = await fetch('/api/noter',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ analysis: analystData.analysis, detectedType, title })
    });
    const noterText = await noterRes.text();
    let noterData;
    try { noterData = JSON.parse(noterText); } catch(e){ throw new Error('Noter non-JSON: '+noterText.slice(0,100)); }
    if(!noterRes.ok) throw new Error('Noter: ' + (noterData.error||noterRes.status));

    const { notes, encHtml, wordCount, qualityScore, qualityFlags, passesQuality } = noterData;
    const qualityLabel = passesQuality
      ? `✓ Quality: ${qualityScore}/10`
      : `⚠ Quality: ${qualityScore}/10 — ${qualityFlags[0]}`;
    setChainStep(3, qualityLabel, passesQuality ? 'done' : 'active');

    // ── AGENT 4: READY FOR EXECUTOR ──
    setChainStep(4,'✓ Ready — save to Notion or GitHub below','done');

    PIPELINE.lastResult = { notes, encHtml, type: detectedType, title, typeMeta, sourceURL, qualityScore };

    // Auto-save to in-app encyclopedia
    saveOracleToEncyclopedia(`[${typeMeta?.label||detectedType}] ${title}`, notes);

    // Show output
    document.getElementById('pipeline-output').classList.add('show');
    const badgeColor = typeMeta.color || '#c9a84c';
    document.getElementById('pipeline-detected-type').innerHTML =
      `<span class="detected-type-badge" style="background:${badgeColor}22;border-color:${badgeColor};color:${badgeColor}">
        ${typeMeta.icon} ${typeMeta.label}
        ${jinaFetched?'<span style="margin-left:8px;font-size:10px;color:var(--green)">✓ URL fetched</span>':''}
        <span style="margin-left:8px;font-size:10px">Quality: ${qualityScore}/10</span>
      </span>`;
    document.getElementById('pipeline-result').innerHTML = encHtml || notes.replace(/\n/g,'<br>');

    setLearnStatus('pipeline-status','✓ All 4 AI agents complete','ok');
    addXP(60);
    showXPToast(60);

  } catch(e){
    const failedStep=[1,2,3,4].find(i=>document.getElementById('chain-'+i).classList.contains('active-step'))||1;
    setChainStep(failedStep,'✗ '+e.message.slice(0,50),'error');
    setLearnStatus('pipeline-status','✗ '+e.message,'err');
  }

  document.getElementById('pipeline-run-btn').disabled=false;
}

function savePipelineToDB(){
  if(!PIPELINE.lastResult){ alert('Run the pipeline first.'); return; }
  const entry = {
    id: Date.now(),
    videoId: 'pipeline-'+Date.now(),
    videoTitle: PIPELINE.lastTitle,
    channel: PIPELINE.lastResult.typeMeta.label,
    thumb: '',
    url: '',
    focus: PIPELINE.lastResult.type,
    notes: PIPELINE.lastResult.notes,
    wordCount: PIPELINE.lastResult.notes.split(/\s+/).filter(Boolean).length,
    savedAt: new Date().toLocaleDateString(),
    topic: PIPELINE.lastResult.type,
    source: 'pipeline'
  };
  LEARN.db.unshift(entry);
  localStorage.setItem('rpgace_notes', JSON.stringify(LEARN.db));
  renderDB();
  updateDBStats();
  setLearnStatus('pipeline-status','✓ Saved to Knowledge Database!','ok');
  addXP(20);
}

// ── ENCYCLOPEDIA — SUPABASE SYNCED ──
async function saveOracleToEncyclopedia(title, content){
  try {
    const date = new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
    const html = `<div class="enc-entry" style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--border)">
      <h2 style="font-family:'Cinzel',serif;font-size:14px;color:var(--gold);margin-bottom:4px">${title}</h2>
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px">📅 ${date}</div>
      <div style="font-size:13px;line-height:1.8">${renderMarkdown(content)}</div>
    </div>`;

    const entry = { title, date, content, html, source:'oracle', created_at: new Date().toISOString() };

    // Extract VSTs before saving
    entry.vst_tags = extractVSTsFromText(content);

    // Save to Supabase
    try {
      const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/encyclopedia`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(entry)
      });
      if(sbRes.ok){
        const saved = await sbRes.json();
        const savedEntry = Array.isArray(saved) ? saved[0] : saved;
        if(savedEntry?.id) await saveEncWithVSTs(savedEntry);
      }
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

async function sbInsightPost(data){
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${ENC_INSIGHT_TABLE}`, {
      method:'POST',
      headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=representation'},
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch(e){ return null; }
}

async function sbInsightFetch(macroCategory){
  try {
    const filter = macroCategory && macroCategory!=='all' ? `macro_category=eq.${macroCategory}&` : '';
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${ENC_INSIGHT_TABLE}?${filter}order=created_at.desc&limit=500`,{
      headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}
    });
    return res.ok ? await res.json() : [];
  } catch(e){ return []; }
}

async function sbInsightDelete(id){
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${ENC_INSIGHT_TABLE}?id=eq.${id}`,{
      method:'DELETE', headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}
    });
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
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/intel_jobs`, {
      method: 'POST',
      headers: {'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},
      body: JSON.stringify({url, status:'queued'})
    });
    if(!res.ok) throw new Error('Queue error ' + res.status);
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
  const researchTab = document.querySelector('[onclick*="learning"]');
  if(researchTab) showPage('learning', researchTab);
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
    await fetch(`${SUPABASE_URL}/rest/v1/encyclopedia?id=eq.${entry.id}`, {
      method: 'PATCH',
      headers: {'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},
      body: JSON.stringify({ vst_tags: vsts })
    });
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
let ENC_SORT        = 'unique';
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
    const allText = clone.map(e=>(e.title||'')+' '+(e.content||''));
    return clone.sort((a,b) => {
      const aText = ((a.title||'')+' '+(a.content||'')).toLowerCase();
      const bText = ((b.title||'')+' '+(b.content||'')).toLowerCase();
      // Score: how many OTHER entries share words with this one (lower = more unique)
      const aOverlap = allText.filter(t=>t!==aText).reduce((s,t)=>s+(t.split(' ').filter(w=>w.length>4&&aText.includes(w)).length),0);
      const bOverlap = allText.filter(t=>t!==bText).reduce((s,t)=>s+(t.split(' ').filter(w=>w.length>4&&bText.includes(w)).length),0);
      return aOverlap - bOverlap; // lowest overlap = most unique = first
    });
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

async function generateEncBullets(entry, allEntries){
  const id = entry.id || entry.created_at || entry.title;
  if(ENC_BULLET_CACHE[id]) return ENC_BULLET_CACHE[id];

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
  if(countEl) countEl.textContent = `${sorted.length} of ${ENC_ALL_ENTRIES.length} entries · sort: ${ENC_SORT}`;

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

    return `<div id="enc-card-${safeId}" style="background:var(--panel2);border:1px solid var(--border);border-left:3px solid var(--gold);border-radius:10px;margin-bottom:12px;overflow:hidden">
      <!-- Header — always visible -->
      <div style="display:flex;align-items:center;gap:8px;padding:14px 16px;cursor:pointer" onclick="toggleEncEntry('${safeId}')">
        <div style="flex:1;min-width:0">
          <div style="font-family:'Cinzel',serif;font-size:13px;color:var(--gold);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.title||'Entry'}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">${icon} ${e.source||'oracle'} · 📅 ${e.date||''} · <span style="color:var(--blue)">${catLabel}</span> · <span style="color:var(--purple)">#${i+1} ${sortLabel}</span></div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <button onclick="event.stopPropagation();deleteEncEntry('${id}')" style="background:none;border:none;color:var(--muted);font-size:13px;cursor:pointer;padding:2px 4px;border-radius:3px" title="Delete entry">🗑</button>
          <div id="enc-chevron-${safeId}" style="color:var(--muted);font-size:12px;transition:transform .2s">▼</div>
        </div>
      </div>

      <!-- Collapsed: AI bullet points -->
      <div id="enc-collapsed-${safeId}" style="padding:0 16px 14px">
        <div id="enc-bullets-${safeId}" style="display:flex;flex-direction:column;gap:5px">
          <div style="color:var(--muted);font-size:11px;font-style:italic">Click to load preview bullets...</div>
        </div>
        ${(() => { const vsts = e.vst_tags?.length ? e.vst_tags : extractVSTsFromText(e.content||''); return renderVSTChips(vsts, safeId); })()}
        <button onclick="expandEncEntry('${safeId}')" style="background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.2);color:var(--gold);border-radius:5px;padding:4px 12px;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif;margin-top:8px">▼ Read Full Entry</button>
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
      await fetch(`${SUPABASE_URL}/rest/v1/encyclopedia?id=eq.${id}`, {
        method: 'DELETE',
        headers: {'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`}
      });
    } catch(e){}
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
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/encyclopedia?order=created_at.desc&limit=200`, {
      headers: {'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`}
    });
    if(res.ok){ entries = await res.json(); localStorage.setItem('rpgace_encyclopedia', JSON.stringify(entries)); }
  } catch(e){}

  if(!entries.length){
    try { const p = JSON.parse(localStorage.getItem('rpgace_encyclopedia')||'[]'); entries = Array.isArray(p)?p:[]; } catch(e){}
  }

  ENC_ALL_ENTRIES = entries;

  if(!entries.length){
    encOutput.innerHTML = `<div style="text-align:center;padding:60px 20px">
      <div style="font-size:48px;margin-bottom:16px">📖</div>
      <div style="font-size:15px;color:var(--text);margin-bottom:12px;font-family:'Cinzel',serif">Your Encyclopedia is Empty</div>
      <div style="font-size:13px;color:var(--muted);line-height:2.2">
        Entries appear when you analyse videos, save Oracle chats, or use the Video Workshop.<br><br>
        <button onclick="syncAndPush()" style="background:var(--gold);border:none;color:#000;border-radius:6px;padding:8px 20px;font-size:13px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700">⚡ Sync &amp; Push All Reports</button>
      </div>
    </div>`;
    return;
  }

  renderEncEntries();
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

async function clearEncyclopedia(){
  if(!confirm('Clear all encyclopedia entries from all devices?')) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/encyclopedia?created_at=gte.2000-01-01`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
  } catch(e){}
  ENC_ALL_ENTRIES = [];
  localStorage.removeItem('rpgace_encyclopedia');
  document.getElementById('enc-output').innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px">Encyclopedia cleared.</div>';
}

function addToEncyclopedia(){
  if(!PIPELINE.lastResult?.encHtml){ alert('Run the pipeline first.'); return; }
  const existing = document.getElementById('enc-output').innerHTML;
  const wasEmpty = existing.includes('Your encyclopedia');
  const newContent = wasEmpty
    ? `<h2>📖 RPGACE Knowledge Encyclopedia</h2><p style="color:var(--muted);font-size:12px">Auto-compiled from Content Pipeline · Last updated: ${new Date().toLocaleDateString()}</p><hr style="border-color:var(--border);margin:12px 0"/>${PIPELINE.lastResult.encHtml}`
    : existing + `<hr style="border-color:var(--border);margin:16px 0"/>` + PIPELINE.lastResult.encHtml;
  document.getElementById('enc-output').innerHTML = newContent;
  LEARN.encyclopedia = newContent;
  localStorage.setItem('rpgace_encyclopedia', newContent);
  setLearnStatus('pipeline-status','✓ Added to Encyclopedia!','ok');
  addXP(15);
}

function copyPipelineOutput(){
  const text = PIPELINE.lastResult?.notes || '';
  if(!text){ alert('Run the pipeline first.'); return; }
  navigator.clipboard.writeText(text).then(()=>setLearnStatus('pipeline-status','✓ Copied to clipboard','ok'));
}

function resetPipeline(){
  document.getElementById('pipeline-text-input').value = '';
  document.getElementById('pipeline-img-preview').style.display = 'none';
  document.getElementById('pipeline-output').classList.remove('show');
  PIPELINE.imageData = null; PIPELINE.imageType = null;
  PIPELINE.lastResult = null; PIPELINE.lastTitle = null;
  resetChain();
  setLearnStatus('pipeline-status','');
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

  // Push to Supabase
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/journal`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(entry)
    });
  } catch(e){ console.log('Journal Supabase push failed:', e.message); }

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
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/journal?order=created_at.desc&limit=200`, {
      headers: {'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`}
    });
    if(res.ok){
      entries = await res.json();
      localStorage.setItem('rpgace_journal', JSON.stringify(entries));
    }
  } catch(e){}

  if(!entries.length){
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

  el.innerHTML = entries.map((e,i) => {
    const preview = (e.content||'').slice(0,200).replace(/\*\*/g,'').replace(/\n/g,' ');
    const id = `jentry-${i}`;
    return `<div style="background:var(--panel2);border:1px solid var(--border);border-left:3px solid var(--gold);border-radius:10px;padding:16px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:8px;flex-wrap:wrap">
        <div>
          <div style="font-family:'Cinzel',serif;font-size:13px;color:var(--gold);font-weight:600">${e.title||'Journal Entry'}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${sourceIcon(e.source)} ${e.source||'manual'} · 📅 ${e.date||''}</div>
        </div>
        <button onclick="deleteJournalEntry('${e.id||e.created_at}')" style="background:none;border:none;color:var(--muted);font-size:13px;cursor:pointer;padding:2px 6px" title="Delete">🗑</button>
      </div>
      <div id="${id}-preview" style="font-size:12px;color:var(--muted);line-height:1.7;margin-bottom:8px">${preview}${(e.content||'').length>200?'...':''}</div>
      <div id="${id}-full" style="display:none;font-size:13px;color:var(--text);line-height:1.8;white-space:pre-wrap;margin-bottom:8px">${e.content||''}</div>
      <button onclick="toggleJournalEntry('${id}')" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:4px;padding:3px 10px;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif">▼ Expand</button>
    </div>`;
  }).join('');
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
      await fetch(`${SUPABASE_URL}/rest/v1/journal?id=eq.${id}`, {
        method: 'DELETE',
        headers: {'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`}
      });
    } catch(e){}
  }
  // Remove from localStorage
  const existing = JSON.parse(localStorage.getItem('rpgace_journal') || '[]');
  const filtered = existing.filter(e => (e.id||e.created_at) !== id);
  localStorage.setItem('rpgace_journal', JSON.stringify(filtered));
  refreshJournalDisplay();
}

async function clearJournal(){
  if(!confirm('Clear ALL journal entries? This cannot be undone.')) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/journal?created_at=gte.2000-01-01`, {
      method: 'DELETE',
      headers: {'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`}
    });
  } catch(e){}
  localStorage.removeItem('rpgace_journal');
  refreshJournalDisplay();
}

// ═══════════════════════════════════════════════
// VIDEO WORKSHOP
// ═══════════════════════════════════════════════
let VW_LAST_RESULT = null;

async function runVideoWorkshop(){
  const transcript = document.getElementById('vw-transcript').value.trim();
  if(!transcript || transcript.length < 50){ alert('Paste a transcript first — at least a few sentences.'); return; }

  const type = document.getElementById('vw-type').value;
  const duration = document.getElementById('vw-duration').value;
  document.getElementById('vw-run-btn').disabled = true;
  document.getElementById('vw-output').style.display = 'none';
  setLearnStatus('vw-status','⚡ AI analysing transcript...','loading');

  const TYPE_CONTEXT = {
    beat_tutorial: 'beat-making tutorial for aspiring music producers on YouTube',
    vlog: 'music production vlog showing behind-the-scenes creator life',
    review: 'plugin or gear review for music producers',
    challenge: 'challenge video (e.g. making a beat in X minutes)',
    shorts: 'YouTube Short (under 60 seconds, vertical format)'
  };

  const DURATION_CONTEXT = {
    short: 'under 5 minutes — hook fast, one core idea',
    medium: '5–15 minutes — standard tutorial length',
    long: '15+ minutes — deep dive, needs strong chapter structure'
  };

  const prompt = `You are a 300 IQ YouTube strategist specialising in music production content for UK creators.
Channel: @AceSanyaBeats | Creator: Alex (AceSanya) | Goal: 100k views, grow producer audience

VIDEO TYPE: ${TYPE_CONTEXT[type]}
DURATION: ${DURATION_CONTEXT[duration]}

TRANSCRIPT:
${transcript.slice(0, 6000)}

Respond ONLY with valid JSON. No explanation. No markdown fences. Just the JSON object:
{
  "titles": [
    "Title option 1 — hook-first, under 60 chars",
    "Title option 2",
    "Title option 3",
    "Title option 4",
    "Title option 5"
  ],
  "thumbnail_concepts": [
    "Concept 1: [describe facial expression] + [bold text overlay] + [background/colour]",
    "Concept 2: [describe facial expression] + [bold text overlay] + [background/colour]"
  ],
  "short_clips": [
    {"moment": "Quote or description of the moment", "hook": "Why this works as a short", "platform": "TikTok/Reels/Shorts"},
    {"moment": "...", "hook": "...", "platform": "..."},
    {"moment": "...", "hook": "...", "platform": "..."},
    {"moment": "...", "hook": "...", "platform": "..."},
    {"moment": "...", "hook": "...", "platform": "..."}
  ],
  "description": "Full YouTube description (200-300 words). Include: hook paragraph, what viewers learn, call to action, links placeholder. No hashtags here.",
  "tags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10","tag11","tag12","tag13","tag14","tag15"],
  "chapters": [
    "0:00 Intro",
    "0:30 [chapter name]",
    "2:00 [chapter name]"
  ],
  "retention_tips": ["Tip 1 for keeping viewers watching", "Tip 2", "Tip 3"]
}`;

  try {
    const data = await callOracle([{role:'user', content: prompt}], '', 1500);
    const raw = data.content.map(c=>c.text||'').join('').replace(/```json|```/g,'').trim();
    let result;
    try { result = JSON.parse(raw); }
    catch(e) {
      // Try to extract JSON from response
      const match = raw.match(/\{[\s\S]*\}/);
      if(match) result = JSON.parse(match[0]);
      else throw new Error('AI returned non-JSON response');
    }

    VW_LAST_RESULT = { result, transcript: transcript.slice(0,500), type, date: new Date().toLocaleDateString() };

    // Populate titles
    document.getElementById('vw-titles').innerHTML = (result.titles||[]).map(t=>
      `<div onclick="navigator.clipboard.writeText('${t.replace(/'/g,"\\'")}');this.style.color='var(--green)';setTimeout(()=>this.style.color='',1500)"
        style="cursor:pointer;padding:4px 8px;border-radius:4px;border:1px solid var(--border);margin-bottom:4px;transition:all .2s"
        onmouseover="this.style.background='rgba(255,255,255,.04)'" onmouseout="this.style.background=''"
        title="Click to copy">
        📋 ${t}
      </div>`
    ).join('');

    // Populate thumbnails
    document.getElementById('vw-thumbnails').innerHTML = (result.thumbnail_concepts||[]).map((t,i)=>
      `<div style="margin-bottom:10px;padding:8px;background:rgba(255,255,255,.03);border-radius:6px;border-left:2px solid var(--gold)">
        <strong style="color:var(--gold2)">Option ${i+1}:</strong><br>${t}
      </div>`
    ).join('');

    // Populate clips
    document.getElementById('vw-clips').innerHTML = (result.short_clips||[]).map((c,i)=>
      `<div style="margin-bottom:10px;padding:8px;background:rgba(255,255,255,.03);border-radius:6px">
        <span style="background:rgba(201,168,76,.15);color:var(--gold);padding:1px 6px;border-radius:3px;font-size:11px;margin-right:6px">${c.platform||'Short'}</span>
        <strong style="color:var(--text)">${c.moment||''}</strong>
        <div style="color:var(--muted);font-size:11px;margin-top:3px">💡 ${c.hook||''}</div>
      </div>`
    ).join('');

    // Description
    document.getElementById('vw-description').textContent = result.description || '';

    // Tags
    document.getElementById('vw-tags').innerHTML = (result.tags||[]).map(t=>
      `<span style="display:inline-block;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.2);color:var(--gold);border-radius:4px;padding:1px 7px;font-size:11px;margin:2px">${t}</span>`
    ).join('');

    // Chapters
    document.getElementById('vw-chapters').innerHTML = (result.chapters||[]).map(c=>
      `<div style="font-family:monospace;font-size:12px;color:var(--text);margin-bottom:3px">${c}</div>`
    ).join('');

    document.getElementById('vw-output').style.display = 'block';
    setLearnStatus('vw-status','✓ Strategy complete — '+(result.titles?.length||0)+' titles, '+(result.short_clips?.length||0)+' clips identified','ok');
    addXP(75);
    showXPToast(75);

  } catch(e) {
    setLearnStatus('vw-status','✗ Error: '+e.message,'err');
  }
  document.getElementById('vw-run-btn').disabled = false;
}

function copyDescription(){
  const desc = document.getElementById('vw-description').textContent;
  if(desc) navigator.clipboard.writeText(desc).then(()=>{ alert('Description copied!'); });
}

function saveWorkshopToEncyclopedia(){
  if(!VW_LAST_RESULT) return;
  const { result, type, date } = VW_LAST_RESULT;
  const content = `## Video Workshop Strategy\nType: ${type} | Date: ${date}\n\n### Titles\n${(result.titles||[]).map(t=>'- '+t).join('\n')}\n\n### Thumbnail Concepts\n${(result.thumbnail_concepts||[]).join('\n\n')}\n\n### Short Clips\n${(result.short_clips||[]).map(c=>`- **${c.moment}** (${c.platform})\n  ${c.hook}`).join('\n\n')}\n\n### YouTube Description\n${result.description||''}\n\n### Tags\n${(result.tags||[]).join(', ')}\n\n### Chapters\n${(result.chapters||[]).join('\n')}`;
  saveOracleToEncyclopedia('Video Workshop — '+date, content);
  setLearnStatus('vw-status','✓ Saved to Encyclopedia','ok');
}

async function saveWorkshopToNotion(){
  if(!VW_LAST_RESULT) return;
  const { result, type, date } = VW_LAST_RESULT;
  setLearnStatus('vw-status','Saving to Notion...','loading');
  try {
    const markdown = `# Video Workshop Strategy\n\n**Type:** ${type}  \n**Date:** ${date}\n\n## Titles\n${(result.titles||[]).map(t=>'- '+t).join('\n')}\n\n## Thumbnail Concepts\n${(result.thumbnail_concepts||[]).map((t,i)=>`**Option ${i+1}:** ${t}`).join('\n\n')}\n\n## Short Clips for TikTok/Reels/Shorts\n${(result.short_clips||[]).map(c=>`- **${c.moment}**\n  - Platform: ${c.platform}\n  - Why it works: ${c.hook}`).join('\n\n')}\n\n## YouTube Description\n\n${result.description||''}\n\n## Tags\n${(result.tags||[]).join(', ')}\n\n## Chapters\n${(result.chapters||[]).join('\n')}`;

    const res = await fetch('/api/executor',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ tool:'NOTION_CREATE_NOTION_PAGE', input:{
        parent_id: '3830f922-7ad0-8064-ac35-f6ebaff22b99',
        title: `Video Workshop — ${type} — ${date}`,
        markdown
      }})
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error||'Executor error');
    setLearnStatus('vw-status','✓ Saved to Notion!','ok');
    addXP(20);
  } catch(e) {
    setLearnStatus('vw-status','✗ Notion: '+e.message,'err');
  }
}

// ═══════════════════════════════════════════════
// CONTENT INTELLIGENCE — AUTO SYNC + SUBMIT
// ═══════════════════════════════════════════════
const SUPABASE_URL = 'https://gripopghczmrbrhqtqbm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0Z8C5X-FOLrw95VYKxZVCw_4golMyXf';
const LOCAL_SERVER = 'http://localhost:7842';
let INTEL_POLL_INTERVAL = null;
let JOB_POLL_INTERVAL   = null;
let SERVER_ONLINE       = false;

// ── SERVER STATUS — check via Supabase job queue ──
async function checkServerStatus(){
  try {
    // Check if any jobs processed recently = server is running
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/intel_jobs?status=eq.processing&limit=1`,
      {headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}}
    );
    const dot   = document.getElementById('intel-server-dot');
    const label = document.getElementById('intel-server-label');
    if(res.ok){
      const jobs = await res.json();
      SERVER_ONLINE = true;
      if(dot) dot.style.background = 'var(--green)';
      if(label){ label.textContent = jobs.length ? `⚡ Processing ${jobs.length} job(s)` : 'Ready — paste URL to analyse'; label.style.color='var(--green)'; }
    }
    return true;
  } catch(e){
    const dot   = document.getElementById('intel-server-dot');
    const label = document.getElementById('intel-server-label');
    if(dot) dot.style.background = 'var(--gold)';
    if(label){ label.textContent = 'Ready — keep start_server.bat running on your PC'; label.style.color='var(--muted)'; }
    SERVER_ONLINE = true; // Supabase works regardless of local server
    return true;
  }
}

// ── SUBMIT URL — via Supabase job queue ──
async function submitIntelURL(){
  const input = document.getElementById('intel-url-input');
  const url   = input?.value?.trim();
  if(!url || !url.startsWith('http')){ alert('Paste a valid URL first.'); return; }

  const btn = document.getElementById('intel-submit-btn');
  if(btn){ btn.disabled = true; btn.textContent = '⏳ Queuing...'; }

  try {
    // Submit job to Supabase — local server picks it up automatically
    const res = await fetch(`${SUPABASE_URL}/rest/v1/intel_jobs`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({url, status: 'queued'})
    });
    const data = await res.json();
    if(!res.ok) throw new Error(JSON.stringify(data).slice(0,200));

    const jobId = Array.isArray(data) ? data[0]?.id : data?.id;
    input.value = '';
    showIntelTab('insights');

    // Show queued state
    const jobsEl = document.getElementById('intel-jobs');
    if(jobsEl) jobsEl.innerHTML = `<div style="background:var(--panel2);border:1px solid var(--gold)33;border-left:3px solid var(--gold);border-radius:6px;padding:10px 14px;margin-bottom:8px">
      <div style="font-size:12px;color:var(--text)">${url.slice(0,60)}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px">⏳ Queued — your PC will pick this up automatically...</div>
    </div>`;

    // Start polling Supabase for job updates
    startJobPolling(jobId);

  } catch(e){
    alert('Submit failed: ' + e.message + '\n\nMake sure you have run the intel_jobs SQL in Supabase.');
  }

  if(btn){ btn.disabled = false; btn.textContent = '⚡ Analyse'; }
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
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/intel_jobs?order=created_at.desc&limit=10`,
      {headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}}
    );
    if(!res.ok) return;
    const jobs = await res.json();

    const activeJobs = jobs.filter(j => j.status !== 'cancelled');
    renderJobs(activeJobs);

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

  el.innerHTML = jobs.map(j => {
    const statusColor = j.status==='complete' ? 'var(--green)' : j.status==='error' ? 'var(--red)' : 'var(--gold)';
    const statusIcon  = j.status==='complete' ? '✓' : j.status==='error' ? '✗' : j.status==='processing' ? '⚡' : '⏳';
    const dots = j.status==='processing'||j.status==='downloading' ? '<span class="loading-dots">...</span>' : '';
    return `<div style="background:var(--panel2);border:1px solid ${statusColor}33;border-left:3px solid ${statusColor};border-radius:6px;padding:10px 14px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${j.url?.slice(0,55)||'Processing...'}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${j.progress||''}${dots}</div>
        </div>
        <div style="font-size:13px;font-weight:700;color:${statusColor};margin-left:12px">${statusIcon}</div>
      </div>
      ${j.status==='error' ? `<div style="font-size:11px;color:var(--red);margin-top:4px">✗ ${j.error}</div>` : ''}
    </div>`;
  }).join('');
}

async function fetchFromSupabase(){
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/intel_reports?order=created_at.desc&limit=50`,{
      headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}
    });
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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/intel_watchlist?order=created_at.desc&limit=100`,{
      headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}
    });
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
  const all = mergeByUrl(reports||[], cached);

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

  // Auto-save new entries to encyclopedia
  for(const r of all.slice(0,5)){
    const enc = r.insights?.encyclopedia_entry;
    if(enc?.title && enc?.summary){
      const alreadySaved = (localStorage.getItem('rpgace_enc_saved')||'').includes(r.url||r.title);
      if(!alreadySaved){
        const content = `## ${enc.title}\n\n**Source:** ${r.title} by ${r.creator} (${r.platform})\n**Score:** ${r.score}/10\n\n### Summary\n${enc.summary}\n\n### Key Learnings\n${enc.key_learnings?.map(l=>'- '+l).join('\n')||''}\n\n### Production Techniques\n${(r.insights?.production_techniques||[]).map(t=>'- '+t).join('\n')}\n\n### What To Apply\n${(r.insights?.what_to_steal||[]).map(s=>'→ '+s).join('\n')}\n\n### Tags\n${enc.tags?.join(', ')||''}`;
        await saveOracleToEncyclopedia(enc.title, content);
        const saved = localStorage.getItem('rpgace_enc_saved')||'';
        localStorage.setItem('rpgace_enc_saved', saved + '|' + (r.url||r.title));
      }
    }
  }

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
  INTEL_POLL_INTERVAL = setInterval(()=>{
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
  saveOracleToEncyclopedia(enc.title||item.title, content);
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

function loadNote(id){
  const entry = LEARN.db.find(n=>n.id===id);
  if(!entry) return;
  LEARN.selectedVideo = {id:entry.videoId, title:entry.videoTitle, thumb:entry.thumb, channel:entry.channel, url:entry.url};
  document.getElementById('notes-output').value = entry.notes;
  const info = document.getElementById('notes-selected-info');
  if(info){ info.textContent = '✓ '+entry.videoTitle; info.style.display='block'; }
  const urlEl = document.getElementById('notes-video-url');
  if(urlEl) urlEl.value = entry.url||'';
  document.getElementById('save-notes-btn').disabled = false;
  showPage('learning', document.querySelector('.nav-tab:nth-child(7)'));
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



// ── COMPOSIO PIPELINE AGENTS ──

async function pipelineToNotion(){
  if(!PIPELINE.lastResult){ alert('Run the pipeline first.'); return; }
  setAgentPipeStatus('Sending to Notion via Agent 4...','loading');
  try{
    const title = PIPELINE.lastTitle || 'RPGACE Pipeline Note';
    const notes = PIPELINE.lastResult.notes;
    const type  = PIPELINE.lastResult.typeMeta?.label || PIPELINE.lastResult.type;
    const date  = new Date().toLocaleDateString();
    const content = `RPGACE Knowledge Note\nType: ${type}\nDate: ${date}\nQuality: ${PIPELINE.lastResult.qualityScore||'?'}/10\n\n${notes}\n\n---\nGenerated by RPGACE Content Pipeline`;

    const res = await fetch('/api/executor',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ tool:'NOTION_CREATE_NOTION_PAGE', input:{ parent_id:'3830f922-7ad0-8064-ac35-f6ebaff22b99', title:`[${type}] ${title}`, markdown:`# ${title}\n\n**Type:** ${type}  \n**Date:** ${date}  \n**Quality:** ${PIPELINE.lastResult.qualityScore||'?'}/10\n\n---\n\n${notes}` } })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error||'Executor error');
    const pageUrl = data.data?.url || data.data?.id || '';
    setAgentPipeStatus('✓ Saved to Notion!'+(pageUrl?' <a href="https://notion.so" target="_blank" style="color:var(--blue)">Open Notion</a>':''),'ok');
    addXP(25); agentLog(`[OK] Pipeline → Notion: "${title}"`,'ok');
  } catch(e){
    setAgentPipeStatus('✗ Notion: '+e.message,'err');
    agentLog(`[ERR] Pipeline → Notion: ${e.message}`,'err');
  }
}

async function pipelineToGitHub(){
  if(!PIPELINE.lastResult){ alert('Run the pipeline first.'); return; }
  setAgentPipeStatus('Saving to GitHub via Agent 4...','loading');
  try{
    const title    = PIPELINE.lastTitle || 'pipeline-note';
    const notes    = PIPELINE.lastResult.notes;
    const type     = PIPELINE.lastResult.type;
    const date     = new Date().toISOString().split('T')[0];
    const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,50);
    const filename = `notes/${type}/${date}-${safeName}.md`;
    const mdContent = `# ${title}\n\n> **Type:** ${PIPELINE.lastResult.typeMeta?.icon||''} ${PIPELINE.lastResult.typeMeta?.label||type}\n> **Date:** ${date}\n> **Quality:** ${PIPELINE.lastResult.qualityScore||'?'}/10\n> **Source:** RPGACE Content Pipeline\n\n---\n\n${notes}\n`;

    const res = await fetch('/api/executor',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        tool:'GITHUB_CREATE_OR_UPDATE_FILE_CONTENTS',
        input:{ repo:'content-scripts', path:filename, message:`Add note: ${title}`, content:btoa(unescape(encodeURIComponent(mdContent))) }
      })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error||'Executor error');
    const fileUrl = data.data?.content?.html_url || '';
    setAgentPipeStatus('✓ Saved to GitHub!'+(fileUrl?' <a href="'+fileUrl+'" target="_blank" style="color:var(--blue)">View file</a>':''),'ok');
    addXP(25); agentLog(`[OK] Pipeline → GitHub: ${filename}`,'ok');
  } catch(e){
    setAgentPipeStatus('✗ GitHub: '+e.message,'err');
    agentLog(`[ERR] Pipeline → GitHub: ${e.message}`,'err');
  }
}

async function pipelineToGmail(){
  if(!PIPELINE.lastResult){ alert('Run the pipeline first.'); return; }
  setAgentPipeStatus('Writing email draft...','loading');
  try{
    const type  = PIPELINE.lastResult.type;
    const title = PIPELINE.lastTitle;
    const notes = PIPELINE.lastResult.notes.slice(0,1500);
    const emailPrompt = `Based on these pipeline notes about "${title}" (${type} content), write a short professional email draft.

If collab/business opportunity → write a collab pitch.
If learning resource → write a sharing-insights email to a mentor or peer.
If recipe/fitness/tech → write a casual sharing email.

Notes context:
${notes}

Write:
SUBJECT: [subject line]
BODY: [email body max 150 words, professional but warm]

IMPORTANT: Sign off as: Alex
acesanyabeats@gmail.com

Do NOT include any recipient email address in the body or subject.`;

    const emailData = await callOracle(
      [{role:'user',content:emailPrompt}],
      'You write short natural professional emails. Be concise and genuine. Never invent email addresses.'
    );
    const emailText = emailData.content.map(c=>c.text||'').join('');
    const subjectMatch = emailText.match(/SUBJECT:\s*(.+)/i);
    const bodyMatch    = emailText.match(/BODY:\s*([\s\S]+)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : `RPGACE Notes: ${title}`;
    const body    = bodyMatch    ? bodyMatch[1].trim()    : emailText;

    // Use executor — always empty to field
    const res = await fetch('/api/executor',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ tool:'GMAIL_CREATE_EMAIL_DRAFT', input:{ subject, body, to:'' } })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error||'Executor error');

    setAgentPipeStatus('✓ Draft saved to Gmail — open <a href="https://mail.google.com/mail/#drafts" target="_blank" style="color:var(--blue)">Gmail drafts</a>, add recipient and send.','ok');
    addXP(20);
    agentLog(`[OK] Pipeline → Gmail draft: "${subject}"`,'ok');
  } catch(e){
    setAgentPipeStatus('✗ Gmail error: '+e.message,'err');
    agentLog(`[ERR] Pipeline → Gmail: ${e.message}`,'err');
  }
}

function setAgentPipeStatus(msg, type=''){
  const el = document.getElementById('agent-pipe-status');
  if(!el) return;
  el.innerHTML = msg;
  el.className = 'learn-status'+(type?' '+type:'');
}
