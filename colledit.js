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
// LOOSE FIGS FROM FILES: if the importer found no minifigs, findLooseFigs() re-reads the raw file for minifig numbers.
// SEVERAL UPLOADS: see 'SOURCE RULE' below (sets file + figs file add together; same kind/name/content replaces).
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
// Start fresh: a 2x1 brick with a turn-back arrow (original SVG, no logos)
const ICON_RESET='<svg class="ce-ic" viewBox="0 0 26 24" aria-hidden="true"><rect x="5" y="9" width="5" height="3.4" rx="1" fill="#F2CD37" stroke="#05131D" stroke-width="1.4"/><rect x="14" y="9" width="5" height="3.4" rx="1" fill="#F2CD37" stroke="#05131D" stroke-width="1.4"/><rect x="2" y="12" width="20" height="9" rx="1.6" fill="#F2CD37" stroke="#05131D" stroke-width="1.6"/><path d="M4.5 6.5A9 9 0 0 1 20 4.5" fill="none" stroke="#C91A09" stroke-width="2.2" stroke-linecap="round"/><path d="M20.8 1.2l.2 4.6-4.5.4" fill="none" stroke="#C91A09" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
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
  const has=(typeof owned!=='undefined'&&owned&&Object.keys(owned).length)||Object.keys(exFigs()).length||Object.keys(EDITS.sets).length||Object.keys(EDITS.figs).length;
  const b=getBase()||(has?snapBase():{sets:{},figs:{}}); // nothing at all (e.g. after Start fresh): don't save an empty base
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
  try{const S=(typeof SOURCES!=='undefined'&&SOURCES)||[];if(S.length===1&&S[0].meta&&S[0].meta.fmt)m.fmt=S[0].meta.fmt;else if(S.length>1)m.fmt=S.map(x=>x.legacy?'earlier':({sets:'sets',figs:'minifigs',mixed:'sets and minifigs',parts:'parts'})[x.kind]||'other').join(' + ');}catch(e){} // shows as "your sets + minifigs file" after a reload
  for(const k in EDITS.sets){const r=EDITS.sets[k];if(!(r.q>0))continue;const e=m.sets[k]||(m.sets[k]={q:0,v:0,vq:0,vn:null,vu:null,c:0,cq:0,d:null,cond:{}});
    e.q=r.q;if(r.cond){e.cond={[r.cond]:r.q};m.has.cond=1;}}
  for(const id in EDITS.figs){const r=EDITS.figs[id];if(!(r.q>0))continue;const e=m.figs[id]||(m.figs[id]={q:0,v:0,vq:0});e.q=r.q;if(r.cond)e.cond={[r.cond]:r.q};}
  sv(LS.meta,m);
  try{if(window.StudCollection&&typeof StudCollection.reloadMeta==='function')StudCollection.reloadMeta();}catch(e){} // live basis once Cole adds the hook (cole-diffs/)
}

// ---------- several uploads: the base layer is a list of named sources (localStorage 'studCollSources') ----------
// BrickLink exports sets and minifigs as separate files, so a second upload can ADD to the collection instead of replacing it.
// SOURCE RULE:
//   - Each upload becomes one source: {name, kind, hash, sets, figs, parts, meta, be}. kind comes from the contents:
//     'sets' (only sets), 'figs' (only minifigs), 'mixed' (both), 'parts' (only parts).
//   - "Add to my collection" (default): the new file replaces any loaded source with the SAME kind, the same file name,
//     or the same contents; every other source stays. Exception: two different files that each hold sets AND minifigs
//     ('mixed') are kept side by side (replaced only by the same name or contents), since overlaps count the highest qty anyway. So a newer sets export replaces the old sets export, the figs file
//     sits beside it, and uploading the same file twice never doubles anything.
//   - "Replace my collection": the new file becomes the only source.
//   - If the same item is in two sources (say a sets file and a mixed file), it counts the HIGHEST quantity, never the sum.
//     Loose and minifig part counts work the same way (highest, not summed).
//   - The base layer = all sources merged. In-app edits and missing parts sit on top, exactly as before.
// HOW IT HOOKS IN (no collection.js change): each file is first run through the normal upload chain with rendering held
// back, to capture what importer.js, collection.js (studMeta) and beval.js (studBEFile) read from it. Then all sources are
// written out as one BrickLink-style CSV (with the value, cost, date, condition, currency and BrickEconomy columns those
// files already understand) and loaded through the same chain once. Every module sees one merged collection, and it all
// persists across reloads the same way a single upload does.
const SRC_KEY='studCollSources';
let SOURCES=ld(SRC_KEY,null);
let capturing=false,composing=false,composeNote='';
const saveSources=()=>sv(SRC_KEY,SOURCES||[]);
function hashText(t){let h=5381;for(let i=0;i<t.length;i++)h=((h<<5)+h+t.charCodeAt(i))>>>0;return h.toString(36)+'.'+t.length;}
function kindOf(s){const ns=Object.keys(s.sets||{}).length,nf=Object.keys(s.figs||{}).length,np=(s.figParts||0)+(s.looseParts||0);return ns&&nf?'mixed':ns?'sets':nf?'figs':np?'parts':'empty';}
const KIND_LABEL={sets:'Sets file',figs:'Minifigs file',mixed:'Sets and minifigs file',parts:'Parts file',empty:'Empty file'};
const plural=(n,w)=>`${n.toLocaleString()} ${w}${n===1?'':'s'}`;
function srcCounts(s){const b=[];const ns=Object.keys(s.sets||{}).length,nf=Object.keys(s.figs||{}).length,np=(s.figParts||0)+(s.looseParts||0);
  if(ns)b.push(plural(ns,'set'));if(nf)b.push(plural(nf,'minifig'));if(np)b.push(plural(np,'part'));return b.join(', ')||'nothing we recognize';}
function srcTitle(s){return s.legacy?'Earlier upload':KIND_LABEL[s.kind]||'File';}
function sourcesNote(){const S=SOURCES||[];if(!S.length)return '';const parts=S.map(s=>`${srcTitle(s)} (${srcCounts(s)})`);
  return 'Loaded: '+(parts.length>1?parts.slice(0,-1).join(', ')+' and '+parts[parts.length-1]:parts[0])+'.';}
function slimMeta(m){return m?{cur:m.cur||null,fmt:m.fmt||'',sets:m.sets||{},figs:m.figs||{},parts:m.parts||{v:0,q:0}}:null;}
function hasCollection(){if((SOURCES||[]).length)return true;const b=getBase();if(b&&(Object.keys(b.sets).length||Object.keys(b.figs).length))return true;
  return typeof owned!=='undefined'&&owned&&Object.keys(owned).length>0;}
