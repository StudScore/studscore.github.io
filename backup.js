// backup.js: Back up and restore a StudScore collection (phase 6, added by Money). Loads after colledit.js.
// StudScore keeps everything in this browser (localStorage). Clearing the browser's cache/site data wipes it, so:
//   Back up  -> downloads studscore-backup-YYYY-MM-DD.json with every StudScore key that matters (see KEYS).
//   Restore  -> reads that file (also on a new or empty browser, from the start screen), checks it, shows a summary,
//               then "Replace everything" puts it back and reloads: "Restored from backup of {date}".
// File: {format:'studscore-backup', version:1, created, date, app, keys:bool, summary, data:{key:rawString}, checksum:{alg,value}}
//   checksum = SHA-256 (hex) of JSON.stringify(sorted [key,value] pairs), or FNV-1a 32-bit where crypto.subtle is missing.
// Left out by default: BrickLink / BrickEconomy API keys (opt-in checkbox) and the BrickLink parts lists in IndexedDB
//   (re-fetched with your keys when needed). Restoring a file without keys keeps the keys already on this device.
// Reminder: no backup for 14+ days (or never) and there are edits -> a small dismissible note ("Not now" waits 14 days).
//   Local bookkeeping in 'studBackupMeta' {last, snooze} (not part of the backup).
(function(){
'use strict';
const FORMAT='studscore-backup',VERSION=1,MAX_BYTES=10*1024*1024,DAY=864e5,REMIND_DAYS=14;
const KEYS=['brickOwned','brickExtras','studDemo','studCollBase','studCollSources','studCollEdits','studParts','studMissing',
  'studMeta','studMetaFile','studSnapshots','studUserValues','studBEFile','studBEValues','studBESync','studBLPrices','studBLSync',
  'studTileCols','studPopup'];
const SECRET=['studBrickLinkKeys','studBrickEconomyKey'];
const META='studBackupMeta';
const APP=(()=>{try{const s=document.currentScript&&document.currentScript.src;const m=/[?&]v=([^&]+)/.exec(s||'');return m?m[1]:'dev';}catch(e){return 'dev';}})();
const H=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const J=(k,d)=>{try{const v=JSON.parse(get(k)||'null');return v==null?d:v;}catch(e){return d;}};
const meta=()=>J(META,{})||{};
const setMeta=o=>{try{localStorage.setItem(META,JSON.stringify(Object.assign(meta(),o)));}catch(e){}};
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const nice=iso=>{try{const d=new Date(iso);if(isNaN(d))return String(iso||'');return d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});}catch(e){return String(iso||'');}};
const toast=m=>{try{if(window.StudCollEdit&&StudCollEdit.toast)return StudCollEdit.toast(m);}catch(e){}alert(m);};
const isDemo=()=>!!J('studDemo',false);

