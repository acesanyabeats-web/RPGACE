import re

src = open('main.js', encoding='utf-8', errors='replace').read()

def find_function_span(src, fn_signature_start):
    """Find a function's full span by counting braces from its opening {."""
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

count = 0

# ── 1. Insert scheduleToCalendar() right before renderDailyGrid ──────────
start, end = find_function_span(src, 'function renderDailyGrid(){')
if start is None:
    print("ERROR: could not locate renderDailyGrid - aborting")
    raise SystemExit

SCHEDULE_TO_CALENDAR = '''// ── Unified scheduling entry point — every "Schedule" button anywhere
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

'''

# ── 2. New renderDailyGrid with real visual compaction ───────────────────
NEW_RENDER_DAILY_GRID = '''function renderDailyGrid(){
  window._dailyDate=window._dailyDate||new Date();
  const d=window._dailyDate;
  const lbl=document.getElementById('daily-date-label');
  if(lbl)lbl.textContent=d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  buildTimeSlots();
  const dateStr=(typeof _calDateStr==='function'?_calDateStr(d):d.toISOString().split('T')[0]);
  const todayStr=(typeof _calDateStr==='function'?_calDateStr(new Date()):new Date().toISOString().split('T')[0]);
  const isPast=dateStr<todayStr;

  const timeSlotsEl=document.getElementById('time-slots');
  if(!timeSlotsEl)return;
  timeSlotsEl.style.position='relative';

  document.querySelectorAll('.dsh-overlay,.dsh-log').forEach(el=>el.remove());

  // ── Gather all events for this day, normalized to fractional hours ──
  const shifts=typeof getShiftsForDate==='function'?getShiftsForDate(dateStr):[];
  const schedAgendas=JSON.parse(localStorage.getItem('rpgace_sched_agendas')||'[]').filter(a=>a.date===dateStr);

  const events=[];
  shifts.forEach(function(s){
    const startH=parseInt(s.start.split(':')[0]);
    const startM=parseInt(s.start.split(':')[1])||0;
    const isMid=s.end==='00:00';
    const endH=isMid?24:parseInt(s.end.split(':')[0]);
    const endM=isMid?0:(parseInt(s.end.split(':')[1])||0);
    events.push({
      startFrac:startH+startM/60, endFrac:endH+endM/60,
      label:'\\uD83C\\uDFEA '+s.role, sub:s.start+' \\u2013 '+(isMid?'00:00':s.end),
      color:'#C9A84C', bg:'rgba(201,168,76,0.14)', type:'shift'
    });
  });
  schedAgendas.forEach(function(a){
    const startH=a.hour||0, startM=a.minute||0;
    const durMins=a.estimated_mins||60;
    const startFrac=startH+startM/60;
    const endFrac=startFrac+(durMins/60);
    events.push({
      startFrac, endFrac,
      label:'\\u23F0 '+a.title, sub:String(startH).padStart(2,'0')+':'+String(startM).padStart(2,'0')+' \\u00B7 '+durMins+'min est',
      color:'#4A90E2', bg:'rgba(74,144,226,0.14)', type:'agenda', id:a.id,
      completed:a.completed
    });
  });
  events.sort(function(a,b){return a.startFrac-b.startFrac;});

  // ── Measure a clean row's height to compute absolute positions ──
  const sampleRow=document.getElementById('ts-0');
  const rowHeight=sampleRow?sampleRow.getBoundingClientRect().height:40;

  const overlay=document.createElement('div');
  overlay.className='dsh-overlay';
  overlay.style.cssText='position:absolute;top:0;left:0;right:0;pointer-events:none;z-index:2;';
  timeSlotsEl.appendChild(overlay);

  events.forEach(function(ev){
    const top=ev.startFrac*rowHeight;
    const height=Math.max((ev.endFrac-ev.startFrac)*rowHeight,rowHeight*0.4);

    // Hide the free-text inputs on every hour row this event covers
    const firstH=Math.floor(ev.startFrac), lastH=Math.ceil(ev.endFrac)-1;
    for(var h=firstH;h<=Math.min(lastH,23);h++){
      const slot=document.getElementById('ts-'+h);
      if(slot){const inp=slot.querySelector('.time-input');if(inp)inp.style.display='none';}
    }

    const block=document.createElement('div');
    block.className='dsh-agenda';
    if(ev.id)block.dataset.id=ev.id;
    block.style.cssText='position:absolute;left:4px;right:8px;top:'+top+'px;height:'+height+'px;'
      +'background:'+ev.bg+';border-left:2px solid '+ev.color+';border-radius:5px;padding:5px 9px;'
      +'font-family:Rajdhani,sans-serif;pointer-events:auto;overflow:hidden;'
      +(ev.completed?'opacity:0.5;':'');
    block.innerHTML='<div style="font-size:11px;font-weight:700;color:'+ev.color+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+ev.label+'</div>'
      +'<div style="font-size:10px;color:rgba(226,226,236,0.45);margin-top:1px;">'+ev.sub+'</div>';
    overlay.appendChild(block);

    // Green partial-hour boundary markers where start/end don't land on the hour
    const startFracPart=ev.startFrac%1;
    if(startFracPart>0.01){
      const marker=document.createElement('div');
      marker.style.cssText='position:absolute;left:0;right:0;top:'+top+'px;border-top:1px dashed rgba(61,170,110,0.5);pointer-events:none;';
      marker.innerHTML='<span style="position:absolute;left:2px;top:-8px;font-size:8px;color:rgba(61,170,110,0.7);font-family:Rajdhani,sans-serif;background:#0a0a12;padding:0 3px;">:'+String(Math.round(startFracPart*60)).padStart(2,'0')+'</span>';
      overlay.appendChild(marker);
    }
    const endFracPart=ev.endFrac%1;
    if(endFracPart>0.01){
      const endTop=ev.endFrac*rowHeight;
      const marker=document.createElement('div');
      marker.style.cssText='position:absolute;left:0;right:0;top:'+endTop+'px;border-top:1px dashed rgba(61,170,110,0.5);pointer-events:none;';
      marker.innerHTML='<span style="position:absolute;left:2px;top:2px;font-size:8px;color:rgba(61,170,110,0.7);font-family:Rajdhani,sans-serif;background:#0a0a12;padding:0 3px;">:'+String(Math.round(endFracPart*60)).padStart(2,'0')+'</span>';
      overlay.appendChild(marker);
    }
  });

  // Agenda blocks get Start/Done action buttons (only for non-completed, non-past-uncompleted)
  events.filter(function(e){return e.type==='agenda'&&!e.completed;}).forEach(function(ev){
    const block=overlay.querySelector('.dsh-agenda[data-id="'+ev.id+'"]');
    if(!block)return;
    const actions=document.createElement('div');
    actions.style.cssText='margin-top:3px;display:flex;gap:6px;';
    actions.innerHTML='<button onclick="event.stopPropagation();startScheduledTask(\\''+ev.id+'\\')" style="background:none;border:1px solid rgba(74,144,226,0.3);color:#4A90E2;border-radius:4px;padding:2px 8px;font-size:9px;cursor:pointer;font-family:Rajdhani,sans-serif;">Start</button>'
      +'<button onclick="event.stopPropagation();completeScheduledTask(\\''+ev.id+'\\')" style="background:none;border:1px solid rgba(61,170,110,0.3);color:#3DAA6E;border-radius:4px;padding:2px 8px;font-size:9px;cursor:pointer;font-family:Rajdhani,sans-serif;">Done</button>';
    block.appendChild(actions);
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
      const ts=document.getElementById('time-slots');if(ts)ts.parentNode.insertBefore(logC,ts);
    }
  }

  const fh=events.length?Math.floor(events[0].startFrac):9;
  const fs=document.getElementById('ts-'+fh);
  if(fs)setTimeout(function(){fs.scrollIntoView({behavior:'smooth',block:'center'});},100);
  setTimeout(_addSchedButtons,300);
}'''

