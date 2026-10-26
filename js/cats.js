/* NapMap cats: on a correct placement the cat slips out from behind its area's furniture, strolls slowly to its spot
   (through its own area's cells where it can), does a big stretch with a yawn, turns a slow circle and curls up into
   the sleeping cat game.js draws (<symbol id="cat">). Hooks in only through NapMap.on('cat') and the DOM.
   The walker wears the same coat: it copies the coat class from the curled cat's svg, so both read the same
   custom properties from css/cats.css. While it is still behind the furniture the sprite sits inside #board between
   the area blocks/cells and the .furn art (same z-index as .furn, earlier in the DOM); once clear it moves above. */
/* ---------- entrance path (pure; runs in Node for tests/cats-path.test.js) ----------
   The board is seen from the side: rows are floors. The cat comes out from behind its area's furniture on the
   furniture's base row (the bottom row of the rect the art stands in), then may only walk left/right within its
   area or jump up one row into its area; it hops down only when the spot is below the base row. Its route is a
   shortest ("direct") legal route from its start; of the two starts (left or right edge of the art) it takes the
   one that makes the trip longest. Preferences: no back-to-back jumps, no walking back past the art it came out
   from, then the longest trip, then walk first and jump later. */
const CatPath=(()=>{
const H=new Set(['L','R']);
/* start cells on the base row: just outside the art's left/right edge if that cell is in the area, else the edge
   cell under the art. artL/artR are the drawn art's left/right edges in column units. */
function starts(n,reg,g,rect,artL,artR){const R=rect.r0+rect.h-1,inA=c=>c>=0&&c<n&&reg[R*n+c]===g;
  if(artL==null)artL=rect.c0;if(artR==null)artR=rect.c0+rect.w;
  const lc=inA(Math.ceil(artL-1e-6)-1)?Math.ceil(artL-1e-6)-1:Math.max(rect.c0,Math.floor(artL+1e-6));
  const rc=inA(Math.floor(artR+1e-6))?Math.floor(artR+1e-6):Math.min(rect.c0+rect.w-1,Math.ceil(artR-1e-6)-1);
  return[{side:-1,row:R,col:lc,edge:artL},{side:1,row:R,col:rc,edge:artR}]}
const scoreLess=(a,b)=>a.consec!==b.consec?a.consec<b.consec:a.back!==b.back?a.back<b.back:a.late!==b.late?a.late>b.late:a.moves<b.moves;
/* best shortest route from cell `from` to `to`; null if unreachable with these moves */
function route(n,reg,g,from,to,allowDown,side=0){
  const inA=q=>q>=0&&q<n*n&&reg[q]===g;
  const preds=x=>{const r=x/n|0,c=x%n,o=[];
    if(c>0&&inA(x-1))o.push(x-1);if(c<n-1&&inA(x+1))o.push(x+1);   /* walked in from the side */
    if(inA(x+n))o.push(x+n);                                        /* jumped up from below */
    if(allowDown&&inA(x-n))o.push(x-n);return o};                   /* hopped down from above */
  const dist=new Map([[to,0]]),Q=[to];
  while(Q.length){const x=Q.shift();for(const u of preds(x))if(!dist.has(u)){dist.set(u,dist.get(x)+1);Q.push(u)}}
  if(!dist.has(from))return null;
  const D=dist.get(from),memo=new Map();
  const nexts=u=>{const r=u/n|0,c=u%n,o=[];
    if(c>0&&inA(u-1))o.push([u-1,'L']);if(c<n-1&&inA(u+1))o.push([u+1,'R']);if(inA(u-n))o.push([u-n,'U']);
    if(allowDown&&inA(u+n))o.push([u+n,'D']);return o.filter(([v])=>dist.get(v)===dist.get(u)-1)};
  /* DP over (cell, last move vertical, still on the start floor): fewest back-to-back jumps, then fewest steps back
     toward the furniture before the first jump (walking back past the art it just came out from reads as dithering),
     then the latest jumps (walk first), then lexicographic */
  const back=m=>side&&(m==='L'?-1:m==='R'?1:0)===-side?1:0;
  const best=(u,lastV,onStart)=>{if(u===to)return{consec:0,back:0,late:0,moves:''};const key=u*4+(lastV?1:0)+(onStart?2:0);if(memo.has(key))return memo.get(key);
    const i=D-dist.get(u);let b=null;
    for(const [v,m] of nexts(u)){const vert=!H.has(m),sub=best(v,vert,onStart&&!vert);
      const cand={consec:sub.consec+(vert&&lastV?1:0),back:sub.back+(onStart&&!vert?back(m):0),late:sub.late+(vert?i:0),moves:m+sub.moves};if(!b||scoreLess(cand,b))b=cand}
    memo.set(key,b);return b};
  const r=best(from,false,true),cells=[from];let q=from;
  for(const m of r.moves){q+=m==='L'?-1:m==='R'?1:m==='U'?-n:n;cells.push(q)}
  return{cells,moves:r.moves.split(''),consec:r.consec,back:r.back,late:r.late,len:r.moves.length}}
/* the whole plan: pick the start and its route */
function plan(n,reg,g,rect,target,artL,artR){
  const st=starts(n,reg,g,rect,artL,artR),R=rect.r0+rect.h-1,below=(target/n|0)>R;let pick=null;
  /* among the starts: legal without hops down first, then fewest back-to-back jumps, then no walking back past the
     art, then the LONGEST direct trip, then walk-first; left wins a full tie */
  for(const s of st){const from=s.row*n+s.col;let r=route(n,reg,g,from,target,below,s.side),fb=false;
    if(!r){r=route(n,reg,g,from,target,true,s.side);fb=true}if(!r)continue;
    const c={start:s,...r,fallback:fb};
    const better=!pick||(c.fallback!==pick.fallback?!c.fallback:c.consec!==pick.consec?c.consec<pick.consec:
      c.back!==pick.back?c.back<pick.back:c.len!==pick.len?c.len>pick.len:c.late!==pick.late?c.late>pick.late:false);
    if(better)pick=c}
  return pick}
/* ---------- timeline ----------
   phases in cell units (x = column position of the cat's middle, row = the floor it stands on).
   Languid walk; each jump ~0.42s with a short landing beat between back-to-back jumps; the stretch, turn and
   curl are never sped up. The whole entrance is capped at CAP ms by speeding up the walking just enough
   (and, only if walking alone cannot make room, the jumps down to a floor). */
const T={perCell:620,ease:220,jump:420,drop:320,beat:150,turnBeat:260,stretch:860,turn:560,fade:300,CAP:6000,minJump:260,minWalk:.3};
const tail=()=>T.stretch+T.turn+T.fade;
function schedule(n,pl,half=.65){const s=pl.start,ph=[];let x=s.edge-s.side*half,row=s.row,face=s.side;
  /* a walk; if it heads the other way from where the cat faces, it first turns round on the spot */
  const run=(to)=>{const d=Math.abs(to-x);if(d>1e-6){const dir=Math.sign(to-x);
    if(dir!==face){ph.push({type:'turn',x0:x,row,dur:T.turnBeat,from:face,to:dir});face=dir}
    ph.push({type:'walk',x0:x,x1:to,row,d,dur:d*T.perCell+T.ease});x=to}};
  let target=s.col+.5,i=0,prevV=false;
  for(const m of pl.moves){
    if(H.has(m)){target+=m==='R'?1:-1;prevV=false;continue}
    run(target);if(prevV)ph.push({type:'beat',x0:x,row,dur:T.beat});
    const r1=m==='U'?row-1:row+1;ph.push({type:m==='U'?'jump':'drop',x0:x,row0:row,row1:r1,dur:m==='U'?T.jump:T.drop});row=r1;prevV=true}
  run(target);
  /* cap */
  const budget=T.CAP-tail(),walkT=ph.filter(p=>p.type==='walk').reduce((a,p)=>a+p.dur,0),otherT=ph.reduce((a,p)=>a+(p.type==='walk'?0:p.dur),0);
  let wf=1,jf=1;
  /* walking gives way first (down to a brisk trot), then jumps and beats shrink toward a quick hop, and if a huge
     route still overflows, walking takes whatever is left, so the total always fits */
  if(walkT+otherT>budget){wf=Math.max(T.minWalk,(budget-otherT)/walkT);
    if(walkT*wf+otherT>budget){jf=Math.max(T.minJump/T.jump,(budget-walkT*wf)/otherT);
      if(walkT*wf+otherT*jf>budget)wf=Math.max(.05,(budget-otherT*jf)/walkT)}}
  ph.forEach(p=>{p.dur*=p.type==='walk'?wf:jf});
  const move=ph.reduce((a,p)=>a+p.dur,0);
  return{phases:ph,move,total:move+tail(),walkFactor:wf,jumpFactor:jf,end:{x,row}}}
return{starts,route,plan,schedule,T,tail}})();
if(typeof module!=='undefined'&&module.exports)module.exports=CatPath;

