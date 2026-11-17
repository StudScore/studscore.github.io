// ---- Collection log (added by Cole): Collection Snapshot, Theme progress, Value History (stock-style chart, month lookup,
// top movers, value checkpoints), All my stuff, Bulk and loose parts, Sources and caveats.
// Everything runs on the collector's own upload, in the browser. No collection or price data ships with the site.
// Value sources, in order: your own entry (set popup) > value/price columns in your upload > ./prices.json > nothing ("coming soon").
// Value history: ./prices.json set histories if present, else dated snapshots saved in this browser each visit, else empty states.
// ./prices.json (written by the price-feed job; optional, ignored if missing):
//   {"source":"Brick Owl","source_url":"https://www.brickowl.com","currency":"GBP","updated":"2026-12-01",
//    "sets":{"75192-1":{"new":650.0,"used":480.0,"date":"2026-12-01","history":[["2024-01",700.0,510.0],["2024-02",null,505.0], ...oldest first]}}}
// Sealed/new sets use the "new" value and history, opened sets the "used" one; with no condition in the upload, "new" (sealed basis).
// Tests can inject window.STUD_PRICES with the same shape.
(function(){
const LS={meta:'studMeta',snaps:'studSnapshots',user:'studUserValues'};
const ld=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v;}catch(e){return d;}};
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
let META=ld(LS.meta,null),USERV=ld(LS.user,{}),PRICES=null,PH=null,DEMO=!!ld('studDemo',false); // DEMO: your own entries and checkpoints stay out of the demo
const pad=n=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtD=s=>{if(!s)return '';const p=String(s).split('-');return p[2]?`${MON[p[1]-1]} ${+p[2]}, ${p[0]}`:p[1]?`${MON[p[1]-1]} ${p[0]}`:p[0];};
const tOf=s=>{const p=String(s).split('-').map(Number);return Date.UTC(p[0],(p[1]||1)-1,p[2]||1);};
function money(v,cur,whole){try{return new Intl.NumberFormat('en-US',{style:'currency',currency:cur||'USD',maximumFractionDigits:whole?0:2,minimumFractionDigits:whole?0:2}).format(v);}catch(e){return (whole?Math.round(v):v.toFixed(2))+' '+(cur||'');}}
const pct=(a,b)=>(b>=a?'+':'')+((b/a-1)*100).toFixed(1)+'%';
const signed=(a,b,c)=>(b>=a?'+':'-')+money(Math.abs(b-a),c);
const tone=(a,b)=>b>a?'up':b<a?'down':'';
const sn=k=>String(k).replace(/-1$/,'');
const E=s=>esc(s==null?'':s);

// ---------- read the extra columns (value, cost, condition, location, date) from the raw upload ----------
const normH=h=>String(h||'').toLowerCase().replace(/^\ufeff/,'').replace(/[^a-z0-9]/g,'');
const COLS={id:['itemno','itemnumber','itemid','item','setnum','setnumber','setno','set','number'],variant:['variant'],type:['itemtype','type'],cat:['category','categoryname'],
  qty:['quantity','qty','qtyowned','quantityowned','owned'],desc:['description','itemname','name'],
  value:['value','estvalue','estimatedvalue','currentvalue','marketvalue','myvalue','price','unitprice','myprice','askingprice'],
  vnew:['valuenew','newvalue','currentvaluenew','marketvaluenew'],vused:['valueused','usedvalue','currentvalueused','marketvalueused'],
  cost:['cost','paid','pricepaid','purchaseprice','costprice','mycost','amountpaid','acquiredprice'],
  date:['dateacquired','acquired','acquireddate','purchasedate','datepurchased','bought','datebought','dateadded','added'],
  cond:['condition','cond','newused','status'],sub:['completeness','subcondition','built'],loc:['location','storage','storagelocation','stored','bin','remarks'],cur:['currency']};
function parseNum(s){s=String(s||'').trim();if(!s)return null;s=s.replace(/[^\d.,-]/g,'');if(/^\d+,\d{1,2}$/.test(s))s=s.replace(',','.');else s=s.replace(/,/g,'');const n=parseFloat(s);return isFinite(n)&&n>0?n:null;}
function parseDate(s){s=String(s||'').trim();if(!s)return null;let m=/(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/.exec(s);if(m)return `${m[1]}-${pad(m[2])}-${pad(m[3]||1)}`;
  m=/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s);if(m){let y=+m[3];if(y<100)y+=y>50?1900:2000;return `${y}-${pad(m[1])}-${pad(m[2])}`;}
  m=/\b(19[5-9]\d|20\d\d)\b/.exec(s);return m?`${m[1]}-01-01`:null;}
function condLabel(c,sub){c=String(c||'').trim();sub=String(sub||'').trim().toUpperCase();
  if(sub==='S'||/sealed|misb|nisb/i.test(c))return 'Sealed';
  const inc=sub==='B'||/incomplete|missing/i.test(c),comp=sub==='C';
  if(/^n(ew)?$/i.test(c))return inc?'New, incomplete':'New';
  if(/^u(sed)?$/i.test(c))return 'Used'+(inc?', incomplete':comp?', complete':'');
  if(!c)return inc?'Incomplete':comp?'Complete':null;
  if(inc)return 'Incomplete';if(/unbuilt/i.test(c))return 'Unbuilt';if(/built|assembled/i.test(c))return 'Built';
  return (c[0].toUpperCase()+c.slice(1)).slice(0,30);}
function buildMeta(text,fmt){
  text=String(text||'').replace(/^\ufeff/,'');
  const M={fmt:fmt||'file',loaded:today(),sets:{},figs:{},parts:{v:0,q:0},cur:null,vcol:null,has:{}};
  const put=(type,id,qty,f)=>{
    if(!(qty>0))return;id=String(id||'').trim();if(!id)return;
    if(type==='S'){let k=setKey(id);if(!k&&/^col/i.test(id))k=cmfSetNum(id,f.desc);
      if(k){const e=M.sets[k]||(M.sets[k]={q:0,v:0,vq:0,vn:null,vu:null,c:0,cq:0,d:null,cond:{},loc:{}});e.q+=qty;
        if(f.value){e.v+=f.value*qty;e.vq+=qty;M.has.value=1;}if(f.vnew){e.vn=f.vnew;M.has.value=1;}if(f.vused){e.vu=f.vused;M.has.value=1;}
        if(f.cost){e.c+=f.cost*qty;e.cq+=qty;M.has.cost=1;}if(f.date){if(!e.d||f.date<e.d)e.d=f.date;M.has.date=1;}
        if(f.cond){e.cond[f.cond]=(e.cond[f.cond]||0)+qty;M.has.cond=1;}if(f.loc){e.loc[f.loc]=(e.loc[f.loc]||0)+qty;M.has.loc=1;}return;}
      if(/^col/i.test(id))type='M';else return;}
    if(type==='M'){const e=M.figs[id]||(M.figs[id]={q:0,v:0,vq:0});e.q+=qty;if(f.value){e.v+=f.value*qty;e.vq+=qty;M.has.figValue=1;}return;}
    if(type==='P'&&f.value){M.parts.v+=f.value*qty;M.parts.q+=qty;M.has.partValue=1;}
  };
  const setCur=c=>{c=String(c||'').trim().toUpperCase();if(!M.cur&&/^[A-Z]{3}$/.test(c))M.cur=c;};
  if(/<ITEM>/i.test(text)){
    const tag=(b,t)=>{const r=new RegExp('<'+t+'>([\\s\\S]*?)</'+t+'>','i').exec(b);return r?htmlDecode(r[1].trim()):'';};
    const re=/<ITEM>([\s\S]*?)<\/ITEM>/gi;let m;
    while((m=re.exec(text))){const b=m[1],q=tag(b,'QTY')||tag(b,'MINQTY'),price=parseNum(tag(b,'PRICE'));if(price)M.vcol='PRICE';setCur(tag(b,'CURRENCY'));
      put(typeFromWord(tag(b,'ITEMTYPE')),tag(b,'ITEMID'),q===''?1:parseInt(q),{value:price,cond:condLabel(tag(b,'CONDITION'),tag(b,'SUBCONDITION')),loc:tag(b,'REMARKS').slice(0,40),date:parseDate(tag(b,'DATEADDED')),desc:tag(b,'ITEMNAME')});}
    return M;}
  const first=text.split(/\r?\n/).find(l=>l.trim())||'';
  const delim=[',','\t',';'].map(d=>[d,first.split(d).length]).sort((a,b)=>b[1]-a[1])[0][0];
  const rows=csvRows(text,delim);if(rows.length<2)return M;
  const H=rows[0].map(normH),I={};
  for(const k in COLS){I[k]=-1;for(const n of COLS[k]){const i=H.indexOf(n);if(i>=0){I[k]=i;break;}}}
  if(!Object.values(I).some(i=>i>=0))return M;
  if(I.value>=0)M.vcol=rows[0][I.value].trim();else if(I.vnew>=0||I.vused>=0)M.vcol='value new/used';
  for(const r of rows.slice(1)){
    const g=k=>I[k]>=0?String(r[I[k]]==null?'':r[I[k]]).trim():'';
    let type=I.type>=0?typeFromWord(g('type')):null;if(!type&&I.cat>=0)type=typeFromCat(g('cat'));if(!type&&I.type<0&&I.cat<0)type='S';
    let id=g('id');if(I.variant>=0&&id)id=id+'-'+(g('variant')||'1');
    if(!id)id=r.map(c=>String(c).trim()).find(c=>/^[0-9A-Za-z]+-\d+$/.test(c)&&SETS[c])||'';
    const qs=g('qty');setCur(g('cur'));
    put(type,id,qs===''?1:parseInt(qs),{value:parseNum(g('value')),vnew:parseNum(g('vnew')),vused:parseNum(g('vused')),cost:parseNum(g('cost')),date:parseDate(g('date')),cond:condLabel(g('cond'),g('sub')),loc:g('loc').slice(0,40),desc:g('desc')});
  }
  return M;
}

