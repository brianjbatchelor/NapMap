/* NapMap cats: on a correct placement the cat walks in from the nearest side of its row, hops onto its spot,
   turns a quick circle and curls up (the curled <symbol id="cat"> drawn by game.js). Hooks in only through
   NapMap.on('cat') and the DOM. The walker wears the same coat: it copies the coat class game.js put on the
   curled cat's svg, so both read the same custom properties from css/cats.css. */
(()=>{
const S=window.NapMap;if(!S)return;
const board=document.getElementById('board'),wrap=board&&board.closest('.board-wrap');if(!wrap)return;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const O='#2B2F45';
let layer=null,uid=0;
const walks=new Set();let idle=[];
function getLayer(){if(layer&&layer.isConnected)return layer;
  layer=document.createElement('div');layer.className='cat-walk-layer';layer.setAttribute('aria-hidden','true');
  const ov=document.getElementById('overlay');wrap.insertBefore(layer,ov&&ov.parentNode===wrap?ov:null);return layer}

/* side-view walking cat facing right, viewBox 72x52; legs and body bob are CSS-animated while .walking */
function walkerSVG(coat){const id='cw'+(++uid);
  const leg=(x,far)=>`<g class="leg${far?' far':''}"><rect x="${x}" y="31" width="6.4" height="14" rx="3.2" style="fill:var(--fur,#F4A259)" stroke="${O}" stroke-width="2.4"/>`
    +`<rect x="${x+1.2}" y="40.4" width="4" height="3.4" rx="1.7" style="fill:var(--paw,none)"/></g>`;
  return `<svg class="cw ${coat}" viewBox="0 0 72 52" aria-hidden="true"><defs>
<clipPath id="${id}b"><ellipse cx="34" cy="29" rx="20" ry="11.5"/></clipPath>
<clipPath id="${id}h"><circle cx="54" cy="20" r="10.5"/></clipPath></defs>
<g stroke="${O}" stroke-linejoin="round" stroke-linecap="round">
${leg(18,1)}${leg(43,1)}
<g class="bodyg">
<path d="M16 27Q4 22 6.5 9Q7.5 4.5 11 6.5" fill="none" stroke-width="8.6"/>
<path d="M16 27Q4 22 6.5 9Q7.5 4.5 11 6.5" fill="none" stroke-width="4.6" style="stroke:var(--fur,#F4A259)"/>
<path d="M6.8 12Q7 6 10 6.2" fill="none" stroke-width="4.6" style="stroke:var(--tip,var(--fur,#F4A259))"/>
<path d="M8 21.5l4-1.6M5.8 15.5l4.2-.4" fill="none" stroke-width="2.4" stroke-linecap="butt" style="stroke:var(--st,#D9762B);opacity:var(--sto,1)"/>
<ellipse cx="34" cy="29" rx="20" ry="11.5" stroke-width="3" style="fill:var(--fur,#F4A259)"/>
<g clip-path="url(#${id}b)" stroke="none">
<ellipse cx="24" cy="22" rx="9" ry="7" style="fill:var(--pa,none)"/>
<ellipse cx="38" cy="37" rx="9" ry="6" style="fill:var(--pb,none)"/>
<ellipse cx="51" cy="34" rx="7" ry="7.5" style="fill:var(--bib,none)"/>
<path d="M24 17.5Q26 23 24 27M31 17Q33.5 23 31 28M38 17.5Q40.5 23 38 27.5" fill="none" stroke-width="2.8" style="stroke:var(--st,#D9762B);opacity:var(--sto,1)"/>
</g>
<ellipse cx="34" cy="29" rx="20" ry="11.5" fill="none" stroke-width="3"/>
<path d="M46.2 14.5L46.6 3.6Q47 2 48.4 3L54 10.5Z" stroke-width="2.6" style="fill:var(--ear,var(--fur,#F4A259))"/>
<path d="M56.5 10L62.4 3.4Q63.6 2.4 63.8 4L63.4 15Z" stroke-width="2.6" style="fill:var(--ear,var(--fur,#F4A259))"/>
<path d="M48.4 8L48.6 5.4L51.4 9.2ZM58.8 9.2L61.6 6.2L61.6 10.4Z" fill="#F4A3B4" stroke="none" style="opacity:var(--earin,1)"/>
<circle cx="54" cy="20" r="10.5" stroke-width="3" style="fill:var(--fur,#F4A259)"/>
<g clip-path="url(#${id}h)" stroke="none">
<ellipse cx="59" cy="23.5" rx="7" ry="6" style="fill:var(--pts,none)"/>
<ellipse cx="50" cy="13" rx="5" ry="4.5" style="fill:var(--pa,none)"/>
<path d="M51 26Q55 22 59 26Q60 31 55 31Q50 31 51 26Z" style="fill:var(--bib,none)"/>
<path d="M52 10.5v3.6M55.4 10v3.8" fill="none" stroke-width="1.8" style="stroke:var(--st,#D9762B);opacity:var(--sto,1)"/>
</g>
<circle cx="54" cy="20" r="10.5" fill="none" stroke-width="3"/>
<path d="M55.4 19.2Q57.6 21.6 59.8 19.2" fill="none" stroke-width="2" style="stroke:var(--eye,${O})"/>
<ellipse cx="57.4" cy="24.6" rx="2.2" ry="1.4" fill="#F28FA6" stroke="none" opacity=".55"/>
<path d="M62.6 21.4L64.8 22L63 23.8Z" fill="#F07A96" stroke-width="1" style="stroke:var(--eye,${O})"/>
</g>
${leg(24,0)}${leg(49,0)}
</g></svg>`}

const ease=t=>t<.5?2*t*t:1-2*(1-t)*(1-t);
function finish(w,land){if(w.done)return;w.done=true;cancelAnimationFrame(w.raf);w.el.remove();walks.delete(w);
  if(w.cell.isConnected){w.cell.classList.remove('cat-arriving');S.emit&&S.emit('catLanded',{k:+w.cell.dataset.k})}
  if(!walks.size){const q=idle;idle=[];if(land)q.forEach(f=>{try{f()}catch(e){console.error(e)}})}}
/* still the same cat in the same board? (new puzzle, restart or undo replace or reset the cell) */
const alive=w=>w.cell.isConnected&&w.cell.dataset.s==='2'&&board.dataset.seed===w.seed;

function walk(k){const P=S.puzzle;if(!P||reduced())return;
  const cell=board.querySelector(`.cell[data-k="${k}"]`),curled=cell&&cell.querySelector('svg');if(!curled)return;
  const n=P.n,c=k%n,wr=wrap.getBoundingClientRect(),cr=cell.getBoundingClientRect(),br=board.getBoundingClientRect();
  const cw=cr.width,fromLeft=c<n/2,dir=fromLeft?1:-1;
  const tx=cr.left-wr.left+cw/2,ty=cr.top-wr.top+cw/2;
  const sx=fromLeft?br.left-wr.left-cw*.55:br.right-wr.left+cw*.55;  /* just off the board's edge */
  const hopLen=Math.min(cw*.75,Math.abs(tx-sx)*.5),wx=tx-dir*hopLen;
  const cells=Math.abs(wx-sx)/cw;
  const tWalk=Math.max(200,Math.min(400,120+cells*55)),tHop=150,tTurn=230,tFade=140,T=tWalk+tHop+tTurn+tFade;
  const coat=(curled.getAttribute('class')||'').split(/\s+/).filter(s=>s.startsWith('coat-')).join(' ');
  const el=document.createElement('div');el.className='cat-walker';
  el.style.width=cw*1.18+'px';el.style.height=cw*1.18*52/72+'px';
  el.innerHTML=`<div class="cw-face">${walkerSVG(coat)}</div>`;
  const face=el.firstChild,svg=face.firstChild;svg.classList.add('walking');
  cell.classList.add('cat-arriving');getLayer().appendChild(el);
  const w={el,cell,seed:board.dataset.seed,done:false,raf:0};walks.add(w);
  const t0=performance.now();let landed=false;
  const frame=now=>{if(w.done)return;if(!alive(w)){finish(w,!w.cell.isConnected?false:board.dataset.seed===w.seed);return}
    const t=now-t0;let x,y,flip=dir,sc=1,op=1,rot=0;
    if(t<tWalk){const p=t/tWalk;x=sx+(wx-sx)*(p*.92+.08*ease(p));y=ty}
    else if(t<tWalk+tHop){if(svg.classList.contains('walking'))svg.classList.remove('walking');
      const p=(t-tWalk)/tHop;x=wx+(tx-wx)*p;y=ty-Math.sin(p*Math.PI)*cw*.42;rot=-dir*(12-24*p)}
    else if(t<tWalk+tHop+tTurn){const p=(t-tWalk-tHop)/tTurn,a=p*Math.PI*2;
      /* a quick turn on the spot: the side-on sprite swings around once, trotting a tiny circle */
      x=tx+Math.sin(a)*cw*.1*dir;y=ty-Math.sin(a/2)*cw*.06;flip=dir*Math.cos(a);sc=1-.12*p;
      const m=Math.abs(flip);if(m<.42)flip=(flip<0?-1:1)*(.42+.1*(.42-m));sc*=1-.08*(1-m)}
    else{const p=Math.min(1,(t-tWalk-tHop-tTurn)/tFade);x=tx;y=ty+cw*.04*p;sc=.88-.2*p;op=1-p;
      if(!landed){landed=true;cell.classList.remove('cat-arriving');S.emit&&S.emit('catLanded',{k:+cell.dataset.k})}}
    el.style.transform=`translate(${x}px,${y}px) translate(-50%,-62%) rotate(${rot}deg) scale(${sc})`;el.style.opacity=op;
    face.style.transform=`scaleX(${flip})`;
    if(t>=T){finish(w,true);return}
    w.raf=requestAnimationFrame(frame)};
  frame(t0)}

S.on('cat',d=>walk(d.k));
S.on('newPuzzle',()=>{idle=[];[...walks].forEach(w=>finish(w))});
/* polish.js waits on this so the win hop starts once the last cat has curled up */
window.NapMapCats={walkerSVG,get busy(){return walks.size>0},whenIdle(f){walks.size?idle.push(f):f()}};
})();
