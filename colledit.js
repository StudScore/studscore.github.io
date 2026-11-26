// ---- In-app collection editing (added by Money): add sets and minifigs from inside StudScore,
// change quantity and condition, or remove them, without going back to BrickLink or the file.
// Does not edit collection.js or lore.js. Loads last (after popup.js) so its render/loadCollection wrappers run outermost.
//
// MERGE RULE (two layers):
//   1. Base layer = your last upload (file, paste, or BrickLink inventory). Snapshot: localStorage 'studCollBase'
//      {sets:{num:qty}, figs:{id:{qty,name,theme}}}. A new upload replaces the base layer wholesale.
//   2. App layer = your in-app edits, one record per item: localStorage 'studCollEdits'
//      {v:1, sets:{num:{q,cond,t}}, figs:{id:{q,cond,t,name,theme}}}.
//      q is the absolute quantity you set in the app (0 = removed). Absolute, not +/-, so re-uploading a file that
//      already has your addition never double counts.
//   What you see = base, then every app record on top: app quantity wins for that item, untouched items follow the file.
//   On a re-upload, app records the new file already matches (same quantity, same or no condition) are dropped
//   automatically: the file has caught up. Everything else is kept and marked "Added in app" / "Edited in app".
//   Any item can go back to the file ("Undo app edits"), or all of them at once (Review > Clear all).
//   Figs: the app quantity is your LOOSE copies. Figs that come with a set follow that set.
//   Condition: written into 'studMeta' (collection.js and blsync.js read it for the new/used price basis) as the file's
//   meta plus your app conditions. A pristine copy of the file's meta is kept in 'studMetaFile'.
//   collection.js reads 'studMeta' once at page load, so a changed condition moves its value basis after a reload
//   (see cole-diffs/ for a 1-line live hook). blsync.js reads it on every lookup, so BrickLink uses it right away.
//   Demo mode ignores the app layer (your edits wait for your own collection).
// FIGS: a fig's total = copies that come with your sets (follow the sets) + loose copies (the app's fig quantity).
//   The popup shows "You own N: X from sets (listed), Y loose"; editing only ever changes the loose copies.
// LOOSE FIGS FROM FILES: if the importer found no minifigs, rescueLooseFigs() re-reads the raw file for minifig numbers.
// MISSING PARTS: 'studMissing' per set/fig (count, note, and for sets which included minifigs are missing).
//   Missing minifigs are subtracted in figsFromSets(), so they don't count as owned. Exported as 3 extra CSV columns.
(function(){
const LS={edits:'studCollEdits',base:'studCollBase',meta:'studMeta',metaFile:'studMetaFile'};
const ld=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v;}catch(e){return d;}};
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const rm=k=>{try{localStorage.removeItem(k);}catch(e){}};
const H=s=>(typeof esc==='function'?esc:x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])))(s==null?'':s);
const pad=n=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const isDemo=()=>!!ld('studDemo',false);
const sn=k=>String(k).replace(/-1$/,'');
const SET_CONDS=['Sealed','New','Used, complete','Used, incomplete'];
const SET_COND_HINT={'Sealed':'new, unopened','New':'new, opened or built','Used, complete':'','Used, incomplete':'missing pieces'};
const FIG_CONDS=['New','Used'];
const DEF={set:'Used, complete',fig:'Used'};

// Brick and minifig icons (original SVG, LEGO-style shapes, no logos)
const ICON_BRICK='<svg class="ce-ic" viewBox="0 0 28 22" aria-hidden="true"><rect x="5" y="1" width="7" height="5" rx="1.2" fill="#F2CD37" stroke="#05131D" stroke-width="1.6"/><rect x="16" y="1" width="7" height="5" rx="1.2" fill="#F2CD37" stroke="#05131D" stroke-width="1.6"/><rect x="1.5" y="5.5" width="25" height="15" rx="2" fill="#F2CD37" stroke="#05131D" stroke-width="1.8"/><rect x="3.5" y="7.5" width="21" height="3" rx="1" fill="#FFE68A"/></svg>';
const ICON_FIG='<svg class="ce-ic" viewBox="0 0 24 26" aria-hidden="true"><rect x="9" y="0.8" width="6" height="3" rx="1" fill="#F2CD37" stroke="#05131D" stroke-width="1.4"/><rect x="5.5" y="3.5" width="13" height="10" rx="3.2" fill="#F2CD37" stroke="#05131D" stroke-width="1.6"/><circle cx="9.5" cy="8" r="1.1" fill="#05131D"/><circle cx="14.5" cy="8" r="1.1" fill="#05131D"/><path d="M9 10.6q3 2 6 0" stroke="#05131D" stroke-width="1.2" fill="none"/><path d="M4 25l2-10h12l2 10z" fill="#C91A09" stroke="#05131D" stroke-width="1.6" stroke-linejoin="round"/></svg>';

// ---------- state ----------
let EDITS=norm(ld(LS.edits,null));
function norm(e){e=e&&typeof e==='object'?e:{};return {v:1,sets:e.sets&&typeof e.sets==='object'?e.sets:{},figs:e.figs&&typeof e.figs==='object'?e.figs:{}};}
const saveEdits=()=>sv(LS.edits,EDITS);
let MISS=(()=>{const m=ld('studMissing',null)||{};return {sets:m.sets||{},figs:m.figs||{}};})();
const saveMiss=()=>sv('studMissing',MISS);
const getBase=()=>{const b=ld(LS.base,null);return b&&b.sets&&b.figs?b:null;};
const exFigs=()=>(typeof extras!=='undefined'&&extras&&extras.figs)||{};
function snapBase(){
  const own=(typeof owned!=='undefined'&&owned)||{},figs={},src=exFigs();
  for(const id in src){const f=src[id];if(f&&f.qty>0)figs[id]={qty:f.qty,name:f.name||'',theme:f.theme||''};}
  const b={sets:Object.assign({},own),figs,t:Date.now()};sv(LS.base,b);return b;
}
const topKey=o=>{const e=Object.entries(o||{}).sort((a,b)=>b[1]-a[1])[0];return e?e[0]:null;};
const fileMeta=()=>ld(LS.metaFile,null);
function fileCond(kind,id){const m=fileMeta(),e=m&&(kind==='set'?m.sets:m.figs);return e&&e[id]?topKey(e[id].cond):null;}
function fileQty(kind,id){const b=getBase();if(!b)return 0;return kind==='set'?(+b.sets[id]||0):((b.figs[id]&&+b.figs[id].qty)||0);}
const rec=(kind,id)=>(kind==='set'?EDITS.sets:EDITS.figs)[id]||null;
function curQty(kind,id){if(kind==='set')return (typeof owned!=='undefined'&&owned&&owned[id])||0;const f=exFigs()[id];return (f&&f.qty)||0;}
function curCond(kind,id){const r=rec(kind,id);return (r&&r.cond)||fileCond(kind,id)||null;}
function status(kind,id){const r=rec(kind,id);if(!r)return null;const fq=fileQty(kind,id);
  if(r.q<=0)return fq?'removed':null;if(!fq)return 'added';return 'edited';}

// absorb records the new file already matches
function absorb(){let n=0;for(const kind of ['set','fig']){const M=kind==='set'?EDITS.sets:EDITS.figs;
  for(const id in M){const r=M[id],fq=fileQty(kind,id),fc=fileCond(kind,id);
    if((r.q||0)===fq&&(!r.cond||r.cond===fc||(!fq&&!r.q))){delete M[id];n++;}}}
  if(n)saveEdits();return n;}