fixed = src[:start] + SCHEDULE_TO_CALENDAR + NEW_RENDER_DAILY_GRID + src[end:]
count += 1
print("1. scheduleToCalendar() inserted + renderDailyGrid rewritten with real visual compaction")

# ── 3. Rewrite confirmScheduleModal to use scheduleToCalendar + minute field ──
start2, end2 = find_function_span(fixed, 'function confirmScheduleModal(){')
if start2 is not None:
    NEW_CONFIRM_MODAL = '''function confirmScheduleModal(){
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
}'''
    fixed = fixed[:start2] + NEW_CONFIRM_MODAL + fixed[end2:]
    count += 1
    print("2. confirmScheduleModal rewired through scheduleToCalendar() with minute support")
else:
    print("ERROR: confirmScheduleModal not found")

# ── 4. Rewrite confirmSchedule (Agenda-card button) through scheduleToCalendar ──
start3, end3 = find_function_span(fixed, 'function confirmSchedule(idx){')
if start3 is not None:
    NEW_CONFIRM_SCHEDULE = '''function confirmSchedule(idx){
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
}'''
    fixed = fixed[:start3] + NEW_CONFIRM_SCHEDULE + fixed[end3:]
    count += 1
    print("3. confirmSchedule (Agenda-card button) rewired through scheduleToCalendar()")