// ---------- values ----------
const topKey=o=>{const e=Object.entries(o||{}).sort((a,b)=>b[1]-a[1])[0];return e?e[0]:null;};
const condOf=k=>{const e=META&&META.sets[k];return e?topKey(e.cond):null;};
const basisOf=k=>{const c=condOf(k);return !c||/sealed|new/i.test(c)?'new':'used';};
const mainCur=()=>(META&&META.has&&META.has.value&&(META.cur||'USD'))||(PRICES&&PRICES.currency)||(META&&META.cur)||'USD';
function phLatest(k){if(!PH)return null;const col=PH._col[k];if(!col)return null;for(let i=PH.months.length-1;i>=0;i--){const v=parseNum(PH.months[i][col]);if(v)return {v,m:PH.months[i].month};}return null;}
function valueOf(k){
  const u=!DEMO&&USERV[k];if(u&&u.v)return {v:u.v,cur:u.cur||mainCur(),src:'your entry',date:u.d,kind:'user'};
  const e=META&&META.sets[k];
  if(e&&e.vq)return {v:e.v/e.vq,cur:META.cur||'USD',src:`your ${META.fmt} file (${META.vcol||'value'} column)`,date:META.loaded,kind:'file'};
  if(e&&(e.vn||e.vu)){const b=basisOf(k),v=b==='new'?(e.vn||e.vu):(e.vu||e.vn);return {v,cur:META.cur||'USD',src:`your ${META.fmt} file (value ${v===e.vn?'new':'used'})`,date:META.loaded,kind:'file',basis:v===e.vn?'new':'used'};}
  const p=priceRec(k);
  if(p){const b=basisOf(k),nv=parseNum(p.new),uv=parseNum(p.used),v=b==='new'?(nv||uv):(uv||nv);
    if(v)return {v,cur:PRICES.currency||'USD',src:PRICES.source||'prices.json',date:p.date||PRICES.updated,kind:'prices',basis:v===nv?'new':'used',example:!!PRICES.example};}
  const h=phLatest(k);if(h)return {v:h.v,cur:PH.currency||'USD',src:PH.source,date:PH.updated||h.m,kind:'feed',basis:PH.basis,example:!!PH.example};
  return null;
}
function priceRec(k){const S=PRICES&&PRICES.sets;if(!S)return null;const p=S[k]||S[sn(k)];return p&&typeof p==='object'?p:null;}
function hist(k,b){const p=priceRec(k);if(!p||!Array.isArray(p.history))return [];const i=b==='new'?1:2;
  return p.history.filter(r=>Array.isArray(r)&&/^\d{4}-\d{2}$/.test(String(r[0]))&&parseNum(r[i])).map(r=>[String(r[0]),parseNum(r[i])]);}
// Month-by-set table from prices.json histories, for the sets you own: each set uses its own basis (falls back to the other one if that's all there is)
function buildPH(keys){
  if(!PRICES||!PRICES.sets)return null;const rows={},col={},bases=new Set();
  keys.forEach(k=>{let b=basisOf(k),h=hist(k,b);if(!h.length){b=b==='new'?'used':'new';h=hist(k,b);}if(!h.length)return;
    col[k]=k;bases.add(b);h.forEach(([m,v])=>{(rows[m]=rows[m]||{month:m})[k]=v;});});
  const months=Object.values(rows).sort((a,b)=>a.month.localeCompare(b.month));if(!months.length)return null;
  const basis=bases.size>1?'mixed (new for sealed, used for opened)':bases.has('used')?'used':'new/sealed';
  return {months,_col:col,source:PRICES.source||'prices.json',updated:PRICES.updated,currency:PRICES.currency||'USD',basis,example:!!PRICES.example};
}

// ---------- value history model (prices.json set histories, else snapshots saved on this device) ----------
function model(list){
  const qty={};list.forEach(s=>qty[s.num]=s.qty);
  if(PH){const ks=list.map(s=>s.num).filter(k=>PH._col[k]);
    if(ks.length){const P=[],last={};let carried=0;
      PH.months.forEach(r=>{const s={},car={};ks.forEach(k=>{const v=parseNum(r[PH._col[k]]);if(v){last[k]=v;s[k]=v*qty[k];}else if(last[k]!=null){s[k]=last[k]*qty[k];car[k]=1;carried++;}});
        const m=String(r.month).slice(0,7);P.push({key:m,label:fmtD(m),t:tOf(m),s,car});});
      return {kind:'feed',P,cur:PH.currency||'USD',basis:PH.basis||'',src:PH.source,updated:PH.updated,example:!!PH.example,carried,unit:'month'};}}
  const snaps=DEMO?[]:ld(LS.snaps,[]).filter(x=>x&&x.s&&x.d);if(!snaps.length)return null;
  const cur=snaps[snaps.length-1].cur||'USD';const own=new Set(list.map(s=>s.num));
  const P=snaps.filter(x=>(x.cur||'USD')===cur).map(x=>{const s={};for(const k in x.s)if(own.has(k))s[k]=x.s[k];return {key:x.d,label:fmtD(x.d),t:tOf(x.d),s,car:{}};}).filter(p=>Object.keys(p.s).length);
  if(!P.length)return null;
  return {kind:'snap',P,cur,basis:'',src:'snapshots saved on this device',updated:P[P.length-1].key,example:false,carried:0,unit:'date'};
}
function derive(M){
  const P=M.P,core=Object.keys(P[0].s);
  P.forEach((p,i)=>{p.total=Object.values(p.s).reduce((a,v)=>a+v,0);p.n=Object.keys(p.s).length;p.core=core.reduce((a,k)=>a+(p.s[k]||0),0);
    p.th={};for(const k in p.s){const t=rootTheme(SETS[k][2]);p.th[t]=(p.th[t]||0)+p.s[k];}
    p.join=i?Object.keys(p.s).filter(k=>!(k in P[i-1].s)):[];});
  M.core=core;M.coreDiffers=P.some(p=>p.n!==core.length);
  M.ann=P.map((p,i)=>({i,p})).filter(x=>x.p.join.length).sort((a,b)=>b.p.join.length-a.p.join.length||b.i-a.i).slice(0,4)
    .map(x=>({t:x.p.t,label:x.p.join.length===1?SETS[x.p.join[0]][0]+' joins':x.p.join.length+' sets join'}));
  const L=P[P.length-1];M.themes=Object.entries(L.th).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
  return M;
}
function baseIdx(P,days){const tl=P[P.length-1].t-days*864e5+3*864e5;let b=-1;for(let i=0;i<P.length-1;i++)if(P[i].t<=tl)b=i;return b;}
function sameSets(a,b,filter){let x=0,y=0,n=0;for(const k in a.s)if(k in b.s&&(!filter||filter(k))){x+=a.s[k];y+=b.s[k];n++;}return {a:x,b:y,n};}