// ---------- apply the app layer onto owned / extras (in place) ----------
function apply(){
  if(isDemo())return;
  const b=getBase()||snapBase();
  if(typeof owned==='undefined')return;
  for(const k of Object.keys(owned))delete owned[k];
  for(const k in b.sets)if(b.sets[k]>0&&(typeof SETS==='undefined'||SETS[k]))owned[k]=b.sets[k];
  for(const k in EDITS.sets){if(typeof SETS!=='undefined'&&!SETS[k])continue;const q=EDITS.sets[k].q|0;if(q>0)owned[k]=q;else delete owned[k];}
  const figs={};for(const id in b.figs){const f=b.figs[id];if(f.qty>0)figs[id]={qty:f.qty,name:f.name||'',theme:f.theme||'Other'};}
  let inset={};try{inset=typeof figsFromSets==='function'?figsFromSets(owned):{};}catch(e){}
  for(const id in EDITS.figs){const r=EDITS.figs[id],q=r.q|0;
    if(q>0)figs[id]={qty:q,name:(figs[id]&&figs[id].name)||(inset[id]&&inset[id].name)||r.name||figLabel(id),theme:(figs[id]&&figs[id].theme)||(inset[id]&&inset[id].theme)||r.theme||'Other'};else delete figs[id];}
  if(Object.keys(figs).length||Object.keys(EDITS.figs).length||(typeof extras!=='undefined'&&extras)){
    if(typeof extras==='undefined'||!extras)extras={figs:{},figParts:0,looseParts:0,format:'Added in StudScore',note:''};
    extras.figs=figs;
  }
}
// studMeta = file meta + app conditions (blsync reads it each lookup; collection.js at load)
function mergeMeta(){
  if(isDemo())return;
  let fm=fileMeta();
  if(!fm){const cur=ld(LS.meta,null);if(cur&&!cur.ce){fm=cur;sv(LS.metaFile,fm);}}
  const conds=Object.keys(EDITS.sets).some(k=>EDITS.sets[k].cond)||Object.keys(EDITS.figs).some(k=>EDITS.figs[k].cond);
  if(!fm&&!conds)return;
  const m=fm?JSON.parse(JSON.stringify(fm)):{fmt:'StudScore (added in app)',loaded:today(),sets:{},figs:{},parts:{v:0,q:0},cur:null,vcol:null,has:{}};
  m.ce=1;m.sets=m.sets||{};m.figs=m.figs||{};m.has=m.has||{};
  for(const k in EDITS.sets){const r=EDITS.sets[k];if(!(r.q>0))continue;const e=m.sets[k]||(m.sets[k]={q:0,v:0,vq:0,vn:null,vu:null,c:0,cq:0,d:null,cond:{}});
    e.q=r.q;if(r.cond){e.cond={[r.cond]:r.q};m.has.cond=1;}}
  for(const id in EDITS.figs){const r=EDITS.figs[id];if(!(r.q>0))continue;const e=m.figs[id]||(m.figs[id]={q:0,v:0,vq:0});e.q=r.q;if(r.cond)e.cond={[r.cond]:r.q};}
  sv(LS.meta,m);
  try{if(window.StudCollection&&typeof StudCollection.reloadMeta==='function')StudCollection.reloadMeta();}catch(e){} // live basis once Cole adds the hook (cole-diffs/)
}

// ---------- wrap render + loadCollection (outermost) ----------
let freshUpload=false;
if(typeof render==='function'){const _r=render;render=function(o){
  try{if(!isDemo()){if(freshUpload){freshUpload=false;const fm=ld(LS.meta,null);if(fm)sv(LS.metaFile,fm);snapBase();absorb();}apply();}}catch(e){console.error('colledit apply',e);}
  const r=_r.apply(this,arguments);try{paintBars();decorate();}catch(e){console.error('colledit',e);}return r;};}
if(typeof loadCollection==='function'){const _l=loadCollection;loadCollection=function(text){
  freshUpload=true;rm(LS.metaFile);
  const r=_l.apply(this,arguments);
  try{const m=ld(LS.meta,null);if(m)sv(LS.metaFile,m);mergeMeta();}catch(e){}
  freshUpload=false;
  try{rescueLooseFigs(text);}catch(e){console.error('colledit loose figs',e);}
  try{importMissing(text);}catch(e){}
  return r;};}
// Loose minifigs the importer couldn't see: files with no Item Type / Category column (a plain "Item No,Qty" list),
// a pasted list, or a Brickset/other CSV with minifig numbers. importer.js only reads minifigs from BrickLink-style
// typed rows (type M / Minifigures category), XML, or a fig_num column, and set-list parsing drops anything that isn't a set.
// Only runs when the importer found no minifigs at all. Recognizes fig-123456 ids, BrickLink ids known to figids.js
// (sw0001, col483, colshr01 ...), and BrickLink CMF-style ids (col..., starting with col and ending in digits).
function looksFig(c){
  if(!c||c.length>24||!/\d/.test(c))return null;
  if(/^fig-\d{6}$/i.test(c))return (typeof FIGNAMES!=='undefined'&&FIGNAMES[c.toLowerCase()])?c.toLowerCase():null;
  if(!/^[a-z]{2,8}\d{2,5}[a-z]?$/i.test(c))return null;
  if(typeof SETS!=='undefined'&&(SETS[c]||SETS[c+'-1']))return null;
  try{const r=typeof figIds==='function'?figIds(c):null;if(r&&r.fig)return c;}catch(e){}
  return /^col[a-z]*\d+$/i.test(c)?c:null;
}
function rescueLooseFigs(text){
  if(isDemo())return;
  text=String(text||'').replace(/^\ufeff/,'');if(!text.trim()||/<ITEM>/i.test(text))return;
  if(typeof extras!=='undefined'&&extras&&extras.figs&&Object.keys(extras.figs).length)return;
  const found={};
  for(const line of text.split(/\r?\n/)){
    const cells=(/[,\t;]/.test(line)?line.split(/[,\t;]/):line.trim().split(/\s+/)).map(c=>c.trim().replace(/^"|"$/g,'')); // a pasted line like "sw0002 1" splits on spaces
    for(let i=0;i<cells.length;i++){const id=looksFig(cells[i]);if(!id)continue;
      const q=parseInt(cells[i+1]);const f=found[id]||(found[id]={qty:0,name:'',theme:''});f.qty+=(q>0&&q<1000?q:1);break;}
  }
  const ids=Object.keys(found);if(!ids.length)return;
  if(typeof extras==='undefined'||!extras)extras={figs:{},figParts:0,looseParts:0,format:'Set list',note:''};
  extras.figs=extras.figs||{};
  for(const id of ids){const fid=/^fig-/i.test(id)?id:((typeof figIds==='function'&&figIds(id).fig)||id);
    extras.figs[id]={qty:found[id].qty,name:figLabel(id),theme:figThemeOf(fid,/^fig-/i.test(id)?blOf(id):id)};}
  extras.msg='';
  extras.note=(extras.note?extras.note+' ':'')+`Also found ${ids.length} loose minifig${ids.length>1?'s':''} by number.`;
  try{const keep=JSON.parse(localStorage.getItem('brickExtras')||'null')||{};keep.figs=extras.figs;keep.note=extras.note;keep.figParts=extras.figParts||0;keep.looseParts=extras.looseParts||0;keep.format=extras.format;localStorage.setItem('brickExtras',JSON.stringify(keep));}catch(e){}
  snapBase();absorb();render(owned);
}
// The demo replaces your collection: forget the base snapshot (your app edits stay saved for your own collection)
const demoBtn=document.getElementById('demo');
if(demoBtn)demoBtn.addEventListener('click',()=>{rm(LS.base);rm(LS.metaFile);},true);

if(typeof renderSets==='function'){const _rs=renderSets;renderSets=function(){const r=_rs.apply(this,arguments);try{decorate();}catch(e){}return r;};}
if(typeof renderFigs==='function'){const _rf=renderFigs;renderFigs=function(){const r=_rf.apply(this,arguments);try{decorate();}catch(e){}return r;};}