// LEGO-style icons (original SVG): brick with a down arrow (back up), brick with an up arrow (restore)
const brick=(arrow,c)=>`<svg class="bk-ic" viewBox="0 0 24 22" aria-hidden="true"><rect x="4" y="1" width="6" height="4" rx="1" fill="${c}" stroke="#05131D" stroke-width="1.3"/><rect x="14" y="1" width="6" height="4" rx="1" fill="${c}" stroke="#05131D" stroke-width="1.3"/><rect x="1.5" y="4.5" width="21" height="16" rx="2" fill="${c}" stroke="#05131D" stroke-width="1.6"/><path d="${arrow}" fill="none" stroke="#05131D" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const IC_BACKUP=brick('M12 8v7.5M8.5 12.5L12 16l3.5-3.5','#F2CD37');
const IC_RESTORE=brick('M12 16V8.5M8.5 11.5L12 8l3.5 3.5','#A5CA18');

// ---------- checksum ----------
const canon=data=>JSON.stringify(Object.keys(data).sort().map(k=>[k,data[k]]));
function fnv(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return ('0000000'+h.toString(16)).slice(-8);}
async function sum(data,alg){const s=canon(data);
  if(alg!=='FNV-1a'&&window.crypto&&crypto.subtle&&window.TextEncoder){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return {alg:'SHA-256',value:[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')};}
  return {alg:'FNV-1a',value:fnv(s)};}

// ---------- what's in it ----------
function summarize(data){const P=k=>{try{return JSON.parse(data[k]||'null');}catch(e){return null;}};
  const own=P('brickOwned')||{},ex=P('brickExtras')||{},ed=P('studCollEdits')||{},pr=P('studParts')||{},src=P('studCollSources')||[];
  const sets=Object.values(own).filter(q=>+q>0).length,pieces=Object.values(own).reduce((a,q)=>a+(+q>0?+q:0),0);
  const figs=Object.values((ex&&ex.figs)||{}).reduce((a,f)=>a+((f&&+f.qty)||0),0);
  const edits=Object.keys(ed.sets||{}).length+Object.keys(ed.figs||{}).length;
  const lists=Object.keys(pr.sets||{}).length+Object.keys(pr.figs||{}).length;
  return {sets,setCopies:pieces,looseFigs:figs,edits,checklists:lists,files:Array.isArray(src)?src.length:0,demo:P('studDemo')===true};}
function hasData(){const s=summarize(Object.fromEntries(KEYS.map(k=>[k,get(k)]).filter(e=>e[1]!=null)));return s.sets+s.looseFigs+s.edits+s.checklists+s.files>0;}
function hasEdits(){const ed=J('studCollEdits',{})||{},pr=J('studParts',{})||{},ms=J('studMissing',{})||{},uv=J('studUserValues',{})||{};
  return Object.keys(ed.sets||{}).length+Object.keys(ed.figs||{}).length>0||Object.values(pr.sets||{}).some(r=>r&&r.h&&Object.keys(r.h).length)||
    Object.keys(ms.sets||{}).length+Object.keys(ms.figs||{}).length>0||Object.keys(uv).length>0;}

async function makeBackup(withKeys){
  const data={};for(const k of KEYS.concat(withKeys?SECRET:[])){const v=get(k);if(v!=null)data[k]=v;}
  const now=new Date();
  const file={format:FORMAT,version:VERSION,created:now.toISOString(),date:ymd(now),app:APP,keys:!!withKeys,summary:summarize(data),data};
  file.checksum=await sum(data);
  return file;}
async function download(withKeys){
  await new Promise(r=>setTimeout(r,300)); // parts.js saves ticks 250 ms after the last one
  const f=await makeBackup(withKeys);const txt=JSON.stringify(f,null,1);
  const name=`studscore-backup-${f.date}.json`;
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);
  setMeta({last:f.created,snooze:null});paint();
  window.__lastBackup={name,text:txt}; // tests read this; nothing leaves the device
  return {name,file:f};}

// ---------- checking a file ----------
async function check(text){
  if(typeof text!=='string'||!text.trim())throw new Error('That file is empty.');
  if(text.length>MAX_BYTES)throw new Error('That file is too big to be a StudScore backup.');
  let f;try{f=JSON.parse(text);}catch(e){throw new Error('That is not a StudScore backup file (not readable).');}
  if(!f||typeof f!=='object'||f.format!==FORMAT)throw new Error('That is not a StudScore backup file.');
  if(typeof f.version!=='number'||f.version<1)throw new Error('This backup has no version, so it can\'t be checked.');
  if(f.version>VERSION)throw new Error('This backup was made by a newer StudScore. Reload the page to get the latest version, then try again.');
  if(!f.data||typeof f.data!=='object'||Array.isArray(f.data))throw new Error('This backup has no collection data.');
  if(!f.checksum||!f.checksum.value||(await sum(f.data,f.checksum.alg)).value!==f.checksum.value)throw new Error('This backup is damaged or was changed (checksum does not match). Nothing was restored.');
  const ok={},ignored=[];
  for(const k of Object.keys(f.data)){const v=f.data[k];
    if(!KEYS.includes(k)&&!SECRET.includes(k)){ignored.push(k);continue;}
    if(typeof v!=='string'){ignored.push(k);continue;}
    try{JSON.parse(v);}catch(e){ignored.push(k);continue;}
    ok[k]=v;}
  if(!Object.keys(ok).length)throw new Error('This backup has nothing StudScore can restore.');
  return {file:f,data:ok,ignored,summary:summarize(ok),keys:SECRET.some(k=>k in ok)};}

function restore(c){
  const prev={};for(const k of KEYS.concat(SECRET))prev[k]=get(k);
  try{if(window.StudParts&&StudParts.resetAll)StudParts.resetAll();}catch(e){}
  try{if(window.StudCollEdit&&StudCollEdit.hold)StudCollEdit.hold();}catch(e){}
  try{
    for(const k of KEYS)localStorage.removeItem(k);
    if(c.keys)for(const k of SECRET)localStorage.removeItem(k); // a file without keys keeps this device's keys
    for(const k in c.data)localStorage.setItem(k,c.data[k]);
  }catch(e){ // storage full or blocked: put back what was there
    for(const k in prev){try{if(prev[k]==null)localStorage.removeItem(k);else localStorage.setItem(k,prev[k]);}catch(x){}}
    throw new Error('This browser would not store the backup (storage full or blocked). Nothing was changed.');}
  setMeta({last:c.file.created,snooze:null});
  try{sessionStorage.setItem('studFreshMsg',`Restored from backup of ${nice(c.file.created)}`);}catch(e){}
  location.reload();}

// ---------- sheets ----------
function sheet(id,label,inner){close(id);const bg=document.createElement('div');bg.className='modalbg no-swipe bk-bg';bg.id=id;
  bg.innerHTML=`<div class="modal ce-sheet bk-sheet" role="dialog" aria-modal="true" aria-label="${H(label)}"><button class="mclose" aria-label="Close">✕</button>${inner}</div>`;
  bg.onclick=e=>{if(e.target===bg)close(id);};document.body.appendChild(bg);bg.querySelector('.mclose').onclick=()=>close(id);
  document.body.classList.add('ss-popup-open');bg._esc=e=>{if(e.key==='Escape')close(id);};document.addEventListener('keydown',bg._esc);return bg;}
function close(id){const bg=document.getElementById(id);if(!bg)return;document.removeEventListener('keydown',bg._esc);bg.remove();if(!document.querySelector('.modalbg'))document.body.classList.remove('ss-popup-open');}
const lastTxt=()=>{const m=meta();return m.last?`Last backup: ${nice(m.last)}`:'No backup yet';};
function sumList(s,date){const b=[];
  b.push(`<li><b>${s.sets}</b> set${s.sets===1?'':'s'}${s.setCopies>s.sets?` (${s.setCopies} copies)`:''}</li>`);
  b.push(`<li><b>${s.looseFigs}</b> loose minifig${s.looseFigs===1?'':'s'} (minifigs ticked in sets come back with the checklists)</li>`);
  b.push(`<li><b>${s.edits}</b> in-app edit${s.edits===1?'':'s'}, <b>${s.checklists}</b> parts checklist${s.checklists===1?'':'s'}, <b>${s.files}</b> loaded file${s.files===1?'':'s'}</li>`);
  if(date)b.push(`<li>Backed up <b>${H(nice(date))}</b></li>`);return `<ul class="bk-sum">${b.join('')}</ul>`;}

function openBackup(){
  const s=summarize(Object.fromEntries(KEYS.map(k=>[k,get(k)]).filter(e=>e[1]!=null)));
  const haveKeys=SECRET.some(k=>get(k)!=null);
  const bg=sheet('bk-bg','Back up my collection',`<div class="ce-head">${IC_BACKUP}<h2>Back up my collection</h2></div><div class="ce-pick" style="padding-top:0">
