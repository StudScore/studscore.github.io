// ---- Community prices (added by Money): opt-in anonymous price sharing + ./community.json display on the Value tab ----
// Off by default. When the collector turns it on, StudScore sends ONLY these six fields for upload rows that have a
// price paid or sold: item id, new/used, price, currency, month (YYYY-MM), paid/sold. No names, notes, totals,
// quantities, storage locations or whole collections. Rows already sent are remembered (short hashes) and not resent.
// ./community.json is built daily by pipeline/build_community.py from the Worker's aggregates (3+ separate reports only).
// Reads uploads without touching collection.js: it wraps the global loadCollection the same way collection.js does.
const COMMUNITY_ENDPOINT = 'https://studscore-community.studscore.workers.dev/submit'; // live Worker (studscore-community)
(function(){
const LSK={on:'studShareOn',rows:'studShareRows',sent:'studShareSent',first:'studShareFirst',last:'studShareLast'};
const ld=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v;}catch(e){return d;}};
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const MAX_BATCH=500,MIN_REPORTS=3;
const pad=n=>String(n).padStart(2,'0');
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const monLbl=m=>{const p=String(m).split('-');return MON[+p[1]-1]+' '+p[0].slice(2);};
const H=s=>(typeof esc==='function'?esc:String)(s==null?'':s);
let CJ=null,status='',sending=false;

// ---------- read price paid / sold rows from an upload (CSV/TSV with headers) ----------
// ONLY cost/paid columns (kind 'paid') and explicit sold-price columns (kind 'sold'). Value/price/asking columns and
// BrickLink XML <PRICE> are asking or estimate values and are never read here. Rows without a real month are skipped.
const normH=h=>String(h||'').toLowerCase().replace(/^\ufeff/,'').replace(/[^a-z0-9]/g,'');
const COLS={id:['itemno','itemnumber','itemid','item','setnum','setnumber','setno','set','number'],variant:['variant'],type:['itemtype','type'],cat:['category','categoryname'],
  paid:['cost','paid','pricepaid','purchaseprice','costprice','mycost','amountpaid','acquiredprice'],
  sold:['soldprice','pricesold','saleprice','salesprice','soldfor','sold'],
  date:['dateacquired','acquired','acquireddate','purchasedate','datepurchased','bought','datebought','dateadded','added'],
  sdate:['datesold','solddate','saledate'],
  cond:['condition','cond','newused','status'],sub:['completeness','subcondition','built'],cur:['currency']};
function num(s){s=String(s||'').trim();if(!s)return null;s=s.replace(/[^\d.,-]/g,'');if(/^\d+,\d{1,2}$/.test(s))s=s.replace(',','.');else s=s.replace(/,/g,'');const n=parseFloat(s);return isFinite(n)&&n>0&&n<20000?Math.round(n*100)/100:null;}
function month(s){s=String(s||'').trim();if(!s)return null;let m=/(\d{4})-(\d{1,2})/.exec(s),y,mo;
  if(m){y=+m[1];mo=+m[2];}else if((m=/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s))){y=+m[3];if(y<100)y+=y>50?1900:2000;mo=+m[1];}else return null; // a bare year is too vague for a monthly price
  if(mo<1||mo>12||y<1949)return null;const v=`${y}-${pad(mo)}`,d=new Date(),now=`${d.getFullYear()}-${pad(d.getMonth()+1)}`;return v>now?null:v;}
// Sealed / new / unbuilt -> new; used, built, opened, incomplete -> used; no condition -> new (the app's sealed basis).
function condOf(c,sub){c=String(c||'').trim();sub=String(sub||'').trim().toUpperCase();
  if(sub==='S'||/sealed|misb|nisb|unbuilt|^n(ew)?$/i.test(c))return 'new';
  if(/^u(sed)?$|built|assembled|open|incomplete|missing|complete/i.test(c)||sub==='B'||sub==='C')return 'used';
  return 'new';}
