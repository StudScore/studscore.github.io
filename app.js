const THEME_NAMES={'Aquaraiders II':'Aqua Raiders','Aquaraiders I':'Aquaraiders'};
const tName=n=>THEME_NAMES[n]||n;
function rootTheme(id){let t=THEMES[id];let n=0;while(t&&t[1]!=null&&n<10){id=t[1];t=THEMES[id];n++;}return t?tName(t[0]):'Unknown';}
function parseList(text){
  const out={};
  for(const line of text.split(/\r?\n/)){
    const cells=line.split(/[,\t;]/).map(c=>c.trim().replace(/^"|"$/g,''));
    const sn=cells.find(c=>/^[0-9A-Za-z]+(-\d+)?$/.test(c)&&/\d/.test(c));
    if(!sn)continue;
    let key=sn.includes('-')?sn:sn+'-1';
    if(!SETS[key])continue;
    const q=parseInt(cells[cells.indexOf(sn)+1]);
    out[key]=(out[key]||0)+(q>0&&q<1000?q:1);
  }
  return out;
}
function tier(id,icon,title,desc,g,val,goal,winner){return {id,icon,title,desc,g,unlocked:val>=goal,progress:Math.min(val,goal),goal,winner};}
function compute(owned){
  const list=Object.keys(owned).map(k=>({num:k,name:SETS[k][0],year:SETS[k][1],theme:rootTheme(SETS[k][2]),parts:SETS[k][3],qty:owned[k]}));
  if(!list.length)return {list,ach:[]};
  const pieces=list.reduce((a,s)=>a+s.parts*s.qty,0);
  const themeCount={};list.forEach(s=>themeCount[s.theme]=(themeCount[s.theme]||0)+1);
  const decades=new Set(list.map(s=>Math.floor(s.year/10)*10));
  const by=(f)=>list.slice().sort(f)[0];
  const oldest=by((a,b)=>a.year-b.year), newest=by((a,b)=>b.year-a.year);
  const big=by((a,b)=>b.parts-a.parts), small=by((a,b)=>a.parts-b.parts||a.year-b.year);
  const topTheme=Object.entries(themeCount).sort((a,b)=>b[1]-a[1])[0];
  const lbl=s=>`${s.num.replace(/-1$/,'')} ${s.name} (${s.year})`;
  const A=[
    {id:'first',icon:'🧱',title:'First Brick',desc:'Log your first set',g:10,unlocked:true,winner:lbl(list[0])},
    {id:'oldest',icon:'⏳',title:'Time Traveler',desc:'Your oldest set',g:25,unlocked:true,winner:lbl(oldest)},
    {id:'newest',icon:'✨',title:'Fresh Off the Shelf',desc:'Your newest set',g:10,unlocked:true,winner:lbl(newest)},
    {id:'big',icon:'🏗️',title:'Mega Builder',desc:'Your biggest build',g:25,unlocked:true,winner:`${lbl(big)}: ${big.parts.toLocaleString()} pcs`},
    {id:'small',icon:'🚀',title:'Pocket Rocket',desc:'Your smallest set',g:10,unlocked:true,winner:`${lbl(small)}: ${small.parts} pcs`},
    {id:'fan',icon:'🏆',title:'Theme Fanatic',desc:'Most sets in one theme',g:25,unlocked:topTheme[1]>=5,progress:Math.min(topTheme[1],5),goal:5,winner:`${topTheme[0]}: ${topTheme[1]} sets`},
    {id:'90s',icon:'📼',title:'Old School',desc:'Own a set from 1999 or earlier',g:25,unlocked:oldest.year<=1999,progress:oldest.year<=1999?1:0,goal:1,winner:oldest.year<=1999?(()=>{const n=list.filter(x=>x.year<=1999).length;return n+' set'+(n>1?'s':'')+' from the 90s or earlier';})():null},
    {id:'vintage',icon:'🕰️',title:'Vintage Vault',desc:'Own a set from before 1980',g:50,unlocked:oldest.year<1980,progress:oldest.year<1980?1:0,goal:1},
    tier('s10','📦','Shelf Starter','Own 10 sets',10,list.length,10),
    tier('s25','📚','Collector','Own 25 sets',25,list.length,25),
    tier('s50','🏛️','Curator','Own 50 sets',50,list.length,50),
    tier('s100','👑','Brick Baron','Own 100 sets',100,list.length,100),
    tier('p1k','🔹','1K Club','1,000 pieces across your sets',10,pieces,1000),
    tier('p10k','🔷','10K Club','10,000 pieces across your sets',25,pieces,10000),
    tier('p25k','💎','25K Club','25,000 pieces across your sets',50,pieces,25000),
    tier('p50k','🌋','Brick Mountain','50,000 pieces across your sets',100,pieces,50000),
    tier('t5','🎨','Theme Hopper','Sets from 5 themes',10,Object.keys(themeCount).length,5),
    tier('t10','🌈','Theme Explorer','Sets from 10 themes',25,Object.keys(themeCount).length,10),
    tier('t20','🗺️','Theme Globetrotter','Sets from 20 themes',50,Object.keys(themeCount).length,20),
    tier('d3','📅','Decade Hopper','Sets from 3 decades',25,decades.size,3),
    tier('d5','🧭','Era Spanner','Sets from 5 decades',50,decades.size,5),
  ];

  // Auto theme achievements: one per theme the user owns (counts sets with 20+ pieces)
  const tc={};list.forEach(x=>{const tid=SETS[x.num][2];tc[tid]=(tc[tid]||0)+1;});
  // Show only your top 5 themes by sets owned (ties go to whichever is closer to complete), plus any theme you've fully completed
  const cand=Object.entries(tc).map(([tid,n])=>[tid,n,Object.values(SETS).filter(v=>v[2]==tid&&v[3]>=20).length]).filter(c=>c[2]>=3)
    .sort((a,b)=>b[1]-a[1]||(b[1]/b[2])-(a[1]/a[2]));
  const shown=cand.filter((c,i)=>i<5||c[1]>=c[2]);
  for(const [tid,n,total] of shown){
    const nm=THEMES[tid]?tName(THEMES[tid][0]):'Theme';
    A.push({id:'th'+tid,icon:'🎖️',title:nm+' Master',desc:`Own every ${nm} set (20+ pcs)`,g:total>=20?100:50,unlocked:n>=total,progress:Math.min(n,total),goal:total,winner:`${n} of ${total} sets`});
  }
  return {list,ach:A,pieces,themeCount};
}
function render(owned){
  const {list,ach,pieces,themeCount}=compute(owned);
  const el=document.getElementById('board');
  if(!list.length){el.innerHTML='<p class="muted">No recognized sets yet. Upload a Rebrickable set list CSV or paste set numbers.</p>';return;}
  const got=ach.filter(a=>a.unlocked), score=got.reduce((s,a)=>s+a.g,0), max=ach.reduce((s,a)=>s+a.g,0);
  const tile=a=>`<div class="tile ${a.unlocked?'':'locked'}"><div class="icon">${a.icon}</div><div class="body"><div class="row"><b>${a.title}</b><span class="g">${a.g}G</span></div><div class="muted">${a.desc}</div>${a.winner?`<div class="win">${a.winner}</div>`:''}${!a.unlocked&&a.goal?`<div class="bar"><div style="width:${100*a.progress/a.goal}%"></div></div><div class="muted small">${a.progress.toLocaleString()} / ${a.goal.toLocaleString()}</div>`:''}</div></div>`;
  el.innerHTML=`<div class="banner"><div><div class="big">${score}G</div><div class="muted">of ${max}G · ${got.length}/${ach.length} unlocked</div></div><div class="stats"><div><b>${list.length}</b> sets</div><div><b>${pieces.toLocaleString()}</b> pieces</div><div><b>${Object.keys(themeCount).length}</b> themes</div></div></div><div class="bar main"><div style="width:${100*score/max}%"></div></div><h3>Unlocked</h3><div class="grid">${got.map(tile).join('')}</div><h3>Locked</h3><div class="grid">${ach.filter(a=>!a.unlocked).map(tile).join('')}</div>`;
}
let owned={};
document.getElementById('file').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{owned=parseList(t);render(owned);});};
document.getElementById('go').onclick=()=>{owned=parseList(document.getElementById('paste').value);render(owned);};
const SAMPLE="Set Number,Quantity\n11513-1,1\n72159-1,1\n72155-1,1\n8103-1,1\n8101-1,1\n7707-1,1\n7700-1,1\n7706-1,1\n7712-1,1\n7702-1,1\n8114-1,1\n8100-1,1\n8113-1,1\n7708-1,1\n8102-1,1\n8105-1,1\n7709-1,1\n7713-1,1\n8104-1,1\n7770-1,1\n7771-1,1\n7772-1,1\n7774-1,1\n7775-1,1\n7773-1,1\n7776-1,1\n77037-1,1\n10375-1,1\n43249-1,1\n76282-1,1\n76249-1,1\n4970-1,1\n72046-1,1\n11373-1,1\n76251-1,1\n75318-1,1\n75308-1,1\n75349-1,1\n75328-1,1\n77093-1,1\n6915-1,1\n7693-1,1\n72151-1,1\n72167-1,1\n72156-1,1\n72165-1,1\n40887-1,1\n7965-1,1\n";
document.getElementById('demo').onclick=()=>{owned=parseList(SAMPLE);render(owned);};
render(owned);
