// ---- BrickEconomy value box (added by Money): display-only, next to the BrickLink price in set/fig popups.
// Does not edit collection.js or lore.js and does not change value order or totals.
// Sources, in this order: the collector's own BrickEconomy API key (Premium, ~100 lookups/day), else a
// BrickEconomy / BE Value column in their upload. If neither, the box is hidden.
// The key is saved only in this browser (localStorage 'studBrickEconomyKey') and sent only to StudScore's
// Worker proxy (POST /be/value). BrickEconomy's API has no CORS headers and its docs forbid putting the
// key in client-side code: https://www.brickeconomy.com/api-reference
// Values are cached 24 hours. A lookup runs only when a popup is opened, and the daily budget stays under 80.
(function(){
const LS={key:'studBrickEconomyKey',values:'studBEValues',sync:'studBESync',file:'studBEFile'};
const DAY=864e5,REFRESH_MS=DAY,DAILY_BUDGET=80,TIMEOUT_MS=25e3;
const PROFILE='https://www.brickeconomy.com/api-reference';
const PREMIUM='https://www.brickeconomy.com/premium';
const TM='BrickEconomy is a trademark of BrickEconomy. Values are estimates from BrickEconomy, shown for personal reference.';
const ld=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v;}catch(e){return d;}};
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const H=s=>(typeof esc==='function'?esc:x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])))(s==null?'':s);
const pad=n=>String(n).padStart(2,'0');
const dstr=t=>{const d=new Date(t);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const money=(v,cur)=>{try{return new Intl.NumberFormat('en-US',{style:'currency',currency:cur||'USD'}).format(v);}catch(e){return (+v).toFixed(2)+' '+(cur||'');}};
const ago=t=>{const s=Math.max(0,(Date.now()-t)/1e3);if(s<90)return 'just now';const m=s/60;if(m<90)return Math.round(m)+' min ago';const h=m/60;if(h<36)return Math.round(h)+' h ago';return Math.round(h/24)+' days ago';};
const isDemo=()=>!!ld('studDemo',false);
const endpoint=()=>{if(typeof window!=='undefined'&&typeof window.STUD_BL_ENDPOINT==='string')return String(window.STUD_BL_ENDPOINT).replace(/\/+$/,'');
  try{if(window.StudBL&&typeof StudBL.endpoint==='function')return String(StudBL.endpoint()||'').replace(/\/+$/,'');}catch(e){}
  return 'https://studscore-community.studscore.workers.dev';};
const KEY_RE=/^[\x21-\x7E]{8,128}$/;
function getKey(){const k=ld(LS.key,null);if(typeof k==='string'&&KEY_RE.test(k))return k;if(k&&typeof k.key==='string'&&KEY_RE.test(k.key))return k.key;return null;}
const connected=()=>!!(endpoint()&&getKey());
let V=ld(LS.values,{}),S=ld(LS.sync,{}),FILE=ld(LS.file,{sets:{},figs:{},col:null,loaded:null});
const saveV=()=>sv(LS.values,V),saveS=()=>sv(LS.sync,S),saveF=()=>sv(LS.file,FILE);
function budget(){const d=dstr(Date.now());if(S.day!==d){S.day=d;S.used=0;}return Math.max(0,DAILY_BUDGET-(S.used||0));}
const wantCur=()=>{const m=ld('studMeta',null);return (m&&/^[A-Z]{3}$/.test(m.cur||'')&&m.cur)||'USD';};
function setBasis(k){const m=ld('studMeta',null),e=m&&m.sets&&m.sets[k];const c=e&&e.cond?Object.entries(e.cond).sort((a,b)=>b[1]-a[1])[0]:null;return !c||/sealed|new/i.test(c[0])?'new':'used';}
function figBasis(id){const m=ld('studMeta',null),e=m&&m.figs&&m.figs[id];const c=e&&e.cond?Object.entries(e.cond).sort((a,b)=>b[1]-a[1])[0]:null;return c&&/sealed|new/i.test(c[0])?'new':'used';}
function beFigNo(id){if(!/^fig-/i.test(id))return /^[A-Za-z0-9][A-Za-z0-9._-]{0,29}$/.test(id)?id:null;
  try{const r=typeof figIds==='function'?figIds(id):null;return r&&r.bl?String(r.bl):null;}catch(e){return null;}}
function cacheKey(kind,id){return kind==='fig'?'fig:'+id:id;}

// ---------- file column (BrickEconomy / BE Value / similar; not the generic "value" column) ----------
const normH=h=>String(h||'').toLowerCase().replace(/^\ufeff/,'').replace(/[^a-z0-9]/g,'');
const BE_COL=['brickeconomy','bevalue','brickeconomyvalue','brickeconomyaverage','brickeconomyaveragevalue','brickeconomyavg','brickeconomyavgvalue','beavg','beavgvalue','brickeconomycurrentvalue','currentvaluebrickeconomy','valuebrickeconomy','brickeconomyprice','beprice','brickeconomyval','beestimatedvalue','brickeconomyestimatedvalue','brickeconomymarketvalue','beaverage','beaveragevalue'];
const BE_NEW=['brickeconomynew','brickeconomyvaluenew','bevaluenew','benewvalue','brickeconomynewvalue','brickeconomyvaluenewsealed'];
const BE_USED=['brickeconomyused','brickeconomyvalueused','bevalueused','beusedvalue','brickeconomyusedvalue'];
function parseNum(s){s=String(s||'').trim();if(!s)return null;s=s.replace(/[^\d.,-]/g,'');if(/^\d+,\d{1,2}$/.test(s))s=s.replace(',','.');else s=s.replace(/,/g,'');const n=parseFloat(s);return isFinite(n)&&n>0?n:null;}
function parseFile(text){
  const out={sets:{},figs:{},col:null,loaded:dstr(Date.now())};
  text=String(text||'').replace(/^\ufeff/,'');if(!text||/<ITEM>/i.test(text))return out;
  const first=text.split(/\r?\n/).find(l=>l.trim())||'';
  const delim=[',','\t',';'].map(d=>[d,first.split(d).length]).sort((a,b)=>b[1]-a[1])[0][0];
  if(typeof csvRows!=='function')return out;
  const rows=csvRows(text,delim);if(rows.length<2)return out;
  const Hds=rows[0].map(normH);
  const find=list=>{for(const n of list){const i=Hds.indexOf(n);if(i>=0)return i;}return -1;};
  const iV=find(BE_COL),iN=find(BE_NEW),iU=find(BE_USED);
  if(iV<0&&iN<0&&iU<0)return out;
  out.col=(rows[0][iV>=0?iV:iN>=0?iN:iU]||'BrickEconomy').trim();
  const COLS={id:['itemno','itemnumber','itemid','item','setnum','setnumber','setno','set','number','minifignum','minifignumber','fig','figid'],
    variant:['variant'],type:['itemtype','type'],cat:['category','categoryname'],qty:['quantity','qty','qtyowned','quantityowned','owned']};
  const I={};for(const k in COLS){I[k]=-1;for(const n of COLS[k]){const i=Hds.indexOf(n);if(i>=0){I[k]=i;break;}}}
  const put=(type,id,qty,f)=>{
    if(!(qty>0))return;id=String(id||'').trim();if(!id)return;
    if(type==='S'){let k=typeof setKey==='function'?setKey(id):id;if(!k&&/^col/i.test(id)&&typeof cmfSetNum==='function')k=cmfSetNum(id,f.desc);
      if(k){const e=out.sets[k]||(out.sets[k]={v:0,vq:0,vn:null,vu:null});if(f.value){e.v+=f.value*qty;e.vq+=qty;}if(f.vnew)e.vn=f.vnew;if(f.vused)e.vu=f.vused;out.sets[k]=e;return;}
      if(/^col/i.test(id)||/^fig-\d{6}$/i.test(id))type='M';else return;}
    if(type==='M'){const e=out.figs[id]||(out.figs[id]={v:0,vq:0,vn:null,vu:null});if(f.value){e.v+=f.value*qty;e.vq+=qty;}if(f.vnew)e.vn=f.vnew;if(f.vused)e.vu=f.vused;out.figs[id]=e;}
  };
  for(const r of rows.slice(1)){
    const g=k=>I[k]>=0?String(r[I[k]]==null?'':r[I[k]]).trim():'';
    let type=I.type>=0&&typeof typeFromWord==='function'?typeFromWord(g('type')):null;
    if(!type&&I.cat>=0&&typeof typeFromCat==='function')type=typeFromCat(g('cat'));
    if(!type&&I.type<0&&I.cat<0)type='S';
    let id=g('id');if(I.variant>=0&&id)id=id+'-'+(g('variant')||'1');
    if(!id)id=r.map(c=>String(c).trim()).find(c=>/^[0-9A-Za-z]+-\d+$/.test(c))||'';
    const qs=g('qty');
    put(type,id,qs===''?1:parseInt(qs),{value:iV>=0?parseNum(r[iV]):null,vnew:iN>=0?parseNum(r[iN]):null,vused:iU>=0?parseNum(r[iU]):null,desc:''});
  }
  return out;
}
function fileEntry(kind,id){
  if(!FILE)return null;
  if(kind==='set')return FILE.sets[id]||FILE.sets[String(id).replace(/-1$/,'')]||null;
  return FILE.figs[id]||FILE.figs['fig:'+id]||FILE.figs[String(id).replace(/^fig:/,'')]||null;
}
function pickEntry(e,basis){
  if(!e)return null;
  let v=null,which=null;
  if(basis==='used'){v=e.vu||(e.vq?e.v/e.vq:null)||e.vn;which=e.vu?'used':(e.vq?'average':'new');}
  else{v=e.vn||(e.vq?e.v/e.vq:null)||e.vu;which=e.vn?'new':(e.vq?'average':'used');}
  return v?{v,which}:null;
}
function fileValue(kind,id){
  if(isDemo())return null;
  const picked=pickEntry(fileEntry(kind,id),kind==='fig'?figBasis(id):setBasis(id));
  if(!picked)return null;
  return {v:picked.v,cur:wantCur(),src:'file',col:FILE.col||'BrickEconomy',basis:picked.which,date:FILE.loaded};
}

function apiRec(kind,id){return V[cacheKey(kind,id)]||null;}
function apiValue(kind,id){
  if(isDemo()||!connected())return null;
  const r=apiRec(kind,id);if(!r||!r.v)return r&&r.err?{error:r.err,t:r.t}:null;
  if(Date.now()-r.t>=REFRESH_MS)return {v:r.v,cur:r.cur,src:'api',t:r.t,basis:r.basis,stale:true};
  return {v:r.v,cur:r.cur,src:'api',t:r.t,basis:r.basis};
}
// Display source: API (including a stale cached value) first, else the upload column.
function displayValue(kind,id){
  const a=apiValue(kind,id);if(a&&a.v)return a;
  const f=fileValue(kind,id);if(f)return f;
  if(a&&a.error)return a;
  return connected()?{pending:true}:null;
}

async function post(path,body){
  const ctl=typeof AbortController==='function'?new AbortController():null;const tm=setTimeout(()=>ctl&&ctl.abort(),TIMEOUT_MS);
  try{const r=await fetch(endpoint()+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctl&&ctl.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
    let j=null;try{j=await r.json();}catch(e){}
    if(r.status===404)return {ok:false,error:'StudScore\'s price helper does not support BrickEconomy lookups yet',status:404};
    if(!r.ok)return {ok:false,error:(j&&j.error)||('HTTP '+r.status),status:r.status};
    return j||{ok:false,error:'empty reply'};}
  catch(e){return {ok:false,net:true,error:e&&e.name==='AbortError'?'timed out':'could not reach the price helper'};}
  finally{clearTimeout(tm);}
}
function store(kind,id,res,basis){
  const t=Date.now(),key=cacheKey(kind,id),old=V[key]||{};
  const v=res.ok?(basis==='used'?(res.current_value_used||res.current_value_new):(res.current_value_new||res.current_value_used)):null;
  const r={v:v||null,cur:res.currency||wantCur(),t,basis,err:res.ok?null:String(res.error||'').slice(0,120)};
  if(!res.ok&&old.v){r.v=old.v;r.t=old.t;r.cur=old.cur;r.basis=old.basis;r.failT=t;}
  V[key]=r;saveV();
}
async function lookup(kind,id){
  const key=getKey();if(!key)return {ok:false,error:'not connected'};
  if(!budget())return {ok:false,error:'daily lookup budget used'};
  const no=kind==='fig'?beFigNo(id):id;if(!no)return {ok:false,error:kind==='fig'?'no BrickLink figure number to look up':'missing set number'};
  const basis=kind==='fig'?figBasis(id):setBasis(id);
  S.used=(S.used||0)+1;saveS();
  const j=await post('/be/value',{key,currency:wantCur(),item:{type:kind==='fig'?'MINIFIG':'SET',no}});
  store(kind,id,j,basis);
  return j;
}

// ---------- settings: Connect BrickEconomy (Value tab, under Connect BrickLink) ----------
function settingsHTML(){
  const ep=endpoint(),k=getKey(),on=!!(ep&&k),dis=ep?'':' disabled';
  return `<details id="be-connect" class="blc bec${ep?'':' blc-off'}"${on?'':' open'}><summary>Connect BrickEconomy${ep?'':' <span class="blc-soon">Coming soon</span>'}${on?' <span class="blc-on">Connected</span>':''}</summary>
<p>Use your own BrickEconomy API key to show that site's estimated value next to the BrickLink price on each set and minifig. The key comes with a paid <a href="${PREMIUM}" target="_blank" rel="noopener">BrickEconomy Premium</a> membership, which allows about 100 lookups a day (resets at midnight UTC).</p>
<ol class="blc-steps"><li>Open your <a href="${PROFILE}" target="_blank" rel="noopener">BrickEconomy API profile</a> and copy the key. Premium is required.</li>
<li>Paste it below and tap Test. StudScore only looks up a set or fig when you open it, caches the value for 24 hours, and stays well under the daily limit.</li></ol>
<label class="blc-f">API key<input id="bek-key" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="128"${dis} ${k?'placeholder="Saved on this phone"':''}></label>
<p class="blc-safe"><b>Your key stays on this phone.</b> It's saved only in this browser and sent only to StudScore's price helper over HTTPS for each lookup. The helper doesn't save or log it.</p>
<div><button id="bec-test"${dis}>Test connection</button><button id="bec-forget" class="blc-forget"${k?'':' disabled'}>Disconnect / forget my key</button></div>
<p id="bec-status" class="muted small" role="status" aria-live="polite"></p>
<p class="blc-tm">${H(TM)}</p></details>`;
}
function statusText(){
  if(!endpoint())return 'Coming soon. BrickEconomy values switch on once the StudScore price helper supports them.';
  if(!getKey())return 'Not connected. You can still show a BrickEconomy column from your upload, when the file has one.';
  const n=Object.values(V).filter(r=>r&&r.v).length,u=S.used||0;
  let t=S.last?`Last check ${ago(S.last.t)}: ${S.last.ok?'OK':'stopped, '+H(S.last.msg)}.`:'Not checked yet.';
  if(S.quota)t+=` Quota: ${S.remaining!=null?S.remaining+' left of '+S.quota:S.quota+' per day'}.`;
  return t+` ${n} BrickEconomy value${n===1?'':'s'} saved on this device. Lookups today: ${u} of ${DAILY_BUDGET}.`;
}
function paintStatus(msg){const el=document.getElementById('bec-status');if(el)el.innerHTML=msg?H(msg):statusText();}
function mountSettings(){
  const host=document.getElementById('tab-value');if(!host)return;
  let box=document.getElementById('be-connect');const wasOpen=box&&box.open;
  if(box)box.remove();
  const after=document.getElementById('bl-connect');
  if(after)after.insertAdjacentHTML('afterend',settingsHTML());else host.insertAdjacentHTML('beforeend',settingsHTML());
  box=document.getElementById('be-connect');if(wasOpen)box.open=true;
  paintStatus();
  const val=()=>{const v=(document.getElementById('bek-key').value||'').trim();return v||getKey()||'';};
  const t=document.getElementById('bec-test');if(t)t.onclick=async()=>{
    const k=val();if(!KEY_RE.test(k)){paintStatus('Paste your BrickEconomy API key. It is a long code with no spaces.');return;}
    paintStatus('Testing…');t.disabled=true;
    const r=await post('/be/test',{key:k});t.disabled=false;
    if(r.ok){sv(LS.key,k);S.last={t:Date.now(),ok:true,msg:''};S.quota=r.quota;S.remaining=r.remaining;S.used_be=r.used_today;saveS();mountSettings();const d=document.getElementById('be-connect');if(d)d.open=true;paintStatus('Connected. Your key is saved on this phone.');}
    else if(r.status===404)paintStatus(r.error);
    else if(r.net||r.status>=500||r.status===429)paintStatus('Couldn\'t reach StudScore\'s price helper ('+(r.error||'error')+'). Your key was not saved. Try again in a little while.');
    else paintStatus((r.error||'BrickEconomy said no')+'. Check the key and that the account has Premium API access.');
  };
  const fg=document.getElementById('bec-forget');if(fg)fg.onclick=()=>{
    if(!confirm('Forget your BrickEconomy API key on this device? Saved BrickEconomy lookups are cleared too. Values from your upload are kept.'))return;
    try{localStorage.removeItem(LS.key);localStorage.removeItem(LS.values);localStorage.removeItem(LS.sync);}catch(e){}
    V={};S={};mountSettings();paintStatus('Disconnected. Your key and looked-up values are gone from this device.');
  };
}

function enhanceSources(){
  const ul=document.querySelector('#cx-sources + ul, #cx-sources ul');if(!ul||ul.querySelector('.be-src'))return;
  const has=connected()||(FILE&&(Object.keys(FILE.sets||{}).length||Object.keys(FILE.figs||{}).length));
  if(!has)return;
  const li=document.createElement('li');li.className='be-src';
  li.innerHTML=`BrickEconomy values: shown next to the BrickLink price for personal reference only. They do not change your totals. ${connected()?'Looked up with your own API key, cached 24 hours on this device, and capped well under the BrickEconomy 100-request daily limit. ':''}${FILE&&FILE.col?'When no key is connected, a value is taken from the <i>'+H(FILE.col)+'</i> column in your upload. ':''}<a href="#be-connect" data-be-open>BrickEconomy settings</a><br><b class="blc-tm">${H(TM)}</b>`;
  ul.appendChild(li);
  const a=li.querySelector('[data-be-open]');if(a)a.onclick=e=>{e.preventDefault();if(typeof goTab==='function')goTab('value');const d=document.getElementById('be-connect');if(d){d.open=true;d.scrollIntoView({block:'start'});}};
}

function info(modal){try{return window.StudDetail&&StudDetail.modalInfo?StudDetail.modalInfo(modal):null;}catch(e){return null;}}
function catalogUrl(kind,id){
  if(kind==='set')return 'https://www.brickeconomy.com/set/'+encodeURIComponent(id);
  const no=beFigNo(id);return no?'https://www.brickeconomy.com/minifig/'+encodeURIComponent(no):'https://www.brickeconomy.com';
}
function beHTML(kind,id,state){
  const tm=`<span class="bl-tm">${H(TM)}</span>`;
  if(!state)return '';
  if(state.pending)return `<span class="muted">BrickEconomy value: looking up…</span>${tm}`;
  if(state.error&&!state.v)return `<span class="muted">BrickEconomy value: ${H(state.error)}</span>${tm}`;
  const when=state.src==='api'?`updated ${ago(state.t)}`:('from your upload'+(state.col?' ('+H(state.col)+' column)':''));
  const sub=state.basis&&state.basis!=='average'?state.basis+' estimate':'estimate';
  const href=catalogUrl(kind,id);
  const stale=state.stale?` <span class="bl-stale">older than 24 hours</span>`:'';
  return `BrickEconomy value, ${when}: <b class="bl-price">${money(state.v,state.cur)}</b> (${sub}) <a href="${H(href)}" target="_blank" rel="noopener">BrickEconomy</a>${stale}${tm}`;
}
function layoutBoxes(modal){
  const body=modal&&modal.querySelector('.mbody');if(!body)return;
  const bl=body.querySelector('.bl-line:not(.be-box)'),be=body.querySelector('.be-box');
  if(!bl&&!be)return;
  let row=body.querySelector('.valboxes');
  if(!row){row=document.createElement('div');row.className='valboxes';
    if(bl)bl.insertAdjacentElement('beforebegin',row);
    else{const h4=[...body.querySelectorAll('h4')].find(x=>/^value$/i.test(x.textContent.trim()));
      if(h4)h4.insertAdjacentElement('afterend',row);else body.insertBefore(row,body.querySelector('a.btn'));}
  }
  if(bl&&bl.parentElement!==row)row.appendChild(bl);
  if(be&&be.parentElement!==row)row.appendChild(be);
  if(bl&&be)row.insertBefore(bl,be);
  row.classList.toggle('valboxes-one',row.children.length<2);
}
function paintBox(modal,kind,id,state){
  const body=modal.querySelector('.mbody');if(!body)return;
  let box=body.querySelector('.be-box');
  if(!state){if(box)box.remove();layoutBoxes(modal);return;}
  if(!box){box=document.createElement('p');box.className='be-box bl-line small';}
  box.innerHTML=beHTML(kind,id,state);
  const row0=body.querySelector('.valboxes');
  if(row0&&box.parentElement!==row0)row0.appendChild(box);
  else if(!row0){
    const h4=[...body.querySelectorAll('h4')].find(x=>/^value$/i.test(x.textContent.trim()));
    if(h4)h4.insertAdjacentElement('afterend',box);else body.appendChild(box);
  }
  layoutBoxes(modal);
}
function enhanceModal(modal){
  if(!modal)return;
  const inf=info(modal);if(!inf)return;
  const body=modal.querySelector('.mbody');if(!body)return;
  layoutBoxes(modal);
  if(isDemo())return;
  const state=displayValue(inf.kind,inf.id);
  if(state)paintBox(modal,inf.kind,inf.id,state);
  else if(body.querySelector('.be-box')){body.querySelector('.be-box').remove();layoutBoxes(modal);}
  const need=connected()&&!isDemo();
  const rec=apiRec(inf.kind,inf.id);
  const stale=!rec||!rec.v||Date.now()-rec.t>=REFRESH_MS||rec.failT;
  if(need&&stale&&budget()){
    paintBox(modal,inf.kind,inf.id,displayValue(inf.kind,inf.id)||{pending:true});
    lookup(inf.kind,inf.id).then(r=>{
      if(!document.body.contains(modal))return;
      const next=displayValue(inf.kind,inf.id);
      if(next)paintBox(modal,inf.kind,inf.id,next);
      if(!r.ok){S.last={t:Date.now(),ok:false,msg:String(r.error||'').slice(0,120)};saveS();}
    });
  }
}

try{new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;const md=n.id==='setmodal'?n:n.querySelector&&n.querySelector('#setmodal');
  if(md)requestAnimationFrame(()=>requestAnimationFrame(()=>enhanceModal(md)));}}).observe(document.body,{childList:true});}catch(e){}