const FIG_RE=/^(fig-\d{6}|[a-z]{2,8}\d{2,5}[a-z]{0,2})$/;
function itemId(type,id,desc){id=String(id||'').trim();if(!id)return null;
  if(type==='S'||!type){const k=typeof setKey==='function'?setKey(id):null;if(k&&/^[0-9A-Za-z]{2,15}-\d{1,3}$/.test(k))return k;
    if(/^col/i.test(id)&&typeof cmfSetNum==='function'){const c=cmfSetNum(id,desc);if(c)return c;}}
  if(type==='M'||/^col/i.test(id)||/^fig-/i.test(id)){const f=id.toLowerCase();return FIG_RE.test(f)?f:null;}
  return null;}
function extractRows(text){
  text=String(text||'').replace(/^\ufeff/,'');if(/<ITEM>/i.test(text)||typeof csvRows!=='function')return [];
  const first=text.split(/\r?\n/).find(l=>l.trim())||'';
  const delim=[',','\t',';'].map(d=>[d,first.split(d).length]).sort((a,b)=>b[1]-a[1])[0][0];
  const rows=csvRows(text,delim);if(rows.length<2)return [];
  const Hd=rows[0].map(normH),I={};for(const k in COLS){I[k]=-1;for(const n of COLS[k]){const i=Hd.indexOf(n);if(i>=0){I[k]=i;break;}}}
  if(I.paid<0&&I.sold<0)return [];
  const out=[];
  for(const r of rows.slice(1)){
    const g=k=>I[k]>=0?String(r[I[k]]==null?'':r[I[k]]).trim():'';
    let type=I.type>=0&&typeof typeFromWord==='function'?typeFromWord(g('type')):null;if(!type&&I.cat>=0&&typeof typeFromCat==='function')type=typeFromCat(g('cat'));
    if(type&&type!=='S'&&type!=='M')continue;
    let raw=g('id');if(I.variant>=0&&raw)raw=raw+'-'+(g('variant')||'1');
    const id=itemId(type,raw,'');if(!id)continue;
    const cond=condOf(g('cond'),g('sub')),cur=/^[A-Za-z]{3}$/.test(g('cur'))?g('cur').toUpperCase():'USD';
    const p=num(g('paid')),pm=month(g('date'));if(p&&pm)out.push({id,cond,price:p,currency:cur,month:pm,kind:'paid'});
    const s=num(g('sold')),sm=month(g('sdate'))||month(g('date'));if(s&&sm)out.push({id,cond,price:s,currency:cur,month:sm,kind:'sold'});
  }
  return out;
}
// No fallback to collection.js's saved summary: it averages costs and turns a bare year into January, which would guess the month.
const isDemo=()=>!!ld('studDemo',false);
function shareRows(){if(isDemo())return [];const r=ld(LSK.rows,null);return Array.isArray(r)?r:[];}
function hash(r){const s=[r.id,r.cond,r.price,r.currency,r.month,r.kind].join('|');let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(36);}
function pending(){const sent=new Set(ld(LSK.sent,[]));const seen=new Set();return shareRows().filter(r=>{const h=hash(r);if(sent.has(h)||seen.has(h))return false;seen.add(h);return true;});}
const isOn=()=>ld(LSK.on,false)===true;
const shared=()=>!!ld(LSK.first,null);

