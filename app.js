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
function figName(id){return (typeof FIGNAMES!=='undefined'&&FIGNAMES[id])||id;}
function figImg(id){return /^fig-/i.test(id)?`https://cdn.rebrickable.com/media/sets/${encodeURIComponent(id)}.jpg`:`https://img.bricklink.com/ItemImage/MN/0/${encodeURIComponent(id)}.png`;}
// Minifigs packed in owned sets (qty of the set applied). Theme is the set's root theme so UCS figs count as Star Wars, CMF as Collectible Minifigures.
function figsFromSets(owned){
  const out={};if(typeof SETFIGS==='undefined'||!owned)return out;
  for(const sn in owned){const list=SETFIGS[sn];if(!list||!SETS[sn])continue;const q=owned[sn],theme=rootTheme(SETS[sn][2]);
    for(const [id,fq] of list){const f=out[id]||(out[id]={qty:0,name:figName(id),theme,from:[]});f.qty+=fq*q;if(!f.from.includes(sn))f.from.push(sn);}}
  return out;
}
// Loose/imported complete figs plus in-set figs. extras.figs stays import-only so collection.js keeps working.
function allFigs(owned,ex){
  const all={},loose=(ex&&ex.figs)||{},inset=figsFromSets(owned);
  for(const id in loose){const f=loose[id];all[id]={name:f.name||figName(id),theme:f.theme||'Other',qty:f.qty,loose:f.qty,from:[]};}
  for(const id in inset){const s=inset[id];if(all[id]){all[id].qty+=s.qty;all[id].from=s.from;}else all[id]={name:s.name,theme:s.theme,qty:s.qty,loose:0,from:s.from};}
  return all;
}
function computeFigs(ex,owned){
  ex=ex||{};const figs=allFigs(owned,ex);const ids=Object.keys(figs);
  const total=ids.reduce((a,k)=>a+figs[k].qty,0),uniq=ids.length,fp=ex.figParts||0,loose=ex.looseParts||0,partsOwned=fp+loose;
  const figLoose=ids.reduce((a,k)=>a+(figs[k].loose||0),0),figInSets=total-figLoose;
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
  return {fach:F,bulk:B,figTotal:total,figUnique:uniq,figThemes:nth,figParts:fp,looseParts:loose,partsOwned,figLoose,figInSets,figs};
}
function scores(owned,ex){
  const c=compute(owned),f=computeFigs(ex,owned);
  const sum=(a,u)=>a.filter(x=>!u||x.unlocked).reduce((s,x)=>s+x.g,0);
  const ss=sum(c.ach,1),ssMax=sum(c.ach),fs=sum(f.fach,1),fsMax=sum(f.fach);
  return {...c,...f,ss,ssMax,fs,fsMax,lead:fs>ss?'FS':'SS'};
}
function badgeFallback(el){const p=el.parentNode;if(p&&p.dataset.fallback)p.textContent=p.dataset.fallback;}
// Map Rebrickable theme ids (and close aliases from Cole's themes.csv) to icon slugs. Walk THEMES parents, else generic.
const THEME_ICONS={1:'technic',52:'city',126:'space',130:'space',147:'pirates',158:'star_wars',186:'castle',246:'harry_potter',307:'aqua_raiders',310:'aqua_raiders',324:'bionicle',389:'exo_force',435:'ninjago',442:'rock_raiders',494:'friends',535:'cmf',576:'ideas',577:'minecraft',602:'jurassic_world',673:'creator_expert',695:'super_heroes',696:'super_heroes',721:'creator_expert',776:'pokemon'};
function themeIconSlug(tid){let id=String(tid),n=0;while(id&&id!=='null'&&n<12){if(THEME_ICONS[id])return THEME_ICONS[id];const t=typeof THEMES!=='undefined'?THEMES[id]:null;id=t&&t[1]!=null?String(t[1]):'';n++;}return 'generic';}
function badgeHTML(a){
  const fb=esc(a.icon);
  if(/^th\d+$/.test(a.id)){
    const slug=themeIconSlug(a.id.slice(2));
    return `<div class="icon medal theme-badge" data-fallback="${fb}"><img class="tb-icon" src="badges/themes/${slug}.webp" alt="" loading="lazy" onerror="this.onerror=null;this.src='badges/themes/generic.webp'"><img class="tb-frame" src="badges/theme_frame.webp" alt="${esc(a.title)}" loading="lazy" onerror="badgeFallback(this)"></div>`;
  }
  return `<div class="icon medal" data-fallback="${fb}"><img src="badges/${a.id}.webp" alt="${esc(a.title)}" loading="lazy" onerror="badgeFallback(this)"></div>`;
}
// ---- Collapsible badge sections (open state kept across re-renders) ----
const BSEC_OPEN={};
function bsec(k,title,n,def,inner,extra){const open=k in BSEC_OPEN?BSEC_OPEN[k]:def;
  return `<details class="bsec" data-k="${k}"${open?' open':''}><summary><span>${title} <span class="muted">(${n})</span></span>${extra||''}</summary>${inner}</details>`;}
