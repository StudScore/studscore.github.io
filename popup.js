// ---- Popup shell (added by Money): phone-friendly set/fig popups.
// Does not edit collection.js or lore.js.
// Fixes: the photo tile sat on top of the close button (isolation:isolate, no z-index on the X),
// so taps on the X hit the image and the popup could not be closed on a phone. The thin backdrop
// was easy to miss. Saving a fig closed the popup and then immediately re-opened it. The Value
// history block made the popup taller than a phone screen. The phone Back button did nothing.
// This file: inner scrolling with a pinned close button, Save/backdrop/X actually close,
// swipe-to-change-tabs is ignored while a popup is open, and Back closes the popup.
(function(){
const MARK='studPopup';

let pushed=false, fromPop=false, fromUI=false, uiTimer=0;

function modalRoot(){return document.getElementById('setmodal');}
function modalEl(bg){return (bg||modalRoot()||document).querySelector('.modal');}

function ensureShell(bg){
  bg=bg||modalRoot();if(!bg)return;
  bg.classList.add('no-swipe');
  const modal=modalEl(bg);if(!modal)return;
  const close=modal.querySelector('.mclose');
  if(close)close.classList.add('no-swipe');
  if(!modal.querySelector('.mscroll')){
    const scroll=document.createElement('div');scroll.className='mscroll no-swipe';
    const kids=[...modal.childNodes].filter(n=>n!==close);
    kids.forEach(n=>scroll.appendChild(n));
    modal.appendChild(scroll);
  }
  document.body.classList.add('ss-popup-open');
}

function afterOpen(bg){
  bg=bg||modalRoot();if(!bg)return;
  ensureShell(bg);
  pushHist();
}

function pushHist(){
  if(pushed)return;
  if(!modalRoot())return;
  try{
    const st=(history.state&&typeof history.state==='object')?Object.assign({},history.state):{};
    st[MARK]=1;
    // Keep the current URL (including the tab hash) so a reload never lands on a stale #popup
    // that would kick the user back to the Score tab.
    history.pushState(st,'',location.pathname+location.search+location.hash);
    pushed=true;
  }catch(e){pushed=false;}
}

function consumeHist(){
  if(fromPop){pushed=false;return;}
  if(!pushed)return;
  pushed=false;
  let st=null;try{st=history.state;}catch(e){}
  if(!(st&&st[MARK]))return;
  fromUI=true;
  clearTimeout(uiTimer);
  uiTimer=setTimeout(()=>{fromUI=false;},500);
  try{history.back();}catch(e){fromUI=false;}
}

function onRemoved(){
  document.body.classList.remove('ss-popup-open');
  requestAnimationFrame(()=>{if(modalRoot())return;consumeHist();});
}

function closeOpen(){
  const bg=modalRoot();if(!bg)return;
  const x=bg.querySelector('.mclose');
  if(x){x.click();return;}
  if(typeof closeSet==='function')closeSet();
  else bg.remove();
}

function stripStale(){
  // If a leftover #popup / #ss-popup hash is in the URL (old session or a typed link), drop it
  // without changing the current tab. Do not send the user to Score.
  const raw=location.hash||'';
  const h=decodeURIComponent(raw.slice(1));
  if(h!=='popup'&&h!=='ss-popup')return;
  const tab=(typeof curTab==='string'&&curTab)||'score';
  try{
    const st=(history.state&&typeof history.state==='object')?Object.assign({},history.state):{};
    delete st[MARK];
    history.replaceState(st,'',location.pathname+location.search+(tab?'#'+tab:''));
  }catch(e){}
}

function clearLeftoverState(){
  try{
    const st=history.state;
    if(st&&st[MARK]){
      const next=Object.assign({},st);delete next[MARK];
      history.replaceState(next,'',location.pathname+location.search+location.hash);
    }
  }catch(e){}
}

window.addEventListener('popstate',()=>{
  if(fromUI){fromUI=false;return;}
  if(!modalRoot()){pushed=false;return;}
  fromPop=true;pushed=false;
  try{closeOpen();}finally{fromPop=false;}
});

// collection.js fig Save/Clear runs close();render(owned);openFig(id). openFig is inside
// that file's IIFE, so it cannot be stubbed from here. The reopen happens in the button's
// onclick, before this bubble listener. Closing the new popup in the same turn means the
// browser never paints it, so Save appears to just close.
document.addEventListener('click',e=>{
  const t=e.target&&e.target.closest&&e.target.closest('#cx-fuvs, #cx-fuvc');
  if(!t)return;
  const bg=modalRoot();if(!bg)return;
  const x=bg.querySelector('.mclose');
  if(x)x.click();else bg.remove();
});

try{
  new MutationObserver(ms=>{
    for(const m of ms){
      for(const n of m.addedNodes){
        if(n.nodeType!==1)continue;
        const bg=n.id==='setmodal'?n:(n.querySelector&&n.querySelector('#setmodal'));
        if(bg)afterOpen(bg);
      }
      for(const n of m.removedNodes){
        if(n.nodeType===1&&n.id==='setmodal')onRemoved();
      }
    }
  }).observe(document.body,{childList:true});
}catch(e){}

if(typeof openSet==='function'){
  const _os=openSet;
  openSet=function(){
    const r=_os.apply(this,arguments);
    afterOpen(modalRoot());
    return r;
  };
}

stripStale();
clearLeftoverState();
if(modalRoot())afterOpen(modalRoot());

const css=document.createElement('style');css.textContent=`
body.ss-popup-open{overflow:hidden;overscroll-behavior:none}
.modalbg{align-items:center;align-items:safe center;overflow:hidden;padding:max(12px,env(safe-area-inset-top,0px)) 12px max(12px,env(safe-area-inset-bottom,0px));-webkit-overflow-scrolling:auto}
.modal{display:flex;flex-direction:column;min-height:0;max-height:90vh;max-height:calc(100dvh - 24px);max-height:calc(100svh - 24px);overflow:hidden;overscroll-behavior:contain}
.modal .mclose{position:absolute;top:8px;right:8px;z-index:6;flex-shrink:0}
.modal .mscroll{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y}
`;document.head.appendChild(css);
})();
