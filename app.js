const THEME_NAMES={'Aquaraiders II':'Aqua Raiders','Aquaraiders I':'Aquaraiders'};
const tName=n=>THEME_NAMES[n]||n;
function rootTheme(id){let t=THEMES[id];let n=0;while(t&&t[1]!=null&&n<10){id=t[1];t=THEMES[id];n++;}return t?tName(t[0]):'Unknown';}
function parseList(text){
  const out={};
  for(const line of text.split(/\r?\n/)){
    const cells=line.split(/[,\t;]/).map(c=>c.trim().replace(/^"|"$/g,''));
    const sn=cells.find(c=>/^[0-9A-Za-z]+(-\d+)?$/.test(c)&&/\d/.test(c));
    if(!sn)continue;
    let key=sn.includes('-')?sn:sn+'-1';
    if(!SETS[key])continue;
    const q=parseInt(cells[cells.indexOf(sn)+1]);
    out[key]=(out[key]||0)+(q>0&&q<1000?q:1);
  }
  return out;
}
function tier(id,icon,title,desc,g,val,goal,winner){return {id,icon,title,desc,g,unlocked:val>=goal,progress:Math.min(val,goal),goal,winner};}
function compute(owned){
  const list=Object.keys(owned).map(k=>({num:k,name:SETS[k][0],year:SETS[k][1],theme:rootTheme(SETS[k][2]),parts:SETS[k][3],qty:owned[k]}));
  if(!list.length)return {list,ach:[]};
  const pieces=list.reduce((a,s)=>a+s.parts*s.qty,0);
  const themeCount={};list.forEach(s=>themeCount[s.theme]=(themeCount[s.theme]||0)+1);
  const decades=new Set(list.map(s=>Math.floor(s.year/10)*10));
  const by=(f)=>list.slice().sort(f)[0];
  const oldest=by((a,b)=>a.year-b.year), newest=by((a,b)=>b.year-a.year);
  const big=by((a,b)=>b.parts-a.parts), small=by((a,b)=>a.parts-b.parts||a.year-b.year);
  const topTheme=Object.entries(themeCount).sort((a,b)=>b[1]-a[1])[0];
  const lbl=s=>`${s.num.replace(/-1$/,'')} ${s.name} (${s.year})`;
  const A=[
    {id:'first',icon:'🧱',title:'First Brick',desc:'Log your first set',g:10,unlocked:true,winner:lbl(list[0])},
    {id:'oldest',icon:'⏳',title:'Time Traveler',desc:'Your oldest set',g:25,unlocked:true,winner:lbl(oldest)},
    {id:'newest',icon:'✨',title:'Fresh Off the Shelf',desc:'Your newest set',g:10,unlocked:true,winner:lbl(newest)},
    {id:'big',icon:'🏗️',title:'Mega Builder',desc:'Your biggest build',g:25,unlocked:true,winner:`${lbl(big)}: ${big.parts.toLocaleString()} pcs`},
    {id:'small',icon:'🚀',title:'Pocket Rocket',desc:'Your smallest set',g:10,unlocked:true,winner:`${lbl(small)}: ${small.parts} pcs`},
    {id:'fan',icon:'🏆',title:'Theme Fanatic',desc:'Most sets in one theme',g:25,unlocked:topTheme[1]>=5,progress:Math.min(topTheme[1],5),goal:5,winner:`${topTheme[0]}: ${topTheme[1]} sets`},
    {id:'90s',icon:'📼',title:'Old School',desc:'Own a set from 1999 or earlier',g:25,unlocked:oldest.year<=1999,progress:oldest.year<=1999?1:0,goal:1,winner:oldest.year<=1999?(()=>{const n=list.filter(x=>x.year<=1999).length;return n+' set'+(n>1?'s':'')+' from the 90s or earlier';})():null},
    {id:'vintage',icon:'🕰️',title:'Vintage Vault',desc:'Own a set from before 1980',g:50,unlocked:oldest.year<1980,progress:oldest.year<1980?1:0,goal:1},
    tier('s10','📦','Shelf Starter','Own 10 sets',10,list.length,10),
    tier('s25','📚','Collector','Own 25 sets',25,list.length,25),
    tier('s50','🏛️','Curator','Own 50 sets',50,list.length,50),
    tier('s100','👑','Brick Baron','Own 100 sets',100,list.length,100),
    tier('p1k','🔹','1K Club','1,000 pieces across your sets',10,pieces,1000),
    tier('p10k','🔷','10K Club','10,000 pieces across your sets',25,pieces,10000),
    tier('p25k','💎','25K Club','25,000 pieces across your sets',50,pieces,25000),
    tier('p50k','🌋','Brick Mountain','50,000 pieces across your sets',100,pieces,50000),
    tier('t5','🎨','Theme Hopper','Sets from 5 themes',10,Object.keys(themeCount).length,5),
    tier('t10','🌈','Theme Explorer','Sets from 10 themes',25,Object.keys(themeCount).length,10),
    tier('t20','🗺️','Theme Globetrotter','Sets from 20 themes',50,Object.keys(themeCount).length,20),
    tier('d3','📅','Decade Hopper','Sets from 3 decades',25,decades.size,3),
    tier('d5','🧭','Era Spanner','Sets from 5 decades',50,decades.size,5),
  ];

  // Auto theme achievements: one per theme the user owns (counts sets with 20+ pieces)
  const tc={};list.forEach(x=>{const tid=SETS[x.num][2];tc[tid]=(tc[tid]||0)+1;});
  // Show only your top 5 themes by sets owned (ties go to whichever is closer to complete), plus any theme you've fully completed
  const cand=Object.entries(tc).map(([tid,n])=>[tid,n,Object.values(SETS).filter(v=>v[2]==tid&&v[3]>=20).length]).filter(c=>c[2]>=3)
    .sort((a,b)=>b[1]-a[1]||(b[1]/b[2])-(a[1]/a[2]));
  const shown=cand.filter((c,i)=>i<5||c[1]>=c[2]);
  for(const [tid,n,total] of shown){
    const nm=THEMES[tid]?tName(THEMES[tid][0]):'Theme';
    A.push({id:'th'+tid,icon:'🎖️',title:nm+' Master',desc:`Own every ${nm} set (20+ pcs)`,g:total>=20?100:50,unlocked:n>=total,progress:Math.min(n,total),goal:total,winner:`${n} of ${total} sets`});
  }
  return {list,ach:A,pieces,themeCount};
}
// ---- FigScore (FS), bulk milestones, LEGO palette (added by Money) ----
const LEGO={black:'#05131D',dbg:'#6C6E68',dkgray:'#6B5A5A',light:'#F2F3F2',lime:'#A5CA18',red:'#C91A09',yellow:'#F2CD37',blue:'#0055BF',green:'#237841',orange:'#FE8A18',azure:'#36AEBF',gold:'#AA7F2E',silver:'#898788',dkorange:'#A95500',rbrown:'#582A12'};
// Medal by tier: 10 = bronze (Dark Orange), 25 = Flat Silver, 50 = Pearl Gold, 100 = Bright Red (legendary), no-points milestones = Medium Azure
function medal(a){if(!a.g)return {bg:LEGO.azure,fg:LEGO.black,name:'milestone'};if(a.g>=100)return {bg:LEGO.red,fg:LEGO.light,name:'legendary'};
  if(a.g>=50)return {bg:LEGO.gold,fg:LEGO.black,name:'gold'};if(a.g>=25)return {bg:LEGO.silver,fg:LEGO.black,name:'silver'};return {bg:LEGO.dkorange,fg:LEGO.light,name:'bronze'};}