<p>Saves one file with everything StudScore keeps in this browser, so you can bring it back after clearing your browser or on another device.</p>
${sumList(s)}
<p class="muted small">In the file: loaded files, in-app edits, parts and minifig ticks, missing notes, conditions, value history, your own values, BrickLink and BrickEconomy prices, and display settings. Not in it: the BrickLink parts lists saved for your sets (they download again when needed). Restoring a backup replaces value history with whatever is in the file, so a backup made before a "Reset history to start of month" will bring the older checkpoints back.</p>
<label class="bk-keys"><input type="checkbox" data-bkkeys${haveKeys?'':' disabled'}> <span>Include my BrickLink/BrickEconomy keys${haveKeys?'':' (none saved on this device)'}</span></label>
<p class="bk-warn" hidden>Anyone who has this file could use your keys. Keep it private.</p>
<div class="ce-go"><button type="button" class="ce-add" data-bkgo>${IC_BACKUP}Download backup</button></div>
<p class="muted small bk-last">${H(lastTxt())}</p></div>`);
  const cb=bg.querySelector('[data-bkkeys]');cb.onchange=()=>{bg.querySelector('.bk-warn').hidden=!cb.checked;};
  bg.querySelector('[data-bkgo]').onclick=async()=>{const r=await download(cb.checked);close('bk-bg');toast(`Saved ${r.name}. Keep it somewhere safe (not only in this browser).`);};}

function pickRestore(){let inp=document.getElementById('bk-file');
  if(!inp){inp=document.createElement('input');inp.type='file';inp.id='bk-file';inp.hidden=true;inp.accept='.json,application/json,text/plain';document.body.appendChild(inp);
    inp.addEventListener('change',()=>{const f=inp.files&&inp.files[0];setTimeout(()=>{inp.value='';},0);if(f)readFile(f);});}
  inp.click();}
function readFile(f){
  if(f.size>MAX_BYTES){showErr('That file is too big to be a StudScore backup.');return;}
  const r=new FileReader();r.onload=()=>openRestore(String(r.result||''));r.onerror=()=>showErr('Could not read that file.');r.readAsText(f);}
function showErr(msg){sheet('bk-bg','Restore from backup',`<div class="ce-head">${IC_RESTORE}<h2>Can't restore this file</h2></div><div class="ce-pick" style="padding-top:0"><p class="bk-err">${H(msg)}</p><p class="muted small">Your collection on this device was not changed.</p><div class="ce-go"><button type="button" class="ce-ghost" data-bkpick>Choose another file</button></div></div>`);}
async function openRestore(text){
  let c;try{c=await check(text);}catch(e){showErr(e.message||'That file can\'t be used.');return null;}
  const here=hasData();
  const bg=sheet('bk-bg','Restore from backup',`<div class="ce-head">${IC_RESTORE}<h2>Restore from backup</h2></div><div class="ce-pick" style="padding-top:0">
<p>This backup has:</p>${sumList(c.summary,c.file.created)}
${c.keys?'<p class="muted small">It includes BrickLink/BrickEconomy keys; they replace the ones on this device.</p>':'<p class="muted small">No keys in this file. Keys already saved on this device stay.</p>'}
${c.ignored.length?`<p class="muted small">Skipped ${c.ignored.length} unknown item${c.ignored.length>1?'s':''} in the file.</p>`:''}
<p>${here?'<b>Replace everything</b> swaps what this browser has now for the backup, including value history.':'This browser has no collection yet.'}</p>
<p class="muted small">Value history in the file is restored as it was backed up. A backup from before a history reset will bring those older checkpoints back.</p>
<div class="ce-go"><button type="button" class="ce-add ce-danger bk-replace" data-bkreplace>${IC_RESTORE}Replace everything</button><button type="button" class="ce-ghost" data-bkcancel>Cancel</button></div></div>`);
  bg.querySelector('[data-bkcancel]').onclick=()=>close('bk-bg');
  bg.querySelector('[data-bkreplace]').onclick=()=>{try{restore(c);}catch(e){showErr(e.message);}};
  setTimeout(()=>{const b=bg.querySelector('[data-bkreplace]');if(b)b.focus();},50);
  return c;}