let hasData=null;
function setDataState(on){document.body.classList.toggle('nodata',!on);const ib=document.getElementById('importbox');
  if(ib&&on!==hasData){ib.open=!on;}hasData=on;}
function render(owned){
  const S=scores(owned,extras);const {list,ach,pieces,themeCount,fach,bulk}=S;
  const el=document.getElementById('scoreboard')||document.getElementById('board');
  if(!list.length&&!S.figTotal&&!S.partsOwned){setDataState(false);el.innerHTML=(extras&&extras.msg)||'<p class="muted">No recognized sets yet. Upload a Rebrickable set list CSV, a BrickLink inventory (CSV or XML), or paste set numbers.</p>';['mysets','myfigs','themeprog'].forEach(i=>{const x=document.getElementById(i);if(x)x.innerHTML='';});return;}
  setDataState(true);
  const tile=a=>{const m=medal(a),u=a.sys||'SS';return `<div class="tile ${a.unlocked?'':'locked'}" style="border-left-color:${a.unlocked?m.bg:LEGO.dkgray}">${badgeHTML(a)}<div class="body"><div class="row"><b>${a.title}</b><span class="pill" style="background:${m.bg};color:${m.fg}">${a.nopoints?'no points':a.g+' '+u}</span></div><div class="muted">${a.desc}</div>${a.winner?`<div class="win">${esc(a.winner)}</div>`:''}${!a.unlocked&&a.goal?`<div class="bar"><div style="width:${100*a.progress/a.goal}%"></div></div><div class="muted small">${a.progress.toLocaleString()} / ${a.goal.toLocaleString()}</div>`:''}</div></div>`;};
  const block=(sys)=>{const isS=sys==='SS',sc=isS?S.ss:S.fs,mx=isS?S.ssMax:S.fsMax,A=isS?ach:fach,lead=S.lead===sys;
    return `<div class="score ${lead?'lead':'sub'} ${isS?'ss':'fs'}"><div class="lbl">${isS?'StudScore':'FigScore'}</div><div class="big">${sc.toLocaleString()} ${sys}</div><div class="muted">of ${mx.toLocaleString()} ${sys} · ${A.filter(a=>a.unlocked).length}/${A.length} unlocked</div><div class="bar main"><div style="width:${mx?100*sc/mx:0}%"></div></div></div>`;};
  const order=S.lead==='FS'?['FS','SS']:['SS','FS'];
  const figStat=S.figInSets?`<div><b>${S.figTotal.toLocaleString()}</b> minifigs (${S.figLoose?S.figLoose.toLocaleString()+' loose + ':''}${S.figInSets.toLocaleString()} in sets)</div>`:`<div><b>${S.figTotal.toLocaleString()}</b> minifigs</div>`;
  const stats=`<div class="stats"><div><b>${list.length}</b> sets</div><div><b>${(pieces||0).toLocaleString()}</b> set pieces</div><div><b>${themeCount?Object.keys(themeCount).length:0}</b> themes</div>${figStat}<div><b>${S.figParts.toLocaleString()}</b> fig parts</div><div><b>${S.partsOwned.toLocaleString()}</b> parts owned</div></div>`;
  const sect=(sys)=>{const A=sys==='SS'?ach:fach,nm=sys==='SS'?'StudScore':'FigScore';
    if(!A.length)return sys==='SS'?'<h3>StudScore</h3><p class="muted">No sets in this upload yet, so no StudScore achievements.</p>':'<h3>FigScore</h3><p class="muted">No minifigs in this upload yet. Sets that include minifigs, or a BrickLink inventory of loose minifigs, will start your FigScore.</p>';
    const U=A.filter(a=>a.unlocked),L=A.filter(a=>!a.unlocked);
    return bsec(sys+'u',`${nm} · Unlocked`,U.length,true,`<div class="grid">${U.map(tile).join('')||'<p class="muted">None yet.</p>'}</div>`)+bsec(sys+'l',`${nm} · Locked`,L.length,false,`<div class="grid">${L.map(tile).join('')||'<p class="muted">All unlocked!</p>'}</div>`);};
  const note=extras&&extras.note?`<p class="muted small">${extras.note}</p>`:'';
  el.innerHTML=`${note}<div class="banner"><div class="scores">${block(order[0])}${block(order[1])}</div>${stats}</div>${sect(order[0])}${sect(order[1])}${bulk.length?bsec('bulk',`Bulk milestones`,bulk.length,false,`<p class="muted small">Loose parts don't add to your score, but they count here. Only loose minifig parts count as fig parts — the pieces already in complete minifigs, whether those figs came from a set or were imported whole, are not added again. You own ${S.partsOwned.toLocaleString()} parts (${S.looseParts.toLocaleString()} loose + ${S.figParts.toLocaleString()} minifig parts).</p><div class="grid">${bulk.map(tile).join('')}</div>`,`<span class="pill" style="background:${LEGO.azure};color:${LEGO.black}">no points</span>`):''}`;
  el.querySelectorAll('details.bsec').forEach(d=>d.addEventListener('toggle',()=>{BSEC_OPEN[d.dataset.k]=d.open;}));
  if(list.length)renderSets(list);
  renderFigs();
}
let figShowAll=false;
function figFromTxt(f){
  if(!f.from||!f.from.length)return '';
  const nums=f.from.map(n=>n.replace(/-1$/,''));
  const shown=nums.slice(0,3),more=nums.length-shown.length;
  const sets=(nums.length===1?'from set ':'from sets ')+shown.join(', ')+(more?' and '+more+' more':'');
  const setq=f.qty-(f.loose||0);
  if(f.loose&&setq)return ` · ${f.loose} loose + ${setq} ${sets}`;
  return ' · '+sets;
}
// Parts, year and first set for a fig (Rebrickable figs only; BrickLink ids have no match yet).
function figMetaTxt(id){if(typeof FIGMETA==='undefined'||!FIGMETA[id])return '';const [p,y,sn]=FIGMETA[id];const bits=[];
  if(p)bits.push(p+(p===1?' piece':' pieces'));if(y&&sn){const nm=(typeof FIRSTSETNAMES!=='undefined'&&FIRSTSETNAMES[sn])||'';bits.push(`first in ${y}, ${sn.replace(/-1$/,'')}${nm?' '+nm:''}`);}
  return bits.length?`<div class="muted figmeta">${esc(bits.join(' · '))}</div>`:'';}