let extras=null; // minifigs, minifig parts and loose parts from the last import (sets stay in `owned`)
function computeFigs(ex){
  ex=ex||{};const figs=ex.figs||{};const ids=Object.keys(figs);
  const total=ids.reduce((a,k)=>a+figs[k].qty,0),uniq=ids.length,fp=ex.figParts||0,loose=ex.looseParts||0,partsOwned=fp+loose;
  const th={};ids.forEach(k=>{const t=figs[k].theme||'Other';th[t]=(th[t]||0)+figs[k].qty;});
  const nth=Object.keys(th).length,top=Object.entries(th).sort((a,b)=>b[1]-a[1])[0];
  const cmf=ids.filter(k=>/^col/i.test(k)||/collectible/i.test(figs[k].theme||'')).reduce((a,k)=>a+figs[k].qty,0);
  const lbl=k=>`${k} ${figs[k].name||''}`.trim();
  const F=[];
  if(total||fp){
    F.push({id:'f1',icon:'🙂',title:'First Fig',desc:'Own your first minifig',g:10,unlocked:total>=1,progress:Math.min(total,1),goal:1,winner:total?lbl(ids[0]):null});
    F.push(tier('f10','👥','Squad Goals','Own 10 minifigs',10,total,10),tier('f50','🎭','Fig Collector','Own 50 minifigs',25,total,50),
      tier('f100','🦸','Minifig Legion','Own 100 minifigs',50,total,100),tier('f250','🏟️','Minifig Army','Own 250 minifigs',100,total,250));
    F.push(tier('ft5','🌍','Crossover','Minifigs from 5 themes',25,nth,5),tier('ft10','🌌','Multiverse','Minifigs from 10 themes',50,nth,10));
    F.push({id:'ffav',icon:'⭐',title:'Fan Favorite',desc:'10+ minifigs from one theme',g:25,unlocked:!!top&&top[1]>=10,progress:top?Math.min(top[1],10):0,goal:10,winner:top?`${top[0]}: ${top[1]} figs`:null});
    F.push(tier('fcmf','🎁','Blind Bag Hunter','Own 5 Collectible Minifigures',25,cmf,5));
    F.push(tier('fp25','🎩','Spare Heads','25 minifig parts',10,fp,25),tier('fp100','🧢','Costume Box','100 minifig parts',25,fp,100),
      tier('fp500','👒','Wardrobe Department','500 minifig parts',50,fp,500),tier('fp1k','🧙','Fig Forge','1,000 minifig parts',100,fp,1000));
  }
  F.forEach(a=>a.sys='FS');
  const B=partsOwned?[tier('b1k','🪣','Bucket of Bricks','Own 1,000 parts',0,partsOwned,1000),tier('b5k','🧺','Bulk Bin','Own 5,000 parts',0,partsOwned,5000),tier('b20k','⛰️','Brick Pit','Own 20,000 parts',0,partsOwned,20000)]:[];
  B.forEach(b=>b.nopoints=true);
  return {fach:F,bulk:B,figTotal:total,figUnique:uniq,figThemes:nth,figParts:fp,looseParts:loose,partsOwned};
}
function scores(owned,ex){
  const c=compute(owned),f=computeFigs(ex);
  const sum=(a,u)=>a.filter(x=>!u||x.unlocked).reduce((s,x)=>s+x.g,0);
  const ss=sum(c.ach,1),ssMax=sum(c.ach),fs=sum(f.fach,1),fsMax=sum(f.fach);
  return {...c,...f,ss,ssMax,fs,fsMax,lead:fs>ss?'FS':'SS'};
}
function render(owned){
  const S=scores(owned,extras);const {list,ach,pieces,themeCount,fach,bulk}=S;
  const el=document.getElementById('board');
  if(!list.length&&!S.figTotal&&!S.partsOwned){el.innerHTML=(extras&&extras.msg)||'<p class="muted">No recognized sets yet. Upload a Rebrickable set list CSV, a BrickLink inventory (CSV or XML), or paste set numbers.</p>';return;}
  const tile=a=>{const m=medal(a),u=a.sys||'SS';return `<div class="tile ${a.unlocked?'':'locked'}" style="border-left-color:${a.unlocked?m.bg:LEGO.dkgray}"><div class="icon medal" style="border-color:${m.bg}">${a.icon}</div><div class="body"><div class="row"><b>${a.title}</b><span class="pill" style="background:${m.bg};color:${m.fg}">${a.nopoints?'no points':a.g+' '+u}</span></div><div class="muted">${a.desc}</div>${a.winner?`<div class="win">${esc(a.winner)}</div>`:''}${!a.unlocked&&a.goal?`<div class="bar"><div style="width:${100*a.progress/a.goal}%"></div></div><div class="muted small">${a.progress.toLocaleString()} / ${a.goal.toLocaleString()}</div>`:''}</div></div>`;};
  const block=(sys)=>{const isS=sys==='SS',sc=isS?S.ss:S.fs,mx=isS?S.ssMax:S.fsMax,A=isS?ach:fach,lead=S.lead===sys;
    return `<div class="score ${lead?'lead':'sub'} ${isS?'ss':'fs'}"><div class="lbl">${isS?'StudScore':'FigScore'}</div><div class="big">${sc.toLocaleString()} ${sys}</div><div class="muted">of ${mx.toLocaleString()} ${sys} · ${A.filter(a=>a.unlocked).length}/${A.length} unlocked</div><div class="bar main"><div style="width:${mx?100*sc/mx:0}%"></div></div></div>`;};
  const order=S.lead==='FS'?['FS','SS']:['SS','FS'];
  const stats=`<div class="stats"><div><b>${list.length}</b> sets</div><div><b>${(pieces||0).toLocaleString()}</b> set pieces</div><div><b>${themeCount?Object.keys(themeCount).length:0}</b> themes</div><div><b>${S.figTotal.toLocaleString()}</b> minifigs</div><div><b>${S.figParts.toLocaleString()}</b> fig parts</div><div><b>${S.partsOwned.toLocaleString()}</b> parts owned</div></div>`;
  const sect=(sys)=>{const A=sys==='SS'?ach:fach,nm=sys==='SS'?'StudScore':'FigScore';
    if(!A.length)return sys==='SS'?'<h3>StudScore</h3><p class="muted">No sets in this upload yet, so no StudScore achievements.</p>':'<h3>FigScore</h3><p class="muted">No minifigs in this upload yet. Upload a BrickLink inventory with minifigs to start your FigScore.</p>';
    return `<h3>${nm} · Unlocked</h3><div class="grid">${A.filter(a=>a.unlocked).map(tile).join('')||'<p class="muted">None yet.</p>'}</div><h3>${nm} · Locked</h3><div class="grid">${A.filter(a=>!a.unlocked).map(tile).join('')||'<p class="muted">All unlocked!</p>'}</div>`;};
  const note=extras&&extras.note?`<p class="muted small">${extras.note}</p>`:'';
  el.innerHTML=`${note}<div class="banner"><div class="scores">${block(order[0])}${block(order[1])}</div>${stats}</div>${sect(order[0])}${sect(order[1])}${bulk.length?`<h3>Bulk milestones <span class="pill" style="background:${LEGO.azure};color:${LEGO.black}">no points</span></h3><p class="muted small">Loose parts don't add to your score, but they count here. You own ${S.partsOwned.toLocaleString()} parts (${S.looseParts.toLocaleString()} loose + ${S.figParts.toLocaleString()} minifig parts).</p><div class="grid">${bulk.map(tile).join('')}</div>`:''}<div id="mysets"></div><div id="myfigs"></div>`;
  if(list.length)renderSets(list);
  renderFigs();
}
let figShowAll=false;
function renderFigs(){
  const el=document.getElementById('myfigs');if(!el)return;const figs=(extras&&extras.figs)||{};
  const rows=Object.entries(figs).map(([id,f])=>({id,...f})).sort((a,b)=>String(a.theme).localeCompare(b.theme)||a.id.localeCompare(b.id,undefined,{numeric:true}));
  if(!rows.length){el.innerHTML='';return;}
  const LIMIT=30,shown=figShowAll?rows:rows.slice(0,LIMIT);let html='',last=null;
  for(const f of shown){if(f.theme!==last){html+=`<div class="setgroup">${esc(f.theme)}</div>`;last=f.theme;}
    html+=`<div class="setcard figcard"><img class="setimg" loading="lazy" alt="${esc(f.id)}" src="https://img.bricklink.com/ItemImage/MN/0/${encodeURIComponent(f.id)}.png" onerror="this.outerHTML='<div class=&quot;setph&quot;>🙂</div>'"><div class="setinfo"><b>${esc(f.name||f.id)}</b>${esc(f.id)}${f.qty>1?' · ×'+f.qty:''}</div></div>`;}
  el.innerHTML=`<h3>My Minifigs (${rows.length})</h3><div class="sets">${html}</div>${rows.length>LIMIT?`<button id="figmore">${figShowAll?'Show fewer':'Show all '+rows.length+' minifigs'}</button>`:''}`;
  const m=document.getElementById('figmore');if(m)m.onclick=()=>{figShowAll=!figShowAll;renderFigs();};
}
function loadCollection(text){
  const C=parseCollection(text);
  const skip=[];if(C.skipped.instructions)skip.push(C.skipped.instructions+' instructions');if(C.skipped.gear)skip.push(C.skipped.gear+' gear');if(C.skipped.zero)skip.push(C.skipped.zero+' zero-quantity rows');if(C.skipped.unknownSets.length)skip.push(C.skipped.unknownSets.length+' unknown set numbers');
  extras={figs:C.figs,figParts:C.figParts,looseParts:C.looseParts,format:C.format,
    note:C.format!=='Set list'&&!C.empty?`Read as ${esc(C.format)}: ${C.setCount} sets, ${C.figCount} minifigs, ${C.figParts.toLocaleString()} minifig parts, ${C.looseParts.toLocaleString()} loose parts${skip.length?' (skipped '+skip.join(', ')+')':''}.`:'',
    msg:C.empty?`<div class="banner"><div><b>We couldn't find anything to score in that file.</b><p class="muted">${C.rows?`We read ${C.rows.toLocaleString()} rows${skip.length?' but only found '+skip.join(', '):''}, with no sets, minifigs, or parts we recognize.`:'It looks empty.'} Try a Rebrickable or Brickset set list, a BrickLink store inventory or wanted list (CSV or XML), or paste set numbers like 75192, 10497-1.</p></div></div>`:''};
  try{localStorage.setItem('brickExtras',JSON.stringify({figs:C.figs,figParts:C.figParts,looseParts:C.looseParts,format:C.format,note:extras.note}));}catch(e){}
  owned=C.sets;render(owned);
}

