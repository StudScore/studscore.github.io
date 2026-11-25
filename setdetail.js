// ---- Set / fig detail (added by Money): BrickLink + Brick Owl numbers on each minifig,
// and a value-over-time chart on each set and fig popup.
// Hooks the same way community.js does: wraps figMetaTxt, render, and watches the popup.
// Does not edit collection.js or lore.js. Does not change community prices.
// Fig numbers come from figids.js (Rebrickable set_mappings.csv). Missing IDs are omitted, never invented.
// Chart sources, first one with two or more points wins: checkpoints saved on this device
// (studSnapshots, skipped in the demo), then BrickLink prices saved by blsync.js, then ./prices.json history, then community.json.
(function(){
const E=s=>(typeof esc==='function'?esc:function(x){return String(x).replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));})(s==null?'':s);
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtD=s=>{if(!s)return '';const p=String(s).split('-');return p[2]?`${MON[p[1]-1]} ${+p[2]}, ${p[0]}`:p[1]?`${MON[p[1]-1]} ${p[0]}`:p[0];};
const tOf=s=>{const p=String(s).split('-').map(Number);return Date.UTC(p[0],(p[1]||1)-1,p[2]||1);};
const money=(v,cur,whole)=>{try{return new Intl.NumberFormat('en-US',{style:'currency',currency:cur||'USD',maximumFractionDigits:whole?0:2,minimumFractionDigits:whole?0:2}).format(v);}catch(e){return (whole?Math.round(v):(+v).toFixed(2))+' '+(cur||'');}};
const isDemo=()=>{try{return !!JSON.parse(localStorage.getItem('studDemo')||'false');}catch(e){return false;}};
const ld=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v;}catch(e){return d;}};

let PRICES=null,COMM=null;

function idsOf(id){
  if(typeof figIds!=='function'||!id)return {fig:null,bl:null,bo:null};
  try{return figIds(id)||{fig:null,bl:null,bo:null};}catch(e){return {fig:null,bl:null,bo:null};}
}
// One labeled line. Only numbers we actually have.
function figIdsHTML(id){
  const rec=idsOf(id);const bits=[];
  if(rec.bl)bits.push('BrickLink '+E(rec.bl));
  if(rec.bo)bits.push('Brick Owl '+E(rec.bo));
  return bits.length?`<div class="muted figids">${bits.join(' · ')}</div>`:'';
}

// ---------- wrap figMetaTxt so cards, All my stuff, and the fig popup all show the numbers ----------
if(typeof figMetaTxt==='function'){
  const _fm=figMetaTxt;
  figMetaTxt=function(id){
    const ids=figIdsHTML(id);
    let base='';try{base=_fm.apply(this,arguments)||'';}catch(e){}
    return ids+base;
  };
}

