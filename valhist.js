// valhist.js: Reset value history to the start of this month (added by Money).
// All-time change and the Value tab chart read dated checkpoints in this browser's localStorage
// key 'studSnapshots' (written by collection.js on each visit with values). Early or test prices
// in old checkpoints can throw the all-time figure off. This control keeps checkpoints from the
// 1st of the current month (local date at the moment you confirm) and deletes only older ones.
// If none remain on or after that 1st, a new baseline is written for today (collection.js's usual
// visit snapshot). Collection data, parts lists, wishlists, settings, your own value entries, and
// API keys are not touched. A backup made before the reset will bring older checkpoints back if
// you restore it — that is intentional (the backup is a full snapshot of that time).
(function(){
'use strict';
const LS='studSnapshots';
const H=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const isDemo=()=>{try{return !!JSON.parse(localStorage.getItem('studDemo')||'null');}catch(e){return false;}};
function today(d){d=d||new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
function monthStart(d){d=d||new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-01`;}
function nice(iso){try{const p=String(iso).split('-').map(Number);if(!p[0])return String(iso||'');
  return new Date(p[0],(p[1]||1)-1,p[2]||1).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});}catch(e){return String(iso||'');}}
function load(){try{const v=JSON.parse(localStorage.getItem(LS)||'null');return Array.isArray(v)?v.filter(x=>x&&x.d):[];}catch(e){return [];}}
function save(a){try{localStorage.setItem(LS,JSON.stringify(a));}catch(e){}}
function plan(now){
  const from=monthStart(now),snaps=load(),keep=snaps.filter(x=>String(x.d)>=from).sort((a,b)=>String(a.d).localeCompare(String(b.d))),drop=snaps.length-keep.length;
  return {from,today:today(now),snaps:snaps.length,keep:keep.length,drop,willBaseline:keep.length===0,keepSnaps:keep};
}

function apply(now){
  const p=plan(now);
  save(p.keepSnaps);
  // Let collection.js write or refresh today's checkpoint from current values (same path as a normal visit).
  if(typeof render==='function'&&typeof owned!=='undefined'&&owned&&!isDemo()){
    try{render(owned);}catch(e){console.error('valhist render',e);}
  }
  const after=load();
  const hasFrom=after.some(x=>String(x.d)>=p.from);
  return Object.assign({},p,{after:after.length,baselineWritten:!p.keep&&after.some(x=>x.d===p.today),hasFrom});
}

const ICON='<svg class="ce-ic" viewBox="0 0 26 24" aria-hidden="true"><rect x="5" y="9" width="5" height="3.4" rx="1" fill="#F2CD37" stroke="#05131D" stroke-width="1.4"/><rect x="14" y="9" width="5" height="3.4" rx="1" fill="#F2CD37" stroke="#05131D" stroke-width="1.4"/><rect x="2" y="12" width="20" height="9" rx="1.6" fill="#F2CD37" stroke="#05131D" stroke-width="1.6"/><path d="M4.5 6.5A9 9 0 0 1 20 4.5" fill="none" stroke="#C91A09" stroke-width="2.2" stroke-linecap="round"/><path d="M20.8 1.2l.2 4.6-4.5.4" fill="none" stroke="#C91A09" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function closeSheet(){const bg=document.getElementById('vh-bg');if(!bg)return;
  document.removeEventListener('keydown',bg._esc);bg.remove();
  if(!document.querySelector('.modalbg'))document.body.classList.remove('ss-popup-open');}
function openConfirm(){
  if(isDemo())return;
  const p=plan(),fromNice=nice(p.from);
  let body;
  if(p.snaps===0)body=`There are no value-history checkpoints on this device yet. If you continue, StudScore will save a new baseline today (${nice(p.today)}). All-time change will start from there once you have a later checkpoint.`;
  else if(p.drop===0&&!p.willBaseline)body=`Every checkpoint already starts on or after <b>${H(fromNice)}</b>. Nothing older will be deleted. Your history is already counted from this month.`;
  else if(p.willBaseline)body=`This deletes the <b>${p.drop}</b> checkpoint${p.drop===1?'':'s'} from before <b>${H(fromNice)}</b>. There is no checkpoint on or after that date, so a new baseline will be saved for today (${H(nice(p.today))}). All-time change and the chart will start from today.`;
  else body=`This keeps checkpoints from <b>${H(fromNice)}</b> onward and deletes the <b>${p.drop}</b> older one${p.drop===1?'':'s'}. All-time change and the chart will start from that date.`;
  const bg=document.createElement('div');bg.className='modalbg no-swipe';bg.id='vh-bg';
  bg.innerHTML=`<div class="modal ce-sheet" role="dialog" aria-modal="true" aria-label="Reset history to start of month"><button class="mclose" aria-label="Close">✕</button>
<div class="ce-head">${ICON}<h2>Reset history to start of month?</h2></div>
<div class="ce-pick" style="padding-top:0">
<p>${body}</p>
<p>Your collection, parts lists, wishlists, settings, your own value entries, and API keys are not changed.</p>
<p class="muted small">A backup made before this reset will bring the older history back if you restore it.</p>
<div class="ce-go"><button type="button" class="ce-add ce-danger" data-vhgo>Reset history</button><button type="button" class="ce-ghost" data-vhcancel>Cancel</button></div>
</div></div>`;
  bg.onclick=e=>{if(e.target===bg)closeSheet();};
  document.body.appendChild(bg);
  bg.querySelector('.mclose').onclick=closeSheet;
  bg.querySelector('[data-vhcancel]').onclick=closeSheet;
  const go=bg.querySelector('[data-vhgo]');
  if(p.drop===0&&!p.willBaseline){go.disabled=true;go.textContent='Nothing to reset';}
  else go.onclick=()=>{const r=apply();closeSheet();done(r);mount();};
  document.body.classList.add('ss-popup-open');
  bg._esc=e=>{if(e.key==='Escape')closeSheet();};document.addEventListener('keydown',bg._esc);
  setTimeout(()=>{if(go&&!go.disabled)go.focus();else{const c=bg.querySelector('[data-vhcancel]');if(c)c.focus();}},50);
}
function done(r){
  let msg;
  if(r.willBaseline||r.baselineWritten)msg=`Value history now starts from today (${nice(r.today)}).`;
  else msg=`Value history now starts from ${nice(r.from)}.`;
  try{if(window.StudCollEdit&&StudCollEdit.toast)StudCollEdit.toast(msg);else{
    const t=document.getElementById('ce-toast')||document.createElement('div');
    if(!t.id){t.id='ce-toast';t.className='ce-toast';t.setAttribute('role','status');document.body.appendChild(t);}
    t.textContent=msg;}}catch(e){}}
function statusText(){
  const snaps=load();
  if(!snaps.length)return 'No value-history checkpoints on this device yet.';
  const dates=snaps.map(x=>x.d).sort();
  return `This device has ${snaps.length} checkpoint${snaps.length===1?'':'s'}, from ${nice(dates[0])} to ${nice(dates[dates.length-1])}.`;
}
function boxHTML(){
  if(isDemo())return `<details id="vh-box" class="blc vh-box"><summary>Value history</summary>
<p>The demo collection does not save value-history checkpoints, so there is nothing to reset.</p></details>`;
  return `<details id="vh-box" class="blc vh-box"><summary>Value history</summary>
<p>All-time change and the chart use dated checkpoints this browser saved when you opened StudScore with values. Early or test prices in old checkpoints can throw the all-time figure off.</p>
<p class="muted small" id="vh-status">${H(statusText())}</p>
<p>This keeps history from the 1st of this month (${H(nice(monthStart()))}) and deletes only older checkpoints. Your collection and keys stay as they are.</p>
<div><button type="button" class="ce-ghost ce-fresh" id="vh-reset">${ICON}Reset history to start of month</button></div>
</details>`;
}
function mount(){
  const host=document.getElementById('tab-value');if(!host)return;
  let box=document.getElementById('vh-box');const wasOpen=box&&box.open;
  if(box)box.remove();
  const bl=document.getElementById('bl-connect');
  if(bl)bl.insertAdjacentHTML('beforebegin',boxHTML());
  else host.insertAdjacentHTML('beforeend',boxHTML());
  box=document.getElementById('vh-box');if(wasOpen&&box)box.open=true;
  const b=document.getElementById('vh-reset');if(b)b.onclick=openConfirm;
}
function hook(){
  if(typeof render==='function'&&!render._vh){const _r=render;render=function(){const out=_r.apply(this,arguments);try{mount();}catch(e){}return out;};render._vh=true;}
  mount();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);else hook();
window.addEventListener('studscore:tab',e=>{if(e&&e.detail&&e.detail.tab==='value')mount();});
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('[data-vh-open]');if(!a)return;
  e.preventDefault();if(typeof goTab==='function')goTab('value');mount();const box=document.getElementById('vh-box');if(box){box.open=true;box.scrollIntoView({block:'start',behavior:'smooth'});}});

const css=document.createElement('style');css.textContent=`
.vh-box{margin-top:16px}
.vh-box #vh-reset{display:inline-flex;align-items:center;gap:8px;margin:4px 0 0}
#vh-bg .ce-sheet{max-width:520px}
`;document.head.appendChild(css);

window.StudValHist={monthStart,today,plan,apply,load,mount,LS};
})();
