/* NapMap cats: on a correct placement the cat slips out from behind its area's furniture, strolls slowly to its spot
   (through its own area's cells where it can), does a big stretch with a yawn, turns a slow circle and curls up into
   the sleeping cat game.js draws (<symbol id="cat">). Hooks in only through NapMap.on('cat') and the DOM.
   The walker wears the same coat: it copies the coat class from the curled cat's svg, so both read the same
   custom properties from css/cats.css. While it is still behind the furniture the sprite sits inside #board between
   the area blocks/cells and the .furn art (same z-index as .furn, earlier in the DOM); once clear it moves above. */
(()=>{
const S=window.NapMap;if(!S)return;
const board=document.getElementById('board');if(!board)return;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const O='#2B2F45',FUR='var(--fur,#F4A259)',ST='var(--st,#D9762B)';
let uid=0;
const walks=new Set();let idle=[];

/* ---------- art: side-view cat facing right, viewBox 72x52, ground at y=45 ---------- */
/* a limb drawn as a fat outlined stroke with an optional paw tip */
const limb=(d,x,y,w=4.4)=>`<path d="${d}" fill="none" stroke-width="${w+3.4}"/><path d="${d}" fill="none" stroke-width="${w}" style="stroke:${FUR}"/>`
  +(x!=null?`<circle cx="${x}" cy="${y}" r="${w/2-.2}" stroke="none" style="fill:var(--paw,none)"/>`:'');
const tail=d=>`<path d="${d}" fill="none" stroke-width="8.6"/><path d="${d}" fill="none" stroke-width="4.6" style="stroke:${FUR}"/>`;
function body(id){return `<ellipse cx="34" cy="29" rx="20" ry="11.5" stroke-width="3" style="fill:${FUR}"/>
<g clip-path="url(#${id}b)" stroke="none">
<ellipse cx="24" cy="22" rx="9" ry="7" style="fill:var(--pa,none)"/>
<ellipse cx="38" cy="37" rx="9" ry="6" style="fill:var(--pb,none)"/>
<ellipse cx="51" cy="34" rx="7" ry="7.5" style="fill:var(--bib,none)"/>
<path d="M24 17.5Q26 23 24 27M31 17Q33.5 23 31 28M38 17.5Q40.5 23 38 27.5" fill="none" stroke-width="2.8" style="stroke:${ST};opacity:var(--sto,1)"/>
</g>
<ellipse cx="34" cy="29" rx="20" ry="11.5" fill="none" stroke-width="3"/>`}
function head(id,yawn){return `<path d="M46.2 14.5L46.6 3.6Q47 2 48.4 3L54 10.5Z" stroke-width="2.6" style="fill:var(--ear,${FUR})"/>
<path d="M56.5 10L62.4 3.4Q63.6 2.4 63.8 4L63.4 15Z" stroke-width="2.6" style="fill:var(--ear,${FUR})"/>
<path d="M48.4 8L48.6 5.4L51.4 9.2ZM58.8 9.2L61.6 6.2L61.6 10.4Z" fill="#F4A3B4" stroke="none" style="opacity:var(--earin,1)"/>
<circle cx="54" cy="20" r="10.5" stroke-width="3" style="fill:${FUR}"/>
<g clip-path="url(#${id}h)" stroke="none">
<ellipse cx="59" cy="23.5" rx="7" ry="6" style="fill:var(--pts,none)"/>
<ellipse cx="50" cy="13" rx="5" ry="4.5" style="fill:var(--pa,none)"/>
<path d="M51 26Q55 22 59 26Q60 31 55 31Q50 31 51 26Z" style="fill:var(--bib,none)"/>
<path d="M52 10.5v3.6M55.4 10v3.8" fill="none" stroke-width="1.8" style="stroke:${ST};opacity:var(--sto,1)"/>
</g>
<circle cx="54" cy="20" r="10.5" fill="none" stroke-width="3"/>`
+(yawn
 ?`<path d="M54.8 18.2L58.6 19.6L55 21.2" fill="none" stroke-width="1.9" style="stroke:var(--eye,${O})"/>
<g class="yawn"><ellipse cx="60.4" cy="25.6" rx="2.7" ry="3.1" fill="#7A2E45" stroke-width="1.4"/><ellipse cx="60.6" cy="27.4" rx="1.6" ry="1.1" fill="#F07A96" stroke="none"/></g>
<path d="M62.8 20.6L65 21.2L63.2 23Z" fill="#F07A96" stroke-width="1" style="stroke:var(--eye,${O})"/>`
 :`<path d="M55.4 19.2Q57.6 21.6 59.8 19.2" fill="none" stroke-width="2" style="stroke:var(--eye,${O})"/>
<ellipse cx="57.4" cy="24.6" rx="2.2" ry="1.4" fill="#F28FA6" stroke="none" opacity=".55"/>
<path d="M62.6 21.4L64.8 22L63 23.8Z" fill="#F07A96" stroke-width="1" style="stroke:var(--eye,${O})"/>`)}
/* walking legs swing from the hip (CSS), each a quarter cycle apart for a slow four-beat walk */
const leg=(x,cls)=>`<g class="leg ${cls}"><rect x="${x}" y="31" width="6.4" height="14" rx="3.2" style="fill:${FUR}" stroke-width="2.4"/>`
  +`<rect x="${x+1.2}" y="40.4" width="4" height="3.4" rx="1.7" stroke="none" style="fill:var(--paw,none)"/></g>`;
function walkerSVG(coat){const id='cw'+(++uid);
  return `<svg class="cw ${coat}" viewBox="0 0 72 52" aria-hidden="true"><defs>
<clipPath id="${id}b"><ellipse cx="34" cy="29" rx="20" ry="11.5"/></clipPath>
<clipPath id="${id}h"><circle cx="54" cy="20" r="10.5"/></clipPath></defs>
<g stroke="${O}" stroke-linejoin="round" stroke-linecap="round">
<g class="pw">
${leg(18,'lh f')}${leg(43,'lf f')}
<g class="sway">
<g class="tail">${tail('M16 27Q3 24 5.5 11Q6.5 4.5 11.5 5.5')}
<path d="M6 15Q6.4 7.4 11.5 5.5" fill="none" stroke-width="4.6" style="stroke:var(--tip,${FUR})"/>
<path d="M8.2 22l4-1.4M5.8 16l4.2-.2" fill="none" stroke-width="2.4" stroke-linecap="butt" style="stroke:${ST};opacity:var(--sto,1)"/></g>
${body(id)}
<g class="nod">${head(id,false)}</g>
</g>
${leg(24,'rh')}${leg(49,'rf')}
</g>
<g class="ps" style="opacity:0">
${limb('M18 27L18.5 44','18.5','44')}${limb('M47 38L64 43.6',64,43.6)}
${tail('M15 22Q6 13 11 4Q13 .8 17 2')}
<path d="M11 4Q13 .8 17 2" fill="none" stroke-width="4.6" style="stroke:var(--tip,${FUR})"/>
${limb('M24 28L25 44',25,44)}
<g transform="translate(0 -2) rotate(20 34 29)">${body(id)}</g>
${limb('M44 40.5L66.5 45',66.5,45)}
<g transform="translate(4 10.5)">${head(id,true)}</g>
</g>
</g></svg>`}

/* ---------- path: from behind the furniture, through the area's own cells, to the spot ---------- */
function plan(P,k,cw,origin){
  const n=P.n,g=P.reg[k],ctr=q=>({x:(q%n+.5)*cw,y:((q/n|0)+.5)*cw}),inA=(r,c)=>r>=0&&c>=0&&r<n&&c<n&&P.reg[r*n+c]===g;
  const furn=board.querySelector(`.furn[data-g="${g}"]`);
  /* the drawn art's box (the furn box letterboxes a square drawing) */
  let art=null;
  if(furn){const fr=furn.getBoundingClientRect();let L=1e9,T=1e9,R=-1e9,B=-1e9;
    furn.querySelectorAll('svg > *').forEach(e=>{const r=e.getBoundingClientRect();if(!r.width&&!r.height)return;
      L=Math.min(L,r.left);T=Math.min(T,r.top);R=Math.max(R,r.right);B=Math.max(B,r.bottom)});
    L=Math.max(L,fr.left);R=Math.min(R,fr.right);T=Math.max(T,fr.top);B=Math.min(B,fr.bottom);
    if(R>L&&B>T)art={l:L-origin.x,r:R-origin.x,t:T-origin.y,b:B-origin.y}}
  const tgt=ctr(k);
  if(!art)return{furn,pts:[{x:tgt.x-cw*.8,y:tgt.y},tgt],art:null,side:1,edge:null};
  /* start: tucked behind the art, on the lowest cell row it covers, so the furniture hides the cat */
  const row=Math.max(0,Math.min(n-1,Math.floor((art.b-cw*.3)/cw))),ax=(art.l+art.r)/2;
  const y0=(row+.5)*cw,c0=Math.max(0,Math.min(n-1,Math.floor(ax/cw)));
  /* come out on the side facing the spot; if the spot is under the art, the side with more of the area */
  const room=s=>{let m=0;for(let c=c0+s;inA(row,c);c+=s)m++;return m};
  let side=tgt.x>art.r?1:tgt.x<art.l?-1:(room(1)>=room(-1)?1:-1);
  /* p0: the whole cat just behind the art's edge; p1: the whole cat just clear of it */
  const half=cw*.68,edge=side>0?art.r:art.l,W=n*cw;
  const p0={x:edge-side*half,y:y0},p1={x:Math.max(cw*.4,Math.min(W-cw*.4,edge+side*half)),y:y0};
  /* BFS over the area's cells from the cell just outside the art to the spot */
  const cellOf=p=>Math.max(0,Math.min(n-1,Math.floor(p.y/cw)))*n+Math.max(0,Math.min(n-1,Math.floor(p.x/cw)));
  let s0=cellOf(p1);
  if(P.reg[s0]!==g){let best=null,bd=1e9;for(let q=0;q<n*n;q++)if(P.reg[q]===g){const c=ctr(q),d=Math.hypot(c.x-p1.x,c.y-p1.y);if(d<bd){bd=d;best=q}}s0=best}
  const prev=new Map([[s0,-1]]),Q=[s0];
  while(Q.length){const q=Q.shift();if(q===k)break;const r=q/n|0,c=q%n;
    for(const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]])if(inA(r+dr,c+dc)){const v=(r+dr)*n+c+dc;if(!prev.has(v)){prev.set(v,q);Q.push(v)}}}
  const route=[];if(prev.has(k))for(let q=k;q!==-1;q=prev.get(q))route.unshift(q);else route.push(k);
  const pts=[p0,p1];
  route.forEach((q,i)=>{const c=ctr(q);if(i===0&&Math.hypot(c.x-p1.x,c.y-p1.y)<cw*.6)return;pts.push(c)});
  /* drop points that double back right next to the exit, and straight-line middles */
  const out=[pts[0]];for(let i=1;i<pts.length;i++){const a=out[out.length-1],b=pts[i];if(Math.hypot(b.x-a.x,b.y-a.y)>1)out.push(b)}
  for(let i=out.length-2;i>=1;i--){const a=out[i-1],b=out[i],c=out[i+1];
    if(Math.abs((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x))<.5&&(b.x-a.x)*(c.x-b.x)+(b.y-a.y)*(c.y-b.y)>0)out.splice(i,1)}
  return{furn,pts:out,art,side,edge}}

