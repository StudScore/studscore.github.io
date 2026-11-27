// ---- Phone tile grid + Figs sort: a Sort by menu on Figs that matches Sets,
// a 1 / 2 / 3 layout switch on both tabs, and a multi-column phone grid.
// 1-across is the original one-per-row phone layout; 2-across is the default.
// The choice is saved in localStorage ('studTileCols') and shared by both tabs.
// It only changes screens under 600px; the switch is hidden on desktop.
// Must load after app.js and BEFORE collection.js, so collection.js can wrap
// renderFigs and bind fig-tile clicks (openFig lives inside collection.js's IIFE).
// Does not edit collection.js or lore.js. Does not change popups, link chips, or value boxes.
(function(){
const LS='studTileCols';
const COLS_DEFAULT=2;
const STYLE=`
:root{--ss-tile-cols:${COLS_DEFAULT}}
.ss-cols{display:none}
@media (max-width:600px){
  .ss-cols{display:inline-flex;align-items:stretch;flex:0 0 auto;margin:0 0 0 auto;padding:0;border:1px solid #6C6E68;border-radius:6px;overflow:hidden;background:#3A3D40;vertical-align:middle}
  .ss-cols button{margin:0;border:0;border-radius:0;background:#6B5A5A;color:#F2F3F2;font-weight:800;font-size:13px;padding:6px 11px;min-width:36px;min-height:32px;line-height:1;box-shadow:none}
  .ss-cols button+button{border-left:1px solid #6C6E68}
  .ss-cols button[aria-checked="true"]{background:#A5CA18;color:#05131D}
  .ss-cols button:focus-visible{outline:2px solid #F2CD37;outline-offset:-2px;z-index:1}
  #mysets .sets,#myfigs .sets{grid-template-columns:repeat(var(--ss-tile-cols,2),minmax(0,1fr));gap:8px}
  html[data-ss-cols="1"] #mysets .sets,html[data-ss-cols="1"] #myfigs .sets{gap:10px}
  html:not([data-ss-cols="1"]) #mysets .setcard,html:not([data-ss-cols="1"]) #myfigs .setcard{display:flex;flex-direction:column;min-width:0;height:100%;overflow:hidden}
  html:not([data-ss-cols="1"]) #mysets .imgtile,html:not([data-ss-cols="1"]) #myfigs .imgtile{margin:4px 4px 0;border-radius:6px;flex:0 0 auto}
  html:not([data-ss-cols="1"]) #mysets .setinfo,html:not([data-ss-cols="1"]) #myfigs .setinfo{padding:6px;font-size:11px;min-width:0;min-height:0;flex:1;overflow:hidden}
  html:not([data-ss-cols="1"]) #mysets .setinfo b,html:not([data-ss-cols="1"]) #myfigs .setinfo b{font-size:12px;line-height:1.2;margin-bottom:2px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden;overflow-wrap:anywhere;word-break:break-word}
  html:not([data-ss-cols="1"]) #mysets .setinfo .muted,html:not([data-ss-cols="1"]) #myfigs .setinfo .muted{font-size:10px;line-height:1.25;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden;overflow-wrap:anywhere}
  html:not([data-ss-cols="1"]) #myfigs .setinfo .setsub,html:not([data-ss-cols="1"]) #myfigs .setinfo .figmeta{font-size:10px;line-height:1.25;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;line-clamp:1;overflow:hidden;overflow-wrap:anywhere}
  html:not([data-ss-cols="1"]) #myfigs .setinfo .figids{display:none}
  html:not([data-ss-cols="1"]) #mysets .setinfo.tbanner{min-height:0;padding:6px}
  html:not([data-ss-cols="1"]) #mysets .tbanner::before{font-size:20px;bottom:-4px;right:-2px}
  html:not([data-ss-cols="1"]) #mysets .setgroup,html:not([data-ss-cols="1"]) #myfigs .setgroup{margin-top:2px;font-size:13px}
}
`;
const st=document.createElement('style');st.setAttribute('data-ss','grid');st.textContent=STYLE;document.head.appendChild(st);

function loadCols(){
  try{
    const raw=localStorage.getItem(LS);
    if(raw==null||raw==='')return COLS_DEFAULT;
    let v;try{v=JSON.parse(raw);}catch(e){v=raw;}
    const n=+v;if(n===1||n===2||n===3)return n;
  }catch(e){}
  return COLS_DEFAULT;
}
function saveCols(n){try{localStorage.setItem(LS,String(n));}catch(e){}}
function normCols(n){n=+n;return (n===1||n===3)?n:COLS_DEFAULT;}

function syncSwitches(c){
  document.querySelectorAll('.ss-cols').forEach(box=>{
    box.querySelectorAll('button[data-cols]').forEach(b=>{
      const on=b.getAttribute('data-cols')===String(c);
      b.setAttribute('aria-checked',on?'true':'false');
      if(on)b.setAttribute('tabindex','0');else b.setAttribute('tabindex','-1');
    });
  });
}
function applyCols(n,persist){
  const c=normCols(n);
  document.documentElement.style.setProperty('--ss-tile-cols',String(c));
  document.documentElement.setAttribute('data-ss-cols',String(c));
  if(persist!==false)saveCols(c);
  syncSwitches(c);
  return c;
}
function currentCols(){
  const n=+document.documentElement.getAttribute('data-ss-cols');
  return (n===1||n===2||n===3)?n:loadCols();
}
function switchHTML(){
  const c=currentCols();
  return `<div class="ss-cols" role="radiogroup" aria-label="Layout">${[1,2,3].map(n=>`<button type="button" role="radio" data-cols="${n}" aria-checked="${n===c?'true':'false'}" aria-label="${n} across" tabindex="${n===c?'0':'-1'}">${n}</button>`).join('')}</div>`;
}
function mountSwitch(root){
  if(!root)return;
  const ctl=root.querySelector('.setctl');if(!ctl)return;
  let box=ctl.querySelector('.ss-cols');
  if(!box){ctl.insertAdjacentHTML('beforeend',switchHTML());box=ctl.querySelector('.ss-cols');}
  else syncSwitches(currentCols());
}

document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('.ss-cols button[data-cols]');
  if(!b)return;
  e.preventDefault();
  applyCols(b.getAttribute('data-cols'),true);
});
document.addEventListener('keydown',e=>{
  const b=e.target.closest&&e.target.closest('.ss-cols button[data-cols]');
  if(!b)return;
  if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight'&&e.key!=='ArrowUp'&&e.key!=='ArrowDown'&&e.key!=='Home'&&e.key!=='End')return;
  e.preventDefault();
  const cur=currentCols();
  const next=e.key==='Home'?1:e.key==='End'?3:(e.key==='ArrowLeft'||e.key==='ArrowUp')?(cur===1?3:cur-1):(cur===3?1:cur+1);
  applyCols(next,true);
  const n=b.parentNode&&b.parentNode.querySelector('button[data-cols="'+next+'"]');
  if(n)n.focus();
});