// ---- My Sets ----
(function(){const st=document.createElement('style');st.textContent=`
.setctl{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
.setctl select{background:#6B5A5A;color:#F2F3F2;border:1px solid #6C6E68;border-radius:6px;padding:6px}
.sets{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
.setcard{display:block;cursor:pointer;background:#6C6E68;border-radius:8px;overflow:hidden;color:#F2F3F2;text-decoration:none}
.setcard:hover{outline:2px solid #A5CA18}
.setimg{width:100%;aspect-ratio:4/3;object-fit:contain;background:#fff;display:block}
.setph{width:100%;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;background:#6B5A5A;font-size:36px}
.setinfo{padding:8px;font-size:13px}.setinfo b{display:block;font-size:14px;line-height:1.2;margin-bottom:3px}
.setgroup{grid-column:1/-1;color:#A5CA18;font-weight:700;margin-top:6px}`;document.head.appendChild(st);})();
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let setSort='theme', setShowAll=false;
function setTheme(k){const t=THEMES[SETS[k][2]];return t?tName(t[0]):'Unknown';}
function renderSets(list){
  const el=document.getElementById('mysets');if(!el)return;
  const rows=list.map(s=>({...s,sub:setTheme(s.num)}));
  const cmp={theme:(a,b)=>a.sub.localeCompare(b.sub)||a.year-b.year||a.num.localeCompare(b.num,undefined,{numeric:true}),
    year_old:(a,b)=>a.year-b.year||a.sub.localeCompare(b.sub),year_new:(a,b)=>b.year-a.year||a.sub.localeCompare(b.sub),
    pieces:(a,b)=>b.parts-a.parts};
  rows.sort(cmp[setSort]);
  const LIMIT=30, shown=setShowAll?rows:rows.slice(0,LIMIT);
  let html='',last=null;
  for(const s of shown){
    if(setSort==='theme'&&s.sub!==last){html+=`<div class="setgroup">${esc(s.sub)}</div>`;last=s.sub;}
    const n=encodeURIComponent(s.num);
    html+=`<div class="setcard" role="button" tabindex="0" data-num="${esc(s.num)}"><img class="setimg" loading="lazy" alt="${esc(s.name)}" src="https://cdn.rebrickable.com/media/sets/${n}.jpg" onerror="this.outerHTML='<div class=&quot;setph&quot;>🧱</div>'"><div class="setinfo"><b>${esc(s.name)}</b>${esc(s.num.replace(/-1$/,''))} · ${s.year}<br><span class="muted">${esc(s.sub)} · ${s.parts.toLocaleString()} pcs${s.qty>1?' · ×'+s.qty:''}</span></div></div>`;
  }
  el.innerHTML=`<h3>My Sets (${rows.length})</h3><div class="setctl"><label class="muted small">Sort by</label><select id="setsort">
<option value="theme">Theme</option><option value="year_old">Year (oldest first)</option><option value="year_new">Year (newest first)</option><option value="pieces">Piece count</option></select></div>
<div class="sets">${html}</div>${rows.length>LIMIT?`<button id="setmore">${setShowAll?'Show fewer':'Show all '+rows.length+' sets'}</button>`:''}`;
  const sel=document.getElementById('setsort');sel.value=setSort;sel.onchange=()=>{setSort=sel.value;renderSets(list);};
  el.querySelectorAll('.setcard').forEach(c=>{c.onclick=()=>openSet(c.dataset.num);c.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openSet(c.dataset.num);}};});
  const m=document.getElementById('setmore');if(m)m.onclick=()=>{setShowAll=!setShowAll;renderSets(list);};
}