/* ---------- animation ---------- */
const smooth=t=>t*t*(3-2*t);
function finish(w,land){if(w.done)return;w.done=true;cancelAnimationFrame(w.raf);w.el.remove();walks.delete(w);
  if(w.furn)w.furn.classList.remove('cat-behind');
  if(w.cell.isConnected){w.cell.classList.remove('cat-arriving');if(!w.landed)S.emit&&S.emit('catLanded',{k:+w.cell.dataset.k})}
  if(!walks.size){const q=idle;idle=[];if(land)q.forEach(f=>{try{f()}catch(e){console.error(e)}})}}
/* still the same cat in the same board? (new puzzle, restart or undo replace or reset the cell) */
const alive=w=>w.cell.isConnected&&w.el.isConnected&&w.cell.dataset.s==='2'&&board.dataset.seed===w.seed;

function walk(k){const P=S.puzzle;if(!P||reduced())return;
  const cell=board.querySelector(`.cell[data-k="${k}"]`),curled=cell&&cell.querySelector('svg');if(!curled)return;
  const n=P.n,br=board.getBoundingClientRect(),origin={x:br.left+board.clientLeft,y:br.top+board.clientTop};
  const cw=board.clientWidth/n;
  const {furn,pts,side,edge}=plan(P,k,cw,origin);
  /* arc-length table for the polyline */
  const seg=[];let L=0;for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);seg.push({a:pts[i-1],b:pts[i],s:L,d});L+=d}
  const at=s=>{for(const g of seg)if(s<=g.s+g.d||g===seg[seg.length-1]){const u=g.d?Math.max(0,Math.min(1,(s-g.s)/g.d)):1;
    return{x:g.a.x+(g.b.x-g.a.x)*u,y:g.a.y+(g.b.y-g.a.y)*u,dx:g.b.x-g.a.x}}return{x:pts[0].x,y:pts[0].y,dx:0}};
  /* languid timing: a slow ease out of hiding, an unhurried stroll, a gentle stop; then stretch, turn and curl */
  const tMove=Math.max(1500,Math.min(1800,1250+L/cw*220)),tStretch=860,tTurn=560,tFade=300,T=tMove+tStretch+tTurn+tFade;
  const acc=Math.min(700,tMove*.4),dec=Math.min(520,tMove*.3),vmax=L/(tMove-acc/2-dec/2);
  const dist=t=>t<acc?vmax*t*t/(2*acc):t<tMove-dec?vmax*(t-acc/2):L-vmax*(tMove-t)*(tMove-t)/(2*dec);
  const coat=(curled.getAttribute('class')||'').split(/\s+/).filter(s=>s.startsWith('coat-')).join(' ');
  const el=document.createElement('div');el.className='cat-walker behind';
  const W=cw*1.3;el.style.width=W+'px';el.style.height=W*52/72+'px';
  el.innerHTML=`<div class="cw-face">${walkerSVG(coat)}</div>`;
  const face=el.firstChild,svg=face.firstChild,pw=svg.querySelector('.pw'),ps=svg.querySelector('.ps');
  svg.classList.add('walking');
  cell.classList.add('cat-arriving');if(furn)furn.classList.add('cat-behind');
  board.insertBefore(el,board.querySelector('.furn'));
  const w={el,cell,furn,seed:board.dataset.seed,done:false,raf:0,landed:false};walks.add(w);
  const tgt=pts[pts.length-1];
  let dir=pts.length>1&&pts[1].x<pts[0].x?-1:1,flip=dir,lastT=0;
  /* while behind, only the part of the cat past the art's edge shows, so it peeks out head first even where the
     drawing is thin or see-through; once the whole cat is past the edge it moves above everything */
  let behind=edge!=null;if(!behind)el.classList.remove('behind');
  const t0=performance.now();
  const frame=now=>{if(w.done)return;if(!alive(w)){finish(w,w.cell.isConnected&&board.dataset.seed===w.seed);return}
    const t=now-t0,dt=Math.min(64,t-lastT);lastT=t;let x,y,sc=1,op=1,rot=0,stretch=0;
    if(t<tMove){const p=at(dist(t));x=p.x;y=p.y;if(Math.abs(p.dx)>1)dir=Math.sign(p.dx);
      op=Math.min(1,t/160)}
    else{if(svg.classList.contains('walking'))svg.classList.remove('walking');x=tgt.x;y=tgt.y;
      const u=t-tMove;
      if(u<tStretch){/* ease down into the stretch, hold with a yawn, ease back up */
        const p=u/tStretch;stretch=p<.22?smooth(p/.22):p<.8?1:1-smooth((p-.8)/.2);
        svg.style.setProperty('--yawn',p<.25?0:p<.78?Math.sin((p-.25)/.53*Math.PI):0)}
      else if(u<tStretch+tTurn){/* a slow turn on the spot, the sprite swinging round once */
        const p=smooth((u-tStretch)/tTurn),a=p*Math.PI*2;dir=w.dir0||(w.dir0=dir);
        x=tgt.x+Math.sin(a)*cw*.09*dir;y=tgt.y-Math.sin(a/2)*cw*.05;sc=1-.14*p}
      else{const p=Math.min(1,(u-tStretch-tTurn)/tFade);sc=.86-.16*p;y=tgt.y+cw*.04*p;op=1-smooth(p);
        if(!w.landed){w.landed=true;cell.classList.remove('cat-arriving');if(furn)furn.classList.remove('cat-behind');
          S.emit&&S.emit('catLanded',{k:+cell.dataset.k})}}}
    /* heading: during the turn it is driven by the angle, otherwise it swings smoothly toward the direction of travel */
    const u=t-tMove;
    if(u>=tStretch&&u<tStretch+tTurn){const a=smooth((u-tStretch)/tTurn)*Math.PI*2;flip=dir*Math.cos(a)}
    else{const step=dt/200*2;flip+=Math.max(-step,Math.min(step,dir-flip))}
    let fx=flip;const m=Math.abs(fx);if(m<.36)fx=(fx<0?-1:1)*(.36+.1*(.36-m));
    if(behind){const s1=sc*(1-.05*(1-m)),past=side*(x-edge)/s1;
      if(past>=W/2||t>=tMove){behind=false;el.classList.remove('behind');el.style.clipPath='';board.appendChild(el)}
      else{const cut=Math.max(0,Math.min(W,W/2-past));el.style.clipPath=side>0?`inset(-20% -20% -20% ${cut}px)`:`inset(-20% ${cut}px -20% -20%)`}}
    /* the pose swaps crisply (a short CSS fade) while the reach itself eases: a long low stretch, then back up */
    const st=stretch>.35?1:0;if(st!==w.st){w.st=st;pw.style.opacity=1-st;ps.style.opacity=st}
    el.style.transform=`translate(${x}px,${y}px) translate(-50%,-66%) rotate(${rot}deg) scale(${sc*(1-.05*(1-m))*(1+.08*stretch)},${sc*(1-.05*(1-m))*(1-.05*stretch)})`;el.style.opacity=op;
    face.style.transform=`scaleX(${fx})`;
    if(t>=T){finish(w,true);return}
    w.raf=requestAnimationFrame(frame)};
  frame(t0)}

S.on('cat',d=>walk(d.k));
S.on('newPuzzle',()=>{idle=[];[...walks].forEach(w=>finish(w))});
/* polish.js waits on this so the win hop starts once the last cat has curled up */
window.NapMapCats={walkerSVG,get busy(){return walks.size>0},whenIdle(f){walks.size?idle.push(f):f()}};
})();