function renderFigs(){
  const el=document.getElementById('myfigs');if(!el)return;const figs=allFigs(owned,extras);
  const rows=Object.entries(figs).map(([id,f])=>({id,...f})).sort((a,b)=>String(a.theme).localeCompare(b.theme)||a.id.localeCompare(b.id,undefined,{numeric:true}));
  if(!rows.length){el.innerHTML='';return;}
  const LIMIT=30,shown=figShowAll?rows:rows.slice(0,LIMIT);let html='',last=null;
  for(const f of shown){if(f.theme!==last){html+=`<div class="setgroup">${esc(f.theme)}</div>`;last=f.theme;}
    html+=`<div class="setcard figcard"><div class="imgtile"><img class="setimg" loading="lazy" alt="${esc(f.id)}" src="${figImg(f.id)}" onerror="this.outerHTML='<div class=&quot;setph&quot;>🙂</div>'"></div><div class="setinfo"><b>${esc(f.name||f.id)}</b>${esc(f.id)}${f.qty>1?' · ×'+f.qty:''}${esc(figFromTxt(f))}${figMetaTxt(f.id)}</div></div>`;}
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
    const n=encodeURIComponent(s.num),bn=themeBanner(s.num);
    html+=`<div class="setcard" role="button" tabindex="0" data-num="${esc(s.num)}"><div class="imgtile"><img class="setimg" loading="lazy" alt="${esc(s.name)}" src="https://cdn.rebrickable.com/media/sets/${n}.jpg" onerror="this.outerHTML='<div class=&quot;setph&quot;>🧱</div>'"></div><div class="setinfo ${bn.cls}" data-wm="${esc(bn.wm)}"${bn.style}><b>${esc(s.name)}</b>${esc(s.num.replace(/-1$/,''))} · ${s.year}<br><span class="muted">${esc(s.sub)} · ${s.parts.toLocaleString()} pcs${s.qty>1?' · ×'+s.qty:''}</span></div></div>`;
  }
  el.innerHTML=`<h3>My Sets (${rows.length})</h3><div class="setctl"><label class="muted small">Sort by</label><select id="setsort">
<option value="theme">Theme</option><option value="year_old">Year (oldest first)</option><option value="year_new">Year (newest first)</option><option value="pieces">Piece count</option></select></div>
<div class="sets">${html}</div>${rows.length>LIMIT?`<button id="setmore">${setShowAll?'Show fewer':'Show all '+rows.length+' sets'}</button>`:''}`;
  const sel=document.getElementById('setsort');sel.value=setSort;sel.onchange=()=>{setSort=sel.value;renderSets(list);};
  el.querySelectorAll('.setcard').forEach(c=>{c.onclick=()=>openSet(c.dataset.num);c.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openSet(c.dataset.num);}};});
  const m=document.getElementById('setmore');if(m)m.onclick=()=>{setShowAll=!setShowAll;renderSets(list);};
}