// ---- Set detail popup ----
(function(){const st=document.createElement('style');st.textContent=`
.modalbg{position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:50;padding:12px}
.modal{background:#6C6E68;color:#F2F3F2;border-radius:12px;max-width:560px;width:100%;max-height:90vh;overflow:auto;position:relative}
.modal .mimg{width:100%;max-height:300px;object-fit:contain;background:#fff;display:block}
.modal .mbody{padding:16px}.modal h2{margin:0 0 4px;font-size:20px}
.modal .meta{display:flex;flex-wrap:wrap;gap:6px 14px;color:#E4E5E2;font-size:13px;margin-bottom:10px}
.modal h4{margin:14px 0 4px;color:#F2CD37}.modal p{margin:4px 0;line-height:1.45}
.modal .chips{display:flex;flex-wrap:wrap;gap:6px}.modal .chip{background:#05131D;border-radius:12px;padding:3px 10px;font-size:13px}
.modal .mclose{position:absolute;top:8px;right:8px;background:rgba(0,0,0,.6);border-radius:50%;width:34px;height:34px;padding:0;margin:0;font-size:18px}
.modal a.btn{display:inline-block;background:#A5CA18;color:#111;font-weight:700;text-decoration:none;padding:8px 14px;border-radius:6px;margin-top:14px}`;document.head.appendChild(st);})();
function findLore(themeId){
  if(typeof LORE==='undefined'||!LORE||!LORE.themes)return null;
  let id=themeId,n=0;
  while(id!=null&&n<10){const l=LORE.themes[id]||LORE.themes[String(id)];if(l)return l;const t=THEMES[id];id=t?t[1]:null;n++;}
  return null;
}
function closeSet(){const m=document.getElementById('setmodal');if(m)m.remove();document.removeEventListener('keydown',escClose);}
function escClose(e){if(e.key==='Escape')closeSet();}
function openSet(num){
  const d=SETS[num];if(!d)return;closeSet();
  const [name,year,tid,parts]=d, n=encodeURIComponent(num);
  const lore=findLore(tid);
  const note=(typeof LORE!=='undefined'&&LORE&&LORE.sets)?LORE.sets[num]:null;
  const qty=(typeof owned!=='undefined'&&owned[num])||0;
  let loreHtml='';
  if(lore){
    loreHtml+=`<h4>${esc(lore.title||setTheme(num))}${lore.era?` <span class="muted small">· ${esc(lore.era)}</span>`:''}</h4>`;
    if(lore.story)loreHtml+=`<p>${esc(lore.story)}</p>`;
    if(Array.isArray(lore.factions)&&lore.factions.length)loreHtml+=`<h4>Heroes &amp; villains</h4><div class="chips">${lore.factions.map(f=>`<span class="chip">${esc(typeof f==='string'?f:(f.name||''))}</span>`).join('')}</div>`;
  }
  if(note)loreHtml+=`<h4>How it fits the story</h4><p>${esc(note)}</p>`;
  const bg=document.createElement('div');bg.className='modalbg';bg.id='setmodal';
  bg.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(name)}"><button class="mclose" aria-label="Close">✕</button>