async function send(){
  if(sending||!isOn()||!COMMUNITY_ENDPOINT||isDemo())return;
  const batch=pending().slice(0,MAX_BATCH).map(r=>({id:r.id,cond:r.cond,price:r.price,currency:r.currency,month:r.month,kind:r.kind}));
  if(!batch.length)return;
  sending=true;status='Sharing…';paint();
  try{const res=await fetch(COMMUNITY_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({v:1,rows:batch}),credentials:'omit',referrerPolicy:'no-referrer',mode:'cors'});
    if(res.ok){const sent=ld(LSK.sent,[]);for(const r of batch)sent.push(hash(r));sv(LSK.sent,sent.slice(-20000));const d=new Date(),day=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      if(!shared()){sv(LSK.first,day);sending=false;if(typeof render==='function'&&typeof owned!=='undefined')render(owned);} // shows the Price Pioneer badge
      sv(LSK.last,day);status=`Thanks! Shared ${batch.length} price${batch.length>1?'s':''}.`;}
    else status=res.status===429?'Sharing paused for today. We\'ll try again on your next visit.':'Couldn\'t share right now. We\'ll try again on your next visit.';
  }catch(e){status='Couldn\'t reach the community server. We\'ll try again on your next visit.';}
  sending=false;paint();
  if(isOn()&&pending().length&&/^Thanks/.test(status))setTimeout(send,1500); // next batch of 500
}