// ---------- chart ----------
function chartSVG(W,series,ann,cur,sel){
  const H=W<500?200:250,pl=6,pr=W<500?50:62,pt=ann.length?30:12,pb=22;
  const vals=series.flatMap(s=>s.pts.map(p=>p[1])).filter(Number.isFinite),ts=series.flatMap(s=>s.pts.map(p=>p[0]));
  if(!vals.length)return '';
  let t0=Math.min(...ts),t1=Math.max(...ts);if(t1===t0){t0-=15*864e5;t1+=15*864e5;}
  let y0=Math.min(...vals),y1=Math.max(...vals);const py=(y1-y0)*.12||y1*.1||1;y0=Math.max(0,y0-py);y1+=py;
  const X=t=>pl+(t-t0)/(t1-t0)*(W-pl-pr),Y=v=>pt+(1-(v-y0)/(y1-y0))*(H-pt-pb);
  let g='';for(let i=0;i<=3;i++){const v=y0+(y1-y0)*i/3,y=Y(v);g+=`<line x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}" stroke="#2B3D4A"/><text x="${W-pr+4}" y="${y+4}" fill="#D5D7D3" font-size="11">${money(v,cur,1)}</text>`;}
  const d0=new Date(t0),d1=new Date(t1),lab=d=>MON[d.getUTCMonth()]+' '+d.getUTCFullYear();
  g+=`<text x="${pl}" y="${H-6}" fill="#D5D7D3" font-size="11">${lab(d0)}</text><text x="${W-pr}" y="${H-6}" fill="#D5D7D3" font-size="11" text-anchor="end">${lab(d1)}</text>`;
  const used=[[],[]];ann.slice().sort((a,b)=>a.t-b.t).forEach(a=>{if(a.t<t0||a.t>t1)return;const x=X(a.t),txt=a.label.length>22?a.label.slice(0,21)+'…':a.label,anc=x>W*.6?'end':'start',lw=txt.length*5.6+6;
    const span=anc==='end'?[x-lw,x]:[x,x+lw];const row=[0,1].find(r=>used[r].every(u=>span[1]<u[0]-4||span[0]>u[1]+4));if(row==null)return;used[row].push(span);const y=row?22:11;
    g+=`<line x1="${x}" x2="${x}" y1="${y+3}" y2="${H-pb}" stroke="#F2CD37" stroke-dasharray="2 3" opacity=".7"/><text x="${anc==='end'?x-3:x+3}" y="${y}" fill="#F2CD37" font-size="10" text-anchor="${anc}">${E(txt)}</text>`;});
  series.forEach(s=>{const pts=s.pts.filter(p=>Number.isFinite(p[1]));if(!pts.length)return;
    if(pts.length===1){g+=`<circle cx="${X(pts[0][0])}" cy="${Y(pts[0][1])}" r="5" fill="${s.color}"/>`;return;}
    const d=pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join(' ');
    if(s.area)g+=`<path d="${d} L${X(pts[pts.length-1][0]).toFixed(1)} ${H-pb} L${X(pts[0][0]).toFixed(1)} ${H-pb} Z" fill="${s.color}" opacity=".16"/>`;
    g+=`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.dash?2:2.5}" ${s.dash?'stroke-dasharray="6 4"':''} stroke-linejoin="round"/>`;});
  if(sel!=null&&sel>=t0&&sel<=t1){const x=X(sel);g+=`<line x1="${x}" x2="${x}" y1="${pt}" y2="${H-pb}" stroke="#F2F3F2" opacity=".6"/>`;
    series.forEach(s=>{const p=s.pts.find(p=>p[0]===sel);if(p&&Number.isFinite(p[1]))g+=`<circle cx="${x}" cy="${Y(p[1])}" r="4" fill="${s.color}" stroke="#05131D" stroke-width="2"/>`;});}
  return `<svg class="cx-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" data-t0="${t0}" data-t1="${t1}" data-pl="${pl}" data-pr="${pr}" role="img" aria-label="Value history chart">${g}</svg>`;
}