// ---- Theme banners (original CSS/SVG art in index.html, no official logos). Walks the theme chain, most specific first. ----
const BANNER_RULES=[['marsmission',/mars mission/i],['classicspace',/^classic space$/i],['rockraiders',/rock raiders/i],['aquaraiders',/aqua ?raiders/i],
 ['starwars',/star wars/i],['ninjago',/ninjago/i],['hp',/harry potter|wizarding world|fantastic beasts/i],['pokemon',/pok[eé]mon/i],
 ['marvel',/marvel|spider-man|avengers/i],['dc',/\bdc\b|batman|super heroes dc/i],['minecraft',/minecraft/i],['jurassic',/jurassic|dino/i],
 ['movie',/lego movie/i],['ideas',/ideas|cuusoo/i],['modular',/modular/i],['icons',/^icons$|creator expert|advanced models/i],
 ['friends',/friends/i],['technic',/technic/i],['castle',/castle|kingdoms|knights|nexo/i],['pirates',/pirates/i],
 ['town',/^town$|classic town|^city$|city/i],['space',/space|blacktron|futuron|m-tron|ice planet|insectoids|unitron|spyrius|galaxy|exploriens|ufo/i]];
const BANNER_SHORT={classicspace:'Space',starwars:'Star Wars',hp:'Magic',rockraiders:'Rock Raiders',aquaraiders:'Aqua Raiders',marsmission:'Mars',
 ideas:'Ideas',icons:'Icons',technic:'Technic',town:'Town',castle:'Castle',pirates:'Pirates',ninjago:'Ninjago',friends:'Friends',pokemon:'Pokémon',
 marvel:'Marvel',dc:'DC',minecraft:'Minecraft',jurassic:'Jurassic',movie:'Movie',modular:'Modular',space:'Space'};
function themeChain(tid){const out=[];let id=tid,n=0;while(id!=null&&THEMES[id]&&n<10){out.push(String(THEMES[id][0]));id=THEMES[id][1];n++;}return out;}
function themeBanner(num){const d=SETS[num];const chain=d?themeChain(d[2]):[];
  for(const nm of chain)for(const [k,re] of BANNER_RULES)if(re.test(nm))return {cls:'tbanner tb-'+k,wm:BANNER_SHORT[k]||nm,style:''};
  const nm=chain.length?tName(chain[chain.length-1]):'LEGO';let h=0;for(const c of nm)h=(h*31+c.charCodeAt(0))>>>0;
  return {cls:'tbanner tb-gen',wm:nm.length>14?nm.split(/\s+/)[0]:nm,style:` style="--tb-h:${h%360}"`};}
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
${(()=>{const bn=themeBanner(num);return `<div class="tbanner mban ${bn.cls}" data-wm="${esc(bn.wm)}"${bn.style}><div class="mbsub">${esc(setTheme(num))}</div><h2>${esc(name)}</h2></div>`;})()}<div class="mbody"><div class="meta"><span>#${esc(num.replace(/-1$/,''))}</span><span>${year}</span><span>${parts.toLocaleString()} pcs</span><span>${esc(setTheme(num))}</span>${qty>1?`<span>You own ×${qty}</span>`:''}</div>
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