// ---------- community.json ----------
function loadCJ(){
  if(typeof window!=='undefined'&&window.STUD_COMMUNITY){CJ=window.STUD_COMMUNITY;paint();return;}
  fetch('community.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(j=>{if(j&&j.items&&typeof j.items==='object'){CJ=j;paint();}}).catch(()=>{});}
function money(v,cur){try{return new Intl.NumberFormat('en-US',{style:'currency',currency:cur||'USD',maximumFractionDigits:v>=100?0:2}).format(v);}catch(e){return v.toFixed(2)+' '+(cur||'');}}
function spark(hist,cur){const h=hist.filter(x=>x&&x[1]>0).slice(-12);if(h.length<2)return '';const W=132,Hh=30,vs=h.map(x=>x[1]),lo=Math.min(...vs),hi=Math.max(...vs),rg=hi-lo||1;
  const pts=h.map((x,i)=>[4+i*(W-8)/(h.length-1),Hh-4-(x[1]-lo)/rg*(Hh-8)]);
  return `<svg class="cm-spark" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Community price by month"><polyline fill="none" stroke="#A5CA18" stroke-width="2" points="${pts.map(p=>p.map(n=>n.toFixed(1)).join(',')).join(' ')}"/>${pts.map(p=>`<rect x="${(p[0]-2.5).toFixed(1)}" y="${(p[1]-2.5).toFixed(1)}" width="5" height="5" rx="1" fill="#F2CD37"/>`).join('')}</svg>`;}
function ownedItems(){const out=[];
  if(typeof owned==='object'&&owned)for(const k in owned)out.push({id:k,name:(typeof SETS!=='undefined'&&SETS[k])?SETS[k][0]:k,lbl:k.replace(/-1$/,'')});
  try{if(typeof allFigs==='function'){const f=allFigs(owned,typeof extras!=='undefined'?extras:null);for(const id in f)out.push({id:id.toLowerCase(),name:f[id].name||id,lbl:id});}}catch(e){}
  return out;}
let showAll=false;
function priceHTML(){
  if(!CJ)return `<div class="cx-empty"><b>No community prices yet.</b> They appear here once at least ${MIN_REPORTS} collectors have shared a price for the same item and condition.</div>`;
  const cur=CJ.currency||'USD',rows=[];
  for(const it of ownedItems()){const e=CJ.items[it.id];if(!e)continue;const parts=[];
    for(const c of ['new','used']){const x=e[c];if(!x||!(x.count>=MIN_REPORTS)||!(x.price>0))continue;
      const hist=(x.history||[]).filter(h=>Array.isArray(h)&&h[2]>=MIN_REPORTS);
      parts.push(`<div class="cm-cond"><span class="cm-tag cm-${c}">${c==='new'?'New':'Used'}</span> Community price <b>${money(x.price,cur)}</b> <span class="muted">(${x.count} report${x.count>1?'s':''})</span>${hist.length>1?`<div class="cm-hist">${spark(hist,cur)}<span class="muted small">${hist.slice(-4).map(h=>monLbl(h[0])+' '+money(h[1],cur)).join(' · ')}</span></div>`:''}</div>`);}
    if(parts.length)rows.push(`<div class="cm-item"><div class="cm-nm"><b>${H(it.name)}</b>${String(it.name).toLowerCase()===String(it.lbl).toLowerCase()?'':` <span class="muted small">${H(it.lbl)}</span>`}</div>${parts.join('')}</div>`);}
  if(!rows.length)return `<div class="cx-empty"><b>None of your items have community prices yet.</b> An item shows here once at least ${MIN_REPORTS} collectors have shared a price for it.</div>`;
  const LIM=20,shown=showAll?rows:rows.slice(0,LIM);
  return `<p class="cx-cap">${rows.length} of your items · updated ${H(CJ.updated||'')} · ${H(cur)} · source: ${H(CJ.source||'StudScore community')}</p><div class="cm-list">${shown.join('')}</div>${rows.length>LIM?`<button class="cm-more" id="cm-more">${showAll?'Show fewer':'Show all '+rows.length}</button>`:''}`;}
function shareHTML(){
  const live=!!COMMUNITY_ENDPOINT,on=live&&isOn(),n=pending().length,demo=isDemo();
  let st;
  if(!live)st='Sharing turns on soon. Nothing is sent yet.';
  else if(demo)st='The demo collection is never shared.';
  else if(!on)st='Off. Nothing is sent.';
  else st=status||(n?`${n} new price${n>1?'s':''} ready to share.`:(shared()?'All your prices are shared. New ones are sent when you upload again.':'No prices to share. Add a "price paid" (or "sold price") and a date column to your upload.'));
  return `<div class="cm-share"><label class="cm-switch${live?'':' cm-off'}"><input type="checkbox" id="cm-toggle" role="switch"${on?' checked':''}${live&&!demo?'':' disabled'} aria-describedby="cm-what"><span class="cm-track" aria-hidden="true"><span class="cm-knob"></span></span><b>Share my prices anonymously</b></label>
<p class="cm-status" aria-live="polite">${H(st)}</p>
<div id="cm-what" class="cx-note"><b>What's shared:</b> only for rows in your upload that have a price you paid or sold for: the set or minifig number, new or used, the price and currency, the month (like 2026-03), and whether it was paid or sold.<br>
<b>Never shared:</b> your name, notes, quantities, totals, storage locations, the rest of your collection, or anything from the demo.<br>
Prices go to StudScore's community server, which keeps a scrambled code instead of your internet address and only publishes monthly middle prices once 3 or more people report the same item. You can turn this off at any time. Prices already sent stay in the totals because they can't be traced back to you.</div></div>`;}
function boxHTML(){return `<h3>Community prices</h3><p class="cx-cap">What other StudScore collectors say they paid or sold for, shared anonymously. An estimate, not an offer.</p>${priceHTML()}${shareHTML()}`;}
function paint(){const val=document.getElementById('tab-value');if(!val)return;let box=document.getElementById('cm-box');
  if(!box){box=document.createElement('div');box.id='cm-box';box.className='cx needs-data';}
  if(box.parentNode!==val||val.lastElementChild!==box)val.appendChild(box);
  box.innerHTML=boxHTML();
  const t=document.getElementById('cm-toggle');if(t)t.onchange=()=>{sv(LSK.on,t.checked);status='';paint();if(t.checked)send();};
  const m=document.getElementById('cm-more');if(m)m.onclick=()=>{showAll=!showAll;paint();};}

// ---------- hooks (globals from app.js / collection.js; nothing in those files is edited) ----------
const css=document.createElement('style');css.textContent=`
#cm-box .cm-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px;margin:8px 0}
#cm-box .cm-item{background:#05131D;border:2px solid #6C6E68;border-top:6px solid #0A3463;border-radius:8px;padding:8px 10px;font-size:14px}
#cm-box .cm-nm{margin-bottom:4px;line-height:1.25}
#cm-box .cm-cond{margin:4px 0}
#cm-box .cm-tag{display:inline-block;font-size:11px;font-weight:800;padding:1px 7px;border-radius:4px;margin-right:4px;color:#05131D}
#cm-box .cm-new{background:#A5CA18}#cm-box .cm-used{background:#F2CD37}
#cm-box .cm-hist{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:3px}
#cm-box .cm-spark{display:block;background:#0A3463;border-radius:4px}
#cm-box .cm-share{background:#05131D;border:2px solid #6C6E68;border-radius:8px;padding:10px 12px;margin:12px 0}
#cm-box .cm-switch{display:flex;align-items:center;gap:10px;cursor:pointer;font-size:15px}
#cm-box .cm-switch input{position:absolute;opacity:0;width:1px;height:1px}
#cm-box .cm-track{position:relative;flex:none;width:46px;height:26px;background:#6C6E68;border-radius:5px;border:2px solid #05131D;box-shadow:inset 0 -3px 0 rgba(0,0,0,.3);transition:background .15s}
#cm-box .cm-knob{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#F2F3F2;box-shadow:inset 0 -2px 0 rgba(0,0,0,.25),0 1px 2px rgba(0,0,0,.4);transition:left .15s}
#cm-box .cm-switch input:checked+.cm-track{background:#A5CA18}
#cm-box .cm-switch input:checked+.cm-track .cm-knob{left:23px}
#cm-box .cm-switch input:focus-visible+.cm-track{outline:2px solid #F2CD37;outline-offset:2px}
#cm-box .cm-off{cursor:default;opacity:.75}
#cm-box .cm-status{margin:6px 0;font-size:13px;color:#F2CD37}
#cm-box .cm-more{margin:4px 0}`;document.head.appendChild(css);

// colledit.js reads each uploaded file through this chain (good: the real file), then calls it again with one combined CSV
// it builds from all loaded files. That combined CSV has averaged "Price Paid" and summary dates, not real rows, so it is skipped
// here and the rows read from the real file are kept.
const COMPOSED_HEAD='Item Type,Item No,Description,Category,Quantity,Condition,Value,Value New,Value Used,Price Paid,Date Acquired,Currency,BrickEconomy Value';
const isComposed=t=>String(t||'').startsWith(COMPOSED_HEAD);
if(typeof loadCollection==='function'){const _lc=loadCollection;loadCollection=function(text){if(isComposed(text))return _lc.apply(this,arguments);try{sv(LSK.rows,extractRows(text));}catch(e){sv(LSK.rows,[]);}status='';const r=_lc.apply(this,arguments);setTimeout(send,0);return r;};}
const demoBtn=document.getElementById('demo');if(demoBtn)demoBtn.addEventListener('click',()=>{sv(LSK.rows,[]);status='';},true);
// Price Pioneer: a no-points milestone badge, added to the StudScore list once you've shared at least once.
if(typeof scores==='function'){const _sc=scores;scores=function(){const S=_sc.apply(this,arguments);
  if(shared()&&S&&Array.isArray(S.ach)&&S.ach.length&&!S.ach.some(a=>a.id==='pioneer'))S.ach.push({id:'pioneer',icon:'🏷️',title:'Price Pioneer',desc:'Share your prices with the StudScore community',g:0,nopoints:true,unlocked:true,winner:'Shared since '+ld(LSK.first,'')});
  return S;};}
window.addEventListener('DOMContentLoaded',()=>{
  if(typeof render==='function'){const _r=render;render=function(){const r=_r.apply(this,arguments);paint();return r;};}
  paint();loadCJ();if(isOn())send();
  if(typeof render==='function'&&shared()&&typeof owned!=='undefined')render(owned);
});
if(typeof window!=='undefined')window.StudCommunity={extractRows,pending,hash,send,paint,endpoint:()=>COMMUNITY_ENDPOINT};
})();
