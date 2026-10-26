/* NapMap polish: Web Audio sound effects + mute toggle, 10x10 sizing hook, win celebration.
   Hooks in only through window.NapMap (event bus, store, puzzle) and the DOM; game.js is untouched. */
(()=>{
const S=window.NapMap;if(!S)return;
const $=id=>document.getElementById(id);
const board=$('board'),wrap=board&&board.closest('.board-wrap');
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- sound ---------- */
let ctx=null,master=null,soundOn=S.store.get('sound',true)!==false;
function ensureCtx(){
  if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    try{ctx=new AC();master=ctx.createGain();master.gain.value=.7;master.connect(ctx.destination)}catch(e){ctx=null;return}}
  if(ctx.state==='suspended')ctx.resume().catch(()=>{})}
['pointerdown','touchend','keydown','click'].forEach(t=>document.addEventListener(t,ensureCtx,{capture:true,passive:true}));
const ready=()=>soundOn&&ctx&&ctx.state==='running';

/* one enveloped oscillator; f0 -> f1 glide over dur seconds */
function tone({type='sine',f0,f1=f0,dur=.12,vol=.08,at=0,attack=.006}){
  const t=ctx.currentTime+at,o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(f0,t);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+dur*.8);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.02)}
const sfx={
  chirp(){tone({f0:880,f1:1400,dur:.11,vol:.07});tone({f0:1320,f1:1760,dur:.09,vol:.04,at:.06})},
  bonk(){tone({f0:180,f1:85,dur:.2,vol:.12,attack:.004});tone({type:'triangle',f0:120,f1:70,dur:.16,vol:.05})},
  tick(){tone({type:'triangle',f0:1900+Math.random()*300,dur:.03,vol:.025,attack:.002})},
  win(){[523.25,659.25,783.99,1046.5].forEach((f,i)=>tone({type:'triangle',f0:f,dur:.32,vol:.06,at:.15+i*.09}));
    tone({f0:1567.98,dur:.5,vol:.03,at:.15+4*.09})},
  /* zoomies (js/cats.js): a soft scramble of paw ticks over a short rising whoosh */
  zoomies(){for(let i=0;i<9;i++)tone({type:'triangle',f0:1500+Math.random()*700,dur:.025,vol:.018,attack:.002,at:i*.045+Math.random()*.02});
    tone({f0:260,f1:900,dur:.38,vol:.025,attack:.06,at:.05})}
};
const play=name=>{if(ready())try{sfx[name]()}catch(e){}};
window.NapMapSound={play};

/* crossed-out ticks: watch cells flip from empty (0) to crossed (1); rate-limited, and muted
   right after a cat or win, when auto-cross / the win sweep flips many cells at once */
let lastTick=0,quietUntil=0;
const TICK_GAP=70;
if(board)new MutationObserver(list=>{
  const now=performance.now();if(now<quietUntil||now-lastTick<TICK_GAP)return;
  if(list.some(m=>m.oldValue==='0'&&m.target.dataset.s==='1')){lastTick=now;play('tick')}
}).observe(board,{subtree:true,attributes:true,attributeFilter:['data-s'],attributeOldValue:true});

S.on('cat',()=>{quietUntil=performance.now()+150;play('chirp')});
S.on('wrong',()=>play('bonk'));
S.on('win',()=>{quietUntil=performance.now()+300;play('win')});

/* mute toggle in the header */
const ICON_ON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" stroke-width="1.6"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
const ICON_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" stroke-width="1.6"/><path d="M17 9.5l5 5M22 9.5l-5 5"/></svg>';
const muteBtn=$('sound');
function syncMute(){if(!muteBtn)return;muteBtn.setAttribute('aria-pressed',String(soundOn));muteBtn.innerHTML=soundOn?ICON_ON:ICON_OFF;
  muteBtn.title=soundOn?'Sound on':'Sound off'}
if(muteBtn){syncMute();muteBtn.addEventListener('click',()=>{soundOn=!soundOn;S.store.set('sound',soundOn);syncMute();
  if(soundOn){ensureCtx();setTimeout(()=>play('chirp'),30)}})}

/* ---------- board size hook (10x10 sizing in polish.css) ---------- */
const setN=()=>{if(wrap&&S.puzzle)wrap.dataset.n=S.puzzle.n};
setN();

/* ---------- win celebration ---------- */
let celebrateTimer=0;
function clearCelebration(){clearTimeout(celebrateTimer);if(!wrap)return;wrap.classList.remove('sp-celebrate');
  wrap.querySelectorAll('.sp-burst').forEach(e=>e.remove())}
S.on('newPuzzle',()=>{setN();clearCelebration()});

function celebrate(){
  if(!wrap||reduced()||!wrap.classList.contains('sp-celebrate'))return;
  wrap.querySelectorAll('.sp-burst').forEach(e=>e.remove());
  const n=S.puzzle.n,step=Math.min(80,560/n);
  /* staggered hop, row order; class goes on each cat's svg so later re-renders start clean */
  board.querySelectorAll('.cell.cat').forEach(cell=>{const svg=cell.querySelector('svg');if(!svg)return;
    const r=(+cell.dataset.k)/n|0;svg.style.setProperty('--sp-delay',(r*step)+'ms');
    svg.classList.remove('sp-hop');void svg.getBoundingClientRect();svg.classList.add('sp-hop')});
  /* burst layer: sits between the board and the overlay, so it stays behind the win card */
  const layer=document.createElement('div');layer.className='sp-burst';layer.setAttribute('aria-hidden','true');
  /* dreamy drift: a soft glow, then sleepy z's, little stars and crescent moons float up across the board,
     biased to the edges so they read around the win card */
  let h='<div class="sp-glow"></div>';
  const W=wrap.clientWidth||320,kinds=['z','star','moon','star','z','star'],count=18;
  for(let i=0;i<count;i++){const kind=kinds[i%kinds.length],
      side=i%2?1:-1,x=side*W*(.18+Math.random()*.27),   /* start offset from center, left/right alternating */
      y=W*(.05+Math.random()*.35),                        /* start below center */
      dx=(Math.random()-.5)*W*.16,                        /* sideways sway */
      dy=W*(.38+Math.random()*.25),                       /* rise */
      rot=((Math.random()-.5)*50).toFixed(0)+'deg',
      delay=(i*45+Math.random()*60)|0,
      c=kind==='z'?'var(--ink)':'var(--sun)',
      sz=kind==='z'?(16+Math.random()*10):kind==='moon'?(13+Math.random()*6):(9+Math.random()*7);
    h+=`<i class="sp-float sp-${kind}" style="--x:${x.toFixed(1)}px;--y:${y.toFixed(1)}px;--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px;--rot:${rot};--c:${c};--s:${sz.toFixed(1)}px;--sd:${delay}ms">${kind==='z'?'z':''}</i>`}
  layer.innerHTML=h;
  const ov=$('overlay');wrap.insertBefore(layer,ov&&ov.parentNode===wrap?ov:null);
  celebrateTimer=setTimeout(()=>{wrap.classList.remove('sp-celebrate');setTimeout(()=>layer.remove(),600)},1700);
}
/* the tint class goes on in the same task as the win card appears, so the card never flashes dark first */
/* js/cats.js walks the last cat in; the hop waits until it has curled up */
S.on('win',()=>{if(!wrap||reduced())return;clearCelebration();wrap.classList.add('sp-celebrate');
  const go=()=>requestAnimationFrame(celebrate);window.NapMapCats?window.NapMapCats.whenIdle(go):go()});
})();
