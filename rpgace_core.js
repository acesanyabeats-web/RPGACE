/**
 * RPGACE Core Foundation Layer v1.0
 * Loaded after main.js. Never modify main.js again.
 * Step 8+ features go here as RPGACE.register() modules.
 */
(function(global){
  'use strict';

  function onReady(fn){
    if(document.readyState==='complete'){setTimeout(fn,150);}
    else{global.addEventListener('load',function(){setTimeout(fn,150);});}
  }

  global.RPGACE=global.RPGACE||{};
  var R=global.RPGACE;

  /* DATA LAYER */
  R.DB={
    SCHEMA:{
      shifts:{key:'rpgace_shifts',fallback:[]},
      sched:{key:'rpgace_sched_agendas',fallback:[]},
      log:{key:'rpgace_daily_log',fallback:{}},
      agendas:{key:'rpgace_agendas',fallback:[]},
    },
    _key:function(n){return(this.SCHEMA[n]&&this.SCHEMA[n].key)||n;},
    _fb:function(n){var s=this.SCHEMA[n];if(!s)return null;return Array.isArray(s.fallback)?[]:s.fallback;},
    get:function(n){
      try{var r=localStorage.getItem(this._key(n));return r===null?this._fb(n):JSON.parse(r);}
      catch(e){console.warn('[RPGACE.DB.get]',n,e.message);return this._fb(n);}
    },
    set:function(n,v){
      try{localStorage.setItem(this._key(n),JSON.stringify(v));R.hooks.fire('db:change',n,v);return true;}
      catch(e){console.warn('[RPGACE.DB.set]',n,e.message);return false;}
    },
    push:function(n,item){
      var arr=this.get(n)||[];
      var entry=Object.assign({id:R.utils.id(),createdAt:new Date().toISOString()},item);
      arr.push(entry);this.set(n,arr);return entry;
    },
    update:function(n,id,updates){
      var arr=this.get(n)||[];
      var idx=arr.findIndex(function(x){return x.id===id||x._id===id;});
      if(idx<0)return null;
      arr[idx]=Object.assign({},arr[idx],updates);this.set(n,arr);return arr[idx];
    },
    remove:function(n,id){
      var arr=(this.get(n)||[]).filter(function(x){return x.id!==id&&x._id!==id;});
      this.set(n,arr);return arr;
    },
  };

  /* STATE LAYER */
  R.STATE={
    _s:{},
    get:function(k){return this._s[k];},
    set:function(k,v){this._s[k]=v;R.hooks.fire('state:change',k,v);return v;},
    get dailyDate(){return this._s.dailyDate||new Date();},
    set dailyDate(d){this._s.dailyDate=d;R.hooks.fire('state:change','dailyDate',d);},
    get weekStart(){return this._s.weekStart;},
    set weekStart(d){this._s.weekStart=d;R.hooks.fire('state:change','weekStart',d);},
    get monthDate(){return this._s.monthDate||new Date();},
    set monthDate(d){this._s.monthDate=d;R.hooks.fire('state:change','monthDate',d);},
    get pendingSched(){return this._s.pendingSched;},
    set pendingSched(v){this._s.pendingSched=v;},
  };

  /* Bridge window globals -> RPGACE.STATE */
  function bridge(gn,sk){
    try{Object.defineProperty(global,gn,{
      get:function(){return R.STATE._s[sk];},
      set:function(v){R.STATE._s[sk]=v;},
      configurable:true
    });}catch(e){}
  }
  bridge('_dailyDate','dailyDate');
  bridge('_calWeekStart','weekStart');
  bridge('_calMonthDate','monthDate');
  bridge('_pendingSchedAgenda','pendingSched');

  /* HOOK SYSTEM */
  R.hooks={
    _r:{},
    on:function(ev,fn,p){
      p=p||10;
      if(!this._r[ev])this._r[ev]=[];
      this._r[ev].push({handler:fn,priority:p});
      this._r[ev].sort(function(a,b){return a.priority-b.priority;});
      var self=this;return function(){self.off(ev,fn);};
    },
    off:function(ev,fn){
      if(this._r[ev])this._r[ev]=this._r[ev].filter(function(h){return h.handler!==fn;});
    },
    fire:function(ev){
      var args=Array.prototype.slice.call(arguments,1);
      (this._r[ev]||[]).forEach(function(h){
        try{h.handler.apply(null,args);}catch(e){console.warn('[RPGACE.hooks]',ev,e.message);}
      });
    },
    pipe:function(ev,val){
      return(this._r[ev]||[]).reduce(function(acc,h){
        try{return h.handler(acc);}catch(e){return acc;}
      },val);
    },
  };

  /* API LAYER */
  R.api=async function(action,params){
    params=params||{};
    var res=await fetch('/api/composio',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'execute',tool:action,input:params}),
    });
    var data=await res.json();
    if(data.error)throw new Error(data.error);
    return data.data||data;
  };
  R.oracle=async function(messages,system,maxTokens){
    if(typeof callOracle==='function')return callOracle(messages,system,maxTokens||1000);
    throw new Error('[RPGACE.oracle] callOracle not available');
  };

  /* UTILS */
  R.utils={
    dateStr:function(d){return(d||new Date()).toISOString().split('T')[0];},
    mondayOf:function(d){
      d=d||new Date();var r=new Date(d);r.setHours(0,0,0,0);
      var dow=r.getDay();r.setDate(r.getDate()-(dow===0?6:dow-1));return r;
    },
    dayAbbr:function(ds){
      try{var d=new Date(ds+'T00:00:00');return['MON','TUE','WED','THU','FRI','SAT','SUN'][d.getDay()===0?6:d.getDay()-1];}
      catch(e){return'???';}
    },
    fmtTime:function(s){var m=Math.floor(s/60);return m+':'+(Math.floor(s%60)).toString().padStart(2,'0');},
    id:function(){return'rp_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);},
    toast:function(msg,color,ms){
      color=color||'#C9A84C';ms=ms||3000;
      var t=document.createElement('div');
      t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0f0f18;border:1px solid '+color+'40;color:'+color+';font-family:Rajdhani,sans-serif;font-size:13px;font-weight:700;padding:10px 20px;border-radius:8px;z-index:9999;white-space:nowrap;pointer-events:none;transition:opacity .3s';
      t.textContent=msg;document.body.appendChild(t);
      setTimeout(function(){t.style.opacity='0';setTimeout(function(){t.remove();},300);},ms);
    },
    copy:function(text,btn){
      navigator.clipboard.writeText(text).then(function(){
        if(btn){var o=btn.textContent;btn.textContent='Copied';setTimeout(function(){btn.textContent=o;},1500);}
      }).catch(function(){var ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();});
    },
  };

  /* FUNCTION WRAPPERS - add hooks to existing main.js functions */
  onReady(function(){
    function wrap(name,after){
      if(typeof global[name]==='function'){
        var orig=global[name];
        global[name]=function(){
          var result;
          try{result=orig.apply(this,arguments);}
          catch(e){console.warn('[RPGACE wrap:'+name+']',e.message);}
          after.apply(this,arguments);
          return result;
        };
      }
    }
    function wrapAsync(name,after){
      if(typeof global[name]==='function'){
        var orig=global[name];
        global[name]=async function(){
          var result;
          try{result=await orig.apply(this,arguments);}
          catch(e){console.warn('[RPGACE wrap:'+name+']',e.message);}
          after.apply(this,arguments);
          return result;
        };
      }
    }
    wrap('showSched',function(type){R.hooks.fire('sched:show',type);});
    wrap('showPage',function(name){R.hooks.fire('page:show',name);});
    wrap('renderAgendas',function(){R.hooks.fire('agendas:rendered');});
    wrap('addXP',function(amount){R.hooks.fire('xp:awarded',amount);});
    wrapAsync('saveToJournal',function(title,content,source){R.hooks.fire('journal:saved',{title:title,source:source});});
    console.log('[RPGACE] Foundation layer active. Hooks wired. Modules:',Object.keys(R.modules));
    R._ready=true;
    R.hooks.fire('rpgace:ready');
  });

  /* MODULE REGISTRY */
  R.modules={};R._ready=false;
  R.register=function(name,module){
    if(R.modules[name]){console.warn('[RPGACE.register] Already registered:',name);return;}
    R.modules[name]=module;
    if(typeof module.init==='function'){
      if(R._ready){try{module.init();}catch(e){console.error('[RPGACE] Module init failed:',name,e.message);}}
      else{R.hooks.on('rpgace:ready',function(){try{module.init();}catch(e){console.error('[RPGACE] Module init failed:',name,e.message);}});}
    }
    console.log('[RPGACE] Module registered:',name);
  };

})(window);

/* ================================================================
   STEP 8+ MODULES GO BELOW THIS LINE
   Use RPGACE.register('name', { init(){ ... } })
   NEVER edit main.js again.
================================================================ */
