(()=>{
const DIFF=window.NapMapDifficulty; /* difficulty: rating, rated generation, hint steps (js/difficulty.js) */
/* ---------- beds: each region is a different piece of cat furniture (art in css/furniture.css) ---------- */
const BEDS=['Tufty Puff Pillow','Knitty-Knot Blankets','Sisal Tippy Tower','Wiggle-Wicker Basket','Swingy Hammock',
  'Very Good Box','Plushy Donut Bed','Tippy Teepee','Cloud-Fluff Bed','Velvet Fainting Couch'];
/* ---------- state ---------- */
const $=id=>document.getElementById(id);
const store={get(k,d){try{const v=localStorage.getItem('napmap:'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem('napmap:'+k,JSON.stringify(v))}catch(e){}}};
let P,cells,lives,undo,startT,elapsed,timerId,done,mode,cellEls=[];
const keyOf=d=>d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
const today=()=>keyOf(new Date());
const dateOf=k=>new Date(k/10000|0,(k/100|0)%100-1,k%100);
const dailySeed=k=>k*31+7;
/* event bus: other modules listen with NapMap.on(type, fn) */
const bus={};
const on=(t,f)=>{(bus[t]=bus[t]||[]).push(f)};
const emit=(t,d)=>{(bus[t]||[]).forEach(f=>{try{f(d)}catch(e){console.error(e)}})};
const info=()=>({mode,n:P.n,seed:P.seed,dateKey:P.dateKey||null,timeMs:elapsed+(startT?Date.now()-startT:0),heartsLost:3-lives});

function newPuzzle(m,seed,opts={}){mode=m;const n=m==='daily'?8:+m;let dateKey=null;
  if(m==='daily'){dateKey=opts.dateKey||today();seed=dailySeed(dateKey)}
  else if(seed==null)seed=(Math.random()*2**31)|0;
  const my=++genToken,wrap=document.querySelector('.board-wrap');
  const use=p=>{if(my!==genToken)return;P=p;P.seed=seed;P.dateKey=dateKey;reset();store.set('mode',m);emit('newPuzzle',info())};
  /* --- difficulty: rated generation (js/difficulty.js), target per mode --- */
  const target=DIFF.TARGETS[m],build=()=>DIFF.generateRated(n,seed,target);
  if(n<9||!P||!genWorker){use(build());return}
  /* 9x9 and 10x10 rated boards can take a second or more, so build them off the main thread */
  /* --- end difficulty --- */
  wrap.setAttribute('aria-busy','true');
  genAsync(n,seed,target).catch(build).then(use).finally(()=>{if(my===genToken)wrap.removeAttribute('aria-busy')})}
let genToken=0,genReq=0;
const genWorker=(()=>{try{return typeof Worker!=='undefined'&&location.protocol!=='file:'?new Worker('js/gen-worker.js'):null}catch(e){return null}})();
const genAsync=(n,seed,target)=>new Promise((res,rej)=>{const id=++genReq;
  const h=e=>{if(e.data.id!==id)return;genWorker.removeEventListener('message',h);e.data.ok?res(e.data.puzzle):rej(new Error(e.data.error))};
  genWorker.addEventListener('message',h);genWorker.postMessage({id,n,seed,target})});
function reset(){cells=Array(P.n*P.n).fill(0);lives=3;undo=[];elapsed=0;startT=null;done=false;clearInterval(timerId);hideHint();
  $('overlay').hidden=true;render();renderHearts();tick()}

/* ---------- render ---------- */
function render(){const n=P.n,b=$('board');b.style.gridTemplateColumns=`repeat(${n},minmax(0,1fr))`;b.style.gridTemplateRows=`repeat(${n},minmax(0,1fr))`;
  if(cellEls.length!==n*n||b.dataset.seed!=P.seed){b.innerHTML='';cellEls=[];b.dataset.seed=P.seed;
    for(let k=0;k<n*n;k++){const r=k/n|0,c=k%n,g=P.reg[k],e=document.createElement('div');
      e.className='cell';e.dataset.k=k;e.dataset.bed=P.colors[g];e.setAttribute('role','gridcell');e.tabIndex=k===0?0:-1;
      const up=r===0||P.reg[k-n]!==g,dn=r===n-1||P.reg[k+n]!==g,lf=c===0||P.reg[k-1]!==g,rt=c===n-1||P.reg[k+1]!==g,R='22%';
      e.style.borderRadius=`${up&&lf?R:0} ${up&&rt?R:0} ${dn&&rt?R:0} ${dn&&lf?R:0}`;e.title=BEDS[P.colors[g]];
      e.style.setProperty('--et',+up);e.style.setProperty('--eb',+dn);e.style.setProperty('--el',+lf);e.style.setProperty('--er',+rt);
      const side=(edge,outer)=>outer?'0px solid transparent':edge?'1.5px solid var(--line)':'.5px solid var(--seam)';
      e.style.borderTop=side(up,r===0);e.style.borderBottom=side(dn,r===n-1);e.style.borderLeft=side(lf,c===0);e.style.borderRight=side(rt,c===n-1);
      b.appendChild(e);cellEls.push(e)}}
  cellEls.forEach((e,k)=>{const s=cells[k],cls='cell'+(s===2?' cat':'')+(s===3?' wrong':'');
    if(e.dataset.s!=s){e.dataset.s=s;e.className=cls;
      e.innerHTML=s===2?`<svg class="${catCoat(k)}" viewBox="0 0 64 64"><use href="#cat"/></svg>`:(s===1||s===3)?'<svg class="x"><use href="#x"/></svg>':'';}
    const r=k/n|0,c=k%n;e.setAttribute('aria-label',`Row ${r+1}, column ${c+1}, ${BEDS[P.colors[P.reg[k]]]}, ${['empty','crossed out','cat','wrong guess'][s]}`)});
  const lab=mode==='daily'?(P.dateKey===today()?'Daily · ':'Past daily · ')+dateOf(P.dateKey).toLocaleDateString(undefined,{month:'short',day:'numeric'}):`${P.n}×${P.n} · #${(P.seed%100000).toString().padStart(5,'0')}`;
  $('label').textContent=lab;
  /* --- difficulty: stars after the label --- */
  const lv=P.rating&&Math.min(4,P.rating.level);
  if(lv){const s=document.createElement('span');s.className='stars';s.textContent=' · '+'★'.repeat(lv)+'☆'.repeat(4-lv);
    s.title=`Difficulty ${lv} of 4: ${STAR_TIPS[lv-1]}`;s.setAttribute('aria-label',`Difficulty ${lv} of 4`);$('label').appendChild(s)}
  /* --- end difficulty --- */
  document.querySelectorAll('.chip[data-mode]').forEach(ch=>ch.setAttribute('aria-pressed',ch.dataset.mode==mode));
  $('undo').disabled=!undo.length||done;$('hint').disabled=done;renderStats()}
/* sleeping-cat coat, stable per puzzle and cell; stepping by 3 through 7 coats keeps nearby beds different (css/cats.css) */
const COATS=['tabby','black','white','grey','calico','tuxedo','siamese'];
function catCoat(k){const h=Math.imul(P.seed^0x5bd1e995,2654435761)>>>0;return 'coat-'+COATS[(h+P.reg[k]*3)%7]+(((h>>>11)+k*5)%3?'':' zz')}
function renderHearts(){$('hearts').innerHTML=[0,1,2].map(i=>`<svg class="${i>=lives?'lost':''}"><use href="#heart"/></svg>`).join('')}
function fmt(ms){const s=Math.floor(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function tick(){$('timer').textContent=fmt(elapsed+(startT?Date.now()-startT:0))}
function startClock(){if(startT||done)return;if(!elapsed)emit('start',info());startT=Date.now();timerId=setInterval(tick,250)}
function stopClock(){if(startT){elapsed+=Date.now()-startT;startT=null}clearInterval(timerId);tick()}
function renderStats(){const key=mode==='daily'?'daily':'n'+P.n,best=store.get('best:'+key,null),wins=store.get('wins:'+key,0);
  let h=`<span>Solved: <b>${wins}</b></span><span>Best: <b>${best?fmt(best):'—'}</b></span>`;
  if(mode==='daily')h+=`<span>Streak: <b>${store.get('streak',{n:0}).n}</b></span>`;$('stats').innerHTML=h}

/* ---------- rules ---------- */
function peers(k){const n=P.n,r=k/n|0,c=k%n,g=P.reg[k],out=new Set();
  for(let q=0;q<n*n;q++){const a=q/n|0,b=q%n;if(q!==k&&(a===r||b===c||P.reg[q]===g||(Math.abs(a-r)<=1&&Math.abs(b-c)<=1)))out.add(q)}return out}
const isSol=k=>P.sol[k/P.n|0]===k%P.n;
function snapshot(){undo.push(cells.slice());if(undo.length>300)undo.shift()}

function setMark(k,v){if(cells[k]===2||cells[k]===3)return false;if(cells[k]===v)return false;cells[k]=v;return true}
function placeCat(k){if(done||cells[k]===2||cells[k]===3)return;startClock();
  if(isSol(k)){snapshot();cells[k]=2;
    if($('autox').checked)peers(k).forEach(q=>{if(cells[q]===0)cells[q]=1});
    render();emit('cat',{k,...info()});checkWin()}
  else{cells[k]=3;lives--;renderHearts();render();const e=cellEls[k];e.classList.add('shake');setTimeout(()=>e.classList.remove('shake'),400);
    if(navigator.vibrate)try{navigator.vibrate(60)}catch(_){}
    emit('wrong',{k,...info()});if(lives<=0)lose()}}
function checkWin(){if(cells.filter(s=>s===2).length===P.n){done=true;stopClock();
  const t=elapsed,key=mode==='daily'?'daily':'n'+P.n,best=store.get('best:'+key,null);
  store.set('wins:'+key,store.get('wins:'+key,0)+1);const nb=!best||t<best;if(nb)store.set('best:'+key,t);
  if(mode==='daily'){if(!store.get('daily:'+P.dateKey,null))store.set('daily:'+P.dateKey,{timeMs:t,heartsLost:3-lives});}
  if(mode==='daily'&&P.dateKey===today()){const st=store.get('streak',{n:0,last:0}),td=today();
    if(st.last!==td){const y=new Date();y.setDate(y.getDate()-1);const yd=y.getFullYear()*10000+(y.getMonth()+1)*100+y.getDate();
      st.n=st.last===yd?st.n+1:1;st.last=td;store.set('streak',st)}}
  cells=cells.map(s=>s===2?2:s===3?3:1);render();
  showCard(`<h2>Everybody's napping!</h2><p>Solved in ${fmt(t)}${nb?' · new best':''}${lives<3?` · ${3-lives} heart${3-lives>1?'s':''} lost`:''}</p>
    <div class="win-extra" id="win-extra"></div>
    <div class="row">${mode==='daily'?'<button class="btn primary" data-act="practice">Play a Hard puzzle</button>':'<button class="btn primary" data-act="new">Next puzzle</button>'}</div>`);emit('win',info())}}
function lose(){done=true;stopClock();emit('lose',info());
  showCard(`<h2>Out of hearts</h2><p>Three cats in the wrong beds. Try the same puzzle again or see where they belonged.</p>
  <div class="row"><button class="btn primary" data-act="retry">Try again</button><button class="btn" data-act="reveal">Show solution</button></div>`)}
function showCard(html){const o=$('overlay');o.innerHTML=`<div class="card">${html}</div>`;o.hidden=false}
$('overlay').addEventListener('click',e=>{const a=e.target.closest('[data-act]')?.dataset.act;if(!a)return;
  if(a==='new')newPuzzle(mode);else if(a==='practice')newPuzzle('8');else if(a==='retry')reset();
  else if(a==='reveal'){$('overlay').hidden=true;cells=cells.map((s,k)=>isSol(k)?2:s===3?3:1);render()}});

/* ---------- hint ---------- */
/* --- difficulty: hints come from DIFF.nextStep, explained in the bubble under the board (css/difficulty.css) --- */
const STAR_TIPS=['solvable by spotting rows, columns and beds with one open spot',
  'needs spotting a bed that fits in one row or column',
  'needs spotting where a cat would squeeze out a whole row, column or bed',
  'needs spotting groups of beds that share the same rows or columns'];
let hintTimer=0;
function hideHint(){const b=$('hint-bubble');if(b)b.hidden=true;clearTimeout(hintTimer);cellEls.forEach(e=>e.classList.remove('hint-zone'))}
function hint(){if(done)return;startClock();
  const step=DIFF.nextStep(P,cells,{names:P.colors.map(c=>BEDS[c])});
  if(step.action==='place'){if(cells[step.cell]===0)placeCat(step.cell)}
  else if(step.action==='cross'){snapshot();step.cells.forEach(k=>{if(cells[k]===0)cells[k]=1});render()}
  clearTimeout(hintTimer);cellEls.forEach(e=>e.classList.remove('hint-zone','hint'));void $('board').offsetWidth;
  step.zone.forEach(k=>cellEls[k].classList.add('hint-zone'));step.cells.forEach(k=>cellEls[k].classList.add('hint'));
  hintTimer=setTimeout(()=>cellEls.forEach(e=>e.classList.remove('hint-zone')),1800);
  const b=$('hint-bubble');if(b&&step.text){b.hidden=false;b.dataset.rule=step.rule;$('hint-text').textContent=step.text}}
$('hint-close').onclick=hideHint;
/* --- end difficulty --- */

/* ---------- input ---------- */
const board=$('board');let drag=null,lastTap={k:-1,t:0,prev:null};
const cellAt=(x,y)=>{const el=document.elementFromPoint(x,y)?.closest('.cell');return el&&board.contains(el)?+el.dataset.k:null};
board.addEventListener('pointerdown',e=>{if(done)return;const k=cellAt(e.clientX,e.clientY);if(k==null)return;e.preventDefault();
  board.setPointerCapture(e.pointerId);drag={start:k,last:k,moved:false,paint:cells[k]===0?1:0,snap:false}});
board.addEventListener('pointermove',e=>{if(!drag)return;const k=cellAt(e.clientX,e.clientY);if(k==null||k===drag.last)return;
  if(!drag.moved){drag.moved=true;snapshot();drag.snap=true;startClock();setMark(drag.start,drag.paint)}
  drag.last=k;setMark(k,drag.paint);render()});
board.addEventListener('pointerup',e=>{if(!drag)return;const d=drag;drag=null;if(d.moved){render();return}tap(d.start)});
board.addEventListener('pointercancel',()=>{drag=null});
function tap(k){const now=Date.now();
  if(lastTap.k===k&&now-lastTap.t<330){ // double tap: undo the single-tap mark, then place a cat
    if(lastTap.prev!=null){cells[k]=lastTap.prev;undo.pop()}lastTap={k:-1,t:0,prev:null};placeCat(k);return}
  const prev=cells[k];if(prev===0||prev===1){snapshot();startClock();cells[k]=prev===0?1:0;render();lastTap={k,t:now,prev}}
  else lastTap={k,t:now,prev:null}}
board.addEventListener('keydown',e=>{const el=e.target.closest('.cell');if(!el||done&&!/Arrow/.test(e.key))return;const k=+el.dataset.k,n=P.n;let q=null;
  if(e.key==='ArrowRight')q=k%n<n-1?k+1:k;else if(e.key==='ArrowLeft')q=k%n?k-1:k;else if(e.key==='ArrowDown')q=k+n<n*n?k+n:k;else if(e.key==='ArrowUp')q=k-n>=0?k-n:k;
  else if(e.key===' '||e.key==='x'){e.preventDefault();if(cells[k]<2){snapshot();startClock();cells[k]=cells[k]?0:1;render()}}
  else if(e.key==='Enter'||e.key==='c'){e.preventDefault();placeCat(k)}
  if(q!=null){e.preventDefault();el.tabIndex=-1;cellEls[q].tabIndex=0;cellEls[q].focus()}});

$('undo').onclick=()=>{if(!undo.length||done)return;const prev=undo.pop();cells=cells.map((s,k)=>s===3?3:prev[k]===3?3:prev[k]);render()};
$('hint').onclick=hint;
$('restart').onclick=reset;
$('new').onclick=()=>newPuzzle(mode==='daily'?'8':mode);
document.querySelectorAll('.chip[data-mode]').forEach(ch=>ch.onclick=()=>newPuzzle(ch.dataset.mode));
try{$('autox').checked=store.get('autox',true)}catch(e){}
$('autox').onchange=()=>store.set('autox',$('autox').checked);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&startT){elapsed+=Date.now()-startT;startT=null;clearInterval(timerId);startT=null;window._paused=true}
  else if(!document.hidden&&window._paused&&!done){window._paused=false;startT=Date.now();timerId=setInterval(tick,250)}});

window.NapMap={BEDS,on,emit,newPuzzle,today,keyOf,dateOf,dailySeed,store,fmt,showCard,info,
  get puzzle(){return P},get mode(){return mode},get done(){return done}};
newPuzzle(store.get('mode','daily'));
})();