// a collection loaded before this feature becomes one source ("Earlier upload")
function migrateLegacy(){
  if(SOURCES)return;SOURCES=[];if(isDemo())return;
  const b=getBase();if(!b||!(Object.keys(b.sets).length||Object.keys(b.figs).length))return;
  const ex=ld('brickExtras',null)||{},m=fileMeta()||(()=>{const c=ld(LS.meta,null);return c&&!c.ce?c:null;})(),be=ld('studBEFile',null);
  const s={id:'legacy',legacy:1,name:'Earlier upload',hash:'',t:b.t||Date.now(),sets:Object.assign({},b.sets),figs:JSON.parse(JSON.stringify(b.figs)),
    figParts:ex.figParts||0,looseParts:ex.looseParts||0,meta:slimMeta(m),be:be?{sets:be.sets||{},figs:be.figs||{}}:null};
  s.kind=kindOf(s);SOURCES.push(s);saveSources();
}
// Loose minifigs the importer couldn't see: files with no Item Type / Category column (a plain "Item No,Qty" list),
// a pasted list, or a Brickset/other CSV with minifig numbers. Recognizes fig-123456 ids, BrickLink ids known to figids.js
// (sw0001, col483, colshr01 ...), and BrickLink CMF-style ids (col..., ending in digits). Used only when the importer found no minifigs.
function looksFig(c){
  if(!c||c.length>24||!/\d/.test(c))return null;
  if(/^fig-\d{6}$/i.test(c))return (typeof FIGNAMES!=='undefined'&&FIGNAMES[c.toLowerCase()])?c.toLowerCase():null;
  if(!/^[a-z]{2,8}\d{2,5}[a-z]?$/i.test(c))return null;
  if(typeof SETS!=='undefined'&&(SETS[c]||SETS[c+'-1']))return null;
  try{const r=typeof figIds==='function'?figIds(c):null;if(r&&r.fig)return c;}catch(e){}
  return /^col[a-z]*\d+$/i.test(c)?c:null;
}
function findLooseFigs(text){
  text=String(text||'').replace(/^\ufeff/,'');const found={};if(!text.trim()||/<ITEM>/i.test(text))return found;
  for(const line of text.split(/\r?\n/)){
    const cells=(/[,\t;]/.test(line)?line.split(/[,\t;]/):line.trim().split(/\s+/)).map(c=>c.trim().replace(/^"|"$/g,'')); // a pasted line like "sw0002 1" splits on spaces
    for(let i=0;i<cells.length;i++){const id=looksFig(cells[i]);if(!id)continue;
      const q=parseInt(cells[i+1]);const f=found[id]||(found[id]={qty:0,name:'',theme:''});f.qty+=(q>0&&q<1000?q:1);break;}
  }
  for(const id in found){const fid=/^fig-/i.test(id)?id:((typeof figIds==='function'&&figIds(id).fig)||id);
    found[id].name=figLabel(id);found[id].theme=figThemeOf(fid,/^fig-/i.test(id)?blOf(id):id);}
  return found;
}
// run one file through the normal chain with rendering held back, and keep what each module read from it
function capture(text,name){
  capturing=true;try{loadCollection(text);}finally{capturing=false;}
  const own=Object.assign({},(typeof owned!=='undefined'&&owned)||{}),ex=(typeof extras!=='undefined'&&extras)||{};
  const figs={};for(const id in (ex.figs||{})){const f=ex.figs[id];if(f&&f.qty>0)figs[id]={qty:f.qty,name:f.name||'',theme:f.theme||''};}
  if(!Object.keys(figs).length)Object.assign(figs,findLooseFigs(text));
  const m=ld(LS.meta,null),be=ld('studBEFile',null);
  const s={id:'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:String(name||'Upload').slice(0,80),hash:hashText(String(text||'')),t:Date.now(),
    sets:own,figs,figParts:ex.figParts||0,looseParts:ex.looseParts||0,meta:slimMeta(m),be:be?{sets:be.sets||{},figs:be.figs||{}}:null,fmt:ex.format||''};
  s.kind=kindOf(s);return s;
}
// all sources -> one BrickLink-style CSV that importer.js, collection.js and beval.js all read
function buildCSV(S){
  const q=v=>{v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const num=v=>v==null||v===''||!isFinite(v)?'':String(Math.round(v*10000)/10000);
  const lines=[['Item Type','Item No','Description','Category','Quantity','Condition','Value','Value New','Value Used','Price Paid','Date Acquired','Currency','BrickEconomy Value','BrickEconomy Value New','BrickEconomy Value Used'].join(',')];
  const best={};S.forEach(s=>{for(const k in s.sets){const n=s.sets[k]|0;const key='S|'+k;if(n>0&&(!best[key]||n>best[key].n||(n===best[key].n&&s.t>best[key].s.t)))best[key]={s,n,id:k,type:'S'};}
    for(const id in s.figs){const n=s.figs[id].qty|0;const key='M|'+id;if(n>0&&(!best[key]||n>best[key].n||(n===best[key].n&&s.t>best[key].s.t)))best[key]={s,n,id,type:'M'};}});
  for(const key in best){const {s,n,id,type}=best[key];const isS=type==='S';
    const me=s.meta&&(isS?s.meta.sets:s.meta.figs)&&(isS?s.meta.sets:s.meta.figs)[id],be=s.be&&(isS?s.be.sets:s.be.figs)&&(isS?s.be.sets:s.be.figs)[id];
    const f=isS?null:s.figs[id];
    const desc=isS?(SETS[id]?SETS[id][0]:''):(f.name||figLabel(id));
    const cat=isS?'Sets':'Minifigures / '+String(f.theme||'Other').replace(/\//g,'-');
    const val=me&&me.vq?me.v/me.vq:'',cost=me&&me.cq?me.c/me.cq:'',bev=be&&be.vq?be.v/be.vq:'';
    const conds=Object.entries((me&&me.cond)||{}).filter(e=>e[1]>0);let left=n;const rows=[];
    for(const [c,cq] of conds){if(left<=0)break;const take=Math.min(cq,left);rows.push([c,take]);left-=take;}
    if(left>0)rows.push(['',left]);
    for(const [c,cq] of rows)lines.push([isS?'S':'M',id,desc,cat,cq,c,num(val),num(me&&me.vn),num(me&&me.vu),num(cost),(me&&me.d)||'',(s.meta&&s.meta.cur)||'',num(bev),num(be&&be.vn),num(be&&be.vu)].map(q).join(','));
  }
  let fp=null,lp=null;S.forEach(s=>{if((s.figParts||0)>((fp&&fp.figParts)||0))fp=s;if((s.looseParts||0)>((lp&&lp.looseParts)||0))lp=s;});
  if(fp)lines.push(['P','973','Minifig parts','Minifig Parts',fp.figParts,'','','','','','','','','',''].map(q).join(','));
  if(lp){const pm=lp.meta&&lp.meta.parts,pv=pm&&pm.v?pm.v/lp.looseParts:'';lines.push(['P','3001','Loose parts','Parts',lp.looseParts,'',num(pv),'','','','',(lp.meta&&lp.meta.cur)||'','','',''].map(q).join(','));}
  return lines.join('\n')+'\n';
}
function compose(origText){
  composeNote=sourcesNote();composing=true;
  try{loadCollection(buildCSV(SOURCES||[]));}finally{composing=false;}
  if(origText){try{importMissing(origText);}catch(e){}}
}
function ingest(text,name,mode){
  migrateLegacy();
  let s;try{s=capture(text,name);}catch(e){console.error('colledit capture',e);capturing=false;}
  if(!s){compose(null);return null;}
  if(mode==='replace')SOURCES=s.kind==='empty'?[]:[s];
  else if(s.kind!=='empty'){SOURCES=(SOURCES||[]).filter(x=>!((x.kind===s.kind&&s.kind!=='mixed')||(x.name===s.name&&!x.legacy)||(s.hash&&x.hash===s.hash)));SOURCES.push(s);}
  saveSources();compose(text);return s;
}
function removeSource(id){SOURCES=(SOURCES||[]).filter(x=>x.id!==id);saveSources();compose(null);}

// ---------- wrap render + loadCollection (outermost) ----------
let freshUpload=false,resetting=false;
if(typeof render==='function'){const _r=render;render=function(o){
  if(capturing||resetting)return; // a file being read for its source, or Start fresh about to reload: nothing is drawn or saved
  try{if(!isDemo()){if(freshUpload){freshUpload=false;const fm=ld(LS.meta,null);if(fm)sv(LS.metaFile,fm);snapBase();absorb();
    if(typeof extras!=='undefined'&&extras){extras.msg='';extras.note=composeNote;}}apply();}}catch(e){console.error('colledit apply',e);}
  const r=_r.apply(this,arguments);try{paintBars();decorate();}catch(e){console.error('colledit',e);}return r;};}
if(typeof loadCollection==='function'){const _l=loadCollection;loadCollection=function(text){
  if(capturing)return _l.apply(this,arguments);
  if(!composing){ // a direct call (Start my own, scripts): one source, replacing the rest
    if(isDemo())SOURCES=[];return ingest(text,'Upload','replace');}
  freshUpload=!isDemo();rm(LS.metaFile);
  const r=_l.apply(this,arguments);
  try{const m=ld(LS.meta,null);if(m)sv(LS.metaFile,m);mergeMeta();}catch(e){}
  freshUpload=false;
  try{const k=JSON.parse(localStorage.getItem('brickExtras')||'null');if(k){k.note=composeNote;localStorage.setItem('brickExtras',JSON.stringify(k));}}catch(e){}
  return r;};}
// The demo replaces your collection: forget the sources and base snapshot (your app edits stay saved for your own collection)
const demoBtn=document.getElementById('demo');
if(demoBtn)demoBtn.addEventListener('click',()=>{rm(LS.base);rm(LS.metaFile);SOURCES=[];saveSources();},true);

// ---------- upload: Add to my collection, or Replace it ----------
function readAndAsk(file){if(!file)return;file.text().then(t=>askUpload(t,file.name)).catch(e=>console.error(e));}
document.addEventListener('change',e=>{const t=e.target;if(!t||t.id!=='file')return;e.stopPropagation(); // app.js's own handler would replace the collection
  const f=t.files&&t.files[0];readAndAsk(f);setTimeout(()=>{try{t.value='';}catch(x){}},0);},true);
document.addEventListener('click',e=>{const b=e.target&&e.target.closest&&e.target.closest('#go');if(!b)return;e.stopPropagation();e.preventDefault();
  askUpload(document.getElementById('paste').value,'Pasted list');},true);
function askUpload(text,name){
  if(isDemo()||!hasCollection()){ingest(text,name,'replace');return;}
  migrateLegacy();
  let P=null;try{P=parseCollection(text);}catch(e){}
  const pv={sets:(P&&P.sets)||{},figs:(P&&P.figs)||{},figParts:(P&&P.figParts)||0,looseParts:(P&&P.looseParts)||0};
  if(!Object.keys(pv.figs).length)Object.assign(pv.figs,findLooseFigs(text));
  pv.kind=kindOf(pv);
  if(pv.kind==='empty'){toast("We couldn't find anything to add in that file. Your collection didn't change.");return;}
  const h=hashText(String(text||'')),S=SOURCES||[];
  const same=S.find(x=>x.hash&&x.hash===h),rep=S.filter(x=>(x.kind===pv.kind&&pv.kind!=='mixed')||(x.name===name&&!x.legacy));
  const addNote=same?'This file is already loaded, so adding it again won\'t double anything.':rep.length?`Replaces your earlier ${rep.map(x=>srcTitle(x).toLowerCase()+(x.legacy?'':' ('+H(x.name)+')')).join(' and ')} and keeps everything else.`:'Keeps everything you already have and adds this file to it.';
  const bg=sheet('ce-up-bg','Add this file?',`<div class="ce-head">${ICON_BRICK}<h2>Add this file?</h2></div>
<div class="ce-pick" style="padding-top:0">
<div class="ce-upfile"><b>${H(name)}</b><div class="small">${KIND_LABEL[pv.kind]}: ${srcCounts(pv)}</div></div>
<div class="ce-lbl">You already have</div><div class="ce-uphave">${S.map(x=>`<div>${H(srcTitle(x))}${x.legacy?'':' · '+H(x.name)} <span class="muted small">(${srcCounts(x)})</span></div>`).join('')||'<div>Your collection</div>'}</div>
<div class="ce-upopts">
<button type="button" class="ce-upbtn ce-upadd" data-mode="add">${ICON_BRICK}<span><b>Add to my collection</b><small>${addNote}</small></span></button>
<button type="button" class="ce-upbtn ce-uprep" data-mode="replace"><span><b>Replace my collection</b><small>Start over with only this file. Your in-app edits and missing parts stay.</small></span></button>
</div><div class="ce-go"><button type="button" class="ce-ghost" data-mode="cancel">Cancel</button></div></div>`);
  bg.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{const m=b.dataset.mode;closeSheet('ce-up-bg');if(m==='cancel')return;
    const s=ingest(text,name,m);
    if(s)toast(m==='replace'?`Replaced your collection with ${name}`:(same?`${name} was already loaded. Nothing doubled.`:`Added ${name}: ${srcCounts(s)}`));});
  setTimeout(()=>{const a=bg.querySelector('.ce-upadd');if(a)a.focus();},30);
}
// loaded-files panel (Score tab, under the upload box) and the sources sheet
function sourcesHTML(){const S=SOURCES||[];
  return S.map(x=>`<div class="ce-src"><span class="ce-srct">${x.kind==='figs'?ICON_FIG:ICON_BRICK}<span><b>${H(srcTitle(x))}</b>${x.legacy?'':` · ${H(x.name)}`}<small>${srcCounts(x)}</small></span></span><button type="button" class="ce-ghost" data-src-rm="${H(x.id)}">Remove</button></div>`).join('');}
function paintSources(){
  const ib=document.getElementById('importbox');if(!ib)return;
  let box=document.getElementById('ce-sources');
  const S=isDemo()?[]:(SOURCES||[]);
  if(!S.length){if(box)box.remove();return;}
  if(!box){box=document.createElement('div');box.id='ce-sources';box.className='ce-bar ce-srcbox';ib.insertAdjacentElement('afterend',box);}
  box.innerHTML=`<div class="ce-srch">Loaded files</div>${sourcesHTML()}<div class="ce-go" style="margin-top:6px"><button type="button" class="ce-add" data-ce="upload">${ICON_BRICK}Upload another file</button><button type="button" class="ce-ghost bk-btn" data-bk="backup">${(window.StudBackup&&StudBackup.IC_BACKUP)||''}Back up my collection</button><button type="button" class="ce-ghost ce-fresh" data-ce="fresh">${ICON_RESET}Start fresh</button></div><div class="muted small bk-last"></div><div class="muted small">BrickLink exports sets and minifigs separately. Upload both and they add together.</div>`;
}
document.addEventListener('click',e=>{
  const rmb=e.target.closest&&e.target.closest('[data-src-rm]');
  if(rmb){e.preventDefault();if(rmb.dataset.armed!=='1'){rmb.dataset.armed='1';rmb.textContent='Tap again to remove';rmb.classList.add('ce-danger');return;}
    const id=rmb.dataset.srcRm,x=(SOURCES||[]).find(s=>s.id===id);removeSource(id);toast(`Removed ${x?srcTitle(x).toLowerCase():'that file'} from your collection`);
    const sh=document.getElementById('ce-src-bg');if(sh){closeSheet('ce-src-bg');if((SOURCES||[]).length)openSources();}return;}
  const up=e.target.closest&&e.target.closest('[data-ce="upload"],[data-ce="files"]');
  if(up){e.preventDefault();if(up.dataset.ce==='files')openSources();else pickFile();}
});
function pickFile(){let inp=document.getElementById('ce-file');if(!inp){inp=document.createElement('input');inp.type='file';inp.id='ce-file';inp.hidden=true;inp.accept='.csv,.xml,.txt,text/csv,text/xml,application/xml,text/plain';document.body.appendChild(inp);
  inp.addEventListener('change',()=>{const f=inp.files&&inp.files[0];closeSheet('ce-src-bg');readAndAsk(f);setTimeout(()=>{inp.value='';},0);});}inp.click();}
function openSources(){sheet('ce-src-bg','Loaded files',`<div class="ce-head">${ICON_BRICK}<h2>Loaded files</h2></div><div class="ce-pick" style="padding-top:0">${sourcesHTML()||'<p class="ce-empty">No files loaded.</p>'}<div class="ce-go"><button type="button" class="ce-add" data-ce="upload">${ICON_BRICK}Upload another file</button></div><p class="muted small">Removing a file takes its sets and minifigs out. Your in-app edits and missing parts stay.</p></div>`);}

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
  try{if(typeof SETFIGS!=='undefined'&&typeof owned!=='undefined'&&owned&&Object.keys(owned).some(k=>(SETFIGS[k]||[]).some(x=>x[0]===fid)))return fid;}catch(e){} // a set fig: same id as the set's, so it merges
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
.ce-badge.ok{background:#4B9F4A;color:#F2F3F2;display:inline-flex;align-items:center;gap:3px;padding-left:3px}.ce-badge.ok .pl-stic{width:14px;height:13px}
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
.ce-legacy{margin-top:8px;font-size:13px;color:#E4E5E2;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ce-legacy .ce-ghost{margin:0}
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
.ce-fopt{display:flex;gap:10px;align-items:flex-start;padding:10px;margin:8px 0;border:2px solid #3A3D40;border-radius:8px;cursor:pointer}
.ce-fopt:has(input:checked){border-color:#F2CD37}.ce-fopt input{margin-top:3px;width:18px;height:18px;accent-color:#F2CD37;flex:none}
.ce-fopt b{display:block}.ce-fopt small{display:block;color:#A0A5A9;margin-top:3px;line-height:1.35}
.ce-fkeys{display:flex;gap:8px;align-items:center;margin:4px 2px 8px;font-size:14px}.ce-fkeys input{width:18px;height:18px;accent-color:#C91A09}
.ce-fl{margin:4px 0 8px 18px;padding:0;font-size:13px;line-height:1.5;word-break:break-word}
.ce-fresh .ce-ic{margin-right:4px}
.ce-edit{margin:12px 0 4px;padding:10px 12px;background:#05131D;border:2px solid #F2CD37;border-radius:10px}
.ce-edit .ce-eh{display:flex;align-items:center;gap:8px;font-weight:800;color:#F2CD37}
.ce-edit .ce-eh .ce-badge{position:static}
.ce-edit .ce-lbl{color:#E4E5E2;margin-top:10px}
.ce-edit .ce-msg{font-size:12px;color:#A5CA18;min-height:1em;margin-top:6px}
.ce-toast{position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:80;background:#05131D;color:#F2F3F2;border:2px solid #A5CA18;border-radius:8px;padding:10px 14px;font-weight:700;font-size:14px;max-width:90vw;box-shadow:0 4px 14px rgba(0,0,0,.5)}
.ce-list .ce-row{cursor:default}
.ce-list .ce-row button{margin:0;padding:6px 10px;font-size:12px}
.ce-empty{color:#E4E5E2;font-size:14px;padding:10px 0}
.ce-upfile{background:#05131D;border:2px solid #6C6E68;border-radius:8px;padding:10px 12px;font-size:15px;overflow-wrap:anywhere}
.ce-upfile .small{margin-top:2px;color:#E4E5E2}
.ce-uphave{font-size:14px;line-height:1.6}
.ce-upopts{display:flex;flex-direction:column;gap:10px;margin-top:14px}
.ce-upbtn{display:flex;align-items:center;gap:10px;text-align:left;margin:0;padding:12px 14px;border-radius:8px;width:100%;box-sizing:border-box}
.ce-upbtn span{display:block}.ce-upbtn b{display:block;font-size:16px}.ce-upbtn small{display:block;font-weight:400;font-size:12px;margin-top:2px;line-height:1.35}
.ce-upadd{background:#F2CD37;color:#05131D;border:2px solid #05131D;box-shadow:inset 0 3px 0 #FFE68A,inset 0 -3px 0 #A8861A}
.ce-upadd .ce-ic{width:30px;height:24px}
.ce-uprep{background:#3A3D40;color:#F2F3F2;border:2px solid #C91A09}
.ce-srcbox{flex-direction:column;align-items:stretch;gap:6px;margin-top:-6px}
.ce-srch{font-weight:800;color:#F2CD37}
.ce-src{display:flex;align-items:center;gap:8px;justify-content:space-between;background:#05131D;border-radius:6px;padding:6px 8px}
.ce-src .ce-srct{display:flex;align-items:center;gap:8px;min-width:0;font-size:14px;overflow-wrap:anywhere}
.ce-src small{display:block;color:#E4E5E2;font-size:12px}
.ce-src button{margin:0;flex:0 0 auto}
.ce-pick .ce-src{margin-bottom:6px}
`;document.head.appendChild(css);

// ---------- toast ----------
let toastT=0;
function toast(msg){let t=document.getElementById('ce-toast');if(!t){t=document.createElement('div');t.id='ce-toast';t.className='ce-toast';t.setAttribute('role','status');document.body.appendChild(t);}
  t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true;},2600);}

// ---------- bars on the Sets and Figs tabs ----------
function counts(){let a=0,e=0,r=0;for(const kind of ['set','fig'])for(const id in (kind==='set'?EDITS.sets:EDITS.figs)){const s=status(kind,id);if(s==='added')a++;else if(s==='edited')e++;else if(s==='removed')r++;}return {a,e,r,n:a+e+r};}
function paintBars(){
  try{paintSources();}catch(e){}
  [['sets','set'],['figs','fig']].forEach(([tab,kind])=>{
    const host=document.getElementById(tab==='sets'?'mysets':'myfigs');if(!host)return;
    let bar=document.getElementById('ce-bar-'+tab);
    if(!bar){bar=document.createElement('div');bar.id='ce-bar-'+tab;bar.className='ce-bar';host.parentNode.insertBefore(bar,host);}
    if(isDemo()){bar.innerHTML=`<span class="ce-sum">This is the demo collection. Start your own to add ${kind==='set'?'sets':'minifigs'} here.</span><span class="ce-sp"></span><button type="button" class="ce-add" data-ce="own">${ICON_BRICK}Start my own</button>`;return;}
    const c=counts(),bits=[];if(c.a)bits.push(c.a+' added');if(c.e)bits.push(c.e+' edited');if(c.r)bits.push(c.r+' removed');
    bar.innerHTML=`<button type="button" class="ce-add" data-ce="add" data-kind="${kind}">${kind==='set'?ICON_BRICK:ICON_FIG}Add ${kind==='set'?'a set':'a minifig'}</button><span class="ce-sp"></span>${c.n?`<button type="button" class="ce-ghost" data-ce="review" title="${H(bits.join(' · '))}">In-app edits (${c.n})</button>`:''}${(SOURCES||[]).length?`<button type="button" class="ce-ghost" data-ce="files" title="${H(sourcesNote())}">Files (${SOURCES.length})</button>`:''}<button type="button" class="ce-ghost" data-ce="export" title="Download your collection, with in-app edits, as a CSV you can re-upload">Export CSV</button><button type="button" class="ce-ghost bk-btn" data-bk="backup" title="Download a backup file you can restore after clearing your browser">${(window.StudBackup&&StudBackup.IC_BACKUP)||''}Back up</button><button type="button" class="ce-ghost ce-fresh" data-ce="fresh" title="Reset minifig ticks, recount achievements, or remove everything saved on this device">${ICON_RESET}Start fresh</button>`;
  });
}
function decorate(){
  if(isDemo())return;
  document.querySelectorAll('#mysets .setcard[data-num]').forEach(c=>mark(c,status('set',c.dataset.num),hasMiss('set',c.dataset.num)?missSummary('set',c.dataset.num):'',isDone('set',c.dataset.num)));
  document.querySelectorAll('#myfigs .figcard').forEach(c=>{const id=c.getAttribute('data-id')||((c.querySelector('img.setimg')||{}).alt);if(id)mark(c,status('fig',id),hasMiss('fig',id)?missSummary('fig',id):'');});
}
function mark(card,s,miss,done){card.querySelectorAll(':scope > .ce-badge').forEach(x=>x.remove());card.classList.toggle('ce-flag',!!(s||miss||done));
  if(done&&!miss)card.insertAdjacentHTML('afterbegin',`<span class="ce-badge ok ce-tr" title="Complete: every part and minifig checked">${STAMP_IC()}Complete</span>`);
  if(miss)card.insertAdjacentHTML('afterbegin',`<span class="ce-badge ms ce-tr" title="Missing: ${H(miss)}">Missing</span>`);
  if(s==='added'||s==='edited')card.insertAdjacentHTML('afterbegin',`<span class="ce-badge${s==='edited'?' ed':''}" title="${s==='added'?'Added in StudScore':'Edited in StudScore'}">${s==='added'?'Added':'Edited'}</span>`);}

document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-ce]');if(!b)return;
  const a=b.dataset.ce;
  if(a==='add'){e.preventDefault();openAdd(b.dataset.kind||'set');}
  else if(a==='review'){e.preventDefault();openReview();}
  else if(a==='export'){e.preventDefault();exportCSV();}
  else if(a==='fresh'){e.preventDefault();openFresh();}
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
  const fid=figFid(id,Object.keys(inset)),loose=curQty('fig',id),s=inset[id]||(fid&&inset[fid]),from=[];
  if(s)for(const k of s.from||[]){const q=s.per?(s.per[k]|0):0;if(q||!s.per)from.push({k,q:q||1});}
  // loose copies of the same minifig saved under another number (one card shows them together; this popup edits this number's)
  let oth=0;const alts=fid?figAlts(fid):[];for(const k in exFigs())if(k!==id&&(k===fid||alts.includes(lcs(k))||(fid&&figFid(k)===fid)))oth+=curQty('fig',k);
  const ins=s?s.qty:0;return {loose,ins,oth,total:loose+ins+oth,from,fid};
}
function inSetsCount(id){return figInfo(id).ins;}
const figTotal=id=>figInfo(id).total;

// ---------- missing parts: the Parts checklist (parts.js) ----------
// The old count + note (before the checklist) are still read and shown until cleared.
// localStorage 'studMissing' {sets:{num:{n,note,t}}, figs:{id:{n,note,t}}}. Kept across uploads and edits.
// A set's minifigs are lines in its Parts checklist. They count as owned (Figs tab, "from sets") ONLY when ticked there
// (figsFromSets below). The old "Minifigs missing from this set" checkboxes (ticked = missing) are gone: people ticked
// them to mean "I have it", which took the fig away. Old records of that kind are dropped once, below.
function missRec(kind,id){return (kind==='set'?MISS.sets:MISS.figs)[id]||null;}
const PARTS=()=>window.StudParts||null;
// COMPLETE: every part and minifig ticked in a checklist started by hand (parts.js isComplete; sticker sheets are extras)
function isDone(kind,id){if(kind!=='set'||isDemo())return false;const P=PARTS();try{return !!(P&&P.isComplete&&P.isComplete(kind,id))&&!hasMiss(kind,id);}catch(e){return false;}}
const STAMP_IC=()=>(PARTS()&&PARTS().STAMP)||'';
function sumBadge(kind,id){if(hasMiss(kind,id))return ` <span class="ce-badge ms">${H(missSummary(kind,id))}</span>`;if(isDone(kind,id))return ` <span class="ce-badge ok">${STAMP_IC()}Complete</span>`;return '';}
function partsMiss(kind,id){const P=PARTS();if(!P)return '';try{return P.missingText(kind,id);}catch(e){return '';}}
function hasMiss(kind,id){if(partsMiss(kind,id))return true;const m=missRec(kind,id);if(!m)return false;return (m.n>0)||!!(m.note&&m.note.trim());}
function setMiss(kind,id,m){const M=kind==='set'?MISS.sets:MISS.figs;
  const clean={n:Math.max(0,Math.min(99999,m.n|0)),note:String(m.note||'').slice(0,500),t:Date.now()};
  M[id]=clean;if(!hasMiss(kind,id))delete M[id];saveMiss();}
function missSummary(kind,id){const m=missRec(kind,id)||{};const b=[];const pm=partsMiss(kind,id);if(pm)b.push(pm);else if(m.n>0)b.push(m.n+' piece'+(m.n>1?'s':''));if(m.note&&m.note.trim()&&!b.length)b.push('see note');return b.join(', ');}
(()=>{let ch=false;for(const k in MISS.sets){const m=MISS.sets[k];if(m&&m.figs){delete m.figs;ch=true;if(!hasMiss('set',k))delete MISS.sets[k];}}if(ch)saveMiss();})();
// Only minifigs ticked in a set's Parts checklist count as owned "from sets" (per set: f.per[setNum] = count).
if(typeof figsFromSets==='function'){const _ffs=figsFromSets;figsFromSets=function(o){const out=_ffs.apply(this,arguments);
  try{const P=PARTS();if(isDemo()||!o||typeof SETFIGS==='undefined'||!P)return out;
    const cache={},own=k=>cache[k]||(cache[k]=P.figsOwned(k,curCond('set',k)));
    for(const fid in out){const f=out[fid];let q=0;const from=[],per={};
      for(const k of f.from||[]){const h=own(k)[fid]|0;if(h>0){q+=h;from.push(k);per[k]=h;}}
      if(q>0){f.qty=q;f.from=from;f.per=per;}else delete out[fid];}}catch(e){console.error('colledit set figs',e);}
  return out;};}
// one more loose copy of a minifig (fig popup and the set checklist's minifig lines)
function looseKey(fid){if(exFigs()[fid]||EDITS.figs[fid])return fid;const bl=/^fig-/i.test(fid)?blOf(fid):null;if(bl&&(exFigs()[bl]||EDITS.figs[bl]))return bl;
  if(/^fig-/i.test(fid)){const alts=figAlts(fid);const hit=Object.keys(exFigs()).concat(Object.keys(EDITS.figs)).find(k=>alts.includes(lcs(k)));if(hit)return hit;}return /^fig-/i.test(fid)?figKeyFor(fid):fid;}
function markLoose(fid){const k=looseKey(fid),f=/^fig-/i.test(fid)?fid:((typeof figIds==='function'&&figIds(fid).fig)||fid);
  setEdit('fig',k,curQty('fig',k)+1,curCond('fig',k)||'',{name:figLabel(k),theme:figThemeOf(f,/^fig-/i.test(k)?blOf(k):k)});}
if(PARTS()&&PARTS().loose&&!isDemo()){PARTS().loose.count=fid=>curQty('fig',looseKey(fid));PARTS().loose.add=fid=>{markLoose(fid);figRefresh();};}
// ---------- one card per minifig ----------
// A loose copy saved under a BrickLink or Brick Owl number (sw0131) and the same minifig from a set under its Rebrickable number
// (fig-xxxxxx) used to be two cards. figids.js (Rebrickable set_mappings) links them; allFigs() below merges them into one
// card: the loose copy's id is kept (so the popup edits the loose copies you have), qty = loose + from sets, from = the sets.
const lcs=x=>String(x||'').toLowerCase();
const ALTS=new Map();
function figAlts(fid){if(ALTS.has(fid))return ALTS.get(fid);const v=figAlts_(fid);ALTS.set(fid,v);return v;}
function figAlts_(fid){try{const r=typeof figIds==='function'?figIds(fid):null;return r?[r.bl,r.bo].filter(Boolean).map(lcs):[];}catch(e){return [];}}
// the Rebrickable fig- id for any minifig id, preferring one of the given candidates (set figs) when a BrickLink number maps to several
function figFid(id,cands){if(/^fig-/i.test(id))return String(id).replace(/^FIG-/i,'fig-');const l=lcs(id);
  for(const c of cands||[])if(figAlts(c).includes(l))return c;
  try{const r=typeof figIds==='function'?figIds(id):null;return (r&&r.fig)||null;}catch(e){return null;}}
if(typeof allFigs==='function'){const _af=allFigs;allFigs=function(){const all=_af.apply(this,arguments);
  try{const fids=Object.keys(all).filter(k=>/^fig-/i.test(k)),g=new Map();
    for(const id in all){const k=figFid(id,fids)||id;if(!g.has(k))g.set(k,[]);g.get(k).push(id);}
    for(const [k,ids] of g){if(ids.length<2)continue;
      const key=ids.filter(i=>(all[i].loose|0)>0).sort((a,b)=>(all[b].loose|0)-(all[a].loose|0)||(/^fig-/i.test(a)-/^fig-/i.test(b)))[0]||(ids.includes(k)?k:ids[0]);
      const m=Object.assign({},all[key],{qty:0,loose:0,from:[],ids:ids.slice()});
      for(const i of ids){const f=all[i];m.qty+=f.qty|0;m.loose+=f.loose|0;for(const x of f.from||[])if(!m.from.includes(x))m.from.push(x);
        if(f.per){m.per=Object.assign(m.per||{},f.per);}if((!m.theme||m.theme==='Other')&&f.theme)m.theme=f.theme;if((!m.name||m.name===key)&&f.name)m.name=f.name;if(i!==key)delete all[i];}
      all[key]=m;}}catch(e){console.error('colledit merge figs',e);}
  return all;};}
// owned sets that include this minifig but where it isn't ticked (fully) yet
function figUnticked(fid){const out=[];if(typeof SETFIGS==='undefined'||typeof owned==='undefined'||!owned||!PARTS())return out;
  for(const k in owned){const l=SETFIGS[k];if(!l||!owned[k])continue;const e=l.find(x=>x[0]===fid);if(!e)continue;const need=e[1]*Math.max(1,owned[k]|0);
    const h=PARTS().figsOwned(k,curCond('set',k))[fid]|0;if(h<need)out.push({k,need,h});}return out;}

// ---------- editor inside the set / fig popup ----------
function stepHTML(v){return `<div class="ce-step"><button type="button" data-s="-1" aria-label="One less">−</button><output>${v}</output><button type="button" data-s="1" aria-label="One more">+</button></div>`;}
function paintEditor(box,info,msg,keep){
  const {kind,id}=info,isSet=kind==='set',st=status(kind,id),fq=fileQty(kind,id),r=rec(kind,id);
  const fi=isSet?null:figInfo(id),loose=isSet?0:fi.loose,ins=isSet?0:fi.ins;
  const now=isSet?curQty('set',id):fi.total;
  const k=keep||{};
  let qty=k.qty!=null?k.qty:(isSet?(now||1):(loose||(ins?0:1))),cond=k.cond||curCond(kind,id)||DEF[kind],armed=false;
  const m0=missRec(kind,id)||{};let mn=k.mn!=null?k.mn:(m0.n|0),mnote=k.mnote!=null?k.mnote:(m0.note||'');
  let mopen=k.mopen!=null?k.mopen:(hasMiss(kind,id)||/incomplete/i.test(cond));
  const minQ=isSet?1:(ins?0:1);
  const unt=isSet?[]:figUnticked((fi&&fi.fid)||id);
  const draw=m=>{
    const owns=now>0;
    const fromH=!isSet&&fi.from.length?`<div class="ce-from"><b>${ins} from your sets:</b> ${fi.from.map(x=>`<button type="button" class="ce-link" data-open="${H(x.k)}">${H(sn(x.k))} ${H(SETS[x.k]?SETS[x.k][0]:'')}${x.q>1?' ×'+x.q:''}</button>`).join(', ')}</div>`:'';
    const ownLine=isSet?'':`<div class="ce-own-line">You own <b>×${now}</b>${ins||loose||fi.oth?`: ${ins} from sets, ${loose+(fi.oth|0)} loose`:''}</div>`;
    const missH=owns?`<details class="ce-miss"${mopen?' open':''}><summary>Parts and missing pieces${sumBadge(kind,id)}</summary>
<div class="ce-lbl">${isSet&&typeof SETFIGS!=='undefined'&&(SETFIGS[id]||[]).length?'Minifigs and parts':'Parts'}</div><div data-pl></div>
${(mn>0||mnote.trim())?`<div class="ce-legacy">Earlier entry: ${mn>0?H(mn)+' missing piece'+(mn>1?'s':''):''}${mn>0&&mnote.trim()?' · ':''}${mnote.trim()?'“'+H(mnote.trim())+'”':''} <button type="button" class="ce-ghost" data-clrold="1">Clear</button></div>`:''}
</details>`:'';
    box.innerHTML=`<div class="ce-eh">${isSet?ICON_BRICK:ICON_FIG}<span>${owns?'In my collection':'Not in my collection yet'}</span>${st==='added'?'<span class="ce-badge">Added in app</span>':st==='edited'?'<span class="ce-badge ed">Edited in app</span>':''}</div>
${ownLine}${fromH}
${unt.length?`<div class="ce-from ce-unt"><b>In your sets, not ticked as owned yet:</b> ${unt.map(x=>`<button type="button" class="ce-link" data-open="${H(x.k)}">${H(sn(x.k))} ${H(SETS[x.k]?SETS[x.k][0]:'')}${x.need>1?` (${x.h} of ${x.need})`:''}</button>`).join(', ')}<div class="muted small">Tick it in that set's Parts checklist, or mark it as owned (loose) below.</div></div>`:''}
<div class="ce-lbl">${isSet?'Quantity':'Loose copies'}</div>${stepHTML(qty)}
${!isSet&&ins?`<div class="muted small" style="margin-top:4px">Loose copies are the ones not in a set. The ${ins} from sets come from the minifigs you ticked in those sets' Parts checklists; change those there.</div>`:''}
<div class="ce-lbl">Condition${!isSet&&ins?' (loose copies)':''}</div><div class="ce-conds">${(isSet?SET_CONDS:FIG_CONDS).map(c=>`<button type="button" data-c="${H(c)}" aria-pressed="${c===cond}">${H(c)}</button>`).join('')}</div>
${missH}
<div class="ce-go">${owns?`<button type="button" data-save="1">Save changes</button>${(isSet||loose>0)?`<button type="button" class="ce-danger" data-rm="1">${armed?'Tap again to remove':(!isSet&&ins?'Remove loose copies':'Remove')}</button>`:''}${!isSet&&loose===0?`<button type="button" class="ce-add" data-own1="1">${ICON_FIG}Mark as owned (loose)</button>`:''}`:`<button type="button" class="ce-add" data-save="1">${isSet?ICON_BRICK:ICON_FIG}${isSet?'Add to my sets':'Mark as owned (loose)'}</button>`}
${r?`<button type="button" class="ce-ghost" data-undo="1">Undo app edits${fq?` (file: ×${fq})`:''}</button>`:''}</div>
<div class="ce-msg" role="status">${m?H(m):''}</div>`;
    const slot=box.querySelector('[data-pl]');
    if(slot&&PARTS()){if(box._pl&&box._pl.dataset.id===kind+':'+id){slot.replaceWith(box._pl);if(box._pl.refreshCond)box._pl.refreshCond();}
      else{const det=box.querySelector('.ce-miss');const go=()=>{if(!slot.isConnected)return;box._pl=PARTS().mount(slot,kind,id,()=>cond,(ev)=>{if(ev&&ev.figs)figRefresh();const sm=box.querySelector('.ce-miss>summary');if(sm){sm.querySelectorAll('.ce-badge').forEach(b=>b.remove());sm.insertAdjacentHTML('beforeend',sumBadge(kind,id));}try{decorate();}catch(e){}},
          {saveLabel:'Save parts list',onSave:()=>{const b=box.querySelector('.ce-go [data-save]');if(b)b.click();}});};
        if(!det||det.open)go();else det.addEventListener('toggle',function t(){if(det.open){det.removeEventListener('toggle',t);go();}});}}
    else if(slot)slot.outerHTML='<p class="muted small">Parts lists are not available right now.</p>';
    const grab=()=>{const d=box.querySelector('.ce-miss');if(d)mopen=d.open;};
    box.querySelectorAll('[data-s]').forEach(x=>x.onclick=()=>{grab();qty=Math.max(minQ,Math.min(999,qty+(+x.dataset.s)));armed=false;draw();});
    const co=box.querySelector('[data-clrold]');if(co)co.onclick=()=>{grab();mn=0;mnote='';setMiss(kind,id,{n:0,note:''});draw();try{decorate();}catch(e){}};
    box.querySelectorAll('.ce-conds button').forEach(x=>x.onclick=()=>{grab();cond=x.dataset.c;if(/incomplete/i.test(cond))mopen=true;armed=false;draw();});
    const o1=box.querySelector('[data-own1]');if(o1)o1.onclick=()=>{grab();markLoose(id);afterChange(box,info,'Marked as owned (loose ×1).');};
    box.querySelectorAll('[data-open]').forEach(x=>x.onclick=()=>{const k2=x.dataset.open;closePopup();setTimeout(()=>openSet(k2),350);});
    const d=box.querySelector('.ce-miss');if(d)d.addEventListener('toggle',()=>{mopen=d.open;});
    const sv_=box.querySelector('[data-save]');if(sv_)sv_.onclick=()=>{grab();
      const fid=isSet?null:(/^fig-/i.test(id)?id:((typeof figIds==='function'&&figIds(id).fig)||id));
      const infoF=isSet?null:{name:figLabel(id),theme:figThemeOf(fid,/^fig-/i.test(id)?blOf(id):id)};
      if(owns)setMiss(kind,id,{n:mn,note:mnote});
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
// a minifig ticked or unticked in a set's checklist: recount the Figs tab and scores (debounced; the popup stays open)
let figRT=0;function figRefresh(){clearTimeout(figRT);figRT=setTimeout(()=>{try{render(owned);}catch(e){console.error('colledit figRefresh',e);}},300);}
function closePopup(){const bg=document.getElementById('setmodal');if(!bg)return;const x=bg.querySelector('.mclose');if(x)x.click();else bg.remove();}
try{new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;const bg=n.id==='setmodal'?n:(n.querySelector&&n.querySelector('#setmodal'));
  if(bg)requestAnimationFrame(()=>requestAnimationFrame(()=>enhance(bg)));}}).observe(document.body,{childList:true});}catch(e){}

// ---------- review sheet ----------
// ---------- Start fresh ----------
// What each choice clears (localStorage keys unless noted). Achievements, FigScore and the other scores are not saved anywhere:
// app.js works them out from your sets and minifigs on every redraw, so they follow whatever is left.
const FRESH={
  figs:{t:'Reset minifig ticks and loose minifig edits',d:'Unticks every minifig in every set\'s Parts checklist and undoes minifigs you added, changed or removed in the app. Parts ticks, your sets and your uploaded files stay. Loose minifigs from an uploaded file come back from that file (remove the file under Loaded files to drop them).',
    keys:['studParts: minifig ticks only (fig| lines and Check all minifig flags; parts ticks kept)','studCollEdits: the figs part (in-app loose minifig edits)','studMissing: the figs part (old missing notes on minifigs)']},
  ach:{t:'Recount achievements and scores',d:'Achievements and scores are not saved on their own. StudScore works them out from your sets and minifigs, so this clears nothing and redraws everything from what you own now. To change them, reset minifigs or remove everything.',keys:[]},
  all:{t:'Remove everything',d:'Clears your loaded files, in-app edits, Parts checklist ticks, missing notes, saved prices and value history on this device. Your BrickLink and BrickEconomy keys stay unless you tick the box below.',
    keys:['brickOwned','brickExtras','studDemo','studCollBase','studCollEdits','studCollSources','studMeta','studMetaFile','studMissing','studParts','studSnapshots','studUserValues','studBEFile','studBEValues','studBESync','studBLPrices','studBLSync']},
  keys:['studBrickLinkKeys','studBrickEconomyKey','IndexedDB studscore-parts (BrickLink parts lists saved with your keys)']
};
function openFresh(){
  const bg=sheet('ce-fresh-bg','Start fresh',`<div class="ce-head">${ICON_RESET}<h2>Start fresh</h2></div><div class="ce-pick" style="padding-top:0">
<p class="muted small" style="margin-top:0">StudScore only uses what is saved in this browser. It never reads the file on your computer again by itself.</p>
${['figs','ach','all'].map((k,i)=>`<label class="ce-fopt"><input type="radio" name="ce-fresh" value="${k}"${i===0?' checked':''}><span><b>${H(FRESH[k].t)}</b><small>${H(FRESH[k].d)}</small></span></label>`).join('')}
<label class="ce-fkeys" hidden><input type="checkbox" data-fkeys> <span>Also forget my BrickLink and BrickEconomy keys</span></label>
<div class="ce-go"><button type="button" class="ce-add" data-fnext>${ICON_RESET}Continue</button></div></div>`);
  const sync=()=>{const v=bg.querySelector('input[name=ce-fresh]:checked').value;bg.querySelector('.ce-fkeys').hidden=v!=='all';};
  bg.querySelectorAll('input[name=ce-fresh]').forEach(x=>x.onchange=sync);sync();
  bg.querySelector('[data-fnext]').onclick=()=>{const v=bg.querySelector('input[name=ce-fresh]:checked').value,fk=v==='all'&&bg.querySelector('[data-fkeys]').checked;freshConfirm(v,fk);};
}
function freshConfirm(v,fk){
  const o=FRESH[v],keys=o.keys.concat(fk?FRESH.keys:[]);
  const bg=sheet('ce-fresh-bg','Start fresh',`<div class="ce-head">${ICON_RESET}<h2>${H(o.t)}?</h2></div><div class="ce-pick" style="padding-top:0">
<p>${H(o.d.replace(/ Your BrickLink and BrickEconomy keys stay unless you tick the box below\./,''))}</p>${keys.length?`<div class="ce-srch">Cleared on this device</div><ul class="ce-fl">${keys.map(k=>`<li>${H(k)}</li>`).join('')}</ul>${v==='all'&&!fk?'<p class="muted small">Kept: your BrickLink and BrickEconomy keys, and display choices (tile size).</p>':''}<p class="muted small">This can't be undone. Back up first (Back up my collection) if you may want it back.</p>`:'<p class="muted small">Nothing is deleted.</p>'}
<div class="ce-go"><button type="button" class="ce-ghost" data-fback>Back</button><button type="button" class="ce-add${keys.length?' ce-danger':''}" data-fgo>${keys.length?'Yes, start fresh':'Recount now'}</button></div></div>`);
  bg.querySelector('[data-fback]').onclick=openFresh;
  bg.querySelector('[data-fgo]').onclick=()=>{const msg=doFresh(v,fk);closeSheet('ce-fresh-bg');try{sessionStorage.setItem('studFreshMsg',msg);}catch(e){}resetting=true;location.reload();};
}
function doFresh(v,fk){
  const P=PARTS();
  if(v==='figs'){if(P&&P.resetFigTicks)P.resetFigTicks();
    EDITS.figs={};saveEdits();MISS.figs={};saveMiss();return 'Minifig ticks and loose minifig edits reset.';}
  if(v==='ach')return 'Achievements and scores recounted.';
  if(P&&P.resetAll)P.resetAll();EDITS=norm(null);MISS={sets:{},figs:{}};
  for(const k of FRESH.all.keys)rm(k);
  if(fk){rm('studBrickLinkKeys');rm('studBrickEconomyKey');try{if(P&&P.clearBrickLinkCopies)P.clearBrickLinkCopies();}catch(e){}try{indexedDB.deleteDatabase('studscore-parts');}catch(e){}}
  return fk?'Everything removed, keys too. Upload a file to start again.':'Everything removed. Your keys are kept. Upload a file to start again.';
}
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
  const lines=['Item Type,Item No,Item Name,Quantity,Condition,Missing Parts,Missing Notes,Missing Minifigs,Parts Checklist'];
  const mc=(kind,id)=>{const m=missRec(kind,id)||{},P=PARTS();let pm=null;try{pm=P?P.summary(kind,id,curCond(kind,id)):null;}catch(e){}
    const n=pm&&(pm.state==='missing'||pm.state==='complete')&&pm.n!=null?pm.m:(m.n||'');
    let mf='';try{if(kind==='set'&&P&&P.started('set',id,curCond('set',id))&&typeof SETFIGS!=='undefined'){const h=P.figsOwned(id,curCond('set',id)),n0=Math.max(1,own[id]|0);
      mf=(SETFIGS[id]||[]).map(([f,q])=>[f,q*n0-(h[f]|0)]).filter(e=>e[1]>0).map(e=>e[0]+' x'+e[1]).join('; ');}}catch(e){}
    return [n===0?'0':n,m.note||'',mf,P?P.exportField(kind,id):''];};
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
  const ix=n=>Hh.indexOf(n),iT=ix('item type'),iN=ix('item no'),iP=ix('missing parts'),iO=ix('missing notes'),iF=ix('missing minifigs'),iC=ix('parts checklist');if(iN<0||iP<0)return;
  let n=0;for(const r of rows.slice(1)){const type=String(r[iT]||'').toLowerCase().startsWith('m')?'fig':'set';let id=String(r[iN]||'').trim();if(!id)continue;
    if(type==='set'&&typeof SETS!=='undefined'&&!SETS[id]&&SETS[id+'-1'])id+='-1';
    let fromList=false;if(iC>=0&&r[iC]&&PARTS()){try{if(PARTS().importField(type,id,String(r[iC])))n++;fromList=true;}catch(e){}}
    if(missRec(type,id))continue;
    const rec_={n:fromList?0:(parseInt(r[iP])||0),note:iO>=0?String(r[iO]||''):''}; // Missing Minifigs is informational now: the checklist column carries the ticks
    if(rec_.n||rec_.note.trim()){setMiss(type,id,rec_);n++;}}
  if(n)render(owned);
}

// ---------- start ----------
window.StudCollEdit={hold:()=>{resetting=true;},toast,missing:()=>JSON.parse(JSON.stringify(MISS)),setMiss,figInfo,edits:()=>JSON.parse(JSON.stringify(EDITS)),setEdit,undoEdit,clearAll,status,openAdd,exportCSV};
try{
  if(!isDemo()){if(!getBase()&&typeof owned!=='undefined'&&owned&&(Object.keys(owned).length||Object.keys(exFigs()).length))snapBase();mergeMeta();}
  // Always redraw once now. app.js and share.js draw the page while their scripts load, before this file wraps figsFromSets,
  // so that first drawing counts every set minifig (old rule): Figs tab, FigScore and achievements. Redrawing here applies the
  // checklist rule. (Before, this only ran when there were in-app edits, so a reload brought the old set figs back.)
  if(!isDemo()&&typeof owned!=='undefined'&&owned)render(owned);
  else paintBars();
  try{const m=sessionStorage.getItem('studFreshMsg');if(m){sessionStorage.removeItem('studFreshMsg');setTimeout(()=>toast(m),400);}}catch(e){}
}catch(e){console.error('colledit init',e);}
// Start-up curtain (index.html adds html.booting). Lift it once app.js has opened the tab from the address (its
// DOMContentLoaded handler runs before this one) and the redraw above has run, so the first thing shown is the right tab, fully drawn.
function bootDone(){try{(window.__studBootDone||function(){document.documentElement.classList.remove('booting');})();}catch(e){}}
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',bootDone);else bootDone();
})();