// ---------- edits API ----------
function setEdit(kind,id,q,cond,info){
  q=Math.max(0,Math.min(999,q|0));const M=kind==='set'?EDITS.sets:EDITS.figs;
  const r=Object.assign({},M[id]||{},{q,t:Date.now()});if(cond)r.cond=cond;
  if(kind==='fig'&&info){if(info.name)r.name=info.name;if(info.theme)r.theme=info.theme;}
  M[id]=r;
  if(r.q===fileQty(kind,id)&&(!r.cond||r.cond===fileCond(kind,id)))delete M[id];
  if(!r.q&&!fileQty(kind,id))delete M[id];
  saveEdits();mergeMeta();refresh();
}
function undoEdit(kind,id){delete (kind==='set'?EDITS.sets:EDITS.figs)[id];saveEdits();mergeMeta();refresh();}
function clearAll(){EDITS=norm(null);saveEdits();const fm=fileMeta();if(fm)sv(LS.meta,fm);try{if(window.StudCollection&&StudCollection.reloadMeta)StudCollection.reloadMeta();}catch(e){}refresh();}
function refresh(){if(typeof render==='function'&&typeof owned!=='undefined')render(owned);
  try{if(window.StudBL&&StudBL.connected&&StudBL.connected())setTimeout(()=>{try{StudBL.sync(false);}catch(e){}},400);}catch(e){}}

// ---------- catalog search (offline: data.js SETS, setfigs.js FIGNAMES, figids.js, figmeta.js) ----------
let SIDX=null,FIDX=null;
function setIdx(){if(!SIDX&&typeof SETS!=='undefined')SIDX=Object.keys(SETS).map(k=>[k,k.toLowerCase(),String(SETS[k][0]).toLowerCase()]);return SIDX||[];}
function blOf(fid){if(typeof FIGIDS==='undefined')return null;const raw=FIGIDS[String(fid).slice(4)];if(!raw)return null;const s=String(raw),i=s.indexOf(',');const bl=i<0?s:s.slice(0,i);return bl||null;}
function figIdx(){if(!FIDX&&typeof FIGNAMES!=='undefined')FIDX=Object.keys(FIGNAMES).map(k=>{const bl=blOf(k);return [k,k.toLowerCase(),String(FIGNAMES[k]).toLowerCase(),bl?bl.toLowerCase():'',bl];});return FIDX||[];}
function figLabel(id){if(typeof FIGNAMES!=='undefined'&&FIGNAMES[id])return FIGNAMES[id];try{const r=typeof figIds==='function'?figIds(id):null;if(r&&r.fig&&FIGNAMES[r.fig])return FIGNAMES[r.fig];}catch(e){}return id;}
function searchSets(q){
  q=q.trim().toLowerCase();if(q.length<2&&!/^\d/.test(q))return [];
  const toks=q.split(/\s+/).filter(Boolean),out=[],num=/^[0-9a-z]+(-\d+)?$/.test(q);
  for(const [k,kl,nm] of setIdx()){let s=-1;
    if(num&&(kl===q||kl===q+'-1'))s=0;else if(num&&kl.startsWith(q))s=1+(kl.length-q.length)/100;
    else if(toks.every(t=>nm.includes(t)||kl.startsWith(t)))s=2+(nm.startsWith(toks[0])?0:0.5);
    if(s>=0)out.push([s,k]);}
  out.sort((a,b)=>a[0]-b[0]||(a[0]>=2?(+SETS[b[1]][3]||0)-(+SETS[a[1]][3]||0):0)||(SETS[b[1]][1]-SETS[a[1]][1])||a[1].localeCompare(b[1],undefined,{numeric:true}));
  return out.slice(0,40).map(x=>x[1]);
}
function searchFigs(q){
  q=q.trim().toLowerCase();if(q.length<2)return [];
  const toks=q.split(/\s+/).filter(Boolean),out=[],qn=q.replace(/^fig-?/,'');
  for(const [k,kl,nm,bll] of figIdx()){let s=-1;
    if(kl===q||kl==='fig-'+qn||bll===q)s=0;else if((bll&&bll.startsWith(q))||kl.startsWith('fig-'+qn)&&/^\d+$/.test(qn))s=1;
    else if(toks.every(t=>nm.includes(t)))s=2+(nm.startsWith(toks[0])?0:0.5);
    if(s>=0)out.push([s,k]);}
  out.sort((a,b)=>a[0]-b[0]||a[1].localeCompare(b[1]));
  return out.slice(0,40).map(x=>x[1]);
}
function figYear(fid){const m=typeof FIGMETA!=='undefined'&&FIGMETA[fid];return m?m[1]:null;}
function figThemeOf(fid,bl){
  try{if(bl&&typeof figTheme==='function'){const t=figTheme(bl,'');if(t&&t!=='Other'&&!/^[A-Z]+$/.test(t))return t;}}catch(e){}
  const m=typeof FIGMETA!=='undefined'&&FIGMETA[fid];if(m&&m[2]&&typeof SETS!=='undefined'&&SETS[m[2]]&&typeof rootTheme==='function')return rootTheme(SETS[m[2]][2]);
  return 'Other';
}
// Which id to store a new loose fig under: the one you already own it as, else your file's style (BrickLink ids or fig- ids)
function figKeyFor(fid){
  const bl=blOf(fid),own=exFigs(),ids=Object.keys(own);
  if(own[fid])return fid;if(bl&&own[bl])return bl;
  try{if(typeof figsFromSets==='function'&&figsFromSets(owned)[fid])return fid;}catch(e){}
  if(EDITS.figs[fid])return fid;if(bl&&EDITS.figs[bl])return bl;
  const blStyle=ids.length&&ids.filter(i=>!/^fig-/i.test(i)).length>ids.length/2;
  return blStyle&&bl?bl:fid;
}
const setImg=k=>`https://cdn.rebrickable.com/media/sets/${encodeURIComponent(k)}.jpg`;
const fImg=id=>typeof figImg==='function'?figImg(id):setImg(id);