// ---------- state + styles ----------
let cxRange='all',cxView='total',cxSel=null,cxSearch='',cxTheme='all',cxShowAll=false,LAST=null;
(function(){const st=document.createElement('style');st.textContent=`
.cx-nav{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 4px}.cx-nav a{background:#6B5A5A;color:#F2F3F2;text-decoration:none;padding:5px 11px;border-radius:14px;font-size:13px}
.cx h2{color:#F2CD37;margin:28px 0 4px;font-size:21px;border-bottom:3px solid #F2CD37;padding-bottom:4px}.cx h3{margin:20px 0 4px}
.cx-cap{color:#D5D7D3;font-size:13px;margin:0 0 10px}
.cx-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin:8px 0}
.cx-tile{background:#05131D;border:2px solid #6C6E68;border-top:6px solid #A5CA18;border-radius:8px;padding:10px 12px}
.cx-tile .v{font-size:24px;font-weight:800;line-height:1.15}.cx-tile .l{font-weight:700;font-size:13px;margin-top:2px}.cx-tile .d{font-size:12px;color:#D5D7D3;margin-top:3px}
.cx-tile.tup{border-top-color:#4B9F4A}.cx-tile.tup .v,.cx .up{color:#7CD16B}.cx-tile.tdown{border-top-color:#FF698F}.cx-tile.tdown .v,.cx .down{color:#FF8FA8}
.cx-chips{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.cx-chip{background:#6B5A5A;color:#F2F3F2;padding:5px 10px;border-radius:14px;font-size:13px;margin:0;font-weight:700}
.cx-chip small{font-weight:600;margin-left:4px}.cx-chip.on{background:#A5CA18;color:#111}.cx-chip.on small{color:#111}.cx-chip[disabled]{opacity:.5;cursor:default}
.cx-seg{display:inline-flex;border-radius:6px;overflow:hidden;margin:6px 0}.cx-seg button{margin:0;border-radius:0;background:#6B5A5A;color:#F2F3F2}.cx-seg button.on{background:#A5CA18;color:#111}
.cx-chart{background:#05131D;border:2px solid #6C6E68;border-radius:8px;padding:6px;margin:6px 0;touch-action:pan-y}.cx-svg{display:block;max-width:100%}
.cx-leg{display:flex;gap:4px 14px;flex-wrap:wrap;font-size:12px;color:#D5D7D3;margin:4px 2px}.cx-leg i{display:inline-block;width:16px;height:0;border-top:3px solid;vertical-align:middle;margin-right:5px}
.cx-leg i.dash{border-top-style:dashed}
.cx select,.cx input[type=search],.cx input[type=number]{background:#6B5A5A;color:#F2F3F2;border:1px solid #6C6E68;border-radius:6px;padding:7px;font-size:14px;max-width:100%}
.cx-ctl{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0}.cx-ctl label{font-size:13px;color:#D5D7D3}
.cx-props{display:grid;grid-template-columns:1fr auto;gap:5px 12px;font-size:14px;background:#05131D;border:2px solid #6C6E68;border-radius:8px;padding:10px 12px;margin:8px 0}
.cx-props dt{color:#D5D7D3}.cx-props dd{margin:0;font-weight:700;text-align:right}
.cx-note{font-size:13px;color:#D5D7D3;line-height:1.45;margin:8px 0}
.cx-empty{background:#05131D;border:2px dashed #6C6E68;border-radius:8px;padding:12px;font-size:14px;line-height:1.45;margin:8px 0}
.cx-example{background:#F2CD37;color:#111;font-weight:800;padding:6px 10px;border-radius:6px;margin:8px 0;font-size:13px}
.cx-tw{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:6px 0}table.cx-t{border-collapse:collapse;width:100%;font-size:13px;min-width:420px}
.cx-t th{text-align:left;color:#F2CD37;border-bottom:2px solid #6C6E68;padding:6px;white-space:nowrap}.cx-t td{padding:6px;border-bottom:1px solid #2B3D4A;vertical-align:top}
.cx-t .r{text-align:right;white-space:nowrap}.cx-t tr.click{cursor:pointer}.cx-t tr.click:hover td{background:#0E2230}
.cx-brow{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:end;font-size:13px;margin:7px 0}.cx-brow .cx-bar{grid-column:1/-1}
.cx-bar{height:10px;background:#6B5A5A;border-radius:5px;overflow:hidden}.cx-bar div{height:100%;background:#A5CA18}
.cx-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:4px 24px}
details.cx-th{background:#05131D;border:2px solid #6C6E68;border-radius:8px;padding:8px 10px;margin:6px 0}details.cx-th summary{cursor:pointer;font-weight:700}
.cx-miss{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.cx-miss button{background:#6B5A5A;color:#F2F3F2;font-weight:600;font-size:12px;margin:0;padding:5px 8px}
.cx input::placeholder{color:#E0D8D8}.cx-mval input{width:110px;background:#05131D;color:#F2F3F2;border:1px solid #A5CA18;border-radius:6px;padding:6px}.cx-mval button{padding:6px 10px}
@media (max-width:600px){.cx-tiles{grid-template-columns:1fr 1fr;gap:8px}.cx-tile{padding:8px 9px}.cx-tile .v{font-size:19px}.cx .hide-sm{display:none}table.cx-t{min-width:0;font-size:12px}.cx-t td,.cx-t th{padding:6px 3px}.cx-t .r{white-space:normal}.cx-t .small{white-space:nowrap}}
.cx .show-sm{display:none}@media (max-width:600px){.cx .show-sm{display:inline}}`;document.head.appendChild(st);})();
const tile=(v,l,d,t)=>`<div class="cx-tile ${t?'t'+t:''}"><div class="v">${v}</div><div class="l">${l}</div>${d?`<div class="d">${d}</div>`:''}</div>`;
const table=(cols,rows,rAlign)=>`<div class="cx-tw"><table class="cx-t"><thead><tr>${cols.map((c,i)=>`<th class="${rAlign&&rAlign[i]?'r':''}">${c}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
const bars=(entries,max,fmt)=>entries.map(([k,v,extra])=>`<div class="cx-brow"><span><b>${E(k)}</b></span><span class="muted">${fmt?fmt(v):v}${extra?' · '+extra:''}</span><div class="cx-bar"><div style="width:${max?100*v/max:0}%"></div></div></div>`).join('');
const nSets=v=>v+(v===1?' set':' sets');
const EMPTY_HIST='Your value history builds as you come back: each visit with values saves a dated checkpoint on this device. Full month-by-month history comes with the price feed.';

// Minifigs: loose/imported figs plus figs packed in owned sets (app.js allFigs, merged by fig id so nothing counts twice).
// Falls back to import-only figs if app.js has no allFigs.
function figMap(o){
  const ex=(typeof extras!=='undefined'&&extras)||null;
  if(typeof allFigs==='function'){try{return allFigs(o,ex)||{};}catch(e){console.error('allFigs',e);}}
  const m={},lf=(ex&&ex.figs)||{};for(const id in lf){const f=lf[id];m[id]={name:f.name||id,theme:f.theme||'Other',qty:f.qty,loose:f.qty,from:[]};}return m;
}
function figCounts(F){let total=0,loose=0;for(const id in F){total+=F[id].qty||0;loose+=Math.min(F[id].loose||0,F[id].qty||0);}return {total,loose,inSets:total-loose,uniq:Object.keys(F).length};}
const inSetNote=f=>{const fr=(f.from||[]).map(sn);if(!fr.length)return '';return 'in set '+fr.slice(0,2).join(', ')+(fr.length>2?` +${fr.length-2} more`:'');};

// ---------- main render ----------
function collectionList(o){return Object.keys(o||{}).filter(k=>SETS[k]).map(k=>{const s=SETS[k],e=META&&META.sets[k];
  return {num:k,name:s[0],year:s[1],tid:s[2],theme:rootTheme(s[2]),sub:setTheme(k),parts:s[3],qty:o[k],val:valueOf(k),cost:e&&e.cq?e.c/e.cq:null,date:e?e.d:null,cond:condOf(k),loc:e&&Object.keys(e.loc).length?Object.keys(e.loc).join(', '):null};});}