<img class="mimg" alt="${esc(name)}" src="https://cdn.rebrickable.com/media/sets/${n}.jpg" onerror="this.outerHTML='<div class=&quot;setph&quot;>🧱</div>'">
<div class="mbody"><h2>${esc(name)}</h2><div class="meta"><span>#${esc(num.replace(/-1$/,''))}</span><span>${year}</span><span>${parts.toLocaleString()} pcs</span><span>${esc(setTheme(num))}</span>${qty>1?`<span>You own ×${qty}</span>`:''}</div>
${loreHtml}<h4>Value</h4><p class="muted">Coming soon</p>
<a class="btn" href="https://rebrickable.com/sets/${n}/" target="_blank" rel="noopener">View on Rebrickable</a></div></div>`;
  bg.onclick=e=>{if(e.target===bg)closeSet();};
  document.body.appendChild(bg);bg.querySelector('.mclose').onclick=closeSet;
  document.addEventListener('keydown',escClose);
}
let owned={};
document.getElementById('file').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(loadCollection);};
document.getElementById('go').onclick=()=>loadCollection(document.getElementById('paste').value);
const SAMPLE="set_num,quantity\n497-1,1\n6080-1,1\n6285-1,1\n6990-1,1\n6399-1,1\n8880-1,1\n7140-1,1\n10030-1,1\n8448-1,1\n10179-1,1\n7094-1,1\n8043-1,1\n10188-1,1\n21103-1,1\n10220-1,1\n70810-1,1\n10256-1,1\n21309-1,1\n75192-1,1\n10264-1,1\n71043-1,1\n10283-1,1\n76240-1,1\n21318-1,1\n42115-1,1\n10294-1,1\n76419-1,1\n10316-1,1\n21333-1,1\n75313-1,1\n";
document.getElementById('demo').onclick=()=>{extras=null;try{localStorage.removeItem('brickExtras');}catch(e){}owned=parseList(SAMPLE);render(owned);};
try{const e=JSON.parse(localStorage.getItem('brickExtras')||'null');if(e)extras=e;}catch(e){}
render(owned);