// ---------- styles ----------
const css=document.createElement('style');css.setAttribute('data-ss','colledit');css.textContent=`
.ce-ic{width:22px;height:18px;flex:0 0 auto;vertical-align:middle}
.ce-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 12px;padding:8px 10px;background:#0E2230;border:2px solid #6C6E68;border-radius:10px}
.ce-bar button{margin:0}
.ce-add{display:inline-flex;align-items:center;gap:8px;background:#F2CD37;color:#05131D;font-weight:800;border:2px solid #05131D;border-radius:6px;box-shadow:inset 0 3px 0 #FFE68A,inset 0 -3px 0 #A8861A;padding:7px 14px}
.ce-add:hover{filter:brightness(1.06)}
.ce-ghost{background:#3A3D40;color:#F2F3F2;border:1px solid #6C6E68;font-weight:700;padding:6px 11px;font-size:13px}
.ce-sum{font-size:13px;color:#E4E5E2}
.ce-bar .ce-sp{flex:1}
@media (max-width:600px){.ce-bar .ce-sp{flex:0 0 100%;height:0}.ce-bar .ce-ghost{flex:0 1 auto}}
.setcard.ce-flag{position:relative}
.ce-badge{position:absolute;top:8px;left:8px;z-index:2;background:#A5CA18;color:#05131D;font-size:10px;font-weight:800;letter-spacing:.3px;text-transform:uppercase;padding:2px 6px;border-radius:3px;border:1.5px solid #05131D;box-shadow:inset 0 2px 0 rgba(255,255,255,.35)}
.ce-badge.ed{background:#36AEBF}
.ce-badge.ms{background:#C91A09;color:#F2F3F2}
.ce-badge.ce-tr{left:auto;right:8px}
.ce-own-line{margin-top:8px;font-size:14px}
.ce-from{margin-top:4px;font-size:13px;line-height:1.5}
.ce-link{background:none;border:0;padding:0;margin:0;color:#F2CD37;font-weight:700;text-decoration:underline;font-size:13px;cursor:pointer}
.ce-miss{margin-top:12px;border-top:1px solid #3A3D40;padding-top:8px}
.ce-miss>summary{cursor:pointer;font-weight:800;color:#F2CD37;list-style:none;display:flex;align-items:center;gap:8px}
.ce-miss>summary::-webkit-details-marker{display:none}
.ce-miss>summary::before{content:"";width:0;height:0;border-left:7px solid #F2CD37;border-top:5px solid transparent;border-bottom:5px solid transparent;transition:transform .15s}
.ce-miss[open]>summary::before{transform:rotate(90deg)}
.ce-miss>summary .ce-badge{position:static}
.ce-mstep input{width:70px;border:0;text-align:center;font-weight:800;font-size:17px;color:#05131D;background:#F2F3F2;height:40px;-moz-appearance:textfield}
.ce-mstep input::-webkit-inner-spin-button{-webkit-appearance:none}
.ce-note{width:100%;box-sizing:border-box;border-radius:6px;border:2px solid #05131D;background:#F2F3F2;color:#05131D;font:inherit;font-size:15px;padding:8px}
.ce-mfigs{display:flex;flex-direction:column;gap:6px}
.ce-mfig{display:flex;align-items:center;gap:8px;background:#3A3D40;border-radius:6px;padding:5px 8px;cursor:pointer;font-size:13px}
.ce-mfig input{width:20px;height:20px;accent-color:#C91A09;flex:0 0 auto}
.ce-mfig img{width:34px;height:40px;object-fit:contain;background:#E3E6E8;border-radius:4px;flex:0 0 auto}
.ce-mfig span{flex:1;min-width:0}.ce-mfig small{display:block;opacity:.75;font-size:11px}
.ce-mfig select{background:#6B5A5A;color:#F2F3F2;border:1px solid #6C6E68;border-radius:4px;padding:3px}
.ce-flash{animation:ceflash 1.6s ease-out}
@keyframes ceflash{0%,40%{outline:3px solid #F2CD37;outline-offset:2px}100%{outline:3px solid transparent}}
#ce-add-bg .modal{max-width:560px}
#ce-add-bg .ce-sheet{display:flex;flex-direction:column;max-height:calc(100svh - 24px);max-height:calc(100dvh - 24px)}
.ce-head{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:14px 50px 8px 14px}
.ce-head h2{margin:0;font-size:19px}
.ce-kinds{flex:0 0 auto;align-self:flex-start;display:inline-flex;border:2px solid #05131D;border-radius:6px;overflow:hidden;margin:0 14px 8px}
.ce-kinds button{margin:0;border-radius:0;background:#3A3D40;color:#F2F3F2;display:inline-flex;align-items:center;gap:6px;padding:7px 12px}
.ce-kinds button[aria-pressed=true]{background:#F2CD37;color:#05131D}
.ce-q{flex:0 0 auto;margin:0 14px 8px;display:block;width:calc(100% - 28px);box-sizing:border-box;font-size:16px;padding:10px 12px;border-radius:8px;border:2px solid #05131D;background:#F2F3F2;color:#05131D}
.ce-res{overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:0 14px 14px;flex:1 1 auto;min-height:120px}
.ce-row{display:flex;align-items:center;gap:10px;padding:6px;border-radius:8px;background:#5E605B;margin-bottom:6px;cursor:pointer;border:2px solid transparent}
.ce-row:hover,.ce-row:focus-visible{border-color:#A5CA18;outline:none}
.ce-row img,.ce-row .ce-noimg{width:58px;height:44px;object-fit:contain;background:#E3E6E8;border-radius:6px;flex:0 0 auto;mix-blend-mode:normal}
.ce-row .ce-t{flex:1;min-width:0;font-size:13px;line-height:1.3}
.ce-row .ce-t b{display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ce-own{font-size:11px;font-weight:800;color:#05131D;background:#A5CA18;border-radius:3px;padding:1px 5px;margin-left:4px}
.ce-pick{padding:0 14px 14px;overflow-y:auto}
.ce-pick .ce-big{display:flex;gap:12px;align-items:center;margin-bottom:10px}
.ce-pick .ce-big img{width:110px;height:84px;object-fit:contain;background:#E3E6E8;border-radius:8px}
.ce-lbl{font-size:12px;font-weight:800;color:#F2CD37;text-transform:uppercase;letter-spacing:.4px;margin:12px 0 6px}
.ce-conds{display:flex;flex-wrap:wrap;gap:6px}
.ce-conds button{margin:0;background:#3A3D40;color:#F2F3F2;border:2px solid #6C6E68;padding:7px 11px;font-size:13px;text-align:left}
.ce-conds button small{display:block;font-weight:400;font-size:11px;opacity:.8}
.ce-conds button[aria-pressed=true]{background:#F2CD37;color:#05131D;border-color:#05131D}
.ce-step{display:inline-flex;align-items:center;border:2px solid #05131D;border-radius:6px;overflow:hidden;background:#F2F3F2}
.ce-step button{margin:0;border-radius:0;background:#6C6E68;color:#F2F3F2;font-size:20px;line-height:1;width:44px;height:40px;padding:0}
.ce-step output{min-width:46px;text-align:center;font-weight:800;font-size:18px;color:#05131D}
.ce-go{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
.ce-go button{margin:0}
.ce-danger{background:#C91A09;color:#F2F3F2}
.ce-edit{margin:12px 0 4px;padding:10px 12px;background:#05131D;border:2px solid #F2CD37;border-radius:10px}
.ce-edit .ce-eh{display:flex;align-items:center;gap:8px;font-weight:800;color:#F2CD37}
.ce-edit .ce-eh .ce-badge{position:static}
.ce-edit .ce-lbl{color:#E4E5E2;margin-top:10px}
.ce-edit .ce-msg{font-size:12px;color:#A5CA18;min-height:1em;margin-top:6px}
.ce-toast{position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:80;background:#05131D;color:#F2F3F2;border:2px solid #A5CA18;border-radius:8px;padding:10px 14px;font-weight:700;font-size:14px;max-width:90vw;box-shadow:0 4px 14px rgba(0,0,0,.5)}
.ce-list .ce-row{cursor:default}
.ce-list .ce-row button{margin:0;padding:6px 10px;font-size:12px}
.ce-empty{color:#E4E5E2;font-size:14px;padding:10px 0}
`;document.head.appendChild(css);

// ---------- toast ----------
let toastT=0;
function toast(msg){let t=document.getElementById('ce-toast');if(!t){t=document.createElement('div');t.id='ce-toast';t.className='ce-toast';t.setAttribute('role','status');document.body.appendChild(t);}
  t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true;},2600);}