// ---------- value history for one set or fig ----------
function itemPoints(id){
  if(!id)return {pts:[],src:'',cur:'USD',label:''};
  // 1. on-device checkpoints (sets only today; collection.js does not snapshot figs)
  if(!isDemo()){
    const snaps=ld('studSnapshots',[]).filter(x=>x&&x.s&&x.d&&x.s[id]!=null&&isFinite(+x.s[id]));
    const cur=(snaps[0]&&snaps[0].cur)||'USD';
    const same=snaps.filter(x=>(x.cur||'USD')===cur);
    const pts=same.map(x=>({t:tOf(x.d),d:x.d,v:+x.s[id]})).filter(p=>p.v>0).sort((a,b)=>a.t-b.t);
    // de-dupe same day (keep last)
    const seen={};const uniq=[];pts.forEach(p=>{if(seen[p.d]!=null)uniq[seen[p.d]]=p;else{seen[p.d]=uniq.length;uniq.push(p);}});
    if(uniq.length>=2)return {pts:uniq,src:'checkpoints',cur,label:'Checkpoints saved on this device, '+fmtD(uniq[0].d)+' to '+fmtD(uniq[uniq.length-1].d)+'.'};
  }
  // 1b. BrickLink sold averages saved on this device by blsync.js (one per day it refreshed), unit price
  if(!isDemo()&&window.StudBL&&typeof StudBL.history==='function'){
    const key=/-\d+$/.test(id)?id:'fig:'+id;let bh=[];try{bh=StudBL.history(key)||[];}catch(e){}
    const st=StudBL._state&&StudBL._state().P,o=st&&st[key],cur=(o&&((o.N&&o.N.cur)||(o.U&&o.U.cur)))||'USD';
    const pts=bh.map(p=>({t:tOf(p.d),d:p.d,v:p.v}));
    if(pts.length>=2)return {pts,src:'bricklink',cur,label:'BrickLink sold averages saved on this device, '+fmtD(pts[0].d)+' to '+fmtD(pts[pts.length-1].d)+'.'};
  }
  // 2. prices.json monthly history
  const rec=priceRec(id);
  if(rec&&Array.isArray(rec.history)&&rec.history.length){
    const cur=(PRICES&&PRICES.currency)||'USD';
    const pts=[];
    rec.history.forEach(row=>{
      if(!Array.isArray(row)||!row[0])return;
      const nv=num(row[1]),uv=num(row[2]);
      const v=nv||uv; // default sealed/new, else used — same fallback as the rest of the app
      if(v)pts.push({t:tOf(String(row[0])),d:String(row[0]),v});
    });
    if(pts.length>=2){
      const src=PRICES&&PRICES.source?PRICES.source:'price feed';
      return {pts,src:'prices',cur,label:'Monthly estimates from '+src+', '+fmtD(pts[0].d)+' to '+fmtD(pts[pts.length-1].d)+'.'};
    }
  }
  // 3. community prices
  const ci=commItem(id);
  if(ci){
    const cur=(COMM&&COMM.currency)||'USD';
    const pick=ci.new&&Array.isArray(ci.new.history)&&ci.new.history.length>=2?ci.new:ci.used;
    const hist=(pick&&pick.history||[]).filter(h=>Array.isArray(h)&&h[1]>0&&(h[2]==null||h[2]>=3));
    const pts=hist.map(h=>({t:tOf(String(h[0])),d:String(h[0]),v:+h[1]})).sort((a,b)=>a.t-b.t);
    if(pts.length>=2){
      const src=COMM&&COMM.source?COMM.source:'StudScore community';
      return {pts,src:'community',cur,label:'Community prices from '+src+', '+fmtD(pts[0].d)+' to '+fmtD(pts[pts.length-1].d)+'.'};
    }
  }
  return {pts:[],src:'',cur:'USD',label:''};
}
function num(v){v=parseFloat(v);return isFinite(v)&&v>0?v:0;}
function priceRec(id){
  if(!PRICES||!id)return null;
  const s=PRICES.sets&&(PRICES.sets[id]||PRICES.sets[id.toLowerCase()]);
  if(s)return s;
  const F=PRICES.figs;
  if(F)return F[id]||F[id.toLowerCase()]||null;
  return null;
}
function commItem(id){
  if(!COMM||!COMM.items||!id)return null;
  const it=COMM.items;
  return it[id]||it[id.toLowerCase()]||it[String(id).replace(/-1$/,'')]||null;
}

function chartSVG(W,pts,cur){
  const H=W<400?160:190,pl=8,pr=W<400?48:58,pt=12,pb=22;
  if(!pts||pts.length<2)return '';
  const vals=pts.map(p=>p.v),ts=pts.map(p=>p.t);
  let t0=Math.min(...ts),t1=Math.max(...ts);if(t1===t0){t0-=15*864e5;t1+=15*864e5;}
  let y0=Math.min(...vals),y1=Math.max(...vals);const py=(y1-y0)*.12||y1*.1||1;y0=Math.max(0,y0-py);y1+=py;
  const X=t=>pl+(t-t0)/(t1-t0)*(W-pl-pr),Y=v=>pt+(1-(v-y0)/(y1-y0))*(H-pt-pb);
  let g='';
  for(let i=0;i<=3;i++){const v=y0+(y1-y0)*i/3,y=Y(v);g+=`<line x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}" stroke="#2B3D4A"/><text x="${W-pr+4}" y="${y+4}" fill="#D5D7D3" font-size="11">${E(money(v,cur,1))}</text>`;}
  const lab=d=>MON[d.getUTCMonth()]+' '+d.getUTCFullYear();
  g+=`<text x="${pl}" y="${H-6}" fill="#D5D7D3" font-size="11">${lab(new Date(t0))}</text><text x="${W-pr}" y="${H-6}" fill="#D5D7D3" font-size="11" text-anchor="end">${lab(new Date(t1))}</text>`;
  const d=pts.map((p,i)=>(i?'L':'M')+X(p.t).toFixed(1)+' '+Y(p.v).toFixed(1)).join(' ');
  g+=`<path d="${d} L${X(pts[pts.length-1].t).toFixed(1)} ${H-pb} L${X(pts[0].t).toFixed(1)} ${H-pb} Z" fill="#A5CA18" opacity=".16"/>`;
  g+=`<path d="${d}" fill="none" stroke="#A5CA18" stroke-width="2.5" stroke-linejoin="round"/>`;
  pts.forEach(p=>{g+=`<rect x="${(X(p.t)-3).toFixed(1)}" y="${(Y(p.v)-3).toFixed(1)}" width="6" height="6" rx="1" fill="#F2CD37" stroke="#05131D" stroke-width="1"/>`;});
  return `<svg class="cx-svg sd-svg no-swipe" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Value history">${g}</svg>`;
}

