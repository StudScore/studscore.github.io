// ---- BrickLink price sync (added by Money): each collector connects their OWN BrickLink API keys and their
// collection's prices refresh from BrickLink's "last 6 months sold" price guide.
// Does not edit lore.js. collection.js only asks window.StudBL.value() for a price (2 lines, after your own entry).
// Keys: saved only in this browser (localStorage 'studBrickLinkKeys'), sent only to StudScore's Worker proxy over HTTPS
// with each lookup (BrickLink blocks browser calls and needs OAuth signing). The Worker does not store or log them.
// Prices: 'studBLPrices' {key:{N|U:{v,cur,t,n,hist:[[YYYY-MM-DD,v],...]}}}, key = set number or 'fig:<id>'.
// Schedule: a web app can't run while closed, so each visit refreshes prices older than 24h, 20 per request,
// up to DAILY_BUDGET lookups per device per day, oldest first, and picks up where it left off next visit.
// A popup refreshes its own item when the shown BrickLink price is older than 6 hours (BrickLink's display rule).
const BL_PROXY_ENDPOINT = 'https://studscore-community.studscore.workers.dev'; // the Worker's base URL; '' turns the feature off ("Coming soon")
(function(){
const LSK={keys:'studBrickLinkKeys',prices:'studBLPrices',sync:'studBLSync'};
const DAY=864e5,REFRESH_MS=DAY,TOTALS_MAX_MS=DAY,STALE_MS=6*3600e3,BATCH=20,DAILY_BUDGET=400,RETRY_MS=10*60e3,TIMEOUT_MS=25e3;
const TM='The term \'Bricklink\' is a trademark of Bricklink, Inc. This application uses the Bricklink API but is not endorsed or certified by Bricklink, Inc.';
const SRC='BrickLink (last 6 months sold)';
const ld=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v;}catch(e){return d;}};
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const H=s=>(typeof esc==='function'?esc:x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])))(s==null?'':s);
const pad=n=>String(n).padStart(2,'0');
const dstr=t=>{const d=new Date(t);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const money=(v,cur)=>{try{return new Intl.NumberFormat('en-US',{style:'currency',currency:cur||'USD'}).format(v);}catch(e){return (+v).toFixed(2)+' '+(cur||'');}};
const ago=t=>{const s=Math.max(0,(Date.now()-t)/1e3);if(s<90)return 'just now';const m=s/60;if(m<90)return Math.round(m)+' min ago';const h=m/60;if(h<36)return Math.round(h)+' h ago';return Math.round(h/24)+' days ago';};
const isDemo=()=>!!ld('studDemo',false);
const endpoint=()=>String((typeof window!=='undefined'&&typeof window.STUD_BL_ENDPOINT==='string')?window.STUD_BL_ENDPOINT:(BL_PROXY_ENDPOINT||'')).replace(/\/+$/,''); // tests may override
const KEY_RE=/^[A-Za-z0-9]{8,64}$/;
function getKeys(){const k=ld(LSK.keys,null);return k&&['consumer_key','consumer_secret','token','token_secret'].every(f=>typeof k[f]==='string'&&KEY_RE.test(k[f]))?k:null;}
const connected=()=>!!(endpoint()&&getKeys());
let P=ld(LSK.prices,{}),S=ld(LSK.sync,{});
const saveP=()=>sv(LSK.prices,P),saveS=()=>sv(LSK.sync,S);
function budget(){const d=dstr(Date.now());if(S.day!==d){S.day=d;S.used=0;}return Math.max(0,DAILY_BUDGET-(S.used||0));}
const wantCur=()=>{const m=ld('studMeta',null);return (m&&/^[A-Z]{3}$/.test(m.cur||'')&&m.cur)||'USD';};

// ---------- condition basis (same rule as collection.js: sealed/new or no condition -> new; else used) ----------
function setBasis(k){const m=ld('studMeta',null),e=m&&m.sets&&m.sets[k];const c=e&&e.cond?Object.entries(e.cond).sort((a,b)=>b[1]-a[1])[0]:null;return !c||/sealed|new/i.test(c[0])?'N':'U';}
function figBasis(id,f){const own=(typeof owned!=='undefined'&&owned)||{};const par=(f&&f.from||[]).find(k=>own[k]);if(par){const m=ld('studMeta',null);if(m&&m.sets&&m.sets[par])return setBasis(par);}
  const m=ld('studMeta',null),e=m&&m.figs&&m.figs[id];const c=e&&e.cond?Object.entries(e.cond).sort((a,b)=>b[1]-a[1])[0]:null;return c&&/sealed|new/i.test(c[0])?'N':'U';}
function blFigNo(id){if(!/^fig-/i.test(id))return /^[A-Za-z0-9][A-Za-z0-9._-]{0,29}$/.test(id)?id:null;
  try{const r=typeof figIds==='function'?figIds(id):null;return r&&r.bl?String(r.bl):null;}catch(e){return null;}}

// ---------- what to refresh: sets first, then loose figs, then figs in sets ----------
function wanted(){
  const own=(typeof owned!=='undefined'&&owned)||{},out=[];
  Object.keys(own).filter(k=>typeof SETS==='undefined'||SETS[k]).forEach(k=>out.push({key:k,type:'SET',no:k,nu:setBasis(k)}));
  let F={};try{F=typeof allFigs==='function'?allFigs(own,(typeof extras!=='undefined'&&extras)||null)||{}:{};}catch(e){}
  const ids=Object.keys(F).sort((a,b)=>((F[b].loose||0)>0)-((F[a].loose||0)>0));
  ids.forEach(id=>{const no=blFigNo(id);if(no)out.push({key:'fig:'+id,type:'MINIFIG',no,nu:figBasis(id,F[id])});});
  return out;
}
const rec=(key,nu)=>P[key]&&P[key][nu];
function age(it){const r=rec(it.key,it.nu);return r&&r.cur===wantCur()?Date.now()-r.t:Infinity;}
function due(list,maxAge){return list.filter(it=>age(it)>maxAge).sort((a,b)=>age(b)-age(a));}

// ---------- talk to the Worker ----------
async function post(path,body){
  const ctl=typeof AbortController==='function'?new AbortController():null;const tm=setTimeout(()=>ctl&&ctl.abort(),TIMEOUT_MS);
  try{const r=await fetch(endpoint()+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctl&&ctl.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
    let j=null;try{j=await r.json();}catch(e){}
    if(!r.ok)return {ok:false,error:(j&&j.error)||('HTTP '+r.status),status:r.status};
    return j||{ok:false,error:'empty reply'};}
  catch(e){return {ok:false,net:true,error:e&&e.name==='AbortError'?'timed out':'could not reach the price helper'};}
  finally{clearTimeout(tm);}
}
function store(it,res){
  const t=Date.now(),cur=res.currency||wantCur();
  const v=res.ok?(res.unit_quantity===0?null:(res.qty_avg||res.avg||null)):null;
  const o=P[it.key]||(P[it.key]={}),old=o[it.nu]||{};
  const r={v,cur,t,n:res.ok?res.unit_quantity:null,err:res.ok?null:String(res.error||'').slice(0,80),hist:Array.isArray(old.hist)?old.hist.filter(h=>h&&h[1]>0):[]};
  if(!res.ok&&old.v){r.v=old.v;r.t=old.t;r.cur=old.cur;r.failT=t;} // keep the last good price, marked as not refreshed
  if(res.ok&&v){const d=dstr(t);if(r.hist.length&&r.hist[r.hist.length-1][0]===d)r.hist[r.hist.length-1]=[d,v];else r.hist.push([d,v]);r.hist=r.hist.slice(-400);}
  o[it.nu]=r;
}
async function lookup(items){
  const keys=getKeys();if(!keys)return {ok:false,error:'not connected'};
  const n=Math.min(items.length,BATCH,budget());if(!n)return {ok:false,error:'daily lookup budget used'};
  const batch=items.slice(0,n);
  const j=await post('/bl/price',{creds:keys,currency:wantCur(),items:batch.map(i=>({type:i.type,no:i.no,new_or_used:i.nu}))});
  S.used=(S.used||0)+n;
  if(!j.ok||!Array.isArray(j.items))return {ok:false,error:j.error||'lookup failed',status:j.status};
  let good=0,authErr=null;
  batch.forEach((it,i)=>{const r=j.items.find(x=>x&&x.type===it.type&&x.no===it.no&&x.new_or_used===it.nu)||j.items[i]||{ok:false,error:'missing'};
    if(!r.ok&&/OAUTH|TOKEN|SIGNATURE|CONSUMER|401|403/i.test(String(r.error||'')+(r.code||'')))authErr=r.error;store(it,r);if(r.ok)good++;});
  saveP();saveS();
  return {ok:!authErr,good,n,error:authErr};
}

// ---------- the per-visit sync ----------
let running=false,timer=0;
async function sync(force){
  if(running||!connected()||isDemo())return;
  if(!force&&S.failT&&Date.now()-S.failT<RETRY_MS)return;
  const list=due(wanted(),REFRESH_MS);if(!list.length||!budget()){paintStatus();return;}
  running=true;paintStatus('Updating BrickLink prices…');
  let got=0,err=null,todo=list;
  while(todo.length&&budget()){const r=await lookup(todo);if(!r.ok){err=r.error;break;}got+=r.good;todo=todo.slice(r.n);paintStatus(`Updating BrickLink prices… ${list.length-todo.length} of ${list.length}`);}
  running=false;
  S.last={t:Date.now(),ok:!err,msg:err?String(err).slice(0,120):'',got,left:todo.length};if(err)S.failT=Date.now();else delete S.failT;saveS();
  if(got&&typeof render==='function'&&typeof owned!=='undefined'){quiet=true;try{render(owned);}finally{quiet=false;}}
  paintStatus();
}
let quiet=false;
const soon=()=>{clearTimeout(timer);timer=setTimeout(()=>sync(false),1200);};

// ---------- the value hook collection.js reads (your own entry still wins; it calls this right after) ----------
function value(key,basis){
  if(isDemo())return null;const nu=basis==='used'?'U':'N';
  // Stricter BrickLink terms reading: a saved price counts toward values/totals only while it is under 24 hours old;
  // older ones fall through to the next source (your file, prices.json). Popups still show and refresh it (6-hour rule).
  const r=rec(key,nu);if(!r||!r.v||r.cur!==wantCur()||Date.now()-r.t>=TOTALS_MAX_MS)return null;
  return {v:r.v,cur:r.cur,src:SRC,date:dstr(r.t),kind:'bl',basis:nu==='N'?'new':'used',stale:Date.now()-r.t>STALE_MS,t:r.t};
}
function history(key){
  const o=P[key];if(!o)return [];const r=(o.N&&o.N.hist&&o.N.hist.length>=(o.U&&o.U.hist?o.U.hist.length:0))?o.N:o.U;
  return r&&Array.isArray(r.hist)?r.hist.map(h=>({d:h[0],v:+h[1]})).filter(p=>p.v>0):[];
}
function hasData(){return Object.values(P).some(o=>o&&((o.N&&o.N.v)||(o.U&&o.U.v)));}

// ---------- settings: Connect BrickLink (Value tab) ----------
const REG='https://www.bricklink.com/v2/api/register_consumer.page';
function settingsHTML(){
  const ep=endpoint(),k=getKeys(),on=!!(ep&&k),dis=ep?'':' disabled';
  // Secrets are never written back into the page; a saved one shows as a placeholder and an empty box keeps it.
  const f=(id,label,secret)=>{const kv=k?k[id.replace('blk-','').replace(/-/g,'_')]:'';
    return `<label class="blc-f">${label}<input id="${id}" type="${secret?'password':'text'}" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="64"${dis} ${secret?(kv?'placeholder="Saved on this phone"':''):`value="${H(kv||'')}"`}></label>`;};
  return `<details id="bl-connect" class="blc${ep?'':' blc-off'}"${on?'':' open'}><summary>Connect BrickLink${ep?'':' <span class="blc-soon">Coming soon</span>'}${on?' <span class="blc-on">Connected</span>':''}</summary>
<p>Use your own BrickLink API keys and StudScore fills in what your sets and minifigs sold for on BrickLink over the last 6 months, refreshed each day you visit.</p>
<ol class="blc-steps"><li>Sign in to a BrickLink account you're comfortable using. An API token can manage that account's store, so a separate free account with no store is the safest choice.</li>
<li>Open BrickLink's <a href="${REG}" target="_blank" rel="noopener">API registration page</a> and register as a consumer.</li>
<li>Add an access token. For the IP address and mask, enter <b>0.0.0.0</b> (any address), because the price helper doesn't have one fixed address.</li>
<li>Copy the four values below.</li></ol>
<div class="blc-grid">${f('blk-consumer-key','Consumer key')}${f('blk-consumer-secret','Consumer secret',1)}${f('blk-token','Token value')}${f('blk-token-secret','Token secret',1)}</div>
<p class="blc-safe"><b>Your keys stay on this phone.</b> They're saved only in this browser and sent only to StudScore's price helper over HTTPS for each lookup. The helper doesn't save or log them.</p>
<div><button id="blc-test"${dis}>Test connection</button><button id="blc-sync"${on?'':' disabled'}>Sync now</button><button id="blc-forget" class="blc-forget"${k?'':' disabled'}>Disconnect / forget my keys</button></div>
<p id="blc-status" class="muted small" role="status" aria-live="polite"></p>
<p class="blc-tm">${H(TM)}</p></details>`;
}
function statusText(){
  if(!endpoint())return 'Coming soon. BrickLink prices switch on once the StudScore price helper is live.';
  if(!getKeys())return 'Not connected.';
  const L=S.last,n=Object.values(P).reduce((a,o)=>a+((o.N&&o.N.v)?1:0)+((o.U&&o.U.v)?1:0),0);
  let t=L?`Last sync ${ago(L.t)}: ${L.ok?'OK':'stopped, '+H(L.msg)}${L.left?`, ${L.left} items wait for the next visit`:''}.`:'Not synced yet.';
  return t+` ${n} BrickLink price${n===1?'':'s'} saved on this device. Lookups today: ${DAILY_BUDGET-budget()} of ${DAILY_BUDGET}.`;
}
function paintStatus(msg){const el=document.getElementById('blc-status');if(el)el.innerHTML=msg?H(msg):statusText();}
function mountSettings(){
  const host=document.getElementById('tab-value');if(!host)return;
  let box=document.getElementById('bl-connect');const wasOpen=box&&box.open;
  if(box)box.remove();host.insertAdjacentHTML('beforeend',settingsHTML());box=document.getElementById('bl-connect');if(wasOpen)box.open=true;
  paintStatus();
  const val=id=>{const v=(document.getElementById(id).value||'').trim(),k=getKeys();return v||(k?k[id.replace('blk-','').replace(/-/g,'_')]:'')||'';};
  const t=document.getElementById('blc-test');if(t)t.onclick=async()=>{
    const k={consumer_key:val('blk-consumer-key'),consumer_secret:val('blk-consumer-secret'),token:val('blk-token'),token_secret:val('blk-token-secret')};
    if(!Object.values(k).every(x=>KEY_RE.test(x))){paintStatus('Paste all four values. Each one is letters and numbers only.');return;}
    paintStatus('Testing…');t.disabled=true;
    const r=await post('/bl/test',{creds:k});t.disabled=false;
    if(r.ok){sv(LSK.keys,k);delete S.failT;saveS();mountSettings();document.getElementById('bl-connect').open=true;paintStatus('Connected. Your keys are saved on this phone. Fetching prices…');sync(true);}
    else if(r.net||r.status>=500||r.status===429)paintStatus('Couldn\'t reach StudScore\'s price helper ('+(r.error||'error')+'). Your keys were not saved. Try again in a little while.');
    else paintStatus('BrickLink said no: '+(r.error||'unknown error')+'. Check the four values and that the token IP is 0.0.0.0.');
  };
  const s=document.getElementById('blc-sync');if(s)s.onclick=()=>{delete S.failT;sync(true);};
  const fg=document.getElementById('blc-forget');if(fg)fg.onclick=()=>{
    if(!confirm('Forget your BrickLink keys on this device? Saved BrickLink prices are cleared too.'))return;
    try{localStorage.removeItem(LSK.keys);localStorage.removeItem(LSK.prices);localStorage.removeItem(LSK.sync);}catch(e){}
    P={};S={};mountSettings();paintStatus('Disconnected. Your keys and BrickLink prices are gone from this device.');
    if(typeof render==='function'&&typeof owned!=='undefined')render(owned);
  };
}

// ---------- Sources and caveats ----------
function enhanceSources(){
  const ul=document.querySelector('#cx-sources + ul, #cx-sources ul');if(!ul||ul.querySelector('.bl-src'))return;
  if(!hasData()&&!connected())return;
  const li=document.createElement('li');li.className='bl-src';
  li.innerHTML=`BrickLink prices: the quantity-weighted average of what each item sold for on BrickLink in the last 6 months, looked up with your own API keys and kept on this device. Each price shows when it was updated; one older than 6 hours is marked and refreshed when you open it, and one older than 24 hours no longer counts toward your totals. <a href="#bl-connect" data-bl-open>BrickLink settings</a><br><b class="blc-tm">${H(TM)}</b>`;
  ul.insertBefore(li,ul.firstChild.nextSibling);
  const a=li.querySelector('[data-bl-open]');if(a)a.onclick=e=>{e.preventDefault();if(typeof goTab==='function')goTab('value');const d=document.getElementById('bl-connect');if(d){d.open=true;d.scrollIntoView({block:'start'});}};
}

// ---------- popups: "Set my price" button + BrickLink line + refresh the viewed item if older than 6 hours ----------
function info(modal){try{return window.StudDetail&&StudDetail.modalInfo?StudDetail.modalInfo(modal):null;}catch(e){return null;}}
function itemFor(inf){
  if(!inf)return null;
  if(inf.kind==='set')return {key:inf.id,type:'SET',no:inf.id,nu:setBasis(inf.id)};
  const no=blFigNo(inf.id);if(!no)return null;let f=null;try{f=allFigs(owned,extras)[inf.id];}catch(e){}
  return {key:'fig:'+inf.id,type:'MINIFIG',no,nu:figBasis(inf.id,f)};
}
function blLine(it){
  const r=it&&rec(it.key,it.nu);
  if(!r||(!r.v&&!r.err))return connected()?'<span class="muted">BrickLink price: not looked up yet.</span>':'';
  if(!r.v)return `<span class="muted">BrickLink: no ${it.nu==='N'?'new':'used'} sales in the last 6 months.</span>`;
  const stale=Date.now()-r.t>STALE_MS;
  return `BrickLink price, updated ${ago(r.t)}: <b class="bl-price">${money(r.v,r.cur)}</b> (${it.nu==='N'?'new':'used'}${r.n?`, ${r.n} sale${r.n===1?'':'s'}`:''})${stale?` <span class="bl-stale">${r.failT?'older than 6 hours, could not refresh':'older than 6 hours'}</span>`:''}`;
}
function enhanceModal(modal){
  if(!modal||modal.dataset.bl==='1')return;const inf=info(modal);if(!inf)return;modal.dataset.bl='1';
  const body=modal.querySelector('.mbody');if(!body)return;
  // Set my price: make your own entry easy to find (it beats every other source)
  const mv=body.querySelector('.cx-mval');
  if(mv&&!body.querySelector('.bl-mine')){
    const inp=mv.querySelector('input'),has=inp&&inp.value;
    const b=document.createElement('button');b.type='button';b.className='bl-mine no-swipe';b.textContent=has?'Change my price':'Set my price';
    const note=document.createElement('p');note.className='muted small bl-mine-note';note.textContent='Your own price always wins over BrickLink, your file, and price feeds.';
    mv.insertAdjacentElement('beforebegin',b);
    if(!has){mv.hidden=true;note.hidden=true;}
    mv.insertAdjacentElement('afterend',note);
    b.onclick=()=>{mv.hidden=false;note.hidden=false;b.hidden=true;if(inp){inp.focus();try{inp.select();}catch(e){}}};
    if(has)b.hidden=true;
  }
  const it=itemFor(inf);if(!it||(!connected()&&!rec(it.key,it.nu)))return;
  const h4=[...body.querySelectorAll('h4')].find(x=>/^value$/i.test(x.textContent.trim()));
  const line=document.createElement('p');line.className='bl-line small';line.innerHTML=blLine(it)+`<span class="bl-tm">${H(TM)}</span>`;
  if(h4)h4.insertAdjacentElement('afterend',line);else{const a=body.querySelector('a.btn');if(a)a.insertAdjacentElement('beforebegin',line);else body.appendChild(line);}
  if(connected()&&!isDemo()&&age(it)>STALE_MS&&budget()){
    const before=rec(it.key,it.nu);const oldV=before&&before.v;
    line.insertAdjacentHTML('beforeend','<span class="muted bl-refreshing"> Refreshing…</span>');
    lookup([it]).then(r=>{
      const rf=line.querySelector('.bl-refreshing');if(rf)rf.remove();
      if(!document.body.contains(line))return;
      line.innerHTML=blLine(it)+`<span class="bl-tm">${H(TM)}</span>`;
      const now=rec(it.key,it.nu);
      if(r.ok&&now&&now.v&&oldV!==now.v){ // update the estimate shown above, when it came from BrickLink
        const vp=[...body.querySelectorAll('p')].find(p=>p!==line&&p.textContent.includes(SRC));
        if(vp&&oldV)vp.innerHTML=vp.innerHTML.replace(money(oldV,now.cur),money(now.v,now.cur));
        if(typeof render==='function'){quiet=true;try{render(owned);}finally{quiet=false;}}
      }
      if(!r.ok){S.last={t:Date.now(),ok:false,msg:String(r.error||'').slice(0,120),got:0,left:0};saveS();}
    });
  }
}
try{new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;const md=n.id==='setmodal'?n:n.querySelector&&n.querySelector('#setmodal');
  if(md)requestAnimationFrame(()=>requestAnimationFrame(()=>enhanceModal(md)));}}).observe(document.body,{childList:true});}catch(e){}