(()=>{
if(typeof window==="undefined")return;
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
+(yawn?'':`<g class="eye-w"><ellipse cx="57.6" cy="19.4" rx="2.5" ry="3" fill="#FFFFFF" stroke-width="1.6"/><circle cx="58.3" cy="19.6" r="1.4" fill="${O}" stroke="none"/></g>`)
+(yawn
 ?`<path d="M54.8 18.2L58.6 19.6L55 21.2" fill="none" stroke-width="1.9" style="stroke:var(--eye,${O})"/>
<g class="yawn"><ellipse cx="60.4" cy="25.6" rx="2.7" ry="3.1" fill="#7A2E45" stroke-width="1.4"/><ellipse cx="60.6" cy="27.4" rx="1.6" ry="1.1" fill="#F07A96" stroke="none"/></g>
<path d="M62.8 20.6L65 21.2L63.2 23Z" fill="#F07A96" stroke-width="1" style="stroke:var(--eye,${O})"/>`
 :`<path class="eye-c" d="M55.4 19.2Q57.6 21.6 59.8 19.2" fill="none" stroke-width="2" style="stroke:var(--eye,${O})"/>
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

/* ---------- animation ---------- */
const smooth=t=>t*t*(3-2*t);
function finish(w,land){if(w.done)return;w.done=true;cancelAnimationFrame(w.raf);w.el.remove();walks.delete(w);
  if(w.furn)w.furn.classList.remove('cat-behind');
  if(w.cell.isConnected){w.cell.classList.remove('cat-arriving');if(!w.landed)S.emit&&S.emit('catLanded',{k:+w.cell.dataset.k})}
  if(!walks.size){const q=idle;idle=[];if(land)q.forEach(f=>{try{f()}catch(e){console.error(e)}})}}
/* still the same cat in the same board? (new puzzle, restart or undo replace or reset the cell) */
const alive=w=>w.cell.isConnected&&w.el.isConnected&&w.cell.dataset.s==='2'&&board.dataset.seed===w.seed;

/* the drawn art's left/right edges in board px (the .furn box letterboxes a square drawing) */
function artBox(furn,origin){if(!furn)return null;const fr=furn.getBoundingClientRect();let L=1e9,T=1e9,R=-1e9,B=-1e9;
  furn.querySelectorAll('svg > *').forEach(e=>{const r=e.getBoundingClientRect();if(!r.width&&!r.height)return;
    L=Math.min(L,r.left);T=Math.min(T,r.top);R=Math.max(R,r.right);B=Math.max(B,r.bottom)});
  L=Math.max(L,fr.left);R=Math.min(R,fr.right);T=Math.max(T,fr.top);B=Math.min(B,fr.bottom);
  return R>L&&B>T?{l:L-origin.x,r:R-origin.x,t:T-origin.y,b:B-origin.y}:null}
const furnRect=(P,g)=>{const A=window.NapMapArt;if(!A)return null;
  return(P.style==='cozy'||P.style==='boxy')&&A.innerRect?A.innerRect(P,g):A.bestRect?A.bestRect(P,g):null};

const HALF=.62*1.3/2+.2;   /* cat half-width in cells, plus a little so it starts fully hidden */
/* the plan and timeline for a cat at k on the current board (also handy from the console and tests) */
function planFor(k){const P=S.puzzle;if(!P)return null;const n=P.n,g=P.reg[k];
  const br=board.getBoundingClientRect(),origin={x:br.left+board.clientLeft,y:br.top+board.clientTop};
  const cw=board.clientWidth/n,furn=board.querySelector(`.furn[data-g="${g}"]`),rect=furnRect(P,g),art=artBox(furn,origin);
  const pl=rect&&CatPath.plan(n,P.reg,g,rect,k,art?art.l/cw:null,art?art.r/cw:null);
  return{n,g,cw,furn,pl,sch:pl?CatPath.schedule(n,pl,HALF):null}}
function walk(k){const P=S.puzzle;if(!P||reduced())return;
  const cell=board.querySelector(`.cell[data-k="${k}"]`),curled=cell&&cell.querySelector('svg');if(!curled)return;
  const {n,cw,furn,pl,sch:sch0}=planFor(k),W=cw*1.3;
  let sch=sch0,side=1,edge=null;
  if(pl){side=pl.start.side;edge=pl.start.edge*cw}
  else{/* no furniture rect: the old direct stroll in from the left on the spot's own row */
    const r=k/n|0,c=k%n;sch={phases:[{type:'walk',x0:c-.4,x1:c+.5,row:r,dur:900}],move:900,end:{x:c+.5,row:r}};sch.total=sch.move+CatPath.tail()}
  const ph=sch.phases;let acc=0;ph.forEach(p=>{p.t0=acc;acc+=p.dur});
  const tMove=sch.move,{stretch:tStretch,turn:tTurn,fade:tFade}=CatPath.T,T=tMove+tStretch+tTurn+tFade;
  /* the floor of a row: the cat's feet sit a little above the cell's bottom edge (above the room blocks' padding) */
  const floorY=r=>(r+1)*cw-cw*.12,tgtX=(k%n+.5)*cw,tgtY=floorY(k/n|0);
  const coat=(curled.getAttribute('class')||'').split(/\s+/).filter(s=>s.startsWith('coat-')).join(' ');
  const el=document.createElement('div');el.className='cat-walker behind';
  el.style.width=W+'px';el.style.height=W*52/72+'px';
  el.innerHTML=`<div class="cw-face">${walkerSVG(coat)}</div>`;
  const face=el.firstChild,svg=face.firstChild,pw=svg.querySelector('.pw'),ps=svg.querySelector('.ps');
  cell.classList.add('cat-arriving');if(furn&&edge!=null)furn.classList.add('cat-behind');
  board.insertBefore(el,board.querySelector('.furn'));
  const w={el,cell,furn,seed:board.dataset.seed,done:false,raf:0,landed:false};walks.add(w);
  const firstWalk=ph.find(p=>p.type==='walk');
  let dir=firstWalk?Math.sign(firstWalk.x1-firstWalk.x0)||side:side,flip=dir,lastT=0,pi=0,walking=null;
  let behind=edge!=null;if(!behind)el.classList.remove('behind');
  const setWalking=on=>{if(on!==walking){walking=on;svg.classList.toggle('walking',on)}};
  const t0=performance.now();
  const frame=now=>{if(w.done)return;if(!alive(w)){finish(w,w.cell.isConnected&&board.dataset.seed===w.seed);return}
    const t=now-t0,dt=Math.min(64,t-lastT);lastT=t;let x,y,sx=1,sy=1,op=1,rot=0,stretch=0;
    if(t<tMove){while(pi<ph.length-1&&t>=ph[pi].t0+ph[pi].dur)pi++;const p=ph[pi],u=Math.min(1,(t-p.t0)/p.dur);
      if(p.type==='walk'){setWalking(true);
        /* ease in and out of each stretch of walking (a slow start out of hiding, a gentle stop before a jump) */
        const e=u*u*(3-2*u)*.5+u*.5;x=(p.x0+(p.x1-p.x0)*e)*cw;y=floorY(p.row);if(p.x1!==p.x0)dir=Math.sign(p.x1-p.x0)}
      else if(p.type==='beat'){setWalking(false);x=p.x0*cw;y=floorY(p.row);const b=Math.sin(u*Math.PI);sx=1+.06*b;sy=1-.08*b}
      else if(p.type==='turn'){setWalking(false);x=p.x0*cw;y=floorY(p.row);dir=p.to;w.turnF=p.from*Math.cos(smooth(u)*Math.PI)}
      else{setWalking(false);x=p.x0*cw;const y0=floorY(p.row0),y1=floorY(p.row1);
        if(p.type==='jump'){/* crouch with a rump wiggle, spring up in an arc clear of the floor above, land with a squash */
          if(u<.32){const c=smooth(u/.32);sx=1+.1*c;sy=1-.2*c;rot=Math.sin(u/.32*Math.PI*4)*4*c*dir;y=y0}
          else if(u<.82){const a=(u-.32)/.5,e=smooth(a);y=y0+(y1-y0)*e-Math.sin(a*Math.PI)*cw*.38;sx=1-.08*Math.sin(a*Math.PI);sy=1+.12*Math.sin(a*Math.PI);rot=-dir*14*(1-a*1.6)}
          else{const a=(u-.82)/.18,b=Math.sin(a*Math.PI);y=y1;sx=1+.12*b;sy=1-.16*b}}
        else{/* a short hop down */const e=u*u;y=y0+(y1-y0)*e-Math.sin(u*Math.PI)*cw*.12;sx=1-.04*Math.sin(u*Math.PI);sy=1+.06*Math.sin(u*Math.PI)}}
      op=Math.min(1,t/160)}
    else{setWalking(false);x=tgtX;y=tgtY;
      const u=t-tMove;
      if(u<tStretch){/* ease down into the stretch, hold with a yawn, ease back up */
        const p=u/tStretch;stretch=p<.22?smooth(p/.22):p<.8?1:1-smooth((p-.8)/.2);
        svg.style.setProperty('--yawn',p<.25?0:p<.78?Math.sin((p-.25)/.53*Math.PI):0);sx=1+.08*stretch;sy=1-.05*stretch}
      else if(u<tStretch+tTurn){/* a slow turn on the spot, the sprite swinging round once */
        const p=smooth((u-tStretch)/tTurn),a=p*Math.PI*2;dir=w.dir0||(w.dir0=dir);
        x=tgtX+Math.sin(a)*cw*.09*dir;y=tgtY-Math.sin(a/2)*cw*.05;sx=sy=1-.14*p}
      else{const p=Math.min(1,(u-tStretch-tTurn)/tFade);sx=sy=.86-.16*p;y=tgtY-cw*.25*p;op=1-smooth(p);
        if(!w.landed){w.landed=true;cell.classList.remove('cat-arriving');if(furn)furn.classList.remove('cat-behind');
          S.emit&&S.emit('catLanded',{k:+cell.dataset.k})}}}
    /* heading: during the turn it is driven by the angle, otherwise it swings smoothly toward the direction of travel */
    const u=t-tMove;
    if(t<tMove&&ph[pi].type==='turn'){flip=w.turnF}
    else if(u>=tStretch&&u<tStretch+tTurn){const a=smooth((u-tStretch)/tTurn)*Math.PI*2;flip=dir*Math.cos(a)}
    else{const step=dt/200*2;flip+=Math.max(-step,Math.min(step,dir-flip))}
    let fx=flip;const m=Math.abs(fx);if(m<.36)fx=(fx<0?-1:1)*(.36+.1*(.36-m));
    const sc=1-.05*(1-m);sx*=sc;sy*=sc;
    if(behind){const past=side*(x-edge)/sx;
      if(past>=W/2||t>=tMove||(ph[pi]&&ph[pi].type!=='walk')){behind=false;el.classList.remove('behind');el.style.clipPath='';board.appendChild(el)}
      else{const cut=Math.max(0,Math.min(W,W/2-past));el.style.clipPath=side>0?`inset(-20% -20% -20% ${cut}px)`:`inset(-20% ${cut}px -20% -20%)`}}
    /* the pose swaps crisply (a short CSS fade) while the reach itself eases: a long low stretch, then back up */
    const st=stretch>.35?1:0;if(st!==w.st){w.st=st;pw.style.opacity=1-st;ps.style.opacity=st}
    /* anchored at the feet (ground line y=45 of 52 in the sprite) */
    el.style.transform=`translate(${x}px,${y}px) translate(-50%,-86.5%) rotate(${rot}deg) scale(${sx},${sy})`;el.style.opacity=op;
    face.style.transform=`scaleX(${fx})`;
    if(t>=T){finish(w,true);return}
    w.raf=requestAnimationFrame(frame)};
  frame(t0)}

/* ---------- win finale: the card jiggles, then every cat gets the zoomies and dashes off the board ---------- */
let fin=null;
function stopFinale(){if(!fin)return;const f=fin;fin=null;f.timers.forEach(clearTimeout);cancelAnimationFrame(f.raf);
  f.layer&&f.layer.remove();f.card&&f.card.classList.remove('card-jiggle');
  board.querySelectorAll('.cell.zoomed').forEach(c=>c.classList.remove('zoomed'))}
function finale(){stopFinale();if(reduced())return;
  const ov=document.getElementById('overlay'),card=ov&&ov.querySelector('.card');if(!card||ov.hidden)return;
  const f=fin={timers:[],raf:0,layer:null,card,seed:board.dataset.seed};
  const ok=()=>fin===f&&!ov.hidden&&ov.contains(card)&&board.dataset.seed===f.seed;
  const later=(fn,ms)=>f.timers.push(setTimeout(()=>{if(ok())fn()},ms));
  /* polish.js's hop runs for about a second after the last cat curls up; jiggle after that */
  later(()=>{card.classList.remove('card-jiggle');void card.offsetWidth;card.classList.add('card-jiggle');later(zoom,560)},1150);
  function zoom(){const cats=[...board.querySelectorAll('.cell.cat')].filter(c=>c.querySelector('svg'));if(!cats.length)return;
    /* sprites run in a layer inside the overlay, under the card (card is raised in css) and over the backdrop */
    const L=f.layer=document.createElement('div');L.className='zoom-layer';L.setAttribute('aria-hidden','true');ov.insertBefore(L,ov.firstChild);
    const or=ov.getBoundingClientRect(),n=S.puzzle.n,cw=board.clientWidth/n,W=cw*1.3,mid=or.width/2;
    /* lanes clear of the card: a runner whose row is behind the card veers up or down to the nearer one */
    const crd=card.getBoundingClientRect(),cTop=crd.top-or.top,cBot=crd.bottom-or.top,laneUp=Math.max(W*.62,cTop-cw*.12),laneDn=Math.min(or.height-cw*.08,cBot+W*.72);
    const laneFor=y=>y<cTop-cw*.1||y-W*.6>cBot?y:(y-cTop<cBot-y&&laneUp<cTop?laneUp:laneDn);
    window.NapMapSound&&window.NapMapSound.play('zoomies');
    const stag=Math.min(90,520/Math.max(1,cats.length-1)),runners=[];
    cats.forEach((cell,i)=>{const r=cell.getBoundingClientRect(),x0=r.left-or.left+r.width/2,y0=r.top-or.top+r.height*.88;
      const curled=cell.querySelector('svg'),coat=(curled.getAttribute('class')||'').split(/\s+/).filter(c=>c.startsWith('coat-')).join(' ');
      const dir=x0<mid?-1:1,x1=dir<0?-W*.8:or.width+W*.8,el=document.createElement('div');el.className='cat-walker zoomer';
      el.style.width=W+'px';el.style.height=W*52/72+'px';el.style.opacity=0;
      el.innerHTML=`<div class="cw-face">${walkerSVG(coat)}</div>`;el.firstChild.style.transform=`scaleX(${dir})`;
      const svg=el.querySelector('svg');svg.classList.add('zoomy');L.appendChild(el);
      /* a zig on one in three, a hop over the neighbours on another */
      const style=i%3===1?'zig':i%3===2?'hop':'dash';
      runners.push({el,svg,cell,x0,y0,x1,dir,style,lane:laneFor(y0),t0:i*stag,woke:false,ran:false,puff:0})});
    const tWake=230,tRun=620,start=performance.now(),end=stag*(cats.length-1)+tWake+tRun+60;
    const dust=(x,y,dir)=>{const d=document.createElement('i');d.className='zoom-dust';d.style.left=x+'px';d.style.top=y+'px';
      d.style.setProperty('--dx',(-dir*cw*.35)+'px');L.appendChild(d);setTimeout(()=>d.remove(),420)};
    const frame=now=>{if(!ok()){stopFinale();return}const t=now-start;
      runners.forEach(R=>{const u=t-R.t0;if(u<0)return;let x=R.x0,y=R.y0,sx=1,sy=1,rot=0;
        if(!R.woke){R.woke=true;R.cell.classList.add('zoomed');R.el.style.opacity=1}
        if(u<tWake){/* wake: pops up from the curl, ears up, eyes wide, a little startled hop */
          const p=u/tWake;sy=.7+.3*smooth(Math.min(1,p*1.6));sx=1.15-.15*smooth(Math.min(1,p*1.6));y-=Math.sin(p*Math.PI)*cw*.22}
        else if(u<tWake+tRun){if(!R.ran){R.ran=true;R.svg.classList.add('running');dust(R.x0,R.y0,R.dir)}
          const p=(u-tWake)/tRun,e=p*p*(1.4-.4*p);x=R.x0+(R.x1-R.x0)*e;sx=1.18;sy=.88;rot=R.dir*-4;
          const v=smooth(Math.min(1,p/.35));y=R.y0+(R.lane-R.y0)*v;if(R.lane!==R.y0&&p<.35)rot+=(R.lane<R.y0?-1:1)*R.dir*14*Math.sin(p/.35*Math.PI);
          if(R.style==='zig')y+=Math.sin(p*Math.PI*2)*cw*.32;
          if(R.style==='hop'&&p>.15&&p<.55)y-=Math.sin((p-.15)/.4*Math.PI)*cw*.55;
          if(now-R.puff>110){R.puff=now;dust(x-R.dir*W*.35,y,R.dir)}}
        else{R.el.style.opacity=0;return}
        R.el.style.transform=`translate(${x}px,${y}px) translate(-50%,-86.5%) rotate(${rot}deg) scale(${sx},${sy})`});
      if(t<end)f.raf=requestAnimationFrame(frame);else{L.innerHTML='';}};
    f.raf=requestAnimationFrame(frame)}}
S.on('win',()=>{if(reduced())return;const go=()=>finale();whenIdleInner(go)});
S.on('newPuzzle',stopFinale);
document.getElementById('overlay')?.addEventListener('click',e=>{if(e.target.closest('[data-act]'))stopFinale()},true);
document.addEventListener('click',e=>{if(e.target.closest('.chip[data-mode],#new,#restart,#archive-btn'))stopFinale()},true);

S.on('cat',d=>walk(d.k));
S.on('newPuzzle',()=>{idle=[];[...walks].forEach(w=>finish(w))});
/* polish.js waits on this so the win hop starts once the last cat has curled up */
function whenIdleInner(f){walks.size?idle.push(f):f()}
window.NapMapCats={walkerSVG,planFor,stopFinale,get busy(){return walks.size>0},whenIdle:whenIdleInner};
})();