// ---------- bars on the Sets and Figs tabs ----------
function counts(){let a=0,e=0,r=0;for(const kind of ['set','fig'])for(const id in (kind==='set'?EDITS.sets:EDITS.figs)){const s=status(kind,id);if(s==='added')a++;else if(s==='edited')e++;else if(s==='removed')r++;}return {a,e,r,n:a+e+r};}
function paintBars(){
  [['sets','set'],['figs','fig']].forEach(([tab,kind])=>{
    const host=document.getElementById(tab==='sets'?'mysets':'myfigs');if(!host)return;
    let bar=document.getElementById('ce-bar-'+tab);
    if(!bar){bar=document.createElement('div');bar.id='ce-bar-'+tab;bar.className='ce-bar';host.parentNode.insertBefore(bar,host);}
    if(isDemo()){bar.innerHTML=`<span class="ce-sum">This is the demo collection. Start your own to add ${kind==='set'?'sets':'minifigs'} here.</span><span class="ce-sp"></span><button type="button" class="ce-add" data-ce="own">${ICON_BRICK}Start my own</button>`;return;}
    const c=counts(),bits=[];if(c.a)bits.push(c.a+' added');if(c.e)bits.push(c.e+' edited');if(c.r)bits.push(c.r+' removed');
    bar.innerHTML=`<button type="button" class="ce-add" data-ce="add" data-kind="${kind}">${kind==='set'?ICON_BRICK:ICON_FIG}Add ${kind==='set'?'a set':'a minifig'}</button><span class="ce-sp"></span>${c.n?`<button type="button" class="ce-ghost" data-ce="review" title="${H(bits.join(' · '))}">In-app edits (${c.n})</button>`:''}<button type="button" class="ce-ghost" data-ce="export" title="Download your collection, with in-app edits, as a CSV you can re-upload">Export CSV</button>`;
  });
}
function decorate(){
  if(isDemo())return;
  document.querySelectorAll('#mysets .setcard[data-num]').forEach(c=>mark(c,status('set',c.dataset.num),hasMiss('set',c.dataset.num)?missSummary('set',c.dataset.num):''));
  document.querySelectorAll('#myfigs .figcard').forEach(c=>{const id=c.getAttribute('data-id')||((c.querySelector('img.setimg')||{}).alt);if(id)mark(c,status('fig',id),hasMiss('fig',id)?missSummary('fig',id):'');});
}
function mark(card,s,miss){card.querySelectorAll(':scope > .ce-badge').forEach(x=>x.remove());card.classList.toggle('ce-flag',!!(s||miss));
  if(miss)card.insertAdjacentHTML('afterbegin',`<span class="ce-badge ms ce-tr" title="Missing: ${H(miss)}">Missing</span>`);
  if(s==='added'||s==='edited')card.insertAdjacentHTML('afterbegin',`<span class="ce-badge${s==='edited'?' ed':''}" title="${s==='added'?'Added in StudScore':'Edited in StudScore'}">${s==='added'?'Added':'Edited'}</span>`);}

document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-ce]');if(!b)return;
  const a=b.dataset.ce;
  if(a==='add'){e.preventDefault();openAdd(b.dataset.kind||'set');}
  else if(a==='review'){e.preventDefault();openReview();}
  else if(a==='export'){e.preventDefault();exportCSV();}
  else if(a==='own'){e.preventDefault();startOwn();}
});
function startOwn(){
  if(!confirm('Start your own collection? The demo sets go away. You can still upload a file any time, and your in-app additions stay on top of it.'))return;
  loadCollection('');try{if(typeof extras!=='undefined'&&extras){extras.msg='';extras.note='';}}catch(e){}
  render(owned);toast('Your own collection is ready. Add sets and minifigs here.');
}

// ---------- generic sheet ----------
function sheet(id,label,inner){
  closeSheet(id);const bg=document.createElement('div');bg.className='modalbg no-swipe';bg.id=id;
  bg.innerHTML=`<div class="modal ce-sheet" role="dialog" aria-modal="true" aria-label="${H(label)}"><button class="mclose" aria-label="Close">✕</button>${inner}</div>`;
  bg.onclick=ev=>{if(ev.target===bg)closeSheet(id);};
  document.body.appendChild(bg);bg.querySelector('.mclose').onclick=()=>closeSheet(id);
  document.body.classList.add('ss-popup-open');
  bg._esc=ev=>{if(ev.key==='Escape')closeSheet(id);};document.addEventListener('keydown',bg._esc);
  return bg;
}
function closeSheet(id){const bg=document.getElementById(id);if(!bg)return;document.removeEventListener('keydown',bg._esc);bg.remove();
  if(!document.getElementById('setmodal'))document.body.classList.remove('ss-popup-open');}