function cxRender(o){
  const board=document.getElementById('board'),ms=document.getElementById('mysets');if(!board||!ms)return;
  PH=buildPH(Object.keys(o||{}).filter(k=>SETS[k]));
  const list=collectionList(o),cur=mainCur();
  // save today's checkpoint (direct values only: your entries, your file, prices.json)
  const snapS={};let snapN=0;list.forEach(s=>{if(s.val&&s.val.kind!=='feed'&&s.val.cur===cur&&!s.val.example){snapS[s.num]=+(s.val.v*s.qty).toFixed(2);snapN++;}});
  if(snapN&&!DEMO){const sn_=ld(LS.snaps,[]),d=today(),e={d,cur,s:snapS};if(sn_.length&&sn_[sn_.length-1].d===d)sn_[sn_.length-1]=e;else sn_.push(e);sv(LS.snaps,sn_.slice(-730));}
  LAST={list,cur};
  const banner=board.querySelector('.banner');
  if(banner&&!board.querySelector('.cx-nav'))banner.insertAdjacentHTML('afterend',`<nav class="cx-nav"><a href="#cx-snapshot">📊 Snapshot</a><a href="#cx-value">📈 Value history</a><a href="#mysets">🧱 My Sets</a><a href="#cx-all">📋 All my stuff</a><a href="#cx-sources">ℹ️ Sources</a></nav>`);
  let a=document.getElementById('cx-a');if(!a){ms.insertAdjacentHTML('beforebegin','<div id="cx-a" class="cx"></div>');a=document.getElementById('cx-a');}
  let b=document.getElementById('cx-b');if(!b){const mf=document.getElementById('myfigs')||ms;mf.insertAdjacentHTML('afterend','<div id="cx-b" class="cx"></div>');b=document.getElementById('cx-b');}
  a.innerHTML=snapshotHTML(list,cur)+'<div id="cx-value"></div>';
  renderValue();
  b.innerHTML='<div id="cx-allwrap"></div>'+bulkHTML()+sourcesHTML(list);
  renderAll();
  a.querySelectorAll('[data-open]').forEach(x=>x.onclick=()=>openSet(x.dataset.open));
}
function totals(list,cur){let v=0,n=0,other=0,srcs={},ex=false;list.forEach(s=>{if(!s.val)return;if(s.val.cur!==cur){other++;return;}v+=s.val.v*s.qty;n++;srcs[s.val.src]=s.val.date||'';if(s.val.example)ex=true;});return {v,n,other,srcs,ex};}
const srcText=srcs=>Object.entries(srcs).map(([s,d])=>s+(d?' ('+fmtD(d)+')':'')).join('; ');
function snapshotHTML(list,cur){
  if(!list.length)return '';
  const sets=list.reduce((x,s)=>x+s.qty,0),pcs=list.reduce((x,s)=>x+s.parts*s.qty,0);
  const th={};list.forEach(s=>{const t=th[s.theme]||(th[s.theme]={n:0,p:0,v:0});t.n+=s.qty;t.p+=s.parts*s.qty;if(s.val&&s.val.cur===cur)t.v+=s.val.v*s.qty;});
  const thE=Object.entries(th).sort((x,y)=>y[1].n-x[1].n),T=totals(list,cur);
  const cost=list.filter(s=>s.cost).reduce((x,s)=>x+s.cost*s.qty,0),costN=list.filter(s=>s.cost).length;
  const FC=figCounts(figMap(owned)),figs=FC.total;
  let h=`<h2 id="cx-snapshot">Collection snapshot</h2><p class="cx-cap">Your collection as of ${fmtD(today())}, from your upload${META&&META.fmt?' ('+E(META.fmt)+')':''}.</p><div class="cx-tiles">`;
  h+=tile(sets.toLocaleString(),'Sets owned',`${list.length.toLocaleString()} different sets`);
  h+=tile(pcs.toLocaleString(),'Pieces in sets','official counts, Rebrickable');
  h+=T.n?tile(money(T.v,cur),'Estimated value',`${T.n} of ${list.length} sets valued · ${E(srcText(T.srcs))}${T.other?` · ${T.other} in other currencies not counted`:''}${T.ex?' · EXAMPLE DATA':''}`)
        :tile('Coming soon','Estimated value','No values yet. Add them from your file or the set popup, or wait for the price feed.');
  if(figs)h+=tile(figs.toLocaleString(),'Minifigs',`${FC.uniq.toLocaleString()} different${FC.inSets?` · ${FC.loose?FC.loose.toLocaleString()+' loose + ':''}${FC.inSets.toLocaleString()} in your sets`:' · loose'}`);
  h+=tile(String(thE.length),'Themes',thE.length?`${E(thE[0][0])} leads with ${thE[0][1].n} set${thE[0][1].n>1?'s':''}`:'');
  if(costN)h+=tile(money(cost,cur),'What you paid',`${costN} of ${list.length} sets have a cost${T.n?'':''}`);
  if(costN&&T.n){const both=list.filter(s=>s.cost&&s.val&&s.val.cur===cur);if(both.length){const c=both.reduce((x,s)=>x+s.cost*s.qty,0),v=both.reduce((x,s)=>x+s.val.v*s.qty,0);h+=tile(pct(c,v),'Value vs paid',`${signed(c,v,cur)} on ${both.length} sets with both`,tone(c,v));}}
  h+='</div>';
  h+=themeProgressHTML(list);
  h+=`<div class="cx-cols"><div><h3>By theme</h3>${bars(thE.slice(0,10).map(([k,t])=>[k,t.n,`${t.p.toLocaleString()} pcs${t.v?' · '+money(t.v,cur,1):''}`]),thE.length?thE[0][1].n:0,nSets)}${thE.length>10?`<p class="muted small">+${thE.length-10} more themes</p>`:''}</div>`;
  const dec={};list.forEach(s=>{const d=Math.floor(s.year/10)*10;dec[d]=(dec[d]||0)+s.qty;});const decE=Object.entries(dec).sort((x,y)=>x[0]-y[0]);
  h+=`<div><h3>By era</h3>${bars(decE.map(([d,n])=>[d+'s',n]),Math.max(...decE.map(e=>e[1])),nSets)}</div>`;
  if(META&&META.has.cond){const c={};list.forEach(s=>{const k=s.cond||'Not listed';c[k]=(c[k]||0)+s.qty;});const cE=Object.entries(c).sort((x,y)=>y[1]-x[1]);
    h+=`<div><h3>Condition</h3>${bars(cE,cE[0][1],nSets)}</div>`;}
  if(META&&META.has.loc){const c={};list.forEach(s=>{const k=s.loc||'Not listed';c[k]=(c[k]||0)+s.qty;});const cE=Object.entries(c).sort((x,y)=>y[1]-x[1]).slice(0,10);
    h+=`<div><h3>Storage</h3>${bars(cE,cE[0][1],nSets)}</div>`;}
  return h+'</div>';
}
function themeProgressHTML(list){
  const tc={};list.forEach(s=>{(tc[s.tid]=tc[s.tid]||new Set()).add(s.num);});
  const cand=Object.entries(tc).map(([tid,own])=>{const all=Object.keys(SETS).filter(k=>SETS[k][2]==tid&&SETS[k][3]>=20);const have=all.filter(k=>own.has(k));return {tid,all,have,miss:all.filter(k=>!own.has(k))};})
    .filter(c=>c.all.length>=3&&c.have.length).sort((x,y)=>y.have.length-x.have.length||(y.have.length/y.all.length)-(x.have.length/x.all.length)).slice(0,6);
  if(!cand.length)return '';
  return `<h3>Theme progress</h3><p class="cx-cap">Your top themes, counting every set of 20+ pieces. Tap one to see what you're missing.</p>`+cand.map(c=>{const nm=THEMES[c.tid]?tName(THEMES[c.tid][0]):'Theme',done=c.have.length===c.all.length;
    const miss=c.miss.sort((x,y)=>SETS[x][1]-SETS[y][1]);
    return `<details class="cx-th"><summary>${E(nm)} · ${c.have.length} of ${c.all.length} sets${done?' ✅':''}</summary><div class="bar"><div style="width:${100*c.have.length/c.all.length}%"></div></div>${miss.length?`<div class="cx-miss">${miss.slice(0,60).map(k=>`<button data-open="${E(k)}">${E(sn(k))} ${E(SETS[k][0])} (${SETS[k][1]})</button>`).join('')}${miss.length>60?`<span class="muted small">+${miss.length-60} more</span>`:''}</div>`:'<p class="muted small">Complete!</p>'}</details>`;}).join('');
}
const RANGES=[['1m','1M',30],['6m','6M',182],['1y','1Y',365],['5y','5Y',1826],['all','All',null]];
const THC=['#A5CA18','#F2CD37','#36AEBF','#FE8A18','#FF698F','#F2F3F2','#A0BCAC'];
function renderValue(){
  const el=document.getElementById('cx-value');if(!el||!LAST)return;const {list,cur}=LAST;
  const M0=model(list);
  let h=`<h2>Value history</h2>`;
  if(!M0){h+=`<div class="cx-empty"><b>No value history yet.</b> StudScore doesn't have a price feed yet (it's coming). ${EMPTY_HIST}<br><br>To start now: upload a BrickLink inventory with prices, a Brickset export with value columns, or any CSV with a <i>value</i> or <i>price paid</i> column. You can also tap a set in My Sets and enter your own estimate.</div>`;
    h+=`<h3>Top movers, last 12 months</h3><div class="cx-empty">Needs a year of values. ${EMPTY_HIST}</div><h3>Value checkpoints</h3><div class="cx-empty">Each time you come back with values, StudScore keeps the earlier value of each set here to compare with today. ${EMPTY_HIST}</div>`;
    el.innerHTML=h;return;}
  const M=derive(M0),P=M.P,L=P[P.length-1],F=P[0],isM=M.kind==='feed';
  const basisLbl=/mixed/i.test(M.basis)?'Value today (mixed basis)':/sealed|new/i.test(M.basis)?'Sealed-basis value today':/used/i.test(M.basis)?'Used-basis value today':'Value today';
  h+=`<p class="cx-cap">${isM?`${E(M.basis||'')} value estimates from ${E(M.src)}, monthly, ${F.label} to ${L.label}.`:`Checkpoints saved on this device, ${F.label} to ${L.label}.`} Based on ${L.n} of ${list.length} sets${M.coreDiffers?` (${M.core.length} at the start)`:''}; sets join the line when their history starts. Values in ${E(M.cur)}. Updated ${fmtD(M.updated)}.</p>`;
  if(M.example)h+=`<div class="cx-example">⚠️ EXAMPLE DATA: these are made-up test prices, not real values.</div>`;
  // stat tiles
  const i1=baseIdx(P,365),y1=i1>=0?sameSets(P[i1],L):null,all=P.length>1?sameSets(F,L):null,topT=M.themes[0];
  h+='<div class="cx-tiles">'+tile(money(L.total,M.cur),basisLbl,`${L.n} sets · ${E(M.src)} ${fmtD(M.updated)}`);
  h+=y1&&y1.a?tile(pct(y1.a,y1.b),'1-year change',`${signed(y1.a,y1.b,M.cur)} since ${P[i1].label}, same ${y1.n} sets`,tone(y1.a,y1.b)):tile('—','1-year change','Needs a year of history. '+(isM?'':'It builds as you come back.'));
  h+=all&&all.a?tile(pct(all.a,all.b),'All-time change',`${signed(all.a,all.b,M.cur)} since ${F.label}, same ${all.n} sets`,tone(all.a,all.b)):tile('—','All-time change','Needs two or more checkpoints. Come back later.');
  if(topT){const ty=i1>=0?sameSets(P[i1],L,k=>rootTheme(SETS[k][2])===topT):null;
    h+=tile(money(L.th[topT],M.cur),`Top theme: ${E(topT)}`,ty&&ty.a?`${pct(ty.a,ty.b)} in 1 year, same ${ty.n} sets`:`${Object.keys(L.s).filter(k=>rootTheme(SETS[k][2])===topT).length} sets`,ty&&ty.a?tone(ty.a,ty.b):'');}
  h+='</div>';
  // range chips
  h+='<div class="cx-chips">'+RANGES.map(([id,lb,days])=>{const bi=days?baseIdx(P,days):(P.length>1?0:-1);const c=bi>=0?sameSets(P[bi],L):null;
    const p=c&&c.a?pct(c.a,c.b):'—';return `<button class="cx-chip ${cxRange===id?'on':''}" data-r="${id}" ${bi<0?'disabled':''}>${lb}<small class="${c&&c.a?tone(c.a,c.b):''}">${p}</small></button>`;}).join('')+'</div>';
  h+=`<div class="cx-seg"><button data-v="total" class="${cxView==='total'?'on':''}">Total</button><button data-v="themes" class="${cxView==='themes'?'on':''}">By theme</button></div>`;
  // range filter
  const rr=RANGES.find(r=>r[0]===cxRange);let start=0;if(rr&&rr[2]){const bi=baseIdx(P,rr[2]);start=bi>=0?bi:0;}
  const VP=P.slice(start);M.VP=VP;
  let series;
  if(cxView==='total'){series=[{name:'All sets with history',color:'#A5CA18',area:true,pts:VP.map(p=>[p.t,p.total])}];
    if(M.coreDiffers)series.push({name:`Same ${M.core.length} sets since ${F.label}`,color:'#F2CD37',dash:true,pts:VP.map(p=>[p.t,p.core])});}
  else series=M.themes.slice(0,6).map((t,i)=>({name:t,color:THC[i],pts:VP.map(p=>[p.t,p.th[t]!=null?p.th[t]:NaN])}));
  M.series=series;LAST.M=M;
  if(cxSel==null||!P.some(p=>p.t===cxSel))cxSel=L.t;
  h+=`<div class="cx-chart" id="cx-chart"></div><div class="cx-leg">${series.map(s=>`<span><i class="${s.dash?'dash':''}" style="border-color:${s.color}"></i>${E(s.name)}</span>`).join('')}</div>`;
  if(P.length===1)h+=`<div class="cx-empty">One checkpoint so far (${L.label}). ${EMPTY_HIST}</div>`;
  // look up a month
  h+=`<div class="cx-ctl"><label for="cx-pick">Look up a ${M.unit}</label><select id="cx-pick">${P.map(p=>`<option value="${p.t}">${p.label}</option>`).reverse().join('')}</select></div><div id="cx-props"></div>`;
  // explainer
  h+=`<p class="cx-note">${isM?`This line uses ${E(M.basis||'')} values from ${E(M.src)}${M.example?'. These are EXAMPLE DATA, not real prices':''}. Each point is that month's value for the sets you own, times how many you own. Months with no price hold the last value (${M.carried.toLocaleString()} set-months held); nothing is filled in between.`
    :`Each point is a checkpoint StudScore saved on this device on a day you opened it with values (from your file, your own entries, or the price feed). Your history stays on this phone or computer and isn't uploaded.`} Sets join the line when their history starts, so a jump can mean a set joined, not that prices moved${M.coreDiffers?`. The dashed line keeps the same ${M.core.length} sets from ${F.label} so you can see real price movement`:''}. Values are estimates, not offers.</p>`;
  h+=moversHTML(M,list)+checkpointsHTML(M,list);
  el.innerHTML=h;
  el.querySelectorAll('[data-r]').forEach(x=>x.onclick=()=>{cxRange=x.dataset.r;renderValue();});
  el.querySelectorAll('[data-v]').forEach(x=>x.onclick=()=>{cxView=x.dataset.v;renderValue();});
  el.querySelectorAll('[data-open]').forEach(x=>x.onclick=()=>openSet(x.dataset.open));
  const pick=document.getElementById('cx-pick');pick.value=String(cxSel);pick.onchange=()=>{cxSel=+pick.value;drawChart();};
  drawChart();
}
function drawChart(){
  const M=LAST&&LAST.M,el=document.getElementById('cx-chart');if(!M||!el)return;
  const W=Math.max(260,el.clientWidth-12||330);
  el.innerHTML=chartSVG(W,M.series,cxView==='total'?M.ann:[],M.cur,cxSel);
  const svg=el.querySelector('svg');
  if(svg){const pick=e=>{const r=svg.getBoundingClientRect(),t0=+svg.dataset.t0,t1=+svg.dataset.t1,pl=+svg.dataset.pl,pr=+svg.dataset.pr;
      const t=t0+(e.clientX-r.left-pl)/(r.width-pl-pr)*(t1-t0);let best=M.VP[0];M.VP.forEach(p=>{if(Math.abs(p.t-t)<Math.abs(best.t-t))best=p;});
      if(best.t!==cxSel){cxSel=best.t;const s=document.getElementById('cx-pick');if(s)s.value=String(cxSel);drawChart();}};
    svg.addEventListener('click',pick);svg.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')pick(e);});}
  const p=M.P.find(x=>x.t===cxSel)||M.P[M.P.length-1],pr=document.getElementById('cx-props');
  if(pr){let rows=[[`Total${M.basis?', '+M.basis+' basis':''}`,`${money(p.total,M.cur,1)} across ${p.n} sets`]];
    if(M.coreDiffers)rows.push([`Same ${M.core.length} sets since ${M.P[0].label}`,money(p.core,M.cur,1)]);
    M.themes.forEach(t=>{if(p.th[t]!=null)rows.push([t,money(p.th[t],M.cur,1)]);});
    pr.innerHTML=`<dl class="cx-props"><dt><b>${p.label}</b></dt><dd></dd>${rows.map(r=>`<dt>${E(r[0])}</dt><dd>${r[1]}</dd>`).join('')}</dl>`;}
}
function moversHTML(M,list){
  const P=M.P,L=P[P.length-1],bi=baseIdx(P,365),base=bi>=0?P[bi]:null;
  let h=`<h3>Top movers, last 12 months</h3>`;
  if(!base)return h+`<div class="cx-empty">Needs values from a year ago to compare. ${EMPTY_HIST}</div>`;
  const rows=Object.keys(L.s).filter(k=>k in base.s&&base.s[k]>0).map(k=>[k,base.s[k]/(list.find(s=>s.num===k)||{qty:1}).qty,L.s[k]/(list.find(s=>s.num===k)||{qty:1}).qty])
    .sort((x,y)=>(y[2]/y[1])-(x[2]/x[1]));
  const pick=rows.length>15?rows.slice(0,10).concat(rows.slice(-5)):rows;
  h+=`<p class="cx-cap">${E(M.basis||'Value')} per set, ${base.label} vs ${L.label}${M.example?' · EXAMPLE DATA':''}. Biggest gainers first${rows.length>15?', then the 5 biggest drops':''}.</p>`;
  return h+table(['<span class="hide-sm">#</span>','Set',base.label,L.label,'<span class="hide-sm">Change</span>','%'],pick.map(([k,a,b])=>`<tr class="click" data-open="${E(k)}"><td><span class="hide-sm">${E(sn(k))}</span></td><td><b class="show-sm">${E(sn(k))} </b>${E(SETS[k][0])}</td><td class="r">${money(a,M.cur,1)}</td><td class="r">${money(b,M.cur,1)}</td><td class="r"><span class="hide-sm">${signed(a,b,M.cur)}</span></td><td class="r ${tone(a,b)}"><b>${pct(a,b)}</b></td></tr>`),[0,0,1,1,1,1]);
}
function checkpointsHTML(M,list){
  // Earlier saved values for your sets vs now: the earliest used value in prices.json history, else your first saved snapshot of each set.
  const own={};list.forEach(s=>own[s.num]=s);const rows=[];let used=false;
  for(const k in own){const h=hist(k,'used');if(h.length<2)continue;const p=priceRec(k),nowV=parseNum(p.used)||h[h.length-1][1],nowD=parseNum(p.used)?(p.date||PRICES.updated):h[h.length-1][0];
    if(h[0][0]>=String(nowD).slice(0,7))continue;used=true;rows.push({k,date:h[0][0],then:h[0][1],now:nowV,nowD,src:PRICES.source||'prices.json',basis:'used',cur:PRICES.currency||'USD'});}
  if(!rows.length&&!DEMO){const snaps=ld(LS.snaps,[]),d=today();for(const k in own){const s=own[k];if(!s.val||s.val.cur!==LAST.cur)continue;const f=snaps.find(x=>x.s&&x.s[k]&&x.d<d);if(f)rows.push({k,date:f.d,then:f.s[k]/s.qty,now:s.val.v,nowD:s.val.date,src:'saved on this device',cur:LAST.cur});}}
  const title=used?'Used-value checkpoints':'Value checkpoints';
  if(!rows.length)return `<h3>${title}</h3><div class="cx-empty">Each time you come back with values, StudScore keeps the earlier value of each set here to compare with today. ${EMPTY_HIST}</div>`;
  rows.sort((a,b)=>a.date.localeCompare(b.date));
  return `<h3>${title}</h3><p class="cx-cap">Earlier values for your sets vs today's estimate${M.example?' · EXAMPLE DATA':''}.</p>`+table(['Set','Then','Now','Change'],
    rows.slice(0,12).map(r=>`<tr class="click" data-open="${E(r.k)}"><td><b>${E(sn(r.k))}</b> ${E(SETS[r.k][0])}${r.basis?`<br><span class="muted small">${E(r.basis)} value</span>`:''}</td><td class="r">${money(r.then,r.cur,r.then>=1000)}<br><span class="muted small">${fmtD(String(r.date).slice(0,7))}</span></td><td class="r">${money(r.now,r.cur,r.now>=1000)}<br><span class="muted small">${fmtD(String(r.nowD||'').slice(0,7))}</span></td><td class="r ${tone(r.then,r.now)}"><b>${pct(r.then,r.now)}</b><br><span class="small">${signed(r.then,r.now,r.cur)}</span></td></tr>`),[0,1,1,1])+(rows.length>12?`<p class="muted small">Showing the 12 oldest checkpoints of ${rows.length}.</p>`:'');
}
function renderAll(){
  const el=document.getElementById('cx-allwrap');if(!el||!LAST)return;const {list,cur}=LAST;
  const figs=figMap(owned);
  const rows=list.map(s=>({type:'Set',...s})).concat(Object.entries(figs).map(([id,f])=>{const m=META&&META.figs[id];
    const lo=Math.min(f.loose||0,f.qty||0),ins=(f.qty||0)-lo,note=inSetNote(f);
    return {type:'Minifig',num:id,name:f.name||id,theme:f.theme||'Other',year:null,parts:null,qty:f.qty,parent:(f.from||[]).find(k=>owned&&owned[k])||null,
      note:note?(lo?`${lo} loose · ${ins} ${note}`:note):'',
      val:m&&m.vq?{v:m.v/m.vq,cur:META.cur||'USD',src:'your file'}:null};}));
  if(!rows.length){el.innerHTML='';return;}
  const has=META&&META.has||{},themes=[...new Set(rows.map(r=>r.theme))].sort();
  const q=cxSearch.trim().toLowerCase(),f=rows.filter(r=>(cxTheme==='all'||r.theme===cxTheme)&&(!q||(r.num+' '+r.name).toLowerCase().includes(q)))
    .sort((a,b)=>{const x=sortKey(a),y=sortKey(b);for(let i=0;i<x.length;i++){const c=typeof x[i]==='number'?x[i]-y[i]:String(x[i]).localeCompare(String(y[i]),undefined,{numeric:true});if(c)return c;}return 0;});
  // sets by theme, year, number; each set's minifigs right under it; loose minifigs at the end of their theme
  function sortKey(r){if(r.type==='Set')return [r.theme,0,r.year||0,r.num,0,''];
    const p=r.parent&&SETS[r.parent];if(p)return [rootTheme(p[2]),0,p[1],r.parent,1,r.num];
    return [r.theme,1,0,'',1,r.num];}
  const LIM=50,shown=cxShowAll?f:f.slice(0,LIM),anyVal=rows.some(r=>r.val);
  const cols=['#','Name','Theme','Year','Pieces','Qty'].concat(has.cond?['Condition']:[],has.loc?['Location']:[],has.date?['Acquired']:[],has.cost?['Paid']:[],anyVal?['Est. value']:[]);
  const right=cols.map(c=>['Year','Pieces','Qty','Paid','Est. value'].includes(c));
  const tr=r=>`<tr ${r.type==='Set'?`class="click" data-open="${E(r.num)}"`:''}><td>${E(sn(r.num))}</td><td>${E(r.name)}${r.type==='Minifig'?` <span class="muted small">minifig${r.note?' · '+E(r.note):''}</span>`:''}</td><td>${E(r.theme)}</td><td class="r">${r.year||'—'}</td><td class="r">${r.parts!=null?r.parts.toLocaleString():'—'}</td><td class="r">${r.qty}</td>`+
    (has.cond?`<td>${E(r.cond||'—')}</td>`:'')+(has.loc?`<td>${E(r.loc||'—')}</td>`:'')+(has.date?`<td>${r.date?fmtD(r.date):'—'}</td>`:'')+(has.cost?`<td class="r">${r.cost?money(r.cost,cur):'—'}</td>`:'')+(anyVal?`<td class="r">${r.val?money(r.val.v,r.val.cur):'—'}</td>`:'')+'</tr>';
  el.innerHTML=`<h2 id="cx-all">All my stuff</h2><p class="cx-cap">Every set and minifig in your upload, including the minifigs that come in your sets.${anyVal?' Values are estimates; tap a set for its source and date.':''}</p>
<div class="cx-ctl"><input type="search" id="cx-q" placeholder="Set number or name" value="${E(cxSearch)}"><select id="cx-thf"><option value="all">All themes</option>${themes.map(t=>`<option ${t===cxTheme?'selected':''}>${E(t)}</option>`).join('')}</select><span class="muted small">${f.length} of ${rows.length}</span></div>
${cols.length>6?'<p class="muted small show-sm">Swipe the table sideways for more columns.</p>':''}${table(cols,shown.map(tr),right)}${f.length>LIM?`<button id="cx-more">${cxShowAll?'Show fewer':'Show all '+f.length}</button>`:''}`;
  const qi=document.getElementById('cx-q');qi.oninput=()=>{cxSearch=qi.value;const pos=qi.selectionStart;renderAll();const n=document.getElementById('cx-q');n.focus();n.setSelectionRange(pos,pos);};
  document.getElementById('cx-thf').onchange=e=>{cxTheme=e.target.value;renderAll();};
  const m=document.getElementById('cx-more');if(m)m.onclick=()=>{cxShowAll=!cxShowAll;renderAll();};
  el.querySelectorAll('[data-open]').forEach(x=>x.onclick=()=>openSet(x.dataset.open));
}
function bulkHTML(){
  const ex=(typeof extras!=='undefined'&&extras)||{};const loose=ex.looseParts||0,fp=ex.figParts||0;if(!loose&&!fp)return '';
  const rows=[['Loose parts',loose.toLocaleString()],['Minifig parts',fp.toLocaleString()],['All parts',(loose+fp).toLocaleString()]];
  if(META&&META.has.partValue)rows.push(['Parts with a price in your file',`${META.parts.q.toLocaleString()} parts, ${money(META.parts.v,META.cur||'USD')} est.`]);
  return `<h2 id="cx-bulk">Bulk and loose parts</h2><p class="cx-cap">Parts from your upload that aren't part of a set. They count toward Bulk milestones, not your score.</p><dl class="cx-props">${rows.map(r=>`<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('')}</dl>`;
}
function sourcesHTML(list){
  const T=totals(list,LAST.cur);const li=[`Set facts (names, years, piece counts, themes): <a href="https://rebrickable.com/downloads/" target="_blank" rel="noopener">Rebrickable</a> database export.`];
  if(META)li.push(`Your collection: ${E(META.fmt)} upload, read ${fmtD(META.loaded)}. It stays on this device.`);
  if(T.n)li.push(`Values: ${E(srcText(T.srcs))}. Values are estimates, not offers. Sealed sets use the new value and opened sets the used value when both are available.`);
  else li.push('Values: none yet. A price feed is coming; until then, values come from your own file or entries.');
  if(PRICES){const u=/^https?:\/\//.test(String(PRICES.source_url||''))?PRICES.source_url:null,nm=E(PRICES.source||'Price feed');
    li.push(`Prices: ${u?`<a href="${E(u)}" target="_blank" rel="noopener">${nm}</a>`:nm}${PRICES.updated?', updated '+fmtD(PRICES.updated):''}, in ${E(PRICES.currency||'USD')}${PRICES.example?' (EXAMPLE DATA, not real prices)':''}.`);}
  if(PH)li.push(`Value history: monthly ${E(PH.basis)} values from ${E(PH.source)}. Months with no price hold the last value; nothing is filled in between.`);
  li.push('Checkpoints and your own value entries are saved in this browser only. <button id="cx-reset" style="font-size:12px;padding:4px 8px">Clear saved values</button>');
  return `<h2 id="cx-sources">Sources and caveats</h2><ul class="cx-note">${li.map(x=>`<li>${x}</li>`).join('')}</ul>`;
}

// ---------- hooks into app.js (no app.js changes needed) ----------
const _render=render;render=function(o){_render(o);try{cxRender(o);}catch(e){console.error('collection.js',e);}};
const _load=loadCollection;loadCollection=function(text){DEMO=false;sv('studDemo',false);try{const C=parseCollection(text);META=buildMeta(text,C.format);sv(LS.meta,META);}catch(e){META=null;}return _load(text);};
// capture phase: runs before app.js's demo onclick (which renders), so the demo never picks up your values or saves a checkpoint
document.getElementById('demo').addEventListener('click',()=>{META=null;DEMO=true;sv('studDemo',true);try{localStorage.removeItem(LS.meta);}catch(e){}},true);
document.addEventListener('click',e=>{if(e.target&&e.target.id==='cx-reset'){if(confirm('Clear saved value checkpoints and your own value entries on this device?')){try{localStorage.removeItem(LS.snaps);localStorage.removeItem(LS.user);}catch(x){}USERV={};render(owned);}}});
const _open=openSet;openSet=function(num){_open(num);try{
  const body=document.querySelector('#setmodal .mbody');if(!body)return;const h4=[...body.querySelectorAll('h4')].find(x=>x.textContent==='Value');const p=h4&&h4.nextElementSibling;if(!p)return;
  const v=valueOf(num),e=META&&META.sets[num],mine=typeof owned!=='undefined'&&owned[num];
  let h='';if(v)h+=`<p><b>${money(v.v,v.cur)}</b> estimate${v.basis?` (${E(v.basis)})`:''} · ${E(v.src)}${v.date?' · '+fmtD(v.date):''}${v.example?' · <b>EXAMPLE DATA</b>':''}</p>`;
  else h+='<p class="muted">No value yet. Price feed coming soon.</p>';
  const facts=[];if(e){const c=topKey(e.cond);if(c)facts.push('Condition: '+E(c));if(Object.keys(e.loc).length)facts.push('Location: '+E(Object.keys(e.loc).join(', ')));if(e.d)facts.push('Acquired: '+fmtD(e.d));if(e.cq)facts.push('Paid: '+money(e.c/e.cq,META.cur||'USD'));}
  if(facts.length)h+=`<p class="muted small">${facts.join(' · ')}</p>`;
  if(mine&&!DEMO)h+=`<div class="cx-mval"><label class="muted small">Your own estimate (${mainCur()}) <input type="number" min="0" step="0.01" inputmode="decimal" id="cx-uv" value="${USERV[num]?USERV[num].v:''}"></label> <button id="cx-uvs">Save</button>${USERV[num]?' <button id="cx-uvc" style="background:#6B5A5A;color:#F2F3F2">Clear</button>':''}</div>`;
  const d=document.createElement('div');d.innerHTML=h;p.replaceWith(d);
  const s=document.getElementById('cx-uvs');if(s)s.onclick=()=>{const n=parseNum(document.getElementById('cx-uv').value);if(n){USERV[num]={v:n,cur:mainCur(),d:today()};}else delete USERV[num];sv(LS.user,USERV);closeSet();render(owned);};
  const c=document.getElementById('cx-uvc');if(c)c.onclick=()=>{delete USERV[num];sv(LS.user,USERV);closeSet();render(owned);};
}catch(err){console.error(err);}};
let rz;window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(drawChart,150);});
// price feed hooks
const useP=j=>{if(j&&typeof j==='object'&&j.sets&&typeof j.sets==='object'){PRICES=j;return true;}return false;};
if(window.STUD_PRICES)useP(window.STUD_PRICES);
else if(/^https?:$/.test(location.protocol))fetch('prices.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(j=>{if(useP(j)&&Object.keys(owned||{}).length)render(owned);}).catch(()=>{});
})();
