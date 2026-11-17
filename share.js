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
function drawShareCard(owned){
  const S=scores(owned,typeof extras!=='undefined'?extras:null);const {list,pieces,themeCount}=S;
  if(!list.length&&!S.figTotal&&!S.partsOwned){alert('Load a collection first');return;}
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
  const got=S.ach.concat(S.fach).filter(a=>a.unlocked);
  const top=got.slice().sort((a,b)=>b.g-a.g).slice(0,6);let y=600;
  for(const a of top){const m=medal(a);x.fillStyle=L.dbg;x.fillRect(50,y,W-100,100);x.fillStyle=m.bg;x.fillRect(50,y,12,100);
    x.font='48px system-ui,sans-serif';x.fillText(a.icon,78,y+66);
    x.fillStyle=L.light;x.font='bold 36px system-ui,sans-serif';x.fillText(a.title,150,y+45);
    x.fillStyle='#EDEEEC';x.font='26px system-ui,sans-serif';let w=(a.winner||a.desc);if(w.length>48)w=w.slice(0,47)+'…';x.fillText(w,150,y+82);
    const t=a.g+' '+(a.sys||'SS');x.font='bold 32px system-ui,sans-serif';const tw=x.measureText(t).width;
    x.fillStyle=m.bg;x.fillRect(W-75-tw-24,y+28,tw+24,46);x.fillStyle=m.fg;x.textAlign='right';x.fillText(t,W-87,y+62);x.textAlign='left';y+=115;}
  // Bright Yellow #F2CD37 frame on a LEGO Black outer edge around everything below the lime header (header untouched)
  x.fillStyle=L.black;x.fillRect(0,150,14,H-150);x.fillRect(W-14,150,14,H-150);x.fillRect(0,H-14,W,14);
  x.strokeStyle=L.yellow;x.lineWidth=12;x.beginPath();x.moveTo(20,150);x.lineTo(20,H-38);x.arcTo(20,H-20,38,H-20,18);x.lineTo(W-38,H-20);x.arcTo(W-20,H-20,W-20,H-38,18);x.lineTo(W-20,150);x.stroke();
  x.fillStyle='#D5D7D3';x.font='24px system-ui,sans-serif';x.fillText('Set data from Rebrickable. Not affiliated with the LEGO Group.',50,H-44);
  // Show the card in an overlay: long-press to save on phones, plus Share/Download buttons
  const url=c.toDataURL('image/png');
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