// ---------- buttons and reminder ----------
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-bk],[data-bkpick]');if(!b)return;e.preventDefault();
  if(b.hasAttribute('data-bkpick')||b.dataset.bk==='restore'){close('bk-bg');pickRestore();}
  else if(b.dataset.bk==='backup')openBackup();
  else if(b.dataset.bk==='later'){setMeta({snooze:new Date().toISOString()});paint();}});
function remindDue(){if(isDemo()||!hasEdits())return false;const m=meta(),now=Date.now();
  if(m.snooze&&now-Date.parse(m.snooze)<REMIND_DAYS*DAY)return false;
  return !m.last||now-Date.parse(m.last)>=REMIND_DAYS*DAY;}
function paint(){
  const ib=document.getElementById('importbox');
  if(ib){let row=document.getElementById('bk-row');if(!row){row=document.createElement('div');row.id='bk-row';row.className='bk-row';ib.appendChild(row);}
    // Keep this row at the end of the box. app.js placeSections() moves share.js's "Save share card" button into the Share tab
    // only while it sits right after #demo; putting this row there (phase 6) left the Share tab with no button.
    const sb=document.getElementById('sharebox'),stray=[...ib.querySelectorAll(':scope > button')].find(x=>/share card/i.test(x.textContent));
    if(sb&&stray)sb.appendChild(stray);
    if(row.nextElementSibling)ib.appendChild(row);
    const d=hasData()&&!isDemo();
    row.innerHTML=`<button type="button" class="ce-ghost bk-btn" data-bk="restore">${IC_RESTORE}Restore from backup</button>${d?`<button type="button" class="ce-ghost bk-btn" data-bk="backup">${IC_BACKUP}Back up my collection</button>`:''}${d?`<span class="muted small bk-last">${H(lastTxt())}</span>`:''}`;}
  const board=document.getElementById('board');
  let rm=document.getElementById('bk-remind');
  if(remindDue()&&board){if(!rm){rm=document.createElement('div');rm.id='bk-remind';rm.className='bk-remind';rm.setAttribute('role','status');board.insertAdjacentElement('afterbegin',rm);}
    const m=meta();rm.innerHTML=`${IC_BACKUP}<span><b>${m.last?`It's been a while since your last backup.`:'Your edits live only in this browser.'}</b> ${H(lastTxt())}. Clearing the browser would erase them.</span><span class="bk-ra"><button type="button" class="ce-add" data-bk="backup">Back up now</button><button type="button" class="ce-ghost" data-bk="later">Not now</button></span>`;}
  else if(rm)rm.remove();
  document.querySelectorAll('.bk-last').forEach(x=>{x.textContent=hasData()&&!isDemo()?lastTxt():'';});
  document.querySelectorAll('[data-bk="backup"],[data-bk="restore"]').forEach(b=>{if(!b.querySelector('svg'))b.insertAdjacentHTML('afterbegin',b.dataset.bk==='backup'?IC_BACKUP:IC_RESTORE);});}
const css=document.createElement('style');css.textContent=`
.bk-ic{width:18px;height:17px;flex:none;vertical-align:middle;margin-right:5px}
.bk-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px;padding-top:10px;border-top:1px solid #3A3D40}
.bk-row .bk-btn,.ce-bar .bk-btn{display:inline-flex;align-items:center}
.bk-row .bk-last{flex:0 0 100%}
.bk-sum{margin:6px 0 10px 18px;padding:0;line-height:1.5}
.bk-keys{display:flex;gap:8px;align-items:center;margin:10px 2px 4px;font-size:14px}.bk-keys input{width:18px;height:18px;accent-color:#C91A09;flex:none}
.bk-warn{margin:2px 0 0;color:#FF8A7A;font-size:13px;font-weight:700}
.bk-err{color:#FF8A7A;font-weight:700}
.bk-remind{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;background:#0E2230;border:2px solid #F2CD37;border-radius:10px;padding:8px 12px;margin:0 0 12px;font-size:14px}
.bk-remind>span{flex:1 1 220px}.bk-remind .bk-ra{display:flex;gap:8px;flex:0 0 auto}
.bk-remind .ce-add,.bk-remind .ce-ghost{padding:6px 11px;font-size:13px}
`;document.head.appendChild(css);

window.StudBackup={KEYS:KEYS.slice(),SECRET:SECRET.slice(),makeBackup,download,check,openRestore,restore,paint,remindDue,IC_BACKUP,IC_RESTORE,lastText:lastTxt};
try{paint();}catch(e){console.error('backup paint',e);}
if(typeof render==='function'){const _r=render;render=function(){const r=_r.apply(this,arguments);try{paint();}catch(e){}return r;};}
})();