const EMPTY='Value history builds up as you visit. Each visit with a value for this item saves a dated checkpoint on this device.';

function historyHTML(id,kind,width){
  const M=itemPoints(id);
  let h=`<h4>Value history</h4>`;
  if(M.pts.length>=2){
    h+=`<div class="sd-chart no-swipe" data-id="${E(id)}">${chartSVG(width||320,M.pts,M.cur)}</div>`;
    h+=`<p class="muted small">${E(M.label)} Values are estimates, not offers.</p>`;
  }else{
    h+=`<div class="sd-empty">${EMPTY}</div>`;
  }
  return h;
}

function catalogLinks(id,kind){
  const rec=idsOf(id);const out=[];
  if(kind==='fig'&&rec.bl)out.push(`<a class="btn sd-link" href="https://www.bricklink.com/v2/catalog/catalogitem.page?M=${encodeURIComponent(rec.bl)}" target="_blank" rel="noopener">View on BrickLink</a>`);
  if(rec.bo)out.push(`<a class="btn sd-link" href="https://www.brickowl.com/boid/${encodeURIComponent(rec.bo)}" target="_blank" rel="noopener">View on Brick Owl</a>`);
  return out.join(' ');
}

function modalInfo(modal){
  if(!modal)return null;
  // Set popups have the theme banner; fig popups do not.
  if(modal.querySelector('.tbanner.mban')){
    const img=modal.querySelector('img.mimg');
    const m=img&&/\/sets\/([^/?#]+)\.jpg/i.exec(img.src);
    let id=m?decodeURIComponent(m[1]):null;
    if(!id){const sp=modal.querySelector('.meta span');if(sp){const n=sp.textContent.replace(/^#/,'').trim();id=/\-\d+$/.test(n)?n:n+'-1';}}
    return id?{kind:'set',id}:null;
  }
  const sp=modal.querySelector('.mbody .meta span');
  const img=modal.querySelector('img.mimg');
  const id=(sp&&sp.textContent.trim())||(img&&img.getAttribute('alt'))||'';
  return id?{kind:'fig',id}:null;
}

function enhanceModal(modal){
  modal=modal||document.getElementById('setmodal');
  if(!modal||modal.dataset.sd==='1')return;
  const info=modalInfo(modal);if(!info)return;
  const body=modal.querySelector('.mbody');if(!body)return;
  modal.dataset.sd='1';
  // Fig numbers: figMetaTxt wrap already inserted .figids. If a popup was built
  // before that wrap (shouldn't happen), add them under .meta.
  if(info.kind==='fig'&&!body.querySelector('.figids')){
    const meta=body.querySelector('.meta');
    const html=figIdsHTML(info.id);
    if(html&&meta)meta.insertAdjacentHTML('afterend',html);
  }
  // Chart: after the Value block (h4 + following content), or at the end of the body.
  if(!body.querySelector('.sd-chart, .sd-empty')){
    const w=Math.max(260,(body.clientWidth||320)-8);
    const h4=[...body.querySelectorAll('h4')].find(x=>/^value$/i.test(x.textContent.trim()));
    const box=document.createElement('div');box.className='sd-hist';box.innerHTML=historyHTML(info.id,info.kind,w);
    if(h4){
      let n=h4.nextElementSibling,last=h4;
      while(n&&n.tagName!=='H4'&&!n.classList.contains('sd-hist')&&n.tagName!=='A'){last=n;n=n.nextElementSibling;}
      last.insertAdjacentElement('afterend',box);
    }else{
      const btn=body.querySelector('a.btn');
      if(btn)btn.insertAdjacentElement('beforebegin',box);else body.appendChild(box);
    }
  }
  // Extra catalog links, without duplicating the button that's already there.
  const links=catalogLinks(info.id,info.kind);
  if(links){
    const have=[...body.querySelectorAll('a.btn')].map(a=>(a.getAttribute('href')||'').toLowerCase());
    const wrap=document.createElement('div');wrap.className='sd-links';wrap.innerHTML=links;
    [...wrap.querySelectorAll('a')].forEach(a=>{
      const href=(a.getAttribute('href')||'').toLowerCase();
      if(have.some(h=>h&&href&&(h===href||h.includes(href.split('?')[0].split('/').pop()||'__'))))a.remove();
    });
    if(wrap.querySelector('a')){
      const last=body.querySelector('a.btn:last-of-type');
      if(last)last.insertAdjacentElement('afterend',wrap);else body.appendChild(wrap);
    }
  }
}

function paintChart(modal){
  const el=(modal||document).querySelector('.sd-chart');
  if(!el||!el.dataset.id)return;
  const M=itemPoints(el.dataset.id);if(M.pts.length<2)return;
  const w=Math.max(260,(el.clientWidth||el.parentElement&&el.parentElement.clientWidth||320)-4);
  el.innerHTML=chartSVG(w,M.pts,M.cur);
}

function enhanceSources(){
  const ul=document.querySelector('#cx-sources + ul, #cx-sources ul');
  if(!ul||ul.querySelector('.sd-src'))return;
  const li=document.createElement('li');li.className='sd-src';
  li.innerHTML='Minifig BrickLink and Brick Owl numbers: <a href="https://rebrickable.com/downloads/" target="_blank" rel="noopener">Rebrickable</a> set_mappings.csv. A number is shown only when Rebrickable lists it.';
  const facts=[...ul.children].find(x=>/set facts/i.test(x.textContent));
  if(facts)facts.insertAdjacentElement('afterend',li);else ul.appendChild(li);
}

// Watch for the set/fig popup. The observer is async, so collection.js has already
// filled in the Value block (and app.js has wrapped the photo) by the time we run.
try{
  new MutationObserver(ms=>{
    for(const m of ms)for(const n of m.addedNodes){
      if(n.nodeType!==1)continue;
      const modal=n.id==='setmodal'?n:n.querySelector&&n.querySelector('#setmodal');
      if(modal)requestAnimationFrame(()=>{enhanceModal(modal);requestAnimationFrame(()=>paintChart(modal));});
    }
  }).observe(document.body,{childList:true});
}catch(e){}

if(typeof openSet==='function'){
  const _open=openSet;
  openSet=function(num){
    const r=_open.apply(this,arguments);
    requestAnimationFrame(()=>{enhanceModal();requestAnimationFrame(()=>paintChart());});
    return r;
  };
}

function afterRender(){try{enhanceSources();}catch(e){}}
window.addEventListener('DOMContentLoaded',()=>{
  if(typeof render==='function'){const _r=render;render=function(){const r=_r.apply(this,arguments);afterRender();return r;};}
  afterRender();
});

// Load optional history feeds (404 is fine; tests may inject window.STUD_PRICES / STUD_COMMUNITY).
function useP(j){if(j&&typeof j==='object'&&j.sets&&typeof j.sets==='object'){PRICES=j;return true;}return false;}
function useC(j){if(j&&typeof j==='object'&&j.items&&typeof j.items==='object'){COMM=j;return true;}return false;}
if(window.STUD_PRICES)useP(window.STUD_PRICES);
else if(/^https?:$/.test(location.protocol))fetch('prices.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(useP).catch(()=>{});
if(window.STUD_COMMUNITY)useC(window.STUD_COMMUNITY);
else if(/^https?:$/.test(location.protocol))fetch('community.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(useC).catch(()=>{});

const css=document.createElement('style');css.textContent=`
.figids{margin-top:3px;line-height:1.35}
.setinfo .figids,.modal .figids{color:#EDEEEC}
.modal .figids{margin:2px 0 8px;font-size:14px}
.cx-fn .figids{display:inline;margin:0;font-size:inherit;color:inherit}
.sd-hist{margin:10px 0 4px}
.sd-chart{background:#05131D;border:2px solid #6C6E68;border-radius:8px;padding:6px;margin:6px 0;touch-action:pan-y}
.sd-svg{display:block;max-width:100%}
.sd-empty{background:#05131D;border:2px dashed #6C6E68;border-radius:8px;padding:12px;font-size:14px;line-height:1.45;margin:8px 0;color:#EDEEEC}
.sd-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.sd-links .btn,.btn.sd-link{margin-top:8px}
`;document.head.appendChild(css);

if(typeof window!=='undefined')window.StudDetail={figIds:idsOf,figIdsHTML,itemPoints,enhanceModal,historyHTML,modalInfo};
})();