else:
    print("ERROR: confirmSchedule not found")

# ── 5. Add minutes dropdown to the schedule modal ─────────────────────────
old_hour_block = """+'<div><div style=\"font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.4);text-transform:uppercase;margin-bottom:6px\">Start Time</div><select id=\"sched-hour\" style=\"width:100%;background:#141420;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;padding:8px 12px;font-family:Rajdhani,sans-serif;font-size:13px;outline:none\">'+hours+'</select></div>'"""

new_hour_block = """+'<div><div style=\"font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.4);text-transform:uppercase;margin-bottom:6px\">Start Time</div><div style=\"display:flex;gap:8px\"><select id=\"sched-hour\" style=\"flex:1;background:#141420;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;padding:8px 12px;font-family:Rajdhani,sans-serif;font-size:13px;outline:none\">'+hours+'</select><select id=\"sched-minute\" style=\"width:80px;background:#141420;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;padding:8px 12px;font-family:Rajdhani,sans-serif;font-size:13px;outline:none\">'+minutes+'</select></div></div>'"""

if old_hour_block in fixed:
    fixed = fixed.replace(old_hour_block, new_hour_block, 1)
    count += 1
    print("4a. Minutes dropdown markup added next to hour select")
else:
    print("ERROR: hour select block not found for minutes insertion")

old_hours_def = """const hours=Array.from({length:18},function(_,i){const h=i+6;const label=h<12?h+':00 AM':h===12?'12:00 PM':(h-12)+':00 PM';return '<option value=\"'+h+'\">'+label+'</option>';}).join('');"""
new_hours_def = """const hours=Array.from({length:18},function(_,i){const h=i+6;const label=h<12?h+':00 AM':h===12?'12:00 PM':(h-12)+':00 PM';return '<option value=\"'+h+'\">'+label+'</option>';}).join('');
  const minutes=[0,5,10,15,20,25,30,35,40,45,50,55].map(function(m){return '<option value=\"'+m+'\">:'+String(m).padStart(2,'0')+'</option>';}).join('');"""

if old_hours_def in fixed:
    fixed = fixed.replace(old_hours_def, new_hours_def, 1)
    count += 1
    print("4b. Minutes options array defined (00,05,...,55)")
else:
    print("ERROR: hours definition not found for minutes array insertion")

open('main.js', 'w', encoding='utf-8').write(fixed)
print("\\nTotal patches applied:", count, "of 6")