if(typeof openSet==='function'){const _o=openSet;openSet=function(){const r=_o.apply(this,arguments);requestAnimationFrame(()=>requestAnimationFrame(()=>enhanceModal(document.getElementById('setmodal'))));return r;};}

function afterRender(){try{enhanceSources();}catch(e){}if(!document.getElementById('be-connect'))mountSettings();}
window.addEventListener('DOMContentLoaded',()=>{
  if(typeof render==='function'){const _r=render;render=function(){const r=_r.apply(this,arguments);afterRender();return r;};}
  if(typeof loadCollection==='function'){const _l=loadCollection;loadCollection=function(text){try{FILE=parseFile(text);saveF();}catch(e){FILE={sets:{},figs:{},col:null,loaded:null};saveF();}return _l.apply(this,arguments);};}
  const demo=document.getElementById('demo');if(demo)demo.addEventListener('click',()=>{FILE={sets:{},figs:{},col:null,loaded:null};try{localStorage.removeItem(LS.file);}catch(e){}},true);
  mountSettings();afterRender();
});
const css=document.createElement('style');css.textContent=`
.bec .blc-f{margin:8px 0}
.be-box a{color:#F2CD37}
.valboxes{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}
.valboxes>.bl-line,.valboxes>.be-box{margin:0}
.valboxes.valboxes-one{grid-template-columns:1fr}
@media (max-width:520px){.valboxes{grid-template-columns:1fr}}
`;document.head.appendChild(css);

window.StudBE={displayValue,fileValue,apiValue,connected,endpoint,parseFile,_state:()=>({V,S,FILE}),_budget:budget};
})();