let figSort='theme',figShow='all'; // figShow: all | loose | sets (Figs tab filter)

function figYearParts(id){
  // a card kept under a BrickLink number (loose copy merged with set copies) still gets its Rebrickable facts
  let m=(typeof FIGMETA!=='undefined'&&FIGMETA[id])||null;
  if(!m&&typeof FIGMETA!=='undefined'&&!/^fig-/i.test(id)&&typeof figIds==='function'){try{const f=figIds(id).fig;if(f)m=FIGMETA[f]||null;}catch(e){}}
  return {parts:(m&&m[0])||0,year:(m&&m[1])||0};
}
function bindFigCards(root){
  (root||document).querySelectorAll('#myfigs .figcard').forEach(c=>{
    const id=c.getAttribute('data-id')||((c.querySelector('img.setimg')||{}).alt)||null;
    if(!id||typeof openFig!=='function')return;
    c.style.cursor='pointer';c.setAttribute('role','button');c.tabIndex=0;
    c.onclick=()=>openFig(id);
    c.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openFig(id);}};
  });
}

function renderFigsSorted(){
  const el=document.getElementById('myfigs');if(!el)return;
  const figs=typeof allFigs==='function'?allFigs(owned,typeof extras!=='undefined'?extras:null):{};
  const E=typeof esc==='function'?esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rows=Object.entries(figs).map(([id,f])=>{const m=figYearParts(id);return {id,...f,parts:m.parts,year:m.year};});
  const byTheme=(a,b)=>String(a.theme||'').localeCompare(String(b.theme||''))||a.id.localeCompare(b.id,undefined,{numeric:true});
  const cmp={
    theme:byTheme,
    // Missing year/parts go last, so unknown figs don't jump to the top.
    year_old:(a,b)=>(a.year||99999)-(b.year||99999)||byTheme(a,b),
    year_new:(a,b)=>(b.year||0)-(a.year||0)||byTheme(a,b),
    pieces:(a,b)=>b.parts-a.parts||byTheme(a,b)
  };
  const sort=cmp[figSort]?figSort:'theme';
  rows.sort(cmp[sort]);
  if(!rows.length){const hasSets=typeof owned!=='undefined'&&owned&&Object.keys(owned).length>0&&!(typeof localStorage!=='undefined'&&localStorage.getItem('studDemo')==='true');
    el.innerHTML=hasSets?`<h3>My Minifigs (0)</h3><p class="muted">Minifigs from your sets show here once you tick them as owned in that set's Parts checklist (open a set, then Parts and missing pieces). Loose minifigs from your files, or added with Add a minifig, show here too.</p>`:'';return;}
  const nLoose=rows.filter(f=>(f.loose||0)>0).length,nSets=rows.filter(f=>(f.qty||0)>(f.loose||0)).length;
  const allRows=rows.length,show=figShow==='loose'?'loose':figShow==='sets'?'sets':'all';
  if(show==='loose')rows.splice(0,rows.length,...rows.filter(f=>(f.loose||0)>0));
  else if(show==='sets')rows.splice(0,rows.length,...rows.filter(f=>(f.qty||0)>(f.loose||0)));
  const LIMIT=30,shown=figShowAll?rows:rows.slice(0,LIMIT);
  let html='',last=null;
  for(const f of shown){
    if(sort==='theme'&&f.theme!==last){html+=`<div class="setgroup">${E(f.theme)}</div>`;last=f.theme;}
    const from=typeof figFromTxt==='function'?figFromTxt(f):'';
    let mid=f.id;if(typeof FIGMETA!=='undefined'&&!FIGMETA[mid]&&typeof figIds==='function'){try{mid=figIds(mid).fig||mid;}catch(e){}}const meta=typeof figMetaTxt==='function'?figMetaTxt(mid):'';
    const img=typeof figImg==='function'?figImg(f.id):'';
    html+=`<div class="setcard figcard" role="button" tabindex="0" data-id="${E(f.id)}"><div class="imgtile"><img class="setimg" loading="lazy" alt="${E(f.id)}" src="${img}" onerror="this.outerHTML='<div class=&quot;setph&quot;>🙂</div>'"></div><div class="setinfo"><b>${E(f.name||f.id)}</b><span class="setsub">${E(f.id)}${f.qty>1?' · ×'+f.qty:''}${E(from)}${(f.loose||0)>0&&!(f.from&&f.from.length)?' · loose':''}</span>${meta}</div></div>`;
  }
  el.innerHTML=`<h3>My Minifigs (${allRows})</h3><div class="setctl"><label class="muted small">Sort by</label><select id="figsort">
<option value="theme">Theme</option><option value="year_old">Year (oldest first)</option><option value="year_new">Year (newest first)</option><option value="pieces">Piece count</option></select>
<span style="display:inline-flex;gap:8px;align-items:center;white-space:nowrap"><label class="muted small" for="figshow">Show</label><select id="figshow"><option value="all">All (${allRows})</option><option value="loose">Loose (${nLoose})</option><option value="sets">From sets (${nSets})</option></select></span></div>
${!rows.length?`<p class="muted">${show==='loose'?'No loose minifigs yet. Upload a BrickLink file with minifig rows, or tap Add a minifig.':'No minifigs from sets yet. Open a set and tick the minifigs you have in its Parts checklist.'}</p>`:''}
<div class="sets">${html}</div>${rows.length>LIMIT?`<button id="figmore">${figShowAll?'Show fewer':'Show all '+rows.length+' minifigs'}</button>`:''}`;
  const sel=document.getElementById('figsort');if(sel){sel.value=sort;sel.onchange=()=>{figSort=sel.value;renderFigs();};}
  const shw=document.getElementById('figshow');if(shw){shw.value=show;shw.onchange=()=>{figShow=shw.value;figShowAll=false;renderFigs();};}
  const m=document.getElementById('figmore');if(m)m.onclick=()=>{figShowAll=!figShowAll;renderFigs();};
  mountSwitch(el);
  bindFigCards(el);
}

if(typeof renderFigs==='function'){
  renderFigs=function(){renderFigsSorted();};
}
if(typeof renderSets==='function'){
  const _rs=renderSets;
  renderSets=function(){
    const r=_rs.apply(this,arguments);
    mountSwitch(document.getElementById('mysets'));
    return r;
  };
}

applyCols(loadCols(),false);

window.StudGrid={
  cols(n){return applyCols(n,true);},
  figShow(v){if(v==null)return figShow;figShow=(v==='loose'||v==='sets')?v:'all';return figShow;},
  current:currentCols
};
})();
