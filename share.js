// Share card + saved board (added by Money)
// Seeded brick-wall layout for the share card: same seams as before (seed 7262), plus ~10 studs placed at interior stud
// positions of bricks 4+ studs long, centred in their course, so no stud ever overlaps a seam.
function cardWall(W,top,bottom){
  let seed=7262;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
  const P=24,CH=48,courses=[];
  for(let cy=top;cy<bottom;cy+=CH){const h=Math.min(CH,bottom-cy),seams=[];let bx=P*(1+Math.floor(rnd()*5));
    while(bx<W){seams.push(bx);bx+=P*[2,4,4,6,8][Math.floor(rnd()*5)];}courses.push({y:cy,h,seams});}
  const cand=[];courses.forEach((c,i)=>{if(c.h<CH)return;for(let j=0;j+1<c.seams.length;j++){const a=c.seams[j],n=(c.seams[j+1]-a)/P;
    for(let k=1;k<n-1;k++)cand.push([a+P/2+P*k,c.y+CH/2,i]);}});
  let s2=6363;const r2=()=>(s2=(s2*1103515245+12345)%2147483648)/2147483648;
  for(let i=cand.length-1;i>0;i--){const j=Math.floor(r2()*(i+1));[cand[i],cand[j]]=[cand[j],cand[i]];}
  const studs=[];for(const c of cand){if(studs.length>=10)break;if(c[0]<40||c[0]>W-40)continue;if(studs.some(s=>Math.abs(s[0]-c[0])<150&&Math.abs(s[2]-c[2])<2))continue;studs.push(c);}
  return {courses,studs:studs.map(s=>[s[0],s[1]]),r:15,P,CH};
}
// ---- Card value data (read-only). collection.js keeps its state inside a closure, so this mirrors its value rules by
// re-reading the same sources: your own entries, value columns in your upload (studMeta), ./prices.json (or window.STUD_PRICES),
// and the dated checkpoints it saves on this device (studSnapshots). Nothing is written. If collection.js ever exposes
// window.StudValue.summary(), the card uses that instead.
let CARD_PRICES=window.STUD_PRICES||null;
const cardPricesReady=(window.STUD_PRICES||!/^https?:$/.test(location.protocol))?Promise.resolve(CARD_PRICES):
  fetch('prices.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(j=>{if(j&&typeof j==='object'&&j.sets&&typeof j.sets==='object')CARD_PRICES=j;return CARD_PRICES;}).catch(()=>null);
function cardValueData(owned){
  try{if(window.StudValue&&typeof window.StudValue.summary==='function'){const r=window.StudValue.summary(owned);if(r)return r;}}catch(e){}
  const ld=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v;}catch(e){return d;}};
  const DEMO=!!ld('studDemo',false),META=DEMO?null:ld('studMeta',null),USERV=DEMO?{}:ld('studUserValues',{}),PR=CARD_PRICES&&CARD_PRICES.sets?CARD_PRICES:null;
  const num=s=>{s=String(s==null?'':s).trim();if(!s)return null;s=s.replace(/[^\d.,-]/g,'');if(/^\d+,\d{1,2}$/.test(s))s=s.replace(',','.');else s=s.replace(/,/g,'');const n=parseFloat(s);return isFinite(n)&&n>0?n:null;};
  const sn=k=>String(k).replace(/-1$/,''),top=o=>{const e=Object.entries(o||{}).sort((a,b)=>b[1]-a[1])[0];return e?e[0]:null;};
  const basis=k=>{const e=META&&META.sets&&META.sets[k],c=e?top(e.cond):null;return !c||/sealed|new/i.test(c)?'new':'used';};
  const rec=k=>{if(!PR)return null;const p=PR.sets[k]||PR.sets[sn(k)];return p&&typeof p==='object'?p:null;};
  const hist=(k,b)=>{const p=rec(k);if(!p||!Array.isArray(p.history))return [];const i=b==='new'?1:2;
    return p.history.filter(r=>Array.isArray(r)&&/^\d{4}-\d{2}$/.test(String(r[0]))&&num(r[i])).map(r=>[String(r[0]),num(r[i])]);};
  const histFor=k=>{let b=basis(k),h=hist(k,b);if(!h.length){b=b==='new'?'used':'new';h=hist(k,b);}return h;};
  const cur=(META&&META.has&&META.has.value&&(META.cur||'USD'))||(PR&&PR.currency)||(META&&META.cur)||'USD';
  const pSrc=PR?(PR.source||'prices.json'):'';
  const valueOf=k=>{
    const u=USERV[k];if(u&&u.v)return {v:u.v,cur:u.cur||cur,src:'your entries'};
    const e=META&&META.sets&&META.sets[k];
    if(e&&e.vq)return {v:e.v/e.vq,cur:META.cur||'USD',src:'your file'};
    if(e&&(e.vn||e.vu)){const v=basis(k)==='new'?(e.vn||e.vu):(e.vu||e.vn);return {v,cur:META.cur||'USD',src:'your file'};}
    const p=rec(k);
    if(p){const nv=num(p.new),uv=num(p.used),v=basis(k)==='new'?(nv||uv):(uv||nv);if(v)return {v,cur:PR.currency||'USD',src:pSrc,example:!!PR.example};}
    const h=histFor(k);if(h.length)return {v:h[h.length-1][1],cur:PR.currency||'USD',src:pSrc,example:!!PR.example};
    return null;};
  const keys=Object.keys(owned||{}).filter(k=>typeof SETS!=='undefined'&&SETS[k]);
  let total=0,n=0;const srcs=new Set();let example=false;
  keys.forEach(k=>{const v=valueOf(k);if(!v||v.cur!==cur)return;total+=v.v*owned[k];n++;srcs.add(v.src);if(v.example)example=true;});
  // history: prices.json monthly histories for owned sets (last value held), else checkpoints saved on this device
  const tOf=s=>{const p=String(s).split('-').map(Number);return Date.UTC(p[0],(p[1]||1)-1,p[2]||1);};
  let P=[],hSrc='',unit='date';
  if(PR){const H={},rows={};keys.forEach(k=>{const h=histFor(k);if(h.length){H[k]=1;h.forEach(([m,v])=>{(rows[m]=rows[m]||{})[k]=v;});}});
    const months=Object.keys(rows).sort();
    if(months.length&&(PR.currency||'USD')===cur){const last={};unit='month';hSrc=pSrc;if(PR.example)example=true;
      months.forEach(m=>{const s={};for(const k in H){const v=rows[m][k];if(v)last[k]=v;if(last[k]!=null)s[k]=last[k]*owned[k];}P.push({t:tOf(m),key:m,s});});}}
  if(!P.length&&!DEMO){const own=new Set(keys);
    P=ld('studSnapshots',[]).filter(x=>x&&x.s&&x.d&&(x.cur||'USD')===cur).map(x=>{const s={};for(const k in x.s)if(own.has(k)&&isFinite(+x.s[k]))s[k]=+x.s[k];return {t:tOf(x.d),key:x.d,s};}).filter(p=>Object.keys(p.s).length).sort((a,b)=>a.t-b.t);
    if(P.length)hSrc='checkpoints on this device';}
  P.forEach(p=>p.total=Object.values(p.s).reduce((a,v)=>a+v,0));
  let change=null;
  if(P.length>=2){const L=P[P.length-1],tl=L.t-365*864e5+3*864e5;let b=0;for(let i=0;i<P.length-1;i++)if(P[i].t<=tl)b=i;
    // same sets at both ends, like the Value history tiles, so a set joining isn't counted as a price move
    let a=0,z=0;for(const k in P[b].s)if(k in L.s){a+=P[b].s[k];z+=L.s[k];}
    const days=Math.round((L.t-P[b].t)/864e5),per=days>=360?(days>=720?Math.round(days/365)+'y':'1y'):unit==='month'||days>=56?Math.max(1,Math.round(days/30.44))+'mo':days+'d';
    if(a>0&&days>0)change={pct:(z/a-1)*100,period:per,from:P[b].key};}
  const all=[...srcs].concat(hSrc&&P.length>=2?[hSrc]:[]);
  return {total:n?total:null,n,of:keys.length,cur,points:P.map(p=>[p.t,p.total]),change,example,
    brickOwl:all.some(s=>/brick\s*owl/i.test(s)),srcs:all};
}
// Badge art for the card: decode before drawing, emoji fallback on error or after ~2s
function cardImg(src){return new Promise(res=>{const im=new Image();let done=false;const fin=v=>{if(!done){done=true;res(v);}};
  setTimeout(()=>fin(null),2000);im.onerror=()=>fin(null);im.src=src;(im.decode?im.decode():new Promise((ok,no)=>{im.onload=ok;im.onerror=no;})).then(()=>fin(im),()=>fin(null));});}