// ---------- Add sheet ----------
function openAdd(kind){
  if(isDemo())return;
  const bg=sheet('ce-add-bg','Add to my collection',`<div class="ce-head">${ICON_BRICK}<h2>Add to my collection</h2></div>
<div class="ce-kinds" role="group" aria-label="What to add"><button type="button" data-k="set">${ICON_BRICK}Set</button><button type="button" data-k="fig">${ICON_FIG}Minifig</button></div>
<input class="ce-q" type="search" autocomplete="off" enterkeyhint="search" aria-label="Search">
<div class="ce-res" aria-live="polite"></div><div class="ce-pick" hidden></div>`);
  const q=bg.querySelector('.ce-q'),res=bg.querySelector('.ce-res'),pick=bg.querySelector('.ce-pick');
  const setKind=k=>{kind=k;bg.querySelectorAll('.ce-kinds button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.k===k?'true':'false'));
    q.placeholder=k==='set'?'Set number or name, like 75192 or Millennium Falcon':'Fig number or name, like sw0001 or Luke Skywalker';pick.hidden=true;res.hidden=false;run();};
  bg.querySelectorAll('.ce-kinds button').forEach(x=>x.onclick=()=>{setKind(x.dataset.k);q.focus();});
  let tm=0;q.oninput=()=>{clearTimeout(tm);tm=setTimeout(run,120);};
  q.onkeydown=ev=>{if(ev.key==='Enter'){ev.preventDefault();const f=res.querySelector('.ce-row');if(f)f.click();}};
  function run(){
    const v=q.value;if(!v.trim()){res.innerHTML=`<p class="ce-empty">Search the catalog of ${kind==='set'?(setIdx().length.toLocaleString()+' sets'):(figIdx().length.toLocaleString()+' minifigs')} by number or name.</p>`;return;}
    const ids=kind==='set'?searchSets(v):searchFigs(v);
    if(!ids.length){res.innerHTML=`<p class="ce-empty">No ${kind==='set'?'sets':'minifigs'} match "${H(v)}".</p>`;return;}
    res.innerHTML=ids.map(id=>{
      if(kind==='set'){const d=SETS[id],own=curQty('set',id);
        return `<div class="ce-row" role="button" tabindex="0" data-id="${H(id)}"><img loading="lazy" alt="" src="${setImg(id)}" onerror="this.outerHTML='<div class=&quot;ce-noimg&quot;></div>'"><div class="ce-t"><b>${H(d[0])}</b>${H(sn(id))} · ${d[1]} · ${(+d[3]).toLocaleString()} pcs${own?`<span class="ce-own">Own ×${own}</span>`:''}</div></div>`;}
      const bl=blOf(id),key=figKeyFor(id),own=figTotal(key),y=figYear(id);
      return `<div class="ce-row" role="button" tabindex="0" data-id="${H(id)}"><img loading="lazy" alt="" src="${fImg(bl||id)}" onerror="this.outerHTML='<div class=&quot;ce-noimg&quot;></div>'"><div class="ce-t"><b>${H(FIGNAMES[id])}</b>${H(bl?bl+' · ':'')}${H(id)}${y?' · '+y:''}${own?`<span class="ce-own">Own ×${own}</span>`:''}</div></div>`;
    }).join('');
    res.querySelectorAll('.ce-row').forEach(r=>{r.onclick=()=>choose(r.dataset.id);r.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();choose(r.dataset.id);}};});
  }
  function choose(cid){
    const isSet=kind==='set',key=isSet?cid:figKeyFor(cid),bl=isSet?null:blOf(cid);
    const have=curQty(kind,key),tot=isSet?have:figTotal(key);let qty=1,cond=curCond(kind,key)||DEF[kind];
    const name=isSet?SETS[cid][0]:FIGNAMES[cid];
    const sub=isSet?`${H(sn(cid))} · ${SETS[cid][1]} · ${(+SETS[cid][3]).toLocaleString()} pcs · ${H(typeof setTheme==='function'?setTheme(cid):'')}`:`${H(bl?bl+' · ':'')}${H(cid)}${figYear(cid)?' · first in '+figYear(cid):''}`;
    res.hidden=true;pick.hidden=false;
    const paint=()=>{pick.innerHTML=`<div class="ce-big"><img alt="" src="${isSet?setImg(cid):fImg(bl||cid)}" onerror="this.style.visibility='hidden'"><div><b style="font-size:16px">${H(name)}</b><div class="muted small">${sub}</div>${tot?`<div class="small" style="margin-top:4px">You own ×${tot} now${isSet?'':`: ${tot-have} from sets, ${have} loose`}</div>`:''}</div></div>
<div class="ce-lbl">Condition</div><div class="ce-conds">${(isSet?SET_CONDS:FIG_CONDS).map(c=>`<button type="button" data-c="${H(c)}" aria-pressed="${c===cond}">${H(c)}${isSet&&SET_COND_HINT[c]?`<small>${H(SET_COND_HINT[c])}</small>`:''}</button>`).join('')}</div>
<div class="ce-lbl">How many to add${isSet?'':' (loose)'}</div><div class="ce-step"><button type="button" data-s="-1" aria-label="One less">−</button><output>${qty}</output><button type="button" data-s="1" aria-label="One more">+</button></div>
${tot?`<div class="muted small" style="margin-top:6px">You'll own ×${tot+qty} after adding${isSet?'':' (adds loose copies)'}.</div>`:''}
<div class="ce-go"><button type="button" class="ce-add" data-go="1">${isSet?ICON_BRICK:ICON_FIG}Add to my ${isSet?'sets':'minifigs'}</button><button type="button" class="ce-ghost" data-back="1">Back to results</button></div>`;
      pick.querySelectorAll('.ce-conds button').forEach(x=>x.onclick=()=>{cond=x.dataset.c;paint();});
      pick.querySelectorAll('[data-s]').forEach(x=>x.onclick=()=>{qty=Math.max(1,Math.min(99,qty+(+x.dataset.s)));paint();});
      pick.querySelector('[data-back]').onclick=()=>{pick.hidden=true;res.hidden=false;q.focus();};
      pick.querySelector('[data-go]').onclick=()=>{
        setEdit(kind,key,have+qty,cond,isSet?null:{name,theme:figThemeOf(cid,bl)});
        closeSheet('ce-add-bg');goTo(kind,key);
        toast(`Added ${isSet?sn(cid)+' '+name:name}${qty>1?' ×'+qty:''}`);
      };};
    paint();
  }
  setKind(kind);setTimeout(()=>q.focus(),30);
}
// switch to the tab and flash the tile
function goTo(kind,id){
  const tab=kind==='set'?'sets':'figs';
  try{if(kind==='fig'&&window.StudGrid&&StudGrid.figShow&&StudGrid.figShow()==='sets')StudGrid.figShow('all');}catch(e){}
  if(typeof goTab==='function')goTab(tab);
  const sel=kind==='set'?`#mysets .setcard[data-num="${CSS.escape(id)}"]`:`#myfigs .figcard[data-id="${CSS.escape(id)}"]`;
  let c=document.querySelector(sel);
  if(!c){try{if(kind==='set'){setShowAll=true;}else{figShowAll=true;}render(owned);}catch(e){}c=document.querySelector(sel);}
  if(c)setTimeout(()=>{c.scrollIntoView({block:'center',behavior:'smooth'});c.classList.remove('ce-flash');void c.offsetWidth;c.classList.add('ce-flash');},60);
}

// ---------- editor inside the set / fig popup ----------
let lastFig=null;
document.addEventListener('click',e=>{const c=e.target.closest&&e.target.closest('#myfigs .figcard,[data-fig]');if(c)lastFig=c.getAttribute('data-id')||c.getAttribute('data-fig')||((c.querySelector('img.setimg')||{}).alt)||null;},true);
function modalInfo(modal){
  if(modal.querySelector('.tbanner.mban')){const img=modal.querySelector('img.mimg');const m=img&&/\/sets\/([^/?#]+)\.jpg/i.exec(img.src);
    let id=m?decodeURIComponent(m[1]):null;if(!id){const sp=modal.querySelector('.meta span');if(sp){const n=sp.textContent.replace(/^#/,'').trim();id=/-\d+$/.test(n)?n:n+'-1';}}
    return id&&typeof SETS!=='undefined'&&SETS[id]?{kind:'set',id}:null;}
  const sp=modal.querySelector('.mbody .meta span');const id=(sp&&sp.textContent.trim())||lastFig;
  return id?{kind:'fig',id}:null;
}
function enhance(bg){
  if(!bg||isDemo())return;const modal=bg.querySelector('.modal');if(!modal||modal.querySelector('.ce-edit'))return;
  const info=modalInfo(modal);if(!info)return;const body=modal.querySelector('.mbody');if(!body)return;
  const box=document.createElement('div');box.className='ce-edit';
  const anchor=body.querySelector('.sd-chips')||body.querySelector('.meta');
  if(anchor)anchor.insertAdjacentElement('afterend',box);else body.insertAdjacentElement('afterbegin',box);
  paintEditor(box,info);
}
// ---------- figs: loose copies vs copies that come with your sets ----------
function figInfo(id){
  let inset={};try{inset=typeof figsFromSets==='function'?figsFromSets(owned):{};}catch(e){}
  const loose=curQty('fig',id),s=inset[id],from=[];
  if(s&&typeof SETFIGS!=='undefined')for(const k of s.from||[]){const l=SETFIGS[k]||[],e=l.find(x=>x[0]===id);if(!e)continue;
    const miss=(MISS.sets[k]&&MISS.sets[k].figs&&MISS.sets[k].figs[id])|0;const q=Math.max(0,e[1]*(owned[k]||0)-miss);if(q)from.push({k,q});}
  const ins=s?s.qty:0;return {loose,ins,total:loose+ins,from};
}
function inSetsCount(id){return figInfo(id).ins;}
const figTotal=id=>figInfo(id).total;

// ---------- missing parts (simple version; full BrickLink part checklist is phase 2) ----------
// localStorage 'studMissing' {sets:{num:{n,note,figs:{figId:count},t}}, figs:{id:{n,note,t}}}. Kept across uploads and edits.
// Minifigs marked missing from a set are taken out of that set's figs (figsFromSets), so they don't count as owned.
function missRec(kind,id){return (kind==='set'?MISS.sets:MISS.figs)[id]||null;}
function hasMiss(kind,id){const m=missRec(kind,id);if(!m)return false;return (m.n>0)||!!(m.note&&m.note.trim())||Object.values(m.figs||{}).some(v=>v>0);}
function missFigCount(m){return Object.values((m&&m.figs)||{}).reduce((a,v)=>a+(v|0),0);}
function setMiss(kind,id,m){const M=kind==='set'?MISS.sets:MISS.figs;
  const clean={n:Math.max(0,Math.min(99999,m.n|0)),note:String(m.note||'').slice(0,500),t:Date.now()};
  if(kind==='set'){clean.figs={};for(const f in (m.figs||{}))if((m.figs[f]|0)>0)clean.figs[f]=m.figs[f]|0;}
  M[id]=clean;if(!hasMiss(kind,id))delete M[id];saveMiss();}
function missSummary(kind,id){const m=missRec(kind,id);if(!m)return '';const b=[];if(m.n>0)b.push(m.n+' piece'+(m.n>1?'s':''));const fc=missFigCount(m);if(fc)b.push(fc+' minifig'+(fc>1?'s':''));if(m.note&&m.note.trim()&&!b.length)b.push('see note');return b.join(', ');}
if(typeof figsFromSets==='function'){const _ffs=figsFromSets;figsFromSets=function(o){const out=_ffs.apply(this,arguments);
  try{if(isDemo()||!o||typeof SETFIGS==='undefined')return out;
    for(const k in MISS.sets){const m=MISS.sets[k];if(!m||!m.figs||!o[k])continue;const list=SETFIGS[k]||[];
      for(const fid in m.figs){const f=out[fid],e=list.find(x=>x[0]===fid);if(!f||!e)continue;const per=e[1]*o[k],sub=Math.min(m.figs[fid]|0,per);if(!sub)continue;
        f.qty-=sub;if(sub>=per)f.from=f.from.filter(x=>x!==k);if(f.qty<=0)delete out[fid];}}}catch(e){console.error('colledit missing figs',e);}
  return out;};}

// ---------- editor inside the set / fig popup ----------
function stepHTML(v){return `<div class="ce-step"><button type="button" data-s="-1" aria-label="One less">−</button><output>${v}</output><button type="button" data-s="1" aria-label="One more">+</button></div>`;}
function paintEditor(box,info,msg,keep){
  const {kind,id}=info,isSet=kind==='set',st=status(kind,id),fq=fileQty(kind,id),r=rec(kind,id);
  const fi=isSet?null:figInfo(id),loose=isSet?0:fi.loose,ins=isSet?0:fi.ins;
  const now=isSet?curQty('set',id):fi.total;
  const k=keep||{};
  let qty=k.qty!=null?k.qty:(isSet?(now||1):(loose||(ins?0:1))),cond=k.cond||curCond(kind,id)||DEF[kind],armed=false;
  const m0=missRec(kind,id)||{};let mn=k.mn!=null?k.mn:(m0.n|0),mnote=k.mnote!=null?k.mnote:(m0.note||''),mfigs=k.mfigs||Object.assign({},m0.figs||{});
  let mopen=k.mopen!=null?k.mopen:(hasMiss(kind,id)||/incomplete/i.test(cond));
  const minQ=isSet?1:(ins?0:1);
  const setFigs=isSet&&typeof SETFIGS!=='undefined'?(SETFIGS[id]||[]):[];
  const draw=m=>{
    const owns=now>0;
    const fromH=!isSet&&fi.from.length?`<div class="ce-from"><b>${ins} from your sets:</b> ${fi.from.map(x=>`<button type="button" class="ce-link" data-open="${H(x.k)}">${H(sn(x.k))} ${H(SETS[x.k]?SETS[x.k][0]:'')}${x.q>1?' ×'+x.q:''}</button>`).join(', ')}</div>`:'';
    const ownLine=isSet?'':`<div class="ce-own-line">You own <b>×${now}</b>${ins||loose?`: ${ins} from sets, ${loose} loose`:''}</div>`;
    const missH=owns?`<details class="ce-miss"${mopen?' open':''}><summary>Missing parts${hasMiss(kind,id)?` <span class="ce-badge ms">${H(missSummary(kind,id))}</span>`:''}</summary>
<div class="ce-lbl">Missing pieces</div>${`<div class="ce-step ce-mstep"><button type="button" data-m="-1" aria-label="One less">−</button><input type="number" min="0" max="99999" inputmode="numeric" class="ce-mn" value="${mn}" aria-label="Missing pieces"><button type="button" data-m="1" aria-label="One more">+</button></div>`}
<div class="ce-lbl">Note</div><textarea class="ce-note" rows="2" maxlength="500" placeholder="e.g. 2x 3001 red, sticker sheet">${H(mnote)}</textarea>
${setFigs.length?`<div class="ce-lbl">Minifigs missing from this set</div><div class="ce-mfigs">${setFigs.map(([fid,fq0])=>{const per=fq0*(curQty('set',id)||1),v=Math.min(mfigs[fid]|0,per);const nm=typeof figName==='function'?figName(fid):figLabel(fid);
  return `<label class="ce-mfig"><input type="checkbox" data-f="${H(fid)}"${v?' checked':''}><img alt="" loading="lazy" src="${fImg(fid)}" onerror="this.style.visibility='hidden'"><span>${H(nm)}<small>${H(fid)}${per>1?` · ${v||0} of ${per} missing`:''}</small></span>${per>1?`<select data-fc="${H(fid)}" aria-label="How many missing">${Array.from({length:per+1},(_,i)=>`<option value="${i}"${i===v?' selected':''}>${i}</option>`).join('')}</select>`:''}</label>`;}).join('')}</div><div class="muted small">Missing minifigs don't count as owned.</div>`:''}
</details>`:'';
    box.innerHTML=`<div class="ce-eh">${isSet?ICON_BRICK:ICON_FIG}<span>${owns?'In my collection':'Not in my collection yet'}</span>${st==='added'?'<span class="ce-badge">Added in app</span>':st==='edited'?'<span class="ce-badge ed">Edited in app</span>':''}</div>
${ownLine}${fromH}
<div class="ce-lbl">${isSet?'Quantity':'Loose copies'}</div>${stepHTML(qty)}
${!isSet&&ins?`<div class="muted small" style="margin-top:4px">Loose copies are the ones not in a set. The ${ins} from sets always stay; change those from the set.</div>`:''}
<div class="ce-lbl">Condition${!isSet&&ins?' (loose copies)':''}</div><div class="ce-conds">${(isSet?SET_CONDS:FIG_CONDS).map(c=>`<button type="button" data-c="${H(c)}" aria-pressed="${c===cond}">${H(c)}</button>`).join('')}</div>
${missH}
<div class="ce-go">${owns?`<button type="button" data-save="1">Save changes</button>${(isSet||loose>0)?`<button type="button" class="ce-danger" data-rm="1">${armed?'Tap again to remove':(!isSet&&ins?'Remove loose copies':'Remove')}</button>`:''}`:`<button type="button" class="ce-add" data-save="1">${isSet?ICON_BRICK:ICON_FIG}Add to my ${isSet?'sets':'minifigs'}</button>`}
${r?`<button type="button" class="ce-ghost" data-undo="1">Undo app edits${fq?` (file: ×${fq})`:''}</button>`:''}</div>
<div class="ce-msg" role="status">${m?H(m):''}</div>`;
    const grab=()=>{const a=box.querySelector('.ce-mn'),b=box.querySelector('.ce-note'),d=box.querySelector('.ce-miss');if(a)mn=Math.max(0,parseInt(a.value)||0);if(b)mnote=b.value;if(d)mopen=d.open;};
    box.querySelectorAll('[data-s]').forEach(x=>x.onclick=()=>{grab();qty=Math.max(minQ,Math.min(999,qty+(+x.dataset.s)));armed=false;draw();});
    box.querySelectorAll('[data-m]').forEach(x=>x.onclick=()=>{grab();mn=Math.max(0,Math.min(99999,mn+(+x.dataset.m)));draw();});
    box.querySelectorAll('.ce-conds button').forEach(x=>x.onclick=()=>{grab();cond=x.dataset.c;if(/incomplete/i.test(cond))mopen=true;armed=false;draw();});
    box.querySelectorAll('.ce-mfigs input[type=checkbox]').forEach(x=>x.onchange=()=>{grab();const f=x.dataset.f,sel=box.querySelector(`select[data-fc="${CSS.escape(f)}"]`);mfigs[f]=x.checked?(sel?Math.max(1,+sel.value||1):1):0;draw();});
    box.querySelectorAll('.ce-mfigs select').forEach(x=>{x.onclick=e=>e.stopPropagation();x.onchange=()=>{grab();mfigs[x.dataset.fc]=+x.value;draw();};});
    box.querySelectorAll('[data-open]').forEach(x=>x.onclick=()=>{const k2=x.dataset.open;closePopup();setTimeout(()=>openSet(k2),350);});
    const d=box.querySelector('.ce-miss');if(d)d.addEventListener('toggle',()=>{mopen=d.open;});
    const sv_=box.querySelector('[data-save]');if(sv_)sv_.onclick=()=>{grab();
      const fid=isSet?null:(/^fig-/i.test(id)?id:((typeof figIds==='function'&&figIds(id).fig)||id));
      const infoF=isSet?null:{name:figLabel(id),theme:figThemeOf(fid,/^fig-/i.test(id)?blOf(id):id)};
      if(owns)setMiss(kind,id,{n:mn,note:mnote,figs:mfigs});
      const prevLoose=loose,prevQ=isSet?now:loose;
      if(qty!==prevQ||cond!==(curCond(kind,id)||DEF[kind])||!owns)setEdit(kind,id,qty,cond,infoF);else refresh();
      afterChange(box,info,owns?(isSet||qty>=prevLoose?'Saved.':'Saved. Loose copies now ×'+qty+'.'):'Added to your collection.');};
    const rmb=box.querySelector('[data-rm]');if(rmb)rmb.onclick=()=>{grab();if(!armed){armed=true;draw();return;}
      setEdit(kind,id,0,null);
      if(!isSet&&ins){afterChange(box,info,'Loose copies removed. The ones from your sets stay.');return;}
      toast(`Removed ${isSet?sn(id)+' '+SETS[id][0]:figLabel(id)}`);closePopup();};
    const ub=box.querySelector('[data-undo]');if(ub)ub.onclick=()=>{undoEdit(kind,id);if(!(isSet?curQty('set',id):figTotal(id))){toast('Back to your file: not in your collection');closePopup();return;}afterChange(box,info,'Back to your file.');};
  };
  draw(msg);
}
function afterChange(box,info,msg){
  // keep the popup open; refresh its "You own" line and the editor
  const modal=box.closest('.modal');const q=info.kind==='set'?curQty('set',info.id):figTotal(info.id);
  if(modal){const meta=modal.querySelector('.mbody .meta');if(meta){const own=[...meta.querySelectorAll('span')].find(s=>/^You own/.test(s.textContent));
    const txt=info.kind==='set'?(q>1?`You own ×${q}`:''):(q?`You own ×${q}`:'');
    if(own){if(txt)own.textContent=txt;else own.remove();}else if(txt){const s=document.createElement('span');s.textContent=txt;meta.appendChild(s);}}}
  paintEditor(box,info,msg);
}
function closePopup(){const bg=document.getElementById('setmodal');if(!bg)return;const x=bg.querySelector('.mclose');if(x)x.click();else bg.remove();}
try{new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;const bg=n.id==='setmodal'?n:(n.querySelector&&n.querySelector('#setmodal'));
  if(bg)requestAnimationFrame(()=>requestAnimationFrame(()=>enhance(bg)));}}).observe(document.body,{childList:true});}catch(e){}

// ---------- review sheet ----------
function openReview(){
  const rows=[];for(const kind of ['set','fig'])for(const id in (kind==='set'?EDITS.sets:EDITS.figs)){const s=status(kind,id);if(!s)continue;const r=rec(kind,id),fq=fileQty(kind,id);
    const nm=kind==='set'?(SETS[id]?SETS[id][0]:id):(r.name||figLabel(id));
    const what=s==='added'?`Added ×${r.q}`:s==='removed'?`Removed (file has ×${fq})`:`×${r.q}${r.q!==fq?` (file ×${fq})`:''}${r.cond?' · '+r.cond:''}`;
    rows.push(`<div class="ce-row"><img alt="" src="${kind==='set'?setImg(id):fImg(id)}" onerror="this.outerHTML='<div class=&quot;ce-noimg&quot;></div>'"><div class="ce-t"><b>${H(nm)}</b>${H(kind==='set'?sn(id):id)} · ${H(what)}</div><button type="button" class="ce-ghost" data-k="${kind}" data-id="${H(id)}">Undo</button></div>`);}
  const bg=sheet('ce-rev-bg','In-app edits',`<div class="ce-head">${ICON_BRICK}<h2>In-app edits</h2></div><div class="ce-res ce-list"><p class="muted small" style="margin-top:0">These sit on top of your uploaded file and stay when you upload it again. Undo puts an item back to what your file says.</p>${rows.join('')||'<p class="ce-empty">No in-app edits.</p>'}${rows.length?'<div class="ce-go"><button type="button" class="ce-danger" data-all="1">Clear all in-app edits</button></div>':''}</div>`);
  bg.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{undoEdit(b.dataset.k,b.dataset.id);openReview();});
  const all=bg.querySelector('[data-all]');if(all)all.onclick=()=>{if(confirm('Clear all in-app edits? Your collection goes back to your uploaded file.')){clearAll();closeSheet('ce-rev-bg');toast('Back to your uploaded file');}};
}

// ---------- export CSV (BrickLink-style columns; StudScore reads it back) ----------
function exportCSV(){
  const q=s=>{s=String(s==null?'':s);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
  const lines=['Item Type,Item No,Item Name,Quantity,Condition,Missing Parts,Missing Notes,Missing Minifigs'];
  const mc=(kind,id)=>{const m=missRec(kind,id)||{};return [m.n||'',m.note||'',Object.entries(m.figs||{}).filter(e=>e[1]>0).map(e=>e[0]+' x'+e[1]).join('; ')];};
  const own=(typeof owned!=='undefined'&&owned)||{};
  Object.keys(own).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).forEach(k=>lines.push(['Set',k,SETS[k]?SETS[k][0]:'',own[k],curCond('set',k)||'',...mc('set',k)].map(q).join(',')));
  const F=exFigs();Object.keys(F).sort().forEach(id=>lines.push(['Minifig',id,F[id].name||figLabel(id),F[id].qty,curCond('fig',id)||'',...mc('fig',id)].map(q).join(',')));
  const blob=new Blob([lines.join('\n')+'\n'],{type:'text/csv'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=`studscore-collection-${today()}.csv`;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);
  const ex=(typeof extras!=='undefined'&&extras)||{};
  toast(`Exported ${Object.keys(own).length} sets and ${Object.keys(F).length} minifigs${(ex.looseParts||ex.figParts)?'. Loose parts stay in your original file':''}`);
}

// Read the Missing columns back from an exported CSV (only fills items that have no missing record on this device)
function importMissing(text){
  if(isDemo()||typeof csvRows!=='function')return;text=String(text||'').replace(/^\ufeff/,'');if(!/missing parts/i.test(text.split(/\r?\n/)[0]||''))return;
  const rows=csvRows(text,',');if(rows.length<2)return;const Hh=rows[0].map(h=>String(h).trim().toLowerCase());
  const ix=n=>Hh.indexOf(n),iT=ix('item type'),iN=ix('item no'),iP=ix('missing parts'),iO=ix('missing notes'),iF=ix('missing minifigs');if(iN<0||iP<0)return;
  let n=0;for(const r of rows.slice(1)){const type=String(r[iT]||'').toLowerCase().startsWith('m')?'fig':'set';let id=String(r[iN]||'').trim();if(!id)continue;
    if(type==='set'&&typeof SETS!=='undefined'&&!SETS[id]&&SETS[id+'-1'])id+='-1';if(missRec(type,id))continue;
    const figs={};String(iF>=0?r[iF]||'':'').split(';').forEach(x=>{const m=/^\s*(\S+)\s+x(\d+)\s*$/.exec(x);if(m)figs[m[1]]=+m[2];});
    const rec_={n:parseInt(r[iP])||0,note:iO>=0?String(r[iO]||''):'',figs};
    if(rec_.n||rec_.note.trim()||Object.keys(figs).length){setMiss(type,id,rec_);n++;}}
  if(n)render(owned);
}

// ---------- start ----------
window.StudCollEdit={missing:()=>JSON.parse(JSON.stringify(MISS)),setMiss,figInfo,edits:()=>JSON.parse(JSON.stringify(EDITS)),setEdit,undoEdit,clearAll,status,openAdd,exportCSV};
try{
  if(!isDemo()){if(!getBase())snapBase();mergeMeta();}
  if(!isDemo()&&(Object.keys(EDITS.sets).length||Object.keys(EDITS.figs).length)&&typeof owned!=='undefined')render(owned);
  else paintBars();
}catch(e){console.error('colledit init',e);}
})();