// ---------- hooks ----------
function afterRender(){try{enhanceSources();}catch(e){}if(!document.getElementById('bl-connect'))mountSettings();if(!quiet&&!running)soon();}
window.addEventListener('DOMContentLoaded',()=>{
  if(typeof render==='function'){const _r=render;render=function(){const r=_r.apply(this,arguments);afterRender();return r;};}
  mountSettings();afterRender();
});
const css=document.createElement('style');css.textContent=`
.blc{background:#0A3463;border:2px solid #6C6E68;border-radius:10px;padding:10px 14px;margin:16px 0}
.blc>summary{cursor:pointer;font-weight:800;font-size:17px;color:#A5CA18}
.blc-off{opacity:.72}.blc-off input,.blc-off button{cursor:not-allowed}
.blc-soon,.blc-on{display:inline-block;font-size:12px;font-weight:800;border-radius:4px;padding:2px 7px;margin-left:6px;vertical-align:middle}
.blc-soon{background:#6C6E68;color:#F2F3F2}.blc-on{background:#237841;color:#F2F3F2}
.blc-steps{padding-left:20px;line-height:1.45}.blc-steps a,.bl-src a{color:#F2CD37}
.blc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px}@media (max-width:600px){.blc-grid{grid-template-columns:1fr}}
.blc-f{display:flex;flex-direction:column;font-size:13px;font-weight:700;gap:3px}
.blc-f input{font:inherit;font-weight:400;font-family:ui-monospace,monospace;padding:8px;border-radius:6px;border:2px solid #6C6E68;background:#05131D;color:#F2F3F2;min-width:0}
.blc-safe{background:#05131D;border-left:4px solid #A5CA18;padding:8px 10px;border-radius:4px}
.blc-forget{background:#6B5A5A;color:#F2F3F2}
.blc-tm,.bl-tm{display:block;font-size:12px;font-weight:700;color:#F2CD37;margin-top:8px;line-height:1.4}
.bl-line{background:#05131D;border:2px solid #0A3463;border-radius:8px;padding:8px 10px;margin:6px 0;line-height:1.4}
.bl-price{font-size:1.85em;font-weight:800;display:inline;line-height:1.15}
.bl-stale{display:inline-block;background:#A95500;color:#fff;font-weight:700;border-radius:4px;padding:1px 6px;font-size:11px}
.bl-mine{background:#F2CD37;color:#05131D;font-size:15px;padding:9px 16px}
`;document.head.appendChild(css);

window.StudBL={value,history,sync,connected,endpoint,_state:()=>({P,S})};
})();