async function cardBadgeArt(a){
  if(/^th\d+$/.test(a.id)){const slug=typeof themeIconSlug==='function'?themeIconSlug(a.id.slice(2)):'generic';
    const [f,i]=await Promise.all([cardImg('badges/theme_frame.webp'),cardImg('badges/themes/'+slug+'.webp').then(x=>x||cardImg('badges/themes/generic.webp'))]);
    return f?{frame:f,icon:i}:null;}
  const im=await cardImg('badges/'+a.id+'.webp');return im?{img:im}:null;
}
function cardMoney(v,cur){try{return new Intl.NumberFormat('en-US',{style:'currency',currency:cur||'USD',maximumFractionDigits:0}).format(v);}catch(e){return Math.round(v).toLocaleString()+' '+(cur||'');}}
async function drawShareCard(owned){
  const S=scores(owned,typeof extras!=='undefined'?extras:null);const {list}=S;
  if(!list.length&&!S.figTotal&&!S.partsOwned){alert('Load a collection first');return;}
  await Promise.race([cardPricesReady,new Promise(r=>setTimeout(r,1500))]);
  let V=null;try{V=cardValueData(owned);}catch(e){console.error('share card value',e);}
  const got=S.ach.concat(S.fach).filter(a=>a.unlocked);
  const top=got.slice().sort((a,b)=>b.g-a.g).slice(0,4);
  const art=location.protocol.startsWith('http')?await Promise.all(top.map(a=>cardBadgeArt(a).catch(()=>null))):top.map(()=>null);
  let c=renderShareCard(S,V,top,art),url;
  try{url=c.toDataURL('image/png');}catch(e){c=renderShareCard(S,V,top,top.map(()=>null));url=c.toDataURL('image/png');} // tainted canvas: redraw with emoji
  showShareCard(url);
}
function renderShareCard(S,V,top,art){
  const {list,pieces}=S;
  const L=LEGO,W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  x.fillStyle=L.black;x.fillRect(0,0,W,H);x.fillStyle=L.lime;x.fillRect(0,0,W,150);
  // Flat matte Dark Red (#720E0F) behind the score area with a sparse, fixed scattering of same-colour studs seen from above
  x.fillStyle='#720E0F';x.fillRect(0,150,W,410);
  // Brick wall (48px courses, staggered 2/4/6/8-stud bricks) with studs snapped inside bricks, never on a joint
  const wall=cardWall(W,150,560);
  for(const c of wall.courses){x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,c.y,W,2);x.fillStyle='#8A1A1B';x.fillRect(0,c.y+2,W,1);
    for(const bx of c.seams){x.fillStyle='rgba(0,0,0,.35)';x.fillRect(bx,c.y+2,2,c.h-2);x.fillStyle='#8A1A1B';x.fillRect(bx+2,c.y+3,1,c.h-3);}}
  for(const [sx,sy] of wall.studs){const r=wall.r;
    x.save();x.shadowColor='rgba(0,0,0,.35)';x.shadowBlur=5;x.shadowOffsetX=3;x.shadowOffsetY=3;x.fillStyle='#720E0F';x.beginPath();x.arc(sx,sy,r,0,7);x.fill();x.restore();
    x.fillStyle='#8A1A1B';x.beginPath();x.arc(sx-2,sy-2,r,0,7);x.fill();
    x.fillStyle='#720E0F';x.beginPath();x.arc(sx,sy,r,0,7);x.fill();}
  x.shadowColor='rgba(5,19,29,.85)';x.shadowBlur=8;x.fillStyle=L.lime;x.fillRect(0,556,W,6);
  x.fillStyle='#111';x.font='bold 56px system-ui,sans-serif';x.fillText('🏆 My StudScore',50,95);
  // Lead with whichever score is higher (big), the other sits beside it (small)
  const sys=S.lead,other=sys==='SS'?'FS':'SS',val=k=>k==='SS'?S.ss:S.fs,mx=k=>k==='SS'?S.ssMax:S.fsMax,col=k=>k==='SS'?L.lime:L.yellow,nm=k=>k==='SS'?'StudScore':'FigScore';
  x.fillStyle='#D5D7D3';x.font='bold 30px system-ui,sans-serif';x.fillText(nm(sys).toUpperCase(),55,215);
  x.fillStyle=col(sys);x.font='800 150px system-ui,sans-serif';const big=val(sys).toLocaleString()+' '+sys;x.fillText(big,50,350);const bw=x.measureText(big).width;
  x.fillStyle='#D5D7D3';x.font='bold 26px system-ui,sans-serif';const ox=Math.min(W-300,50+bw+50);x.fillText(nm(other).toUpperCase(),ox,265);
  x.fillStyle=col(other);x.font='800 64px system-ui,sans-serif';x.fillText(val(other).toLocaleString()+' '+other,ox,340);
  x.fillStyle='#D5D7D3';x.font='34px system-ui,sans-serif';x.fillText(`of ${mx(sys).toLocaleString()} ${sys}  ·  ${val(other).toLocaleString()} of ${mx(other).toLocaleString()} ${other}`,55,410);
  x.fillStyle=L.dkgray;x.fillRect(50,440,W-100,22);x.fillStyle=col(sys);x.fillRect(50,440,mx(sys)?(W-100)*val(sys)/mx(sys):0,22);
  x.fillStyle=L.light;x.font='bold 34px system-ui,sans-serif';
  x.fillText(`${list.length} sets  ·  ${(pieces||0).toLocaleString()} pcs  ·  ${S.figTotal.toLocaleString()} minifigs  ·  ${S.partsOwned.toLocaleString()} parts`,50,530);
  x.shadowBlur=0;x.shadowColor='transparent';
  // Collection value panel: est. value + stock-style sparkline, or other stats when there are no values (never invented)
  const PX=50,PY=588,PW=W-100,PH=214,mono='system-ui,sans-serif';
  x.fillStyle=L.dbg;x.fillRect(PX,PY,PW,PH);x.fillStyle=L.gold;x.fillRect(PX,PY,12,PH);
  const hasV=V&&V.total!=null&&V.total>0;
  if(hasV){
    x.fillStyle='#EDEEEC';x.font='bold 26px '+mono;x.fillText('COLLECTION VALUE',PX+40,PY+46);
    const vt=cardMoney(V.total,V.cur);let fs=88;x.font='800 '+fs+'px '+mono;while(x.measureText(vt).width>350&&fs>50){fs-=4;x.font='800 '+fs+'px '+mono;}
    x.fillStyle=L.light;x.fillText(vt,PX+36,PY+132);const vw=x.measureText(vt).width;
    x.fillStyle='#EDEEEC';x.font='28px '+mono;x.fillText('est. value',PX+40+vw+8,PY+132);
    x.font='24px '+mono;x.fillStyle='#E4E5E2';
    x.fillText(V.n<V.of?`${V.n} of ${V.of} sets valued`:`${V.n} set${V.n===1?'':'s'} valued`,PX+40,PY+176);
    if(V.points&&V.points.length>=2){
      const up=!V.change||V.change.pct>=0,lc=up?L.lime:L.red,sx=PX+560,sw=PW-560-30,sy=PY+70,sh=104;
      const ts=V.points.map(p=>p[0]),vs=V.points.map(p=>p[1]),t0=Math.min(...ts),t1=Math.max(...ts);let v0=Math.min(...vs),v1=Math.max(...vs);
      if(v1===v0){v0-=1;v1+=1;}const pad=(v1-v0)*.12;v0-=pad;v1+=pad;
      const X=t=>sx+(t1>t0?(t-t0)/(t1-t0):1)*sw,Y=v=>sy+sh-(v-v0)/(v1-v0)*sh;
      x.fillStyle='rgba(5,19,29,.35)';x.fillRect(sx-10,sy-10,sw+20,sh+20);
      x.beginPath();V.points.forEach((p,i)=>i?x.lineTo(X(p[0]),Y(p[1])):x.moveTo(X(p[0]),Y(p[1])));
      x.lineTo(X(t1),sy+sh);x.lineTo(X(t0),sy+sh);x.closePath();x.fillStyle=up?'rgba(165,202,24,.28)':'rgba(201,26,9,.30)';x.fill();
      x.beginPath();V.points.forEach((p,i)=>i?x.lineTo(X(p[0]),Y(p[1])):x.moveTo(X(p[0]),Y(p[1])));x.strokeStyle=lc;x.lineWidth=5;x.lineJoin='round';x.lineCap='round';x.stroke();
      const lp=V.points[V.points.length-1];x.fillStyle=lc;x.beginPath();x.arc(X(lp[0]),Y(lp[1]),8,0,7);x.fill();
      if(V.change){const t=(V.change.pct>=0?'+':'')+V.change.pct.toFixed(1)+'% '+V.change.period;x.font='bold 32px '+mono;const tw=x.measureText(t).width;
        x.fillStyle=lc;x.fillRect(sx+sw-tw-24+10,PY+14,tw+24,46);x.fillStyle=up?'#111':L.light;x.textAlign='right';x.fillText(t,sx+sw-2,PY+48);x.textAlign='left';}
    }else{const sx=PX+560,sw=PW-560-30;x.fillStyle='rgba(5,19,29,.35)';x.fillRect(sx-10,PY+60,sw+20,124);x.fillStyle='#E4E5E2';x.font='24px '+mono;x.textAlign='center';
      x.fillText('Trend line starts when you',sx+sw/2,PY+114);x.fillText('come back with values',sx+sw/2,PY+144);x.textAlign='left';}
    const own=(V.srcs||[]).filter(s=>!/example/i.test(s)).map(s=>s==='your file'?'your upload':s),cr=V.brickOwl?'Values: Brick Owl':own.length?'Values: '+own.join(', '):'';
    if(cr){x.fillStyle='#E4E5E2';x.font='22px '+mono;x.textAlign='right';x.fillText(cr.length>48?cr.slice(0,47)+'…':cr,PX+PW-30,PY+PH-18);x.textAlign='left';}
    if(V.example){x.save();x.translate(PX+420,PY+36);x.rotate(-.04);x.fillStyle=L.yellow;x.fillRect(-110,-28,220,52);x.fillStyle='#111';x.font='900 36px '+mono;x.textAlign='center';x.fillText('EXAMPLE',0,10);x.restore();
      x.fillStyle=L.yellow;x.font='bold 22px '+mono;x.fillText('Made-up test prices, not real values',PX+40,PY+PH-12);}
  }else{
    // no values yet: two other stats so the panel never looks empty
    const big=list.length?list.slice().sort((a,b)=>b.parts-a.parts)[0]:null;
    const stat=(cx,lbl,val,sub,col)=>{x.fillStyle='#EDEEEC';x.font='bold 26px '+mono;x.fillText(lbl,cx,PY+50);
      let fs=72;x.font='800 '+fs+'px '+mono;while(x.measureText(val).width>420&&fs>40){fs-=4;x.font='800 '+fs+'px '+mono;}x.fillStyle=col;x.fillText(val,cx-4,PY+132);
      if(sub){x.fillStyle='#E4E5E2';x.font='24px '+mono;let s=sub;while(x.measureText(s).width>430&&s.length>4)s=s.slice(0,-2);if(s!==sub)s=s.slice(0,-1)+'…';x.fillText(s,cx,PY+176);}};
    stat(PX+40,'MINIFIGS',S.figTotal.toLocaleString(),S.figTotal?[S.figUnique!=null?S.figUnique.toLocaleString()+' different':'',S.figInSets?S.figInSets.toLocaleString()+' from your sets':''].filter(Boolean).join(' · ')||'in your collection':'none yet',L.yellow);
    if(big)stat(PX+PW/2+10,'BIGGEST SET',big.parts.toLocaleString()+' pcs',`${big.num.replace(/-1$/,'')} ${big.name}`,L.lime);
    else stat(PX+PW/2+10,'PARTS',(S.partsOwned||0).toLocaleString(),'loose parts',L.lime);
    x.fillStyle='rgba(5,19,29,.45)';x.fillRect(PX+PW/2-12,PY+28,3,PH-56);
  }
  // Top unlocked badges, with the real badge art (emoji if it didn't load)
  x.fillStyle=L.light;x.font='bold 26px '+mono;x.fillText('TOP BADGES',PX,PY+PH+42);
  let y=PY+PH+58;const RH=top.length>3?92:110,GAP=top.length>3?10:12;
  top.forEach((a,i)=>{const m=medal(a),g=art[i];x.fillStyle=L.dbg;x.fillRect(50,y,W-100,RH);x.fillStyle=m.bg;x.fillRect(50,y,12,RH);
    const bs=RH-12,bx=74,by=y+6;
    if(g){x.save();x.beginPath();x.arc(bx+bs/2,by+bs/2,bs/2*.92,0,7);x.clip();
      if(g.img)x.drawImage(g.img,bx,by,bs,bs);else{if(g.icon){const is=bs*.56;x.drawImage(g.icon,bx+bs*.506-is/2,by+bs*.495-is/2,is,is);}x.drawImage(g.frame,bx,by,bs,bs);}
      x.restore();}
    else{x.fillStyle=L.light;x.font=Math.round(bs*.6)+'px '+mono;x.textAlign='center';x.fillText(a.icon,bx+bs/2,by+bs*.72);x.textAlign='left';}
    const tx=bx+bs+22;x.fillStyle=L.light;x.font='bold 36px '+mono;x.fillText(a.title,tx,y+RH/2-4);
    x.fillStyle='#EDEEEC';x.font='26px '+mono;let w=(a.winner||a.desc);if(w.length>44)w=w.slice(0,43)+'…';x.fillText(w,tx,y+RH/2+30);
    const t=a.g+' '+(a.sys||'SS');x.font='bold 32px '+mono;const tw=x.measureText(t).width;
    x.fillStyle=m.bg;x.fillRect(W-75-tw-24,y+RH/2-23,tw+24,46);x.fillStyle=m.fg;x.textAlign='right';x.fillText(t,W-87,y+RH/2+11);x.textAlign='left';y+=RH+GAP;});
  // Bright Yellow #F2CD37 frame on a LEGO Black outer edge around everything below the lime header (header untouched)
  x.fillStyle=L.black;x.fillRect(0,150,14,H-150);x.fillRect(W-14,150,14,H-150);x.fillRect(0,H-14,W,14);
  x.strokeStyle=L.yellow;x.lineWidth=12;x.beginPath();x.moveTo(20,150);x.lineTo(20,H-38);x.arcTo(20,H-20,38,H-20,18);x.lineTo(W-38,H-20);x.arcTo(W-20,H-20,W-20,H-38,18);x.lineTo(W-20,150);x.stroke();
  x.fillStyle='#D5D7D3';x.font='24px system-ui,sans-serif';x.fillText('Set data from Rebrickable. Not affiliated with the LEGO Group.',50,H-44);
  return c;
}
function showShareCard(url){
  // Show the card in an overlay: long-press to save on phones, plus Share/Download buttons
  let ov=document.getElementById('cardOverlay');if(ov)ov.remove();
  ov=document.createElement('div');ov.id='cardOverlay';
  ov.style.cssText='position:fixed;inset:0;background:rgba(5,19,29,.95);z-index:99;overflow:auto;padding:16px;text-align:center';
  ov.innerHTML='<p style="color:#F2F3F2;margin:4px">Long-press the image to save it, or use Share.</p>'+
    '<img src="'+url+'" style="max-width:100%;max-height:75vh;border-radius:10px"><br>'+
    '<button id="cardShare">Share</button>'+(location.protocol.startsWith('http')?'<button id="cardDl">Download</button>':'')+'<button id="cardClose" style="background:#6C6E68;color:#F2F3F2">Close</button>';
  document.body.appendChild(ov);
  document.getElementById('cardClose').onclick=()=>ov.remove();
  const dl=document.getElementById('cardDl');if(dl)dl.onclick=()=>{const l=document.createElement('a');l.href=url;l.download='my-studscore.png';document.body.appendChild(l);l.click();l.remove();};
  document.getElementById('cardShare').onclick=async()=>{try{const b=await (await fetch(url)).blob();const f=new File([b],'my-studscore.png',{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[f]}))await navigator.share({files:[f],title:'My StudScore'});else alert('Sharing isn\'t available here. Long-press the image to save it.');}catch(e){}};
}
(function(){
  const btn=document.createElement('button');btn.textContent='📸 Save share card';btn.onclick=()=>drawShareCard(owned);
  document.getElementById('demo').after(btn);
  const _render=render;render=function(o){_render(o);try{localStorage.setItem('brickOwned',JSON.stringify(o));}catch(e){}};
  try{const s=JSON.parse(localStorage.getItem('brickOwned')||'{}');if(Object.keys(s).length){owned=s;render(owned);}}catch(e){}
})();
