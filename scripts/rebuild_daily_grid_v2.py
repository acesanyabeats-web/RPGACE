import re

src = open('main.js', encoding='utf-8', errors='replace').read()

def find_function_span(src, fn_signature_start):
    idx = src.find(fn_signature_start)
    if idx == -1:
        return None, None
    brace_start = src.find('{', idx)
    if brace_start == -1:
        return None, None
    depth = 0
    i = brace_start
    while i < len(src):
        if src[i] == '{':
            depth += 1
        elif src[i] == '}':
            depth -= 1
            if depth == 0:
                return idx, i + 1
        i += 1
    return None, None

start, end = find_function_span(src, 'function renderDailyGrid(){')
if start is None:
    print("ERROR: renderDailyGrid not found - aborting")
    raise SystemExit

NEW_FN = '''function _fracClock(f){
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
    events.push({startFrac:startH+startM/60, endFrac:endH+endM/60, type:'shift', label:'\\uD83C\\uDFEA '+s.role, color:'#C9A84C', bg:'rgba(201,168,76,0.14)'});
  });
  schedAgendas.forEach(function(a){
    const startFrac=(a.hour||0)+(a.minute||0)/60;
    const endFrac=startFrac+((a.estimated_mins||60)/60);
    events.push({startFrac,endFrac,type:'agenda',label:'\\u23F0 '+a.title,color:'#4A90E2',bg:'rgba(74,144,226,0.14)',id:a.id,completed:a.completed,estimated_mins:a.estimated_mins});
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
    const rangeLabel=_fracClock(row.startFrac)+'\\u2013'+_fracClock(row.endFrac);

    if(row.type==='free'){
      div.style.cssText='padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;gap:12px;min-height:36px;';
      div.innerHTML='<span style="font-family:Rajdhani,sans-serif;font-size:11px;color:rgba(226,226,236,0.35);min-width:110px;">'+rangeLabel+'</span>'
        +'<input class="time-input" placeholder="Add task..." style="flex:1;background:none;border:none;color:rgba(226,226,236,0.5);font-family:Rajdhani,sans-serif;font-size:12px;outline:none;"/>';
    } else {
      const isAgenda=row.type==='agenda';
      div.style.cssText='padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.04);border-left:3px solid '+row.color+';background:'+row.bg+';'+(row.completed?'opacity:0.5;':'');
      div.innerHTML='<div style="font-family:Rajdhani,sans-serif;font-size:13px;font-weight:700;color:'+row.color+';">'+row.label+'</div>'
        +'<div style="font-family:Rajdhani,sans-serif;font-size:11px;color:rgba(226,226,236,0.4);margin-top:2px;">'+rangeLabel+(isAgenda&&row.estimated_mins?' \\u00B7 '+row.estimated_mins+'min est':'')+'</div>';

      if(isAgenda && !row.completed){
        const actions=document.createElement('div');
        actions.style.cssText='display:flex;gap:6px;margin-top:6px;';
        actions.innerHTML='<button onclick="event.stopPropagation();startScheduledTask(\\''+row.id+'\\')" style="background:none;border:1px solid rgba(74,144,226,0.3);color:#4A90E2;border-radius:4px;padding:3px 9px;font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;">Start</button>'
          +'<button onclick="event.stopPropagation();completeScheduledTask(\\''+row.id+'\\')" style="background:none;border:1px solid rgba(61,170,110,0.3);color:#3DAA6E;border-radius:4px;padding:3px 9px;font-size:10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;">Done</button>';
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
      logH.innerHTML='\\u2705 '+entries.length+' actions logged <span style="font-size:10px">\\u25BC</span>';
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
}'''

fixed = src[:start] + NEW_FN + src[end:]
open('main.js', 'w', encoding='utf-8').write(fixed)
print("PATCHED: renderDailyGrid fully rebuilt with row-collapsing model, 24hr HH:MM-HH:MM labels, no pixel math")
