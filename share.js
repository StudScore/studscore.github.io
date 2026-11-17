// Share card + saved board (added by Money)
function drawShareCard(owned){
  const {list,ach,pieces,themeCount}=compute(owned);
  if(!list.length){alert('Load a collection first');return;}
  const got=ach.filter(a=>a.unlocked),score=got.reduce((s,a)=>s+a.g,0),max=ach.reduce((s,a)=>s+a.g,0);
  const W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  x.fillStyle='#111';x.fillRect(0,0,W,H);x.fillStyle='#A5CA18';x.fillRect(0,0,W,150);
  x.fillStyle='#111';x.font='bold 56px system-ui,sans-serif';x.fillText('🏆 My StudScore',50,95);
  x.fillStyle='#A5CA18';x.font='800 170px system-ui,sans-serif';x.fillText(score+'S',50,350);
  x.fillStyle='#aaa';x.font='36px system-ui,sans-serif';x.fillText(`of ${max}S · ${got.length}/${ach.length} unlocked`,55,410);
  x.fillStyle='#333';x.fillRect(50,440,W-100,22);x.fillStyle='#A5CA18';x.fillRect(50,440,(W-100)*score/max,22);
  x.fillStyle='#eee';x.font='bold 40px system-ui,sans-serif';
  x.fillText(`${list.length} sets  ·  ${pieces.toLocaleString()} pieces  ·  ${Object.keys(themeCount).length} themes`,50,530);
  const top=got.slice().sort((a,b)=>b.g-a.g).slice(0,6);let y=600;
  for(const a of top){x.fillStyle='#1c1c1c';x.fillRect(50,y,W-100,100);x.fillStyle='#A5CA18';x.fillRect(50,y,8,100);
    x.font='48px system-ui,sans-serif';x.fillText(a.icon,75,y+66);
    x.fillStyle='#fff';x.font='bold 36px system-ui,sans-serif';x.fillText(a.title,150,y+45);
    x.fillStyle='#aaa';x.font='26px system-ui,sans-serif';let w=(a.winner||a.desc);if(w.length>55)w=w.slice(0,54)+'…';x.fillText(w,150,y+82);
    x.fillStyle='#A5CA18';x.font='bold 36px system-ui,sans-serif';x.textAlign='right';x.fillText(a.g+'S',W-75,y+62);x.textAlign='left';y+=115;}
  x.fillStyle='#777';x.font='24px system-ui,sans-serif';x.fillText('Set data from Rebrickable. Not affiliated with the LEGO Group.',50,H-40);
  // Show the card in an overlay: long-press to save on phones, plus Share/Download buttons
  const url=c.toDataURL('image/png');
  let ov=document.getElementById('cardOverlay');if(ov)ov.remove();
  ov=document.createElement('div');ov.id='cardOverlay';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:99;overflow:auto;padding:16px;text-align:center';
  ov.innerHTML='<p style="color:#ccc;margin:4px">Long-press the image to save it, or use Share.</p>'+
    '<img src="'+url+'" style="max-width:100%;max-height:75vh;border-radius:10px"><br>'+
    '<button id="cardShare">Share</button>'+(location.protocol.startsWith('http')?'<button id="cardDl">Download</button>':'')+'<button id="cardClose" style="background:#444">Close</button>';
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