// ---- Tabs: Score / Sets / Figs / Value / Share (added by Money) ----
const TABS=['score','sets','figs','value','share'];
let curTab=null;
function showTab(t,opts){opts=opts||{};if(!TABS.includes(t))t='score';
  const changed=t!==curTab;curTab=t;
  TABS.forEach(x=>{const b=document.getElementById('tabbtn-'+x),p=document.getElementById('tab-'+x),on=x===t;
    if(b){b.setAttribute('aria-selected',on?'true':'false');b.tabIndex=on?0:-1;}if(p)p.hidden=!on;});
  if(opts.focus){const b=document.getElementById('tabbtn-'+t);if(b)b.focus();}
  if(changed&&!opts.keepScroll)window.scrollTo(0,0);
  try{const b=document.getElementById('tabbtn-'+t);if(b&&b.scrollIntoView)b.scrollIntoView({block:'nearest',inline:'nearest'});}catch(e){}
  if(t==='value'&&typeof drawChart==='function'){try{drawChart();}catch(e){}}
  window.dispatchEvent(new CustomEvent('studscore:tab',{detail:{tab:t}}));
}
// Route a hash: a tab name (#sets) or any element id inside a panel (#cx-all) opens that tab
function routeHash(initial){const h=decodeURIComponent((location.hash||'').slice(1));
  if(!h||TABS.includes(h)){showTab(h||'score',{keepScroll:initial});return;}
  const el=document.getElementById(h),p=el&&el.closest('[role=tabpanel]');
  if(p){showTab(p.id.replace(/^tab-/,''),{keepScroll:true});setTimeout(()=>el.scrollIntoView({block:'start'}),0);}else showTab('score',{keepScroll:initial});}
function goTab(t){if(location.hash!=='#'+t)location.hash=t;else showTab(t);}
(function(){const bar=document.getElementById('tabs');if(!bar)return;
  bar.addEventListener('click',e=>{const b=e.target.closest('[role=tab]');if(b)goTab(b.dataset.tab);});
  bar.addEventListener('keydown',e=>{const i=TABS.indexOf(curTab);let n=null;
    if(e.key==='ArrowRight'||e.key==='ArrowDown')n=TABS[(i+1)%TABS.length];else if(e.key==='ArrowLeft'||e.key==='ArrowUp')n=TABS[(i+TABS.length-1)%TABS.length];
    else if(e.key==='Home')n=TABS[0];else if(e.key==='End')n=TABS[TABS.length-1];
    if(n){e.preventDefault();goTab(n);document.getElementById('tabbtn-'+n).focus();}});
  window.addEventListener('hashchange',()=>routeHash(false));
})();
// Put dynamically added sections into their tabs. collection.js adds #cx-a (snapshot, theme progress, value history) before #mysets
// and #cx-b (All my stuff, bulk parts, sources) after #myfigs; share.js adds its button after #demo. Runs after every render.
function placeSections(){try{
  const sets=document.getElementById('tab-sets'),val=document.getElementById('tab-value'),tp=document.getElementById('themeprog');
  const a=document.getElementById('cx-a');if(a&&val&&a.parentNode!==val){a.classList.add('needs-data');val.appendChild(a);}
  const b=document.getElementById('cx-b');if(b&&sets&&b.parentNode!==sets){b.classList.add('needs-data');sets.appendChild(b);}
  if(a&&tp){tp.innerHTML='';const h=[...a.querySelectorAll('h3')].find(x=>x.textContent.trim()==='Theme progress');
    if(h){const wrap=document.createElement('div');wrap.className='cx';let n=h;const mv=[];
      while(n&&(n===h||(n.tagName==='P'&&n.classList.contains('cx-cap'))||(n.tagName==='DETAILS'&&n.classList.contains('cx-th')))){mv.push(n);n=n.nextElementSibling;}
      mv.forEach(x=>wrap.appendChild(x));tp.appendChild(wrap);}}
  const demo=document.getElementById('demo'),sb=document.getElementById('sharebox'),btn=demo&&demo.nextElementSibling;
  if(sb&&btn&&btn.tagName==='BUTTON'&&/share card/i.test(btn.textContent))sb.appendChild(btn);
}catch(e){console.error('placeSections',e);}}
window.addEventListener('DOMContentLoaded',()=>{
  const _r=render;render=function(){const r=_r.apply(this,arguments);placeSections();return r;};
  placeSections();routeHash(true);
});

// ---- Product photos: soft tile behind set/fig pictures so their white backgrounds blend away (CSS in index.html: .imgtile + multiply).
// Popups (app.js set popup and collection.js fig popup) add <img class="mimg"> straight into .modal, so wrap those as they appear.
function tilePhotos(root){(root||document).querySelectorAll('.modal > img.mimg').forEach(im=>{const t=document.createElement('div');t.className='imgtile mtile';im.replaceWith(t);t.appendChild(im);});}
try{new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1&&n.querySelector&&n.querySelector('.modal > img.mimg'))tilePhotos(n);}).observe(document.body,{childList:true});}catch(e){}
